import { useState, useEffect, FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AuthCallbackV2: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    handleCallback();
  }, []);

  useEffect(() => {
    // Auto-redirect countdown
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      redirectToDestination();
    }
  }, [success, countdown]);

  const handleCallback = async () => {
    try {
      // Check URL parameters
      const successParam = searchParams.get('success');
      const errorParam = searchParams.get('error');
      const token = searchParams.get('token');

      if (errorParam) {
        handleError(errorParam);
        return;
      }

      if (successParam === 'true') {
        // OAuth login was successful, cookies have been set by backend
        // Check authentication status
        const authenticated = await checkAuth();
        
        if (authenticated) {
          setSuccess(true);
        } else {
          setError('인증 정보를 확인할 수 없습니다.');
        }
      } else if (token) {
        // Legacy token-based callback
        handleTokenCallback(token);
      } else {
        setError('유효하지 않은 콜백 요청입니다.');
      }
    } catch (err: any) {
      console.error('Auth callback error:', err);
      setError('인증 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleError = (errorType: string) => {
    switch (errorType) {
      case 'social_auth_failed':
        setError('소셜 로그인에 실패했습니다.');
        break;
      case 'access_denied':
        setError('로그인을 취소하셨습니다.');
        break;
      case 'account_not_active':
        setError('계정이 활성화되지 않았습니다. 관리자 승인을 기다려주세요.');
        break;
      case 'email_not_verified':
        setError('이메일 인증이 필요합니다.');
        break;
      default:
        setError('로그인 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  const handleTokenCallback = async (token: string) => {
    try {
      // Legacy token handling
      localStorage.setItem('auth_token', token);
      
      const authenticated = await checkAuth();
      if (authenticated) {
        setSuccess(true);
      } else {
        setError('인증 토큰이 유효하지 않습니다.');
      }
    } catch (err) {
      setError('토큰 인증 중 오류가 발생했습니다.');
    }
  };

  const redirectToDestination = () => {
    const user = useAuthStore.getState().user;
    
    if (!user) {
      navigate('/');
      return;
    }

    // Redirect based on user role
    switch (user.role) {
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'supplier':
        navigate('/supplier/dashboard');
        break;
      case 'retailer':
        navigate('/retailer/dashboard');
        break;
      case 'customer':
      default:
        navigate('/shop');
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <h2 className="text-xl font-semibold text-gray-900">로그인 처리 중...</h2>
              <p className="text-sm text-gray-600">잠시만 기다려주세요</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">로그인 실패</h2>
              <p className="text-sm text-gray-600 text-center">{error}</p>
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
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">로그인 성공!</h2>
              <p className="text-sm text-gray-600">
                {countdown}초 후 자동으로 이동합니다...
              </p>
              <Button
                className="w-full"
                onClick={redirectToDestination}
              >
                지금 이동하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default AuthCallbackV2;