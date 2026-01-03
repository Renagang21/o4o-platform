import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components';
import { AuthProvider } from './contexts';
import {
  HomePage,
  OrganizationsPage,
  OrganizationDetailPage,
  MemberApplyPage,
  MyApplicationsPage,
  AboutPage,
  NoticesPage,
  ResourcesPage,
  EventsPage,
} from './pages';

/**
 * KPA Society - 약사회 서비스
 * Phase H8-4: Core Auth v2 Integration
 */

const SERVICE_NAME = 'KPA Society';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout serviceName={SERVICE_NAME}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
            <Route path="/member/apply" element={<MemberApplyPage />} />
            <Route path="/applications" element={<MyApplicationsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/notices" element={<NoticesPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/events" element={<EventsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
