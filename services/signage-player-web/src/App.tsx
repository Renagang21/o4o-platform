import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ChannelPlayerPage from './pages/ChannelPlayerPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Player routes */}
        <Route path="/player/channels/:channelId" element={<ChannelPlayerPage />} />
        <Route path="/player/channels/code/:code" element={<ChannelPlayerPage />} />

        {/* Default redirect to a placeholder */}
        <Route path="/" element={<DefaultPage />} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function DefaultPage() {
  return (
    <div className="empty-container">
      <svg
        className="empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 8l5 3-5 3V8z" />
      </svg>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Signage Player</h1>
      <p style={{ color: '#888' }}>
        Access a channel: /player/channels/:id or /player/channels/code/:code
      </p>
    </div>
  )
}

export default App
