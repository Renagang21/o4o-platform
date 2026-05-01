/**
 * LoginPage - K-Cosmetics
 * Based on GlycoPharm LoginPage structure
 * WO-O4O-KCOS-AUTH-DESIGN-POLISH-V1: inline style → Tailwind, hex → theme, Card/Button 적용
 */

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, getKCosmeticsDashboardRoute } from '@/contexts/AuthContext';
import { Card, Button } from '@o4o/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const returnUrl = (location.state as any)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        throw new Error(result.error || '로그인에 실패했습니다.');
      }
      // WO-K-COSMETICS-ROLE-BASED-LANDING-V1: 역할 기반 리다이렉트
      navigate(returnUrl || (result.role ? getKCosmeticsDashboardRoute([result.role]) : '/'));
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-6">
      <Card className="w-full max-w-[400px] p-12 text-center">
        <div className="text-5xl mb-4">💄</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2 mt-0">로그인</h1>
        <p className="text-sm text-slate-500 mb-8 mt-0">K-Cosmetics에 오신 것을 환영합니다</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-base outline-none transition-colors focus:border-primary"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">비밀번호</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-lg text-base outline-none transition-colors focus:border-primary"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-1 cursor-pointer text-slate-400 flex items-center justify-center"
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary" />
              <span>로그인 상태 유지</span>
            </label>
            <Link to="/forgot-password" className="text-sm text-primary no-underline hover:underline">
              비밀번호 찾기
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full h-12 text-base mt-2"
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        {/* 테스트 계정 빠른 로그인 */}
        <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
          <p className="text-center text-xs text-slate-400 mb-2.5 mt-0">테스트 계정</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => { setEmail('store-owner-kcosmetics@o4o.com'); setPassword('O4oTestPass@1'); setError(null); }}
            className={`w-full py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg transition-colors ${
              loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-100'
            }`}
          >
            매장 경영자 로그인
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center">
          <Link to="/" className="text-sm font-medium text-primary no-underline hover:underline">홈으로 돌아가기</Link>
        </div>
      </Card>
    </div>
  );
}
