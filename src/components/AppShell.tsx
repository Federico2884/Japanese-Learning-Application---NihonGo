import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../state/theme'
import { Logo } from './Logo'
import { UpdatePrompt } from './UpdatePrompt'

interface NavItem {
  to: string
  name: string
  icon: string
  /** Awalan rute lain yang ikut menyalakan tab ini. */
  also?: string
}

/**
 * Navigasi diletakkan di bawah: tablet dipegang dua tangan dan ibu jari
 * berada di tepi bawah layar (lihat design.md bagian 5).
 */
const NAV: readonly NavItem[] = [
  { to: '/', name: 'Beranda', icon: '⌂' },
  { to: '/hafalan', name: 'Hafalan', icon: '記' },
  { to: '/tabel', name: 'Tabel', icon: '田', also: '/huruf' },
  { to: '/tulis', name: 'Tulis', icon: '筆' },
  { to: '/kuis', name: 'Kuis', icon: '?' },
  { to: '/atur', name: 'Atur', icon: '⚙' },
]

const TITLES: ReadonlyArray<[prefix: string, title: string]> = [
  ['/hafalan', 'Hafalan'],
  ['/tabel', 'Tabel kana'],
  ['/huruf', 'Detail huruf'],
  ['/tulis', 'Latihan menulis'],
  ['/kuis', 'Kuis'],
  ['/atur', 'Pengaturan'],
]

function screenTitle(pathname: string): string {
  return TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'Beranda'
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.to === '/') return pathname === '/'
  return pathname.startsWith(item.to) || (item.also !== undefined && pathname.startsWith(item.also))
}

/**
 * Kerangka aplikasi: header ramping, garis kemajuan scroll, area konten yang
 * menggulir sendiri (supaya halaman tidak ikut bergerak saat menulis), dan
 * navigasi bawah.
 */
export function AppShell() {
  const { pathname } = useLocation()
  const [theme, toggleTheme] = useTheme()
  const mainRef = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)

  // Kembali ke atas setiap pindah layar.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
    setProgress(0)
  }, [pathname])

  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    const update = () => {
      const scrollable = main.scrollHeight - main.clientHeight
      setProgress(scrollable > 0 ? main.scrollTop / scrollable : 0)
    }
    update()
    main.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(main)
    return () => {
      main.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [pathname])

  return (
    <div className="shell">
      <header className="shell__header">
        <NavLink to="/" className="shell__logo" aria-label="Beranda">
          <Logo />
        </NavLink>
        <span className="shell__title">{screenTitle(pathname)}</span>
        <button
          type="button"
          className="icon-button"
          onClick={toggleTheme}
          title="Ganti tema"
          aria-label={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>

      <div className="shell__progress" aria-hidden="true">
        <span style={{ transform: 'scaleX(' + progress.toFixed(3) + ')' }} />
      </div>

      <main className="shell__main" ref={mainRef}>
        <div className="shell__content">
          <Outlet />
        </div>
      </main>

      <nav className="shell__nav" aria-label="Navigasi utama">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="nav-tab"
            aria-current={isActive(pathname, item) ? 'page' : undefined}
            data-active={isActive(pathname, item) || undefined}
            end={item.to === '/'}
          >
            <span className="nav-tab__icon" lang="ja" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav-tab__name">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <UpdatePrompt />
    </div>
  )
}
