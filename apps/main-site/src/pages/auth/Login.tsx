import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { LoginRequest } from '../../types/user';
import { defaultAccounts } from '../../mocks/users';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [selectedUserType, setSelectedUserType] = useState<string>('customer');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginRequest>({
    defaultValues: {
      userType: 'customer',
    },
  });

  const userTypes = [
    { value: 'customer', label: '일반 고객', icon: '🛒' },
    { value: 'retailer', label: '리테일러', icon: '🏪' },
    { value: 'supplier', label: '공급자', icon: '📦' },
    { value: 'admin', label: '관리자', icon: '⚙️' },
  ];

  const onSubmit = async (data: LoginRequest) => {
    try {
      clearError();
      await login({
        ...data,
        userType: selectedUserType,
      });
      
      // 사용자 타입별 대시보드로 이동
      switch (selectedUserType) {
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
          navigate('/shop');
          break;
        default:
          navigate('/');
      }
      
      toast.success('로그인되었습니다.');
    } catch (err) {
      toast.error('로그인에 실패했습니다.');
    }
  };

  // 테스트 계정으로 자동 입력
  const fillTestAccount = (userType: string) => {
    const account = defaultAccounts[userType as keyof typeof defaultAccounts];
    if (account) {
      setValue('email', account.email);
      setValue('password', account.password);
      setSelectedUserType(userType);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            O4O Platform
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            사용자 유형을 선택하고 로그인하세요
          </p>
        </div>

        {/* 사용자 타입 선택 */}
        <div className="grid grid-cols-2 gap-3">
          {userTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setSelectedUserType(type.value)}
              className={`relative rounded-lg border p-4 flex flex-col items-center cursor-pointer transition-all ${
                selectedUserType === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-2xl mb-1">{type.icon}</div>
              <div className="text-sm font-medium">{type.label}</div>
              {selectedUserType === type.value && (
                <div className="absolute top-2 right-2">
                  <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* 로그인 폼 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                이메일
              </label>
              <input
                {...register('email', {
                  required: '이메일을 입력하세요',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: '올바른 이메일 형식이 아닙니다',
                  },
                })}
                type="email"
                autoComplete="email"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="이메일"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <input
                {...register('password', {
                  required: '비밀번호를 입력하세요',
                })}
                type="password"
                autoComplete="current-password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to={`/auth/register/${selectedUserType}`} className="font-medium text-blue-600 hover:text-blue-500">
                회원가입
              </Link>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                비밀번호 찾기
              </a>
            </div>
          </div>
        </form>

        {/* 테스트 계정 정보 (개발용) */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-600 text-center mb-3">테스트 계정</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(defaultAccounts).map(([type, account]) => (
              <button
                key={type}
                type="button"
                onClick={() => fillTestAccount(type)}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors"
              >
                {type}: {account.email}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            비밀번호: {defaultAccounts.customer.password}
          </p>
        </div>
      </div>
    </div>
  );
} 