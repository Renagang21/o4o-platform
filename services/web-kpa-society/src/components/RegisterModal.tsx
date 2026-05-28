/**
 * RegisterModal - KPA Society 회원가입 모달
 *
 * WO-O4O-KPA-REGISTER-MODAL-ACTIVITY-AND-PHARMACY-OWNER-INTEGRATION-V1
 *
 * 2개 회원 그룹 (canonical):
 *   1. pharmacist_member       — 약사 정회원 (면허 보유)
 *   2. pharmacy_student_member — 약대생 준회원
 *
 * 약사 가입 단계 입력:
 *   - 직역 (activity_type): canonical 6종 (UI) → backend 11종 enum 매핑
 *   - 근무처: 근무처명·주소·전화(선택)
 *   - 개설약사 추가: 사업자번호·대표자명·세금계산서이메일(선택)·사업장 주소
 *
 * 흐름: select → form → success
 */

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { AddressSearch } from '@o4o/ui';
import { useAuthModal } from '../contexts/AuthModalContext';

type MemberType = 'pharmacist_member' | 'pharmacy_student_member';
type Step = 'select' | 'form' | 'success';

/**
 * 직역 canonical UI 분류 → backend enum 매핑.
 * backend(kpa_pharmacist_profiles.activity_type / kpa_members.activity_type)는 11종 유지.
 * 가입 모달은 6종으로 단순화 — "산업약사"는 other_industry 로 일괄 매핑(세부 sub-type은 추후 MyProfile에서 조정 가능).
 */
type CanonicalActivityType =
  | 'pharmacy_owner'
  | 'pharmacy_employee'
  | 'hospital'
  | 'other_industry'
  | 'other'
  | 'inactive';

const ACTIVITY_TYPE_OPTIONS: { value: CanonicalActivityType; label: string; description: string }[] = [
  { value: 'pharmacy_owner', label: '개설약사', description: '약국 개설자 (사업자등록 보유)' },
  { value: 'pharmacy_employee', label: '근무약사', description: '약국 근무 약사' },
  { value: 'hospital', label: '병원약사', description: '의료기관 근무' },
  { value: 'other_industry', label: '산업약사', description: '제약·제조·유통·공공·학교 등' },
  { value: 'other', label: '기타', description: '기타 직역' },
  { value: 'inactive', label: '면허 미사용', description: '현재 약사 활동 없음' },
];

/** 국내 약학대학 목록 (2025 기준, 가나다순) */
const PHARMACY_UNIVERSITIES = [
  '가천대학교 약학대학', '가톨릭대학교 약학대학', '강원대학교 약학대학',
  '경북대학교 약학대학', '경상국립대학교 약학대학', '경성대학교 약학대학',
  '경희대학교 약학대학', '계명대학교 약학대학', '고려대학교 약학대학(세종)',
  '단국대학교 약학대학', '대구가톨릭대학교 약학대학', '덕성여자대학교 약학대학',
  '동국대학교 약학대학', '동덕여자대학교 약학대학', '목포대학교 약학대학',
  '부산대학교 약학대학', '삼육대학교 약학대학', '서울대학교 약학대학',
  '성균관대학교 약학대학', '숙명여자대학교 약학대학', '순천대학교 약학대학',
  '아주대학교 약학대학', '영남대학교 약학대학', '우석대학교 약학대학',
  '원광대학교 약학대학', '이화여자대학교 약학대학', '인제대학교 약학대학',
  '전남대학교 약학대학', '전북대학교 약학대학', '제주대학교 약학대학',
  '조선대학교 약학대학', '중앙대학교 약학대학', '차의과학대학교 약학대학',
  '충남대학교 약학대학', '충북대학교 약학대학', '한양대학교 약학대학(ERICA)',
];

const MEMBER_GROUP_INFO: Record<MemberType, { emoji: string; title: string; desc: string; notice: string }> = {
  pharmacist_member: {
    emoji: '💊',
    title: '약사 정회원',
    desc: '약사면허 보유자\n승인제 가입',
    notice: '약사면허 확인 후 운영자 승인이 완료되면 서비스 이용이 가능합니다.',
  },
  pharmacy_student_member: {
    emoji: '🎓',
    title: '약대생 준회원',
    desc: '약학대학 재학생\n승인제 가입',
    notice: '재학 정보 확인 후 운영자 승인이 완료되면 서비스 이용이 가능합니다.',
  },
};

