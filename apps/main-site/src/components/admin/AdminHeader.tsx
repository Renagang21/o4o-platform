import { useState, useEffect, useRef, FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Settings,
  User,
  LogOut,
  Search,
  Plus
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const AdminHeader: FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
    }
  };

  const mockNotifications = [
    { id: 1, title: '새로운 주문이 접수되었습니다', time: '5분 전', type: 'order' },
    { id: 2, title: '사용자 승인 대기중', time: '1시간 전', type: 'user' },
    { id: 3, title: '시스템 업데이트 완료', time: '2시간 전', type: 'system' },
  ];

  return (
    <header className="h-16 bg-white shadow-sm border-b border-gray-200 fixed top-0 left-64 right-0 z-40">
      <div className="h-full flex items-center justify-between px-6">
        
        {/* 좌측: 빠른 액션 */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/gutenberg/new')}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>새 페이지</span>
          </button>
          
          {/* 검색 */}
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="페이지, 포스트, 사용자 검색..."
              className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 우측: 알림, 프로필 */}
        <div className="flex items-center space-x-4">
          
          {/* 알림 */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Bell className="h-6 w-6" />
              {mockNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                  {mockNotifications.length}
                </span>
              )}
            </button>

            {/* 알림 드롭다운 */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">알림</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {mockNotifications.map((notification) => (
                    <div key={notification.id} className="p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{notification.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                        <span className={`h-2 w-2 rounded-full mt-2 ${
                          notification.type === 'order' ? 'bg-green-500' :
                          notification.type === 'user' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-gray-200">
                  <Link to="/admin/notifications" className="text-sm text-blue-600 hover:text-blue-700">
                    모든 알림 보기
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* 프로필 드롭다운 */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {user?.name || '관리자'}
                </div>
                <div className="text-xs text-gray-500">
                  {user?.email || 'admin@example.com'}
                </div>
              </div>
            </button>

            {/* 프로필 드롭다운 메뉴 */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="py-1">
                  <Link
                    to="/admin/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="mr-3 h-4 w-4" />
                    프로필 설정
                  </Link>
                  <Link
                    to="/admin/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="mr-3 h-4 w-4" />
                    계정 설정
                  </Link>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    로그아웃
                  </button>
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