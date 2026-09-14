import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import Home from './pages/Home'
import KanaDetail from './pages/KanaDetail'
import KanaTable from './pages/KanaTable'
import Memorize from './pages/Memorize'
import Quiz from './pages/Quiz'
import Placeholder from './pages/Placeholder'
import WritePractice from './pages/WritePractice'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />

        <Route path="/hafalan" element={<Navigate to="/hafalan/hiragana" replace />} />
        <Route path="/hafalan/:script" element={<Memorize />} />

        <Route path="/tabel" element={<Navigate to="/tabel/hiragana" replace />} />
        <Route path="/tabel/:script" element={<KanaTable />} />
        <Route path="/huruf/:script/:char" element={<KanaDetail />} />

        <Route path="/tulis" element={<Navigate to="/tulis/hiragana/あ" replace />} />
        <Route path="/tulis/:script" element={<WritePractice />} />
        <Route path="/tulis/:script/:char" element={<WritePractice />} />

        <Route path="/kuis" element={<Quiz />} />
        <Route
          path="/atur"
          element={
            <Placeholder
              title="Pengaturan"
              description="Tingkat toleransi penilaian, mode hanya-stylus, tampilkan romaji, ketebalan tinta, dan kecepatan animasi."
            />
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
