import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../services/ecommerce/web/src/store/authStore';

interface YaksaProtectedRouteProps {
  children: React.ReactNode;
}

const AccessDenied: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8 w-full max-w-md mx-auto text-center">
      <div className="text-2xl font-bold text-red-600 mb-4">접근 제한</div>
      <div className="text-base text-gray-700 dark:text-gray-200 mb-2">{message}</div>
      <div className="text-sm text-gray-500">3초 후 홈으로 이동합니다.</div>
    </div>
  </div>
);

const YaksaProtectedRoute: React.FC<YaksaProtectedRouteProps> = ({ children }) => {
  const user = useAuthStore(state => state.user);
  const yaksaStatus = user?.yaksaStatus;
  const role = user?.role;
  const navigate = useNavigate();

  const denied = !user || role !== 'yaksa' || yaksaStatus !== 'approved';

  useEffect(() => {
    if (denied) {
      const timer = setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [denied, navigate]);

  if (denied) {
    let message = '약사 인증이 필요합니다.';
    if (role === 'yaksa' && yaksaStatus === 'pending') {
      message = '약사 회원 승인 대기 중입니다. 관리자 승인 후 이용 가능합니다.';
    }
    return <AccessDenied message={message} />;
  }
  return <>{children}</>;
};

export default YaksaProtectedRoute; 