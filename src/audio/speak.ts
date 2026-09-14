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
import { AUDIO_DIR, audioFileName, hasAudio } from './audioFiles'

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
export function sortedJapaneseVoices(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return japaneseVoices(voices).sort((a, b) => Number(b.localService) - Number(a.localService))
}

export function findJapaneseVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return sortedJapaneseVoices(voices)[0]
}

export type SpeakOutcome =
  | { ok: true; voice: string }
  /** Berkas audio bawaan aplikasi gagal diputar. */
  | { ok: false; reason: 'blocked'; detail: string }
  /** Tidak ada suara Jepang di perangkat ini. */
  | { ok: false; reason: 'no-voice' }
  /** Peramban menolak, mis. butuh ketukan pengguna lebih dulu. */
  | { ok: false; reason: 'error'; detail: string; tried: number }
  /** Perintah diterima, tetapi bunyi tidak pernah dimulai. */
  | { ok: false; reason: 'silent'; voice: string; remote: boolean; tried: number }

/** Banyak suara yang dicoba sebelum menyerah. */
const MAX_ATTEMPTS = 3

/** Satu percobaan bicara dengan suara tertentu, atau tanpa menunjuk suara sama sekali. */
function speakWith(text: string, voice: SpeechSynthesisVoice | undefined): Promise<SpeakOutcome> {
  const utterance = new SpeechSynthesisUtterance(text)
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  } else {
    // Tanpa menunjuk suara, mesin memilih sendiri berdasarkan bahasa.
    // Ini menolong ketika entri suara tertentu rusak.
    utterance.lang = 'ja-JP'
  }
  utterance.rate = 0.85

  return new Promise<SpeakOutcome>((resolve) => {
    let settled = false
    const done = (outcome: SpeakOutcome) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(outcome)
    }

    utterance.onstart = () => done({ ok: true, voice: voice?.name ?? 'bawaan sistem' })
    utterance.onerror = (event) =>
      done({ ok: false, reason: 'error', detail: event.error || 'unknown', tried: 1 })
    const timer = window.setTimeout(
      () =>
        done({
          ok: false,
          reason: 'silent',
          voice: voice?.name ?? 'bawaan sistem',
          remote: voice ? !voice.localService : false,
          tried: 1,
        }),
      START_TIMEOUT_MS,
    )

    window.speechSynthesis.speak(utterance)
    window.speechSynthesis.resume()
  })
}

/**
 * Mengucapkan teks Jepang dan melaporkan hasilnya.
 *
 * Bila suara pertama gagal, suara Jepang lain dicoba, lalu percobaan terakhir
 * dilakukan tanpa menunjuk suara sama sekali. Mesin suara yang datanya belum
 * lengkap sering gagal pada satu entri saja, bukan pada semuanya.
 *
 * Dua penanganan bug Chrome juga dipasang di sini:
 *   - `cancel()` tidak dipanggil tepat sebelum `speak()`; pada Chrome, urutan
 *     itu kadang ikut membatalkan ucapan yang baru saja diminta.
 *   - `resume()` dipanggil setelahnya, karena antrean bisa tertinggal dalam
 *     keadaan tertahan setelah pembatalan sebelumnya.
 */
export async function speak(text: string): Promise<SpeakOutcome> {
  if (!speechSupported()) return { ok: false, reason: 'no-voice' }

  const synth = window.speechSynthesis
  const voices = sortedJapaneseVoices(await loadVoices())
  if (voices.length === 0) return { ok: false, reason: 'no-voice' }

  if (synth.speaking || synth.pending) {
    synth.cancel()
    await new Promise((resolve) => window.setTimeout(resolve, 80))
  }

  const attempts: Array<SpeechSynthesisVoice | undefined> = [...voices.slice(0, MAX_ATTEMPTS), undefined]
  let last: SpeakOutcome = { ok: false, reason: 'no-voice' }

  for (let i = 0; i < attempts.length; i++) {
    const outcome = await speakWith(text, attempts[i])
    if (outcome.ok) return outcome
    if (outcome.reason === 'error' || outcome.reason === 'silent') last = { ...outcome, tried: i + 1 }
    synth.cancel()
  }

  return last
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

/**
 * Memutar rekaman bunyi kana yang disertakan di dalam aplikasi.
 *
 * Ini jalur utama: hasilnya sama di perangkat mana pun dan tidak bergantung
 * mesin suara sistem, yang ternyata sering tidak terpasang lengkap.
 */
export async function playRecording(romaji: string): Promise<SpeakOutcome | null> {
  if (!hasAudio(romaji)) return null
  const url = import.meta.env.BASE_URL + AUDIO_DIR + audioFileName(romaji) + '.wav'

  try {
    const audio = new Audio(url)
    audio.preload = 'auto'
    await audio.play()
    return { ok: true, voice: 'rekaman bawaan' }
  } catch (error) {
    const detail = error instanceof Error ? error.name : 'unknown'
    return { ok: false, reason: 'blocked', detail }
  }
}

/**
 * Membunyikan sebuah kana: rekaman bawaan lebih dulu, mesin suara perangkat
 * hanya dipakai bila rekamannya tidak ada atau gagal diputar.
 */
export async function speakKana(char: string, romaji: string): Promise<SpeakOutcome> {
  const recorded = await playRecording(romaji)
  if (recorded?.ok) return recorded

  const spoken = await speak(char)
  if (spoken.ok) return spoken
  return recorded ?? spoken
}
