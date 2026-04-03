/**
 * RegisterModal - KPA Society 회원가입 모달
 *
 * WO-O4O-AUTH-MODAL-REGISTER-STANDARD-V1
 * WO-O4O-KPA-B-C-ACCESS-POLICY-IMPLEMENTATION-V1: 약사 전용 가입 (학생 옵션 제거)
 *
 * 흐름: form 입력 → success
 */

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthModal } from '../contexts/AuthModalContext';

type MemberType = 'pharmacist' | 'student';
type Step = 'select' | 'form' | 'success';

/** 국내 약학대학 목록 (2025 기준, 가나다순) */
const PHARMACY_UNIVERSITIES = [
  '가천대학교 약학대학',
  '가톨릭대학교 약학대학',
  '강원대학교 약학대학',
  '경북대학교 약학대학',
  '경상국립대학교 약학대학',
  '경성대학교 약학대학',
  '경희대학교 약학대학',
  '계명대학교 약학대학',
  '고려대학교 약학대학(세종)',
  '단국대학교 약학대학',
  '대구가톨릭대학교 약학대학',
  '덕성여자대학교 약학대학',
  '동국대학교 약학대학',
  '동덕여자대학교 약학대학',
  '목포대학교 약학대학',
  '부산대학교 약학대학',
  '삼육대학교 약학대학',
  '서울대학교 약학대학',
  '성균관대학교 약학대학',
  '숙명여자대학교 약학대학',
  '순천대학교 약학대학',
  '아주대학교 약학대학',
  '영남대학교 약학대학',
  '우석대학교 약학대학',
  '원광대학교 약학대학',
  '이화여자대학교 약학대학',
  '인제대학교 약학대학',
  '전남대학교 약학대학',
  '전북대학교 약학대학',
  '제주대학교 약학대학',
  '조선대학교 약학대학',
  '중앙대학교 약학대학',
  '차의과학대학교 약학대학',
  '충남대학교 약학대학',
  '충북대학교 약학대학',
  '한양대학교 약학대학(ERICA)',
];

