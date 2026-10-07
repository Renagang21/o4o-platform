import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { legacyBranchRedirectUrl } from './lib/canonicalHost'
import './index.css'

// WO-O4O-KPA-BRANCH-SERVICE-CATALOG-AND-HANDOFF-ALIGNMENT-V1:
//   옛 공용 경로(kpa-society.co.kr/kpa/*)는 그리기 전에 canonical 호스트로 옮긴다 — 세션 귀속 근거는 lib/canonicalHost.
const legacyRedirect = legacyBranchRedirectUrl(
  window.location.hostname,
  window.location.pathname,
  window.location.search,
  window.location.hash,
)

if (legacyRedirect) {
  window.location.replace(legacyRedirect)
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
