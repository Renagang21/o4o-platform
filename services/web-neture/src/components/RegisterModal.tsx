/**
 * RegisterModal - 회원가입 모달
 * WO-O4O-AUTH-MODAL-SIGNUP-ROLE-UPDATE-V1
 *
 * 2단계 구조:
 * Step 1: 역할 선택 (supplier, partner, seller)
 * Step 2: 회원 정보 입력
 * Step 3: 완료 확인
 */

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { useLoginModal } from '../contexts';

type SignupRole = 'supplier' | 'partner' | 'seller';

function formatBusinessNumber(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`;
}

const roleOptions: Array<{ role: SignupRole; label: string; description: string; emoji: string }> = [
  {
    role: 'supplier',
    label: '공급자',
    description: '제품을 공급하는 공급사/제조사',
    emoji: '🏭',
  },
  {
    role: 'partner',
    label: '파트너',
    description: '제품을 홍보하는 파트너',
    emoji: '🤝',
  },
  {
    role: 'seller',
    label: '셀러',
    description: '매장을 운영하는 판매자',
    emoji: '🏪',
  },
];

interface RegisterModalProps {
  isOpen: boolean;
}

const SERVICE_LABELS: Record<string, string> = {
  neture: 'Neture', glycopharm: 'GlycoPharm', glucoseview: 'GlucoseView',
  'k-cosmetics': 'K-Cosmetics', 'kpa-society': '대한약사회', platform: 'O4O 플랫폼',
};

export default function RegisterModal({ isOpen }: RegisterModalProps) {
  const { closeModal, openLoginModal } = useLoginModal();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<SignupRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingAccountMode, setExistingAccountMode] = useState(false);
  const [existingServices, setExistingServices] = useState<Array<{key: string, status: string}>>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    companyName: '',
    businessNumber: '',
    businessType: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedRole(null);
      setShowPassword(false);
      setLoading(false);
      setError(null);
      setExistingAccountMode(false);
      setExistingServices([]);
      setFormData({
        email: '',
        password: '',
        passwordConfirm: '',
        name: '',
        phone: '',
        companyName: '',
        businessNumber: '',
        businessType: '',
        agreeTerms: false,
        agreePrivacy: false,
        agreeMarketing: false,
      });
    }
  }, [isOpen]);

  // ESC 키로 닫기 + 배경 스크롤 방지
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeModal]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name } = target;
    let { value } = target;
    const checked = target instanceof HTMLInputElement ? target.checked : false;
    const type = target instanceof HTMLInputElement ? target.type : 'text';

    if (name === 'phone' || name === 'businessNumber') {
      value = value.replace(/\D/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEmailBlur = async () => {
    if (!formData.email || !formData.email.includes('@')) return;
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const res = await fetch(`${baseUrl}/api/v1/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, service: 'neture' }),
      });
      const result = await res.json();
      if (result.success && result.data.exists) {
        if (result.data.alreadyJoined) {
          setError('이미 Neture 서비스에 가입된 계정입니다. 로그인해 주세요.');
        } else {
          setExistingAccountMode(true);
          setExistingServices(result.data.services || []);
          setError(null);
        }
      } else {
        setExistingAccountMode(false);
        setExistingServices([]);
      }
    } catch { /* silent */ }
  };

  const handleRoleSelect = (role: SignupRole) => {
    setSelectedRole(role);
    setStep(2);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: formData.phone.replace(/\D/g, ''),
          role: selectedRole,
          service: 'neture',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && data.code === 'PASSWORD_MISMATCH') {
          setExistingAccountMode(true);
          if (data.services) setExistingServices(data.services);
          throw new Error('비밀번호가 일치하지 않습니다. O4O 계정 가입 시 사용한 기존 비밀번호를 입력해주세요.');
        }
        if (response.status === 409) {
          if (data.code === 'SERVICE_ALREADY_JOINED') {
            throw new Error('이미 Neture 서비스에 가입된 계정입니다. 로그인해 주세요.');
          }
          throw new Error('이미 가입된 이메일입니다. 기존 계정으로 로그인해 주세요.');
        }
        throw new Error(data.error || '회원가입에 실패했습니다.');
      }

      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = {
    length: formData.password.length >= 8,
    letter: /[a-zA-Z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[^A-Za-z\d\s]/.test(formData.password),
  };
  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

  const isFormValid = () => {
    const base = formData.email && formData.password && formData.name &&
      formData.phone && formData.phone.length >= 10 && formData.phone.length <= 11 &&
      formData.companyName && formData.agreeTerms && formData.agreePrivacy;
    if (existingAccountMode) return base && formData.password.length > 0;
    return base && isPasswordStrong && formData.password === formData.passwordConfirm;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      {/* 반투명 배경 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 모달 카드 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <span className="text-2xl">🌿</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {step === 3 ? '가입 완료' : '회원가입'}
              </h2>
              <p className="text-xs text-gray-500">Neture 유통 정보 플랫폼</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 프로그레스 바 */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-2 px-6 py-3 border-b border-gray-50 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <div className={`w-12 h-1 rounded ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
          </div>
        )}

        {/* 본문 (스크롤) */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Step 1: 역할 선택 */}
          {step === 1 && (
            <div className="text-center">
              <h3 className="text-base font-semibold text-gray-700 mb-5">
                어떤 역할로 가입하시겠습니까?
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {roleOptions.map((option) => (
                  <button
                    key={option.role}
                    onClick={() => handleRoleSelect(option.role)}
                    className="p-4 border-2 border-gray-200 rounded-xl bg-white hover:border-green-500 hover:shadow-md transition-all text-center group"
                  >
                    <span className="text-3xl block mb-2">{option.emoji}</span>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-green-700">
                      {option.label}
                    </h4>
                    <p className="text-xs text-gray-500 leading-tight">{option.description}</p>
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                이미 계정이 있으신가요?{' '}
                <button
                  onClick={() => openLoginModal()}
                  className="text-green-600 font-medium hover:text-green-700 transition-colors"
                >
                  로그인
                </button>
              </p>
            </div>
          )}

          {/* Step 2: 회원 정보 입력 */}
          {step === 2 && (
            <form id="register-form" onSubmit={handleSubmit} className="space-y-4">
              {/* 선택된 역할 표시 */}
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 rounded-lg text-sm text-green-800">
                <span className="text-lg">
                  {roleOptions.find(r => r.role === selectedRole)?.emoji}
                </span>
                <span className="font-medium">
                  {roleOptions.find(r => r.role === selectedRole)?.label}
                </span>
                <span>으로 가입합니다</span>
              </div>

              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleEmailBlur}
                  placeholder="example@company.com"
                  required
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                />
              </div>

              {existingAccountMode && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 text-sm">
                  <p className="font-semibold">이미 O4O 플랫폼 계정이 존재합니다</p>
                  <p className="mt-1 text-xs text-blue-600">기존 비밀번호를 입력하면 Neture 서비스 가입이 진행됩니다.</p>
                  {existingServices.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">가입된 서비스: {existingServices.map(s => SERVICE_LABELS[s.key] || s.key).join(', ')}</p>
                  )}
                  <div className="mt-2 text-xs space-x-3">
                    <button type="button" onClick={() => openLoginModal()} className="text-green-600 hover:underline">로그인</button>
                  </div>
                </div>
              )}

              {/* 비밀번호 */}
              <div className={existingAccountMode ? '' : 'grid grid-cols-2 gap-3'}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {existingAccountMode ? '기존 비밀번호' : '비밀번호'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={existingAccountMode ? 'O4O 계정 비밀번호 입력' : '8자 이상'}
                      required
                      className="w-full px-4 py-3 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {!existingAccountMode && formData.password.length > 0 && !isPasswordStrong && (
                    <div className="mt-1 space-y-0.5 text-xs">
                      <p className={passwordChecks.length ? 'text-green-600' : 'text-red-500'}>
                        {passwordChecks.length ? '✓' : '✗'} 8자 이상
                      </p>
                      <p className={passwordChecks.letter ? 'text-green-600' : 'text-red-500'}>
                        {passwordChecks.letter ? '✓' : '✗'} 영문 포함
                      </p>
                      <p className={passwordChecks.number ? 'text-green-600' : 'text-red-500'}>
                        {passwordChecks.number ? '✓' : '✗'} 숫자 포함
                      </p>
                      <p className={passwordChecks.special ? 'text-green-600' : 'text-red-500'}>
                        {passwordChecks.special ? '✓' : '✗'} 특수문자 포함
                      </p>
                    </div>
                  )}
                </div>
                {!existingAccountMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호 확인 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="passwordConfirm"
                    value={formData.passwordConfirm}
                    onChange={handleInputChange}
                    placeholder="비밀번호 재입력"
                    required
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  />
                  {formData.passwordConfirm.length > 0 && formData.password !== formData.passwordConfirm && (
                    <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다</p>
                  )}
                </div>
                )}
              </div>

              {/* 이름 + 전화번호 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    담당자명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="홍길동"
                    required
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    핸드폰 번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="숫자만 입력"
                    required
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  />
                  {formData.phone.length > 0 && (formData.phone.length < 10 || formData.phone.length > 11) && (
                    <p className="mt-1 text-xs text-red-500">10~11자리 숫자를 입력해주세요</p>
                  )}
                </div>
              </div>

              {/* 사업자 정보 */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">사업자 정보</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    회사명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="OO주식회사"
                    required
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      사업자등록번호
                    </label>
                    <input
                      type="text"
                      name="businessNumber"
                      value={formatBusinessNumber(formData.businessNumber)}
                      onChange={handleInputChange}
                      placeholder="숫자만 입력"
                      maxLength={12}
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      업종
                    </label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="">선택</option>
                      <option value="cosmetics">화장품</option>
                      <option value="health">건강식품</option>
                      <option value="medical">의료기기</option>
                      <option value="food">식품</option>
                      <option value="other">기타</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 동의 항목 */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleInputChange}
                    className="w-4 h-4 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    required
                  />
                  <span>
                    <span className="text-red-500">*</span> 이용약관에 동의합니다{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 underline" onClick={(e) => e.stopPropagation()}>(보기)</a>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreePrivacy"
                    checked={formData.agreePrivacy}
                    onChange={handleInputChange}
                    className="w-4 h-4 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    required
                  />
                  <span>
                    <span className="text-red-500">*</span> 개인정보처리방침에 동의합니다{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 underline" onClick={(e) => e.stopPropagation()}>(보기)</a>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeMarketing"
                    checked={formData.agreeMarketing}
                    onChange={handleInputChange}
                    className="w-4 h-4 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span>마케팅 정보 수신에 동의합니다 (선택)</span>
                </label>
              </div>

            </form>
          )}

          {/* Step 3: 완료 */}
          {step === 3 && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                가입 신청이 완료되었습니다
              </h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                운영자 승인 후 서비스를 이용하실 수 있습니다.<br />
                승인 완료 시 이메일로 안내드리겠습니다.
              </p>
              <button
                onClick={closeModal}
                className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                확인
              </button>
            </div>
          )}
        </div>

        {/* 고정 Footer — Step 2에서만 표시 */}
        {step === 2 && (
          <div className="shrink-0 border-t border-gray-100 px-6 py-4 bg-white">
            <button
              type="submit"
              form="register-form"
              disabled={!isFormValid() || loading}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '가입 처리 중...' : '가입하기'}
            </button>
            <p className="text-center text-sm text-gray-500 mt-2">
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                onClick={() => openLoginModal()}
                className="text-green-600 font-medium hover:text-green-700 transition-colors"
              >
                로그인
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
