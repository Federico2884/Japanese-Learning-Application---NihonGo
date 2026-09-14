import { Link, Navigate, useParams } from 'react-router-dom'
import {
  getChartRows,
  getYoonRows,
  type ChartGroup,
  type Kana,
  type KanaChartRow,
  type KanaScript,
} from '../data/kana'
import { useSettings } from '../state/settings'
import { masteryLevel } from '../state/progress'
import { useProgress } from '../state/useProgress'

interface Group {
  key: ChartGroup | 'yoon'
  title: string
  sub: string
  cols: number
}

const GROUPS: readonly Group[] = [
  { key: 'gojuon', title: 'Gojūon', sub: '11 baris dasar', cols: 5 },
  { key: 'dakuten', title: 'Dakuten', sub: '4 baris bersuara', cols: 5 },
  { key: 'handakuten', title: 'Handakuten', sub: '1 baris', cols: 5 },
  { key: 'small', title: 'Huruf kecil', sub: '3 baris', cols: 5 },
  { key: 'yoon', title: 'Yōon', sub: '11 baris gabungan', cols: 3 },
]

const MASTERY_LABEL = [
  'belum dipelajari',
  'baru dikenal',
  'mulai menempel',
  'cukup hafal',
  'hafal',
  'nyaris otomatis',
]

function isScript(value: string | undefined): value is KanaScript {
  return value === 'hiragana' || value === 'katakana'
}

function rowsFor(group: Group, script: KanaScript): KanaChartRow[] {
  return group.key === 'yoon' ? getYoonRows(script) : getChartRows(script, group.key)
}

export default function KanaTable() {
  const params = useParams()
  const [settings] = useSettings()
  const { progress } = useProgress()

  if (!isScript(params.script)) return <Navigate to="/tabel/hiragana" replace />
  const script = params.script

  return (
    <div className="table-page">
      <div className="table-page__bar">
        <div className="pill-group" role="tablist" aria-label="Pilih aksara">
          {(['hiragana', 'katakana'] as const).map((item) => (
            <Link
              key={item}
              to={'/tabel/' + item}
              role="tab"
              className="pill"
              aria-selected={item === script}
            >
              {item === 'hiragana' ? 'Hiragana' : 'Katakana'}
            </Link>
          ))}
        </div>
        <span className="table-page__hint">Ketuk huruf untuk melihat detail dan urutan goresannya</span>
      </div>

      <div className="mastery-legend" aria-hidden="true">
        <span>Penguasaan</span>
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <span key={level} className="mastery-dot" data-level={level} title={MASTERY_LABEL[level]} />
        ))}
        <span>hafal</span>
      </div>

      {GROUPS.map((group) => (
        <section key={group.key} className="kana-group">
          <div className="kana-group__head">
            <h2>{group.title}</h2>
            <span className="kana-group__sub">{group.sub}</span>
            <span className="kana-group__rule" />
          </div>

          <div className="kana-grid" style={{ '--cols': group.cols } as React.CSSProperties}>
            {rowsFor(group, script).flatMap((row, rowIndex) =>
              row.cells.map((cell: Kana | null, cellIndex) =>
                cell ? (
                  <Link
                    key={cell.id}
                    to={'/huruf/' + script + '/' + cell.char}
                    className="kana-cell rise-in rise-in--early"
                    data-mastery={masteryLevel(progress[cell.id])}
                  >
                    <span className="kana-cell__char" lang="ja">
                      {cell.char}
                    </span>
                    <span className="kana-cell__romaji">{settings.showRomaji ? cell.romaji : ''}</span>
                  </Link>
                ) : (
                  <span key={row.row + '-' + rowIndex + '-' + cellIndex} className="kana-cell is-empty" />
                ),
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
