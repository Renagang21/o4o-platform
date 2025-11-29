import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Mail } from 'lucide-react';

/**
 * AppDisabled Error Page
 *
 * Displayed when a user tries to access a route for an inactive app.
 * Shows a friendly error message and provides navigation options.
 */
export default function AppDisabled() {
  const [searchParams] = useSearchParams();
  const appId = searchParams.get('app') || '알 수 없는 앱';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-yellow-100 p-4">
              <ShieldAlert className="w-12 h-12 text-yellow-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            앱이 비활성화되었습니다
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-2">
            <span className="font-semibold text-gray-800">"{appId}"</span> 기능은 현재 비활성화되어 있습니다.
          </p>
          <p className="text-gray-600 mb-8">
            이 기능을 사용하려면 관리자에게 문의하세요.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              to="/admin"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-admin-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              대시보드로 돌아가기
            </Link>

            <Link
              to="/apps/store"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              앱 장터에서 활성화하기
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              문의: admin@neture.co.kr
            </p>
          </div>
        </div>

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-xs text-gray-600 font-mono">
              <strong>Debug Info:</strong>
              <br />
              App ID: {appId}
              <br />
              Path: {window.location.pathname}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
