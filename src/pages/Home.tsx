import { Link } from 'react-router-dom'
import { getKana, type KanaScript } from '../data/kana'

const START: ReadonlyArray<{ script: KanaScript; char: string; title: string }> = [
  { script: 'hiragana', char: 'あ', title: 'Latihan menulis hiragana' },
  { script: 'katakana', char: 'ア', title: 'Latihan menulis katakana' },
]

function writableCount(script: KanaScript): number {
  return getKana(script).filter((kana) => kana.components.length === 1).length
}

export default function Home() {
  return (
    <main className="page home">
      <h1 className="app-title">
        <span lang="ja">にほんご</span>
        <small>NihonGo</small>
      </h1>
      <p className="app-tagline">
        Belajar hiragana &amp; katakana sambil berlatih menulis langsung dengan stylus.
      </p>

      <section className="home__actions" aria-label="Mulai latihan menulis">
        {START.map((item) => (
          <Link key={item.script} to={'/tulis/' + item.script + '/' + item.char} className="start-card">
            <span className="start-card__char" lang="ja">
              {item.char}
            </span>
            <span className="start-card__text">
              <strong>{item.title}</strong>
              <span>{writableCount(item.script)} huruf · jiplak, petunjuk, dari ingatan</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  )
}
