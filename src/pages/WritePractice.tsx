import { useEffect, useMemo, useReducer, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { canSpeak, speak } from '../audio/speak'
import { getKana, type Kana, type KanaScript } from '../data/kana'
import { getStrokes } from '../data/strokes'
import { useSettings } from '../state/settings'
import {
  createPracticeState,
  practiceReducer,
  type PracticeMode,
  type PracticeResult,
  type PracticeState,
} from '../writing/practiceSession'
import { StrokeAnimator } from '../writing/StrokeAnimator'
import { feedbackMessage } from '../writing/strokeMatcher'
import { WritingPad } from '../writing/WritingPad'

const MODES: ReadonlyArray<{ id: PracticeMode; label: string; hint: string }> = [
  { id: 'jiplak', label: 'Jiplak', hint: 'Bayangan huruf terlihat' },
  { id: 'petunjuk', label: 'Dengan petunjuk', hint: 'Kotak kosong, ada bantuan' },
  { id: 'ingatan', label: 'Dari ingatan', hint: 'Tanpa bantuan' },
]

const SCRIPT_LABEL: Record<KanaScript, string> = { hiragana: 'Hiragana', katakana: 'Katakana' }

function isScript(value: string | undefined): value is KanaScript {
  return value === 'hiragana' || value === 'katakana'
}

/** Huruf yang bisa dilatih menulis: huruf tunggal (yōon dilatih lewat huruf penyusunnya). */
function writableKana(script: KanaScript): Kana[] {
  return getKana(script).filter((kana) => kana.components.length === 1)
}

type ResultTier = 'sempurna' | 'bagus' | 'lumayan' | 'ulang'

function resultTier(result: PracticeResult): ResultTier {
  const percent = result.accuracy * 100
  if (result.correct === result.total && result.mistakes === 0 && percent >= 85) return 'sempurna'
  if (percent >= 70) return 'bagus'
  if (percent >= 45) return 'lumayan'
  return 'ulang'
}

const RESULT_LABEL: Record<ResultTier, string> = {
  sempurna: 'Sempurna!',
  bagus: 'Bagus!',
  lumayan: 'Lumayan, ulangi sekali lagi.',
  ulang: 'Belum pas, coba lagi.',
}

function instruction(state: PracticeState, kana: Kana): string {
  const total = state.reference.length
  switch (state.mode) {
    case 'jiplak':
      return 'Ikuti bayangan huruf. Goresan ke-' + (state.currentIndex + 1) + ' dari ' + total + '.'
    case 'petunjuk':
      return 'Tulis goresan ke-' + (state.currentIndex + 1) + ' dari ' + total + '. Ketuk Petunjuk bila lupa.'
    case 'ingatan':
      return 'Tulis huruf untuk bunyi "' + kana.romaji + '" dari ingatan (' + state.drafts.length + '/' + total + ' goresan).'
  }
}

export default function WritePractice() {
  const params = useParams()
  const navigate = useNavigate()
  const [settings] = useSettings()
  const script: KanaScript = isScript(params.script) ? params.script : 'hiragana'
  const list = useMemo(() => writableKana(script), [script])
  const index = list.findIndex((kana) => kana.char === params.char)
  const kana = index >= 0 ? list[index] : undefined
  const reference = useMemo(() => (kana ? (getStrokes(kana.char) ?? []) : []), [kana])

  const [mode, setMode] = useState<PracticeMode>('jiplak')
  const [state, dispatch] = useReducer(practiceReducer, undefined, () =>
    createPracticeState(reference, mode, settings.tolerance),
  )
  const [demoKey, setDemoKey] = useState(0)

  useEffect(() => {
    dispatch({ type: 'configure', reference, mode, tolerance: settings.tolerance })
  }, [reference, mode, settings.tolerance])

  if (!kana || !isScript(params.script)) {
    const first = list[0]!
    return <Navigate to={'/tulis/' + script + '/' + first.char} replace />
  }

  const finished = state.result !== null
  const hideAnswer = mode === 'ingatan' && !finished
  const previous = list[index - 1]
  const next = list[index + 1]
  const rowMates = list.filter((item) => item.row === kana.row && item.group === kana.group)
  const goTo = (target: Kana) => navigate('/tulis/' + script + '/' + target.char)

  const feedback = finished
    ? null
    : state.lastMatch && mode !== 'ingatan'
      ? feedbackMessage(state.lastMatch)
      : instruction(state, kana)
  const feedbackTone =
    state.lastMatch && !finished && mode !== 'ingatan'
      ? state.lastMatch.verdict === 'correct'
        ? 'is-correct'
        : 'is-wrong'
      : ''

  return (
    <main className="page practice">
      <header className="practice__header">
        <Link to="/" className="back-link">
          ← Beranda
        </Link>
        <div className="script-switch" role="tablist" aria-label="Pilih huruf">
          {(['hiragana', 'katakana'] as const).map((item) => (
            <Link
              key={item}
              role="tab"
              aria-selected={item === script}
              className="chip"
              to={'/tulis/' + item + '/' + writableKana(item)[0]!.char}
            >
              {SCRIPT_LABEL[item]}
            </Link>
          ))}
        </div>
      </header>

      <div className="practice__layout">
        <section className="practice__pad" aria-label="Kotak menulis">
          <WritingPad
            state={state}
            dispatch={dispatch}
            inkWidth={settings.inkWidth}
            penOnly={settings.penOnly}
            animationSpeed={settings.animationSpeed}
            label={'Kotak menulis huruf ' + (hideAnswer ? kana.romaji : kana.char)}
          />

          <p className={'practice__feedback ' + feedbackTone} role="status" aria-live="polite">
            {feedback}
          </p>

          {finished && state.result && (
            <div className="result-card" role="status" data-tier={resultTier(state.result)}>
              <div>
                <p className="result-card__title">{RESULT_LABEL[resultTier(state.result)]}</p>
                <p className="result-card__detail">
                  Akurasi {Math.round(state.result.accuracy * 100)}% · {state.result.correct}/{state.result.total} goresan
                  benar · {state.result.mistakes} kesalahan
                </p>
              </div>
              <div className="result-card__actions">
                <button type="button" onClick={() => dispatch({ type: 'reset' })}>
                  Ulangi
                </button>
                {next && (
                  <button type="button" className="button-primary" onClick={() => goTo(next)}>
                    Berikutnya: <span lang="ja">{mode === 'ingatan' ? next.romaji : next.char}</span> →
                  </button>
                )}
              </div>
            </div>
          )}

          {!finished && (
            <div className="practice__controls">
              {mode !== 'ingatan' ? (
                <button type="button" onClick={() => dispatch({ type: 'hint' })}>
                  Petunjuk
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => dispatch({ type: 'undo' })} disabled={state.drafts.length === 0}>
                    Hapus goresan
                  </button>
                  <button type="button" onClick={() => dispatch({ type: 'submit' })} disabled={state.drafts.length === 0}>
                    Nilai sekarang
                  </button>
                </>
              )}
              <button type="button" onClick={() => dispatch({ type: 'reset' })}>
                Ulangi
              </button>
            </div>
          )}
        </section>

        <aside className="practice__info">
          <div className="kana-card">
            <div className="kana-card__char" lang="ja" aria-label={hideAnswer ? 'Disembunyikan' : kana.char}>
              {hideAnswer ? '?' : kana.char}
            </div>
            <div className="kana-card__meta">
              {settings.showRomaji || hideAnswer ? <span className="kana-card__romaji">{kana.romaji}</span> : null}
              <span className="kana-card__strokes">{reference.length} goresan</span>
              {canSpeak() && (
                <button type="button" className="icon-button" onClick={() => speak(kana.char)} aria-label="Dengarkan">
                  🔊
                </button>
              )}
            </div>
          </div>

          <div className="mode-tabs" role="radiogroup" aria-label="Tingkat latihan">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={mode === item.id}
                className="mode-tab"
                onClick={() => setMode(item.id)}
              >
                <span className="mode-tab__label">{item.label}</span>
                <span className="mode-tab__hint">{item.hint}</span>
              </button>
            ))}
          </div>

          {!hideAnswer && (
            <div className="demo">
              <div className="demo__header">
                <span>Urutan goresan</span>
                <button type="button" onClick={() => setDemoKey((key) => key + 1)}>
                  Putar ulang
                </button>
              </div>
              <div className="demo__box">
                <StrokeAnimator strokes={reference} replayKey={demoKey} speed={settings.animationSpeed} showNumbers />
              </div>
            </div>
          )}

          <nav className="kana-nav" aria-label="Huruf lain">
            <div className="kana-nav__row">
              {rowMates.map((item) => (
                <Link
                  key={item.id}
                  to={'/tulis/' + script + '/' + item.char}
                  className="kana-nav__item"
                  aria-current={item.id === kana.id ? 'true' : undefined}
                  lang="ja"
                >
                  {mode === 'ingatan' && item.id !== kana.id ? item.romaji : item.char}
                </Link>
              ))}
            </div>
            <div className="kana-nav__steps">
              <button type="button" onClick={() => previous && goTo(previous)} disabled={!previous}>
                ← Sebelumnya
              </button>
              <button type="button" onClick={() => next && goTo(next)} disabled={!next}>
                Berikutnya →
              </button>
            </div>
          </nav>
        </aside>
      </div>
    </main>
  )
}
