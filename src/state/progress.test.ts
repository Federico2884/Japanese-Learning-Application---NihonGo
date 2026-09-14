import { describe, expect, it } from 'vitest'
import {
  BOX_INTERVALS,
  MAX_BOX,
  addDays,
  dateKey,
  dueKana,
  isDue,
  masteryLevel,
  reviewKana,
  summarize,
  type KanaProgress,
  type ProgressMap,
} from './progress'

const HARI_INI = new Date(2026, 8, 15) // 15 September 2026

function kartu(box: number, due: Date, seen = 3, ok = 2): KanaProgress {
  return { box, due: dateKey(due), seen, ok }
}

describe('tanggal', () => {
  it('memakai tanggal setempat dalam format YYYY-MM-DD', () => {
    expect(dateKey(HARI_INI)).toBe('2026-09-15')
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('menambah hari melewati batas bulan', () => {
    expect(dateKey(addDays(new Date(2026, 8, 28), 7))).toBe('2026-10-05')
  })
})

describe('reviewKana', () => {
  it('menaikkan kartu baru ke kotak 2 saat dijawab benar', () => {
    const hasil = reviewKana(undefined, true, HARI_INI)
    expect(hasil.box).toBe(2)
    expect(hasil.due).toBe('2026-09-16')
    expect(hasil).toMatchObject({ seen: 1, ok: 1 })
  })

  it('menahan kartu baru di kotak 1 saat dijawab salah', () => {
    const hasil = reviewKana(undefined, false, HARI_INI)
    expect(hasil.box).toBe(1)
    expect(hasil.due).toBe('2026-09-15')
    expect(hasil).toMatchObject({ seen: 1, ok: 0 })
  })

  it('menjatuhkan kartu mana pun ke kotak 1 saat salah', () => {
    const hasil = reviewKana(kartu(5, HARI_INI), false, HARI_INI)
    expect(hasil.box).toBe(1)
    expect(hasil.due).toBe(dateKey(HARI_INI))
    expect(hasil.seen).toBe(4)
    expect(hasil.ok).toBe(2)
  })

  it('memakai jarak ulang tiap kotak', () => {
    let progress = reviewKana(undefined, true, HARI_INI)
    const jarak: number[] = []
    for (let i = 0; i < 5; i++) {
      const dasar = new Date(HARI_INI)
      progress = reviewKana(progress, true, dasar)
      jarak.push(BOX_INTERVALS[progress.box - 1]!)
    }
    expect(jarak).toEqual([3, 7, 14, 14, 14])
  })

  it('berhenti di kotak tertinggi', () => {
    let progress = kartu(MAX_BOX, HARI_INI)
    progress = reviewKana(progress, true, HARI_INI)
    expect(progress.box).toBe(MAX_BOX)
    expect(progress.due).toBe('2026-09-29')
  })
})

describe('jadwal', () => {
  it('menganggap huruf yang belum pernah dipelajari selalu jatuh tempo', () => {
    expect(isDue(undefined, HARI_INI)).toBe(true)
  })

  it('membandingkan tanggal jatuh tempo dengan hari ini', () => {
    expect(isDue(kartu(2, addDays(HARI_INI, -1)), HARI_INI)).toBe(true)
    expect(isDue(kartu(2, HARI_INI), HARI_INI)).toBe(true)
    expect(isDue(kartu(2, addDays(HARI_INI, 1)), HARI_INI)).toBe(false)
  })

  it('mendahulukan huruf baru lalu kotak terendah', () => {
    const map: ProgressMap = {
      b: kartu(3, HARI_INI),
      c: kartu(1, HARI_INI),
      d: kartu(4, addDays(HARI_INI, 5)),
    }
    expect(dueKana(['a', 'b', 'c', 'd'], map, HARI_INI)).toEqual(['a', 'c', 'b'])
  })
})

describe('penguasaan & ringkasan', () => {
  it('memberi tingkat 0 untuk huruf yang belum pernah dipelajari', () => {
    expect(masteryLevel(undefined)).toBe(0)
    expect(masteryLevel({ box: 2, due: '2026-09-15', seen: 0, ok: 0 })).toBe(0)
    expect(masteryLevel(kartu(3, HARI_INI))).toBe(3)
  })

  it('merangkum jumlah dipelajari, dikuasai, dan jatuh tempo', () => {
    const map: ProgressMap = {
      a: kartu(5, addDays(HARI_INI, 10)),
      b: kartu(4, addDays(HARI_INI, 3)),
      c: kartu(1, HARI_INI),
    }
    expect(summarize(['a', 'b', 'c', 'd'], map, HARI_INI)).toEqual({
      studied: 3,
      mastered: 2,
      due: 2,
      total: 4,
    })
  })
})
