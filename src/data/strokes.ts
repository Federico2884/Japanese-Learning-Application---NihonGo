/**
 * Akses data goresan hasil `npm run build:kana`.
 *
 * Data berasal dari KanjiVG (CC BY-SA 3.0). Semua koordinat berada di ruang
 * 109 x 109 sesuai viewBox KanjiVG, jadi kanvas latihan juga memakai ruang yang sama.
 */
import strokesData from './strokes.json'
import type { Kana } from './kana'

export interface ReferenceStroke {
  /** Perintah path SVG, untuk menggambar dan menganimasikan goresan. */
  d: string
  /** Titik sampel berjarak sama di sepanjang goresan, untuk mencocokkan tulisan tangan. */
  points: Array<[number, number]>
}

/** Panjang sisi ruang koordinat KanjiVG. */
export const KANJIVG_SIZE = 109

const STROKES = strokesData as unknown as Record<string, ReferenceStroke[]>

/** Goresan satu huruf tunggal, mis. "き". */
export function getStrokes(char: string): ReferenceStroke[] | undefined {
  return STROKES[char]
}

export function hasStrokes(char: string): boolean {
  return char in STROKES
}

/**
 * Goresan tiap huruf penyusun sebuah kana.
 * Huruf tunggal menghasilkan satu kelompok, yōon (mis. きゃ) menghasilkan dua.
 */
export function getComponentStrokes(kana: Kana): ReferenceStroke[][] {
  return kana.components.map((char) => getStrokes(char) ?? [])
}

/** Jumlah goresan sebuah huruf tunggal; 0 bila datanya tidak ada. */
export function countStrokes(char: string): number {
  return getStrokes(char)?.length ?? 0
}
