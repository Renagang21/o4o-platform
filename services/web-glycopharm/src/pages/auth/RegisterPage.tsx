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
  Building2,
  Check,
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import type { UserRole } from '@/types';

// GlycoPharm은 약사 전용 서비스입니다
const roleOptions: Array<{ role: UserRole; label: string; description: string; icon: typeof Building2 }> = [
  {
    role: 'pharmacy',
    label: '약사',
    description: '약국을 운영하며 혈당관리 제품을 판매합니다',
    icon: Building2,
  },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    lastName: '',
    firstName: '',
    phone: '',
    businessName: '',
    businessNumber: '',
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
    lowercase: /[a-z]/.test(formData.password),
    uppercase: /[A-Z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[@$!%*?&]/.test(formData.password),
  };
  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);
  const isPhoneValid = /^\d{10,11}$/.test(formData.phone);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep(2);
  };

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
          lastName: formData.lastName,
          firstName: formData.firstName,
          nickname: `${formData.lastName}${formData.firstName}`,
          phone: formData.phone.replace(/\D/g, ''),
          role: selectedRole,
          service: 'glycopharm',
          tos: formData.agreeTerms,
          privacyAccepted: formData.agreePrivacy,
          marketingAccepted: formData.agreeMarketing,
          businessName: formData.businessName || undefined,
          businessNumber: formData.businessNumber || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('이미 가입된 이메일입니다. 기존 계정으로 로그인해 주세요.');
        }
        throw new Error(data.error || '회원가입에 실패했습니다.');
      }

      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.email &&
      isPasswordStrong &&
      formData.password === formData.passwordConfirm &&
      formData.lastName &&
      formData.firstName &&
      isPhoneValid &&
      formData.agreeTerms &&
      formData.agreePrivacy
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/30">
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">회원가입</h1>
          <p className="text-slate-500 mt-2">GlycoPharm과 함께 시작하세요</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            step >= 1 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'
          }`}>
            {step > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <div className={`w-12 h-1 rounded ${step >= 2 ? 'bg-primary-600' : 'bg-slate-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            step >= 2 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'
          }`}>
            {step > 2 ? <Check className="w-4 h-4" /> : '2'}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div className="space-y-6">
              {/* 약사 전용 안내 메시지 */}
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-center">
                <p className="text-sm font-medium text-primary-800">
                  GlycoPharm은 <span className="font-bold">약사 전용</span> 서비스입니다
                </p>
                <p className="text-xs text-primary-600 mt-1">
                  약국을 운영하시는 약사님만 가입하실 수 있습니다
                </p>
              </div>

              {/* 약사 선택 카드 */}
              <div className="flex justify-center">
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.role}
                      onClick={() => handleRoleSelect(option.role)}
                      className="w-full max-w-xs p-6 border-2 border-primary-500 bg-primary-50 rounded-xl text-center hover:bg-primary-100 transition-all group"
                    >
                      <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-xl bg-primary-100 group-hover:bg-primary-200 flex items-center justify-center transition-colors">
                          <Icon className="w-8 h-8 text-primary-600" />
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">{option.label}</h3>
                      <p className="text-sm text-slate-600 mb-4">{option.description}</p>
                      <div className="flex items-center justify-center gap-2 text-primary-600 font-medium">
                        <span>약사 회원가입 시작하기</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-sm text-slate-500">
                이미 계정이 있으신가요?{' '}
                <NavLink to="/login" className="text-primary-600 font-medium hover:text-primary-700">
                  로그인
                </NavLink>
              </p>
            </div>
          )}

          {/* Step 2: Registration Form */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                역할 다시 선택
              </button>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-6">
                {selectedRole && (
                  <>
                    {(() => {
                      const roleOption = roleOptions.find(r => r.role === selectedRole);
                      if (!roleOption) return null;
                      const Icon = roleOption.icon;
                      return (
                        <>
                          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{roleOption.label}</p>
                            <p className="text-xs text-slate-500">으로 가입합니다</p>
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">이메일</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="example@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">비밀번호</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="영문 대/소문자, 숫자, 특수문자 포함"
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
                        { key: 'lowercase' as const, label: '영문 소문자 포함' },
                        { key: 'uppercase' as const, label: '영문 대문자 포함' },
                        { key: 'number' as const, label: '숫자 포함' },
                        { key: 'special' as const, label: '특수문자 포함 (@$!%*?&)' },
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

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">비밀번호 확인</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      name="passwordConfirm"
                      value={formData.passwordConfirm}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="비밀번호 재입력"
                      required
                    />
                  </div>
                  {formData.passwordConfirm && formData.password !== formData.passwordConfirm && (
                    <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">성</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="길동"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">핸드폰 번호</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="하이픈(-) 없이 숫자만 입력"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">숫자만 입력 (예: 01012345678)</p>
                  {formData.phone && !isPhoneValid && (
                    <p className="text-xs text-red-500 mt-1">핸드폰 번호는 10~11자리 숫자여야 합니다</p>
                  )}
                </div>
              </div>

              {/* Business Info (약사 전용) */}
              {selectedRole === 'pharmacy' && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">약국명</label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="건강약국"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">사업자등록번호</label>
                    <input
                      type="text"
                      name="businessNumber"
                      inputMode="numeric"
                      value={formData.businessNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="숫자만 입력 (예: 1234567890)"
                      maxLength={10}
                    />
                    <p className="text-xs text-slate-400 mt-1">숫자만 입력 (예: 1234567890)</p>
                  </div>
                </div>
              )}

              {/* Agreements */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleInputChange}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    required
                  />
                  <span className="text-sm text-slate-600">
                    <span className="text-red-500">* </span>
                    <button type="button" onClick={() => setTermsModal('terms')} className="text-primary-600 underline hover:text-primary-700">
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
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    required
                  />
                  <span className="text-sm text-slate-600">
                    <span className="text-red-500">* </span>
                    <button type="button" onClick={() => setTermsModal('privacy')} className="text-primary-600 underline hover:text-primary-700">
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
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-600">
                    마케팅 정보 수신에 동의합니다 (선택)
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!isFormValid() || isLoading}
                className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/25 flex items-center justify-center gap-2"
              >
                {isLoading ? '가입 신청 중...' : '가입하기'}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
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
                    <p>이 약관은 GlycoPharm(이하 "서비스")이 제공하는 혈당관리 제품 유통 플랫폼 서비스의 이용 조건 및 절차, 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>

                    <h3 className="font-bold text-base">제2조 (정의)</h3>
                    <p>1. "서비스"란 GlycoPharm이 운영하는 혈당관리 제품 B2B 유통 플랫폼을 의미합니다.</p>
                    <p>2. "회원"이란 본 약관에 동의하고 서비스 이용 계약을 체결한 약사를 의미합니다.</p>
                    <p>3. "약국"이란 회원이 운영하는 사업장을 의미합니다.</p>

                    <h3 className="font-bold text-base">제3조 (약관의 효력 및 변경)</h3>
                    <p>1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</p>
                    <p>2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경 사유를 명시하여 공지합니다.</p>

                    <h3 className="font-bold text-base">제4조 (회원가입 및 서비스 이용)</h3>
                    <p>1. 회원가입은 약사 면허를 보유한 자에 한하여 가능합니다.</p>
                    <p>2. 회원은 가입 시 정확한 정보를 제공해야 하며, 허위 정보 제공 시 서비스 이용이 제한될 수 있습니다.</p>
                    <p>3. 서비스는 회원 가입 신청 후 운영자 승인을 거쳐 이용이 가능합니다.</p>

                    <h3 className="font-bold text-base">제5조 (서비스의 제공 및 변경)</h3>
                    <p>1. 서비스는 혈당관리 제품의 B2B 유통, 주문, 재고 관리 등의 기능을 제공합니다.</p>
                    <p>2. 서비스는 운영상·기술상 필요한 경우 제공하고 있는 서비스를 변경할 수 있습니다.</p>

                    <h3 className="font-bold text-base">제6조 (회원의 의무)</h3>
                    <p>1. 회원은 관계 법령, 본 약관의 규정, 이용 안내 등을 준수해야 합니다.</p>
                    <p>2. 회원은 타인의 정보를 도용하거나 허위 정보를 등록해서는 안 됩니다.</p>
                    <p>3. 회원은 서비스를 이용하여 얻은 정보를 회사의 사전 승낙 없이 상업적으로 이용할 수 없습니다.</p>

                    <h3 className="font-bold text-base">제7조 (면책 조항)</h3>
                    <p>1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 책임이 면제됩니다.</p>
                    <p>2. 회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.</p>

                    <p className="text-xs text-slate-400 pt-4 border-t">시행일: 2026년 2월 23일</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-base">1. 개인정보의 수집 및 이용 목적</h3>
                    <p>GlycoPharm은 다음의 목적을 위하여 개인정보를 처리합니다. 처리한 개인정보는 다음의 목적 이외의 용도로는 사용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
                    <p>- 회원 가입 및 관리: 회원제 서비스 이용에 따른 본인확인, 가입 의사 확인, 회원자격 유지·관리</p>
                    <p>- 서비스 제공: B2B 유통 서비스 제공, 주문 처리, 대금 결제, 배송</p>
                    <p>- 마케팅 및 광고: 신규 서비스 안내, 이벤트 정보 제공 (동의 시)</p>

                    <h3 className="font-bold text-base">2. 수집하는 개인정보 항목</h3>
                    <p><strong>필수 항목:</strong> 이메일, 비밀번호, 성명, 핸드폰 번호</p>
                    <p><strong>선택 항목:</strong> 약국명, 사업자등록번호</p>

                    <h3 className="font-bold text-base">3. 개인정보의 보유 및 이용 기간</h3>
                    <p>회원 탈퇴 시까지 보유하며, 관계 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
                    <p>- 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</p>
                    <p>- 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</p>
                    <p>- 소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</p>

                    <h3 className="font-bold text-base">4. 개인정보의 파기</h3>
                    <p>개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>

                    <h3 className="font-bold text-base">5. 개인정보의 제3자 제공</h3>
                    <p>GlycoPharm은 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 다만, 정보주체의 동의가 있거나 법률에 특별한 규정이 있는 경우에 한하여 제공합니다.</p>

                    <h3 className="font-bold text-base">6. 개인정보보호 책임자</h3>
                    <p>GlycoPharm은 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 개인정보보호 책임자를 지정하고 있습니다.</p>

                    <h3 className="font-bold text-base">7. 정보주체의 권리·의무</h3>
                    <p>정보주체는 GlycoPharm에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
                    <p>- 개인정보 열람 요구</p>
                    <p>- 오류 등이 있을 경우 정정 요구</p>
                    <p>- 삭제 요구</p>
                    <p>- 처리 정지 요구</p>

                    <p className="text-xs text-slate-400 pt-4 border-t">시행일: 2026년 2월 23일</p>
                  </>
                )}
              </div>
              <div className="p-4 border-t">
                <button
                  type="button"
                  onClick={() => setTermsModal(null)}
                  className="w-full py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
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
