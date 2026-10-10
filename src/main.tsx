import { createRoot } from 'react-dom/client'
import App from './app/App'
import './styles/globals.css'
import './styles/calendar.css'

// FullCalendar 7.1.1 在 StrictMode 的开发期重复挂载中会丢失月/年行高观察器，导致日期点击失效。
createRoot(document.getElementById('root')!).render(<App />)
