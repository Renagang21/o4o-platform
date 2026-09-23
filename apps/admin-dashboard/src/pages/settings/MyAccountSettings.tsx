/**
 * MyAccountSettings — 내 계정 › 로그인 방법
 *
 * WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1 (원형)
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   Google "연결" 카드(`GoogleAccountLink`)는 은퇴했다. 연결에 쓰던 현재 비밀번호 재인증 수단이
 *   더는 없고, 관리자 계정은 Google Identity 로만 로그인한다(linked_accounts 1행).
 *   이 화면은 현재 로그인 수단을 **표시만** 한다 — 인증 수단을 바꾸는 경로는 존재하지 않는다.
 */
import { Link2 } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';

export default function MyAccountSettings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="o4o-card">
        <div className="o4o-card-body">
          <div className="flex items-center gap-3">
            <Link2 className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold">로그인 방법</h2>
              <p className="text-sm text-gray-500">
                관리자 화면은 Google 계정으로만 로그인합니다. 비밀번호는 사용하지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="o4o-card">
        <div className="o4o-card-body">
          <p className="text-sm text-gray-600" data-testid="my-account-identity">
            현재 로그인 계정: <span className="font-medium">{user?.name || user?.email || '-'}</span>
          </p>
          <p className="mt-2 text-sm text-gray-500" data-testid="my-account-login-method">
            로그인 수단: <span className="font-medium">Google 계정</span>
          </p>
        </div>
      </div>
    </div>
  );
}
