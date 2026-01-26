import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 테스트 계정 목록 (비밀번호 통일: TestPassword)
const TEST_PASSWORD = 'TestPassword';
const TEST_ACCOUNTS = [
  { label: '약사', email: 'pharmacist@o4o.com', password: TEST_PASSWORD, role: 'pharmacist' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // 역할에 따른 대시보드 경로
  const getDashboardPath = (role: string) => {
    return role === 'admin' ? '/admin' : '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        // 로그인한 계정의 역할 확인
        const account = TEST_ACCOUNTS.find(a => a.email === email);
        const path = account ? getDashboardPath(account.role) : '/';
        navigate(path);
      } else {
        setError(result.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 테스트 계정 정보를 입력 필드에 채우기
  const fillTestAccount = (account: { email: string; password: string }) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">GlucoseView</h1>
          <p className="text-slate-500 mt-2">약국 CGM 데이터 관리 서비스</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">로그인</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">로그인 상태 유지</span>
              </label>
              <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                비밀번호 찾기
              </a>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 테스트 계정 */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-3">테스트 계정 (클릭 시 입력됨)</p>
            <div className="space-y-2">
              {TEST_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillTestAccount(account)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700">
                      {account.label}
                    </span>
                    <span className="text-sm text-slate-600">{account.email}</span>
                  </div>
                  <span className="text-xs text-slate-400">클릭하여 입력</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-400 text-center mt-6">
          GlucoseView v1.0.0 (Beta)
        </p>
      </div>
    </div>
  );
}
