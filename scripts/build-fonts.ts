/**
 * Mengunduh berkas font antarmuka dari Google Fonts satu kali, lalu menyimpannya
 * di dalam repo. Aplikasi tidak pernah meminta font ke internet saat dipakai,
 * jadi tampilannya tetap sama ketika offline.
 *
 * Jalankan: npm run build:fonts
 *
 * Hasil:
 *   src/assets/fonts/*.woff2  — berkas font (di-commit)
 *   src/styles/fonts.css      — deklarasi @font-face (di-commit)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FONT_DIR = resolve(ROOT, 'src/assets/fonts')
const CSS_FILE = resolve(ROOT, 'src/styles/fonts.css')

/** Google Fonts hanya mengirim woff2 bila peramban yang meminta terlihat modern. */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Hanya subset latin dan latin-ext yang diambil.
 * latin-ext diperlukan untuk romaji bergaris atas seperti ō pada "gojūon".
 */
const WANTED_SUBSETS = ['latin', 'latin-ext']

interface FontRequest {
  /** Nama keluarga font seperti di Google Fonts. */
  family: string
  weights: number[]
  /** Awalan nama berkas hasil unduhan. */
  slug: string
}

const FONTS: FontRequest[] = [{ family: 'Comic Relief', weights: [400, 700], slug: 'comic-relief' }]

interface FaceBlock {
  subset: string
  weight: number
  url: string
  unicodeRange: string
}

function parseFaces(css: string): FaceBlock[] {
  const faces: FaceBlock[] = []
  // Tiap blok didahului komentar berisi nama subset, mis. "/* latin */".
  const blocks = css.split('/*').slice(1)
  for (const block of blocks) {
    const subset = block.slice(0, block.indexOf('*/')).trim()
    const weight = Number(/font-weight:\s*(\d+)/.exec(block)?.[1] ?? '400')
    const url = /src:\s*url\(([^)]+)\)/.exec(block)?.[1]
    const unicodeRange = /unicode-range:\s*([^;]+);/.exec(block)?.[1]
    if (url && unicodeRange) faces.push({ subset, weight, url, unicodeRange: unicodeRange.trim() })
  }
  return faces
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error('Gagal mengambil ' + url + ': HTTP ' + response.status)
  return response.text()
}

async function main(): Promise<void> {
  await mkdir(FONT_DIR, { recursive: true })
  const rules: string[] = [
    '/*',
    ' * Font antarmuka, diunduh sekali oleh scripts/build-fonts.ts.',
    ' * JANGAN diedit manual — jalankan `npm run build:fonts` untuk memperbaruinya.',
    ' *',
    ' * Comic Relief, lisensi SIL Open Font License 1.1.',
    ' */',
    '',
  ]

  for (const font of FONTS) {
    const query = font.family.replace(/ /g, '+') + ':wght@' + font.weights.join(';')
    const css = await fetchText('https://fonts.googleapis.com/css2?family=' + query + '&display=swap')

    for (const face of parseFaces(css)) {
      if (!WANTED_SUBSETS.includes(face.subset)) continue

      const fileName = font.slug + '-' + face.weight + '-' + face.subset + '.woff2'
      const response = await fetch(face.url, { headers: { 'User-Agent': USER_AGENT } })
      if (!response.ok) throw new Error('Gagal mengunduh ' + face.url)
      const bytes = Buffer.from(await response.arrayBuffer())
      await writeFile(resolve(FONT_DIR, fileName), bytes)
      console.log(fileName, (bytes.length / 1024).toFixed(1) + ' KB')

      rules.push(
        '@font-face {',
        "  font-family: '" + font.family + "';",
        '  font-style: normal;',
        '  font-weight: ' + face.weight + ';',
        '  font-display: swap;',
        "  src: url('../assets/fonts/" + fileName + "') format('woff2');",
        '  unicode-range: ' + face.unicodeRange + ';',
        '}',
        '',
      )
    }
  }

  await writeFile(CSS_FILE, rules.join('\n'), 'utf8')
  console.log('->', CSS_FILE)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
