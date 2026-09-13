/**
 * Mengunduh data goresan kana dari KanjiVG lalu menyimpannya sebagai JSON siap pakai.
 *
 * Jalankan: npm run build:kana
 *
 * Sumber : https://github.com/KanjiVG/kanjivg (CC BY-SA 3.0, Ulrich Apel)
 * Hasil  : src/data/strokes.json
 *
 * Tiap goresan disimpan sebagai:
 *   - d      : perintah path SVG asli (untuk menggambar & menganimasikan huruf)
 *   - points : SAMPLE_COUNT titik berjarak sama di sepanjang goresan, dalam
 *              ruang koordinat 109x109 milik KanjiVG (untuk mencocokkan tulisan tangan)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { svgPathProperties } from 'svg-path-properties'

const BASE_URL = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji'
const OUT_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/strokes.json')

/** Jumlah titik sampel per goresan. Harus sama dengan SAMPLE_COUNT di src/writing/strokeMath.ts */
const SAMPLE_COUNT = 32
/** Banyak unduhan paralel; dijaga tetap kecil supaya sopan terhadap server GitHub. */
const CONCURRENCY = 8

/** Rentang kode Unicode yang diambil: hiragana, katakana, dan tanda bunyi panjang. */
const CODEPOINT_RANGES: Array<[number, number]> = [
  [0x3041, 0x3096], // ぁ .. ゖ
  [0x30a1, 0x30fa], // ァ .. ヺ
  [0x30fc, 0x30fc], // ー (chouon)
]

interface Stroke {
  d: string
  points: Array<[number, number]>
}

function codepoints(): number[] {
  const list: number[] = []
  for (const [start, end] of CODEPOINT_RANGES) {
    for (let cp = start; cp <= end; cp++) list.push(cp)
  }
  return list
}

function fileNameFor(codepoint: number): string {
  return `${codepoint.toString(16).padStart(5, '0')}.svg`
}

/** Mengambil atribut d tiap goresan sesuai urutan penulisannya (kvg:XXXXX-sN). */
function extractStrokePaths(svg: string): string[] {
  const strokeSection = svg.slice(0, svg.indexOf('StrokeNumbers') >>> 0 || svg.length)
  const matches = strokeSection.matchAll(/<path[^>]*\sid="kvg:[^"]*-s(\d+)"[^>]*\sd="([^"]+)"/g)
  return [...matches]
    .map(([, order, d]) => ({ order: Number(order), d }))
    .sort((a, b) => a.order - b.order)
    .map((stroke) => stroke.d)
}

function samplePath(d: string): Array<[number, number]> {
  const path = new svgPathProperties(d)
  const total = path.getTotalLength()
  const points: Array<[number, number]> = []
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const { x, y } = path.getPointAtLength((total * i) / (SAMPLE_COUNT - 1))
    points.push([round(x), round(y)])
  }
  return points
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

async function fetchKana(codepoint: number): Promise<[string, Stroke[]] | null> {
  const response = await fetch(`${BASE_URL}/${fileNameFor(codepoint)}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Gagal mengunduh ${fileNameFor(codepoint)}: HTTP ${response.status}`)

  const paths = extractStrokePaths(await response.text())
  if (paths.length === 0) return null

  const strokes = paths.map((d) => ({ d, points: samplePath(d) }))
  return [String.fromCodePoint(codepoint), strokes]
}

async function main(): Promise<void> {
  const queue = codepoints()
  const result: Record<string, Stroke[]> = {}
  let missing = 0

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (let cp = queue.shift(); cp !== undefined; cp = queue.shift()) {
      const entry = await fetchKana(cp)
      if (entry) result[entry[0]] = entry[1]
      else missing++
    }
  })
  await Promise.all(workers)

  const sorted = Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.codePointAt(0)! - b.codePointAt(0)!),
  )

  await mkdir(dirname(OUT_FILE), { recursive: true })
  await writeFile(OUT_FILE, `${JSON.stringify(sorted, null, 0)}\n`, 'utf8')

  const strokeCount = Object.values(sorted).reduce((sum, strokes) => sum + strokes.length, 0)
  console.log(`${Object.keys(sorted).length} huruf, ${strokeCount} goresan -> ${OUT_FILE}`)
  if (missing > 0) console.log(`${missing} kode Unicode dilewati (tidak ada di KanjiVG).`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
