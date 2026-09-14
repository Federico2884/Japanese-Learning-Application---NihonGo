/**
 * Pelafalan lewat Web Speech API (suara bawaan perangkat, tanpa berkas audio).
 *
 * Dua hal yang sering salah dikira sama:
 *   1. peramban punya fitur speechSynthesis, dan
 *   2. perangkat punya suara bahasa Jepang yang terpasang.
 *
 * Banyak laptop Windows dan sebagian HP Android hanya punya nomor 1. Tanpa
 * suara Jepang, perintah bicara diterima tetapi tidak ada bunyi yang keluar.
 * Karena itu tombol suara dan soal dengar hanya muncul setelah suara Jepang
 * benar-benar ditemukan.
 */
import { useEffect, useState } from 'react'

/** Daftar suara kadang masih kosong saat halaman baru dibuka. */
const VOICE_WAIT_MS = 2000

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Menunggu daftar suara terisi; peramban mengisinya secara tidak serentak. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([])
  if (voicesPromise) return voicesPromise

  voicesPromise = new Promise((resolve) => {
    const ready = window.speechSynthesis.getVoices()
    if (ready.length > 0) {
      resolve(ready)
      return
    }

    const finish = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', finish)
      window.clearTimeout(timer)
      resolve(window.speechSynthesis.getVoices())
    }
    const timer = window.setTimeout(finish, VOICE_WAIT_MS)
    window.speechSynthesis.addEventListener('voiceschanged', finish)
  })

  return voicesPromise
}

export function findJapaneseVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return voices.find((voice) => voice.lang.toLowerCase().startsWith('ja'))
}

/** Mengucapkan teks Jepang. Mengembalikan false bila tidak ada suara Jepang. */
export async function speak(text: string): Promise<boolean> {
  if (!speechSupported()) return false

  const voice = findJapaneseVoice(await loadVoices())
  if (!voice) return false

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice.lang
  utterance.rate = 0.85

  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
  return true
}

export interface JapaneseVoiceState {
  /** Pengecekan suara sudah selesai. */
  checked: boolean
  /** Ada suara bahasa Jepang di perangkat ini. */
  available: boolean
  /** Nama suara yang dipakai, untuk ditampilkan di Pengaturan. */
  name: string | null
}

/**
 * Status suara bahasa Jepang di perangkat ini.
 * Komponen memakainya untuk menyembunyikan tombol suara dan soal dengar.
 */
export function useJapaneseVoice(): JapaneseVoiceState {
  const [state, setState] = useState<JapaneseVoiceState>({
    checked: !speechSupported(),
    available: false,
    name: null,
  })

  useEffect(() => {
    if (!speechSupported()) return
    let active = true

    const check = () => {
      void loadVoices().then((voices) => {
        if (!active) return
        const voice = findJapaneseVoice(voices)
        setState({ checked: true, available: voice !== undefined, name: voice?.name ?? null })
      })
    }
    check()

    // Suara bisa menyusul terpasang, mis. setelah paket bahasa selesai diunduh.
    const onChange = () => {
      voicesPromise = null
      check()
    }
    window.speechSynthesis.addEventListener('voiceschanged', onChange)
    return () => {
      active = false
      window.speechSynthesis.removeEventListener('voiceschanged', onChange)
    }
  }, [])

  return state
}
