// Example: AuthCallbackPage.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCookieAuth } from '@o4o/auth-context';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useCookieAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const success = searchParams.get('success');
      const error = searchParams.get('error');

      if (success === 'true') {
        // Social login successful, check auth status
        await checkAuth();
        navigate('/dashboard');
      } else if (error) {
        // Handle error
        console.error('Social login failed:', error);
        navigate('/login?error=' + error);
      } else {
        // No params, redirect to login
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, checkAuth]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">인증 처리 중...</p>
      </div>
    </div>
  );
}

// Example: LoginPage.tsx with social login
import { SocialLoginButtons } from '@o4o/ui';
import { useCookieAuth } from '@o4o/auth-context';

export function LoginPage() {
  const { login, loading, error } = useCookieAuth();
  
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // ... email login logic
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6">
      <h1 className="text-2xl font-bold mb-6">로그인</h1>
      
      {/* Email Login Form */}
      <form onSubmit={handleEmailLogin} className="mb-6">
        {/* ... email/password inputs */}
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">또는</span>
        </div>
      </div>

      {/* Social Login Buttons */}
      <SocialLoginButtons 
        disabled={loading}
        onSocialLogin={(provider) => {
          console.log('Social login initiated:', provider);
        }}
      />

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

// Example: AccountSettingsPage.tsx with account linking
import { useState, useEffect } from 'react';
import { useCookieAuth } from '@o4o/auth-context';

export function AccountSettingsPage() {
  const { user } = useCookieAuth();
  const [linkedAccounts, setLinkedAccounts] = useState({
    local: false,
    google: false,
    kakao: false,
    naver: false
  });

  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  const fetchLinkedAccounts = async () => {
    try {
      const response = await fetch('/api/v1/auth/linked-accounts', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setLinkedAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Failed to fetch linked accounts:', error);
    }
  };

  const handleLinkAccount = (provider: string) => {
    window.location.href = `/api/v1/auth/${provider}`;
  };

  const handleUnlinkAccount = async () => {
    try {
      const response = await fetch('/api/v1/auth/unlink', {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        await fetchLinkedAccounts();
      }
    } catch (error) {
      console.error('Failed to unlink account:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">연결된 계정</h2>
      
      <div className="space-y-4">
        {/* Google Account */}
        <div className="flex items-center justify-between p-4 border rounded">
          <div className="flex items-center gap-3">
            {/* Google icon */}
            <span>Google</span>
          </div>
          {linkedAccounts.google ? (
            <button
              onClick={handleUnlinkAccount}
              className="text-red-600 hover:text-red-700"
            >
              연결 해제
            </button>
          ) : (
            <button
              onClick={() => handleLinkAccount('google')}
              className="text-blue-600 hover:text-blue-700"
            >
              연결하기
            </button>
          )}
        </div>

        {/* Similar for Kakao and Naver */}
      </div>
    </div>
  );
}