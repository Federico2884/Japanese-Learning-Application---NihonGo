/**
 * Menilai satu goresan tulisan tangan terhadap goresan acuan KanjiVG.
 *
 * Penilaian memakai tiga hal yang juga dinilai guru saat mengoreksi tulisan:
 *   1. bentuk   - seberapa dekat jalur goresan dengan acuan
 *   2. arah     - digoreskan dari ujung yang benar atau terbalik
 *   3. urutan   - goresan ke berapa yang sebenarnya ditulis
 *
 * Fungsi di sini murni (tanpa DOM) supaya bisa diuji langsung dengan data goresan asli.
 */
import type { ReferenceStroke } from '../data/strokes'
import {
  SAMPLE_COUNT,
  averageDistance,
  clamp,
  directionSimilarity,
  distance,
  maxDistance,
  pathLength,
  resample,
  reverse,
  smooth,
  type Point,
} from './strokeMath'

export type StrokeVerdict =
  /** Goresan benar. */
  | 'correct'
  /** Bentuk & posisi cocok, tetapi ditulis dari ujung yang salah. */
  | 'reversed'
  /** Yang ditulis adalah goresan lain dari huruf yang sama. */
  | 'wrong-order'
  /** Tidak menyerupai goresan mana pun pada huruf ini. */
  | 'wrong-shape'

export type Tolerance = 'mudah' | 'normal' | 'ketat'

export interface StrokeMatch {
  verdict: StrokeVerdict
  /** Goresan yang seharusnya ditulis. */
  expectedIndex: number
  /** Goresan yang paling menyerupai tulisan pengguna, bila ada. */
  matchedIndex: number | null
  /** Selisih rata-rata terhadap goresan acuan, dalam satuan ruang 109 x 109. */
  deviation: number
  /** Kualitas goresan 0..1 (1 = persis mengikuti acuan). */
  quality: number
}

export interface MatchOptions {
  tolerance?: Tolerance
}

/** Ambang selisih dasar (satuan 109 x 109) untuk goresan berukuran sedang. */
const BASE_THRESHOLD = 15

const TOLERANCE_FACTOR: Record<Tolerance, number> = {
  mudah: 1.4,
  normal: 1,
  ketat: 0.72,
}

/** Panjang goresan acuan yang dianggap "sedang"; dipakai untuk menskalakan ambang. */
const REFERENCE_LENGTH = 45

/** Goresan yang jauh lebih panjang/pendek dari acuan langsung dianggap salah bentuk. */
const LENGTH_RATIO_LIMIT = 2.5

/** Jumlah titik saat goresan diringkas untuk mengukur panjangnya. */
const COARSE_SAMPLE_COUNT = 10

/**
 * Ambang selisih untuk sebuah goresan acuan.
 * Goresan pendek (mis. titik pada dakuten) mendapat ambang lebih kecil agar tetap bermakna,
 * sedangkan goresan panjang diberi kelonggaran lebih besar.
 */
function thresholdFor(reference: readonly Point[], tolerance: Tolerance): number {
  const length = pathLength(reference)
  const lengthFactor = clamp(0.55 + (0.45 * length) / REFERENCE_LENGTH, 0.55, 1.35)
  return BASE_THRESHOLD * lengthFactor * TOLERANCE_FACTOR[tolerance]
}

/**
 * Selisih gabungan antara goresan pengguna dan acuan: rata-rata jarak titik,
 * ditambah bobot untuk titik awal, titik akhir, dan simpangan terjauh.
 */
function deviationBetween(user: readonly Point[], reference: readonly Point[]): number {
  const average = averageDistance(user, reference)
  const start = distance(user[0]!, reference[0]!)
  const end = distance(user[user.length - 1]!, reference[reference.length - 1]!)
  const worst = maxDistance(user, reference)
  return average * 0.55 + start * 0.15 + end * 0.15 + worst * 0.15
}

/**
 * Perbandingan panjang goresan pengguna terhadap acuan.
 * Keduanya diringkas dulu menjadi beberapa titik saja supaya getaran tangan
 * tidak membuat goresan pendek terhitung jauh lebih panjang dari seharusnya.
 */
function lengthRatio(user: readonly Point[], reference: readonly Point[]): number {
  const userLength = pathLength(resample(user, COARSE_SAMPLE_COUNT))
  const referenceLength = pathLength(resample(reference, COARSE_SAMPLE_COUNT))
  if (referenceLength === 0) return 1
  return userLength / referenceLength
}

