import { FC, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ResendResponse {
  success: boolean;
  message: string;
}

export const EmailVerificationPending: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // 재전송 쿨다운 타이머
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0 || !email) return;

    setResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const response = await apiClient.post<ResendResponse>('/v1/auth/v2/resend-verification', {
        email
      });

      if (response.data.success) {
        setResendSuccess(true);
        setCountdown(60); // 60초 쿨다운
      } else {
        setResendError(response.data.message || '이메일 전송에 실패했습니다.');
      }
    } catch (error: any) {
      setResendError(
        error.response?.data?.message || 
        '이메일 전송 중 오류가 발생했습니다.'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">이메일을 확인해 주세요</CardTitle>
          <CardDescription>
            인증 메일이 발송되었습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              <strong className="font-medium text-gray-900">{email || '입력하신 이메일'}</strong>로<br />
              인증 링크가 포함된 이메일을 보내드렸습니다.
            </p>
            <p className="text-sm text-gray-500">
              이메일의 인증 링크를 클릭하면 회원가입이 완료됩니다.
            </p>
          </div>

          {resendSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                인증 이메일을 다시 발송했습니다.
              </AlertDescription>
            </Alert>
          )}

          {resendError && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {resendError}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResendEmail}
              disabled={resending || countdown > 0}
            >
              {resending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  이메일 재전송 중...
                </>
              ) : countdown > 0 ? (
                `${countdown}초 후 재전송 가능`
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  인증 이메일 재전송
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              로그인 페이지로 돌아가기
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              이메일을 받지 못하셨나요?
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 스팸 메일함을 확인해 주세요</li>
              <li>• 이메일 주소가 올바른지 확인해 주세요</li>
              <li>• 몇 분 정도 기다려 주세요</li>
            </ul>
          </div>

          <div className="text-center text-xs text-gray-500">
            문제가 계속되면{' '}
            <a href="mailto:support@o4o.com" className="text-blue-600 hover:underline">
              고객센터
            </a>
            로 문의해 주세요.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};