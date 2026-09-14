import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import WritePractice from './pages/WritePractice'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tulis" element={<Navigate to="/tulis/hiragana/あ" replace />} />
      <Route path="/tulis/:script" element={<WritePractice />} />
      <Route path="/tulis/:script/:char" element={<WritePractice />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