export default function RegisterModal() {
  const { activeModal, closeModal, openLoginModal } = useAuthModal();
  const [step, setStep] = useState<Step>('select');
  const [memberType, setMemberType] = useState<MemberType>('pharmacist');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    lastName: '',
    firstName: '',
    nickname: '',
    phone: '',
    licenseNumber: '',
    branchId: '',
    groupId: '',
    universityName: '',
    studentYear: '',
    agreeTerms: false,
    agreePrivacy: false,
  });
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);
  const [groups, setGroups] = useState<Array<{id: string, name: string}>>([]);
  const [licenseStatus, setLicenseStatus] = useState<'idle' | 'checking' | 'available' | 'duplicate'>('idle');

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
      setStep('select');
      setMemberType('pharmacist');
      setFormData({
        email: '',
        password: '',
        passwordConfirm: '',
        lastName: '',
        firstName: '',
        nickname: '',
        phone: '',
        licenseNumber: '',
        branchId: '',
        groupId: '',
        universityName: '',
        studentYear: '',
        agreeTerms: false,
        agreePrivacy: false,
      });
      setError(null);
      setLicenseStatus('idle');
    }
  }, [isOpen]);

  // 지부 목록 로드
  useEffect(() => {
    if (!isOpen) return;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
    fetch(`${baseUrl}/api/v1/kpa/organizations?type=branch&active_only=true`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(res => setBranches(res.data || []))
      .catch(() => {});
  }, [isOpen]);

  // 분회 목록 로드 (지부 선택 시)
  useEffect(() => {
    if (!formData.branchId) {
      setGroups([]);
      return;
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
    fetch(`${baseUrl}/api/v1/kpa/organizations?type=group&parent_id=${formData.branchId}&active_only=true`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(res => setGroups(res.data || []))
      .catch(() => {});
  }, [formData.branchId]);

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
    if (name === 'branchId') {
      setFormData(prev => ({ ...prev, branchId: value, groupId: '' }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
          lastName: formData.lastName,
          firstName: formData.firstName,
          nickname: formData.nickname,
          phone: formData.phone,
          role: memberType,
          service: 'kpa-society',
          membershipType: memberType,
          // 약사 전용 필드
          ...(memberType === 'pharmacist' ? {
            licenseNumber: formData.licenseNumber,
            organizationId: formData.groupId || undefined,
          } : {}),
          // 학생 전용 필드
          ...(memberType === 'student' ? {
            universityName: formData.universityName,
          } : {}),
          tos: formData.agreeTerms,
          privacyAccepted: formData.agreePrivacy,
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
    const commonValid =
      formData.email &&
      formData.password &&
      isPasswordStrong &&
      formData.password === formData.passwordConfirm &&
      formData.lastName &&
      formData.firstName &&
      formData.nickname &&
      formData.phone.length >= 10 && formData.phone.length <= 11 &&
      formData.agreeTerms &&
      formData.agreePrivacy;

    if (!commonValid) return false;

    if (memberType === 'pharmacist') {
      return !!formData.licenseNumber && licenseStatus !== 'duplicate' && !!formData.groupId;
    }
    // 학생: 대학명 필수
    return !!formData.universityName;
  };

  const handleSwitchToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    openLoginModal();
  };

  if (!isOpen) return null;

  const getHeaderTitle = () => {
    if (step === 'select') return '회원가입';
    if (step === 'success') return '신청 완료';
    return memberType === 'pharmacist' ? '약사 회원가입' : '약대생 회원가입';
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
          {/* 역할 선택 */}
          {step === 'select' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 text-center">가입 유형을 선택해 주세요</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setMemberType('pharmacist'); setStep('form'); }}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <span className="text-4xl">💊</span>
                  <span className="text-lg font-bold text-gray-900">약사</span>
                  <span className="text-xs text-gray-500 text-center">면허 보유 약사<br />승인제 가입</span>
                </button>
                <button
                  onClick={() => { setMemberType('student'); setStep('form'); }}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <span className="text-4xl">🎓</span>
                  <span className="text-lg font-bold text-gray-900">약대생</span>
                  <span className="text-xs text-gray-500 text-center">약학대학 재학생<br />승인제 가입</span>
                </button>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  이미 계정이 있으신가요?{' '}
                  <a href="#" onClick={handleSwitchToLogin} className="text-blue-600 hover:underline font-medium">로그인</a>
                </p>
              </div>
            </div>
          )}

          {/* 가입 폼 */}
          {step === 'form' && (
            <>
              {/* 뒤로 + 승인제 안내 */}
              <div className="mb-6 space-y-3">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="text-sm text-blue-600 hover:underline"
                >
                  ← 가입 유형 다시 선택
                </button>
                <div className="flex gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">승인제 가입 안내</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {memberType === 'pharmacist'
                        ? '약사면허 확인 후 운영자 승인이 완료되면 서비스 이용이 가능합니다.'
                        : '재학 확인 후 운영자 승인이 완료되면 서비스 이용이 가능합니다.'}
                    </p>
                  </div>
                </div>
              </div>

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
                          placeholder="영문 소문자, 숫자, 특수문자 포함"
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
                          <span style={{ color: passwordChecks.lowercase ? '#16a34a' : '#dc2626' }}>
                            {passwordChecks.lowercase ? '\u2713' : '\u2717'} 영문 소문자
                          </span><br />
                          <span style={{ color: passwordChecks.number ? '#16a34a' : '#dc2626' }}>
                            {passwordChecks.number ? '\u2713' : '\u2717'} 숫자
                          </span><br />
                          <span style={{ color: passwordChecks.special ? '#16a34a' : '#dc2626' }}>
                            {passwordChecks.special ? '\u2713' : '\u2717'} 특수문자 (예: !@#$%^&*)
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
                        성 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        autoComplete="family-name"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="홍"
                        required
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이름 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        autoComplete="given-name"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="길동"
                        required
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        닉네임 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="nickname"
                        value={formData.nickname}
                        onChange={handleInputChange}
                        placeholder="포럼 표시명"
                        required
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">포럼에 표시될 이름</p>
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
                        placeholder="숫자만 입력"
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

                {/* 약사 전용: 면허 + 소속 */}
                {memberType === 'pharmacist' && (
                  <>
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">약사 정보</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          약사면허번호 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={handleInputChange}
                          onBlur={() => checkLicenseDuplicate(formData.licenseNumber)}
                          placeholder="00000"
                          required
                          className={`w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            licenseStatus === 'duplicate' ? 'border-red-400' :
                            licenseStatus === 'available' ? 'border-green-400' : 'border-gray-200'
                          }`}
                        />
                        <p className="text-xs text-gray-500 mt-1">약사면허증에 기재된 면허번호</p>
                        {licenseStatus === 'checking' && <p className="text-xs text-gray-500 mt-1">면허번호 확인 중...</p>}
                        {licenseStatus === 'duplicate' && <p className="text-xs text-red-500 mt-1">이미 등록된 면허번호입니다.</p>}
                        {licenseStatus === 'available' && <p className="text-xs text-green-600 mt-1">사용 가능한 면허번호입니다.</p>}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">소속 분회 <span className="text-red-500">*</span></h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">지부 (시/도)</label>
                          <select name="branchId" value={formData.branchId} onChange={handleInputChange}
                            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            <option value="">지부 선택</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">분회 (시/군/구)</label>
                          <select name="groupId" value={formData.groupId} onChange={handleInputChange} disabled={!formData.branchId}
                            className={`w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${!formData.branchId ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <option value="">{formData.branchId ? '분회 선택' : '지부를 먼저 선택'}</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 학생 전용: 약학대학 선택 */}
                {memberType === 'student' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">학생 정보</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        약학대학 <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="universityName"
                        value={formData.universityName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">약학대학을 선택해 주세요</option>
                        {PHARMACY_UNIVERSITIES.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
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

                {/* 에러 메시지 (버튼 위) */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

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
                {memberType === 'pharmacist'
                  ? '약사면허 확인 후 운영자 승인이 완료되면'
                  : '재학 정보 확인 후 운영자 승인이 완료되면'}
                <br />서비스 이용이 가능합니다.
              </p>
              <div className="bg-blue-50 rounded-lg p-4 text-left mb-6">
                <p className="text-sm text-blue-800">
                  <strong>신청 이메일:</strong> {formData.email}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>회원 유형:</strong> {memberType === 'pharmacist' ? '약사' : '약대생'}
                </p>
                {memberType === 'student' && formData.universityName && (
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>소속 대학:</strong> {formData.universityName}
                  </p>
                )}
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
