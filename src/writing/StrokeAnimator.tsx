import type { CSSProperties } from 'react'
import { KANJIVG_SIZE, type ReferenceStroke } from '../data/strokes'

interface StrokeAnimatorProps {
  strokes: readonly ReferenceStroke[]
  /**
   * Goresan yang dianimasikan. `'all'` memutar semua goresan berurutan,
   * sebuah angka hanya memutar goresan itu, `null` menampilkan huruf utuh tanpa animasi.
   */
  play?: 'all' | number | null
  /** Ubah nilai ini untuk memutar ulang animasi. */
  replayKey?: number
  /** Pengali kecepatan (2 = dua kali lebih cepat). */
  speed?: number
  showNumbers?: boolean
  /** Goresan sebelum indeks ini digambar utuh sebagai konteks (dipakai petunjuk). */
  completedBefore?: number
  className?: string
  onDone?: () => void
}

/** Lama animasi satu goresan dalam milidetik pada kecepatan normal. */
const STROKE_DURATION = 650
const STROKE_GAP = 180

/**
 * Menampilkan huruf dari data KanjiVG dan menganimasikan urutan goresannya.
 * Animasi memakai `stroke-dashoffset` dengan `pathLength="1"`, jadi tidak perlu
 * mengukur panjang path di browser.
 */
export function StrokeAnimator({
  strokes,
  play = 'all',
  replayKey = 0,
  speed = 1,
  showNumbers = false,
  completedBefore = 0,
  className,
  onDone,
}: StrokeAnimatorProps) {
  const duration = STROKE_DURATION / speed
  const gap = STROKE_GAP / speed
  const lastAnimated = play === 'all' ? strokes.length - 1 : play

  return (
    <svg
      key={replayKey}
      className={['stroke-animator', className].filter(Boolean).join(' ')}
      viewBox={'0 0 ' + KANJIVG_SIZE + ' ' + KANJIVG_SIZE}
      aria-hidden="true"
    >
      {strokes.map((stroke, index) => {
        const animated = play === 'all' || play === index
        const visible = play === null || play === 'all' || index < completedBefore || index === play
        if (!visible) return null

        const order = play === 'all' ? index : 0
        const style = animated
          ? ({
              animationDuration: duration + 'ms',
              animationDelay: order * (duration + gap) + 'ms',
            } as CSSProperties)
          : undefined

        return (
          <path
            key={index}
            d={stroke.d}
            pathLength={1}
            className={animated ? 'stroke-animator__path is-animated' : 'stroke-animator__path'}
            style={style}
            onAnimationEnd={index === lastAnimated ? onDone : undefined}
          />
        )
      })}

      {play !== null &&
        strokes.map((stroke, index) => {
          const start = stroke.points[0]
          const animated = play === 'all' || play === index
          if (!start || !animated) return null
          const order = play === 'all' ? index : 0
          return (
            <circle
              key={'start-' + index}
              cx={start[0]}
              cy={start[1]}
              r={2.6}
              className="stroke-animator__start"
              style={{ animationDelay: order * (duration + gap) + 'ms' } as CSSProperties}
            />
          )
        })}

      {showNumbers &&
        strokes.map((stroke, index) => {
          const start = stroke.points[0]
          if (!start) return null
          return (
            <text key={'num-' + index} x={start[0] - 5} y={start[1] - 3} className="stroke-animator__number">
              {index + 1}
            </text>
          )
        })}
    </svg>
  )
}
