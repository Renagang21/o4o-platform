import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SignagePlayerPage from './pages/SignagePlayerPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Sprint 2-4: Production Signage Player Routes */}
        <Route path="/signage/:serviceKey/channel/:channelId" element={<SignagePlayerPage />} />
        <Route path="/signage/:serviceKey/channel/code/:code" element={<SignagePlayerPage />} />

        {/* [RETIRED] /player/channels/* (CMS Channel 축) — WO-O4O-SIGNAGE-CHANNEL-STACK-RETIREMENT-AND-TABLET-SCREENSET-CANONICALIZATION-V1
            프로덕션 channels 0행. canonical 재생 경로는 Tablet ScreenSet 축이다. */}

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
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Signage Player v2.0</h1>
      <p style={{ color: '#888', marginBottom: '1rem' }}>
        Production: /signage/:serviceKey/channel/:id
      </p>
      <p style={{ color: '#666', fontSize: '0.875rem' }}>
        Legacy: /player/channels/:id
      </p>
    </div>
  )
}

export default App
