import { useState } from 'react'
import { speak, speechSupported, useJapaneseVoice, type SpeakOutcome } from '../audio/speak'
import { ALL_KANA } from '../data/kana'
import { summarize } from '../state/progress'
import { useProgress } from '../state/useProgress'
import { useSettings, type Settings as SettingsValue } from '../state/settings'
import type { Tolerance } from '../writing/strokeMatcher'

/** Petunjuk pemasangan suara sesuai sistem perangkat. */
function installHint(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (/Android/i.test(ua)) {
    return 'Di Android: Settings → cari "Text-to-speech" → buka pengaturan mesin Google → Install voice data → pilih 日本語 dan unduh.'
  }
  if (/Windows/i.test(ua)) {
    return 'Di Windows: Settings → Time & language → Speech → Manage voices → Add voices → pilih Japanese. Menambahkan bahasa Jepang saja tidak cukup, paket suaranya harus ikut dipasang.'
  }
  return 'Pasang paket suara bahasa Jepang lewat pengaturan sistem perangkat ini.'
}

/** Menjelaskan hasil uji suara dalam kalimat yang bisa ditindaklanjuti. */
function describeOutcome(outcome: SpeakOutcome): string {
  if (outcome.ok) return 'Berbunyi lewat suara ' + outcome.voice + '.'
  switch (outcome.reason) {
    case 'no-voice':
      return 'Tidak ada suara Jepang yang bisa dipakai. ' + installHint()
    case 'error': {
      const dicoba = outcome.tried > 1 ? ' Sudah dicoba ' + outcome.tried + ' suara.' : ''
      if (outcome.detail === 'not-allowed') {
        return 'Peramban menolak memutar suara. Coba ketuk layar dulu, lalu uji lagi.'
      }
      if (outcome.detail === 'synthesis-failed') {
        return (
          'Mesin suara gagal membunyikan (synthesis-failed).' +
          dicoba +
          ' Biasanya data suaranya belum lengkap terpasang. ' +
          installHint()
        )
      }
      if (outcome.detail === 'network') {
        return 'Suara yang dipakai membutuhkan internet dan permintaannya gagal.' + dicoba + ' Pasang suara Jepang luring, atau periksa koneksi.'
      }
      if (outcome.detail === 'language-unavailable' || outcome.detail === 'voice-unavailable') {
        return 'Bahasa Jepang belum tersedia di mesin suara perangkat ini. ' + installHint()
      }
      return 'Peramban melaporkan galat: ' + outcome.detail + '.' + dicoba
    }
    case 'silent':
      return outcome.remote
        ? 'Perintah diterima tetapi tidak ada bunyi. Suara ' + outcome.voice + ' adalah suara daring yang perlu internet; pasang suara Jepang luring, atau periksa koneksi.'
        : 'Perintah diterima tetapi tidak ada bunyi. Periksa volume media perangkat, lalu coba tutup dan buka aplikasi.'
  }
}

const TOLERANCES: ReadonlyArray<[Tolerance, string]> = [
  ['mudah', 'Mudah'],
  ['normal', 'Normal'],
  ['ketat', 'Ketat'],
]

const INK_STEPS: ReadonlyArray<[number, string]> = [
  [3, 'Tipis'],
  [4.5, 'Sedang'],
  [6, 'Tebal'],
  [7.5, 'Sangat tebal'],
]

const SPEED_STEPS: ReadonlyArray<[number, string]> = [
  [0.5, '0,5×'],
  [1, '1×'],
  [1.5, '1,5×'],
]

interface ToggleRow {
  key: 'penOnly' | 'showRomaji'
  name: string
  sub: string
}

const TOGGLES: readonly ToggleRow[] = [
  {
    key: 'penOnly',
    name: 'Mode hanya-stylus',
    sub: 'Abaikan sentuhan jari supaya telapak tangan tidak ikut menggambar.',
  },
  {
    key: 'showRomaji',
    name: 'Tampilkan romaji',
    sub: 'Sembunyikan untuk melatih ingatan pada tabel dan daftar hafalan.',
  },
]

