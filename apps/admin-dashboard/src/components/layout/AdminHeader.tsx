
import { useState, useEffect, FC } from 'react';
import { Menu, Bell, User, LogOut, Settings as SettingsIcon, Shield, Clock } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import toast from 'react-hot-toast';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

const AdminHeader: FC<AdminHeaderProps> = ({ onMenuClick }) => {
  const { user, logout, getSessionStatus } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
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
      await logout({ reason: 'user_initiated' });
      toast.success('로그아웃되었습니다.');
      setShowUserMenu(false);
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('로그아웃 처리 중 오류가 발생했습니다.');
    }
  };

  const getSessionStatusColor = () => {
    switch (sessionStatus.status) {
      case 'active':
        return 'text-green-600';
      case 'expiring_soon':
        return 'text-yellow-600';
      case 'expired':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSessionStatusText = () => {
    switch (sessionStatus.status) {
      case 'active':
        return '활성';
      case 'expiring_soon':
        return `${Math.floor((sessionStatus.remainingSeconds || 0) / 60)}분 남음`;
      case 'expired':
        return '만료됨';
      default:
        return '알 수 없음';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              관리자 대시보드
            </h1>
            <p className="text-sm text-gray-500">
              O4O 플랫폼 통합 관리 시스템 (SSO)
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Session Status Indicator */}
          <div className={`flex items-center gap-1 text-xs ${getSessionStatusColor()}`}>
            <Clock className="w-3 h-3" />
            <span>세션: {getSessionStatusText()}</span>
          </div>

          {/* Notifications */}
          <button className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              <div className="w-8 h-8 bg-admin-blue text-white rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium flex items-center gap-1">
                  {user?.name || 'Admin'}
                  <Shield className="w-3 h-3 text-blue-600" />
                </div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    {user?.name || 'Admin'}
                  </div>
                  <div className="text-sm text-gray-500">{user?.email}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    역할: {user?.role} | SSO 인증
                  </div>
                </div>

                {/* Security Status */}
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="text-xs text-gray-600 space-y-1">
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
                    <div className="flex justify-between">
                      <span>계정:</span>
                      <span className={user?.isApproved ? 'text-green-600' : 'text-yellow-600'}>
                        {user?.isApproved ? '승인됨' : '승인대기'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      // 프로필 페이지로 이동
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="w-4 h-4" />
                    프로필 설정
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      // 계정 설정 페이지로 이동
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    계정 설정
                  </button>

                  {/* Security Section */}
                  <hr className="my-1" />
                  
                  <div className="px-4 py-2">
                    <div className="text-xs text-gray-500 mb-2">보안</div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        toast.success('모든 기기에서 로그아웃됩니다.');
                        logout({ everywhere: true });
                      }}
                      className="flex items-center gap-2 w-full px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded"
                    >
                      <Shield className="w-3 h-3" />
                      모든 기기에서 로그아웃
                    </button>
                  </div>

                  <hr className="my-1" />
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                  <div className="text-xs text-gray-400 text-center">
                    🔒 보안 세션 | 8시간 후 자동 만료
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;