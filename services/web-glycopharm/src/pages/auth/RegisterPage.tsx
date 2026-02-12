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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    businessName: '',
    businessNumber: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'phone' ? value.replace(/\D/g, '') : value,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = formData.phone.replace(/\D/g, '');
    // TODO: Implement registration API call with normalizedPhone
    console.log('Submit with phone:', normalizedPhone);
    navigate('/login');
  };

  const isFormValid = () => {
    return (
      formData.email &&
      isPasswordStrong &&
      formData.password === formData.passwordConfirm &&
      formData.name &&
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">이름</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="홍길동"
                      required
                    />
                  </div>
                </div>

                <div>
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
                      value={formData.businessNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="000-00-00000"
                    />
                  </div>
                </div>
              )}

              {/* Agreements */}
              <div className="space-y-3 pt-4 border-t">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleInputChange}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    required
                  />
                  <span className="text-sm text-slate-600">
                    <span className="text-red-500">*</span> 이용약관에 동의합니다
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreePrivacy"
                    checked={formData.agreePrivacy}
                    onChange={handleInputChange}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    required
                  />
                  <span className="text-sm text-slate-600">
                    <span className="text-red-500">*</span> 개인정보처리방침에 동의합니다
                  </span>
                </label>
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
                disabled={!isFormValid()}
                className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/25 flex items-center justify-center gap-2"
              >
                가입하기
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
