import { useEffect, useState } from 'react'
import { KANJIVG_SIZE } from '../data/strokes'
import type { PracticeAction, PracticeState } from './practiceSession'
import { StrokeAnimator } from './StrokeAnimator'
import type { StrokeVerdict } from './strokeMatcher'
import type { Point } from './strokeMath'
import { WritingCanvas } from './WritingCanvas'

interface WritingPadProps {
  state: PracticeState
  dispatch: (action: PracticeAction) => void
  inkWidth: number
  penOnly: boolean
  animationSpeed: number
  label: string
}

/** Lama goresan salah ditampilkan sebelum menghilang. */
const REJECTED_FLASH_MS = 700

function toPolyline(points: readonly Point[]): string {
  return points.map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ')
}

const VERDICT_CLASS: Record<StrokeVerdict, string> = {
  correct: 'is-correct',
  reversed: 'is-wrong',
  'wrong-order': 'is-wrong',
  'wrong-shape': 'is-wrong',
}

/**
 * Kotak menulis lengkap: garis bantu, bayangan huruf, animasi petunjuk,
 * goresan yang sudah diterima, dan kanvas tinta di lapisan paling atas.
 */
export function WritingPad({ state, dispatch, inkWidth, penOnly, animationSpeed, label }: WritingPadProps) {
  const { mode, reference, accepted, hintIndex, drafts, result, lastRejected } = state
  const finished = result !== null
  const [flash, setFlash] = useState<Point[] | null>(null)

  // Tampilkan goresan yang salah sekilas, lalu hapus.
  useEffect(() => {
    if (!lastRejected) return
    setFlash(lastRejected)
    const timer = window.setTimeout(() => setFlash(null), REJECTED_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [lastRejected])

  const acceptedIndexes = new Set(accepted.map((stroke) => stroke.index))
  const showGuide = mode === 'jiplak' && !finished
  const showAnswer = finished && mode === 'ingatan'
  const viewBox = '0 0 ' + KANJIVG_SIZE + ' ' + KANJIVG_SIZE

  return (
    <div className={'writing-pad writing-pad--' + mode} data-finished={finished || undefined}>
      <svg className="writing-pad__grid" viewBox={viewBox} aria-hidden="true">
        <rect x="0.5" y="0.5" width={KANJIVG_SIZE - 1} height={KANJIVG_SIZE - 1} rx="3" />
        <line x1={KANJIVG_SIZE / 2} y1="0" x2={KANJIVG_SIZE / 2} y2={KANJIVG_SIZE} />
        <line x1="0" y1={KANJIVG_SIZE / 2} x2={KANJIVG_SIZE} y2={KANJIVG_SIZE / 2} />
      </svg>

      {(showGuide || showAnswer) && (
        <StrokeAnimator strokes={reference} play={null} className="writing-pad__guide" />
      )}

      {hintIndex !== null && !finished && (
        <StrokeAnimator
          strokes={reference}
          play={hintIndex}
          replayKey={hintIndex + state.totalMistakes * 100}
          speed={animationSpeed * 0.8}
          className="writing-pad__hint"
          onDone={() => window.setTimeout(() => dispatch({ type: 'hint-done' }), 500)}
        />
      )}

      <svg className="writing-pad__ink" viewBox={viewBox} aria-hidden="true">
        {mode !== 'ingatan' &&
          reference.map((stroke, index) =>
            acceptedIndexes.has(index) ? (
              <path
                key={index}
                d={stroke.d}
                className={'writing-pad__accepted' + (index === accepted.length - 1 ? ' is-new' : '')}
                style={{ strokeWidth: inkWidth }}
              />
            ) : null,
          )}

        {mode === 'ingatan' &&
          drafts.map((points, index) => {
            const verdict = result?.matches[index]?.verdict
            return (
              <polyline
                key={index}
                points={toPolyline(points)}
                className={'writing-pad__draft ' + (verdict ? VERDICT_CLASS[verdict] : '')}
                style={{ strokeWidth: inkWidth }}
              />
            )
          })}

        {flash && <polyline points={toPolyline(flash)} className="writing-pad__rejected" style={{ strokeWidth: inkWidth }} />}
      </svg>

      <WritingCanvas
        onStroke={(points) => dispatch({ type: 'stroke', points })}
        inkWidth={inkWidth}
        penOnly={penOnly}
        disabled={finished}
        label={label}
      />
    </div>
  )
}
