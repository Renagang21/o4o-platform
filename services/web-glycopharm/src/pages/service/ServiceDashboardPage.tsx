/**
 * Service User Dashboard Page
 *
 * Phase 2: WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM
 *
 * Dashboard for authenticated Service Users.
 * Shows service user profile and available features.
 */

import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function ServiceDashboardPage() {
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">서비스 대시보드</h1>
        <p className="text-gray-600 mt-1">
          GlycoPharm 서비스에 오신 것을 환영합니다
        </p>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-4">
          {serviceUser.profileImage ? (
            <img
              src={serviceUser.profileImage}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-600">
                {serviceUser.displayName?.charAt(0) || serviceUser.email.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {serviceUser.displayName || '서비스 사용자'}
            </h2>
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
              이 토큰은 GlycoPharm 서비스 전용이며, 플랫폼 관리 기능에는 접근할 수 없습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 메뉴</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/"
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">홈으로</p>
              <p className="text-xs text-gray-500">메인 페이지로 이동</p>
            </div>
          </Link>

          <Link
            to="/forum"
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">포럼</p>
              <p className="text-xs text-gray-500">커뮤니티 참여</p>
            </div>
          </Link>

          <Link
            to="/education"
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">교육</p>
              <p className="text-xs text-gray-500">학습 자료 보기</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Logout Button */}
      <div className="flex justify-end">
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
