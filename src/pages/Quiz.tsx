import { useEffect, useMemo, useReducer, useState } from 'react'
import { Link } from 'react-router-dom'
import { speakKana } from '../audio/speak'
import { getKana, type Kana, type KanaScript } from '../data/kana'
import { getStrokes } from '../data/strokes'
import {
  DEFAULT_QUIZ_LENGTH,
  generateQuiz,
  summarizeQuiz,
  type Question,
} from '../quiz/generateQuiz'
import { useSettings } from '../state/settings'
import { useProgress } from '../state/useProgress'
import { createPracticeState, practiceReducer } from '../writing/practiceSession'
import { WritingPad } from '../writing/WritingPad'

/** Jeda sebelum lanjut ke soal berikutnya, supaya jawaban benar sempat terbaca. */
const NEXT_DELAY = 1100

/** Ambang akurasi tulisan tangan agar soal menulis dihitung benar. */
const WRITE_PASS = 0.5

function poolFor(script: KanaScript): Kana[] {
  return getKana(script).filter((kana) => kana.group === 'gojuon')
}

interface WriteQuestionProps {
  kana: Kana
  onDone: (correct: boolean) => void
}

/** Soal menulis: kotak kosong, semua goresan dinilai sekaligus. */
function WriteQuestion({ kana, onDone }: WriteQuestionProps) {
  const [settings] = useSettings()
  const reference = useMemo(() => getStrokes(kana.char) ?? [], [kana])
  const [state, dispatch] = useReducer(practiceReducer, undefined, () =>
    createPracticeState(reference, 'ingatan', settings.tolerance),
  )

  useEffect(() => {
    dispatch({ type: 'configure', reference, mode: 'ingatan', tolerance: settings.tolerance })
  }, [reference, settings.tolerance])

  const result = state.result
  useEffect(() => {
    if (!result) return
    const timer = window.setTimeout(() => onDone(result.accuracy >= WRITE_PASS), 900)
    return () => window.clearTimeout(timer)
  }, [result, onDone])

  return (
    <div className="quiz__write">
      <WritingPad
        state={state}
        dispatch={dispatch}
        inkWidth={settings.inkWidth}
        penOnly={settings.penOnly}
        animationSpeed={settings.animationSpeed}
        label={'Tulis huruf untuk bunyi ' + kana.romaji}
      />
      <div className="quiz__write-actions">
        <button type="button" onClick={() => dispatch({ type: 'undo' })} disabled={state.drafts.length === 0 || result !== null}>
          Hapus goresan
        </button>
        <button
          type="button"
          className="button-primary"
          onClick={() => dispatch({ type: 'submit' })}
          disabled={state.drafts.length === 0 || result !== null}
        >
          Nilai sekarang
        </button>
      </div>
    </div>
  )
}

