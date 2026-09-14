import { describe, expect, it } from 'vitest'
import { getStrokes, type ReferenceStroke } from '../data/strokes'
import {
  MISTAKES_BEFORE_HINT,
  createPracticeState,
  isFinished,
  practiceReducer,
  type PracticeAction,
  type PracticeState,
} from './practiceSession'
import type { Point } from './strokeMath'

const A = getStrokes('あ') as ReferenceStroke[]
const CORETAN: Point[] = [
  [5, 100],
  [50, 95],
  [100, 105],
]

function goresan(index: number): PracticeAction {
  return { type: 'stroke', points: A[index]!.points as Point[] }
}

function jalankan(state: PracticeState, ...actions: PracticeAction[]): PracticeState {
  return actions.reduce(practiceReducer, state)
}

describe('mode jiplak & petunjuk', () => {
  it('maju ke goresan berikutnya saat goresan benar', () => {
    const state = jalankan(createPracticeState(A), goresan(0))
    expect(state.currentIndex).toBe(1)
    expect(state.accepted).toHaveLength(1)
    expect(state.lastMatch?.verdict).toBe('correct')
    expect(isFinished(state)).toBe(false)
  })

  it('tetap di goresan yang sama dan mencatat kesalahan saat goresan salah', () => {
    const state = jalankan(createPracticeState(A), { type: 'stroke', points: CORETAN })
    expect(state.currentIndex).toBe(0)
    expect(state.accepted).toHaveLength(0)
    expect(state.mistakesOnCurrent).toBe(1)
    expect(state.totalMistakes).toBe(1)
    expect(state.lastRejected).toEqual(CORETAN)
  })

  it('mengenali urutan yang tertukar', () => {
    const state = jalankan(createPracticeState(A), goresan(2))
    expect(state.lastMatch?.verdict).toBe('wrong-order')
    expect(state.currentIndex).toBe(0)
  })

  it('menampilkan petunjuk otomatis setelah beberapa kali salah', () => {
    let state = createPracticeState(A, 'petunjuk')
    for (let i = 0; i < MISTAKES_BEFORE_HINT - 1; i++) {
      state = practiceReducer(state, { type: 'stroke', points: CORETAN })
    }
    expect(state.hintIndex).toBeNull()
    state = practiceReducer(state, { type: 'stroke', points: CORETAN })
    expect(state.hintIndex).toBe(0)

    state = practiceReducer(state, goresan(0))
    expect(state.hintIndex).toBeNull()
    expect(state.mistakesOnCurrent).toBe(0)
  })

  it('bisa meminta petunjuk kapan saja lalu menutupnya', () => {
    const state = jalankan(createPracticeState(A, 'petunjuk'), goresan(0), { type: 'hint' })
    expect(state.hintIndex).toBe(1)
    expect(practiceReducer(state, { type: 'hint-done' }).hintIndex).toBeNull()
  })

  it('selesai dengan nilai tinggi bila semua goresan benar tanpa kesalahan', () => {
    const state = jalankan(createPracticeState(A), goresan(0), goresan(1), goresan(2))
    expect(isFinished(state)).toBe(true)
    expect(state.result?.correct).toBe(3)
    expect(state.result?.mistakes).toBe(0)
    expect(state.result?.accuracy).toBeGreaterThan(0.9)
  })

  it('menurunkan nilai akhir bila ada kesalahan di tengah jalan', () => {
    const bersih = jalankan(createPracticeState(A), goresan(0), goresan(1), goresan(2))
    const adaSalah = jalankan(
      createPracticeState(A),
      goresan(0),
      { type: 'stroke', points: CORETAN },
      goresan(1),
      goresan(2),
    )
    expect(adaSalah.result?.mistakes).toBe(1)
    expect(adaSalah.result!.accuracy).toBeLessThan(bersih.result!.accuracy)
  })

  it('mengabaikan goresan setelah selesai dan goresan kosong', () => {
    const selesai = jalankan(createPracticeState(A), goresan(0), goresan(1), goresan(2))
    expect(practiceReducer(selesai, goresan(0))).toBe(selesai)
    const awal = createPracticeState(A)
    expect(practiceReducer(awal, { type: 'stroke', points: [] })).toBe(awal)
  })
})

describe('mode ingatan', () => {
  it('mengumpulkan goresan tanpa menilai sampai jumlahnya lengkap', () => {
    const state = jalankan(createPracticeState(A, 'ingatan'), goresan(0), { type: 'stroke', points: CORETAN })
    expect(state.drafts).toHaveLength(2)
    expect(state.lastMatch).toBeNull()
    expect(state.totalMistakes).toBe(0)
    expect(isFinished(state)).toBe(false)
  })

  it('menilai semua goresan sekaligus saat jumlahnya lengkap', () => {
    const state = jalankan(createPracticeState(A, 'ingatan'), goresan(0), { type: 'stroke', points: CORETAN }, goresan(2))
    expect(isFinished(state)).toBe(true)
    expect(state.result?.matches.map((match) => match.verdict)).toEqual(['correct', 'wrong-shape', 'correct'])
    expect(state.result?.correct).toBe(2)
    expect(state.result?.mistakes).toBe(1)
    expect(state.accepted.map((stroke) => stroke.index)).toEqual([0, 2])
  })

  it('bisa menghapus goresan terakhir sebelum dinilai', () => {
    const state = jalankan(createPracticeState(A, 'ingatan'), goresan(0), { type: 'stroke', points: CORETAN }, { type: 'undo' })
    expect(state.drafts).toHaveLength(1)
  })

  it('bisa dinilai lebih awal; goresan yang belum ditulis dihitung salah', () => {
    const state = jalankan(createPracticeState(A, 'ingatan'), goresan(0), { type: 'submit' })
    expect(isFinished(state)).toBe(true)
    expect(state.result?.correct).toBe(1)
    expect(state.result?.mistakes).toBe(2)
  })

  it('tidak menampilkan petunjuk', () => {
    const state = practiceReducer(createPracticeState(A, 'ingatan'), { type: 'hint' })
    expect(state.hintIndex).toBeNull()
  })
})

describe('reset & konfigurasi', () => {
  it('mengulang dari awal dengan mode yang sama', () => {
    const state = jalankan(createPracticeState(A, 'petunjuk'), goresan(0), { type: 'reset' })
    expect(state.currentIndex).toBe(0)
    expect(state.accepted).toHaveLength(0)
    expect(state.mode).toBe('petunjuk')
  })

  it('mengganti mode atau huruf sekaligus mengulang sesi', () => {
    const KI = getStrokes('き') as ReferenceStroke[]
    const state = jalankan(createPracticeState(A), goresan(0), { type: 'configure', mode: 'ingatan', reference: KI, tolerance: 'mudah' })
    expect(state.mode).toBe('ingatan')
    expect(state.reference).toBe(KI)
    expect(state.tolerance).toBe('mudah')
    expect(state.accepted).toHaveLength(0)
  })
})
