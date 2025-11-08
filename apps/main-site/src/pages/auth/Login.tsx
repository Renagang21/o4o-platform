/**
 * Login Page
 * Main login page with OAuth and email/password authentication
 */

import { FC, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Lazy load SocialLoginComponent to avoid static import
const SocialLoginComponent = lazy(() =>
  import('../../components/shortcodes/authShortcodes').then(m => ({
    default: m.SocialLoginComponent
  }))
);

// Loading fallback
const LoginLoading = () => (
  <div className="bg-white rounded-2xl shadow-xl p-8 w-full">
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  </div>
);

const Login: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect URL from query params or default to home
  const params = new URLSearchParams(location.search);
  const redirectUrl = params.get('redirect') || '/';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Suspense fallback={<LoginLoading />}>
          <SocialLoginComponent
            redirectUrl={redirectUrl}
            showEmailLogin={true}
            title="로그인"
            subtitle="계정에 접속하여 서비스를 이용하세요"
            showSignupLink={true}
            signupUrl="/register"
          />
        </Suspense>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/auth/forgot-password')}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
