import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// 샘플 지부/분회 데이터
const sampleBranches = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: '서울지부',
    chapters: [
      { id: 'a1111111-1111-1111-1111-111111111111', name: '강남분회' },
      { id: 'a2222222-2222-2222-2222-222222222222', name: '서초분회' },
      { id: 'a3333333-3333-3333-3333-333333333333', name: '송파분회' },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: '경기지부',
    chapters: [
      { id: 'b1111111-1111-1111-1111-111111111111', name: '수원분회' },
      { id: 'b2222222-2222-2222-2222-222222222222', name: '성남분회' },
      { id: 'b3333333-3333-3333-3333-333333333333', name: '용인분회' },
    ],
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: '부산지부',
    chapters: [
      { id: 'c1111111-1111-1111-1111-111111111111', name: '해운대분회' },
      { id: 'c2222222-2222-2222-2222-222222222222', name: '동래분회' },
      { id: 'c3333333-3333-3333-3333-333333333333', name: '사상분회' },
    ],
  },
];

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    licenseNumber: '',
    realName: '',
    displayName: '',
    phone: '',
    email: '',
    password: '',
    passwordConfirm: '',
    branchId: '',
    chapterId: '',
    pharmacyName: '',
  });

  const [chapters, setChapters] = useState<{ id: string; name: string }[]>([]);

  // 지부 선택 시 분회 목록 업데이트
  useEffect(() => {
    if (form.branchId) {
      const branch = sampleBranches.find(b => b.id === form.branchId);
      setChapters(branch?.chapters || []);
      setForm(prev => ({ ...prev, chapterId: '' }));
    } else {
      setChapters([]);
    }
  }, [form.branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (!form.licenseNumber || !form.realName || !form.displayName ||
        !form.phone || !form.email || !form.password ||
        !form.branchId || !form.chapterId || !form.pharmacyName) {
      setError('모든 필수 항목을 입력해주세요.');
      return;
    }

    // 핸드폰 번호 검증
    const normalizedPhone = form.phone.replace(/\D/g, '');
    if (!/^\d{10,11}$/.test(normalizedPhone)) {
      setError('핸드폰 번호는 10~11자리 숫자여야 합니다.');
      return;
    }

    // 비밀번호 강도 검증
    const passwordChecks = {
      length: form.password.length >= 8,
      lowercase: /[a-z]/.test(form.password),
      uppercase: /[A-Z]/.test(form.password),
      number: /\d/.test(form.password),
      special: /[@$!%*?&]/.test(form.password),
    };
    const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

    if (!isPasswordStrong) {
      setError('비밀번호는 8자 이상, 영문 대/소문자, 숫자, 특수문자를 포함해야 합니다.');
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.realName,
          phone: normalizedPhone,
          role: 'pharmacist',
          service: 'glucoseview',
          licenseNumber: form.licenseNumber || undefined,
          displayName: form.displayName || undefined,
          pharmacyName: form.pharmacyName || undefined,
          branchId: form.branchId || undefined,
          chapterId: form.chapterId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          const msg = (data.error || '').toLowerCase();
          if (msg.includes('license') || msg.includes('면허')) {
            throw new Error('이미 등록된 면허번호입니다. 기존 계정으로 로그인해 주세요.');
          }
          throw new Error('이미 가입된 이메일입니다. 기존 계정으로 로그인해 주세요.');
        }
        throw new Error(data.error || '회원가입에 실패했습니다.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.');
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
          <p className="text-slate-500">약사 회원가입</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 면허번호 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                약사 면허번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                placeholder="예: 12345"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 이름 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  이름 (본명) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.realName}
                  onChange={(e) => setForm({ ...form, realName: e.target.value })}
                  placeholder="홍길동"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  표시 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="사이트에서 보일 이름"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
                placeholder="example@email.com"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="영문 대/소문자, 숫자, 특수문자 포함"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.password && (
                <ul className="mt-2 space-y-1">
                  {[
                    { check: form.password.length >= 8, label: '8자 이상' },
                    { check: /[a-z]/.test(form.password), label: '영문 소문자 포함' },
                    { check: /[A-Z]/.test(form.password), label: '영문 대문자 포함' },
                    { check: /\d/.test(form.password), label: '숫자 포함' },
                    { check: /[@$!%*?&]/.test(form.password), label: '특수문자(@$!%*?&) 포함' },
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

            {/* 지부/분회 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  지부 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">지부 선택</option>
                  {sampleBranches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  분회 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.chapterId}
                  onChange={(e) => setForm({ ...form, chapterId: e.target.value })}
                  disabled={!form.branchId}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">분회 선택</option>
                  {chapters.map(chapter => (
                    <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 약국명 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                약국명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.pharmacyName}
                onChange={(e) => setForm({ ...form, pharmacyName: e.target.value })}
                placeholder="약국 이름"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                같은 분회 내에서 중복된 약국명은 사용할 수 없습니다.
              </p>
            </div>

            {/* 안내 */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-700">
                  회원가입 신청 후 관리자 승인이 필요합니다. 승인이 완료되면 서비스를 이용하실 수 있습니다.
                </p>
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
