import { FC, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { cookieAuthClient } from '@o4o/auth-client';
import { Button } from '@o4o/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription } from '@o4o/ui';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

type ErrorType = 'invalid' | 'expired' | 'used' | 'server';

export const ResetPassword: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(5);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ResetPasswordFormData>({
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  const password = watch('password');

  useEffect(() => {
    if (!token) {
      setError('비밀번호 재설정 링크가 올바르지 않습니다.');
      setErrorType('invalid');
    }
  }, [token]);

  useEffect(() => {
    // 성공 시 자동 리다이렉트 카운트다운
    if (isSuccess && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isSuccess && countdown === 0) {
      navigate('/login');
    }
  }, [isSuccess, countdown, navigate]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    setErrorType(null);
    
    try {
      const response = await cookieAuthClient.api.post<ResetPasswordResponse>(
        '/auth/v2/reset-password',
        {
          token,
          password: data.password
        }
      );
      
      if (response.data.success) {
        setIsSuccess(true);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || '';
      
      if (message.includes('expired')) {
        setError('비밀번호 재설정 링크가 만료되었습니다. 다시 요청해주세요.');
        setErrorType('expired');
      } else if (message.includes('invalid')) {
        setError('유효하지 않은 비밀번호 재설정 링크입니다.');
        setErrorType('invalid');
      } else if (message.includes('already used')) {
        setError('이미 사용된 비밀번호 재설정 링크입니다.');
        setErrorType('used');
      } else {
        setError('비밀번호 재설정 중 오류가 발생했습니다.');
        setErrorType('server');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold">잘못된 접근입니다</CardTitle>
            <CardDescription>
              비밀번호 재설정 링크가 올바르지 않습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate('/auth/forgot-password')}
            >
              비밀번호 재설정 다시 요청하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">비밀번호가 변경되었습니다!</CardTitle>
            <CardDescription>
              새로운 비밀번호로 로그인해주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-sm text-gray-600">
              {countdown}초 후 로그인 페이지로 이동합니다...
            </p>
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              지금 로그인하기
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
          <CardTitle className="text-2xl font-bold">새 비밀번호 설정</CardTitle>
          <CardDescription>
            안전한 새 비밀번호를 입력해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                새 비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: '비밀번호를 입력해주세요',
                    minLength: {
                      value: 8,
                      message: '비밀번호는 최소 8자 이상이어야 합니다'
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                      message: '대소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다'
                    }
                  })}
                  className={`w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="********"
                  disabled={isLoading}
                />
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 확인
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: '비밀번호를 다시 입력해주세요',
                    validate: value => value === password || '비밀번호가 일치하지 않습니다'
                  })}
                  className={`w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="********"
                  disabled={isLoading}
                />
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Password Requirements */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <p className="font-medium mb-1">비밀번호 요구사항:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>최소 8자 이상</li>
                  <li>대문자 1개 이상</li>
                  <li>소문자 1개 이상</li>
                  <li>숫자 1개 이상</li>
                  <li>특수문자 1개 이상 (@$!%*?&)</li>
                </ul>
              </AlertDescription>
            </Alert>

            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  비밀번호 변경 중...
                </>
              ) : (
                '비밀번호 변경'
              )}
            </Button>

            {errorType === 'expired' && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/auth/forgot-password')}
              >
                비밀번호 재설정 다시 요청하기
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;