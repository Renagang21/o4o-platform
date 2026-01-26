import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authClient } from '@o4o/auth-client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setError('유효하지 않은 비밀번호 재설정 링크입니다.');
    }
  }, [token]);

  const validatePassword = () => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('대문자를 하나 이상 포함해야 합니다.');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('소문자를 하나 이상 포함해야 합니다.');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('숫자를 하나 이상 포함해야 합니다.');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('특수문자(!@#$%^&*)를 하나 이상 포함해야 합니다.');
    }
    if (password !== confirmPassword) {
      errors.push('비밀번호가 일치하지 않습니다.');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await authClient.api.post('/auth/reset-password', {
        token,
        password
      });

      if (response.data.success) {
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.data.message || '비밀번호 재설정에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '서버와의 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              비밀번호가 재설정되었습니다
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              새로운 비밀번호로 로그인할 수 있습니다.
            </p>
            <p className="mt-1 text-sm text-gray-600">
              잠시 후 로그인 페이지로 이동합니다...
            </p>
          </div>

          <div className="mt-8">
            <Link
              to="/login"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-admin-blue hover:bg-admin-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-admin-blue"
            >
              지금 로그인하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              유효하지 않은 링크
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.
            </p>
          </div>

          <div className="mt-8">
            <Link
              to="/forgot-password"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-admin-blue hover:bg-admin-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-admin-blue"
            >
              비밀번호 재설정 다시 요청하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            새 비밀번호 설정
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            안전한 새 비밀번호를 입력해주세요.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    비밀번호 요구사항
                  </h3>
                  <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                새 비밀번호
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.length > 0) {
                      validatePassword();
                    }
                  }}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-admin-blue focus:border-admin-blue focus:z-10 sm:text-sm"
                  placeholder="새 비밀번호"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                비밀번호 확인
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (validationErrors.length > 0) {
                      validatePassword();
                    }
                  }}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-admin-blue focus:border-admin-blue focus:z-10 sm:text-sm"
                  placeholder="비밀번호 확인"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">비밀번호 요구사항:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className={password.length >= 8 ? 'text-green-600' : ''}>
                • 최소 8자 이상
              </li>
              <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                • 대문자 포함
              </li>
              <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                • 소문자 포함
              </li>
              <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                • 숫자 포함
              </li>
              <li className={/[!@#$%^&*]/.test(password) ? 'text-green-600' : ''}>
                • 특수문자 포함 (!@#$%^&*)
              </li>
              <li className={password && password === confirmPassword ? 'text-green-600' : ''}>
                • 비밀번호 일치
              </li>
            </ul>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-admin-blue hover:bg-admin-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-admin-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span>비밀번호 재설정 중...</span>
              ) : (
                <span>비밀번호 재설정</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;