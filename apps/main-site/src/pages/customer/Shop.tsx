import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function CustomerShop() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">O4O Shop</h1>
              <nav className="ml-10">
                <div className="flex space-x-8">
                  <a href="#" className="text-gray-900 hover:text-gray-700">전체상품</a>
                  <a href="#" className="text-gray-500 hover:text-gray-700">카테고리</a>
                  <a href="#" className="text-gray-500 hover:text-gray-700">베스트</a>
                  <a href="#" className="text-gray-500 hover:text-gray-700">세일</a>
                </div>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button className="text-gray-400 hover:text-gray-500 relative">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">0</span>
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{user?.name}님</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 배너 섹션 */}
      <section className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">B2B to B2C 통합 플랫폼</h2>
          <p className="text-xl mb-8">신뢰할 수 있는 공급자와 리테일러가 제공하는 최고의 상품들</p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
            쇼핑 시작하기
          </button>
        </div>
      </section>

      {/* 카테고리 섹션 */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">인기 카테고리</h3>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { name: '전자제품', icon: '📱', count: '0' },
              { name: '생활용품', icon: '🏠', count: '0' },
              { name: '패션', icon: '👕', count: '0' },
              { name: '식품', icon: '🍎', count: '0' },
              { name: '화장품', icon: '💄', count: '0' },
              { name: '도서', icon: '📚', count: '0' },
            ].map((category) => (
              <div key={category.name} className="bg-white rounded-lg shadow p-6 text-center hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-3xl mb-2">{category.icon}</div>
                <h4 className="font-medium text-gray-900">{category.name}</h4>
                <p className="text-sm text-gray-500">{category.count}개 상품</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 추천 상품 섹션 */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">추천 상품</h3>
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">상품이 곧 등록됩니다</h3>
            <p className="text-gray-500">공급자들이 최고의 상품을 준비하고 있습니다.</p>
          </div>
        </div>
      </section>

      {/* 특별 혜택 섹션 */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">특별 혜택</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="text-blue-600 mb-3">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">직접 거래</h4>
              <p className="text-gray-600">중간 유통업체 없이 공급자와 직접 거래로 합리적인 가격</p>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <div className="text-green-600 mb-3">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">검증된 공급자</h4>
              <p className="text-gray-600">엄격한 심사를 통과한 신뢰할 수 있는 공급자들만 입점</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-6">
              <div className="text-purple-600 mb-3">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">빠른 배송</h4>
              <p className="text-gray-600">전국 물류 네트워크를 통한 신속하고 안전한 배송</p>
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h4 className="text-lg font-medium mb-2">O4O Platform</h4>
            <p className="text-gray-400">One-for-One, Online-to-Offline</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
