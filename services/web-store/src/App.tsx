import type { ReactElement } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { StoreProvider } from './contexts/StoreContext';
import { TermsAcceptanceGate } from './components/TermsAcceptanceGate';
import { StoreGate } from './components/StoreGate';
import RootShell from './components/RootShell';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import HandoffPage from './pages/HandoffPage';
import StoreSelectorPage from './pages/StoreSelectorPage';
import MyServicesPage from './pages/MyServicesPage';
import PlaceholderPage from './pages/PlaceholderPage';
import { WORKSPACE_PATHS } from './config/workspace';

const gated = (el: ReactElement) => <StoreGate>{el}</StoreGate>;

export default function App() {
  return <BrowserRouter><AuthProvider><StoreProvider><TermsAcceptanceGate><Routes>
    <Route path={WORKSPACE_PATHS.handoff} element={<HandoffPage />} />
    <Route element={<RootShell />}>
      <Route path={WORKSPACE_PATHS.login} element={<LoginPage />} />
      <Route path={WORKSPACE_PATHS.select} element={gated(<StoreSelectorPage />)} />
      <Route path={WORKSPACE_PATHS.home} element={gated(<HomePage />)} />
      <Route path={WORKSPACE_PATHS.myServices} element={gated(<MyServicesPage />)} />
      <Route path={`${WORKSPACE_PATHS.myStore}/*`} element={gated(<PlaceholderPage title="내 매장" />)} />
      <Route path={`${WORKSPACE_PATHS.serviceWork}/*`} element={gated(<PlaceholderPage title="서비스 업무" />)} />
      <Route path={`${WORKSPACE_PATHS.storeHub}/*`} element={gated(<PlaceholderPage title="매장 HUB" />)} />
      <Route path={`${WORKSPACE_PATHS.settings}/*`} element={gated(<PlaceholderPage title="설정" />)} />
      <Route path="*" element={<main className="center-card"><section className="card"><h1>페이지를 찾을 수 없습니다</h1></section></main>} />
    </Route>
  </Routes></TermsAcceptanceGate></StoreProvider></AuthProvider></BrowserRouter>;
}