/** Mengubah selisih menjadi nilai kualitas 0..1 terhadap ambangnya. */
function qualityFrom(deviation: number, threshold: number): number {
  return clamp(1 - deviation / (threshold * 2), 0, 1)
}

/**
 * Menilai satu goresan pengguna.
 *
 * @param userPoints  titik mentah dari kanvas, sudah dalam ruang 109 x 109
 * @param reference   seluruh goresan acuan huruf yang sedang ditulis
 * @param expectedIndex goresan ke berapa yang seharusnya ditulis
 */
export function matchStroke(
  userPoints: readonly Point[],
  reference: readonly ReferenceStroke[],
  expectedIndex: number,
  options: MatchOptions = {},
): StrokeMatch {
  const tolerance = options.tolerance ?? 'normal'
  const expected = reference[expectedIndex]
  if (!expected) {
    return { verdict: 'wrong-shape', expectedIndex, matchedIndex: null, deviation: Infinity, quality: 0 }
  }

  const user = smooth(resample(userPoints, SAMPLE_COUNT))
  if (user.length === 0) {
    return { verdict: 'wrong-shape', expectedIndex, matchedIndex: null, deviation: Infinity, quality: 0 }
  }

  const expectedPoints = expected.points as Point[]
  const threshold = thresholdFor(expectedPoints, tolerance)
  const deviation = deviationBetween(user, expectedPoints)
  const ratio = lengthRatio(user, expectedPoints)
  const proporsional = ratio <= LENGTH_RATIO_LIMIT && ratio >= 1 / LENGTH_RATIO_LIMIT

  if (deviation <= threshold && proporsional) {
    return {
      verdict: 'correct',
      expectedIndex,
      matchedIndex: expectedIndex,
      deviation,
      quality: qualityFrom(deviation, threshold),
    }
  }

  // Bentuknya benar tapi ditulis dari ujung yang salah?
  const reversedDeviation = deviationBetween(reverse(user), expectedPoints)
  if (
    reversedDeviation <= threshold &&
    proporsional &&
    directionSimilarity(user, expectedPoints) < 0
  ) {
    return {
      verdict: 'reversed',
      expectedIndex,
      matchedIndex: expectedIndex,
      deviation: reversedDeviation,
      quality: qualityFrom(reversedDeviation, threshold),
    }
  }

  // Mungkin pengguna menulis goresan lain dari huruf yang sama.
  let bestIndex: number | null = null
  let bestDeviation = Number.POSITIVE_INFINITY
  for (let i = 0; i < reference.length; i++) {
    if (i === expectedIndex) continue
    const candidate = reference[i]!.points as Point[]
    const candidateDeviation = deviationBetween(user, candidate)
    if (candidateDeviation < bestDeviation && candidateDeviation <= thresholdFor(candidate, tolerance)) {
      bestDeviation = candidateDeviation
      bestIndex = i
    }
  }

  if (bestIndex !== null && bestDeviation < deviation) {
    return {
      verdict: 'wrong-order',
      expectedIndex,
      matchedIndex: bestIndex,
      deviation: bestDeviation,
      quality: 0,
    }
  }

  return { verdict: 'wrong-shape', expectedIndex, matchedIndex: null, deviation, quality: 0 }
}

/** Pesan singkat berbahasa Indonesia untuk ditampilkan setelah satu goresan dinilai. */
export function feedbackMessage(match: StrokeMatch): string {
  switch (match.verdict) {
    case 'correct':
      return match.quality > 0.75 ? 'Bagus!' : 'Benar, rapikan sedikit lagi.'
    case 'reversed':
      return 'Arah goresannya terbalik. Mulai dari ujung yang satunya.'
    case 'wrong-order':
      return 'Itu goresan ke-' + String((match.matchedIndex ?? 0) + 1) + '. Tulis goresan ke-' + String(match.expectedIndex + 1) + ' dulu.'
    case 'wrong-shape':
      return 'Bentuknya belum pas. Coba lagi mengikuti panduan.'
  }
}

export interface CharacterScore {
  /** Rata-rata kualitas goresan yang benar, 0..1. */
  accuracy: number
  correct: number
  total: number
}

/** Ringkasan penilaian satu huruf utuh, dipakai pada mode "dari ingatan" dan kuis. */
export function scoreCharacter(matches: readonly StrokeMatch[], totalStrokes: number): CharacterScore {
  const correct = matches.filter((match) => match.verdict === 'correct')
  const accuracy =
    totalStrokes === 0 ? 0 : correct.reduce((sum, match) => sum + match.quality, 0) / totalStrokes
  return { accuracy, correct: correct.length, total: totalStrokes }
}
