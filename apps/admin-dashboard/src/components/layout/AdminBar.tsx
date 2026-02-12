import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Plus, MessageSquare, RefreshCw } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
// ThemeToggle removed - not needed in admin bar

interface AdminBarProps {
  onLogout: () => void;
}

const AdminBar: FC<AdminBarProps> = ({ onLogout }) => {
  const { user } = useAuth();

  return (
    <div className="o4o-admin-bar fixed top-0 left-0 right-0 h-[46px] text-[13px] z-[99999] bg-[#23282d] text-[#ccc]">
      <div className="h-full flex items-center justify-between px-4">
        {/* Left side */}
        <div className="flex items-center gap-4 flex-1">
          {/* WordPress Logo */}
          <Link to="/" className="flex items-center gap-1 hover:text-[#00b9eb]">
            <div className="w-5 h-5 bg-[#464b52] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
            <span>O4O Platform</span>
          </Link>
          
          {/* Quick Links */}
          <span className="text-[#656a70]">|</span>
          
          <a href="https://neture.co.kr" target="_blank" rel="noopener noreferrer" 
             className="flex items-center gap-1 hover:text-[#00b9eb]">
            <Eye className="w-3 h-3" />
            <span>사이트 방문</span>
          </a>
          
          <span className="text-[#656a70]">|</span>
          
          <div className="relative group">
            <button className="flex items-center gap-1 hover:text-[#00b9eb]">
              <Plus className="w-3 h-3" />
              <span>새로 만들기</span>
            </button>
            
            {/* Dropdown menu */}
            <div className="absolute top-full left-0 mt-1 w-48 bg-[#32373c] border border-[#444] opacity-0 invisible 
                          group-hover:opacity-100 group-hover:visible transition-opacity shadow-lg z-[100000]">
              <Link to="/posts/new" className="block px-4 py-2 hover:bg-[#00b9eb] hover:text-white">
                글
              </Link>
              <Link to="/media/new" className="block px-4 py-2 hover:bg-[#00b9eb] hover:text-white">
                미디어
              </Link>
              <Link to="/pages/new" className="block px-4 py-2 hover:bg-[#00b9eb] hover:text-white">
                페이지
              </Link>
              <Link to="/ecommerce/products/new" className="block px-4 py-2 hover:bg-[#00b9eb] hover:text-white">
                제품
              </Link>
              <Link to="/users/new" className="block px-4 py-2 hover:bg-[#00b9eb] hover:text-white">
                사용자
              </Link>
            </div>
          </div>
          
          <span className="text-[#656a70]">|</span>
          
          <button className="flex items-center gap-1 hover:text-[#00b9eb]">
            <RefreshCw className="w-3 h-3" />
            <span>업데이트</span>
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs bg-[#ca4a1f] text-white rounded-full">
              2
            </span>
          </button>
          
          <span className="text-[#656a70]">|</span>
          
          <button className="flex items-center gap-1 hover:text-[#00b9eb]">
            <MessageSquare className="w-3 h-3" />
            <span>댓글</span>
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs bg-[#d54e21] text-white rounded-full">
              1
            </span>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 relative">
          <div className="relative group">
            <button className="flex items-center gap-1 hover:text-[#00b9eb] cursor-pointer">
              <span className="text-[#ccc]">안녕하세요, {user?.name || 'Admin'}님</span>
              <span className="text-xs">▼</span>
            </button>
            
            {/* User dropdown menu */}
            <div className="absolute top-full right-0 mt-1 w-48 bg-[#32373c] border border-[#444] opacity-0 invisible 
                          group-hover:opacity-100 group-hover:visible transition-opacity shadow-lg z-[100000]">
              <Link to="/users/profile" className="block px-4 py-2 hover:bg-[#00b9eb] hover:text-white">
                프로필 편집
              </Link>
              <div className="border-t border-[#444]"></div>
              <button onClick={onLogout} className="block w-full text-left px-4 py-2 hover:bg-[#00b9eb] hover:text-white">
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBar;