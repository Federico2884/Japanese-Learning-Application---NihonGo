/**
 * Pelafalan lewat Web Speech API (suara bawaan perangkat, tanpa file audio).
 * Android & Windows umumnya sudah punya suara bahasa Jepang; bila tidak ada,
 * tombol suara disembunyikan lewat `canSpeakJapanese()`.
 */

function japaneseVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('ja'))
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(text: string): void {
  if (!canSpeak()) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 0.85
  const voice = japaneseVoice()
  if (voice) utterance.voice = voice
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}
