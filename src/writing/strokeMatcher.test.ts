import { describe, expect, it } from 'vitest'
import { ALL_KANA } from '../data/kana'
import { getStrokes, type ReferenceStroke } from '../data/strokes'
import { feedbackMessage, matchStroke, scoreCharacter } from './strokeMatcher'
import { reverse, type Point } from './strokeMath'

function strokesOf(char: string): ReferenceStroke[] {
  const strokes = getStrokes(char)
  if (!strokes) throw new Error('Data goresan tidak ada untuk ' + char)
  return strokes
}

function pointsOf(char: string, index: number): Point[] {
  return strokesOf(char)[index]!.points as Point[]
}

/** PRNG sederhana supaya "coretan tangan" pada test selalu sama di tiap run. */
function acakTerkendali(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/** Meniru tulisan tangan: titik acuan digeser sedikit secara acak. */
function goyangkan(points: readonly Point[], amplitudo: number, seed = 7): Point[] {
  const acak = acakTerkendali(seed)
  return points.map(([x, y]) => [
    x + (acak() - 0.5) * 2 * amplitudo,
    y + (acak() - 0.5) * 2 * amplitudo,
  ])
}

function geser(points: readonly Point[], dx: number, dy: number): Point[] {
  return points.map(([x, y]) => [x + dx, y + dy])
}

describe('matchStroke pada goresan yang benar', () => {
  it('menerima seluruh goresan acuan dari semua huruf', () => {
    const gagal: string[] = []
    for (const char of new Set(ALL_KANA.flatMap((kana) => kana.components))) {
      const reference = strokesOf(char)
      reference.forEach((stroke, index) => {
        const match = matchStroke(stroke.points as Point[], reference, index)
        if (match.verdict !== 'correct') gagal.push(char + ' goresan ' + String(index + 1) + ': ' + match.verdict)
      })
    }
    expect(gagal).toEqual([])
  })

  it('memberi kualitas penuh untuk goresan yang persis', () => {
    const reference = strokesOf('あ')
    const match = matchStroke(pointsOf('あ', 0), reference, 0)
    expect(match.verdict).toBe('correct')
    expect(match.quality).toBeGreaterThan(0.95)
    expect(match.deviation).toBeLessThan(0.5)
  })

  it('memaafkan goresan tangan yang sedikit bergoyang', () => {
    for (const char of ['あ', 'き', 'ぬ', 'ツ', 'ボ']) {
      const reference = strokesOf(char)
      reference.forEach((stroke, index) => {
        const match = matchStroke(goyangkan(stroke.points as Point[], 2.5, index + 1), reference, index)
        expect(match.verdict, char + ' goresan ' + String(index + 1)).toBe('correct')
      })
    }
  })

  it('memaafkan pergeseran kecil tetapi menolak yang jauh', () => {
    const reference = strokesOf('く')
    expect(matchStroke(geser(pointsOf('く', 0), 5, 4), reference, 0).verdict).toBe('correct')
    expect(matchStroke(geser(pointsOf('く', 0), 35, 30), reference, 0).verdict).toBe('wrong-shape')
  })

  it('mengikuti tingkat toleransi', () => {
    const reference = strokesOf('の')
    const agakMeleset = geser(pointsOf('の', 0), 13, 11)
    expect(matchStroke(agakMeleset, reference, 0, { tolerance: 'mudah' }).verdict).toBe('correct')
    expect(matchStroke(agakMeleset, reference, 0, { tolerance: 'ketat' }).verdict).not.toBe('correct')
  })
})

describe('matchStroke pada goresan yang salah', () => {
  it('mengenali goresan yang ditulis terbalik', () => {
    for (const char of ['い', 'こ', 'ト']) {
      const reference = strokesOf(char)
      const match = matchStroke(reverse(pointsOf(char, 0)), reference, 0)
      expect(match.verdict, char).toBe('reversed')
    }
  })

  it('mengenali goresan yang tertukar urutannya', () => {
    const reference = strokesOf('あ')
    const match = matchStroke(pointsOf('あ', 2), reference, 0)
    expect(match.verdict).toBe('wrong-order')
    expect(match.matchedIndex).toBe(2)
  })

  it('menolak coretan yang tidak menyerupai goresan mana pun', () => {
    const reference = strokesOf('さ')
    const coretan: Point[] = [
      [5, 100],
      [50, 95],
      [100, 105],
    ]
    const match = matchStroke(coretan, reference, 0)
    expect(match.verdict).toBe('wrong-shape')
    expect(match.matchedIndex).toBeNull()
    expect(match.quality).toBe(0)
  })

  it('menolak goresan yang jauh lebih panjang dari acuan', () => {
    const reference = strokesOf('へ')
    const terlaluPanjang: Point[] = [
      [2, 2],
      [107, 107],
      [2, 107],
      [107, 2],
    ]
    expect(matchStroke(terlaluPanjang, reference, 0).verdict).toBe('wrong-shape')
  })

  it('menangani goresan kosong dan indeks di luar jangkauan', () => {
    const reference = strokesOf('つ')
    expect(matchStroke([], reference, 0).verdict).toBe('wrong-shape')
    expect(matchStroke(pointsOf('つ', 0), reference, 9).verdict).toBe('wrong-shape')
  })
})

describe('umpan balik & nilai huruf', () => {
  it('menyusun pesan sesuai jenis kesalahan', () => {
    const reference = strokesOf('あ')
    expect(feedbackMessage(matchStroke(pointsOf('あ', 0), reference, 0))).toBe('Bagus!')
    expect(feedbackMessage(matchStroke(reverse(pointsOf('あ', 1)), reference, 1))).toContain('terbalik')
    expect(feedbackMessage(matchStroke(pointsOf('あ', 2), reference, 0))).toBe(
      'Itu goresan ke-3. Tulis goresan ke-1 dulu.',
    )
  })

  it('menghitung nilai satu huruf utuh', () => {
    const reference = strokesOf('き')
    const matches = reference.map((stroke, index) =>
      matchStroke(goyangkan(stroke.points as Point[], 2, index + 5), reference, index),
    )
    const nilai = scoreCharacter(matches, reference.length)
    expect(nilai.correct).toBe(reference.length)
    expect(nilai.total).toBe(reference.length)
    expect(nilai.accuracy).toBeGreaterThan(0.6)
    expect(nilai.accuracy).toBeLessThanOrEqual(1)
  })

  it('memberi nilai nol bila tidak ada goresan yang benar', () => {
    expect(scoreCharacter([], 3)).toEqual({ accuracy: 0, correct: 0, total: 3 })
  })
})
