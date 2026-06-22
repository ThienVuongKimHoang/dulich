import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './responsive.css'
import TravelPage from './pages/travel'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TravelPage />
  </StrictMode>,
)
