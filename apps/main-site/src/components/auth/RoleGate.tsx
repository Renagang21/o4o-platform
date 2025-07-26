import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

interface RoleGateProps {
  allowedRoles: string[];
  children: ReactNode;
  userRole?: string;
  isApproved?: boolean;
}

const RoleGate: FC<RoleGateProps> = ({
  allowedRoles,
  children,
  userRole = 'user',
  isApproved = true
}) => {
  const navigate = useNavigate();

  const hasAccess = allowedRoles.includes(userRole);
  const needsApproval = ['seller', 'supplier', 'yaksa'].includes(userRole);

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-danger">
            <AlertCircle className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-extrabold text-text-main">
            접근 권한이 없습니다
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            이 페이지에 접근할 수 있는 권한이 없습니다.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-3 sm:py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary min-h-[48px]"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (needsApproval && !isApproved) {
    navigate('/pending', {
      state: {
        role: userRole,
        message: '승인이 완료되지 않았습니다. 승인 완료 시 알려드리겠습니다.'
      }
    });
    return null;
  }

  return <>{children}</>;
};

export default RoleGate; 