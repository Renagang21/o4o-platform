import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { RegisterFormData, AuthErrorCode } from '@/types/auth';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@o4o/ui';

export const RegisterForm = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch
  } = useForm<RegisterFormData>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      termsAccepted: false,
      privacyAccepted: false,
      marketingAccepted: false
    }
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    
    try {
      const response = await registerUser(data);
      
      if (response.success) {
        navigate('/auth/verify-email/pending?email=' + encodeURIComponent(data.email));
      } else {
        // Handle specific error codes
        switch (response.error?.code) {
          case AuthErrorCode.EMAIL_ALREADY_EXISTS:
            setError('email', { 
              message: '이미 등록된 이메일입니다' 
            });
            break;
          case AuthErrorCode.WEAK_PASSWORD:
            setError('password', { 
              message: response.message || '비밀번호가 보안 요구사항을 충족하지 않습니다' 
            });
            break;
          default:
            setError('email', { 
              message: response.message || '회원가입 중 오류가 발생했습니다' 
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
            회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            O4O 플랫폼에 가입하고 다양한 서비스를 이용하세요
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register('name', {
                    required: '이름을 입력해주세요',
                    minLength: {
                      value: 2,
                      message: '이름은 2자 이상이어야 합니다'
                    }
                  })}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="홍길동"
                  disabled={isLoading}
                />
                <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

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
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="ml-2 text-sm text-blue-800">
                  <p className="font-medium mb-1">비밀번호 요구사항:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>최소 8자 이상</li>
                    <li>대문자 1개 이상</li>
                    <li>소문자 1개 이상</li>
                    <li>숫자 1개 이상</li>
                    <li>특수문자 1개 이상 (@$!%*?&)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-3">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  {...register('termsAccepted', {
                    required: '이용약관에 동의해야 합니다'
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">
                  <Link to="/terms" className="text-blue-600 hover:text-blue-500">이용약관</Link>에 동의합니다 (필수)
                </span>
              </label>
              {errors.termsAccepted && (
                <p className="text-red-500 text-sm ml-6">{errors.termsAccepted.message}</p>
              )}

              <label className="flex items-start">
                <input
                  type="checkbox"
                  {...register('privacyAccepted', {
                    required: '개인정보처리방침에 동의해야 합니다'
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-500">개인정보처리방침</Link>에 동의합니다 (필수)
                </span>
              </label>
              {errors.privacyAccepted && (
                <p className="text-red-500 text-sm ml-6">{errors.privacyAccepted.message}</p>
              )}

              <label className="flex items-start">
                <input
                  type="checkbox"
                  {...register('marketingAccepted')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">
                  마케팅 정보 수신에 동의합니다 (선택)
                </span>
              </label>
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
                  회원가입 중...
                </>
              ) : (
                '회원가입'
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            이미 계정이 있으신가요?{' '}
            <Link
              to="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;