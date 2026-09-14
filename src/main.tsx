import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/fonts.css'
import './styles/global.css'
import './styles/shell.css'
import './styles/home.css'
import './styles/table.css'
import './styles/memorize.css'
import './styles/quiz.css'
import './styles/practice.css'

const container = document.getElementById('root')
if (!container) throw new Error('Elemen #root tidak ditemukan')

createRoot(container).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
