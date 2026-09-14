import { describe, expect, it } from 'vitest'
import { getKana } from '../data/kana'
import { dateKey, type ProgressMap } from '../state/progress'
import { generateQuiz, summarizeQuiz, type Question } from './generateQuiz'

const HARI_INI = new Date(2026, 8, 15)
const HIRAGANA = getKana('hiragana').filter((kana) => kana.group === 'gojuon')

/** Sumber acak yang bisa ditebak, supaya hasil test selalu sama. */
function acakTerkendali(seed = 1): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function buat(progress: ProgressMap = {}, options = {}): Question[] {
  return generateQuiz(HIRAGANA, progress, HARI_INI, { random: acakTerkendali(), ...options })
}

describe('generateQuiz', () => {
  it('membuat sejumlah soal yang diminta', () => {
    expect(buat()).toHaveLength(8)
    expect(buat({}, { length: 3 })).toHaveLength(3)
  })

  it('tidak mengulang huruf yang sama dalam satu sesi', () => {
    const ids = buat().map((question) => question.kana.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('selalu menyertakan jawaban benar di antara pilihan', () => {
    for (const question of buat()) {
      if (question.type === 'romaji-write') continue
      expect(question.options).toHaveLength(4)
      expect(question.options).toContain(question.answer)
      expect(new Set(question.options).size).toBe(question.options.length)
    }
  })

  it('memakai huruf sebagai pilihan pada soal dengar, dan romaji pada soal baca', () => {
    const soal = buat({}, { length: 6 })
    const dengar = soal.find((question) => question.type === 'audio-kana')
    const baca = soal.find((question) => question.type === 'kana-romaji')
    expect(dengar?.answer).toBe(dengar?.kana.char)
    expect(baca?.answer).toBe(baca?.kana.romaji)
  })

  it('mendahulukan huruf yang jatuh tempo', () => {
    // Semua huruf dijadwalkan jauh di depan, kecuali tiga huruf pertama.
    const progress: ProgressMap = {}
    for (const kana of HIRAGANA) {
      progress[kana.id] = { box: 5, due: dateKey(new Date(2026, 11, 1)), seen: 5, ok: 5 }
    }
    const jatuhTempo = HIRAGANA.slice(0, 3)
    for (const kana of jatuhTempo) {
      progress[kana.id] = { box: 1, due: dateKey(HARI_INI), seen: 2, ok: 0 }
    }

    const ids = buat(progress, { length: 3 }).map((question) => question.kana.id)
    expect(ids.sort()).toEqual(jatuhTempo.map((kana) => kana.id).sort())
  })

  it('melewati jenis soal yang tidak didukung perangkat', () => {
    const tanpaSuara = buat({}, { allowAudio: false })
    expect(tanpaSuara.some((question) => question.type === 'audio-kana')).toBe(false)

    const tanpaMenulis = buat({}, { allowWriting: false })
    expect(tanpaMenulis.some((question) => question.type === 'romaji-write')).toBe(false)
  })

  it('mengembalikan larik kosong bila tidak ada huruf', () => {
    expect(generateQuiz([], {}, HARI_INI)).toEqual([])
  })
})

describe('summarizeQuiz', () => {
  it('menghitung jumlah benar, akurasi, dan huruf yang perlu diulang', () => {
    const soal = buat({}, { length: 4 })
    const jawaban = new Map([
      [soal[0]!.id, true],
      [soal[1]!.id, false],
      [soal[2]!.id, true],
      [soal[3]!.id, false],
    ])

    const ringkasan = summarizeQuiz(soal, jawaban)
    expect(ringkasan.correct).toBe(2)
    expect(ringkasan.total).toBe(4)
    expect(ringkasan.accuracy).toBe(0.5)
    expect(ringkasan.missed.map((kana) => kana.id)).toEqual([soal[1]!.kana.id, soal[3]!.kana.id])
  })

  it('tidak membagi dengan nol saat sesi kosong', () => {
    expect(summarizeQuiz([], new Map())).toEqual({ correct: 0, total: 0, accuracy: 0, missed: [] })
  })
})
