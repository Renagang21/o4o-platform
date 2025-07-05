import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, Home, LogOut } from 'lucide-react';

interface PendingApprovalNoticeProps {
  role?: string;
  message?: string;
}

const PendingApprovalNotice: React.FC<PendingApprovalNoticeProps> = ({
  role,
  message
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { role?: string; message?: string };

  const roleName = role || state?.role || '판매자';
  const noticeMessage = message || state?.message || '승인 대기 중입니다. 승인 완료 시 알려드리겠습니다.';

  const handleLogout = () => {
    // 로그아웃 로직 구현
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-text-main">
            승인 대기 중
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {roleName} 권한 승인을 기다리고 있습니다
          </p>
          <p className="mt-4 text-sm sm:text-base text-text-main">
            {noticeMessage}
          </p>
        </div>

        <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center px-4 py-3 sm:py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary min-h-[48px]"
          >
            <Home className="h-5 w-5 mr-2" />
            홈으로 이동
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 sm:py-2 border border-gray-300 text-sm font-medium rounded-lg text-text-main bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary min-h-[48px]"
          >
            <LogOut className="h-5 w-5 mr-2" />
            로그아웃
          </button>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-text-secondary">
                문의사항이 있으신가요?
              </span>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a
              href="mailto:support@o4o.com"
              className="text-sm font-medium text-primary hover:text-primary-dark inline-block min-h-[48px] leading-[48px]"
            >
              고객센터 문의하기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalNotice; 