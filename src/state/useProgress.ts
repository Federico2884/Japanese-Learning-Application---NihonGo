import { useCallback, useEffect, useState } from 'react'
import {
  PROGRESS_CHANGE_EVENT,
  loadProgress,
  recordReview,
  resetProgress,
  type ProgressMap,
} from './progress'

export interface ProgressApi {
  progress: ProgressMap
  /** Mencatat hasil satu ulangan huruf. */
  review: (id: string, correct: boolean) => void
  reset: () => void
}

/** Progres Leitner yang tetap sinkron antar komponen dan antar tab. */
export function useProgress(): ProgressApi {
  const [progress, setProgress] = useState<ProgressMap>(loadProgress)

  useEffect(() => {
    const refresh = () => setProgress(loadProgress())
    window.addEventListener(PROGRESS_CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PROGRESS_CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const review = useCallback((id: string, correct: boolean) => {
    setProgress(recordReview(id, correct))
  }, [])

  const reset = useCallback(() => {
    resetProgress()
    setProgress({})
  }, [])

  return { progress, review, reset }
}
