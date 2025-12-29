/**
 * Home Page
 * =============================================================================
 * Landing page for Forum Web.
 * =============================================================================
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../stores/AuthContext';

export function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          약사 포럼
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          약사 커뮤니티 포럼입니다. 전문 지식과 경험을 공유하세요.
        </p>

        {isAuthenticated && user && (
          <p className="text-blue-600 mt-4">
            환영합니다, {user.name || user.email}님!
          </p>
        )}
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <Link to="/forum?category=general" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            일반 토론
          </h3>
          <p className="text-gray-600 text-sm">
            자유롭게 의견을 나누고 토론하세요.
          </p>
        </Link>

        <Link to="/forum?category=pharmacy" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            약국 정보
          </h3>
          <p className="text-gray-600 text-sm">
            약국 운영에 관한 정보를 공유합니다.
          </p>
        </Link>

        <Link to="/forum?category=medicine" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            의약품 정보
          </h3>
          <p className="text-gray-600 text-sm">
            의약품 관련 최신 정보를 확인하세요.
          </p>
        </Link>
      </div>

      {/* CTA */}
      <div className="text-center py-8 space-y-4">
        <Link
          to="/forum"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          게시판 보기
        </Link>

        {isAuthenticated ? (
          <div>
            <Link
              to="/forum/new"
              className="inline-block ml-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              새 글 작성
            </Link>
          </div>
        ) : (
          <p className="text-gray-500 text-sm mt-4">
            <Link to="/login" className="text-blue-600 hover:text-blue-700">로그인</Link>
            하시면 글을 작성할 수 있습니다.
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          커뮤니티 현황
        </h2>
        <div className="grid md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">4</p>
            <p className="text-sm text-gray-600">카테고리</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">24/7</p>
            <p className="text-sm text-gray-600">운영 시간</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">Alpha</p>
            <p className="text-sm text-gray-600">서비스 상태</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">v1.0</p>
            <p className="text-sm text-gray-600">버전</p>
          </div>
        </div>
      </div>
    </div>
  );
}
