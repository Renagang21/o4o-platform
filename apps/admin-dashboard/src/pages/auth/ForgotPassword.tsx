import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { authClient } from '@o4o/auth-client';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authClient.api.post('/auth/forgot-password', { email });

      if (response.data.success) {
        setIsSubmitted(true);
      } else {
        setError(response.data.message || '비밀번호 재설정 요청에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '서버와의 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              이메일을 확인해주세요
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              입력하신 이메일 주소로 비밀번호 재설정 링크를 보내드렸습니다.
            </p>
            <p className="mt-1 text-sm text-gray-600">
              메일이 도착하지 않았다면 스팸 폴더를 확인해주세요.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <Link
              to="/login"
              className="group relative w-full flex justify-center items-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-admin-blue"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              로그인 페이지로 돌아가기
            </Link>
            
            <button
              onClick={() => {
                setIsSubmitted(false);
                setEmail('');
              }}
              className="w-full text-sm text-admin-blue hover:text-admin-blue-dark"
            >
              다른 이메일로 재시도
            </button>
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
            비밀번호 재설정
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            가입하신 이메일 주소를 입력하시면
            <br />
            비밀번호 재설정 링크를 보내드립니다.
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

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                이메일 주소
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-admin-blue focus:border-admin-blue focus:z-10 sm:text-sm"
                  placeholder="이메일 주소"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-admin-blue hover:bg-admin-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-admin-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span>처리 중...</span>
              ) : (
                <span>비밀번호 재설정 링크 보내기</span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/login"
              className="text-sm text-admin-blue hover:text-admin-blue-dark"
            >
              <ArrowLeft className="inline h-4 w-4 mr-1" />
              로그인으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;