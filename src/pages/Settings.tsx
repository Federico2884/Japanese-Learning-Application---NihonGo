import { useState } from 'react'
import { ALL_KANA } from '../data/kana'
import { summarize } from '../state/progress'
import { useProgress } from '../state/useProgress'
import { useSettings, type Settings as SettingsValue } from '../state/settings'
import type { Tolerance } from '../writing/strokeMatcher'

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
  const [confirmReset, setConfirmReset] = useState(false)

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
