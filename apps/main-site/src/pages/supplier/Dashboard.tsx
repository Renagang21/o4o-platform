import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Supplier } from '../../types/user';

export default function SupplierDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const supplierUser = user as Supplier;

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">공급자 대시보드</h1>
              <p className="text-sm text-gray-600 mt-1">{supplierUser?.companyName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.name}님
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 승인 상태 알림 */}
      {supplierUser?.approvalStatus === 'pending' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                관리자 승인을 기다리고 있습니다. 승인 후 모든 기능을 사용할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 통계 카드들 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-blue-500 p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <div className="text-sm font-medium text-gray-500">등록 상품</div>
                  <div className="mt-1 text-3xl font-semibold text-gray-900">0</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-green-500 p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <div className="text-sm font-medium text-gray-500">주문 수</div>
                  <div className="mt-1 text-3xl font-semibold text-gray-900">0</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-yellow-500 p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <div className="text-sm font-medium text-gray-500">이번 달 매출</div>
                  <div className="mt-1 text-3xl font-semibold text-gray-900">₩0</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-purple-500 p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <div className="text-sm font-medium text-gray-500">거래 리테일러</div>
                  <div className="mt-1 text-3xl font-semibold text-gray-900">0</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 주요 기능들 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">상품 관리</h3>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/supplier/products/new')}
                className="w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700"
                disabled={supplierUser?.approvalStatus !== 'approved'}
              >
                새 상품 등록
              </button>
              <button 
                onClick={() => navigate('/supplier/products')}
                className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md"
              >
                상품 목록
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md">
                재고 관리
              </button>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">주문 관리</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md">
                신규 주문 (0)
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md">
                처리중 주문
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md">
                배송 관리
              </button>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">정산 및 통계</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md">
                매출 현황
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md">
                정산 내역
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md">
                판매 통계
              </button>
            </div>
          </div>
        </div>

        {/* 회사 정보 */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">회사 정보</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">회사명</dt>
              <dd className="mt-1 text-sm text-gray-900">{supplierUser?.companyName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">사업자번호</dt>
              <dd className="mt-1 text-sm text-gray-900">{supplierUser?.businessNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">주소</dt>
              <dd className="mt-1 text-sm text-gray-900">{supplierUser?.address}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">담당자</dt>
              <dd className="mt-1 text-sm text-gray-900">{supplierUser?.contactPerson}</dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
