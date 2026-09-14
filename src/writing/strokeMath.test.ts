import { describe, expect, it } from 'vitest'
import {
  averageDistance,
  boundingBox,
  clamp,
  directionSimilarity,
  distance,
  maxDistance,
  overallVector,
  pathLength,
  resample,
  reverse,
  type Point,
} from './strokeMath'

const GARIS_HORIZONTAL: Point[] = [
  [0, 0],
  [10, 0],
  [20, 0],
]

describe('pathLength & distance', () => {
  it('menghitung panjang garis patah', () => {
    expect(distance([0, 0], [3, 4])).toBe(5)
    expect(pathLength(GARIS_HORIZONTAL)).toBe(20)
    expect(pathLength([[5, 5]])).toBe(0)
  })
})

describe('resample', () => {
  it('menghasilkan jumlah titik yang diminta', () => {
    expect(resample(GARIS_HORIZONTAL, 5)).toHaveLength(5)
    expect(resample(GARIS_HORIZONTAL)).toHaveLength(32)
  })

  it('membagi garis lurus menjadi titik berjarak sama', () => {
    expect(resample(GARIS_HORIZONTAL, 5)).toEqual([
      [0, 0],
      [5, 0],
      [10, 0],
      [15, 0],
      [20, 0],
    ])
  })

  it('mempertahankan titik awal dan akhir', () => {
    const titik = resample(
      [
        [2, 3],
        [40, 9],
        [55, 70],
      ],
      8,
    )
    expect(titik[0]).toEqual([2, 3])
    expect(titik[titik.length - 1]).toEqual([55, 70])
  })

  it('menangani goresan berupa satu titik tanpa NaN', () => {
    const titik = resample([[7, 7]], 4)
    expect(titik).toEqual([
      [7, 7],
      [7, 7],
      [7, 7],
      [7, 7],
    ])
  })

  it('mengembalikan larik kosong untuk masukan kosong', () => {
    expect(resample([], 10)).toEqual([])
  })
})

describe('perbandingan goresan', () => {
  it('mengukur rata-rata dan simpangan terjauh', () => {
    const a: Point[] = [
      [0, 0],
      [0, 0],
    ]
    const b: Point[] = [
      [0, 2],
      [0, 8],
    ]
    expect(averageDistance(a, b)).toBe(5)
    expect(maxDistance(a, b)).toBe(8)
  })

  it('membalik urutan titik', () => {
    expect(reverse(GARIS_HORIZONTAL)).toEqual([
      [20, 0],
      [10, 0],
      [0, 0],
    ])
  })

  it('menilai arah goresan', () => {
    expect(overallVector(GARIS_HORIZONTAL)).toEqual([20, 0])
    expect(directionSimilarity(GARIS_HORIZONTAL, GARIS_HORIZONTAL)).toBe(1)
    expect(directionSimilarity(GARIS_HORIZONTAL, reverse(GARIS_HORIZONTAL))).toBe(-1)
    expect(
      directionSimilarity(GARIS_HORIZONTAL, [
        [0, 0],
        [0, 20],
      ]),
    ).toBeCloseTo(0)
  })

  it('menganggap goresan tanpa arah sebagai searah', () => {
    expect(directionSimilarity([[1, 1]], GARIS_HORIZONTAL)).toBe(1)
  })
})

describe('boundingBox & clamp', () => {
  it('menghitung kotak pembatas', () => {
    expect(
      boundingBox([
        [4, 10],
        [20, 2],
        [12, 30],
      ]),
    ).toEqual({ minX: 4, minY: 2, maxX: 20, maxY: 30, width: 16, height: 28 })
  })

  it('membatasi nilai ke rentangnya', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(42, 0, 10)).toBe(10)
  })
})
