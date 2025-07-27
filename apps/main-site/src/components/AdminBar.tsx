import { useState, FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Settings, Plus, Edit3, MessageCircle, BarChart3, 
  ChevronDown, User, LogOut, Monitor, Home, 
  Package, Users, DollarSign
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AdminBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdowns, setDropdowns] = useState<{[key: string]: boolean}>({});

  // 관리자 권한이 있는 사용자에게만 표시
  const hasAdminAccess = user && ['admin', 'administrator', 'manager', 'seller', 'supplier', 'partner'].includes(user.role);
  
  if (!hasAdminAccess) return null;

  const toggleDropdown = (key: string) => {
    setDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white text-sm shadow-lg">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-8">
          {/* 왼쪽: 사이트 정보 */}
          <div className="flex items-center space-x-4">
            <Link 
              to="/" 
              className="flex items-center space-x-2 hover:bg-gray-800 px-2 py-1 rounded transition-colors"
            >
              <span className="text-lg">🌿</span>
              <span className="font-medium">Neture</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-1">
              <span className="text-gray-400">|</span>
              <span className="text-gray-300 text-xs">v1.0</span>
            </div>
          </div>

          {/* 가운데: 빠른 액션들 */}
          <div className="hidden lg:flex items-center space-x-1">
            {/* 새로 추가 */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('new')}
                className="flex items-center space-x-1 hover:bg-gray-800 px-3 py-1 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>새로 추가</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {dropdowns.new && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white text-gray-900 rounded-md shadow-lg border z-50">
                  <Link to="/dropshipping/products/new" className="block px-4 py-2 hover:bg-gray-50 border-b">
                    📦 새 상품
                  </Link>
                  <Link to="/forum/write" className="block px-4 py-2 hover:bg-gray-50 border-b">
                    💬 새 포럼 글
                  </Link>
                  <Link to="/signage/content/upload" className="block px-4 py-2 hover:bg-gray-50 border-b">
                    📺 새 사이니지 콘텐츠
                  </Link>
                  <Link to="/admin/content" className="block px-4 py-2 hover:bg-gray-50">
                    📄 새 페이지
                  </Link>
                </div>
              )}
            </div>

            {/* 편집 */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('edit')}
                className="flex items-center space-x-1 hover:bg-gray-800 px-3 py-1 rounded transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>편집</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {dropdowns.edit && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white text-gray-900 rounded-md shadow-lg border z-50">
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('togglePageEdit'))}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 border-b"
                  >
                    ✏️ 현재 페이지 편집
                  </button>
                  <Link to="/admin/pages" className="block px-4 py-2 hover:bg-gray-50 border-b">
                    📝 페이지 관리
                  </Link>
                  <Link to="/admin/content" className="block px-4 py-2 hover:bg-gray-50">
                    🎨 콘텐츠 관리
                  </Link>
                </div>
              )}
            </div>

            {/* 대시보드 */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('dashboard')}
                className="flex items-center space-x-1 hover:bg-gray-800 px-3 py-1 rounded transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span>대시보드</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {dropdowns.dashboard && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white text-gray-900 rounded-md shadow-lg border z-50">
                  <Link to="/admin" className="block px-4 py-2 hover:bg-gray-50 border-b">
                    🏠 메인 대시보드
                  </Link>
                  <Link to="/dropshipping/dashboard" className="block px-4 py-2 hover:bg-gray-50 border-b">
                    🛍️ 드랍쉬핑 대시보드
                  </Link>
                  <Link to="/signage/dashboard" className="block px-4 py-2 hover:bg-gray-50 border-b">
                    📺 사이니지 대시보드
                  </Link>
                  <Link to="/forum/dashboard" className="block px-4 py-2 hover:bg-gray-50">
                    💬 포럼 대시보드
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 사용자 정보 */}
          <div className="flex items-center space-x-2">
            {/* 사용자 메뉴 */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('user')}
                className="flex items-center space-x-2 hover:bg-gray-800 px-3 py-1 rounded transition-colors"
              >
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <span className="hidden sm:block">{user?.name}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {dropdowns.user && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-white text-gray-900 rounded-md shadow-lg border z-50">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <div className="font-medium">{user?.name}</div>
                    <div className="text-sm text-gray-500">{user?.email}</div>
                    <div className="text-xs text-blue-600 font-medium mt-1">
                      {user?.role === 'admin' ? '👑 관리자' :
                       user?.role === 'seller' ? '🛍️ 판매자' :
                       user?.role === 'supplier' ? '📦 공급자' :
                       user?.role === 'partner' ? '🤝 파트너' : '👤 사용자'}
                    </div>
                  </div>
                  
                  <Link to="/dropshipping/mypage" className="block px-4 py-2 hover:bg-gray-50 border-b">
                    <User className="w-4 h-4 inline mr-2" />
                    내 프로필
                  </Link>
                  
                  {(user?.role === 'admin' || user?.role === 'administrator') && (
                    <Link to="/admin" className="block px-4 py-2 hover:bg-gray-50 border-b">
                      <Settings className="w-4 h-4 inline mr-2" />
                      관리자 영역
                    </Link>
                  )}
                  
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600"
                  >
                    <LogOut className="w-4 h-4 inline mr-2" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 드롭다운 닫기용 오버레이 */}
      {Object.values(dropdowns).some(Boolean) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setDropdowns({})}
        />
      )}
    </div>
  );
};

export default AdminBar;