const SUCCESS_TYPE_LABELS: Record<MemberType, string> = {
  pharmacist_member: '약사 정회원',
  pharmacy_student_member: '약대생 준회원',
};

export default function RegisterModal() {
  const { activeModal, closeModal, openLoginModal } = useAuthModal();
  const [step, setStep] = useState<Step>('select');
  const [memberType, setMemberType] = useState<MemberType>('pharmacist_member');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<'idle' | 'checking' | 'available' | 'duplicate'>('idle');
  // WO-O4O-KPA-REGISTRATION-UX-ALIGN-WITH-GLYCOPHARM-V1:
  //   email onBlur 시 /auth/check-email 호출로 중복/가입 상태 선제 안내 (GlycoPharm 패턴 도입).
  const [emailAlreadyJoined, setEmailAlreadyJoined] = useState(false);

  const [formData, setFormData] = useState({
    // 공통
    email: '',
    password: '',
    passwordConfirm: '',
    lastName: '',
    firstName: '',
    nickname: '',
    phone: '',
    agreeTerms: false,
    agreePrivacy: false,
    // 약사 전용 — 면허
    licenseNumber: '',
    // 약사 전용 — 직역·근무처
    activityType: '' as '' | CanonicalActivityType,
    pharmacyName: '',
    pharmacyAddress: '',
    pharmacyPhone: '',
    // 개설약사 전용 — 사업자 정보 (WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1)
    businessNumber: '',
    ceoName: '',               // canonical (legacy: representativeName)
    contactName: '',           // WO-O4O-KPA-PHARMACY-CONTACT-NAME-FIELD-V1
    taxInvoiceEmail: '',       // canonical (legacy: taxEmail)
    managerPhone: '',          // canonical (신규)
    // 개설약사 전용 — 사업장 주소 (StoreAddress 3-part)
    businessZipCode: '',
    businessAddress: '',
    businessAddressDetail: '',
    // 약대생 전용
    universityName: '',
    studentYear: '',
  });

  const isOpen = activeModal === 'register';

  // ESC 키로 닫기 + 배경 스크롤 방지
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
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
      setStep('select');
      setMemberType('pharmacist_member');
      setFormData({
        email: '', password: '', passwordConfirm: '',
        lastName: '', firstName: '', nickname: '', phone: '',
        agreeTerms: false, agreePrivacy: false,
        licenseNumber: '',
        activityType: '', pharmacyName: '', pharmacyAddress: '', pharmacyPhone: '',
        businessNumber: '', ceoName: '', contactName: '', taxInvoiceEmail: '', managerPhone: '',
        businessZipCode: '', businessAddress: '', businessAddressDetail: '',
        universityName: '', studentYear: '',
      });
      setError(null);
      setLicenseStatus('idle');
      setEmailAlreadyJoined(false);
    }
  }, [isOpen]);

  // WO-O4O-KPA-REGISTRATION-UX-ALIGN-WITH-GLYCOPHARM-V1:
  //   email blur 시 /auth/check-email 으로 중복 / pending 상태 미리 안내.
  //   alreadyJoined 인 경우 submit 차단 (isFormValid 에서 처리).
  const handleEmailBlur = async () => {
    if (!formData.email || !formData.email.includes('@')) return;
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const res = await fetch(`${baseUrl}/api/v1/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, service: 'kpa-society' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data.data?.alreadyJoined) {
        setEmailAlreadyJoined(true);
        const svc = (data.data.services as Array<{ key: string; status: string }> | undefined)?.find(
          (s) => s.key === 'kpa-society',
        );
        if (svc?.status === 'pending') {
          setError('KPA Society 가입 신청이 심사 중입니다. 승인을 기다려 주세요.');
        } else {
          setError('이미 KPA Society 에 가입된 계정입니다. 로그인해 주세요.');
        }
      } else {
        setEmailAlreadyJoined(false);
        setError(null);
      }
    } catch {
      /* silent — submit 시점에서 다시 검증됨 */
    }
  };

  const checkLicenseDuplicate = async (licenseNumber: string) => {
    if (!licenseNumber.trim()) { setLicenseStatus('idle'); return; }
    setLicenseStatus('checking');
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const res = await fetch(`${baseUrl}/api/v1/kpa/members/check-license?license_number=${encodeURIComponent(licenseNumber.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setLicenseStatus(data.available ? 'available' : 'duplicate');
      } else { setLicenseStatus('idle'); }
    } catch { setLicenseStatus('idle'); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value } = target;
    const checked = target instanceof HTMLInputElement ? target.checked : false;
    const type = target instanceof HTMLInputElement ? target.type : 'text';
    // 숫자 전용 필드 — 비숫자 제거
    const DIGITS_ONLY = new Set(['phone', 'pharmacyPhone', 'businessNumber', 'managerPhone']);
    if (DIGITS_ONLY.has(name)) {
      setFormData(prev => ({ ...prev, [name]: value.replace(/\D/g, '') }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

      const payload: Record<string, any> = {
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.passwordConfirm,
        lastName: formData.lastName,
        firstName: formData.firstName,
        nickname: formData.nickname,
        phone: formData.phone,
        role: memberType,
        service: 'kpa-society',
        membershipType: memberType,
        tos: formData.agreeTerms,
        privacyAccepted: formData.agreePrivacy,
      };

      if (memberType === 'pharmacist_member') {
        if (formData.licenseNumber) payload.licenseNumber = formData.licenseNumber;
        // 직역
        if (formData.activityType) payload.activityType = formData.activityType;
        if (formData.pharmacyName) payload.pharmacyName = formData.pharmacyName;
        if (formData.pharmacyPhone) payload.pharmacyPhone = formData.pharmacyPhone;
        // 비-pharmacy_owner: 근무처 주소 (free-text)
        // pharmacy_owner: 사업장 주소 (StoreAddress 3-part — businessAddress 가 backend address1, businessZipCode 가 zipCode)
        if (formData.activityType === 'pharmacy_owner') {
          // 개설약사: 사업자 정보 (WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1 canonical key)
          if (formData.businessNumber) payload.businessNumber = formData.businessNumber;
          if (formData.ceoName) payload.ceoName = formData.ceoName;
          if (formData.contactName) payload.contactName = formData.contactName;
          if (formData.taxInvoiceEmail) payload.taxInvoiceEmail = formData.taxInvoiceEmail;
          if (formData.managerPhone) payload.managerPhone = formData.managerPhone;
          // 사업장명/주소는 약국명/약국주소와 동일 (개설약사 = 사업장 == 약국)
          if (formData.pharmacyName) payload.businessName = formData.pharmacyName;
          if (formData.businessZipCode) payload.zipCode = formData.businessZipCode;
          if (formData.businessAddress) payload.address1 = formData.businessAddress;
          if (formData.businessAddressDetail) payload.address2 = formData.businessAddressDetail;
          // kpa_members.pharmacy_address backend 호환: 사업장 주소 합쳐서 free-text 전달
          const composedAddr = [formData.businessZipCode, formData.businessAddress, formData.businessAddressDetail]
            .filter(Boolean)
            .join(' ');
          if (composedAddr) payload.pharmacyAddress = composedAddr;
        } else {
          if (formData.pharmacyAddress) payload.pharmacyAddress = formData.pharmacyAddress;
        }
      } else if (memberType === 'pharmacy_student_member') {
        payload.universityName = formData.universityName;
        if (formData.studentYear) payload.studentYear = parseInt(formData.studentYear, 10);
      }

      const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    number: /\d/.test(formData.password),
    special: /[^A-Za-z0-9\s]/.test(formData.password),
  };
  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

  // WO-O4O-KPA-REGISTRATION-UX-ALIGN-WITH-GLYCOPHARM-V1:
  //   GlycoPharm 의 명시적 format validation 패턴을 도입.
  //   - phone 정규식 (length 체크와 동일 결과지만 명시성 향상)
  //   - businessNumber 10자리 정확 검증
  //   - taxInvoiceEmail email 형식 검증 (입력된 경우만 — 선택 필드)
  //   - email 기본 형식 검증
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailFormatValid = EMAIL_REGEX.test(formData.email);
  const isPhoneValid = /^\d{10,11}$/.test(formData.phone);
  const isBusinessNumberValid = formData.businessNumber.length === 10;
  // taxInvoiceEmail 은 optional — 미입력 시 valid, 입력 시 형식 검증
  const isTaxInvoiceEmailValid = formData.taxInvoiceEmail.length === 0 || EMAIL_REGEX.test(formData.taxInvoiceEmail);

  const isFormValid = () => {
    if (emailAlreadyJoined) return false;
    const common =
      formData.email && isEmailFormatValid &&
      formData.password && isPasswordStrong &&
      formData.password === formData.passwordConfirm &&
      formData.lastName && formData.firstName && formData.nickname &&
      isPhoneValid &&
      formData.agreeTerms && formData.agreePrivacy;
    if (!common) return false;

    if (memberType === 'pharmacist_member') {
      if (!formData.licenseNumber || licenseStatus === 'duplicate') return false;
      if (!formData.activityType) return false;
      // 면허 미사용은 근무처 입력 불요
      if (formData.activityType === 'inactive') return true;
      if (formData.activityType === 'pharmacy_owner') {
        // 개설약사: 약국명·사업자번호(10자리)·대표자명·세금계산서 이메일 형식·사업장 주소 필수
        if (!formData.pharmacyName) return false;
        if (!isBusinessNumberValid) return false;
        if (!formData.ceoName) return false;
        if (!isTaxInvoiceEmailValid) return false;
        if (!formData.businessZipCode || !formData.businessAddress) return false;
        return true;
      }
      // 비-pharmacy_owner: 근무처명·주소 (free-text) 필수
      if (!formData.pharmacyName || !formData.pharmacyAddress) return false;
      return true;
    }
    if (memberType === 'pharmacy_student_member') {
      return !!formData.universityName;
    }
    return false;
  };

  // WO-O4O-KPA-REGISTRATION-UX-ALIGN-WITH-GLYCOPHARM-V1:
  //   submit disabled 사유를 사용자에게 명시. 형식 오류도 별도 항목으로 노출.
  //   GlycoPharm 의 missing fields amber 박스 패턴과 동일.
  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (emailAlreadyJoined) return missing; // 별도 error 박스로 안내 — 여기선 생략

    // 공통
    if (!formData.email) missing.push('이메일');
    else if (!isEmailFormatValid) missing.push('이메일(형식)');
    if (!formData.password) missing.push('비밀번호');
    else if (!isPasswordStrong) missing.push('비밀번호(영문 소문자·숫자·특수문자 포함 8자 이상)');
    if (formData.password && formData.passwordConfirm && formData.password !== formData.passwordConfirm) {
      missing.push('비밀번호 확인(일치)');
    } else if (!formData.passwordConfirm) {
      missing.push('비밀번호 확인');
    }
    if (!formData.lastName) missing.push('성');
    if (!formData.firstName) missing.push('이름');
    if (!formData.nickname) missing.push('닉네임');
    if (!formData.phone) missing.push('핸드폰 번호');
    else if (!isPhoneValid) missing.push('핸드폰 번호(10~11자리 숫자)');
    if (!formData.agreeTerms) missing.push('이용약관 동의');
    if (!formData.agreePrivacy) missing.push('개인정보처리방침 동의');

    if (memberType === 'pharmacist_member') {
      if (!formData.licenseNumber) missing.push('약사면허번호');
      else if (licenseStatus === 'duplicate') missing.push('약사면허번호(중복)');
      if (!formData.activityType) missing.push('직역');
      if (formData.activityType && formData.activityType !== 'inactive') {
        if (formData.activityType === 'pharmacy_owner') {
          if (!formData.pharmacyName) missing.push('약국명');
          if (!formData.businessNumber) missing.push('사업자등록번호');
          else if (!isBusinessNumberValid) missing.push('사업자등록번호(10자리 숫자)');
          if (!formData.ceoName) missing.push('대표자명');
          if (formData.taxInvoiceEmail && !isTaxInvoiceEmailValid) missing.push('세금계산서 이메일(형식)');
          if (!formData.businessZipCode || !formData.businessAddress) missing.push('사업장 주소');
        } else {
          if (!formData.pharmacyName) missing.push('근무처명');
          if (!formData.pharmacyAddress) missing.push('근무처 주소');
        }
      }
    } else if (memberType === 'pharmacy_student_member') {
      if (!formData.universityName) missing.push('재학 약학대학');
    }

    return missing;
  };

  const handleSwitchToLogin = (e: React.MouseEvent) => { e.preventDefault(); openLoginModal(); };

  if (!isOpen) return null;

  const groupInfo = MEMBER_GROUP_INFO[memberType];
  const getHeaderTitle = () => {
    if (step === 'select') return '회원가입';
    if (step === 'success') return '신청 완료';
    return groupInfo.title + ' 가입';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
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
          <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: 회원 유형 선택 */}
          {step === 'select' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 text-center">가입 유형을 선택해 주세요</p>
              <div className="grid grid-cols-2 gap-4">
                {(Object.entries(MEMBER_GROUP_INFO) as [MemberType, typeof MEMBER_GROUP_INFO[MemberType]][]).map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => { setMemberType(type); setStep('form'); }}
                    className="flex flex-col items-center gap-2 p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <span className="text-3xl">{info.emoji}</span>
                    <span className="text-sm font-bold text-gray-900 text-center">{info.title}</span>
                    <span className="text-xs text-gray-500 text-center whitespace-pre-line">{info.desc}</span>
                  </button>
                ))}
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  이미 계정이 있으신가요?{' '}
                  <a href="#" onClick={handleSwitchToLogin} className="text-blue-600 hover:underline font-medium">로그인</a>
                </p>
              </div>
            </div>
          )}

          {/* Step 2: 가입 폼 */}
          {step === 'form' && (
            <>
              <div className="mb-6 space-y-3">
                <button type="button" onClick={() => setStep('select')} className="text-sm text-blue-600 hover:underline">
                  ← 가입 유형 다시 선택
                </button>
                <div className="flex gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">승인제 가입 안내</p>
                    <p className="text-xs text-blue-700 mt-1">{groupInfo.notice}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 기본 정보 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">기본 정보</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일 <span className="text-red-500">*</span></label>
                    <input type="email" name="email" autoComplete="email" value={formData.email} onChange={handleInputChange}
                      onBlur={handleEmailBlur}
                      placeholder="example@email.com" required
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {formData.email.length > 0 && !isEmailFormatValid && (
                      <p className="text-xs text-red-500 mt-1">이메일 형식이 올바르지 않습니다.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} name="password" autoComplete="new-password"
                          value={formData.password} onChange={handleInputChange} placeholder="영문·숫자·특수문자 포함" required
                          className="w-full px-4 py-3 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formData.password.length > 0 && !isPasswordStrong && (
                        <div style={{ fontSize: '12px', margin: '4px 0 0 0', lineHeight: '1.6' }}>
                          <span style={{ color: passwordChecks.length ? '#16a34a' : '#dc2626' }}>{passwordChecks.length ? '✓' : '✗'} 8자 이상</span><br />
                          <span style={{ color: passwordChecks.lowercase ? '#16a34a' : '#dc2626' }}>{passwordChecks.lowercase ? '✓' : '✗'} 영문 소문자</span><br />
                          <span style={{ color: passwordChecks.number ? '#16a34a' : '#dc2626' }}>{passwordChecks.number ? '✓' : '✗'} 숫자</span><br />
                          <span style={{ color: passwordChecks.special ? '#16a34a' : '#dc2626' }}>{passwordChecks.special ? '✓' : '✗'} 특수문자</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인 <span className="text-red-500">*</span></label>
                      <input type="password" name="passwordConfirm" autoComplete="new-password"
                        value={formData.passwordConfirm} onChange={handleInputChange} placeholder="재입력" required
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      {formData.passwordConfirm.length > 0 && formData.password !== formData.passwordConfirm && (
                        <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">성 <span className="text-red-500">*</span></label>
                      <input type="text" name="lastName" autoComplete="family-name" value={formData.lastName} onChange={handleInputChange}
                        placeholder="홍" required className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">이름 <span className="text-red-500">*</span></label>
                      <input type="text" name="firstName" autoComplete="given-name" value={formData.firstName} onChange={handleInputChange}
                        placeholder="길동" required className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">닉네임 <span className="text-red-500">*</span></label>
                      <input type="text" name="nickname" value={formData.nickname} onChange={handleInputChange}
                        placeholder="활동 시 사용할 이름 입력" maxLength={50} required className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-xs text-gray-500 mt-1">포럼, 댓글 등 공개 화면에 표시되는 이름입니다. (최대 50자)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">핸드폰 번호 <span className="text-red-500">*</span></label>
                      <input type="tel" name="phone" autoComplete="tel" value={formData.phone} onChange={handleInputChange}
                        placeholder="숫자만 입력" required className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      {formData.phone.length > 0 && (formData.phone.length < 10 || formData.phone.length > 11) && (
                        <p className="text-xs text-red-500 mt-1">10~11자리 숫자</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 약사 정회원 전용 */}
                {memberType === 'pharmacist_member' && (
                  <>
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">약사 정보</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">약사면허번호 <span className="text-red-500">*</span></label>
                        <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleInputChange}
                          onBlur={() => checkLicenseDuplicate(formData.licenseNumber)} placeholder="00000" required
                          className={`w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            licenseStatus === 'duplicate' ? 'border-red-400' : licenseStatus === 'available' ? 'border-green-400' : 'border-gray-200'
                          }`} />
                        <p className="text-xs text-gray-500 mt-1">약사면허증에 기재된 면허번호</p>
                        {licenseStatus === 'checking' && <p className="text-xs text-gray-500 mt-1">확인 중...</p>}
                        {licenseStatus === 'duplicate' && <p className="text-xs text-red-500 mt-1">이미 등록된 면허번호입니다.</p>}
                        {licenseStatus === 'available' && <p className="text-xs text-green-600 mt-1">사용 가능한 면허번호입니다.</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">직역 <span className="text-red-500">*</span></label>
                        <select name="activityType" value={formData.activityType} onChange={handleInputChange} required
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          <option value="">직역을 선택해 주세요</option>
                          {ACTIVITY_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label} — {opt.description}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 비-pharmacy_owner: 근무처 정보 (free-text) — 면허 미사용 / 개설약사 제외 모든 약사 직역 */}
                    {formData.activityType && formData.activityType !== 'inactive' && formData.activityType !== 'pharmacy_owner' && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">근무처 정보</h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">근무처명 <span className="text-red-500">*</span></label>
                          <input type="text" name="pharmacyName" value={formData.pharmacyName} onChange={handleInputChange}
                            placeholder="예: ○○약국 / ○○병원" required maxLength={200}
                            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">근무처 주소 <span className="text-red-500">*</span></label>
                          <input type="text" name="pharmacyAddress" value={formData.pharmacyAddress} onChange={handleInputChange}
                            placeholder="예: 서울특별시 강남구 ○○로 ○○" required maxLength={300}
                            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">근무처 전화</label>
                          <input type="tel" name="pharmacyPhone" value={formData.pharmacyPhone} onChange={handleInputChange}
                            placeholder="숫자만 입력 (선택)" maxLength={11}
                            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    )}

                    {/* 개설약사 — 사업자 정보 (약국명 + 사업자번호 + 대표자명 + 세금계산서 + 담당자전화 + AddressSearch 통합) */}
                    {/* WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1 */}
                    {formData.activityType === 'pharmacy_owner' && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">약국 / 사업자 정보</h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">약국명 (사업장명) <span className="text-red-500">*</span></label>
                          <input type="text" name="pharmacyName" value={formData.pharmacyName} onChange={handleInputChange}
                            placeholder="예: ○○약국" required maxLength={200}
                            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호 <span className="text-red-500">*</span></label>
                          <input type="text" name="businessNumber" value={formData.businessNumber} onChange={handleInputChange}
                            placeholder="숫자 10자리 (예: 1234567890)" required maxLength={10}
                            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <p className="text-xs text-gray-500 mt-1">사업자등록증의 등록번호 10자리. 사업자등록증 파일은 승인 후 별도 안내됩니다.</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">대표자명 <span className="text-red-500">*</span></label>
                          <input type="text" name="ceoName" value={formData.ceoName} onChange={handleInputChange}
                            placeholder="사업자등록증 대표자명" required maxLength={50}
                            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">담당자명</label>
                          <input type="text" name="contactName" value={formData.contactName} onChange={handleInputChange}
                            placeholder="담당자 이름 (선택)" maxLength={50}
                            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">세금계산서 이메일</label>
                          <input type="email" name="taxInvoiceEmail" value={formData.taxInvoiceEmail} onChange={handleInputChange}
                            placeholder="세금계산서 수신 이메일 (선택)"
                            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">약국 전화</label>
                            <input type="tel" name="pharmacyPhone" value={formData.pharmacyPhone} onChange={handleInputChange}
                              placeholder="숫자만 입력 (선택)" maxLength={11}
                              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">담당자 전화</label>
                            <input type="tel" name="managerPhone" value={formData.managerPhone} onChange={handleInputChange}
                              placeholder="숫자만 입력 (선택)" maxLength={11}
                              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">사업장 주소 <span className="text-red-500">*</span></label>
                          <AddressSearch
                            zipCode={formData.businessZipCode}
                            address={formData.businessAddress}
                            addressDetail={formData.businessAddressDetail}
                            onChange={({ zipCode, address, addressDetail }) =>
                              setFormData(prev => ({
                                ...prev,
                                businessZipCode: zipCode,
                                businessAddress: address,
                                businessAddressDetail: addressDetail,
                              }))
                            }
                            inputClassName="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 약대생 준회원 전용 */}
                {memberType === 'pharmacy_student_member' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">학생 정보</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">재학 약학대학 <span className="text-red-500">*</span></label>
                      <select name="universityName" value={formData.universityName} onChange={handleInputChange} required
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="">약학대학을 선택해 주세요</option>
                        {PHARMACY_UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
                      <select name="studentYear" value={formData.studentYear} onChange={handleInputChange}
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="">학년 선택 (선택)</option>
                        {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>{y}학년</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* 약관 동의 */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">서비스 이용을 위해 아래 약관에 동의해 주세요.</p>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleInputChange} required
                      className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <span className="text-sm text-gray-600">
                      <span className="text-red-500">*</span>{' '}
                      <a href="/policy" target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.stopPropagation()}>
                        이용약관
                      </a>에 동의합니다
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" name="agreePrivacy" checked={formData.agreePrivacy} onChange={handleInputChange} required
                      className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <span className="text-sm text-gray-600">
                      <span className="text-red-500">*</span>{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.stopPropagation()}>
                        개인정보처리방침
                      </a>에 동의합니다
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* WO-O4O-KPA-REGISTRATION-UX-ALIGN-WITH-GLYCOPHARM-V1:
                    누락/형식 오류 항목을 amber 박스로 명시 (GlycoPharm 패턴). */}
                {!isFormValid() && !loading && !emailAlreadyJoined && (() => {
                  const missing = getMissingFields();
                  return missing.length > 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800">
                        다음 항목을 확인해 주세요: {missing.join(', ')}
                      </p>
                    </div>
                  ) : null;
                })()}

                <button type="submit" disabled={!isFormValid() || loading}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? '신청 처리 중...' : '가입 신청하기'}
                </button>

                <p className="text-center text-sm text-gray-500">
                  이미 계정이 있으신가요?{' '}
                  <a href="#" onClick={handleSwitchToLogin} className="text-blue-600 font-medium hover:text-blue-700">로그인</a>
                </p>
              </form>
            </>
          )}

          {/* Step 3: 성공 */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">가입 신청이 완료되었습니다</h3>
              <p className="text-gray-600 mb-6">{groupInfo.notice.replace('이 완료되면', '이\n완료되면')}<br />서비스 이용이 가능합니다.</p>
              <div className="bg-blue-50 rounded-lg p-4 text-left mb-6">
                <p className="text-sm text-blue-800"><strong>신청 이메일:</strong> {formData.email}</p>
                <p className="text-sm text-blue-800 mt-1"><strong>회원 유형:</strong> {SUCCESS_TYPE_LABELS[memberType]}</p>
                <p className="text-sm text-blue-800 mt-1">승인까지 1-2 영업일이 소요될 수 있습니다.</p>
              </div>
              {/* WO-O4O-KPA-REGISTRATION-UX-ALIGN-WITH-GLYCOPHARM-V1:
                  GlycoPharm 의 success UX 패턴 — "로그인하기" 직행 버튼 추가.
                  approval 정책은 변경 없음 (승인 후에만 실제 로그인 가능). */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => { closeModal(); openLoginModal(); }}
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  로그인하기
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
