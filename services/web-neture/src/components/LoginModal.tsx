/**
 * LoginModal - 로그인 오버레이 모달
 * 현재 페이지 위에 오버레이로 표시되어 메뉴 등이 보임
 * 테스트 계정 버튼 포함 (운영자/공급자/파트너)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth, ROLE_DASHBOARDS } from '../contexts';

// 테스트 계정 (비밀번호 통일: TestPassword)
const TEST_PASSWORD = 'TestPassword';
const testAccounts = [
  { email: 'admin-neture@o4o.com', password: TEST_PASSWORD, label: '운영자', color: 'red' },
  { email: 'supplier-neture@o4o.com', password: TEST_PASSWORD, label: '공급자', color: 'green' },
  { email: 'partner-neture@o4o.com', password: TEST_PASSWORD, label: '파트너', color: 'blue' },
];

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnUrl?: string;
}

export default function LoginModal({ isOpen, onClose, returnUrl }: LoginModalProps) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // 배경 스크롤 방지
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // 테스트 계정 정보를 입력 필드에 채우기
  const fillTestAccount = (account: { email: string; password: string }) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        throw new Error(result.error || '로그인에 실패했습니다.');
      }

      // 로그인 성공
      onClose();
      if (returnUrl) {
        navigate(returnUrl);
      } else {
        const dashboardPath = result.role ? ROLE_DASHBOARDS[result.role] : '/';
        navigate(dashboardPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getAccountButtonStyle = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; hover: string }> = {
      red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', hover: 'hover:bg-red-100' },
      green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', hover: 'hover:bg-green-100' },
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:bg-blue-100' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* 반투명 배경 - 뒤의 콘텐츠가 보임 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 모달 카드 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌿</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Neture 로그인</h2>
              <p className="text-xs text-gray-500">공급자 연결 서비스</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* 테스트 계정 버튼 */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 mb-3 text-center">테스트 계정 (클릭 시 자동 입력)</p>
            <div className="grid grid-cols-3 gap-2">
              {testAccounts.map((account) => {
                const style = getAccountButtonStyle(account.color);
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillTestAccount(account)}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${style.bg} ${style.border} ${style.text} ${style.hover}`}
                  >
                    {account.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400">또는 직접 입력</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                required
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 회원가입 링크 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              아직 계정이 없으신가요?{' '}
              <a
                href="/register"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  navigate('/register');
                }}
                className="text-green-600 font-medium hover:text-green-700"
              >
                회원가입
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
