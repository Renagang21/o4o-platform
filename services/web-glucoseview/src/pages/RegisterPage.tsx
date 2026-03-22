/**
 * RegisterPage — WO-O4O-GLUCOSEVIEW-REGISTER-ROLE-MISMATCH-FIX-V1
 *
 * GlucoseView는 당뇨인(환자) 전용 서비스.
 * 환자 회원가입만 지원. 약사/약국 가입은 GlycoPharm에서 진행.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/apiClient';

const SERVICE_LABELS: Record<string, string> = {
  'neture': 'Neture',
  'glycopharm': 'GlycoPharm',
  'glucoseview': 'GlucoseView',
  'k-cosmetics': 'K-Cosmetics',
  'kpa-society': '대한약사회',
  'platform': 'O4O 플랫폼',
};

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });

  const [existingAccountMode, setExistingAccountMode] = useState(false);
  const [existingServices, setExistingServices] = useState<Array<{key: string, status: string}>>([]);

  const handleEmailBlur = async () => {
    if (!form.email || !form.email.includes('@')) return;
    try {
      const res = await api.post('/auth/check-email', { email: form.email, service: 'glucoseview' });
      const data = res.data;
      if (data.success && data.data.exists) {
        if (data.data.alreadyJoined) {
          setError('이미 해당 서비스에 가입된 계정입니다. 로그인해 주세요.');
        } else {
          setExistingAccountMode(true);
          setExistingServices(data.data.services || []);
        }
      } else {
        setExistingAccountMode(false);
        setExistingServices([]);
      }
    } catch { /* silent */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.phone || !form.email || !form.password) {
      setError('모든 필수 항목을 입력해주세요.');
      return;
    }

    const normalizedPhone = form.phone.replace(/\D/g, '');
    if (!/^\d{10,11}$/.test(normalizedPhone)) {
      setError('핸드폰 번호는 10~11자리 숫자여야 합니다.');
      return;
    }

    if (!existingAccountMode) {
      const passwordChecks = {
        length: form.password.length >= 8,
        letter: /[a-zA-Z]/.test(form.password),
        number: /\d/.test(form.password),
        special: /[^A-Za-z\d\s]/.test(form.password),
      };
      const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

      if (!isPasswordStrong) {
        setError('비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.');
        return;
      }

      if (form.password !== form.passwordConfirm) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
    }

    setIsLoading(true);

    try {
      await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        name: form.name,
        phone: normalizedPhone,
        role: 'user',
        service: 'glucoseview',
      });

      setSuccess(true);
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 401 && data?.code === 'PASSWORD_MISMATCH') {
        setExistingAccountMode(true);
        if (data.services) setExistingServices(data.services);
        setError('비밀번호가 일치하지 않습니다. O4O 계정 가입 시 사용한 기존 비밀번호를 입력해주세요.');
      } else if (status === 409) {
        if (data?.code === 'SERVICE_ALREADY_JOINED') {
          setError('이미 해당 서비스에 가입된 계정입니다. 로그인해 주세요.');
        } else {
          setError('이미 가입된 이메일입니다. 기존 계정으로 로그인해 주세요.');
        }
      } else if (data?.error) {
        setError(data.error);
      } else {
        setError(err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            회원가입 완료
          </h1>

          <p className="text-slate-500 mb-6">
            회원가입 신청이 완료되었습니다.<br />
            관리자 승인 후 서비스를 이용하실 수 있습니다.
          </p>

          <Link
            to="/"
            className="block w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-center"
          >
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <h1 className="text-2xl font-bold text-slate-900">GlucoseView</h1>
          </Link>
          <p className="text-slate-500">당뇨인 회원가입</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="홍길동"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 핸드폰 번호 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                핸드폰 번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                placeholder="하이픈(-) 없이 숫자만 입력"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                숫자만 입력 (예: 01012345678)
              </p>
              {form.phone && !/^\d{10,11}$/.test(form.phone) && (
                <p className="text-xs text-red-500 mt-1">
                  핸드폰 번호는 10~11자리 숫자여야 합니다
                </p>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                이메일 (로그인 ID) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onBlur={handleEmailBlur}
                placeholder="example@email.com"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {existingAccountMode && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3">
                <p className="font-semibold text-sm">이미 O4O 플랫폼 계정이 존재합니다</p>
                <p className="text-sm mt-1">기존 비밀번호를 입력하면 GlucoseView 서비스 가입이 진행됩니다.</p>
                {existingServices.length > 0 && (
                  <p className="text-xs mt-1 text-blue-600">
                    가입된 서비스: {existingServices.map(s => SERVICE_LABELS[s.key] || s.key).join(', ')}
                  </p>
                )}
                <div className="mt-2 text-xs space-x-2">
                  <Link to="/login" className="text-blue-700 underline">로그인</Link>
                  <span>·</span>
                  <Link to="/forgot-password" className="text-blue-700 underline">비밀번호 찾기</Link>
                </div>
              </div>
            )}

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {existingAccountMode ? '기존 비밀번호' : '비밀번호'} <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {!existingAccountMode && form.password && (
                <ul className="mt-2 space-y-1">
                  {[
                    { check: form.password.length >= 8, label: '8자 이상' },
                    { check: /[a-zA-Z]/.test(form.password), label: '영문 포함' },
                    { check: /\d/.test(form.password), label: '숫자 포함' },
                    { check: /[^A-Za-z\d\s]/.test(form.password), label: '특수문자 포함' },
                  ].map(({ check, label }) => (
                    <li key={label} className={`flex items-center gap-1.5 text-xs ${check ? 'text-green-600' : 'text-slate-400'}`}>
                      {check ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2} /></svg>
                      )}
                      {label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 비밀번호 확인 */}
            {!existingAccountMode && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                비밀번호 확인 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                placeholder="비밀번호 재입력"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.passwordConfirm && form.password !== form.passwordConfirm && (
                <p className="text-xs text-red-500 mt-1">
                  비밀번호가 일치하지 않습니다
                </p>
              )}
            </div>
            )}

            {/* 안내 */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs text-blue-700">
                    회원가입 신청 후 관리자 승인이 필요합니다. 승인이 완료되면 서비스를 이용하실 수 있습니다.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    약사/약국 종사자는 <a href="https://glycopharm.o4o.kr" className="underline font-medium">GlycoPharm</a>을 이용해 주세요.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '가입 신청 중...' : '회원가입 신청'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="text-blue-600 hover:underline">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
