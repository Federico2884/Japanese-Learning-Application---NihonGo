import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { getStrokes } from '../data/strokes'
import { useSettings } from '../state/settings'
import { StrokeAnimator } from '../writing/StrokeAnimator'

const SCRIPT_CARDS = [
  { to: '/hafalan/hiragana', glyph: 'あ', title: 'Hiragana', sub: '46 huruf dasar — mulai dari sini' },
  { to: '/hafalan/katakana', glyph: 'ア', title: 'Katakana', sub: '46 huruf untuk kata serapan' },
] as const

const HOW_TO_LEARN = [
  { to: '/hafalan/hiragana', icon: '記', title: 'Hafalan', sub: 'Kartu huruf per baris, ketuk untuk membuka bacaannya' },
  { to: '/tulis', icon: '筆', title: 'Latihan menulis', sub: 'Tulis langsung dengan stylus, tiap goresan dinilai' },
  { to: '/tabel', icon: '田', title: 'Tabel kana', sub: 'Gojūon, dakuten, handakuten, huruf kecil, yōon' },
  { to: '/kuis', icon: '?', title: 'Kuis', sub: 'Kana ke romaji, bunyi ke kana, romaji ke tulisan' },
] as const

export default function Home() {
  const [settings] = useSettings()
  const hero = getStrokes('あ') ?? []

  return (
    <>
      <section className="card hero">
        <div className="hero__text">
          <Logo size="hero" />
          <p className="hero__tagline">
            Hafalkan hiragana dan katakana, lalu latih tangan menulisnya langsung di layar.
          </p>
          <div className="hero__actions">
            <Link to="/tulis" className="button-link button-primary">
              Latihan menulis
            </Link>
            <Link to="/hafalan/hiragana" className="button-link">
              Mulai hafalan
            </Link>
          </div>
        </div>
        <div className="hero__demo">
          <div className="paper-box hero__paper">
            <span className="paper-box__grid" />
            <StrokeAnimator strokes={hero} play={null} className="hero__ghost" />
            <StrokeAnimator strokes={hero} loop speed={settings.animationSpeed} className="hero__ink" />
          </div>
        </div>
      </section>

      <section className="home__scripts">
        {SCRIPT_CARDS.map((card) => (
          <Link key={card.to} to={card.to} className="card script-card rise-in">
            <span className="script-card__glyph" lang="ja">
              {card.glyph}
            </span>
            <span className="script-card__text">
              <strong>{card.title}</strong>
              <span>{card.sub}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="home__how">
        <div className="section-heading">
          <h2>Cara belajar</h2>
          <span className="grow-x" />
        </div>
        <div className="home__how-grid">
          {HOW_TO_LEARN.map((item) => (
            <Link key={item.title} to={item.to} className="card how-card rise-in">
              <span className="how-card__icon" lang="ja">
                {item.icon}
              </span>
              <strong>{item.title}</strong>
              <span className="how-card__sub">{item.sub}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card home__closing">
        <div className="home__closing-inner">
          <span className="home__brush" lang="ja">
            筆
          </span>
          <p>
            Menulis dengan urutan goresan yang benar membuat huruf lebih cepat menempel daripada sekadar
            melihatnya.
          </p>
          <span className="home__closing-note">Semua latihan berjalan di perangkat ini, tanpa akun.</span>
        </div>
      </section>
    </>
  )
}
