import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TermsAcceptanceGate } from './components/TermsAcceptanceGate';
import SiteShell from './components/SiteShell';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import HandoffPage from './pages/HandoffPage';
import RoleBoundaryPage from './pages/RoleBoundaryPage';
import { TermsPage, PrivacyPage } from './pages/legal/PolicyDocumentPage';

export default function App() {
  return <BrowserRouter><AuthProvider><TermsAcceptanceGate><Routes>
    <Route path="/handoff" element={<HandoffPage />} />
    <Route element={<SiteShell />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/instructor" element={<RoleBoundaryPage area="instructor" />} />
      <Route path="/operator" element={<RoleBoundaryPage area="operator" />} />
      <Route path="*" element={<main className="center-card"><section className="card"><h1>페이지를 찾을 수 없습니다</h1></section></main>} />
    </Route>
  </Routes></TermsAcceptanceGate></AuthProvider></BrowserRouter>;
}