export default function Quiz() {
  const { progress, review } = useProgress()
  const [script, setScript] = useState<KanaScript>('hiragana')
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, boolean>>(new Map())
  const [picked, setPicked] = useState<string | null>(null)

  const start = (target: KanaScript = script) => {
    setQuestions(
      generateQuiz(poolFor(target), progress, new Date(), {
        length: DEFAULT_QUIZ_LENGTH,
        allowAudio: true,
        allowWriting: true,
      }),
    )
    setIndex(0)
    setAnswers(new Map())
    setPicked(null)
  }

  // Sesi pertama disusun sekali saat layar dibuka.
  useEffect(() => {
    if (questions.length === 0) start(script)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const question = questions[index]
  const done = questions.length > 0 && index >= questions.length

  // Soal dengar langsung dibunyikan begitu muncul.
  useEffect(() => {
    if (question?.type === 'audio-kana') void speakKana(question.kana.char, question.kana.romaji)
  }, [question])

  const answer = (value: string) => {
    if (!question || picked) return
    const correct = value === question.answer
    setPicked(value)
    setAnswers((current) => new Map(current).set(question.id, correct))
    review(question.kana.id, correct)
    window.setTimeout(() => {
      setPicked(null)
      setIndex((current) => current + 1)
    }, NEXT_DELAY)
  }

  const finishWriting = (correct: boolean) => {
    if (!question) return
    setAnswers((current) => new Map(current).set(question.id, correct))
    review(question.kana.id, correct)
    setPicked(null)
    setIndex((current) => current + 1)
  }

  if (done) {
    const summary = summarizeQuiz(questions, answers)
    return (
      <section className="card quiz__summary">
        <span className="quiz__eyebrow">Sesi selesai</span>
        <h1>
          {summary.correct >= summary.total * 0.8
            ? 'Sesi rapi — ' + summary.correct + ' dari ' + summary.total + ' benar.'
            : 'Masih ada yang perlu diulang.'}
        </h1>

        <div className="quiz__stats">
          <div className="quiz__stat">
            <span className="quiz__stat-value">
              {summary.correct}/{summary.total}
            </span>
            <span className="quiz__stat-name">Jawaban benar</span>
          </div>
          <div className="quiz__stat">
            <span className="quiz__stat-value">{Math.round(summary.accuracy * 100)}%</span>
            <span className="quiz__stat-name">Akurasi sesi</span>
          </div>
          <div className="quiz__stat">
            <span className="quiz__stat-value">{summary.missed.length}</span>
            <span className="quiz__stat-name">Perlu diulang</span>
          </div>
        </div>

        {summary.missed.length > 0 && (
          <div className="quiz__missed">
            <strong>Perlu diulang</strong>
            <div className="quiz__missed-list">
              {summary.missed.map((kana) => (
                <Link key={kana.id} to={'/huruf/' + kana.script + '/' + kana.char} className="quiz__missed-item">
                  <span lang="ja">{kana.char}</span>
                  <span>{kana.romaji}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="quiz__summary-actions">
          <button type="button" className="button-primary" onClick={() => start()}>
            Ulangi kuis
          </button>
          {summary.missed[0] && (
            <Link to={'/tulis/' + summary.missed[0].script + '/' + summary.missed[0].char} className="button-link">
              Latih yang salah
            </Link>
          )}
        </div>
      </section>
    )
  }

  if (!question) return null

  const feedback = picked
    ? picked === question.answer
      ? 'Tepat.'
      : 'Jawabannya "' + question.answer + '". Tidak apa-apa, huruf ini memang mirip.'
    : 'Pilih satu jawaban.'

  return (
    <div className="quiz">
      <div className="quiz__bar">
        <div className="pill-group" role="tablist" aria-label="Pilih aksara">
          {(['hiragana', 'katakana'] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              className="pill"
              aria-selected={item === script}
              onClick={() => {
                setScript(item)
                start(item)
              }}
            >
              {item === 'hiragana' ? 'Hiragana' : 'Katakana'}
            </button>
          ))}
        </div>
      </div>

      <div className="quiz__progress">
        <span className="quiz__count">
          Soal {index + 1} dari {questions.length}
        </span>
        <div className="quiz__dots" aria-hidden="true">
          {questions.map((item, position) => (
            <span
              key={item.id}
              className="quiz__dot"
              data-state={position < index ? 'done' : position === index ? 'current' : 'todo'}
            />
          ))}
        </div>
        <span className="quiz__score">{summarizeQuiz(questions, answers).correct} benar</span>
      </div>

      <section className="card quiz__card">
        <span className="quiz__eyebrow">{question.prompt}</span>

        <div className="quiz__stage">
          {question.type === 'audio-kana' && (
            <button type="button" className="quiz__audio" onClick={() => void speakKana(question.kana.char, question.kana.romaji)} aria-label="Putar bunyi">
              ♪
            </button>
          )}
          {question.type === 'kana-romaji' && (
            <span className="quiz__kana" lang="ja">
              {question.kana.char}
            </span>
          )}
          {question.type === 'romaji-write' && (
            <div className="quiz__romaji-stage">
              <span className="quiz__romaji">{question.kana.romaji}</span>
              <WriteQuestion key={question.id} kana={question.kana} onDone={finishWriting} />
            </div>
          )}
        </div>

        {question.options.length > 0 && (
          <>
            <div className="quiz__options" data-audio={question.type === 'audio-kana' || undefined}>
              {question.options.map((option) => {
                const isAnswer = option === question.answer
                const state = !picked ? 'idle' : isAnswer ? 'correct' : option === picked ? 'wrong' : 'idle'
                return (
                  <button
                    key={option}
                    type="button"
                    className="quiz__option"
                    data-state={state}
                    lang={question.type === 'audio-kana' ? 'ja' : undefined}
                    onClick={() => answer(option)}
                    disabled={picked !== null}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
            <p className="quiz__feedback" data-state={picked ? (picked === question.answer ? 'correct' : 'wrong') : 'idle'} role="status">
              {feedback}
            </p>
          </>
        )}
      </section>
    </div>
  )
}
