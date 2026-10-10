import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ServiceApplyPanel } from '../components/auth/ServiceApplyPanel';

/** Actual application/status entry; the retired introduction stays out of the service root. */
export default function SupplierServiceEntry() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <p role="status" className="p-6">로그인 상태를 확인하고 있습니다…</p>;
  if (!isAuthenticated) return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <section className="mx-auto max-w-4xl px-4 py-8"><h1 className="mb-6 text-2xl font-semibold">공급자 신청 · 이용 상태</h1><ServiceApplyPanel service="supplier" /></section>;
}
