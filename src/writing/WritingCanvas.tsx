import { useCallback, useEffect, useRef } from 'react'
import { KANJIVG_SIZE } from '../data/strokes'
import type { Point } from './strokeMath'

interface WritingCanvasProps {
  /** Dipanggil setiap satu goresan selesai, dengan titik dalam ruang 109 x 109. */
  onStroke: (points: Point[]) => void
  /** Ketebalan tinta dalam satuan ruang 109 x 109. */
  inkWidth?: number
  /** Hanya stylus yang bisa menulis; sentuhan jari/telapak diabaikan. */
  penOnly?: boolean
  disabled?: boolean
  label?: string
}

/** Goresan lebih pendek dari ini (satuan 109) dianggap ketukan tak sengaja. */
const MIN_STROKE_LENGTH = 1.5

/**
 * Lapisan kanvas untuk menulis dengan stylus, jari, atau mouse.
 *
 * Kanvas hanya menampilkan tinta goresan yang sedang ditulis; begitu stylus diangkat,
 * goresan dikirim lewat `onStroke` lalu kanvas dibersihkan. Komponen induk yang
 * memutuskan cara menampilkan goresan yang sudah dinilai.
 */
export function WritingCanvas({ onStroke, inkWidth = 4.5, penOnly = false, disabled = false, label }: WritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointsRef = useRef<Point[]>([])
  const activePointerRef = useRef<number | null>(null)
  /** Setelah stylus pernah dipakai, sentuhan jari diabaikan (telapak tangan yang menempel layar). */
  const penSeenRef = useRef(false)
  const lastWidthRef = useRef(inkWidth)

  const context = useCallback(() => canvasRef.current?.getContext('2d') ?? null, [])

  // Sesuaikan resolusi kanvas dengan ukuran tampilan & kepadatan piksel layar,
  // lalu pakai ruang koordinat 109 x 109 supaya titik bisa langsung dinilai.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * ratio)
      canvas.height = Math.round(rect.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const scale = (rect.width * ratio) / KANJIVG_SIZE
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  const toPoint = (event: PointerEvent | React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return [
      ((event.clientX - rect.left) / rect.width) * KANJIVG_SIZE,
      ((event.clientY - rect.top) / rect.height) * KANJIVG_SIZE,
    ]
  }

  const widthFor = (event: PointerEvent | React.PointerEvent): number => {
    if (event.pointerType !== 'pen' || event.pressure === 0) return inkWidth
    // Tekanan 0..1 -> 60%..140% ketebalan, diperhalus supaya tidak berkedip.
    const target = inkWidth * (0.6 + event.pressure * 0.8)
    lastWidthRef.current = lastWidthRef.current * 0.7 + target * 0.3
    return lastWidthRef.current
  }

  const ignored = (event: React.PointerEvent): boolean => {
    if (disabled) return true
    if (event.pointerType === 'pen') penSeenRef.current = true
    if (event.pointerType === 'touch' && (penOnly || penSeenRef.current)) return true
    if (event.pointerType === 'mouse' && event.button !== 0) return true
    return false
  }

  const clear = () => {
    const ctx = context()
    if (ctx) ctx.clearRect(0, 0, KANJIVG_SIZE, KANJIVG_SIZE)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (ignored(event) || activePointerRef.current !== null) return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Beberapa browser menolak capture untuk pointer tertentu; goresan tetap bisa ditulis.
    }
    activePointerRef.current = event.pointerId
    lastWidthRef.current = inkWidth

    const point = toPoint(event)
    pointsRef.current = [point]

    const ctx = context()
    if (!ctx) return
    ctx.fillStyle = getComputedStyle(event.currentTarget).color
    ctx.beginPath()
    ctx.arc(point[0], point[1], widthFor(event) / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerId !== activePointerRef.current) return
    event.preventDefault()

    const native = event.nativeEvent
    const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : []
    const samples = events.length > 0 ? events : [native]

    const ctx = context()
    if (!ctx) return
    ctx.strokeStyle = getComputedStyle(event.currentTarget).color

    for (const sample of samples) {
      const point = toPoint(sample)
      const previous = pointsRef.current[pointsRef.current.length - 1]!
      pointsRef.current.push(point)
      ctx.lineWidth = widthFor(sample)
      ctx.beginPath()
      ctx.moveTo(previous[0], previous[1])
      ctx.lineTo(point[0], point[1])
      ctx.stroke()
    }
  }

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>, cancelled: boolean) => {
    if (event.pointerId !== activePointerRef.current) return
    activePointerRef.current = null
    const points = pointsRef.current
    pointsRef.current = []
    clear()

    if (cancelled) return
    let length = 0
    for (let i = 1; i < points.length; i++) {
      length += Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1])
    }
    if (length >= MIN_STROKE_LENGTH) onStroke(points)
  }

  return (
    <canvas
      ref={canvasRef}
      className="writing-canvas"
      role="img"
      aria-label={label ?? 'Area menulis'}
      data-disabled={disabled || undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishStroke(event, false)}
      onPointerCancel={(event) => finishStroke(event, true)}
      onContextMenu={(event) => event.preventDefault()}
    />
  )
}
