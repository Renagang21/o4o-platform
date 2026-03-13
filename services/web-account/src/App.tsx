/**
 * Account Center App
 * WO-O4O-ACCOUNT-CENTER-UI-V1
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AccountLayout from './components/AccountLayout';
import DashboardPage from './pages/DashboardPage';
import HandoffPage from './pages/HandoffPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/handoff" element={<HandoffPage />} />
          <Route element={<AccountLayout />}>
            <Route path="/" element={<DashboardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
