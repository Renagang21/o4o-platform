/**
 * RegisterModal - KPA Society 회원가입 모달
 *
 * WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1
 *
 * 4개 회원 그룹:
 *   1. pharmacist_member   — 약사 정회원 (면허 보유)
 *   2. pharmacy_student_member — 약대생 준회원
 *   3. external_expert     — 외부전문가 준회원
 *   4. supplier_staff      — 제약/의료기기 업체 직원
 *
 * 흐름: select → form → success
 */

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthModal } from '../contexts/AuthModalContext';

type MemberType = 'pharmacist_member' | 'pharmacy_student_member' | 'external_expert' | 'supplier_staff';
type Step = 'select' | 'form' | 'success';

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

/** 외부전문가 전문 분야 */
const EXPERT_DOMAINS = [
  { value: 'physician', label: '의사' },
  { value: 'nurse', label: '간호사' },
  { value: 'researcher', label: '연구원' },
  { value: 'lawyer', label: '법무 (변호사/법무사)' },
  { value: 'accountant', label: '회계사/세무사' },
  { value: 'healthcare_admin', label: '의료행정' },
  { value: 'nutritionist', label: '영양사/식품전문가' },
  { value: 'engineer', label: '공학/IT 전문가' },
  { value: 'other', label: '기타 전문직' },
];

/** 기관 유형 */
const INSTITUTION_TYPES = [
  { value: 'hospital', label: '의료기관 (병원/의원)' },
  { value: 'university', label: '대학교/연구기관' },
  { value: 'government', label: '공공기관/정부' },
  { value: 'law_firm', label: '법무법인' },
  { value: 'consulting', label: '컨설팅/자문' },
  { value: 'other', label: '기타' },
];

/** 업체 유형 */
const COMPANY_TYPES = [
  { value: 'pharmaceutical', label: '제약사' },
  { value: 'medical_device', label: '의료기기' },
  { value: 'cosmetics', label: '화장품/기능성' },
  { value: 'distributor', label: '도매/유통' },
  { value: 'other', label: '기타' },
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
  external_expert: {
    emoji: '🔬',
    title: '외부전문가',
    desc: '의료·법무·연구 등\n전문직 종사자',
    notice: '전문 자격 확인 후 운영자 승인이 완료되면 서비스 이용이 가능합니다.',
  },
  supplier_staff: {
    emoji: '🏭',
    title: '제약업체 직원',
    desc: '제약·의료기기·유통\n업체 재직자',
    notice: '재직 정보 확인 후 운영자 승인이 완료되면 서비스 이용이 가능합니다.',
  },
};

const SUCCESS_TYPE_LABELS: Record<MemberType, string> = {
  pharmacist_member: '약사 정회원',
  pharmacy_student_member: '약대생 준회원',
  external_expert: '외부전문가 준회원',
  supplier_staff: '제약업체 직원',
};

export default function RegisterModal() {
  const { activeModal, closeModal, openLoginModal } = useAuthModal();
  const [step, setStep] = useState<Step>('select');
  const [memberType, setMemberType] = useState<MemberType>('pharmacist_member');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<'idle' | 'checking' | 'available' | 'duplicate'>('idle');

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
    // 약사 전용
    licenseNumber: '',
    // 약대생 전용
    universityName: '',
    studentYear: '',
    // 외부전문가 전용
    expertDomain: '',     // subRole
    institutionName: '',
    institutionType: '',
    qualification: '',
    qualificationType: '',
    // 제약업체 직원 전용
    companyName: '',
    companyType: '',
    jobTitle: '',
    department: '',
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
        licenseNumber: '', universityName: '', studentYear: '',
        expertDomain: '', institutionName: '', institutionType: '',
        qualification: '', qualificationType: '',
        companyName: '', companyType: '', jobTitle: '', department: '',
      });
      setError(null);
      setLicenseStatus('idle');
    }
  }, [isOpen]);

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
    if (name === 'phone') {
      setFormData(prev => ({ ...prev, phone: value.replace(/\D/g, '') }));
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
      } else if (memberType === 'pharmacy_student_member') {
        payload.universityName = formData.universityName;
        if (formData.studentYear) payload.studentYear = parseInt(formData.studentYear, 10);
      } else if (memberType === 'external_expert') {
        payload.subRole = formData.expertDomain;
        if (formData.institutionName) payload.institutionName = formData.institutionName;
        if (formData.institutionType) payload.institutionType = formData.institutionType;
        if (formData.qualification) payload.qualification = formData.qualification;
        if (formData.qualificationType) payload.qualificationType = formData.qualificationType;
      } else if (memberType === 'supplier_staff') {
        payload.companyName = formData.companyName;
        payload.companyType = formData.companyType;
        if (formData.jobTitle) payload.jobTitle = formData.jobTitle;
        if (formData.department) payload.department = formData.department;
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

  const isFormValid = () => {
    const common =
      formData.email && formData.password && isPasswordStrong &&
      formData.password === formData.passwordConfirm &&
      formData.lastName && formData.firstName && formData.nickname &&
      formData.phone.length >= 10 && formData.phone.length <= 11 &&
      formData.agreeTerms && formData.agreePrivacy;
    if (!common) return false;

    if (memberType === 'pharmacist_member') {
      return !!formData.licenseNumber && licenseStatus !== 'duplicate';
    }
    if (memberType === 'pharmacy_student_member') {
      return !!formData.universityName;
    }
    if (memberType === 'external_expert') {
      return !!formData.expertDomain;
    }
    if (memberType === 'supplier_staff') {
      return !!formData.companyName && !!formData.companyType;
    }
    return false;
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
          {/* Step 1: 회원 유형 선택 (2×2 그리드) */}
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
                      placeholder="example@email.com" required
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                  </div>
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

                {/* 외부전문가 전용 */}
                {memberType === 'external_expert' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">전문가 정보</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">전문 분야 <span className="text-red-500">*</span></label>
                      <select name="expertDomain" value={formData.expertDomain} onChange={handleInputChange} required
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="">전문 분야 선택</option>
                        {EXPERT_DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">소속 기관명</label>
                      <input type="text" name="institutionName" value={formData.institutionName} onChange={handleInputChange}
                        placeholder="예: ○○병원, ○○대학교" className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">기관 유형</label>
                        <select name="institutionType" value={formData.institutionType} onChange={handleInputChange}
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          <option value="">선택 (선택)</option>
                          {INSTITUTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">자격/면허명</label>
                        <input type="text" name="qualification" value={formData.qualification} onChange={handleInputChange}
                          placeholder="예: 의사면허, 변호사" className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* 제약업체 직원 전용 */}
                {memberType === 'supplier_staff' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">재직 정보</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">회사명 <span className="text-red-500">*</span></label>
                      <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange}
                        placeholder="예: ○○제약" required className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">업체 유형 <span className="text-red-500">*</span></label>
                      <select name="companyType" value={formData.companyType} onChange={handleInputChange} required
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="">업체 유형 선택</option>
                        {COMPANY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">직책</label>
                        <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleInputChange}
                          placeholder="예: MR, 영업사원" className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                        <input type="text" name="department" value={formData.department} onChange={handleInputChange}
                          placeholder="예: 영업부" className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
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
              <button onClick={closeModal}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                확인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
