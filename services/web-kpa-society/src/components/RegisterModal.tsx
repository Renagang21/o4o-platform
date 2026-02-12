/**
 * RegisterModal - KPA Society 회원가입 모달
 *
 * WO-O4O-AUTH-MODAL-REGISTER-STANDARD-V1
 * Phase 3: 약사/약대생 유형 분기 추가
 *
 * 흐름: type 선택 → form 입력 → success
 */

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, AlertCircle, CheckCircle, GraduationCap, Stethoscope } from 'lucide-react';
import { useAuthModal } from '../contexts/AuthModalContext';

type MembershipType = 'pharmacist' | 'student';
type Step = 'type' | 'form' | 'success';

export default function RegisterModal() {
  const { activeModal, closeModal, openLoginModal } = useAuthModal();
  const [step, setStep] = useState<Step>('type');
  const [membershipType, setMembershipType] = useState<MembershipType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    licenseNumber: '',
    universityName: '',
    studentYear: '',
    pharmacyName: '',
    branch: '',
    agreeTerms: false,
    agreePrivacy: false,
  });

  const isOpen = activeModal === 'register';

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

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setStep('type');
      setMembershipType(null);
      setFormData({
        email: '',
        password: '',
        passwordConfirm: '',
        name: '',
        phone: '',
        licenseNumber: '',
        universityName: '',
        studentYear: '',
        pharmacyName: '',
        branch: '',
        agreeTerms: false,
        agreePrivacy: false,
      });
      setError(null);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value } = target;
    const checked = target instanceof HTMLInputElement ? target.checked : false;
    const type = target instanceof HTMLInputElement ? target.type : 'text';

    const finalValue = name === 'phone' ? value.replace(/\D/g, '') : value;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : finalValue,
    }));
  };

  const handleTypeSelect = (type: MembershipType) => {
    setMembershipType(type);
    setStep('form');
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
          email: formData.email,
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
          lastName: formData.name,
          firstName: '',
          nickname: formData.name,
          phone: formData.phone,
          role: membershipType === 'student' ? 'student' : 'pharmacist',
          service: 'kpa-society',
          membershipType: membershipType,
          licenseNumber: membershipType === 'pharmacist' ? formData.licenseNumber : undefined,
          universityName: membershipType === 'student' ? formData.universityName : undefined,
          studentYear: membershipType === 'student' ? parseInt(formData.studentYear) || undefined : undefined,
          tos: formData.agreeTerms,
          privacyAccepted: formData.agreePrivacy,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회원가입 신청에 실패했습니다.');
      }

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 신청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = {
    length: formData.password.length >= 8,
    lowercase: /[a-z]/.test(formData.password),
    uppercase: /[A-Z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[@$!%*?&]/.test(formData.password),
  };
  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

  const isFormValid = () => {
    const commonValid =
      formData.email &&
      formData.password &&
      isPasswordStrong &&
      formData.password === formData.passwordConfirm &&
      formData.name &&
      formData.phone &&
      formData.agreeTerms &&
      formData.agreePrivacy;

    if (!commonValid) return false;

    if (membershipType === 'pharmacist') {
      return !!formData.licenseNumber;
    }

    if (membershipType === 'student') {
      return !!formData.universityName && !!formData.studentYear;
    }

    return false;
  };

  const handleSwitchToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    openLoginModal();
  };

  const handleBackToType = () => {
    setStep('type');
    setMembershipType(null);
    setError(null);
  };

  const branchOptions = [
    { value: '', label: '분회 선택 (선택사항)' },
    { value: 'branch-1', label: '제1분회' },
    { value: 'branch-2', label: '제2분회' },
    { value: 'branch-3', label: '제3분회' },
    { value: 'branch-4', label: '제4분회' },
    { value: 'branch-5', label: '제5분회' },
  ];

  const studentYearOptions = [
    { value: '', label: '학년 선택' },
    { value: '1', label: '1학년' },
    { value: '2', label: '2학년' },
    { value: '3', label: '3학년' },
    { value: '4', label: '4학년' },
    { value: '5', label: '5학년' },
    { value: '6', label: '6학년' },
  ];

  if (!isOpen) return null;

  const getHeaderTitle = () => {
    if (step === 'type') return '회원가입';
    if (step === 'success') return '신청 완료';
    return membershipType === 'student' ? '약대생 회원가입' : '약사 회원가입';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      {/* 반투명 배경 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 모달 카드 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{getHeaderTitle()}</h2>
              <p className="text-xs text-gray-500">KPA Society</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 스크롤 가능한 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: 유형 선택 */}
          {step === 'type' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">회원 유형을 선택해 주세요</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 약사 카드 */}
                <button
                  onClick={() => handleTypeSelect('pharmacist')}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Stethoscope className="w-7 h-7 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">약사</p>
                    <p className="text-xs text-gray-500 mt-1">약사면허번호 필요</p>
                  </div>
                </button>

                {/* 약대생 카드 */}
                <button
                  onClick={() => handleTypeSelect('student')}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
                >
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <GraduationCap className="w-7 h-7 text-green-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">약대생</p>
                    <p className="text-xs text-gray-500 mt-1">재학 정보 필요</p>
                  </div>
                </button>
              </div>

              {/* 로그인 전환 */}
              <p className="text-center text-sm text-gray-500">
                이미 계정이 있으신가요?{' '}
                <a
                  href="#"
                  onClick={handleSwitchToLogin}
                  className="text-blue-600 font-medium hover:text-blue-700"
                >
                  로그인
                </a>
              </p>
            </div>
          )}

          {/* Step 2: 가입 폼 */}
          {step === 'form' && (
            <>
              {/* 뒤로가기 + 승인제 안내 */}
              <div className="mb-6">
                <button
                  onClick={handleBackToType}
                  className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
                >
                  ← 유형 다시 선택
                </button>

                <div className="flex gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">승인제 가입 안내</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {membershipType === 'pharmacist'
                        ? '약사면허 확인 후 운영자 승인이 완료되면 서비스 이용이 가능합니다.'
                        : '재학 정보 확인 후 운영자 승인이 완료되면 서비스 이용이 가능합니다.'}
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 기본 정보 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">
                    기본 정보
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이메일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="example@email.com"
                      required
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          autoComplete="new-password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="영문 대/소문자, 숫자, 특수문자 포함"
                          required
                          className="w-full px-4 py-3 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formData.password.length > 0 && !isPasswordStrong && (
                        <div style={{ fontSize: '12px', margin: '4px 0 0 0', lineHeight: '1.6' }}>
                          <span style={{ color: passwordChecks.length ? '#16a34a' : '#dc2626' }}>
                            {passwordChecks.length ? '\u2713' : '\u2717'} 8자 이상
                          </span><br />
                          <span style={{ color: passwordChecks.uppercase ? '#16a34a' : '#dc2626' }}>
                            {passwordChecks.uppercase ? '\u2713' : '\u2717'} 영문 대문자
                          </span><br />
                          <span style={{ color: passwordChecks.lowercase ? '#16a34a' : '#dc2626' }}>
                            {passwordChecks.lowercase ? '\u2713' : '\u2717'} 영문 소문자
                          </span><br />
                          <span style={{ color: passwordChecks.number ? '#16a34a' : '#dc2626' }}>
                            {passwordChecks.number ? '\u2713' : '\u2717'} 숫자
                          </span><br />
                          <span style={{ color: passwordChecks.special ? '#16a34a' : '#dc2626' }}>
                            {passwordChecks.special ? '\u2713' : '\u2717'} 특수문자(@$!%*?&)
                          </span>
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
                        autoComplete="new-password"
                        value={formData.passwordConfirm}
                        onChange={handleInputChange}
                        placeholder="재입력"
                        required
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {formData.passwordConfirm.length > 0 && formData.password !== formData.passwordConfirm && (
                        <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        성명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        autoComplete="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="홍길동"
                        required
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        핸드폰 번호 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="하이픈(-) 없이 숫자만 입력"
                        required
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">숫자만 입력 (예: 01012345678)</p>
                      {formData.phone.length > 0 && (formData.phone.length < 10 || formData.phone.length > 11) && (
                        <p className="text-xs text-red-500 mt-1">핸드폰 번호는 10~11자리 숫자여야 합니다</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 약사 정보 (약사 전용) */}
                {membershipType === 'pharmacist' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">
                      약사 정보
                    </h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        약사면허번호 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleInputChange}
                        placeholder="00000"
                        required
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">약사면허증에 기재된 면허번호</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          소속 분회
                        </label>
                        <select
                          name="branch"
                          value={formData.branch}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          {branchOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          약국명
                        </label>
                        <input
                          type="text"
                          name="pharmacyName"
                          value={formData.pharmacyName}
                          onChange={handleInputChange}
                          placeholder="OO약국 (선택)"
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 약대생 정보 (약대생 전용) */}
                {membershipType === 'student' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">
                      재학 정보
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          재학 대학명 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="universityName"
                          value={formData.universityName}
                          onChange={handleInputChange}
                          placeholder="OO대학교 약학대학"
                          required
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          학년 <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="studentYear"
                          value={formData.studentYear}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          {studentYearOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 약관 동의 */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">
                    서비스 이용을 위해 아래 약관에 동의해 주세요. 약관을 클릭하여 내용을 확인할 수 있습니다.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="agreeTerms"
                      checked={formData.agreeTerms}
                      onChange={handleInputChange}
                      required
                      className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">
                      <span className="text-red-500">*</span>{' '}
                      <a
                        href="/policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        이용약관
                      </a>
                      에 동의합니다
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="agreePrivacy"
                      checked={formData.agreePrivacy}
                      onChange={handleInputChange}
                      required
                      className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">
                      <span className="text-red-500">*</span>{' '}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        개인정보처리방침
                      </a>
                      에 동의합니다
                    </span>
                  </label>
                </div>

                {/* 제출 버튼 */}
                <button
                  type="submit"
                  disabled={!isFormValid() || loading}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '신청 처리 중...' : '가입 신청하기'}
                </button>

                {/* 로그인 전환 */}
                <p className="text-center text-sm text-gray-500">
                  이미 계정이 있으신가요?{' '}
                  <a
                    href="#"
                    onClick={handleSwitchToLogin}
                    className="text-blue-600 font-medium hover:text-blue-700"
                  >
                    로그인
                  </a>
                </p>
              </form>
            </>
          )}

          {/* Step 3: 성공 화면 */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">가입 신청이 완료되었습니다</h3>
              <p className="text-gray-600 mb-6">
                {membershipType === 'pharmacist'
                  ? <>약사면허 확인 후 운영자 승인이 완료되면<br />이메일로 안내해 드립니다.</>
                  : <>재학 정보 확인 후 운영자 승인이 완료되면<br />이메일로 안내해 드립니다.</>}
              </p>
              <div className="bg-blue-50 rounded-lg p-4 text-left mb-6">
                <p className="text-sm text-blue-800">
                  <strong>신청 이메일:</strong> {formData.email}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>회원 유형:</strong> {membershipType === 'pharmacist' ? '약사' : '약대생'}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  승인까지 1-2 영업일이 소요될 수 있습니다.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
