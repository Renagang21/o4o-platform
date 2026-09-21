/**
 * MyAccountSettings — 내 계정 › 로그인 방법(Google 연결)
 *
 * WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1:
 *   현재 platform 관리자 session 에 Google Identity(sub)를 명시적으로 연결한다.
 *   기존 `GoogleAccountLink`(@o4o/auth-react) + 기존 API(GET /auth/google/link/status ·
 *   POST /auth/google/link · users.password 재인증)만 재사용한다 — Admin 전용 연결 로직 없음.
 *   연결은 linked_accounts 에 1행 추가일 뿐 users.id · role · membership · service_credentials 는 불변.
 *   전환기에는 Google 로그인과 password 로그인을 병행한다.
 */
import { Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleAccountLink } from '@o4o/auth-react';
import { useAuth } from '@o4o/auth-context';
import { authClient } from '@/lib/api';

// 모듈 상수 — render 마다 새 함수를 넘겨 카드가 status 를 재조회하지 않도록 한다.
const getGoogleAuthConfig = () => authClient.getGoogleAuthConfig();
const getGoogleLinkStatus = () => authClient.getGoogleLinkStatus();
const linkGoogle = (idToken: string, currentPassword: string) => authClient.linkGoogle(idToken, currentPassword);

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
                Google 계정을 연결하면 비밀번호 없이 Google 로 관리자 화면에 로그인할 수 있습니다.
                연결 시 현재 비밀번호로 한 번 더 확인합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="o4o-card">
        <div className="o4o-card-body">
          <p className="text-sm text-gray-600 mb-4" data-testid="my-account-identity">
            현재 로그인 계정: <span className="font-medium">{user?.name || user?.email || '-'}</span>
          </p>
          <GoogleAccountLink
            getConfig={getGoogleAuthConfig}
            getStatus={getGoogleLinkStatus}
            linkGoogle={linkGoogle}
            onLinked={() => toast.success('Google 계정이 연결되었습니다. 다음 로그인부터 Google 로 진입할 수 있습니다.')}
            onError={(e) => toast.error(e.message)}
          />
        </div>
      </div>
    </div>
  );
}
