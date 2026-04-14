/**
 * MySettingsPage - 설정 (경량 모드)
 *
 * WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1
 *
 * /mypage/settings — 보안/알림/계정 관리.
 * 현재 k-cosmetics에서는 기능이 제한적이므로 안내 메시지로 구성.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { Lock } from 'lucide-react';
import { MyPageLayout, SettingsSection } from '@o4o/account-ui';

export default function MySettingsPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <h1 className="text-lg font-semibold text-gray-900 mb-4">로그인이 필요합니다</h1>
          <Link
            to="/login"
            className="block w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-center"
          >
            로그인
          </Link>
        </div>
      </div>
    );
  }

  return (
    <MyPageLayout title="마이페이지" subtitle="내 정보를 확인하고 관리할 수 있습니다">
      <SettingsSection title="보안 설정" description="정기적인 비밀번호 변경을 권장합니다">
        <button
          onClick={() => toast.info('비밀번호 변경 기능은 준비 중입니다.')}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">비밀번호 변경</span>
          </div>
        </button>
      </SettingsSection>
    </MyPageLayout>
  );
}
