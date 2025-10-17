/**
 * Login Page
 * Main login page with OAuth and email/password authentication
 */

import { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SocialLoginComponent } from '../../components/shortcodes/authShortcodes';

const Login: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect URL from query params or default to home
  const params = new URLSearchParams(location.search);
  const redirectUrl = params.get('redirect') || '/';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <SocialLoginComponent
          redirectUrl={redirectUrl}
          showEmailLogin={true}
          title="로그인"
          subtitle="계정에 접속하여 서비스를 이용하세요"
        />

        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => navigate('/auth/forgot-password')}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            비밀번호를 잊으셨나요?
          </button>

          <div className="text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              회원가입
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
