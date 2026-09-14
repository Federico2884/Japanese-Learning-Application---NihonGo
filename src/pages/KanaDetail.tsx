import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { canSpeak, speak } from '../audio/speak'
import { examplesFor } from '../data/examples'
import { findKana, type KanaScript } from '../data/kana'
import { getComponentStrokes, getStrokes } from '../data/strokes'
import { masteryLevel } from '../state/progress'
import { useProgress } from '../state/useProgress'
import { useSettings } from '../state/settings'
import { StrokeAnimator } from '../writing/StrokeAnimator'

const MASTERY_TEXT = [
  'Belum pernah dipelajari.',
  'Baru dikenal — masih sering meleset.',
  'Mulai menempel.',
  'Cukup hafal.',
  'Hafal, diulang tiap minggu.',
  'Nyaris otomatis.',
]

function isScript(value: string | undefined): value is KanaScript {
  return value === 'hiragana' || value === 'katakana'
}

export default function KanaDetail() {
  const params = useParams()
  const [settings] = useSettings()
  const { progress } = useProgress()
  const [replay, setReplay] = useState(0)

  const script = isScript(params.script) ? params.script : 'hiragana'
  const kana = params.char ? findKana(params.char, script) : undefined
  if (!kana) return <Navigate to={'/tabel/' + script} replace />

  // Yōon terdiri atas dua huruf; keduanya ditampilkan berdampingan.
  const components = getComponentStrokes(kana)
  const strokeCount = components.reduce((sum, strokes) => sum + strokes.length, 0)
  const examples = examplesFor(kana.char)
  const level = masteryLevel(progress[kana.id])
  const writable = kana.components.length === 1 && getStrokes(kana.char) !== undefined

  return (
    <div className="detail">
      <section className="card detail__main">
        <div className="detail__demo">
          {components.map((strokes, index) => (
            <div key={index} className="paper-box detail__paper">
              <span className="paper-box__grid" />
              <StrokeAnimator strokes={strokes} play={null} className="detail__ghost" />
              <StrokeAnimator
                strokes={strokes}
                replayKey={replay}
                loop
                speed={settings.animationSpeed}
                className="detail__ink"
              />
            </div>
          ))}
        </div>

        <div className="detail__info">
          <span className="detail__eyebrow">
            {script === 'hiragana' ? 'Hiragana' : 'Katakana'} · {strokeCount} goresan
          </span>
          <h1 className="detail__romaji">{kana.romaji}</h1>
          <p className="detail__note">
            Animasi di samping memutar urutan goresan sesuai data KanjiVG. Titik merah menandai tempat
            memulai tiap goresan.
          </p>
          <p className="detail__mastery" data-level={level}>
            <span className="mastery-dot" data-level={level} aria-hidden="true" />
            {MASTERY_TEXT[level]}
          </p>

          <div className="detail__actions">
            {writable && (
              <Link to={'/tulis/' + script + '/' + kana.char} className="button-link button-primary">
                Latih menulis
              </Link>
            )}
            <button type="button" onClick={() => setReplay((key) => key + 1)}>
              Putar ulang
            </button>
            {canSpeak() && (
              <button type="button" onClick={() => speak(kana.char)}>
                ♪ Dengar
              </button>
            )}
          </div>
        </div>
      </section>

      {examples.length > 0 && (
        <section className="detail__examples rise-in">
          <h2>Contoh kata</h2>
          <div className="detail__example-grid">
            {examples.map((example) => (
              <div key={example.jp} className="card example-card">
                <span className="example-card__jp" lang="ja">
                  {example.jp}
                </span>
                <span className="example-card__romaji">{example.romaji}</span>
                <span className="example-card__id">{example.id}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Link to={'/tabel/' + script} className="detail__back">
        ← Kembali ke tabel {script === 'hiragana' ? 'hiragana' : 'katakana'}
      </Link>
    </div>
  )
}
