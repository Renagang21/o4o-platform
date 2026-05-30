/**
 * RegisterModal - 회원가입 모달
 * WO-O4O-NETURE-REGISTRATION-UX-ALIGNMENT-V1
 *
 * 3단계 구조:
 * Step 1: 기본 정보 입력 (이메일, 비밀번호, 이름, 휴대폰)
 * Step 2: 참여 유형 선택 + 유형별 추가 정보
 * Step 3: 가입 신청 완료 / 승인 대기 안내
 *
 * 모든 가입자는 pending으로 생성 → 운영자 승인 후 active.
 * 자동 로그인 없음.
 */

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { useLoginModal } from '../contexts';
import { api } from '../lib/apiClient';

// WO-O4O-NETURE-SELLER-LEGACY-CLEANUP-TO-STORE-OWNER-PARTICIPANT-V1:
// 'seller' (legacy) → 'store_owner' (Neture 내부 participant type, 권한 role 아님).
// neture:store_owner role 은 생성하지 않으며, 다른 서비스 store_owner 와 연결하지 않는다.
//
// WO-O4O-NETURE-REGISTRATION-ROLE-SMOKING-GUN-FIX-V1:
// Neture 신청 역할에서 'user' (일반 이용자) 제거. Neture 는 공급자/파트너/매장 경영자 3개 유형만
// 신청 받는다. 소비자/일반 이용자는 Neture 회원 유형으로 사용하지 않는다.
type SignupRole = 'supplier' | 'partner' | 'store_owner';

