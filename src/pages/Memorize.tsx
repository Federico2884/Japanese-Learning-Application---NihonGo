import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { canSpeak, speak } from '../audio/speak'
import { getKana, type Kana, type KanaScript } from '../data/kana'
import { isDue, masteryLevel } from '../state/progress'
import { useSettings } from '../state/settings'
import { useProgress } from '../state/useProgress'

function isScript(value: string | undefined): value is KanaScript {
  return value === 'hiragana' || value === 'katakana'
}

/** Huruf dasar gojūon, satu-satunya kelompok yang dipakai untuk kartu hafalan. */
function deckFor(script: KanaScript): Kana[] {
  return getKana(script).filter((kana) => kana.group === 'gojuon')
}

/** Pengacakan Fisher-Yates dengan salinan baru. */
function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

export default function Memorize() {
  const params = useParams()
  const [settings] = useSettings()
  const { progress, review } = useProgress()

  const [row, setRow] = useState<string>('all')
  const [position, setPosition] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [order, setOrder] = useState<string[] | null>(null)

  const script: KanaScript = isScript(params.script) ? params.script : 'hiragana'
  const all = useMemo(() => deckFor(script), [script])

  const deck = useMemo(() => {
    const filtered = row === 'all' ? all : all.filter((kana) => kana.row === row)
    if (!order) return filtered
    const rank = new Map(order.map((id, index) => [id, index]))
    return [...filtered].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
  }, [all, row, order])

  // Kembali ke kartu pertama saat aksara, baris, atau urutan berubah.
  useEffect(() => {
    setPosition(0)
    setRevealed(false)
  }, [script, row, order])

  if (!isScript(params.script)) return <Navigate to="/hafalan/hiragana" replace />

  const rows = [...new Set(all.map((kana) => kana.row))]
  const current = deck[Math.min(position, deck.length - 1)]
  if (!current) return <Navigate to="/hafalan/hiragana" replace />

  const step = (delta: number) => {
    setPosition((value) => (value + delta + deck.length) % deck.length)
    setRevealed(false)
  }

  const judge = (remembered: boolean) => {
    review(current.id, remembered)
    step(1)
  }

  return (
    <div className="memo">
      <div className="memo__bar">
        <div className="pill-group" role="tablist" aria-label="Pilih aksara">
          {(['hiragana', 'katakana'] as const).map((item) => (
            <Link key={item} to={'/hafalan/' + item} role="tab" className="pill" aria-selected={item === script}>
              {item === 'hiragana' ? 'Hiragana' : 'Katakana'}
            </Link>
          ))}
        </div>
        <button type="button" className="memo__shuffle" onClick={() => setOrder(order ? null : shuffled(all).map((kana) => kana.id))}>
          {order ? '↺ Urut lagi' : '⤨ Acak'}
        </button>
      </div>

      <div className="memo__rows" role="tablist" aria-label="Pilih baris">
        {['all', ...rows].map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={row === item}
            className="memo__row-chip"
            onClick={() => setRow(item)}
          >
            {item === 'all' ? 'Semua' : item + '-gyō'}
          </button>
        ))}
      </div>

      <div className="memo__stage">
        <button
          type="button"
          className="paper-box memo__card"
          onClick={() => setRevealed((value) => !value)}
          aria-pressed={revealed}
          aria-label={revealed ? 'Tutup bacaan' : 'Buka bacaan'}
        >
          <span className="paper-box__grid" />
          <span className="memo__glyph" data-revealed={revealed || undefined} lang="ja">
            {current.char}
          </span>
          <span className="memo__romaji" data-revealed={revealed || undefined}>
            {current.romaji}
          </span>
          <span className="memo__counter">
            {Math.min(position + 1, deck.length)} / {deck.length}
          </span>
          <span className="memo__hint">{revealed ? 'ketuk untuk menutup' : 'ketuk untuk bacaan'}</span>
          {isDue(progress[current.id], new Date()) && <span className="memo__due">perlu diulang</span>}
          <span className="mastery-dot memo__mastery" data-level={masteryLevel(progress[current.id])} aria-hidden="true" />
        </button>
      </div>

      {revealed ? (
        <div className="memo__judge">
          <button type="button" className="memo__judge-bad" onClick={() => judge(false)}>
            Belum hafal
          </button>
          {canSpeak() && (
            <button type="button" onClick={() => speak(current.char)} aria-label="Dengarkan">
              ♪
            </button>
          )}
          <button type="button" className="memo__judge-good" onClick={() => judge(true)}>
            Sudah hafal
          </button>
        </div>
      ) : (
        <div className="memo__actions">
          <button type="button" onClick={() => step(-1)}>
            ← Sebelumnya
          </button>
          <Link to={'/tulis/' + script + '/' + current.char} className="button-link">
            <span lang="ja">筆</span>&nbsp;Tulis huruf ini
          </Link>
          <button type="button" className="button-primary" onClick={() => step(1)}>
            Berikutnya →
          </button>
        </div>
      )}

      <section className="memo__list-section">
        <div className="section-heading">
          <h2>Semua huruf {row === 'all' ? '' : row + '-gyō'}</h2>
          <span className="grow-x" />
        </div>
        <div className="memo__list">
          {deck.map((kana, index) => (
            <button
              key={kana.id}
              type="button"
              className="memo__list-item"
              aria-current={index === position ? 'true' : undefined}
              data-mastery={masteryLevel(progress[kana.id])}
              onClick={() => {
                setPosition(index)
                setRevealed(true)
              }}
            >
              <span className="memo__list-char" lang="ja">
                {kana.char}
              </span>
              <span className="memo__list-romaji">{settings.showRomaji ? kana.romaji : ''}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
