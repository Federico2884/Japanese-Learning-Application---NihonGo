/**
 * Katalog huruf kana.
 *
 * Hiragana ditulis lengkap di sini, lalu katakana diturunkan dari kode Unicode-nya
 * (ぁ U+3041 .. ん U+3093 berpasangan dengan ァ U+30A1 .. ン U+30F3, selisihnya tetap 0x60).
 * Dengan begitu romaji cukup ditulis satu kali dan tidak mungkin beda antar skrip.
 */

export type KanaScript = 'hiragana' | 'katakana'

export type KanaGroup =
  | 'gojuon' // huruf dasar
  | 'dakuten' // tanda dua garis: が ざ だ ば
  | 'handakuten' // tanda lingkaran: ぱ
  | 'small' // huruf kecil: ゃ ゅ ょ っ ぁ
  | 'yoon' // gabungan dua huruf: きゃ しゅ ちょ
  | 'special' // khusus katakana: ー

export interface Kana {
  /** Kunci unik lintas skrip, mis. "hiragana-きゃ". Dipakai untuk progres & routing. */
  id: string
  /** Huruf yang ditampilkan (yōon terdiri atas dua huruf). */
  char: string
  romaji: string
  script: KanaScript
  group: KanaGroup
  /** Baris gojūon: a, ka, sa, ... Dipakai untuk mengurutkan tabel dan memilih materi latihan. */
  row: string
  /**
   * Huruf penyusun yang punya data goresan sendiri.
   * Huruf tunggal berisi satu huruf, yōon berisi dua huruf.
   */
  components: string[]
}

/** Selisih kode Unicode hiragana ke katakana. */
const KATAKANA_OFFSET = 0x60

type Cell = readonly [char: string, romaji: string] | null

interface KanaTableRow {
  row: string
  cells: readonly Cell[]
}