export default function Settings() {
  const [settings, update] = useSettings()
  const { progress, reset } = useProgress()
  const voice = useJapaneseVoice()
  const [confirmReset, setConfirmReset] = useState(false)
  const [testResult, setTestResult] = useState<SpeakOutcome | null>(null)
  const [testing, setTesting] = useState(false)

  const testVoice = async () => {
    setTesting(true)
    setTestResult(null)
    setTestResult(await speak('あいうえお'))
    setTesting(false)
  }

  const ringkasan = summarize(
    ALL_KANA.map((kana) => kana.id),
    progress,
    new Date(),
  )

  const setValue = <K extends keyof SettingsValue>(key: K, value: SettingsValue[K]) => update({ [key]: value })

  return (
    <div className="settings">
      <section className="card settings__card">
        <strong>Tingkat toleransi penilaian</strong>
        <span className="settings__sub">Seberapa mirip goresan harus dengan contoh.</span>
        <div className="pill-group settings__pills" role="radiogroup" aria-label="Tingkat toleransi">
          {TOLERANCES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              className="pill"
              aria-checked={settings.tolerance === value}
              onClick={() => setValue('tolerance', value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {TOGGLES.map((toggle) => (
        <section key={toggle.key} className="card settings__card settings__card--row">
          <div className="settings__text">
            <strong>{toggle.name}</strong>
            <span className="settings__sub">{toggle.sub}</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings[toggle.key]}
            aria-label={toggle.name}
            className="switch"
            onClick={() => setValue(toggle.key, !settings[toggle.key])}
          >
            <span className="switch__knob" />
          </button>
        </section>
      ))}

      <section className="card settings__card">
        <div className="settings__head">
          <strong>Ketebalan tinta</strong>
          <span className="settings__value">
            {INK_STEPS.find(([value]) => value === settings.inkWidth)?.[1] ?? 'Khusus'}
          </span>
        </div>
        <div className="settings__steps">
          {INK_STEPS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="settings__step"
              aria-pressed={settings.inkWidth === value}
              onClick={() => setValue('inkWidth', value)}
            >
              <span className="settings__ink-sample" style={{ height: value + 'px' }} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card settings__card">
        <div className="settings__head">
          <strong>Kecepatan animasi</strong>
          <span className="settings__value">
            {SPEED_STEPS.find(([value]) => value === settings.animationSpeed)?.[1] ?? '1×'}
          </span>
        </div>
        <div className="settings__steps">
          {SPEED_STEPS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="settings__step"
              aria-pressed={settings.animationSpeed === value}
              onClick={() => setValue('animationSpeed', value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card settings__card">
        <div className="settings__head">
          <strong>Suara bahasa Jepang</strong>
          <span className="settings__value">{voice.available ? 'tersedia' : 'tidak tersedia'}</span>
        </div>
        {voice.available ? (
          <>
            <span className="settings__sub">
              Memakai suara {voice.name}
              {voice.remote ? ' (suara daring, perlu internet)' : ' (suara lokal)'}. Ketuk Uji suara untuk
              memastikan bunyinya benar-benar keluar.
            </span>
            <div className="settings__reset">
              <button type="button" onClick={() => void testVoice()} disabled={testing}>
                {testing ? 'Menguji…' : '♪ Uji suara'}
              </button>
              {testResult && <span className="settings__sub">{describeOutcome(testResult)}</span>}
            </div>
            {voice.all.length > 1 && (
              <details className="settings__details">
                <summary>Suara Jepang yang terdaftar ({voice.all.length})</summary>
                <ul>
                  {voice.all.map((item) => (
                    <li key={item.name + item.lang}>
                      {item.name} · {item.lang} · {item.localService ? 'lokal' : 'daring'}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : (
          <span className="settings__sub">
            {speechSupported()
              ? 'Perangkat ini belum punya suara bahasa Jepang, jadi tombol dengar dan soal kuis bertipe dengar disembunyikan. Di Windows: Settings → Time & language → Language & region → tambahkan bahasa Jepang beserta paket Speech. Di Android: Settings → cari "Text-to-speech", buka pengaturan mesin Google, lalu unduh bahasa Jepang.'
              : 'Peramban ini tidak mendukung pelafalan, jadi tombol dengar dan soal kuis bertipe dengar disembunyikan.'}
          </span>
        )}
      </section>

      <section className="card settings__card">
        <strong>Progres belajar</strong>
        <span className="settings__sub">
          {ringkasan.studied} dari {ringkasan.total} huruf pernah dipelajari · {ringkasan.mastered} sudah hafal ·{' '}
          {ringkasan.due} perlu diulang hari ini.
        </span>
        <div className="settings__reset">
          {confirmReset ? (
            <>
              <span className="settings__warning">Semua catatan penguasaan akan dihapus. Yakin?</span>
              <button type="button" onClick={() => setConfirmReset(false)}>
                Batal
              </button>
              <button
                type="button"
                className="settings__danger"
                onClick={() => {
                  reset()
                  setConfirmReset(false)
                }}
              >
                Ya, hapus progres
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)}>
              Hapus progres
            </button>
          )}
        </div>
      </section>

      <p className="settings__note">
        Aplikasi berjalan sepenuhnya di perangkat ini. Tanpa akun dan tanpa server: pengaturan dan progres
        tersimpan di peramban perangkat ini saja, jadi tidak ikut berpindah ke perangkat lain.
      </p>
    </div>
  )
}
