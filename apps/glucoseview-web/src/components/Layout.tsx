import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';

const navItems = [
  { path: '/', label: 'Home', protected: false },
  { path: '/patients', label: 'Patients', protected: true },
  { path: '/insights', label: 'Insights', protected: true },
  { path: '/settings', label: 'Settings', protected: true },
  { path: '/about', label: 'About', protected: false },
];

export default function Layout() {
  const { user, logout, isAuthenticated, isApproved } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if (item.protected && (!isAuthenticated || !isApproved)) {
      e.preventDefault();
      setShowLoginModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <NavLink to="/" className="text-lg font-semibold text-slate-800">
              GlucoseView
            </NavLink>

            {/* Menu Items */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item)}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              {/* User Info & Logout OR Login Button */}
              <div className="ml-4 pl-4 border-l border-slate-200 flex items-center gap-3">
                {isAuthenticated ? (
                  <>
                    <span className="text-sm text-slate-600">{user?.displayName || user?.name}</span>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    로그인
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-14">
        <Outlet />
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
