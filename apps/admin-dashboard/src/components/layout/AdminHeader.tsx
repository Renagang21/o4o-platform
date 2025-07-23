
import { useState, useEffect, FC } from 'react';
import { Menu, Bell, User, LogOut, Settings as SettingsIcon, Shield, Clock, Home, Plus, Eye } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

const AdminHeader: FC<AdminHeaderProps> = ({ onMenuClick }) => {
  const { user, logout, getSessionStatus } = useAuth();
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
      console.error('Logout failed:', error);
      toast.error('로그아웃 처리 중 오류가 발생했습니다.');
    }
  };

  const getSessionStatusColor = () => {
    if (!sessionStatus) return 'text-wp-text-secondary';
    
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
    <header className="bg-[#23282d] text-white">
      {/* WordPress 스타일 상단바 */}
      <div className="h-8 bg-[#1d2327] flex items-center px-4 text-xs">
        <div className="flex items-center gap-4 flex-1">
          <Link to="/" className="flex items-center gap-1 hover:text-[#00b9eb]">
            <Home className="w-3 h-3" />
            <span>O4O Platform</span>
          </Link>
          <span className="text-[#a7aaad]">|</span>
          <a href="https://neture.co.kr" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#00b9eb]">
            <Eye className="w-3 h-3" />
            <span>사이트 방문</span>
          </a>
          <span className="text-[#a7aaad]">|</span>
          <Link to="/content/posts/new" className="flex items-center gap-1 hover:text-[#00b9eb]">
            <Plus className="w-3 h-3" />
            <span>새로 만들기</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#a7aaad]">안녕하세요, {user?.name || 'Admin'}님</span>
          <button onClick={handleLogout} className="hover:text-[#00b9eb]">
            로그아웃
          </button>
        </div>
      </div>

      {/* 메인 헤더 */}
      <div className="bg-white border-b border-wp-border-secondary px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-wp-text-secondary hover:text-wp-text-primary hover:bg-wp-bg-tertiary"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div>
              <h1 className="text-xl font-semibold text-wp-text-primary">
                관리자 대시보드
              </h1>
              <p className="text-sm text-wp-text-secondary">
                O4O 플랫폼 통합 관리 시스템
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
          <button className="p-2 rounded-md text-wp-text-secondary hover:text-wp-text-primary hover:bg-wp-bg-tertiary relative">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 p-2 rounded-md text-wp-text-primary hover:bg-wp-bg-tertiary">
                <div className="w-8 h-8 bg-admin-blue text-white rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-sm font-medium flex items-center gap-1">
                    {user?.name || 'Admin'}
                    <Shield className="w-3 h-3 text-blue-600" />
                  </div>
                  <div className="text-xs text-wp-text-secondary">{user?.email}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-64" align="end" forceMount>
              {/* User Info Header */}
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <div className="font-medium text-wp-text-primary flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    {user?.name || 'Admin'}
                  </div>
                  <div className="text-sm text-wp-text-secondary">{user?.email}</div>
                  <div className="text-xs text-wp-text-tertiary">
                    역할: {user?.role} | SSO 인증
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Security Status */}
              <div className="px-2 py-2">
                <div className="text-xs text-wp-text-secondary space-y-1">
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

              <DropdownMenuSeparator />

              {/* Menu Items */}
              <DropdownMenuItem onClick={() => {
                // 프로필 페이지로 이동
              }}>
                <User className="mr-2 h-4 w-4" />
                프로필 설정
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => {
                // 계정 설정 페이지로 이동
              }}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                계정 설정
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              
              {/* Security Section */}
              <DropdownMenuLabel className="font-normal">
                <div className="text-xs text-wp-text-secondary">보안</div>
              </DropdownMenuLabel>
              
              <DropdownMenuItem 
                onClick={() => {
                  toast.success('모든 기기에서 로그아웃됩니다.');
                  logout();
                }}
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
                로그아웃
              </DropdownMenuItem>

              {/* Footer */}
              <DropdownMenuSeparator />
              <div className="px-2 py-2">
                <div className="text-xs text-wp-text-tertiary text-center">
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