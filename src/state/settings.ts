/**
 * Pengaturan pengguna yang disimpan di localStorage.
 * Halaman Pengaturan menyusul; untuk sementara nilai bawaan dipakai di seluruh aplikasi.
 */
import { useCallback, useEffect, useState } from 'react'
import type { Tolerance } from '../writing/strokeMatcher'

export interface Settings {
  tolerance: Tolerance
  /** Abaikan sentuhan jari/telapak tangan; hanya stylus yang bisa menulis. */
  penOnly: boolean
  /** Ketebalan tinta dalam satuan ruang 109 x 109. */
  inkWidth: number
  showRomaji: boolean
  /** Pengali kecepatan animasi urutan goresan (1 = normal). */
  animationSpeed: number
}

export const DEFAULT_SETTINGS: Settings = {
  tolerance: 'normal',
  penOnly: false,
  inkWidth: 4.5,
  showRomaji: true,
  animationSpeed: 1,
}

const STORAGE_KEY = 'nihongo.settings.v1'
const CHANGE_EVENT = 'nihongo:settings'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Penyimpanan bisa diblokir (mode privat); pengaturan tetap berlaku untuk sesi ini.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Hook pengaturan yang tetap sinkron antar komponen dan antar tab. */
export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    const refresh = () => setSettings(loadSettings())
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const update = useCallback((patch: Partial<Settings>) => {
    saveSettings({ ...loadSettings(), ...patch })
  }, [])

  return [settings, update]
}