const GOJUON: readonly KanaTableRow[] = [
  { row: 'a', cells: [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o']] },
  { row: 'ka', cells: [['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko']] },
  { row: 'sa', cells: [['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so']] },
  { row: 'ta', cells: [['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to']] },
  { row: 'na', cells: [['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no']] },
  { row: 'ha', cells: [['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho']] },
  { row: 'ma', cells: [['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo']] },
  { row: 'ya', cells: [['や', 'ya'], null, ['ゆ', 'yu'], null, ['よ', 'yo']] },
  { row: 'ra', cells: [['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro']] },
  { row: 'wa', cells: [['わ', 'wa'], null, null, null, ['を', 'wo']] },
  { row: 'n', cells: [['ん', 'n'], null, null, null, null] },
]

const DAKUTEN: readonly KanaTableRow[] = [
  { row: 'ga', cells: [['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'], ['ご', 'go']] },
  { row: 'za', cells: [['ざ', 'za'], ['じ', 'ji'], ['ず', 'zu'], ['ぜ', 'ze'], ['ぞ', 'zo']] },
  { row: 'da', cells: [['だ', 'da'], ['ぢ', 'ji'], ['づ', 'zu'], ['で', 'de'], ['ど', 'do']] },
  { row: 'ba', cells: [['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'], ['ぼ', 'bo']] },
]

const HANDAKUTEN: readonly KanaTableRow[] = [
  { row: 'pa', cells: [['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'], ['ぽ', 'po']] },
]

const SMALL: readonly KanaTableRow[] = [
  { row: 'small-vokal', cells: [['ぁ', 'a'], ['ぃ', 'i'], ['ぅ', 'u'], ['ぇ', 'e'], ['ぉ', 'o']] },
  { row: 'small-ya', cells: [['ゃ', 'ya'], null, ['ゅ', 'yu'], null, ['ょ', 'yo']] },
  { row: 'small-tsu', cells: [['っ', '(konsonan ganda)'], null, null, null, null] },
]

/** Huruf dasar yōon beserta awalan romaji-nya. */
const YOON_BASES: ReadonlyArray<readonly [base: string, prefix: string]> = [
  ['き', 'ky'],
  ['し', 'sh'],
  ['ち', 'ch'],
  ['に', 'ny'],
  ['ひ', 'hy'],
  ['み', 'my'],
  ['り', 'ry'],
  ['ぎ', 'gy'],
  ['じ', 'j'],
  ['び', 'by'],
  ['ぴ', 'py'],
]

/** Huruf kecil penyusun yōon beserta vokal romaji-nya. */
const YOON_SMALL: ReadonlyArray<readonly [small: string, vowel: string]> = [
  ['ゃ', 'a'],
  ['ゅ', 'u'],
  ['ょ', 'o'],
]

/** Mengubah huruf hiragana menjadi katakana pasangannya. */
export function toKatakana(hiragana: string): string {
  return [...hiragana]
    .map((char) => String.fromCodePoint(char.codePointAt(0)! + KATAKANA_OFFSET))
    .join('')
}

function makeKana(
  char: string,
  romaji: string,
  script: KanaScript,
  group: KanaGroup,
  row: string,
): Kana {
  const finalChar = script === 'katakana' ? toKatakana(char) : char
  return {
    id: script + '-' + finalChar,
    char: finalChar,
    romaji,
    script,
    group,
    row,
    components: [...finalChar],
  }
}

function buildTable(table: readonly KanaTableRow[], script: KanaScript, group: KanaGroup): Kana[] {
  return table.flatMap(({ row, cells }) =>
    cells
      .filter((cell): cell is NonNullable<Cell> => cell !== null)
      .map(([char, romaji]) => makeKana(char, romaji, script, group, row)),
  )
}

function buildYoon(script: KanaScript): Kana[] {
  return YOON_BASES.flatMap(([base, prefix]) =>
    YOON_SMALL.map(([small, vowel]) =>
      makeKana(base + small, prefix + vowel, script, 'yoon', 'yoon-' + prefix),
    ),
  )
}

/** Tanda bunyi panjang, hanya dipakai pada katakana. */
const CHOUON: Kana = {
  id: 'katakana-ー',
  char: 'ー',
  romaji: 'bunyi panjang',
  script: 'katakana',
  group: 'special',
  row: 'chouon',
  components: ['ー'],
}

function buildScript(script: KanaScript): Kana[] {
  const kana = [
    ...buildTable(GOJUON, script, 'gojuon'),
    ...buildTable(DAKUTEN, script, 'dakuten'),
    ...buildTable(HANDAKUTEN, script, 'handakuten'),
    ...buildTable(SMALL, script, 'small'),
    ...buildYoon(script),
  ]
  return script === 'katakana' ? [...kana, CHOUON] : kana
}

export const HIRAGANA: readonly Kana[] = buildScript('hiragana')
export const KATAKANA: readonly Kana[] = buildScript('katakana')
export const ALL_KANA: readonly Kana[] = [...HIRAGANA, ...KATAKANA]

const BY_ID = new Map(ALL_KANA.map((kana) => [kana.id, kana]))

export function getKana(script: KanaScript): readonly Kana[] {
  return script === 'hiragana' ? HIRAGANA : KATAKANA
}

export function findKanaById(id: string): Kana | undefined {
  return BY_ID.get(id)
}

export function findKana(char: string, script: KanaScript): Kana | undefined {
  return BY_ID.get(script + '-' + char)
}

/** Satu baris tabel kana: lima kolom vokal, sel kosong diisi null. */
export interface KanaChartRow {
  row: string
  cells: Array<Kana | null>
}

const CHART_TABLES = {
  gojuon: GOJUON,
  dakuten: DAKUTEN,
  handakuten: HANDAKUTEN,
  small: SMALL,
} as const

export type ChartGroup = keyof typeof CHART_TABLES

/** Bentuk tabel (baris x 5 kolom) untuk halaman daftar kana. */
export function getChartRows(script: KanaScript, group: ChartGroup): KanaChartRow[] {
  return CHART_TABLES[group].map(({ row, cells }) => ({
    row,
    cells: cells.map((cell) => {
      if (!cell) return null
      const char = script === 'katakana' ? toKatakana(cell[0]) : cell[0]
      return findKana(char, script) ?? null
    }),
  }))
}

/** Baris yōon: tiap baris berisi tiga gabungan (きゃ きゅ きょ). */
export function getYoonRows(script: KanaScript): KanaChartRow[] {
  const yoon = getKana(script).filter((kana) => kana.group === 'yoon')
  const rows = [...new Set(yoon.map((kana) => kana.row))]
  return rows.map((row) => ({ row, cells: yoon.filter((kana) => kana.row === row) }))
}

/** Judul kolom tabel gojūon. */
export const VOWEL_COLUMNS = ['a', 'i', 'u', 'e', 'o'] as const
