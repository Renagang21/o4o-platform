import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components';
import {
  HomePage,
  OrganizationsPage,
  OrganizationDetailPage,
  MemberApplyPage,
  MyApplicationsPage,
} from './pages';

/**
 * KPA Society - 약사회 서비스
 * Phase 2-E: Home 페이지 + API 연동
 */

const SERVICE_NAME = 'KPA Society';

function App() {
  return (
    <BrowserRouter>
      <Layout serviceName={SERVICE_NAME}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/organizations" element={<OrganizationsPage />} />
          <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
          <Route path="/member/apply" element={<MemberApplyPage />} />
          <Route path="/applications" element={<MyApplicationsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
