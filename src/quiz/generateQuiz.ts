/**
 * Penyusun soal kuis.
 *
 * Huruf dipilih berdasarkan jadwal Leitner: yang jatuh tempo lebih dulu,
 * sehingga kuis mengulang huruf yang memang belum menempel. Fungsi di sini
 * murni — sumber acaknya diberikan dari luar supaya mudah diuji.
 */
import type { Kana } from '../data/kana'
import { dueKana, type ProgressMap } from '../state/progress'

export type QuestionType =
  /** Lihat huruf, pilih bacaannya. */
  | 'kana-romaji'
  /** Dengar bunyinya, pilih hurufnya. */
  | 'audio-kana'
  /** Lihat romaji, tulis hurufnya di kanvas. */
  | 'romaji-write'

export interface Question {
  id: string
  type: QuestionType
  kana: Kana
  /** Pilihan jawaban untuk soal pilihan ganda; kosong untuk soal menulis. */
  options: string[]
  /** Jawaban benar; untuk soal menulis berisi huruf yang harus ditulis. */
  answer: string
  prompt: string
}

export interface QuizOptions {
  /** Banyak soal dalam satu sesi. */
  length?: number
  /** Jumlah pilihan jawaban pada soal pilihan ganda. */
  choices?: number
  /** Soal dengar hanya dibuat bila perangkat bisa melafalkan. */
  allowAudio?: boolean
  /** Soal menulis hanya untuk huruf tunggal yang punya data goresan. */
  allowWriting?: boolean
  random?: () => number
}

const PROMPTS: Record<QuestionType, string> = {
  'kana-romaji': 'Huruf ini dibaca apa?',
  'audio-kana': 'Dengar, lalu pilih hurufnya',
  'romaji-write': 'Tulis huruf untuk bunyi ini',
}

export const DEFAULT_QUIZ_LENGTH = 8

function pick<T>(items: readonly T[], count: number, random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy.slice(0, count)
}

/** Pengecoh diambil dari huruf lain pada aksara yang sama, tanpa bacaan kembar. */
function distractors(target: Kana, pool: readonly Kana[], count: number, random: () => number, byChar: boolean): string[] {
  const seen = new Set([byChar ? target.char : target.romaji])
  const candidates = pool.filter((kana) => {
    const value = byChar ? kana.char : kana.romaji
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
  return pick(candidates, count, random).map((kana) => (byChar ? kana.char : kana.romaji))
}

function typeFor(index: number, kana: Kana, options: Required<Pick<QuizOptions, 'allowAudio' | 'allowWriting'>>): QuestionType {
  const writable = options.allowWriting && kana.components.length === 1
  // Selang-seling agar satu sesi tidak berisi satu jenis soal saja.
  const cycle: QuestionType[] = ['kana-romaji']
  if (options.allowAudio) cycle.push('audio-kana')
  if (writable) cycle.push('romaji-write')
  return cycle[index % cycle.length]!
}

export function generateQuiz(
  pool: readonly Kana[],
  progress: ProgressMap,
  today: Date = new Date(),
  options: QuizOptions = {},
): Question[] {
  const {
    length = DEFAULT_QUIZ_LENGTH,
    choices = 4,
    allowAudio = true,
    allowWriting = true,
    random = Math.random,
  } = options

  if (pool.length === 0) return []

  const byId = new Map(pool.map((kana) => [kana.id, kana]))
  const due = dueKana(
    pool.map((kana) => kana.id),
    progress,
    today,
  )
    .map((id) => byId.get(id))
    .filter((kana): kana is Kana => kana !== undefined)

  // Huruf jatuh tempo didahulukan; bila kurang, sisanya diambil acak.
  const chosen = due.slice(0, length)
  if (chosen.length < length) {
    const rest = pool.filter((kana) => !chosen.includes(kana))
    chosen.push(...pick(rest, length - chosen.length, random))
  }

  return chosen.map((kana, index) => {
    const type = typeFor(index, kana, { allowAudio, allowWriting })
    const byChar = type === 'audio-kana'
    const answer = byChar ? kana.char : kana.romaji

    if (type === 'romaji-write') {
      return { id: kana.id + '-' + index, type, kana, options: [], answer: kana.char, prompt: PROMPTS[type] }
    }

    const wrong = distractors(kana, pool, choices - 1, random, byChar)
    return {
      id: kana.id + '-' + index,
      type,
      kana,
      options: pick([answer, ...wrong], choices, random),
      answer,
      prompt: PROMPTS[type],
    }
  })
}

export interface QuizSummary {
  correct: number
  total: number
  accuracy: number
  /** Huruf yang dijawab salah, untuk ditampilkan sebagai "perlu diulang". */
  missed: Kana[]
}

export function summarizeQuiz(questions: readonly Question[], answers: ReadonlyMap<string, boolean>): QuizSummary {
  const correct = questions.filter((question) => answers.get(question.id) === true).length
  const missed = questions.filter((question) => answers.get(question.id) === false).map((question) => question.kana)
  return {
    correct,
    total: questions.length,
    accuracy: questions.length === 0 ? 0 : correct / questions.length,
    missed,
  }
}
