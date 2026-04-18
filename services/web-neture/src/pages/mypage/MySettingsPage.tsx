/**
 * MySettingsPage - 설정 (경량 모드)
 *
 * WO-O4O-NETURE-MYPAGE-SPLIT-V1
 *
 * /mypage/settings — 보안 설정. 현재 비밀번호 변경만 안내 상태.
 */

import { User } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { Lock } from 'lucide-react';
import { useAuth } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { MyPageLayout, SettingsSection } from '@o4o/account-ui';

export default function MySettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</h1>
          <p className="text-sm text-gray-500 mb-6">마이페이지를 이용하려면 로그인해주세요.</p>
          <button
            onClick={() => openLoginModal('/mypage/settings')}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <MyPageLayout title="마이페이지" subtitle="계정 보안 및 환경 설정을 관리합니다">
      <SettingsSection title="보안 설정">
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
