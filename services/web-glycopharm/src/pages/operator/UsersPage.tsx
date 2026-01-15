/**
 * Operator Users Page (Stub)
 *
 * 운영자 사용자 관리 페이지
 * 추후 구현 예정
 */

import { Link } from 'react-router-dom';
import { Users, ArrowLeft, Construction } from 'lucide-react';

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Construction className="w-8 h-8 text-amber-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            사용자 관리
          </h1>

          <p className="text-gray-600 mb-8">
            이 기능은 현재 개발 중입니다.
          </p>

          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center gap-3 text-gray-500">
              <Users className="w-5 h-5" />
              <span>사용자 목록, 권한 관리, 계정 설정 등</span>
            </div>
          </div>

          <Link
            to="/operator"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
