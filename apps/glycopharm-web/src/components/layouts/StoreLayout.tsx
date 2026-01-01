import { Outlet, useParams, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Store,
  ShoppingCart,
  User,
  Menu,
  X,
  Search,
  Phone,
  MapPin,
} from 'lucide-react';

// Mock pharmacy data - in real app, fetch from API
const mockPharmacies: Record<string, { name: string; address: string; phone: string; logo?: string }> = {
  'pharmacy-1': {
    name: '건강약국',
    address: '서울시 강남구 테헤란로 123',
    phone: '02-1234-5678',
  },
  'pharmacy-2': {
    name: '행복약국',
    address: '서울시 서초구 서초대로 456',
    phone: '02-2345-6789',
  },
};

export default function StoreLayout() {
  const { pharmacyId } = useParams<{ pharmacyId: string }>();
  const { user, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount] = useState(0);

  const pharmacy = pharmacyId ? mockPharmacies[pharmacyId] : null;

  if (!pharmacy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">매장을 찾을 수 없습니다</h1>
          <p className="text-slate-500">올바른 매장 링크를 확인해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Store Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        {/* Top Bar */}
        <div className="bg-primary-600 text-white py-2 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {pharmacy.phone}
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {pharmacy.address}
              </span>
            </div>
            <div>
              {isAuthenticated ? (
                <span>{user?.name}님 환영합니다</span>
              ) : (
                <NavLink to="/login" className="hover:underline">
                  로그인
                </NavLink>
              )}
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Store Name */}
            <NavLink to={`/store/${pharmacyId}`} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-slate-800">{pharmacy.name}</h1>
                <p className="text-xs text-slate-500">혈당관리 전문</p>
              </div>
            </NavLink>

            {/* Search - Desktop */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="상품 검색..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <NavLink
                to={`/store/${pharmacyId}/cart`}
                className="relative p-2 rounded-xl hover:bg-slate-100"
              >
                <ShoppingCart className="w-6 h-6 text-slate-600" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </NavLink>

              {isAuthenticated ? (
                <NavLink
                  to="/mypage"
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <User className="w-6 h-6 text-slate-600" />
                </NavLink>
              ) : (
                <NavLink
                  to="/login"
                  className="hidden sm:flex px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700"
                >
                  로그인
                </NavLink>
              )}

              {/* Mobile Menu */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-slate-100"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="상품 검색..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="border-t">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-1 overflow-x-auto py-2">
              <NavLink
                to={`/store/${pharmacyId}`}
                end
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                홈
              </NavLink>
              <NavLink
                to={`/store/${pharmacyId}/products`}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                전체상품
              </NavLink>
              <NavLink
                to={`/store/${pharmacyId}/products?category=cgm`}
                className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100"
              >
                연속혈당측정기
              </NavLink>
              <NavLink
                to={`/store/${pharmacyId}/products?category=supplement`}
                className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100"
              >
                건강기능식품
              </NavLink>
              <NavLink
                to={`/store/${pharmacyId}/products?category=food`}
                className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100"
              >
                당뇨식품
              </NavLink>
            </div>
          </div>
        </nav>
      </header>

      {/* Page Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Store Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div>
              <h3 className="font-bold text-lg text-slate-800 mb-2">{pharmacy.name}</h3>
              <p className="text-sm text-slate-500">{pharmacy.address}</p>
              <p className="text-sm text-slate-500">전화: {pharmacy.phone}</p>
            </div>
            <div className="text-sm text-slate-500">
              <p>본 매장은 GlycoPharm 플랫폼에서 운영됩니다.</p>
              <p className="mt-1">© 2025 GlycoPharm. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
