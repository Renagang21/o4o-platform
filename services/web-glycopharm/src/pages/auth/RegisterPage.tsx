/**
 * RegisterPage — GlycoPharm 회원가입
 * WO-GLYCOPHARM-ENTRY-SCREENS-V1
 *
 * - 환자/약사 유형 선택
 * - 약사: 면허번호 필수, 가입 후 PENDING_APPROVAL 메시지
 * - 환자: 기본 정보만, 가입 후 로그인 이동
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
} from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [memberType, setMemberType] = useState<'patient' | 'pharmacist'>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    licenseNumber: '',
    businessName: '',
    businessNumber: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  const [termsModal, setTermsModal] = useState<'terms' | 'privacy' | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const numericFields = ['phone', 'businessNumber', 'licenseNumber'];
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
  const isLicenseValid = formData.licenseNumber.length >= 4;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
          lastName: '',
          firstName: formData.name,
          nickname: formData.name,
          phone: formData.phone.replace(/\D/g, ''),
          role: memberType === 'pharmacist' ? 'user' : 'consumer',
          service: 'glycopharm',
          ...(memberType === 'pharmacist' && {
            licenseNumber: formData.licenseNumber,
            businessName: formData.businessName || undefined,
            businessNumber: formData.businessNumber || undefined,
          }),
          tos: formData.agreeTerms,
          privacyAccepted: formData.agreePrivacy,
          marketingAccepted: formData.agreeMarketing,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && data.code === 'PASSWORD_MISMATCH') {
          throw new Error('이미 다른 서비스에 가입된 계정입니다. 기존 비밀번호를 입력해주세요.');
        }
        if (response.status === 409) {
          if (data.code === 'SERVICE_ALREADY_JOINED') {
            throw new Error('이미 해당 서비스에 가입된 계정입니다. 로그인해 주세요.');
          }
          throw new Error('이미 가입된 이메일입니다. 기존 계정으로 로그인해 주세요.');
        }
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
        throw new Error(errorMsg);
      }

      // 약사: 승인 대기 메시지 표시, 환자: 로그인 이동
      if (memberType === 'pharmacist') {
        setRegistrationComplete(true);
      } else {
        navigate('/login?type=patient');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const baseValid =
      formData.name &&
      formData.email &&
      isPasswordStrong &&
      formData.password === formData.passwordConfirm &&
      isPhoneValid &&
      formData.agreeTerms &&
      formData.agreePrivacy;
    if (memberType === 'pharmacist') {
      return baseValid && isLicenseValid;
    }
    return baseValid;
  };

  // 약사 가입 완료 화면
  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white">
        <div className="max-w-md text-center">
          <CheckCircle2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">가입 신청 완료</h2>
          <p className="text-slate-500 mb-6">
            약사 회원 가입 신청이 접수되었습니다.<br />
            운영자 승인 후 이용하실 수 있습니다.
          </p>
          <NavLink
            to="/login?type=pharmacist"
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
                  onClick={() => setMemberType('pharmacist')}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition-colors ${
                    memberType === 'pharmacist'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  약사
                </button>
              </div>
              {memberType === 'pharmacist' && (
                <p className="text-xs text-slate-400 mt-2">약사 가입은 운영자 승인 후 이용 가능합니다.</p>
              )}
            </div>

            {/* 기본 정보 */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">기본 정보</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">이름</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="홍길동"
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
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="example@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">비밀번호</label>
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
                  {formData.password && (
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

            {/* 약사 정보 (약사 선택 시에만 표시) */}
            {memberType === 'pharmacist' && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">약사 정보</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      약사 면허번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="licenseNumber"
                      inputMode="numeric"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="숫자만 입력"
                      required
                    />
                    <p className="text-xs text-slate-400 mt-1">약사 면허증에 기재된 번호를 입력해 주세요</p>
                    {formData.licenseNumber && !isLicenseValid && (
                      <p className="text-xs text-red-500 mt-1">면허번호를 정확히 입력해 주세요</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">약국명 (선택)</label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="건강약국"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">사업자등록번호 (선택)</label>
                    <input
                      type="text"
                      name="businessNumber"
                      inputMode="numeric"
                      value={formData.businessNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="숫자만 입력 (1234567890)"
                      maxLength={10}
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
                    <p>1. 회원가입은 환자 또는 약사 회원으로 가능합니다.</p>
                    <p>2. 약사 회원은 면허 확인 후 운영자 승인을 거쳐 이용이 가능합니다.</p>
                    <p>3. 회원은 가입 시 정확한 정보를 제공해야 하며, 허위 정보 제공 시 서비스 이용이 제한될 수 있습니다.</p>
                    <p className="text-xs text-slate-400 pt-4 border-t">시행일: 2026년 2월 23일</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-base">1. 개인정보의 수집 및 이용 목적</h3>
                    <p>GlycoPharm은 회원 가입 및 관리, 서비스 제공을 위하여 개인정보를 처리합니다.</p>
                    <h3 className="font-bold text-base">2. 수집하는 개인정보 항목</h3>
                    <p><strong>필수 항목:</strong> 이메일, 비밀번호, 성명, 휴대전화 번호</p>
                    <p><strong>약사 추가 항목:</strong> 약사 면허번호, 약국명, 사업자등록번호</p>
                    <h3 className="font-bold text-base">3. 개인정보의 보유 및 이용 기간</h3>
                    <p>회원 탈퇴 시까지 보유하며, 관계 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
                    <h3 className="font-bold text-base">4. 정보주체의 권리</h3>
                    <p>정보주체는 언제든지 개인정보 열람, 정정, 삭제, 처리 정지 요구를 할 수 있습니다.</p>
                    <p className="text-xs text-slate-400 pt-4 border-t">시행일: 2026년 2월 23일</p>
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
