/**
 * Home Page
 * =============================================================================
 * Landing page with feature overview.
 * =============================================================================
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../stores/AuthContext';

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          O4O Web Server Reference
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          web-server-architecture.md를 따르는 프론트엔드 기준 구현체입니다.
          모든 새 Web Server는 이 구조를 복사해 시작합니다.
        </p>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            authClient 기반 인증
          </h3>
          <p className="text-gray-600 text-sm">
            모든 API 호출은 @o4o/auth-client를 통해 수행됩니다.
            JWT 토큰 관리와 자동 갱신이 포함되어 있습니다.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Core API + App API 연동
          </h3>
          <p className="text-gray-600 text-sm">
            인증은 Core API, 도메인 기능은 App API(Forum API)를 통해 처리합니다.
            명확한 역할 분리가 되어 있습니다.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Cloud Run 배포 준비
          </h3>
          <p className="text-gray-600 text-sm">
            Vite 빌드 결과물은 정적 파일로, Cloud Run 또는 Nginx에 배포 가능합니다.
          </p>
        </div>
      </div>

      {/* Architecture Rules Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          아키텍처 규칙 요약
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-green-700 mb-2">✅ 허용</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• authClient.api로 Core API 호출</li>
              <li>• authClient.api로 App API 호출</li>
              <li>• React/Vite 사용</li>
              <li>• 클라이언트 상태 관리</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-red-700 mb-2">❌ 금지</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 직접 DB 연결</li>
              <li>• localStorage에 JWT 저장 (authClient가 관리)</li>
              <li>• API URL 하드코딩</li>
              <li>• 직접 axios/fetch 사용</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center py-8">
        <Link
          to="/forum"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          포럼 데모 보기 →
        </Link>

        {!isAuthenticated && (
          <p className="text-gray-500 text-sm mt-4">
            로그인하면 글쓰기 기능을 사용할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  );
}
