import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import Home from './pages/Home'
import Placeholder from './pages/Placeholder'
import WritePractice from './pages/WritePractice'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />

        <Route path="/hafalan" element={<Navigate to="/hafalan/hiragana" replace />} />
        <Route
          path="/hafalan/:script"
          element={
            <Placeholder
              title="Hafalan"
              description="Kartu huruf per baris gojūon: ketuk kartu untuk membuka bacaannya, lalu lanjut ke huruf berikutnya."
            />
          }
        />

        <Route
          path="/tabel"
          element={
            <Placeholder
              title="Tabel kana"
              description="Gojūon, dakuten, handakuten, huruf kecil, dan yōon dalam satu halaman."
            />
          }
        />
        <Route
          path="/huruf/:script/:char"
          element={
            <Placeholder
              title="Detail huruf"
              description="Animasi urutan goresan, jumlah goresan, contoh kata, dan pintasan ke latihan menulis."
            />
          }
        />

        <Route path="/tulis" element={<Navigate to="/tulis/hiragana/あ" replace />} />
        <Route path="/tulis/:script" element={<WritePractice />} />
        <Route path="/tulis/:script/:char" element={<WritePractice />} />

        <Route
          path="/kuis"
          element={
            <Placeholder
              title="Kuis"
              description="Tiga bentuk soal: kana ke romaji, bunyi ke kana, dan romaji ke tulisan tangan."
            />
          }
        />
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
