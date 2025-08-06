import { FC, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/api';
import { Button } from '@o4o/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@o4o/ui';
import { Alert, AlertDescription } from '@o4o/ui';

interface VerifyResponse {
  success: boolean;
  message: string;
  user?: {
    email: string;
    name: string;
  };
}

export const EmailVerificationSuccess: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token) {
      setError('인증 토큰이 없습니다.');
      setVerifying(false);
      return;
    }

    verifyEmail();
  }, [token]);

  useEffect(() => {
    // 자동 리다이렉트 카운트다운
    if (verified && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (verified && countdown === 0) {
      navigate('/login');
    }
  }, [verified, countdown, navigate]);

  const verifyEmail = async () => {
    try {
      const response = await apiClient.get<VerifyResponse>(`/v1/auth/v2/verify-email?token=${token}`);

      if (response.data.success) {
        setVerified(true);
      } else {
        setError(response.data.message || '이메일 인증에 실패했습니다.');
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        setError(error.response.data.message || '유효하지 않은 인증 링크입니다.');
      } else if (error.response?.status === 410) {
        setError('인증 링크가 만료되었습니다. 다시 시도해 주세요.');
      } else {
        setError('이메일 인증 중 오류가 발생했습니다.');
      }
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-lg font-medium">이메일 인증 중...</p>
              <p className="text-sm text-gray-500">잠시만 기다려 주세요.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold">인증 실패</CardTitle>
            <CardDescription>이메일 인증을 완료할 수 없습니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => navigate('/register')}
              >
                회원가입 다시 시도
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                로그인 페이지로 이동
              </Button>
            </div>

            <div className="text-center text-xs text-gray-500">
              계속 문제가 발생하면{' '}
              <a href="mailto:support@o4o.com" className="text-blue-600 hover:underline">
                고객센터
              </a>
              로 문의해 주세요.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">이메일 인증 완료!</CardTitle>
          <CardDescription>
            회원가입이 성공적으로 완료되었습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              이제 로그인하여 서비스를 이용하실 수 있습니다.
            </p>
            <p className="text-sm text-gray-500">
              {countdown}초 후 자동으로 로그인 페이지로 이동합니다.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              로그인하러 가기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              O4O 플랫폼에서 제공하는 서비스
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>온라인과 오프라인을 연결하는 통합 커머스 솔루션</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>실시간 재고 관리 및 주문 처리 시스템</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>디지털 사이니지 및 포럼 커뮤니티</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};