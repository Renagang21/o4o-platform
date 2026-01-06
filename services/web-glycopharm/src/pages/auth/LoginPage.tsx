import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  // 테스트 계정 (데이터베이스에 등록된 실제 계정)
  // API 서버 역할: seller -> 약국(pharmacy), admin -> 운영자(operator)
  const testAccounts = [
    { email: 'seller@test.com', password: 'test123!@#', label: '약국 (seller)', color: 'primary' },
    { email: 'admin@test.com', password: 'test123!@#', label: '운영자 (admin)', color: 'red' },
  ];

  // 테스트 계정 정보를 입력 필드에 채우기 (자동 로그인 아님)
  const fillTestAccount = (account: { email: string; password: string }) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/30">
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">로그인</h1>
          <p className="text-slate-500 mt-2">GlycoPharm에 오신 것을 환영합니다</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="example@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="비밀번호를 입력하세요"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-600">로그인 상태 유지</span>
              </label>
              <a href="#" className="text-sm text-primary-600 hover:text-primary-700">
                비밀번호 찾기
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/25"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  로그인 중...
                </span>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-center text-sm text-slate-500 mb-4">
              계정이 없으신가요?{' '}
              <NavLink to="/register" className="text-primary-600 font-medium hover:text-primary-700">
                회원가입
              </NavLink>
            </p>
          </div>

          {/* 테스트 계정 */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-slate-400 text-center mb-3">테스트 계정 (클릭 시 입력됨)</p>
            <div className="space-y-2">
              {testAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillTestAccount(account)}
                  className="w-full px-4 py-3 text-left rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-1 ${
                        account.color === 'primary' ? 'bg-primary-100 text-primary-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {account.label}
                      </span>
                      <p className="text-sm text-slate-600">{account.email}</p>
                    </div>
                    <span className="text-xs text-slate-400">클릭하여 입력</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
