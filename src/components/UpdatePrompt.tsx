import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Pemberitahuan saat ada versi baru aplikasi.
 *
 * Versi baru sengaja tidak dipasang diam-diam: kalau halaman dimuat ulang
 * sendiri di tengah latihan, goresan yang sedang ditulis ikut hilang.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="update-prompt" role="status">
      <span>Versi baru NihonGo sudah siap.</span>
      <div className="update-prompt__actions">
        <button type="button" onClick={() => setNeedRefresh(false)}>
          Nanti
        </button>
        <button type="button" className="button-primary" onClick={() => void updateServiceWorker(true)}>
          Muat ulang
        </button>
      </div>
    </div>
  )
}
