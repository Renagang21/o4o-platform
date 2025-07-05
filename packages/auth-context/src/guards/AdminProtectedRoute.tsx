import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { UserRole } from '@o4o/auth-client';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requiredPermissions?: string[];
  fallbackPath?: string;
  showContactAdmin?: boolean;
}

interface AccessDeniedPageProps {
  reason: 'insufficient_role' | 'missing_permissions' | 'account_not_approved' | 'account_locked';
  message: string;
  requiredRoles?: UserRole[];
  currentRole?: UserRole;
  requiredPermissions?: string[];
  currentPermissions?: string[];
  showContactAdmin?: boolean;
  lockReason?: string;
}

const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  reason,
  message,
  requiredRoles,
  currentRole,
  requiredPermissions,
  currentPermissions,
  showContactAdmin = false,
  lockReason
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
      <div className="text-red-500 text-4xl mb-4">🚫</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">접근 권한 없음</h2>
      <p className="text-gray-600 mb-4">{message}</p>
      
      {/* 상세 정보 표시 */}
      {reason === 'insufficient_role' && requiredRoles && currentRole && (
        <div className="text-sm text-gray-500 mb-4 p-3 bg-gray-50 rounded">
          <div>현재 역할: <span className="font-medium text-red-600">{currentRole}</span></div>
          <div>필요 역할: <span className="font-medium text-green-600">{requiredRoles.join(', ')}</span></div>
        </div>
      )}
      
      {reason === 'missing_permissions' && requiredPermissions && currentPermissions && (
        <div className="text-sm text-gray-500 mb-4 p-3 bg-gray-50 rounded">
          <div className="mb-2">
            <strong>필요 권한:</strong>
            <div className="mt-1">
              {requiredPermissions.map(perm => (
                <span key={perm} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                  {perm}
                </span>
              ))}
            </div>
          </div>
          <div>
            <strong>현재 권한:</strong>
            <div className="mt-1">
              {currentPermissions.length > 0 ? (
                currentPermissions.map(perm => (
                  <span key={perm} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                    {perm}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-xs">권한 없음</span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {reason === 'account_locked' && lockReason && (
        <div className="text-sm text-gray-500 mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
          <div><strong>잠금 사유:</strong> {lockReason}</div>
          <div className="mt-1 text-xs">계정 잠금 해제는 관리자에게 문의하세요.</div>
        </div>
      )}
      
      <div className="flex flex-col gap-2">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          이전 페이지로
        </button>
        
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          홈으로
        </button>
        
        {showContactAdmin && (
          <button
            onClick={() => window.location.href = 'mailto:admin@neture.co.kr?subject=접근권한 문의'}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            관리자에게 문의
          </button>
        )}
      </div>
    </div>
  </div>
);

const PendingApprovalPage: React.FC<{ message: string; estimatedTime?: string }> = ({
  message,
  estimatedTime
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
      <div className="text-yellow-500 text-4xl mb-4">⏳</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">계정 승인 대기중</h2>
      <p className="text-gray-600 mb-4">{message}</p>
      
      {estimatedTime && (
        <div className="text-sm text-gray-500 mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
          <div><strong>예상 승인 시간:</strong> {estimatedTime}</div>
        </div>
      )}
      
      <div className="flex flex-col gap-2">
        <button
          onClick={() => window.location.href = '/login'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          로그인 페이지로 돌아가기
        </button>
        
        <button
          onClick={() => window.location.href = 'mailto:admin@neture.co.kr?subject=계정 승인 요청'}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          승인 요청 문의
        </button>
      </div>
    </div>
  </div>
);

const AdminLoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div className="text-gray-600">🔐 관리자 인증 확인 중...</div>
    </div>
  </div>
);

/**
 * 강화된 관리자 전용 보호 라우트
 * 다층 보안 검증 체계 적용
 */
export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({
  children,
  requiredRoles = ['admin'],
  requiredPermissions = [],
  fallbackPath: _fallbackPath = '/login',
  showContactAdmin = true
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1단계: 로딩 중
  if (isLoading) {
    return <AdminLoadingScreen />;
  }

  // 2단계: 미인증
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location,
          reason: 'authentication_required',
          returnUrl: location.pathname
        }} 
        replace 
      />
    );
  }

  // 3단계: 계정 승인 상태 확인
  if (!user.isApproved) {
    return (
      <PendingApprovalPage 
        message="관리자 계정 승인 대기 중입니다."
        estimatedTime="24시간 이내"
      />
    );
  }

  // 4단계: 계정 잠금 상태 확인
  if (user.isLocked) {
    return (
      <AccessDeniedPage 
        reason="account_locked"
        message="계정이 잠겨있습니다."
        lockReason={user.lockReason}
        showContactAdmin={showContactAdmin}
      />
    );
  }

  // 5단계: 역할 기반 접근 제어
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <AccessDeniedPage 
        reason="insufficient_role"
        message="관리자 권한이 필요합니다."
        requiredRoles={requiredRoles}
        currentRole={user.role}
        showContactAdmin={showContactAdmin}
      />
    );
  }

  // 6단계: 권한 기반 접근 제어
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(
      permission => user.permissions?.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return (
        <AccessDeniedPage 
          reason="missing_permissions"
          message="이 기능에 접근할 권한이 없습니다."
          requiredPermissions={requiredPermissions}
          currentPermissions={user.permissions}
          showContactAdmin={showContactAdmin}
        />
      );
    }
  }

  // 모든 검사 통과 - 컴포넌트 렌더링
  return (
    <div>
      {/* 개발 환경에서 보안 상태 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 right-0 z-50 p-2 bg-black bg-opacity-75 text-white text-xs rounded-bl">
          <div>👤 User: {user.name || user.email}</div>
          <div>🔑 Role: {user.role}</div>
          <div>🛡️ Auth: SSO Admin</div>
          <div>✅ Active: {user.isApproved ? '승인됨' : '미승인'}</div>
          <div>🔒 Locked: {user.isLocked ? '잠김' : '정상'}</div>
          {user.permissions.length > 0 && (
            <div>🎫 Perms: {user.permissions.slice(0, 3).join(', ')}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default AdminProtectedRoute;