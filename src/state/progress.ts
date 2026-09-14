/**
 * Progres belajar dengan sistem Leitner 5 kotak.
 *
 * Aturannya dua saja: jawaban benar menaikkan kartu satu kotak, jawaban salah
 * mengembalikannya ke kotak 1. Tiap kotak punya jarak ulang sendiri, jadi huruf
 * yang sering salah muncul lagi hari itu juga, sementara yang sudah hafal baru
 * muncul dua minggu kemudian.
 *
 * Semuanya disimpan di localStorage (sekitar 11 KB untuk seluruh kana) — tanpa
 * server, tanpa akun, dan tetap berjalan offline.
 */

/** Jarak ulang tiap kotak dalam hari; indeks 0 dipakai kotak 1. */
export const BOX_INTERVALS = [0, 1, 3, 7, 14] as const

export const MAX_BOX = BOX_INTERVALS.length

export interface KanaProgress {
  /** Kotak Leitner 1..5. */
  box: number
  /** Tanggal jatuh tempo berikutnya, format YYYY-MM-DD waktu setempat. */
  due: string
  /** Berapa kali huruf ini diujikan. */
  seen: number
  /** Berapa kali dijawab benar. */
  ok: number
}

export type ProgressMap = Record<string, KanaProgress>

/** Tanggal setempat sebagai YYYY-MM-DD; dipakai sebagai kunci jadwal. */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return date.getFullYear() + '-' + month + '-' + day
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function clampBox(box: number): number {
  return Math.min(Math.max(box, 1), MAX_BOX)
}

/**
 * Hasil satu kali ulangan.
 * Kartu baru (belum ada catatannya) diperlakukan seperti kartu di kotak 1.
 */
export function reviewKana(current: KanaProgress | undefined, correct: boolean, today: Date): KanaProgress {
  const seen = (current?.seen ?? 0) + 1
  const ok = (current?.ok ?? 0) + (correct ? 1 : 0)
  // Huruf yang belum pernah dipelajari dianggap berada di kotak 1.
  const box = correct ? clampBox((current?.box ?? 1) + 1) : 1
  const interval = BOX_INTERVALS[box - 1] ?? 0
  return { box, due: dateKey(addDays(today, interval)), seen, ok }
}

/** Huruf yang belum pernah dipelajari selalu dianggap perlu diulang. */
export function isDue(progress: KanaProgress | undefined, today: Date): boolean {
  if (!progress) return true
  return progress.due <= dateKey(today)
}

/**
 * Tingkat penguasaan 0..5 untuk penanda di tabel kana.
 * 0 berarti belum pernah disentuh.
 */
export function masteryLevel(progress: KanaProgress | undefined): number {
  if (!progress || progress.seen === 0) return 0
  return clampBox(progress.box)
}

/** Huruf yang jatuh tempo hari ini, yang belum pernah dipelajari didahulukan. */
export function dueKana(ids: readonly string[], map: ProgressMap, today: Date): string[] {
  return ids
    .filter((id) => isDue(map[id], today))
    .sort((a, b) => {
      const left = map[a]
      const right = map[b]
      if (!left && right) return -1
      if (left && !right) return 1
      return (left?.box ?? 0) - (right?.box ?? 0)
    })
}

export interface ProgressSummary {
  /** Huruf yang pernah dipelajari. */
  studied: number
  /** Huruf di kotak 4 atau 5. */
  mastered: number
  /** Huruf yang jatuh tempo hari ini, termasuk yang belum pernah dipelajari. */
  due: number
  total: number
}

export function summarize(ids: readonly string[], map: ProgressMap, today: Date): ProgressSummary {
  let studied = 0
  let mastered = 0
  let due = 0
  for (const id of ids) {
    const progress = map[id]
    if (progress && progress.seen > 0) {
      studied++
      if (progress.box >= 4) mastered++
    }
    if (isDue(progress, today)) due++
  }
  return { studied, mastered, due, total: ids.length }
}

/* ---------- Penyimpanan ---------- */

const STORAGE_KEY = 'nihongo.progress.v1'
const CHANGE_EVENT = 'nihongo:progress'

export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

export function saveProgress(map: ProgressMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Penyimpanan bisa diblokir (mode privat); progres berlaku untuk sesi ini saja.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Mencatat hasil ulangan satu huruf dan mengembalikan peta progres terbaru. */
export function recordReview(id: string, correct: boolean, today: Date = new Date()): ProgressMap {
  const map = loadProgress()
  const next = { ...map, [id]: reviewKana(map[id], correct, today) }
  saveProgress(next)
  return next
}

export function resetProgress(): void {
  saveProgress({})
}

export const PROGRESS_CHANGE_EVENT = CHANGE_EVENT
