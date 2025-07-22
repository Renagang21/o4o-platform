import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@o4o/auth-context';
import Layout from './components/Layout';
import EnhancedSignageDashboard from './pages/EnhancedSignageDashboard';
import ContentManager from './pages/content/ContentManager';
import ScheduleManager from './pages/schedule/ScheduleManager';
import StoreManager from './pages/store/StoreManager';
import DisplayView from './pages/display/DisplayView';

function App() {
  const { isAuthenticated, user } = useAuth();

  // Public display route doesn't require authentication
  if (window.location.pathname.startsWith('/display/')) {
    return (
      <Routes>
        <Route path="/display/:storeId" element={<DisplayView />} />
      </Routes>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  // Check if user has permission to access digital signage
  const allowedRoles = ['admin', 'manager', 'store_manager'];
  if (!user || !allowedRoles.includes(user.role)) {
    return <div className="p-8 text-center">You don't have permission to access this application.</div>;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<EnhancedSignageDashboard />} />
        <Route path="/signage/dashboard" element={<EnhancedSignageDashboard />} />
        <Route path="/content/*" element={<ContentManager />} />
        <Route path="/schedule/*" element={<ScheduleManager />} />
        <Route path="/stores/*" element={<StoreManager />} />
      </Routes>
    </Layout>
  );
}

export default App;