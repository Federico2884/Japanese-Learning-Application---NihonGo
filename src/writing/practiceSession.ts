/**
 * Alur satu sesi latihan menulis sebuah huruf, ditulis sebagai reducer murni.
 *
 * Tiga tingkat latihan:
 *   - jiplak   : bayangan huruf terlihat, tiap goresan langsung dinilai
 *   - petunjuk : kotak kosong, tiap goresan langsung dinilai, animasi petunjuk
 *                muncul otomatis setelah beberapa kali salah
 *   - ingatan  : tanpa bantuan dan tanpa umpan balik per goresan; semua goresan
 *                dinilai sekaligus setelah jumlahnya lengkap
 */
import type { ReferenceStroke } from '../data/strokes'
import { matchStroke, scoreCharacter, type CharacterScore, type StrokeMatch, type Tolerance } from './strokeMatcher'
import type { Point } from './strokeMath'

export type PracticeMode = 'jiplak' | 'petunjuk' | 'ingatan'

/** Berapa kali salah pada goresan yang sama sebelum petunjuk ditampilkan otomatis. */
export const MISTAKES_BEFORE_HINT = 2

export interface AcceptedStroke {
  index: number
  match: StrokeMatch
}

export interface PracticeState {
  mode: PracticeMode
  reference: readonly ReferenceStroke[]
  tolerance: Tolerance
  /** Goresan yang sedang ditunggu (mode jiplak & petunjuk). */
  currentIndex: number
  /** Goresan yang sudah diterima, sesuai urutan. */
  accepted: AcceptedStroke[]
  /** Hasil penilaian goresan terakhir, untuk ditampilkan sebagai umpan balik. */
  lastMatch: StrokeMatch | null
  /** Titik goresan terakhir yang salah, untuk ditampilkan sekilas lalu dihapus. */
  lastRejected: Point[] | null
  mistakesOnCurrent: number
  totalMistakes: number
  /** Goresan yang sedang ditunjukkan lewat animasi petunjuk, atau null. */
  hintIndex: number | null
  /** Goresan mentah yang dikumpulkan pada mode ingatan. */
  drafts: Point[][]
  /** Terisi setelah huruf selesai ditulis. */
  result: PracticeResult | null
}

export interface PracticeResult extends CharacterScore {
  mistakes: number
  /** Penilaian tiap goresan pada mode ingatan (urut sesuai goresan acuan). */
  matches: StrokeMatch[]
}

export type PracticeAction =
  | { type: 'stroke'; points: Point[] }
  | { type: 'undo' }
  | { type: 'submit' }
  | { type: 'hint' }
  | { type: 'hint-done' }
  | { type: 'reset' }
  | { type: 'configure'; mode?: PracticeMode; reference?: readonly ReferenceStroke[]; tolerance?: Tolerance }

export function createPracticeState(
  reference: readonly ReferenceStroke[],
  mode: PracticeMode = 'jiplak',
  tolerance: Tolerance = 'normal',
): PracticeState {
  return {
    mode,
    reference,
    tolerance,
    currentIndex: 0,
    accepted: [],
    lastMatch: null,
    lastRejected: null,
    mistakesOnCurrent: 0,
    totalMistakes: 0,
    hintIndex: null,
    drafts: [],
    result: null,
  }
}

export function isFinished(state: PracticeState): boolean {
  return state.result !== null
}

function acceptStroke(state: PracticeState, points: Point[]): PracticeState {
  const match = matchStroke(points, state.reference, state.currentIndex, { tolerance: state.tolerance })

  if (match.verdict !== 'correct') {
    const mistakesOnCurrent = state.mistakesOnCurrent + 1
    const autoHint = state.mode !== 'ingatan' && mistakesOnCurrent >= MISTAKES_BEFORE_HINT
    return {
      ...state,
      lastMatch: match,
      lastRejected: points,
      mistakesOnCurrent,
      totalMistakes: state.totalMistakes + 1,
      hintIndex: autoHint ? state.currentIndex : state.hintIndex,
    }
  }

  const accepted = [...state.accepted, { index: state.currentIndex, match }]
  const currentIndex = state.currentIndex + 1
  const done = currentIndex >= state.reference.length
  const matches = accepted.map((stroke) => stroke.match)

  return {
    ...state,
    accepted,
    currentIndex,
    lastMatch: match,
    lastRejected: null,
    mistakesOnCurrent: 0,
    hintIndex: null,
    result: done
      ? { ...penalize(scoreCharacter(matches, state.reference.length), state.totalMistakes), mistakes: state.totalMistakes, matches }
      : null,
  }
}

/** Bobot satu kesalahan, dihitung sebagai sebagian goresan tambahan yang tidak bernilai. */
const MISTAKE_WEIGHT = 0.5

/**
 * Kesalahan di tengah jalan mengurangi akurasi, tapi tidak sampai menghapus
 * nilai goresan yang akhirnya ditulis dengan benar.
 */
function penalize(score: CharacterScore, mistakes: number): CharacterScore {
  if (score.total === 0) return score
  return { ...score, accuracy: (score.accuracy * score.total) / (score.total + mistakes * MISTAKE_WEIGHT) }
}

function gradeDrafts(state: PracticeState, drafts: Point[][]): PracticeState {
  const matches = state.reference.map((_, index) => {
    const draft = drafts[index]
    return draft
      ? matchStroke(draft, state.reference, index, { tolerance: state.tolerance })
      : ({ verdict: 'wrong-shape', expectedIndex: index, matchedIndex: null, deviation: Infinity, quality: 0 } as StrokeMatch)
  })
  const extra = Math.max(0, drafts.length - state.reference.length)
  const mistakes = matches.filter((match) => match.verdict !== 'correct').length + extra
  const score = scoreCharacter(matches, state.reference.length)

  return {
    ...state,
    drafts,
    accepted: matches
      .filter((match) => match.verdict === 'correct')
      .map((match) => ({ index: match.expectedIndex, match })),
    totalMistakes: mistakes,
    lastMatch: null,
    result: { ...score, mistakes, matches },
  }
}

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case 'stroke': {
      if (isFinished(state) || action.points.length === 0) return state
      if (state.mode === 'ingatan') {
        const drafts = [...state.drafts, action.points]
        return drafts.length >= state.reference.length ? gradeDrafts(state, drafts) : { ...state, drafts }
      }
      return acceptStroke(state, action.points)
    }

    case 'undo':
      if (isFinished(state) || state.mode !== 'ingatan') return state
      return { ...state, drafts: state.drafts.slice(0, -1) }

    case 'submit':
      if (isFinished(state) || state.mode !== 'ingatan' || state.drafts.length === 0) return state
      return gradeDrafts(state, state.drafts)

    case 'hint':
      if (isFinished(state) || state.mode === 'ingatan') return state
      return { ...state, hintIndex: state.currentIndex }

    case 'hint-done':
      return { ...state, hintIndex: null }

    case 'reset':
      return createPracticeState(state.reference, state.mode, state.tolerance)

    case 'configure':
      return createPracticeState(
        action.reference ?? state.reference,
        action.mode ?? state.mode,
        action.tolerance ?? state.tolerance,
      )
  }
}
