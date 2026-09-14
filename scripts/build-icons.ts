/**
 * Membuat ikon aplikasi dari data goresan KanjiVG.
 *
 * Jalankan: npm run build:icons
 *
 * Ikonnya huruf あ yang digambar dari jalur goresan, bukan dari font, supaya
 * hasilnya sama di mesin mana pun dan tidak bergantung font yang terpasang.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import strokes from '../src/data/strokes.json'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = resolve(ROOT, 'public/icons')

/** Warna merek: vermilion dan tinta di atas kertas. */
const ACCENT = '#b5454a'
const INK = '#fffdf8'

const VIEWBOX = 109

interface Icon {
  file: string
  size: number
  /** Bagian sisi yang dipakai sebagai ruang kosong di tepi (0–0.5). */
  padding: number
  rounded: boolean
}

const ICONS: Icon[] = [
  { file: 'icon-192.png', size: 192, padding: 0.14, rounded: true },
  { file: 'icon-512.png', size: 512, padding: 0.14, rounded: true },
  // Ikon maskable dipotong browser menjadi lingkaran/kotak membulat,
  // jadi hurufnya diberi ruang kosong lebih lebar.
  { file: 'icon-maskable-512.png', size: 512, padding: 0.26, rounded: false },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.16, rounded: false },
]

function iconSvg({ size, padding, rounded }: Icon): string {
  const inner = size * (1 - padding * 2)
  const scale = inner / VIEWBOX
  const offset = size * padding
  const radius = rounded ? size * 0.22 : 0
  const paths = (strokes as unknown as Record<string, Array<{ d: string }>>)['あ'] ?? []

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '">',
    '<rect width="' + size + '" height="' + size + '" rx="' + radius + '" fill="' + ACCENT + '"/>',
    '<g transform="translate(' + offset + ',' + offset + ') scale(' + scale + ')" fill="none" stroke="' + INK + '" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round">',
    paths.map((stroke) => '<path d="' + stroke.d + '"/>').join(''),
    '</g>',
    '</svg>',
  ].join('')
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true })
  for (const icon of ICONS) {
    const png = await sharp(Buffer.from(iconSvg(icon))).png().toBuffer()
    await writeFile(resolve(OUT_DIR, icon.file), png)
    console.log(icon.file, (png.length / 1024).toFixed(1) + ' KB')
  }

  // Favicon SVG: tajam di tab peramban pada ukuran berapa pun.
  const favicon = iconSvg({ file: 'favicon.svg', size: 64, padding: 0.12, rounded: true })
  await writeFile(resolve(ROOT, 'public/favicon.svg'), favicon, 'utf8')
  console.log('favicon.svg')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