function formatBusinessNumber(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`;
}

// WO-O4O-NETURE-REGISTRATION-ROLE-SMOKING-GUN-FIX-V1:
// 'user' (일반 이용자) 옵션 제거 — Neture 신청 역할은 공급자/파트너/매장 경영자만 노출.
const roleOptions: Array<{ role: SignupRole; label: string; description: string; emoji: string }> = [
  {
    role: 'store_owner',
    label: '매장 경영자',
    description: '매장을 운영하는 경영자',
    emoji: '🏪',
  },
  {
    role: 'supplier',
    label: '공급자',
    description: '제품을 공급하는 공급사·제조사',
    emoji: '🏭',
  },
  {
    role: 'partner',
    label: '파트너',
    description: '마케팅·협업으로 참여하는 파트너',
    emoji: '🤝',
  },
];

interface RegisterModalProps {
  isOpen: boolean;
}

const INPUT_CLASS =
  'w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow';
const INPUT_CLASS_BG = INPUT_CLASS + ' bg-white';

export default function RegisterModal({ isOpen }: RegisterModalProps) {
  const { closeModal, openLoginModal } = useLoginModal();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<SignupRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailAlreadyJoined, setEmailAlreadyJoined] = useState(false);
  const [autoCloseCount, setAutoCloseCount] = useState(3);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    lastName: '',
    firstName: '',
    phone: '',
    companyName: '',
    businessNumber: '',
    businessType: '',
    representativeName: '',
    businessAddress: '',
    businessAddressDetail: '',
    contactName: '',
    contactPhone: '',
    taxInvoiceEmail: '',
    // 사업자등록증 표준 추가 필드 (WO-O4O-CROSSSERVICE-BUSINESS-REGISTRATION-FORM-ALIGNMENT-V1)
    businessItem: '',          // 종목
    businessEntityType: '',    // 사업자 유형
    businessStartDate: '',     // 개업일 YYYY-MM-DD
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedRole(null);
      setShowPassword(false);
      setLoading(false);
      setError(null);
      setEmailAlreadyJoined(false);
      setFormData({
        email: '',
        password: '',
        passwordConfirm: '',
        lastName: '',
        firstName: '',
        phone: '',
        companyName: '',
        businessNumber: '',
        businessType: '',
        representativeName: '',
        businessAddress: '',
        businessAddressDetail: '',
        contactName: '',
        contactPhone: '',
        taxInvoiceEmail: '',
        businessItem: '',
        businessEntityType: '',
        businessStartDate: '',
        agreeTerms: false,
        agreePrivacy: false,
        agreeMarketing: false,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (step !== 3) return;
    setAutoCloseCount(3);
    const interval = setInterval(() => {
      setAutoCloseCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          closeModal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, closeModal]);

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

    if (name === 'phone' || name === 'businessNumber' || name === 'contactPhone') {
      value = value.replace(/\D/g, '');
    }
    if (name === 'email') {
      setEmailAlreadyJoined(false);
      setError(null);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEmailBlur = async () => {
    if (!formData.email || !formData.email.includes('@')) return;
    try {
      const { data: result } = await api.post('/auth/check-email', {
        email: formData.email,
        service: 'neture',
      });
      if (result.success && result.data.alreadyJoined) {
        setEmailAlreadyJoined(true);
        const svc = result.data.services?.find((s: { key: string; status: string }) => s.key === 'neture');
        if (svc?.status === 'pending') {
          setError('Neture 가입 신청이 심사 중입니다. 승인을 기다려 주세요.');
        } else {
          setError('이미 Neture 서비스에 가입된 계정입니다. 로그인해 주세요.');
        }
      } else {
        setEmailAlreadyJoined(false);
        setError(null);
      }
    } catch { /* silent */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.passwordConfirm,
        name: `${formData.lastName}${formData.firstName}`,
        lastName: formData.lastName,
        firstName: formData.firstName,
        phone: formData.phone.replace(/\D/g, ''),
        role: selectedRole,
        service: 'neture',
        companyName: formData.companyName,
        businessNumber: formData.businessNumber,
        businessType: formData.businessType,
        agreeTerms: formData.agreeTerms,
        agreePrivacy: formData.agreePrivacy,
        agreeMarketing: formData.agreeMarketing,
        ...(selectedRole === 'supplier' && {
          representativeName: formData.representativeName,
          taxInvoiceEmail: formData.taxInvoiceEmail,
          contactName: formData.contactName,
          managerPhone: formData.contactPhone,
          address1: formData.businessAddress,
          address2: formData.businessAddressDetail,
          // 사업자등록증 표준 추가 필드 (WO-O4O-CROSSSERVICE-BUSINESS-REGISTRATION-FORM-ALIGNMENT-V1)
          ...(formData.businessItem ? { businessItem: formData.businessItem } : {}),
          ...(formData.businessEntityType ? { businessEntityType: formData.businessEntityType } : {}),
          ...(formData.businessStartDate ? { businessStartDate: formData.businessStartDate } : {}),
        }),
      });

      setStep(3);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: { code?: string; error?: string; services?: Array<{ key: string; status: string }> };
        };
      };
      const status = axiosErr.response?.status;
      const data = axiosErr.response?.data;
      if (status === 409) {
        if (data?.code === 'SERVICE_ALREADY_JOINED') {
          setError('이미 Neture 서비스에 가입된 계정입니다. 로그인해 주세요.');
        } else {
          setError('이미 가입된 이메일입니다. 기존 계정으로 로그인해 주세요.');
        }
      } else {
        // WO-AUTH-ERROR-MESSAGE-SANITIZATION-V1: raw error 노출 차단
        console.error('[RegisterModal] Registration error:', err);
        setError('회원가입에 실패했습니다. 다시 시도해주세요.');
      }
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

  const isStep1Valid = () => {
    if (emailAlreadyJoined) return false;
    if (!formData.email || !formData.email.includes('@')) return false;
    if (!formData.lastName.trim() || !formData.firstName.trim()) return false;
    if (!formData.phone || formData.phone.length < 10 || formData.phone.length > 11) return false;
    return isPasswordStrong && formData.password === formData.passwordConfirm;
  };

  const isStep2Valid = () => {
    // WO-O4O-NETURE-REGISTRATION-ROLE-SMOKING-GUN-FIX-V1: 'user' 분기 제거.
    // 모든 신청 역할(store_owner / supplier / partner)이 companyName 을 필수로 한다.
    if (!selectedRole || !formData.agreeTerms || !formData.agreePrivacy) return false;
    if (!formData.companyName.trim()) return false;
    if (selectedRole === 'supplier') {
      return (
        formData.representativeName.trim() !== '' &&
        formData.contactName.trim() !== '' &&
        formData.contactPhone.length >= 10 &&
        formData.businessAddress.trim() !== ''
      );
    }
    return true;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => { setStep(1); setError(null); }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <span className="text-2xl">🌿</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {step === 3 ? '가입 신청 완료' : '회원가입'}
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
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > 1 ? '✓' : '1'}
            </div>
            <div className={`w-12 h-1 rounded ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`} />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              2
            </div>
          </div>
        )}

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ── Step 1: 기본 정보 입력 ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">기본 계정 정보를 입력해주세요.</p>

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
                  autoComplete="email"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="8자 이상"
                      autoComplete="new-password"
                      className={INPUT_CLASS + ' pr-10'}
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
                  {formData.password.length > 0 && !isPasswordStrong && (
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
                    autoComplete="new-password"
                    className={INPUT_CLASS}
                  />
                  {formData.passwordConfirm.length > 0 &&
                    formData.password !== formData.passwordConfirm && (
                      <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다</p>
                    )}
                </div>
              </div>

              {/* 이름 (성 + 이름) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-[1fr_3fr] gap-2">
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="성"
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="이름"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              {/* 휴대폰 번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  휴대폰 번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="숫자만 입력 (010xxxxxxxx)"
                  className={INPUT_CLASS}
                />
                {formData.phone.length > 0 &&
                  (formData.phone.length < 10 || formData.phone.length > 11) && (
                    <p className="mt-1 text-xs text-red-500">10~11자리 숫자를 입력해주세요</p>
                  )}
              </div>

              <p className="text-center text-sm text-gray-500 pt-1">
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

          {/* ── Step 2: 참여 유형 선택 + 추가 정보 ── */}
          {step === 2 && (
            <form id="register-form" onSubmit={handleSubmit} className="space-y-5">
              {/* 역할 선택 카드 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  참여 유형을 선택해주세요. <span className="text-red-500">*</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {roleOptions.map((option) => (
                    <button
                      key={option.role}
                      type="button"
                      onClick={() => { setSelectedRole(option.role); setError(null); }}
                      className={`p-4 border-2 rounded-xl bg-white transition-all text-center group ${
                        selectedRole === option.role
                          ? 'border-green-500 shadow-md bg-green-50'
                          : 'border-gray-200 hover:border-green-400 hover:shadow-sm'
                      }`}
                    >
                      <span className="text-3xl block mb-2">{option.emoji}</span>
                      <h4
                        className={`text-sm font-semibold mb-1 ${
                          selectedRole === option.role
                            ? 'text-green-700'
                            : 'text-gray-900 group-hover:text-green-700'
                        }`}
                      >
                        {option.label}
                      </h4>
                      <p className="text-xs text-gray-500 leading-tight">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 유형별 추가 정보 — WO-O4O-NETURE-REGISTRATION-ROLE-SMOKING-GUN-FIX-V1: 'user' 분기 제거 */}
              {selectedRole && (
                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">
                    {selectedRole === 'store_owner'
                      ? '매장 정보'
                      : selectedRole === 'supplier'
                      ? '공급자 정보'
                      : '파트너 정보'}
                  </h4>

                  {/* 매장 경영자 */}
                  {selectedRole === 'store_owner' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          매장명 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          placeholder="OO 매장"
                          className={INPUT_CLASS_BG}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">업종</label>
                          <select
                            name="businessType"
                            value={formData.businessType}
                            onChange={handleInputChange}
                            className={INPUT_CLASS_BG}
                          >
                            <option value="">선택</option>
                            <option value="cosmetics">화장품</option>
                            <option value="health">건강식품</option>
                            <option value="medical">의료기기</option>
                            <option value="food">식품</option>
                            <option value="other">기타</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            매장 지역
                          </label>
                          <input
                            type="text"
                            name="businessAddress"
                            value={formData.businessAddress}
                            onChange={handleInputChange}
                            placeholder="서울 강남구"
                            className={INPUT_CLASS_BG}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            담당자명
                          </label>
                          <input
                            type="text"
                            name="contactName"
                            value={formData.contactName}
                            onChange={handleInputChange}
                            placeholder="홍길동"
                            className={INPUT_CLASS_BG}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            담당자 연락처
                          </label>
                          <input
                            type="tel"
                            name="contactPhone"
                            value={formData.contactPhone}
                            onChange={handleInputChange}
                            placeholder="숫자만 입력"
                            className={INPUT_CLASS_BG}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* 공급자 */}
                  {selectedRole === 'supplier' && (
                    <>
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
                          className={INPUT_CLASS_BG}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            대표자명 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="representativeName"
                            value={formData.representativeName}
                            onChange={handleInputChange}
                            placeholder="홍길동"
                            className={INPUT_CLASS_BG}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">업종</label>
                          <select
                            name="businessType"
                            value={formData.businessType}
                            onChange={handleInputChange}
                            className={INPUT_CLASS_BG}
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          사업장 주소 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="businessAddress"
                          value={formData.businessAddress}
                          onChange={handleInputChange}
                          placeholder="서울시 강남구 테헤란로 123"
                          className={INPUT_CLASS_BG}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          상세주소
                        </label>
                        <input
                          type="text"
                          name="businessAddressDetail"
                          value={formData.businessAddressDetail}
                          onChange={handleInputChange}
                          placeholder="5층 502호 (선택)"
                          className={INPUT_CLASS_BG}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            담당자명 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="contactName"
                            value={formData.contactName}
                            onChange={handleInputChange}
                            placeholder="김담당"
                            className={INPUT_CLASS_BG}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            담당자 연락처 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            name="contactPhone"
                            value={formData.contactPhone}
                            onChange={handleInputChange}
                            placeholder="숫자만 입력"
                            className={INPUT_CLASS_BG}
                          />
                          {formData.contactPhone.length > 0 &&
                            formData.contactPhone.length < 10 && (
                              <p className="mt-1 text-xs text-red-500">10자리 이상 입력해주세요</p>
                            )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          사업자등록번호
                        </label>
                        <input
                          type="text"
                          name="businessNumber"
                          value={formatBusinessNumber(formData.businessNumber)}
                          onChange={handleInputChange}
                          placeholder="숫자만 입력 (선택)"
                          maxLength={12}
                          className={INPUT_CLASS_BG}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          세금계산서 이메일
                        </label>
                        <input
                          type="email"
                          name="taxInvoiceEmail"
                          value={formData.taxInvoiceEmail}
                          onChange={handleInputChange}
                          placeholder="tax@company.com (선택)"
                          className={INPUT_CLASS_BG}
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          세금계산서 수신용 이메일 (로그인 이메일과 달라도 됩니다)
                        </p>
                      </div>
                      {/* 사업자등록증 표준 추가 필드 — WO-O4O-CROSSSERVICE-BUSINESS-REGISTRATION-FORM-ALIGNMENT-V1 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">종목</label>
                        <input
                          type="text"
                          name="businessItem"
                          value={formData.businessItem}
                          onChange={handleInputChange}
                          placeholder="예: 의약품 도매업 (선택)"
                          maxLength={100}
                          className={INPUT_CLASS_BG}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">사업자 유형</label>
                          <select
                            name="businessEntityType"
                            value={formData.businessEntityType}
                            onChange={handleInputChange}
                            className={INPUT_CLASS_BG}
                          >
                            <option value="">선택 (선택사항)</option>
                            <option value="individual">개인사업자</option>
                            <option value="corporation">법인사업자</option>
                            <option value="simple_taxpayer">간이과세자</option>
                            <option value="general_taxpayer">일반과세자</option>
                            <option value="tax_exempt">면세사업자</option>
                            <option value="non_profit">비영리/단체</option>
                            <option value="other">기타</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">개업일</label>
                          <input
                            type="date"
                            name="businessStartDate"
                            value={formData.businessStartDate}
                            onChange={handleInputChange}
                            className={INPUT_CLASS_BG}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* 파트너 */}
                  {selectedRole === 'partner' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          활동명 / 회사명 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          placeholder="OO 마케팅, OO 에이전시 등"
                          className={INPUT_CLASS_BG}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          활동 분야
                        </label>
                        <select
                          name="businessType"
                          value={formData.businessType}
                          onChange={handleInputChange}
                          className={INPUT_CLASS_BG}
                        >
                          <option value="">선택</option>
                          <option value="cosmetics">화장품·뷰티</option>
                          <option value="health">건강·식품</option>
                          <option value="medical">의료·헬스케어</option>
                          <option value="food">식품·음료</option>
                          <option value="other">기타</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            담당자명
                          </label>
                          <input
                            type="text"
                            name="contactName"
                            value={formData.contactName}
                            onChange={handleInputChange}
                            placeholder="홍길동"
                            className={INPUT_CLASS_BG}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            담당자 연락처
                          </label>
                          <input
                            type="tel"
                            name="contactPhone"
                            value={formData.contactPhone}
                            onChange={handleInputChange}
                            placeholder="숫자만 입력"
                            className={INPUT_CLASS_BG}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* 민감 정보 안내 */}
                  <p className="text-xs text-gray-400 pt-1">
                    세무, 계약, 정산 또는 공식 거래가 필요한 경우 추가 정보는 별도 안내에 따라 제출하실 수 있습니다.
                  </p>
                </div>
              )}

              {/* 동의 항목 */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleInputChange}
                    className="w-4 h-4 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span>
                    <span className="text-red-500">*</span> 이용약관에 동의합니다{' '}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      (보기)
                    </a>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreePrivacy"
                    checked={formData.agreePrivacy}
                    onChange={handleInputChange}
                    className="w-4 h-4 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span>
                    <span className="text-red-500">*</span> 개인정보처리방침에 동의합니다{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      (보기)
                    </a>
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

          {/* ── Step 3: 가입 신청 완료 ── */}
          {step === 3 && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">가입 신청이 접수되었습니다</h3>
              <div className="text-sm text-gray-500 space-y-2 mb-6 leading-relaxed">
                <p>운영자 확인 후 서비스 이용이 가능합니다.</p>
                <p>승인 결과는 안내 메시지 또는 이메일로 확인하실 수 있습니다.</p>
                <p className="text-xs text-gray-400">승인 전에는 로그인이 제한될 수 있습니다.</p>
              </div>
              <p className="text-xs text-gray-400 mb-6">{autoCloseCount}초 후 자동으로 닫힙니다</p>
              <button
                onClick={closeModal}
                className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                확인
              </button>
            </div>
          )}
        </div>

        {/* 고정 Footer */}
        {step === 1 && (
          <div className="shrink-0 border-t border-gray-100 px-6 py-4 bg-white">
            <button
              type="button"
              disabled={!isStep1Valid()}
              onClick={() => { setStep(2); setError(null); }}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="shrink-0 border-t border-gray-100 px-6 py-4 bg-white">
            <button
              type="submit"
              form="register-form"
              disabled={!isStep2Valid() || loading}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '가입 처리 중...' : '가입 신청하기'}
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
