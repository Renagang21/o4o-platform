/**
 * ResetPasswordPage - 비밀번호 재설정
 * WO-O4O-ACCOUNT-RECOVERY-UNIFICATION-V1
 *
 * 이메일 링크에서 진입: /reset-password?token=xxx
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

const PASSWORD_RULES = [
  { key: 'length', label: '8자 이상', test: (p: string) => p.length >= 8 },
  { key: 'upper', label: '대문자 포함', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', label: '소문자 포함', test: (p: string) => /[a-z]/.test(p) },
  { key: 'digit', label: '숫자 포함', test: (p: string) => /\d/.test(p) },
  { key: 'special', label: '특수문자 포함', test: (p: string) => /[!@#$%^&*]/.test(p) },
];

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allRulesPassed && passwordsMatch && !isLoading;

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => navigate('/login'), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  if (!token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold text-slate-900">유효하지 않은 링크</h2>
          <p className="text-sm text-slate-600">
            비밀번호 재설정 링크가 올바르지 않습니다. 다시 요청해주세요.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-6 py-2.5 text-sm font-medium bg-pink-600 text-white rounded-xl hover:bg-pink-700"
          >
            비밀번호 찾기로 이동
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="text-xl font-bold text-slate-900">비밀번호 변경 완료</h2>
          <p className="text-sm text-slate-600">
            새로운 비밀번호로 로그인해주세요. 3초 후 로그인 페이지로 이동합니다.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 text-sm font-medium bg-pink-600 text-white rounded-xl hover:bg-pink-700"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSuccess(true);
      } else {
        setError(data.error || data.message || '비밀번호 재설정에 실패했습니다. 링크가 만료되었을 수 있습니다.');
      }
    } catch {
      setError('서버와의 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">비밀번호 재설정</h2>
          <p className="mt-2 text-sm text-slate-500">새로운 비밀번호를 설정해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">새 비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="새 비밀번호"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호 확인</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="비밀번호 확인"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password requirements checklist */}
          <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
            {PASSWORD_RULES.map((rule) => (
              <div key={rule.key} className="flex items-center gap-2 text-xs">
                <CheckCircle
                  className={`w-3.5 h-3.5 ${
                    rule.test(password) ? 'text-green-500' : 'text-slate-300'
                  }`}
                />
                <span className={rule.test(password) ? 'text-green-700' : 'text-slate-500'}>
                  {rule.label}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle
                className={`w-3.5 h-3.5 ${passwordsMatch ? 'text-green-500' : 'text-slate-300'}`}
              />
              <span className={passwordsMatch ? 'text-green-700' : 'text-slate-500'}>
                비밀번호 일치
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2.5 text-sm font-medium bg-pink-600 text-white rounded-xl hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '처리 중...' : '비밀번호 변경'}
          </button>
        </form>

        <div className="text-center">
          <Link to="/login" className="text-sm text-pink-600 hover:text-pink-700">
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
