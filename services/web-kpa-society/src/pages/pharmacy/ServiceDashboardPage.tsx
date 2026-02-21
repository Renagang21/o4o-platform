/**
 * Pharmacy Service Dashboard Page
 *
 * Phase 2-b: WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY
 *
 * Dashboard for authenticated Service Users in KPA Pharmacy service.
 * Shows service user profile and available pharmacy features.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ServiceDashboardPage() {
  const { serviceUser, serviceUserLogout } = useAuth();

  if (!serviceUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">서비스 사용자 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    serviceUserLogout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link to="/pharmacy" className="text-xl font-bold text-blue-600">
                KPA 약국 서비스
              </Link>
              <span className="ml-4 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                Service User
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {serviceUser.displayName || serviceUser.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-500"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">서비스 대시보드</h1>
          <p className="text-gray-600 mt-1">
            KPA 약국 서비스에 오신 것을 환영합니다
          </p>
        </div>

        {/* User Profile Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">사용자 정보</h2>
          <div className="flex items-center space-x-4">
            {serviceUser.profileImage ? (
              <img
                src={serviceUser.profileImage}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">
                  {serviceUser.displayName?.charAt(0) || serviceUser.email.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {serviceUser.displayName || '서비스 사용자'}
              </h3>
              <p className="text-sm text-gray-500">{serviceUser.email}</p>
              <div className="flex items-center mt-1 space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {serviceUser.provider.toUpperCase()}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  {serviceUser.serviceId}
                </span>
                {serviceUser.storeId && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Store: {serviceUser.storeId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Token Type Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">서비스 사용자 인증</h4>
              <p className="mt-1 text-sm text-blue-700">
                서비스 토큰(tokenType: 'service')으로 인증되었습니다.
                이 토큰은 KPA 약국 서비스 전용이며, 약사회 회원 기능에는 접근할 수 없습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Service Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">서비스 정보</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">서비스 ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{serviceUser.serviceId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">인증 제공자</dt>
              <dd className="mt-1 text-sm text-gray-900">{serviceUser.provider}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">사용자 ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono text-xs">
                {serviceUser.providerUserId}
              </dd>
            </div>
            {serviceUser.storeId && (
              <div>
                <dt className="text-sm font-medium text-gray-500">스토어 ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{serviceUser.storeId}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 메뉴</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              to="/pharmacy"
              className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">약국 경영지원</p>
                <p className="text-xs text-gray-500">B2B, 매장관리</p>
              </div>
            </Link>

            <Link
              to="/pharmacy/sales/b2b"
              className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">B2B 구매</p>
                <p className="text-xs text-gray-500">공급업체 연결</p>
              </div>
            </Link>

            <Link
              to="/pharmacy/services"
              className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">서비스 현황</p>
                <p className="text-xs text-gray-500">LMS, 사이니지, 포럼</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Comparison Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-amber-800">
                Platform User와 Service User 분리
              </h4>
              <p className="mt-1 text-sm text-amber-700">
                현재 서비스 사용자로 로그인되어 있습니다.
                약사회 회원 기능(인트라넷, 관리자 등)에 접근하려면{' '}
                <Link to="/login" className="font-medium underline">
                  회원 로그인
                </Link>
                을 이용하세요.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ServiceDashboardPage;
