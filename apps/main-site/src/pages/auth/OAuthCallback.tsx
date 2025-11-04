import { FC, useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { Card, CardContent } from '@o4o/ui';
import { Button } from '@o4o/ui';
import { getRedirectForRole } from '@/config/roleRedirects';

interface OAuthCallbackResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    businessInfo?: any;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
  message?: string;
}

type OAuthProvider = 'google' | 'kakao' | 'naver';

export const OAuthCallback: FC = () => {
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: OAuthProvider }>();
  const [searchParams] = useSearchParams();
  const { updateUser, checkAuthStatus, user: currentUser } = useAuth();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  useEffect(() => {
    // 성공 시 자동 리다이렉트 카운트다운
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (status === 'success' && countdown === 0) {
      navigateToDestination();
    }
  }, [status, countdown]);

  const handleOAuthCallback = async () => {
    try {
      // URL 파라미터 확인
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const state = searchParams.get('state');

      // OAuth 에러 처리
      if (error) {
        const errorMessage = getOAuthErrorMessage(error, errorDescription);
        setError(errorMessage);
        setStatus('error');
        return;
      }

      // 인가 코드 확인
      if (!code) {
        setError('인증 코드가 없습니다. 다시 시도해주세요.');
        setStatus('error');
        return;
      }

      // Provider 확인
      if (!provider || !['google', 'kakao', 'naver'].includes(provider)) {
        setError('지원하지 않는 로그인 방식입니다.');
        setStatus('error');
        return;
      }

      // 백엔드에 인가 코드 전송하여 토큰 교환
      const response = await apiClient.post<OAuthCallbackResponse>(
        `/auth/oauth/${provider}/callback`,
        { 
          code,
          state,
          redirect_uri: `${window.location.origin}/auth/callback/${provider}`
        }
      );

      if (response.data.success && response.data.user) {
        // 사용자 정보 저장
        updateUser(response.data.user);

        // 인증 상태 체크
        await checkAuthStatus();

        setStatus('success');
      } else {
        setError(response.data.message || '로그인에 실패했습니다.');
        setStatus('error');
      }
    } catch (error: any) {
    // Error logging - use proper error handler
      
      let errorMessage = '로그인 처리 중 오류가 발생했습니다.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = '인증이 실패했습니다. 다시 시도해주세요.';
      } else if (error.response?.status === 403) {
        errorMessage = '승인 대기 중인 계정입니다. 관리자 승인 후 이용해주세요.';
      }
      
      setError(errorMessage);
      setStatus('error');
    }
  };

  const getOAuthErrorMessage = (error: string, description?: string | null): string => {
    switch (error) {
      case 'access_denied':
        return '로그인을 취소하셨습니다.';
      case 'invalid_request':
        return '잘못된 요청입니다. 다시 시도해주세요.';
      case 'unauthorized_client':
        return '인증되지 않은 클라이언트입니다.';
      case 'unsupported_response_type':
        return '지원하지 않는 응답 형식입니다.';
      case 'invalid_scope':
        return '잘못된 권한 요청입니다.';
      case 'server_error':
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      case 'temporarily_unavailable':
        return '일시적으로 서비스를 이용할 수 없습니다.';
      default:
        return description || '로그인 중 오류가 발생했습니다.';
    }
  };

  const getProviderInfo = () => {
    switch (provider) {
      case 'google':
        return { name: 'Google', icon: '🔵', color: 'text-blue-600' };
      case 'kakao':
        return { name: '카카오', icon: '💛', color: 'text-yellow-600' };
      case 'naver':
        return { name: '네이버', icon: '💚', color: 'text-green-600' };
      default:
        return { name: '소셜', icon: '🔗', color: 'text-gray-600' };
    }
  };

  const navigateToDestination = () => {
    if (!currentUser) {
      navigate('/');
      return;
    }

    // Use role-based redirect map
    const userRole = currentUser.role || currentUser.currentRole;
    const redirectPath = userRole ? getRedirectForRole(userRole) : '/';

    navigate(redirectPath);
  };

  const providerInfo = getProviderInfo();

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className={`text-6xl ${providerInfo.color}`}>
                {providerInfo.icon}
              </div>
              <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">
                  {providerInfo.name} 로그인 처리 중...
                </p>
                <p className="text-sm text-gray-500">
                  잠시만 기다려주세요
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  로그인 실패
                </h2>
                <p className="text-sm text-gray-600">
                  {error}
                </p>
              </div>
              <div className="w-full space-y-3 pt-4">
                <Button
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  다시 로그인하기
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/')}
                >
                  홈으로 돌아가기
                </Button>
              </div>
              <div className="text-center text-xs text-gray-500 pt-4 border-t w-full">
                계속 문제가 발생하면{' '}
                <a href="mailto:support@o4o.com" className="text-blue-600 hover:underline">
                  고객센터
                </a>
                로 문의해주세요.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                로그인 성공!
              </h2>
              <p className="text-sm text-gray-600">
                {providerInfo.name} 계정으로 로그인되었습니다.
              </p>
              <p className="text-sm text-gray-500">
                {countdown}초 후 자동으로 이동합니다...
              </p>
            </div>
            <Button
              className="w-full"
              onClick={navigateToDestination}
            >
              지금 이동하기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthCallback;