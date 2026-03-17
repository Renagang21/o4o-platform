/**
 * RegisterPage — GlycoPharm 회원가입
 * WO-O4O-GLYCOPHARM-SIGNUP-REFORM-V1
 *
 * - 환자/약국 유형 선택
 * - 약국: 사업자 정보 필수 (약국명, 사업자번호, 세금계산서 이메일)
 * - 닉네임: 필수 입력
 * - 면허번호: 제거
 */

import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  Activity,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  ArrowLeft,
  X,
  Building2,
} from 'lucide-react';
import { api } from '../../lib/apiClient';

const SERVICE_LABELS: Record<string, string> = {
  neture: 'Neture', glycopharm: 'GlycoPharm', glucoseview: 'GlucoseView',
  'k-cosmetics': 'K-Cosmetics', 'kpa-society': '대한약사회', platform: 'O4O 플랫폼',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [memberType, setMemberType] = useState<'patient' | 'pharmacy'>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [existingAccountMode, setExistingAccountMode] = useState(false);
  const [existingServices, setExistingServices] = useState<Array<{key: string, status: string}>>([]);

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    nickname: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    businessName: '',
    businessNumber: '',
    taxEmail: '',
    businessType: '',
    businessCategory: '',
    address1: '',
    address2: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  const [termsModal, setTermsModal] = useState<'terms' | 'privacy' | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const numericFields = ['phone', 'businessNumber'];
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : numericFields.includes(name) ? value.replace(/\D/g, '') : value,
    }));
  };

  const passwordChecks = {
    length: formData.password.length >= 8,
    letter: /[a-zA-Z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[^A-Za-z\d\s]/.test(formData.password),
  };
  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);
  const isPhoneValid = /^\d{10,11}$/.test(formData.phone);

  const handleEmailBlur = async () => {
    if (!formData.email || !formData.email.includes('@')) return;
    try {
      const res = await api.post<{ success: boolean; data: { exists: boolean; alreadyJoined?: boolean; services?: Array<{key: string, status: string}> } }>('/auth/check-email', { email: formData.email, service: 'glycopharm' });
      const result = res.data;
      if (result.success && result.data.exists) {
        if (result.data.alreadyJoined) {
          setError('이미 GlycoPharm 서비스에 가입된 계정입니다. 로그인해 주세요.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.passwordConfirm,
        lastName: formData.lastName,
        firstName: formData.firstName,
        nickname: formData.nickname,
        phone: formData.phone.replace(/\D/g, ''),
        role: memberType === 'pharmacy' ? 'seller' : 'customer',
        service: 'glycopharm',
        ...(memberType === 'pharmacy' && {
          businessName: formData.businessName || undefined,
          businessNumber: formData.businessNumber || undefined,
          taxEmail: formData.taxEmail || undefined,
          businessType: formData.businessType || undefined,
          businessCategory: formData.businessCategory || undefined,
          address1: formData.address1 || undefined,
          address2: formData.address2 || undefined,
        }),
        tos: formData.agreeTerms,
        privacyAccepted: formData.agreePrivacy,
        marketingAccepted: formData.agreeMarketing,
      });

      // 약국: 승인 대기 메시지 표시, 환자: 로그인 이동
      if (memberType === 'pharmacy') {
        setRegistrationComplete(true);
      } else {
        navigate('/login?type=patient');
      }
    } catch (err: any) {
      if (err.response?.data) {
        const data = err.response.data;
        const status = err.response.status;
        if (status === 401 && data.code === 'PASSWORD_MISMATCH') {
          setExistingAccountMode(true);
          if (data.services) setExistingServices(data.services);
          setError('비밀번호가 일치하지 않습니다. O4O 계정 가입 시 사용한 기존 비밀번호를 입력해주세요.');
        } else if (status === 409) {
          if (data.code === 'SERVICE_ALREADY_JOINED') {
            setError('이미 GlycoPharm 서비스에 가입된 계정입니다. 로그인해 주세요.');
          } else {
            setError('이미 가입된 이메일입니다. 기존 계정으로 로그인해 주세요.');
          }
        } else {
          let errorMsg = data.error || data.message || '회원가입에 실패했습니다.';
          if (data.details && Array.isArray(data.details) && data.details.length > 0) {
            const fieldErrors = data.details
              .map((d: { property?: string; constraints?: Record<string, string> }) => {
                const msgs = d.constraints ? Object.values(d.constraints).join(', ') : d.property;
                return `${d.property}: ${msgs}`;
              })
              .join('\n');
            errorMsg += '\n' + fieldErrors;
          }
          setError(errorMsg);
        }
      } else {
        setError('회원가입에 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const baseFields = formData.lastName && formData.firstName && formData.nickname &&
      formData.email && isPhoneValid && formData.agreeTerms && formData.agreePrivacy;
    const passwordValid = existingAccountMode
      ? formData.password.length > 0
      : isPasswordStrong && formData.password === formData.passwordConfirm;
    const baseValid = baseFields && passwordValid;
    if (memberType === 'pharmacy') {
      return baseValid && formData.businessName && formData.businessNumber && formData.taxEmail;
    }
    return baseValid;
  };

  // 약국 가입 완료 화면
  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white">
        <div className="max-w-md text-center">
          <CheckCircle2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">가입 신청 완료</h2>
          <p className="text-slate-500 mb-6">
            약국 회원 가입 신청이 접수되었습니다.<br />
            운영자 승인 후 이용하실 수 있습니다.
          </p>
          <NavLink
            to="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            로그인 페이지로
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-white">
      <div className="w-full max-w-lg">
        {/* 홈으로 돌아가기 */}
        <NavLink to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          홈으로
        </NavLink>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center">
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">회원가입</h1>
          <p className="text-slate-500 mt-2">GlycoPharm 회원가입</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
              </div>
            )}

            {/* 회원 유형 선택 */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">회원 유형</h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMemberType('patient')}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition-colors ${
                    memberType === 'patient'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  환자
                </button>
                <button
                  type="button"
                  onClick={() => setMemberType('pharmacy')}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition-colors ${
                    memberType === 'pharmacy'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  약국
                </button>
              </div>
              {memberType === 'pharmacy' && (
                <p className="text-xs text-slate-400 mt-2">약국 가입은 운영자 승인 후 이용 가능합니다.</p>
              )}
            </div>

            {/* 기본 정보 */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">기본 정보</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">성</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="홍"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">이름</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="길동"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    닉네임 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="nickname"
                      value={formData.nickname}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="서비스에서 사용할 닉네임"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">아이디 (이메일)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={handleEmailBlur}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="example@email.com"
                      required
                    />
                  </div>
                </div>

                {existingAccountMode && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4">
                    <p className="font-semibold text-sm">이미 O4O 플랫폼 계정이 존재합니다</p>
                    <p className="text-sm mt-1">기존 비밀번호를 입력하면 GlycoPharm 서비스 가입이 진행됩니다.</p>
                    {existingServices.length > 0 && (
                      <p className="text-xs mt-1 text-blue-600">
                        가입된 서비스: {existingServices.map(s => SERVICE_LABELS[s.key] || s.key).join(', ')}
                      </p>
                    )}
                    <div className="mt-2 text-xs space-x-2">
                      <a href="/login" className="text-blue-700 underline">로그인</a>
                      <span>·</span>
                      <a href="/forgot-password" className="text-blue-700 underline">비밀번호 찾기</a>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {existingAccountMode ? '기존 비밀번호' : '비밀번호'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5 text-slate-400" /> : <Eye className="w-5 h-5 text-slate-400" />}
                    </button>
                  </div>
                  {!existingAccountMode && formData.password && (
                    <div className="mt-2 space-y-1">
                      {[
                        { key: 'length' as const, label: '8자 이상' },
                        { key: 'letter' as const, label: '영문 포함' },
                        { key: 'number' as const, label: '숫자 포함' },
                        { key: 'special' as const, label: '특수문자 포함' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-1.5">
                          {passwordChecks[key] ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-slate-300" />
                          )}
                          <span className={`text-xs ${passwordChecks[key] ? 'text-green-600' : 'text-slate-400'}`}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!existingAccountMode && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">비밀번호 확인</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      name="passwordConfirm"
                      value={formData.passwordConfirm}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="비밀번호 재입력"
                      required
                    />
                  </div>
                  {formData.passwordConfirm && formData.password !== formData.passwordConfirm && (
                    <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다</p>
                  )}
                </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">휴대전화</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      inputMode="numeric"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="숫자만 입력 (01012345678)"
                      required
                    />
                  </div>
                  {formData.phone && !isPhoneValid && (
                    <p className="text-xs text-red-500 mt-1">휴대전화 번호는 10~11자리 숫자여야 합니다</p>
                  )}
                </div>
              </div>
            </div>

            {/* 약국 정보 (약국 선택 시에만 표시) */}
            {memberType === 'pharmacy' && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">약국 정보</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      약국명 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="건강약국"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      사업자등록번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="businessNumber"
                      inputMode="numeric"
                      value={formData.businessNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="숫자만 입력 (1234567890)"
                      maxLength={10}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      세금계산서 이메일 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        name="taxEmail"
                        value={formData.taxEmail}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="tax@pharmacy.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">업태</label>
                      <input
                        type="text"
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="소매업"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">업종</label>
                      <input
                        type="text"
                        name="businessCategory"
                        value={formData.businessCategory}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="의약품"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">주소</label>
                    <input
                      type="text"
                      name="address1"
                      value={formData.address1}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="서울특별시 강남구 테헤란로 123"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">상세주소</label>
                    <input
                      type="text"
                      name="address2"
                      value={formData.address2}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1층 건강약국"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 약관 동의 */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  required
                />
                <span className="text-sm text-slate-600">
                  <span className="text-red-500">* </span>
                  <button type="button" onClick={() => setTermsModal('terms')} className="text-blue-600 underline hover:text-blue-700">
                    이용약관
                  </button>
                  에 동의합니다
                </span>
              </div>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agreePrivacy"
                  checked={formData.agreePrivacy}
                  onChange={handleInputChange}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  required
                />
                <span className="text-sm text-slate-600">
                  <span className="text-red-500">* </span>
                  <button type="button" onClick={() => setTermsModal('privacy')} className="text-blue-600 underline hover:text-blue-700">
                    개인정보처리방침
                  </button>
                  에 동의합니다
                </span>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeMarketing"
                  checked={formData.agreeMarketing}
                  onChange={handleInputChange}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">
                  마케팅 정보 수신에 동의합니다 (선택)
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!isFormValid() || isLoading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '가입 신청 중...' : '가입하기'}
            </button>

            <p className="text-center text-sm text-slate-500">
              이미 계정이 있으신가요?{' '}
              <NavLink to="/login" className="text-blue-600 font-medium hover:text-blue-700">
                로그인
              </NavLink>
            </p>
          </form>
        </div>

        {/* Terms / Privacy Modal */}
        {termsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setTermsModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="text-lg font-bold text-slate-800">
                  {termsModal === 'terms' ? '이용약관' : '개인정보처리방침'}
                </h2>
                <button type="button" onClick={() => setTermsModal(null)} className="p-1 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto text-sm text-slate-700 leading-relaxed space-y-4">
                {termsModal === 'terms' ? (
                  <>
                    <h3 className="font-bold text-base">제1조 (목적)</h3>
                    <p>이 약관은 GlycoPharm(이하 "서비스")이 제공하는 혈당관리 플랫폼 서비스의 이용 조건 및 절차, 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                    <h3 className="font-bold text-base">제2조 (정의)</h3>
                    <p>1. "서비스"란 GlycoPharm이 운영하는 혈당관리 플랫폼을 의미합니다.</p>
                    <p>2. "회원"이란 본 약관에 동의하고 서비스 이용 계약을 체결한 자를 의미합니다.</p>
                    <h3 className="font-bold text-base">제3조 (약관의 효력 및 변경)</h3>
                    <p>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</p>
                    <h3 className="font-bold text-base">제4조 (회원가입 및 서비스 이용)</h3>
                    <p>1. 회원가입은 환자 또는 약국 회원으로 가능합니다.</p>
                    <p>2. 약국 회원은 사업자 정보 확인 후 운영자 승인을 거쳐 이용이 가능합니다.</p>
                    <p>3. 회원은 가입 시 정확한 정보를 제공해야 하며, 허위 정보 제공 시 서비스 이용이 제한될 수 있습니다.</p>
                    <p className="text-xs text-slate-400 pt-4 border-t">시행일: 2026년 3월 17일</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-base">1. 개인정보의 수집 및 이용 목적</h3>
                    <p>GlycoPharm은 회원 가입 및 관리, 서비스 제공을 위하여 개인정보를 처리합니다.</p>
                    <h3 className="font-bold text-base">2. 수집하는 개인정보 항목</h3>
                    <p><strong>필수 항목:</strong> 이메일, 비밀번호, 성명, 닉네임, 휴대전화 번호</p>
                    <p><strong>약국 추가 항목:</strong> 약국명, 사업자등록번호, 세금계산서 이메일, 업태, 업종, 주소</p>
                    <h3 className="font-bold text-base">3. 개인정보의 보유 및 이용 기간</h3>
                    <p>회원 탈퇴 시까지 보유하며, 관계 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
                    <h3 className="font-bold text-base">4. 정보주체의 권리</h3>
                    <p>정보주체는 언제든지 개인정보 열람, 정정, 삭제, 처리 정지 요구를 할 수 있습니다.</p>
                    <p className="text-xs text-slate-400 pt-4 border-t">시행일: 2026년 3월 17일</p>
                  </>
                )}
              </div>
              <div className="p-4 border-t">
                <button
                  type="button"
                  onClick={() => setTermsModal(null)}
                  className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
