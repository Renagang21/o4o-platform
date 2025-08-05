import { FC, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, RefreshCw, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { apiClient } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ResendResponse {
  success: boolean;
  message: string;
}

type ErrorType = 'expired' | 'invalid' | 'already-verified' | 'unknown';

export const EmailVerificationError: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorType = (searchParams.get('type') as ErrorType) || 'unknown';
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const getErrorInfo = () => {
    switch (errorType) {
      case 'expired':
        return {
          icon: Clock,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-100',
          title: '인증 링크가 만료되었습니다',
          description: '보안을 위해 인증 링크는 24시간 후 만료됩니다.',
          message: '새로운 인증 이메일을 받으시려면 아래에 이메일 주소를 입력해 주세요.'
        };
      case 'already-verified':
        return {
          icon: CheckCircle,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-100',
          title: '이미 인증된 계정입니다',
          description: '이 이메일은 이미 인증이 완료되었습니다.',
          message: '로그인 페이지로 이동하여 서비스를 이용해 주세요.'
        };
      case 'invalid':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          title: '유효하지 않은 인증 링크입니다',
          description: '인증 링크가 올바르지 않거나 손상되었습니다.',
          message: '올바른 링크를 사용했는지 확인하시고, 필요시 새로운 인증 이메일을 요청해 주세요.'
        };
      default:
        return {
          icon: XCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          title: '인증에 실패했습니다',
          description: '이메일 인증을 완료할 수 없습니다.',
          message: '잠시 후 다시 시도하시거나, 새로운 인증 이메일을 요청해 주세요.'
        };
    }
  };

  const errorInfo = getErrorInfo();
  const ErrorIcon = errorInfo.icon;

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || resending) return;

    setResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const response = await apiClient.post<ResendResponse>('/v1/auth/v2/resend-verification', {
        email
      });

      if (response.data.success) {
        setResendSuccess(true);
        setEmail('');
      } else {
        setResendError(response.data.message || '이메일 전송에 실패했습니다.');
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setResendError('등록되지 않은 이메일 주소입니다.');
      } else if (error.response?.status === 429) {
        setResendError('너무 많은 요청을 하셨습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        setResendError(
          error.response?.data?.message || 
          '이메일 전송 중 오류가 발생했습니다.'
        );
      }
    } finally {
      setResending(false);
    }
  };

  if (errorType === 'already-verified') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${errorInfo.bgColor} mb-4`}>
              <ErrorIcon className={`h-8 w-8 ${errorInfo.iconColor}`} />
            </div>
            <CardTitle className="text-2xl font-bold">{errorInfo.title}</CardTitle>
            <CardDescription>{errorInfo.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-gray-600 text-center">
              {errorInfo.message}
            </p>
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              로그인하러 가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${errorInfo.bgColor} mb-4`}>
            <ErrorIcon className={`h-8 w-8 ${errorInfo.iconColor}`} />
          </div>
          <CardTitle className="text-2xl font-bold">{errorInfo.title}</CardTitle>
          <CardDescription>{errorInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-600 text-center">
            {errorInfo.message}
          </p>

          {resendSuccess ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                인증 이메일을 다시 발송했습니다. 이메일을 확인해 주세요.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleResendEmail} className="space-y-4">
              <div>
                <Label htmlFor="email">이메일 주소</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={resending}
                />
              </div>

              {resendError && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {resendError}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={resending || !email}
              >
                {resending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    인증 이메일 재전송 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    인증 이메일 재전송
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/register')}
            >
              새로 회원가입하기
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              로그인 페이지로 돌아가기
            </Button>
          </div>

          <div className="text-center text-xs text-gray-500 pt-4 border-t">
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