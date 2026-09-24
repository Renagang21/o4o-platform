
import { useState, useEffect, FC } from 'react';
import { Menu, Bell, User, LogOut, Settings as SettingsIcon, Shield, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, buildAccountDisplayInfo } from '@o4o/auth-context';
import toast from 'react-hot-toast';
import { O4OHomeButton, O4O_LOGOUT_LABEL } from '@o4o/auth-react';
import { api } from '@/api/base';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

const AdminHeader: FC<AdminHeaderProps> = ({ onMenuClick }) => {
  const { user, logout, logoutAll, getSessionStatus } = useAuth();
  // WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1:
  //   표시 전용 값이다 — 인가는 AdminProtectedRoute/백엔드 guard 가 roles[] 로 한다.
  const accountDisplay = buildAccountDisplayInfo(user);
  // WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1: 계정 상태는 `/auth/me` 의 `status`(UserStatus) 로 표시한다.
  //   매핑에 없는 값은 지어내지 않고 원문을 보여준다 — 거짓 라벨보다 낫다.
  const accountStatus = ((): { label: string; tone: string } => {
    const status = (user as { status?: string } | null | undefined)?.status;
    switch (status) {
      case 'active':
      case 'approved':
        return { label: '정상', tone: 'text-green-600' };
      case 'pending':
        return { label: '승인대기', tone: 'text-yellow-600' };
      case 'suspended':
        return { label: '정지', tone: 'text-red-600' };
      case 'rejected':
        return { label: '거부', tone: 'text-red-600' };
      case 'inactive':
        return { label: '비활성', tone: 'text-o4o-text-tertiary' };
      default:
        return { label: status ?? '알 수 없음', tone: 'text-o4o-text-tertiary' };
    }
  })();
  const navigate = useNavigate();
  const [sessionStatus, setSessionStatus] = useState(getSessionStatus());

  // 세션 상태 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionStatus(getSessionStatus());
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, [getSessionStatus]);

  const handleLogout = async () => {
    try {
      logout();
      toast.success('로그아웃되었습니다.');
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('로그아웃 처리 중 오류가 발생했습니다.');
    }
  };

  /**
   * WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1
   * "모든 기기에서 로그아웃" 은 logout() 이 아니라 logoutAll() 을 호출해야 한다.
   */
  const handleLogoutAll = async () => {
    try {
      await logoutAll();
      toast.success('모든 기기에서 로그아웃되었습니다.');
    } catch (error: any) {
      toast.error('전체 로그아웃 처리 중 오류가 발생했습니다.');
    }
  };

  const getSessionStatusColor = () => {
    if (!sessionStatus) return 'text-o4o-text-secondary';
    
    const remainingMinutes = Math.floor(sessionStatus.remainingTime / 60000);
    if (remainingMinutes > 10) {
      return 'text-green-600';
    } else if (remainingMinutes > 5) {
      return 'text-yellow-600';
    } else {
      return 'text-red-600';
    }
  };

  const getSessionStatusText = () => {
    if (!sessionStatus) return 'Unknown';
    
    const remainingMinutes = Math.floor(sessionStatus.remainingTime / 60000);
    if (remainingMinutes > 10) {
      return 'Active';
    } else if (remainingMinutes > 5) {
      return 'Expiring Soon';
    } else {
      return 'Expired';
    }
  };


  return (
    <header className="bg-white border-b border-gray-300">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="admin-header-mobile-menu"
                aria-label="Toggle menu"
              >
                <Menu className="w-7 h-7" strokeWidth={2} />
              </button>
            )}
            
            <div>
              <h1 className="text-xl font-semibold text-o4o-text-primary">
                관리자 대시보드
              </h1>
              <p className="text-sm text-o4o-text-secondary">
                O4O 플랫폼 통합 관리 시스템
              </p>
            </div>
          </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1: O4O 홈(로그인 유지 · 권한 확대 없음) */}
          <O4OHomeButton
            api={api}
            isAuthenticated={!!user}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-200 text-o4o-text-secondary hover:text-o4o-text-primary hover:bg-o4o-bg-tertiary disabled:opacity-60"
          />
          {/* Session Status Indicator */}
          <div className={`flex items-center gap-1 text-xs ${getSessionStatusColor()}`}>
            <Clock className="w-3 h-3" />
            <span>세션: {getSessionStatusText()}</span>
          </div>

          {/* Notifications */}
          <button className="p-2 rounded-md text-o4o-text-secondary hover:text-o4o-text-primary hover:bg-o4o-bg-tertiary relative">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <button className="flex items-center gap-3 p-2 rounded-md text-o4o-text-primary hover:bg-o4o-bg-tertiary">
                <div className="w-8 h-8 bg-admin-blue text-white rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-sm font-medium flex items-center gap-1">
                    {user?.name || 'Admin'}
                    <Shield className="w-3 h-3 text-blue-600" />
                  </div>
                  <div className="text-xs text-o4o-text-secondary">{user?.email}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-64" align="end">
              {/* User Info Header */}
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <div className="font-medium text-o4o-text-primary flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    {user?.name || 'Admin'}
                  </div>
                  {/* WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1 §8 · §9
                      전: `{user?.email}` + `역할: {user?.role} | SSO 인증`
                        - email 이 **로그인 계정**처럼 읽혔다. 로그인은 Google `sub` 로 하고
                          `users.email` 은 프로필/연락 값이다(인증 키 아님).
                        - `user.role` 은 backend `roles[0]` 이라 **어느 role 이 담길지 보장되지 않았다**
                          (super_admin 보유자에게 `kpa-branch:operator` 가 찍힌 사례).
                      후: 로그인 수단 / 관리 권한 / 프로필 이메일을 label 과 함께 분리한다.
                      판정은 보유 여부이며 배열 순서에 의존하지 않는다(resolveAdminRoleLabel). */}
                  <dl className="text-xs text-o4o-text-tertiary space-y-0.5 m-0">
                    <div className="flex gap-1">
                      <dt className="text-o4o-text-secondary">로그인 수단</dt>
                      <dd className="m-0">{accountDisplay.loginMethod}</dd>
                    </div>
                    {accountDisplay.adminRole && (
                      <div className="flex gap-1">
                        <dt className="text-o4o-text-secondary">관리 권한</dt>
                        <dd className="m-0">{accountDisplay.adminRole}</dd>
                      </div>
                    )}
                    {accountDisplay.profileEmail && (
                      <div className="flex gap-1">
                        <dt className="text-o4o-text-secondary">프로필 이메일</dt>
                        <dd className="m-0 truncate">{accountDisplay.profileEmail}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Security Status */}
              <div className="px-2 py-2">
                <div className="text-xs text-o4o-text-secondary space-y-1">
                  <div className="flex justify-between">
                    <span>세션 상태:</span>
                    <span className={getSessionStatusColor()}>
                      {getSessionStatusText()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>권한:</span>
                    <span className="text-green-600">활성</span>
                  </div>
                  {/* WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1:
                      전: `user?.isApproved` — **백엔드에 없는 필드**라 항상 undefined 였고,
                      그래서 누가 로그인하든 노란색 "승인대기" 로 보였다(운영 관리자는 status=active).
                      후: `/auth/me` 가 실제로 내려주는 `status` 를 쓴다. 알 수 없는 값이면
                      지어내지 않고 원문을 그대로 보여준다. */}
                  <div className="flex justify-between">
                    <span>계정:</span>
                    <span className={accountStatus.tone}>{accountStatus.label}</span>
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Menu Items */}
              <DropdownMenuItem onClick={() => {
                // 프로필 페이지로 이동
              }}>
                <User className="mr-2 h-4 w-4" />
                프로필 설정
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => {
                // WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1: 내 계정(Google 연결) 탭으로 이동
                navigate('/settings/my-account');
              }}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                계정 설정
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              
              {/* Security Section */}
              <DropdownMenuLabel className="font-normal">
                <div className="text-xs text-o4o-text-secondary">보안</div>
              </DropdownMenuLabel>
              
              <DropdownMenuItem 
                onClick={handleLogoutAll}
                className="text-orange-600 focus:text-orange-600 focus:bg-orange-50"
              >
                <Shield className="mr-2 h-3 w-3" />
                모든 기기에서 로그아웃
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {/* 서버 logout 은 사용자 refresh family 전체 폐기 = O4O 계정 전체 종료 */}
                {O4O_LOGOUT_LABEL}
              </DropdownMenuItem>

              {/* Footer */}
              <DropdownMenuSeparator />
              <div className="px-2 py-2">
                <div className="text-xs text-o4o-text-tertiary text-center">
                  🔒 보안 세션 | 8시간 후 자동 만료
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      </div>
    </header>
  );
};

export default AdminHeader;