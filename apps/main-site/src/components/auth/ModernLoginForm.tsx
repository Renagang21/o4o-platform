import { useEffect, FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';

interface LoginState {
  success: boolean;
  error?: string;
  data?: {
    email: string;
    userRole: string;
    isApproved: boolean;
  };
}

interface LoginFormData {
  email: string;
  password: string;
}

// React 19 Actions - 서버 액션을 시뮬레이션
async function loginAction(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // 폼 유효성 검사
  if (!email.trim()) {
    return { success: false, error: '이메일을 입력해주세요' };
  }
  
  if (!/\S+@\S+\.\S+/.test(email)) {
    return { success: false, error: '유효한 이메일 주소를 입력해주세요' };
  }

  if (!password) {
    return { success: false, error: '비밀번호를 입력해주세요' };
  }

  // API 호출 시뮬레이션
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 랜덤하게 성공/실패 시뮬레이션
  if (Math.random() > 0.3) {
    const userRole = ['admin', 'seller', 'supplier', 'yaksa'][Math.floor(Math.random() * 4)];
    const isApproved = userRole === 'admin' || Math.random() > 0.5;
    
    return {
      success: true,
      data: {
        email,
        userRole,
        isApproved
      }
    };
  } else {
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }
}

const ModernLoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // React 19 useActionState - form 상태와 액션을 통합 관리
  const [state, formAction, isPending] = useActionState(loginAction, {
    success: false,
    error: undefined,
    data: undefined
  });

  // React 19 useOptimistic - 낙관적 업데이트를 위한 상태
  const [optimisticMessage, setOptimisticMessage] = useOptimistic('');

  // 로그인 성공 시 리다이렉트 처리
  React.useEffect(() => {
    if (state.success && state.data) {
      const { userRole, isApproved } = state.data;
      
      if (!isApproved && ['seller', 'supplier', 'yaksa'].includes(userRole)) {
        navigate('/pending', {
          state: {
            role: userRole,
            message: '승인이 완료되지 않았습니다. 승인 완료 시 알려드리겠습니다.'
          }
        });
      } else {
        setOptimisticMessage('로그인 성공! 대시보드로 이동합니다...');
        setTimeout(() => navigate('/dashboard'), 1000);
      }
    }
  }, [state.success, state.data, navigate]);

  // React 19 enhanced form with action
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Modern 로그인 (React 19)
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            useActionState & useOptimistic 활용
          </p>
          
          {/* 위치 상태 메시지 */}
          {location.state?.message && (
            <p className="mt-2 text-center text-sm text-green-600">
              {location.state.message}
            </p>
          )}
          
          {/* 낙관적 업데이트 메시지 */}
          {optimisticMessage && (
            <p className="mt-2 text-center text-sm text-green-600 font-medium">
              {optimisticMessage}
            </p>
          )}
          
          {/* 에러 메시지 */}
          {state.error && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{state.error}</p>
            </div>
          )}
        </div>

        {/* React 19 Enhanced Form with action */}
        <form action={formAction} className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
          <div className="rounded-md shadow-sm space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                이메일
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="이메일 주소"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="비밀번호"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </button>
          </div>

          {/* React 19 기능 설명 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>✨ React 19 Features:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>useActionState: 폼 상태 + 액션 통합</li>
              <li>useOptimistic: 낙관적 업데이트</li>
              <li>Form actions: 자동 pending 관리</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModernLoginForm;
