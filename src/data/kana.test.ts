import { describe, expect, it } from 'vitest'
import {
  ALL_KANA,
  HIRAGANA,
  KATAKANA,
  findKana,
  findKanaById,
  getChartRows,
  getKana,
  getYoonRows,
  toKatakana,
} from './kana'
import { getStrokes } from './strokes'

describe('katalog kana', () => {
  it('punya 46 huruf gojuon untuk tiap skrip', () => {
    for (const script of ['hiragana', 'katakana'] as const) {
      const gojuon = getKana(script).filter((kana) => kana.group === 'gojuon')
      expect(gojuon).toHaveLength(46)
    }
  })

  it('punya 20 dakuten, 5 handakuten, 9 huruf kecil, dan 33 yoon', () => {
    const count = (group: string) => HIRAGANA.filter((kana) => kana.group === group).length
    expect(count('dakuten')).toBe(20)
    expect(count('handakuten')).toBe(5)
    expect(count('small')).toBe(9)
    expect(count('yoon')).toBe(33)
  })

  it('menambahkan tanda bunyi panjang hanya pada katakana', () => {
    expect(findKana('ー', 'katakana')?.group).toBe('special')
    expect(HIRAGANA.some((kana) => kana.group === 'special')).toBe(false)
    expect(KATAKANA).toHaveLength(HIRAGANA.length + 1)
  })

  it('memakai id yang unik', () => {
    const ids = new Set(ALL_KANA.map((kana) => kana.id))
    expect(ids.size).toBe(ALL_KANA.length)
  })

  it('menurunkan katakana dari hiragana dengan romaji yang sama', () => {
    expect(toKatakana('あ')).toBe('ア')
    expect(toKatakana('きゃ')).toBe('キャ')
    expect(findKana('ア', 'katakana')?.romaji).toBe(findKana('あ', 'hiragana')?.romaji)
    expect(findKana('キャ', 'katakana')?.romaji).toBe('kya')
  })

  it('mencari huruf lewat id', () => {
    expect(findKanaById('hiragana-し')?.romaji).toBe('shi')
    expect(findKanaById('katakana-ツ')?.romaji).toBe('tsu')
    expect(findKanaById('hiragana-X')).toBeUndefined()
  })
})

describe('tata letak tabel', () => {
  it('memberi lima kolom pada tiap baris gojuon', () => {
    const rows = getChartRows('hiragana', 'gojuon')
    expect(rows).toHaveLength(11)
    for (const row of rows) expect(row.cells).toHaveLength(5)
  })

  it('mengosongkan sel yang memang tidak ada hurufnya', () => {
    const rows = getChartRows('hiragana', 'gojuon')
    const ya = rows.find((row) => row.row === 'ya')
    expect(ya?.cells.map((cell) => cell?.char ?? null)).toEqual(['や', null, 'ゆ', null, 'よ'])
  })

  it('mengelompokkan yoon menjadi baris berisi tiga huruf', () => {
    const rows = getYoonRows('hiragana')
    expect(rows).toHaveLength(11)
    for (const row of rows) expect(row.cells).toHaveLength(3)
    expect(rows[0]?.cells.map((cell) => cell?.char)).toEqual(['きゃ', 'きゅ', 'きょ'])
  })
})

describe('data goresan', () => {
  it('tersedia untuk setiap huruf penyusun', () => {
    const tanpaData = ALL_KANA.flatMap((kana) => kana.components).filter(
      (char) => getStrokes(char) === undefined,
    )
    expect(tanpaData).toEqual([])
  })

  it('memakai jumlah goresan yang benar dan titik sampel yang konsisten', () => {
    expect(getStrokes('あ')).toHaveLength(3)
    expect(getStrokes('ん')).toHaveLength(1)
    expect(getStrokes('が')).toHaveLength(5)

    for (const stroke of getStrokes('あ') ?? []) {
      expect(stroke.points).toHaveLength(32)
      expect(stroke.d.length).toBeGreaterThan(0)
    }
  })

  it('menjaga semua titik berada di dalam ruang 109 x 109', () => {
    const semuaTitik = ALL_KANA.flatMap((kana) => kana.components)
      .flatMap((char) => getStrokes(char) ?? [])
      .flatMap((stroke) => stroke.points)

    for (const [x, y] of semuaTitik) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(109)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(109)
    }
  })
})
