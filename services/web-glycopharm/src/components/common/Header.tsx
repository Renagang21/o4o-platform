import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Building2,
  Truck,
  Handshake,
  Shield,
  Activity,
  MonitorPlay,
} from 'lucide-react';

const roleNavigation: Record<string, { path: string; label: string; icon: typeof Building2 }> = {
  pharmacy: { path: '/pharmacy', label: '약국 관리', icon: Building2 },
  supplier: { path: '/supplier', label: '공급자 관리', icon: Truck },
  partner: { path: '/partner', label: '파트너 관리', icon: Handshake },
  operator: { path: '/operator', label: '운영자 관리', icon: Shield },
};

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const roleNav = user?.role ? roleNavigation[user.role] : null;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-xl text-slate-800">GlycoPharm</span>
              <span className="block text-[10px] text-slate-500 -mt-1">혈당관리 전문 플랫폼</span>
            </div>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              홈
            </NavLink>
            <NavLink
              to="/forum"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              포럼
            </NavLink>
            <NavLink
              to="/education"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              교육/자료
            </NavLink>
            <NavLink
              to="/pharmacy/signage/library"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              콘텐츠
            </NavLink>
            <NavLink
              to="/apply"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              참여 신청
            </NavLink>
            {isAuthenticated && roleNav && (
              <NavLink
                to={roleNav.path}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? 'bg-accent-100 text-accent-700'
                    : 'text-accent-600 hover:bg-accent-50 hover:text-accent-700'
                  }`
                }
              >
                {roleNav.label}
              </NavLink>
            )}
          </nav>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1 px-2 py-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border py-2 z-50 animate-slide-in-right">
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                        <p className="text-xs text-slate-500">{user?.email}</p>
                      </div>
                      <NavLink
                        to="/mypage"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        마이페이지
                      </NavLink>
                      {roleNav && (
                        <NavLink
                          to={roleNav.path}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <roleNav.icon className="w-4 h-4" />
                          {roleNav.label}
                        </NavLink>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        로그아웃
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  로그인
                </NavLink>
                <NavLink
                  to="/register"
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
                >
                  회원가입
                </NavLink>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-slate-700" />
            ) : (
              <Menu className="w-6 h-6 text-slate-700" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t animate-fade-in">
            <nav className="flex flex-col gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl text-sm font-medium ${isActive ? 'bg-primary-100 text-primary-700' : 'text-slate-600'
                  }`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                홈
              </NavLink>
              <NavLink
                to="/forum"
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl text-sm font-medium ${isActive ? 'bg-primary-100 text-primary-700' : 'text-slate-600'
                  }`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                포럼
              </NavLink>
              <NavLink
                to="/education"
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl text-sm font-medium ${isActive ? 'bg-primary-100 text-primary-700' : 'text-slate-600'
                  }`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                교육/자료
              </NavLink>
              <NavLink
                to="/pharmacy/signage/library"
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl text-sm font-medium ${isActive ? 'bg-primary-100 text-primary-700' : 'text-slate-600'
                  }`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                콘텐츠
              </NavLink>
              <NavLink
                to="/apply"
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl text-sm font-medium ${isActive ? 'bg-primary-100 text-primary-700' : 'text-slate-600'
                  }`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                참여 신청
              </NavLink>
              {isAuthenticated && roleNav && (
                <NavLink
                  to={roleNav.path}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-xl text-sm font-medium ${isActive ? 'bg-accent-100 text-accent-700' : 'text-accent-600'
                    }`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {roleNav.label}
                </NavLink>
              )}
            </nav>

            <div className="mt-4 pt-4 border-t">
              {isAuthenticated ? (
                <>
                  <NavLink
                    to="/mypage"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    마이페이지
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    로그아웃
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-4">
                  <NavLink
                    to="/login"
                    className="w-full py-3 text-center text-sm font-medium text-slate-600 border rounded-xl"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    로그인
                  </NavLink>
                  <NavLink
                    to="/register"
                    className="w-full py-3 text-center text-sm font-medium text-white bg-primary-600 rounded-xl"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    회원가입
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
