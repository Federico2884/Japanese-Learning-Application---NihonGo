/**
 * Fungsi geometri untuk membandingkan goresan tulisan tangan dengan goresan acuan.
 *
 * Semua koordinat berada di ruang 109 x 109 milik KanjiVG (lihat src/data/strokes.ts),
 * sehingga ambang batas di strokeMatcher.ts bisa ditulis dalam satuan yang sama
 * tanpa peduli ukuran kanvas di layar.
 *
 * Seluruh fungsi di sini murni (tanpa DOM) supaya mudah diuji.
 */

export type Point = [x: number, y: number]

/** Jumlah titik sampel per goresan. Sama dengan SAMPLE_COUNT di scripts/build-kana-data.ts. */
export const SAMPLE_COUNT = 32

export function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

/** Panjang total garis yang melewati semua titik. */
export function pathLength(points: readonly Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1]!, points[i]!)
  return total
}

/**
 * Menyusun ulang goresan menjadi `count` titik berjarak sama.
 * Goresan yang hanya berupa titik (mis. ketukan pendek) dikembalikan sebagai titik berulang.
 */
export function resample(points: readonly Point[], count: number = SAMPLE_COUNT): Point[] {
  if (points.length === 0) return []
  const first = points[0]!
  const total = pathLength(points)
  if (points.length === 1 || total === 0) {
    return Array.from({ length: count }, () => [first[0], first[1]] as Point)
  }

  const step = total / (count - 1)
  const result: Point[] = [[first[0], first[1]]]
  let segmentIndex = 1
  let traveled = 0

  for (let i = 1; i < count - 1; i++) {
    const target = step * i
    while (segmentIndex < points.length - 1 && traveled + distance(points[segmentIndex - 1]!, points[segmentIndex]!) < target) {
      traveled += distance(points[segmentIndex - 1]!, points[segmentIndex]!)
      segmentIndex++
    }
    const from = points[segmentIndex - 1]!
    const to = points[segmentIndex]!
    const segmentLength = distance(from, to)
    const ratio = segmentLength === 0 ? 0 : (target - traveled) / segmentLength
    result.push([from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio])
  }

  const last = points[points.length - 1]!
  result.push([last[0], last[1]])
  return result
}

/** Rata-rata jarak titik ke titik antara dua goresan dengan jumlah titik sama. */
export function averageDistance(a: readonly Point[], b: readonly Point[]): number {
  const length = Math.min(a.length, b.length)
  if (length === 0) return Number.POSITIVE_INFINITY
  let total = 0
  for (let i = 0; i < length; i++) total += distance(a[i]!, b[i]!)
  return total / length
}

/** Jarak titik terjauh antara dua goresan; menangkap kesalahan bentuk yang terlokalisasi. */
export function maxDistance(a: readonly Point[], b: readonly Point[]): number {
  const length = Math.min(a.length, b.length)
  if (length === 0) return Number.POSITIVE_INFINITY
  let max = 0
  for (let i = 0; i < length; i++) max = Math.max(max, distance(a[i]!, b[i]!))
  return max
}

export function reverse(points: readonly Point[]): Point[] {
  return [...points].reverse()
}

/** Vektor dari titik awal ke titik akhir goresan. */
export function overallVector(points: readonly Point[]): Point {
  if (points.length === 0) return [0, 0]
  const first = points[0]!
  const last = points[points.length - 1]!
  return [last[0] - first[0], last[1] - first[1]]
}

/**
 * Kemiripan arah dua goresan: 1 searah, 0 tegak lurus, -1 berlawanan.
 * Goresan yang nyaris berupa titik dianggap searah (tidak punya arah yang berarti).
 */
export function directionSimilarity(a: readonly Point[], b: readonly Point[]): number {
  const [ax, ay] = overallVector(a)
  const [bx, by] = overallVector(b)
  const magnitude = Math.hypot(ax, ay) * Math.hypot(bx, by)
  if (magnitude === 0) return 1
  return (ax * bx + ay * by) / magnitude
}

export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export function boundingBox(points: readonly Point[]): BoundingBox {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const [x, y] of points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/** Membatasi nilai ke rentang [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Meratakan goresan dengan rata-rata bergerak.
 * Tulisan tangan (apalagi dengan jari) selalu bergetar; perataan ini membuang getaran
 * tersebut supaya penilaian menilai bentuk, bukan goyangan tangan.
 */
export function smooth(points: readonly Point[], window = 1): Point[] {
  if (window <= 0 || points.length <= 2) return points.map(([x, y]) => [x, y] as Point)
  return points.map((_, index) => {
    const from = Math.max(0, index - window)
    const to = Math.min(points.length - 1, index + window)
    let sumX = 0
    let sumY = 0
    for (let i = from; i <= to; i++) {
      sumX += points[i]![0]
      sumY += points[i]![1]
    }
    const count = to - from + 1
    return [sumX / count, sumY / count] as Point
  })
}
