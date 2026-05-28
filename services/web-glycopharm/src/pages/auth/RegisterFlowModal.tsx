/**
 * RegisterFlowModal — GlycoPharm 가입신청 3단계 모달
 *
 * WO-O4O-GLYCOPHARM-REGISTER-MODAL-FLOW-V1:
 *   RegisterPage 의 3단계 가입 흐름을 모달로 표현.
 *
 * WO-O4O-GLYCOPHARM-REGISTRATION-ROLE-TYPE-ALIGNMENT-V1:
 *   1단계(공통정보) → 2단계(참여유형) → 3단계(유형별 추가정보) 구조 유지.
 *
 * WO-O4O-GLYCOPHARM-EXISTING-ACCOUNT-APPLICATION-FLOW-V1:
 *   기존 O4O 계정 감지 시 비밀번호 재입력 플로우 제거.
 *   로그인 유도 → 로그인 후 신청 복귀 흐름으로 대체.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { useRegisterModal } from '@/contexts/RegisterModalContext';
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
  ArrowRight,
  X,
  Building2,
  Stethoscope,
} from 'lucide-react';
import { api } from '../../lib/apiClient';
import { AddressSearch } from '@o4o/ui';

type Step = 1 | 2 | 3;
type ParticipationType = 'pharmacist' | 'pharmacy_owner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RegisterFlowModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { openLoginModal } = useLoginModal();
  const { closeRegisterModal } = useRegisterModal();
  const [step, setStep] = useState<Step>(1);
  const [participationType, setParticipationType] = useState<ParticipationType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [emailAlreadyJoined, setEmailAlreadyJoined] = useState(false);

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    nickname: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    licenseNumber: '',
    businessName: '',
    representativeName: '',
    businessNumber: '',
    taxEmail: '',
    businessType: '',
    businessCategory: '',
    zipCode: '',
    address1: '',
    address2: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  // 모달 열릴 때 상태 초기화
  useEffect(() => {
    if (open) {
      setStep(1);
      setParticipationType(null);
      setError(null);
      setRegistrationComplete(false);
      setEmailAlreadyJoined(false);
      setShowPassword(false);
      setFormData({
        lastName: '', firstName: '', nickname: '', email: '',
        password: '', passwordConfirm: '',
        phone: '', licenseNumber: '',
        businessName: '', representativeName: '', businessNumber: '',
        taxEmail: '', businessType: '', businessCategory: '',
        zipCode: '', address1: '', address2: '',
        agreeTerms: false, agreePrivacy: false, agreeMarketing: false,
      });
    }
  }, [open]);

  // 배경 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

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
      const res = await api.post<{ success: boolean; data: { exists: boolean; alreadyJoined?: boolean; services?: Array<{ key: string; status: string }> } }>(
        '/auth/check-email', { email: formData.email, service: 'glycopharm' }
      );
      const result = res.data;
      if (result.success && result.data.alreadyJoined) {
        setEmailAlreadyJoined(true);
        const svc = result.data.services?.find((s: { key: string; status: string }) => s.key === 'glycopharm');
        if (svc?.status === 'pending') {
          setError('GlycoPharm 가입 신청이 심사 중입니다. 승인을 기다려 주세요.');
        } else {
          setError('이미 GlycoPharm 서비스에 가입된 계정입니다. 로그인해 주세요.');
        }
      } else {
        setEmailAlreadyJoined(false);
        setError(null);
      }
    } catch { /* silent */ }
  };

  const isStep1Valid = () => {
    if (emailAlreadyJoined) return false;
    const base = formData.lastName && formData.firstName && formData.nickname
      && formData.email && isPhoneValid;
    return !!(base && isPasswordStrong && formData.password === formData.passwordConfirm);
  };

  // WO-O4O-GLYCOPHARM-PHARMACY-OWNER-REGISTRATION-BUTTON-E2E-FIX-V1:
  //   단순 truthy 만 체크하던 기존 validation 을 강화한다.
  //   - businessNumber: 정확히 10자리 숫자 (사업자등록번호 표준)
  //   - taxEmail: 기본 email 패턴
  //   강화 전: 형식 오류여도 버튼 enabled → 클릭 시 HTML5 native validation 이 silent 차단.
  //   강화 후: 형식 오류면 버튼 disabled + missing fields 안내에 표시 → 사용자 인지 가능.
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isBusinessNumberValid = formData.businessNumber.length === 10;
  const isTaxEmailValid = EMAIL_REGEX.test(formData.taxEmail);

  const isStep3Valid = () => {
    const terms = formData.agreeTerms && formData.agreePrivacy;
    if (participationType === 'pharmacist') return terms;
    if (participationType === 'pharmacy_owner') {
      return terms
        && !!formData.businessName
        && !!formData.representativeName
        && isBusinessNumberValid
        && isTaxEmailValid;
    }
    return false;
  };

  // WO-O4O-GLYCOPHARM-REGISTER-STEP3-VALIDATION-UX-FIX-V1 (강화):
  //   버튼 disabled 이유를 사용자에게 표시. 형식 오류도 missing 으로 노출.
  const getStep3MissingFields = (): string[] => {
    const missing: string[] = [];
    if (participationType === 'pharmacy_owner') {
      if (!formData.businessName) missing.push('약국명');
      if (!formData.representativeName) missing.push('대표자명');
      if (!formData.businessNumber) missing.push('사업자등록번호');
      else if (!isBusinessNumberValid) missing.push('사업자등록번호(10자리 숫자)');
      if (!formData.taxEmail) missing.push('세금계산서 이메일');
      else if (!isTaxEmailValid) missing.push('세금계산서 이메일(형식)');
    }
    if (!formData.agreeTerms) missing.push('이용약관 동의');
    if (!formData.agreePrivacy) missing.push('개인정보처리방침 동의');
    return missing;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const commonFields = {
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.passwordConfirm,
        lastName: formData.lastName,
        firstName: formData.firstName,
        nickname: formData.nickname,
        phone: formData.phone.replace(/\D/g, ''),
        service: 'glycopharm',
        tos: formData.agreeTerms,
        privacyAccepted: formData.agreePrivacy,
        marketingAccepted: formData.agreeMarketing,
      };

      if (participationType === 'pharmacist') {
        await api.post('/auth/register', {
          ...commonFields,
          role: 'user',
          subRole: 'staff_pharmacist',
          ...(formData.licenseNumber ? { licenseNumber: formData.licenseNumber } : {}),
        });
      } else {
        await api.post('/auth/register', {
          ...commonFields,
          role: 'pharmacy',
          businessName: formData.businessName,
          representativeName: formData.representativeName,
          businessNumber: formData.businessNumber,
          taxEmail: formData.taxEmail,
          ...(formData.licenseNumber ? { licenseNumber: formData.licenseNumber } : {}),
          ...(formData.businessType ? { businessType: formData.businessType } : {}),
          ...(formData.businessCategory ? { businessCategory: formData.businessCategory } : {}),
          ...(formData.zipCode ? { zipCode: formData.zipCode } : {}),
          ...(formData.address1 ? { address1: formData.address1 } : {}),
          ...(formData.address2 ? { address2: formData.address2 } : {}),
        });
      }

      setRegistrationComplete(true);
    } catch (err: any) {
      if (err.response?.data) {
        const data = err.response.data;
        const status = err.response.status;
        if (status === 409) {
          setError(data.code === 'SERVICE_ALREADY_JOINED'
            ? '이미 GlycoPharm 서비스에 가입된 계정입니다. 로그인해 주세요.'
            : '이미 가입된 이메일입니다. 기존 계정으로 로그인해 주세요.');
          setStep(1);
        } else {
          let msg = data.error || data.message || '가입 신청에 실패했습니다.';
          if (data.details && Array.isArray(data.details) && data.details.length > 0) {
            const fieldErrors = data.details
              .map((d: { property?: string; constraints?: Record<string, string> }) => {
                const msgs = d.constraints ? Object.values(d.constraints).join(', ') : d.property;
                return `${d.property}: ${msgs}`;
              })
              .join('\n');
            msg += '\n' + fieldErrors;
          }
          setError(msg);
        }
      } else {
        setError('가입 신청에 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const PWD_CHECKS = [
    { key: 'length' as const, label: '8자 이상' },
    { key: 'letter' as const, label: '영문 포함' },
    { key: 'number' as const, label: '숫자 포함' },
    { key: 'special' as const, label: '특수문자 포함' },
  ];

  const stepLabel = ['공통 정보', '참여 유형', '추가 정보'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">GlycoPharm 가입신청</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Step Indicator */}
        {!registrationComplete && (
          <div className="flex items-center justify-center gap-2 px-6 py-3 border-b shrink-0 bg-slate-50">
            {([1, 2, 3] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step === s ? 'bg-blue-600 text-white' : step > s ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'
                }`}>
                  {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                <span className={`text-xs hidden sm:inline ${step === s ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                  {stepLabel[i]}
                </span>
                {s < 3 && <div className="w-6 h-px bg-slate-300" />}
              </div>
            ))}
          </div>
        )}

        {/* Modal Body (scrollable) */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── 완료 화면 ── */}
          {registrationComplete && (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-3">가입신청이 접수되었습니다</h3>
              <p className="text-slate-500 mb-2">
                운영자 승인 후 GlycoPharm 서비스를 이용하실 수 있습니다.
              </p>
              {participationType === 'pharmacy_owner' && (
                <p className="text-sm text-slate-400 mb-6">
                  승인 후 매장 HUB와 내 매장 메뉴를 이용하실 수 있습니다.
                </p>
              )}
              {participationType === 'pharmacist' && (
                <p className="text-sm text-slate-400 mb-6">
                  승인 후 약사 회원으로 서비스를 이용하실 수 있습니다.
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {/* WO-O4O-GLYCOPHARM-LOGIN-PAGE-TO-MODAL-ALIGNMENT-V1:
                    /login 은 LoginGate 로 대체됨 — NavLink 대신 모달 직접 전환. */}
                <button
                  type="button"
                  onClick={() => { closeRegisterModal(); navigate('/'); openLoginModal(); }}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  로그인하기
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: 공통 정보 ── */}
          {!registrationComplete && step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700 mb-1">기본 정보를 입력해 주세요</p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">성 <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="홍" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">이름 <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="길동" required />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">닉네임 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" name="nickname" value={formData.nickname} onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="서비스에서 사용할 닉네임" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">아이디 (이메일) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} onBlur={handleEmailBlur}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="example@email.com" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange}
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="영문, 숫자, 특수문자 포함 8자 이상" required />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-1.5 grid grid-cols-2 gap-1">
                    {PWD_CHECKS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-1">
                        {passwordChecks[key] ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Circle className="w-3 h-3 text-slate-300" />}
                        <span className={`text-xs ${passwordChecks[key] ? 'text-green-600' : 'text-slate-400'}`}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호 확인 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="비밀번호 재입력" required />
                </div>
                {formData.passwordConfirm && formData.password !== formData.passwordConfirm && (
                  <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">휴대전화 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="tel" name="phone" inputMode="numeric" value={formData.phone} onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="숫자만 입력 (01012345678)" required />
                </div>
                {formData.phone && !isPhoneValid && (
                  <p className="text-xs text-red-500 mt-1">휴대전화 번호는 10~11자리 숫자여야 합니다</p>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: 참여 유형 선택 ── */}
          {!registrationComplete && step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700">참여 유형을 선택해 주세요</p>
              <p className="text-xs text-slate-500">선택한 유형에 따라 추가 정보 입력 및 이용 가능한 서비스가 달라집니다.</p>

              <div className="grid grid-cols-1 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setParticipationType('pharmacist'); setStep(3); }}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">약사 / 근무약사</p>
                    <p className="text-sm text-slate-500">약사 회원으로 가입합니다. 커뮤니티, 콘텐츠, 강의 등 일반 서비스를 이용할 수 있습니다.</p>
                    <p className="text-xs text-slate-400 mt-1.5">승인 후 역할: 약사 회원</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setParticipationType('pharmacy_owner'); setStep(3); }}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-green-400 hover:bg-green-50 transition-all text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">약국 경영자</p>
                    <p className="text-sm text-slate-500">약국을 운영하는 경영자로 가입합니다. 사업자 정보 입력이 필요합니다.</p>
                    <p className="text-xs text-slate-400 mt-1.5">승인 후 매장 HUB와 내 매장 메뉴를 이용하실 수 있습니다.</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: 유형별 추가 정보 ── */}
          {!registrationComplete && step === 3 && (
            <form id="register-step3" onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm font-semibold text-slate-700">
                {participationType === 'pharmacist' ? '약사 / 근무약사' : '약국 경영자'} 추가 정보
              </p>
              <p className="text-xs text-slate-500">
                {participationType === 'pharmacist'
                  ? '약사 면허번호를 입력하시면 심사에 도움이 됩니다.'
                  : '약국 정보와 사업자 정보를 입력해 주세요.'}
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
                </div>
              )}

              {participationType === 'pharmacist' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">약사 면허번호 <span className="text-slate-400 text-xs">(선택)</span></label>
                  <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="면허번호 입력 (선택 사항)" />
                  <p className="text-xs text-slate-400 mt-1">면허번호는 운영자 심사 시 참고됩니다.</p>
                </div>
              )}

              {participationType === 'pharmacy_owner' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">약국명 <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" name="businessName" value={formData.businessName} onChange={handleInputChange}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="건강약국" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">대표자명 <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" name="representativeName" value={formData.representativeName} onChange={handleInputChange}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="약국 대표자 이름" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">사업자등록번호 <span className="text-red-500">*</span></label>
                    <input type="text" name="businessNumber" inputMode="numeric" value={formData.businessNumber} onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="숫자만 입력 (1234567890)" maxLength={10} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">약사 면허번호 <span className="text-slate-400 text-xs">(선택)</span></label>
                    <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="대표 약사 면허번호 (있는 경우)" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">세금계산서 이메일 <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="email" name="taxEmail" value={formData.taxEmail} onChange={handleInputChange}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="tax@pharmacy.com" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">업태</label>
                      <input type="text" name="businessType" value={formData.businessType} onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="소매업" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">업종</label>
                      <input type="text" name="businessCategory" value={formData.businessCategory} onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="의약품" />
                    </div>
                  </div>
                  <AddressSearch
                    zipCode={formData.zipCode}
                    address={formData.address1}
                    addressDetail={formData.address2}
                    onChange={({ zipCode, address, addressDetail }) =>
                      setFormData(prev => ({ ...prev, zipCode, address1: address, address2: addressDetail }))
                    }
                    inputClassName="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              )}

              {/* 약관 동의 */}
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-start gap-2.5">
                  <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleInputChange}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" required />
                  <span className="text-sm text-slate-600">
                    <span className="text-red-500">* </span>
                    이용약관에 동의합니다
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <input type="checkbox" name="agreePrivacy" checked={formData.agreePrivacy} onChange={handleInputChange}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" required />
                  <span className="text-sm text-slate-600">
                    <span className="text-red-500">* </span>
                    개인정보처리방침에 동의합니다
                  </span>
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" name="agreeMarketing" checked={formData.agreeMarketing} onChange={handleInputChange}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-600">마케팅 정보 수신에 동의합니다 (선택)</span>
                </label>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer (fixed) */}
        {!registrationComplete && (
          <div className="px-6 py-4 border-t bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => { setError(null); setStep(step === 3 ? 2 : 1); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  이전
                </button>
              )}
              <div className="flex-1" />
              {step === 1 && (
                <button
                  type="button"
                  disabled={!isStep1Valid()}
                  onClick={() => { setError(null); setStep(2); }}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  다음
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {step === 2 && (
                <p className="text-xs text-slate-400">유형을 선택하면 자동으로 다음 단계로 이동합니다</p>
              )}
              {step === 3 && (
                <div className="flex flex-col items-end gap-1.5">
                  {!isStep3Valid() && !isLoading && (() => {
                    const missing = getStep3MissingFields();
                    return missing.length > 0 ? (
                      <p className="text-xs text-amber-600 text-right">
                        {missing.join(', ')}을(를) 확인해 주세요.
                      </p>
                    ) : null;
                  })()}
                  <button
                    type="submit"
                    form="register-step3"
                    disabled={!isStep3Valid() || isLoading}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? '신청 처리 중...' : '가입신청'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
