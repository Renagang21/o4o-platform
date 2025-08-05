import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { LoginFormData, AuthErrorCode } from '@/types/auth';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@o4o/ui';
import { SocialLoginButtons } from './SocialLoginButtons';
import { LoginSecurityStatus } from './LoginSecurityStatus';

export const LoginFormWithSocial = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<{
    remainingAttempts?: number;
    lockedUntil?: Date | null;
  }>({});
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    try {
      const response = await login(data);
      
      if (response.success && response.user) {
        // Navigate based on user role
        switch (response.user.role) {
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
      } else {
        // Handle specific error codes
        switch (response.error?.code) {
          case AuthErrorCode.INVALID_CREDENTIALS:
            setError('password', { 
              message: '이메일 또는 비밀번호가 올바르지 않습니다' 
            });
            break;
          case AuthErrorCode.ACCOUNT_NOT_ACTIVE:
            setError('email', { 
              message: '계정이 활성화되지 않았습니다. 관리자 승인을 기다려주세요.' 
            });
            break;
          case AuthErrorCode.EMAIL_NOT_VERIFIED:
            // Redirect to email verification pending page
            navigate('/auth/verify-email/pending?email=' + encodeURIComponent(data.email));
            break;
          case AuthErrorCode.ACCOUNT_LOCKED:
            setSecurityStatus({
              lockedUntil: response.error?.lockedUntil
            });
            setError('email', { 
              message: '계정이 일시적으로 잠겼습니다' 
            });
            break;
          case AuthErrorCode.TOO_MANY_ATTEMPTS:
            setSecurityStatus({
              remainingAttempts: response.error?.remainingAttempts
            });
            setError('email', { 
              message: response.message || '너무 많은 로그인 시도가 있었습니다' 
            });
            break;
          default:
            if (response.error?.remainingAttempts !== undefined) {
              setSecurityStatus({
                remainingAttempts: response.error.remainingAttempts
              });
            }
            setError('email', { 
              message: response.message || '로그인 중 오류가 발생했습니다' 
            });
        }
      }
    } catch (error) {
      setError('email', { 
        message: '네트워크 오류가 발생했습니다. 다시 시도해주세요.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-text-main">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            O4O 플랫폼에 오신 것을 환영합니다
          </p>
        </div>

        {/* Security Status Alert */}
        <LoginSecurityStatus 
          remainingAttempts={securityStatus.remainingAttempts}
          lockedUntil={securityStatus.lockedUntil}
          error={errors.email?.message}
        />

        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          {/* Social Login Buttons */}
          <div>
            <SocialLoginButtons disabled={isLoading} />
          </div>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">또는</span>
              </div>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <div className="relative">
                <input
                  type="email"
                  {...register('email', {
                    required: '이메일을 입력해주세요',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: '올바른 이메일 형식이 아닙니다'
                    }
                  })}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="example@email.com"
                  disabled={isLoading}
                />
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: '비밀번호를 입력해주세요'
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">로그인 상태 유지</span>
              </label>
              <Link
                to="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                비밀번호 찾기
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            아직 계정이 없으신가요?{' '}
            <Link
              to="/auth/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              회원가입
            </Link>
          </p>
        </div>

        {/* Security Notice */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>🔒 안전한 SSL 연결로 보호됩니다</p>
          <p>개인정보는 암호화되어 안전하게 저장됩니다</p>
        </div>
      </div>
    </div>
  );
};

export default LoginFormWithSocial;