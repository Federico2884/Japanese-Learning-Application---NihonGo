/**
 * Pelafalan lewat Web Speech API (suara bawaan perangkat, tanpa berkas audio).
 *
 * Tiga hal yang sering dikira sama, padahal berbeda:
 *   1. peramban punya fitur speechSynthesis,
 *   2. perangkat punya suara bahasa Jepang yang terdaftar,
 *   3. suara itu benar-benar berbunyi.
 *
 * Nomor 2 bisa terpenuhi tanpa nomor 3: suara daring (localService = false)
 * perlu internet, dan Chrome punya beberapa bug yang membuat perintah bicara
 * diterima tetapi tidak pernah berbunyi. Karena itu hasil bicara dilaporkan
 * kembali lewat peristiwa start/end/error, bukan diasumsikan berhasil.
 */
import { useEffect, useState } from 'react'

/** Daftar suara kadang masih kosong saat halaman baru dibuka. */
const VOICE_WAIT_MS = 2000

/** Batas menunggu bunyi benar-benar dimulai sebelum dianggap gagal diam-diam. */
const START_TIMEOUT_MS = 2500

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

export function japaneseVoices(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((voice) => voice.lang.toLowerCase().startsWith('ja'))
}

/** Suara lokal didahulukan karena tidak butuh internet. */
export function findJapaneseVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const japanese = japaneseVoices(voices)
  return japanese.find((voice) => voice.localService) ?? japanese[0]
}

export type SpeakOutcome =
  | { ok: true; voice: string }
  /** Tidak ada suara Jepang di perangkat ini. */
  | { ok: false; reason: 'no-voice' }
  /** Peramban menolak, mis. butuh ketukan pengguna lebih dulu. */
  | { ok: false; reason: 'error'; detail: string }
  /** Perintah diterima, tetapi bunyi tidak pernah dimulai. */
  | { ok: false; reason: 'silent'; voice: string; remote: boolean }

/**
 * Mengucapkan teks Jepang dan melaporkan hasilnya.
 *
 * Dua penanganan bug Chrome di sini:
 *   - `cancel()` tidak dipanggil tepat sebelum `speak()`; pada Chrome, urutan
 *     itu kadang ikut membatalkan ucapan yang baru saja diminta.
 *   - `resume()` dipanggil setelahnya, karena antrean bisa tertinggal dalam
 *     keadaan tertahan setelah pembatalan sebelumnya.
 */
export async function speak(text: string): Promise<SpeakOutcome> {
  if (!speechSupported()) return { ok: false, reason: 'no-voice' }

  const synth = window.speechSynthesis
  const voice = findJapaneseVoice(await loadVoices())
  if (!voice) return { ok: false, reason: 'no-voice' }

  if (synth.speaking || synth.pending) {
    synth.cancel()
    await new Promise((resolve) => window.setTimeout(resolve, 80))
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice.lang
  utterance.rate = 0.85

  return new Promise<SpeakOutcome>((resolve) => {
    let settled = false
    const done = (outcome: SpeakOutcome) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(outcome)
    }

    utterance.onstart = () => done({ ok: true, voice: voice.name })
    utterance.onerror = (event) => done({ ok: false, reason: 'error', detail: event.error || 'unknown' })
    const timer = window.setTimeout(
      () => done({ ok: false, reason: 'silent', voice: voice.name, remote: !voice.localService }),
      START_TIMEOUT_MS,
    )

    synth.speak(utterance)
    synth.resume()
  })
}

export interface JapaneseVoiceState {
  /** Pengecekan suara sudah selesai. */
  checked: boolean
  /** Ada suara bahasa Jepang di perangkat ini. */
  available: boolean
  /** Nama suara yang dipakai, untuk ditampilkan di Pengaturan. */
  name: string | null
  /** Suara memerlukan internet (bukan suara lokal). */
  remote: boolean
  /** Seluruh suara Jepang yang ditemukan, untuk keperluan pemeriksaan. */
  all: SpeechSynthesisVoice[]
}

const EMPTY: JapaneseVoiceState = { checked: false, available: false, name: null, remote: false, all: [] }

/**
 * Status suara bahasa Jepang di perangkat ini.
 * Komponen memakainya untuk menyembunyikan tombol suara dan soal dengar.
 */
export function useJapaneseVoice(): JapaneseVoiceState {
  const [state, setState] = useState<JapaneseVoiceState>(
    speechSupported() ? EMPTY : { ...EMPTY, checked: true },
  )

  useEffect(() => {
    if (!speechSupported()) return
    let active = true

    const check = () => {
      void loadVoices().then((voices) => {
        if (!active) return
        const all = japaneseVoices(voices)
        const voice = findJapaneseVoice(voices)
        setState({
          checked: true,
          available: voice !== undefined,
          name: voice?.name ?? null,
          remote: voice ? !voice.localService : false,
          all,
        })
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
