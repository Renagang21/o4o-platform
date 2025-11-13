/**
 * Business Register Shortcode
 * Multi-step registration for businesses (individual or corporate)
 */

import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  CheckCircle,
  Building2,
  UserCircle2
} from 'lucide-react';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import { authClient } from '@o4o/auth-client';
import { getRedirectForRole } from '@/config/roleRedirects';

// Business Register Component (Multi-step registration for businesses)
export const BusinessRegisterComponent: React.FC<{
  title?: string;
  subtitle?: string;
  redirectUrl?: string;
  loginUrl?: string;
  loginText?: string;
  loginLinkText?: string;
}> = ({
  title = '사업자 등록',
  subtitle = '사업자로 등록하여 서비스를 이용하세요',
  redirectUrl = '/',
  loginUrl = '/login',
  loginText = '이미 계정이 있으신가요?',
  loginLinkText = '로그인'
}) => {
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<'individual' | 'corporate' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: 로그인 정보
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    tos: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Step 3: 상세 정보 (개인)
  const [individualData, setIndividualData] = useState({
    name: '',
    phone: '',
    residentNumber: '', // 주민등록번호
    memo: ''
  });

  // Step 3: 상세 정보 (사업체)
  const [corporateData, setCorporateData] = useState({
    businessNumber: '', // 사업자 등록번호
    businessName: '', // 사업자명
    ceoName: '', // 대표자
    businessAddress: '', // 사업장 소재지
    businessPhone: '', // 사업자 전화번호
    taxEmail: '', // 세금계산서용 이메일
    managerName: '', // 담당자 이름
    managerPhone: '', // 담당자 전화번호
    managerEmail: '', // 담당자 이메일
    memo: ''
  });

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!authData.email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요';
    }

    // Password validation
    if (!authData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (authData.password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다';
    }

    // Password confirmation
    if (!authData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요';
    } else if (authData.password !== authData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다';
    }

    // TOS validation
    if (!authData.tos) {
      newErrors.tos = '이용약관에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (businessType === 'individual') {
      if (!individualData.name) newErrors.name = '이름을 입력해주세요';
      if (!individualData.phone) newErrors.phone = '연락처를 입력해주세요';
      if (!individualData.residentNumber) newErrors.residentNumber = '주민등록번호를 입력해주세요';
    } else if (businessType === 'corporate') {
      if (!corporateData.businessNumber) newErrors.businessNumber = '사업자 등록번호를 입력해주세요';
      if (!corporateData.businessName) newErrors.businessName = '사업자명을 입력해주세요';
      if (!corporateData.ceoName) newErrors.ceoName = '대표자명을 입력해주세요';
      if (!corporateData.businessAddress) newErrors.businessAddress = '사업장 소재지를 입력해주세요';
      if (!corporateData.businessPhone) newErrors.businessPhone = '사업자 전화번호를 입력해주세요';
      if (!corporateData.taxEmail) newErrors.taxEmail = '세금계산서용 이메일을 입력해주세요';
      if (!corporateData.managerName) newErrors.managerName = '담당자 이름을 입력해주세요';
      if (!corporateData.managerPhone) newErrors.managerPhone = '담당자 전화번호를 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Next = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleStep2Next = () => {
    if (!businessType) {
      setErrors({ businessType: '사업자 유형을 선택해주세요' });
      return;
    }
    setErrors({});
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Prepare business info based on type
      let businessInfo: any = {
        type: businessType
      };

      if (businessType === 'individual') {
        businessInfo = {
          ...businessInfo,
          name: individualData.name,
          phone: individualData.phone,
          residentNumber: individualData.residentNumber,
          memo: individualData.memo
        };
      } else {
        businessInfo = {
          ...businessInfo,
          businessNumber: corporateData.businessNumber,
          businessName: corporateData.businessName,
          ceoName: corporateData.ceoName,
          businessAddress: corporateData.businessAddress,
          businessPhone: corporateData.businessPhone,
          taxEmail: corporateData.taxEmail,
          managerName: corporateData.managerName,
          managerPhone: corporateData.managerPhone,
          managerEmail: corporateData.managerEmail,
          memo: corporateData.memo
        };
      }

      // Submit registration
      const response = await authClient.api.post('/auth/signup', {
        email: authData.email,
        password: authData.password,
        passwordConfirm: authData.passwordConfirm,
        tos: true,
        businessInfo
      });

      if (response.data.success) {
        // Determine redirect based on user role
        const userRole = response.data.user?.role || response.data.user?.currentRole;
        const roleRedirect = userRole ? getRedirectForRole(userRole) : redirectUrl;

        // Redirect on success
        window.location.href = roleRedirect;
      } else {
        setErrors({ general: response.data.message || '등록에 실패했습니다.' });
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      const errorMessage = errorData?.message;
      setErrors({ general: errorMessage || '등록에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-full h-1 mx-2 ${
                    step > s ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  style={{ minWidth: '80px' }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>로그인 정보</span>
          <span>유형 선택</span>
          <span>상세 정보</span>
        </div>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700 text-sm">{errors.general}</span>
        </div>
      )}

      {/* Step 1: 로그인 정보 */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일 주소 *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={authData.email}
                onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                className={`block w-full pl-10 pr-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="your@email.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={authData.password}
                onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                className={`block w-full pl-10 pr-10 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="비밀번호 (8자 이상)"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Password Confirm */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인 *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPasswordConfirm ? 'text' : 'password'}
                value={authData.passwordConfirm}
                onChange={(e) => setAuthData({ ...authData, passwordConfirm: e.target.value })}
                className={`block w-full pl-10 pr-10 py-2 border ${
                  errors.passwordConfirm ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="비밀번호 재입력"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
              >
                {showPasswordConfirm ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.passwordConfirm && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.passwordConfirm}
              </p>
            )}
          </div>

          {/* TOS */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={authData.tos}
                onChange={(e) => setAuthData({ ...authData, tos: e.target.checked })}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                <a href="/terms" className="text-blue-600 hover:text-blue-800 underline">
                  이용약관
                </a>
                {' '}및{' '}
                <a href="/privacy" className="text-blue-600 hover:text-blue-800 underline">
                  개인정보처리방침
                </a>
                에 동의합니다 *
              </span>
            </label>
            {errors.tos && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.tos}
              </p>
            )}
          </div>

          {/* Next Button */}
          <button
            onClick={handleStep1Next}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다음 단계
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Step 2: 유형 선택 */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              사업자 유형을 선택해주세요 *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setBusinessType('individual')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  businessType === 'individual'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <UserCircle2 className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                <div className="font-semibold text-gray-900">개인</div>
                <div className="text-xs text-gray-500 mt-1">개인 사업자</div>
              </button>
              <button
                type="button"
                onClick={() => setBusinessType('corporate')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  businessType === 'corporate'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Building2 className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                <div className="font-semibold text-gray-900">사업체</div>
                <div className="text-xs text-gray-500 mt-1">법인 사업자</div>
              </button>
            </div>
            {errors.businessType && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.businessType}
              </p>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              이전
            </button>
            <button
              onClick={handleStep2Next}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다음 단계
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 상세 정보 - 개인 */}
      {step === 3 && businessType === 'individual' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-blue-800 text-sm font-medium">
              <UserCircle2 className="h-5 w-5" />
              개인 사업자 정보
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름 *
            </label>
            <input
              type="text"
              value={individualData.name}
              onChange={(e) => setIndividualData({ ...individualData, name: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="홍길동"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              연락처 *
            </label>
            <input
              type="tel"
              value={individualData.phone}
              onChange={(e) => setIndividualData({ ...individualData, phone: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="010-0000-0000"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Resident Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주민등록번호 *
            </label>
            <input
              type="text"
              value={individualData.residentNumber}
              onChange={(e) => setIndividualData({ ...individualData, residentNumber: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.residentNumber ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="000000-0000000"
            />
            {errors.residentNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.residentNumber}</p>
            )}
          </div>

          {/* Memo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              메모 (선택사항)
            </label>
            <textarea
              value={individualData.memo}
              onChange={(e) => setIndividualData({ ...individualData, memo: e.target.value })}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="추가 정보를 입력하세요"
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  등록 중...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  등록 완료
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 상세 정보 - 사업체 */}
      {step === 3 && businessType === 'corporate' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-blue-800 text-sm font-medium">
              <Building2 className="h-5 w-5" />
              법인 사업자 정보
            </div>
          </div>

          {/* Business Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업자 등록번호 *
            </label>
            <input
              type="text"
              value={corporateData.businessNumber}
              onChange={(e) => setCorporateData({ ...corporateData, businessNumber: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.businessNumber ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="000-00-00000"
            />
            {errors.businessNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.businessNumber}</p>
            )}
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업자명 *
            </label>
            <input
              type="text"
              value={corporateData.businessName}
              onChange={(e) => setCorporateData({ ...corporateData, businessName: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.businessName ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="(주)회사명"
            />
            {errors.businessName && (
              <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
            )}
          </div>

          {/* CEO Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              대표자 *
            </label>
            <input
              type="text"
              value={corporateData.ceoName}
              onChange={(e) => setCorporateData({ ...corporateData, ceoName: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.ceoName ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="홍길동"
            />
            {errors.ceoName && (
              <p className="mt-1 text-sm text-red-600">{errors.ceoName}</p>
            )}
          </div>

          {/* Business Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업장 소재지 *
            </label>
            <input
              type="text"
              value={corporateData.businessAddress}
              onChange={(e) => setCorporateData({ ...corporateData, businessAddress: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.businessAddress ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="서울특별시 강남구 테헤란로 123"
            />
            {errors.businessAddress && (
              <p className="mt-1 text-sm text-red-600">{errors.businessAddress}</p>
            )}
          </div>

          {/* Business Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업자 전화번호 *
            </label>
            <input
              type="tel"
              value={corporateData.businessPhone}
              onChange={(e) => setCorporateData({ ...corporateData, businessPhone: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.businessPhone ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="02-0000-0000"
            />
            {errors.businessPhone && (
              <p className="mt-1 text-sm text-red-600">{errors.businessPhone}</p>
            )}
          </div>

          {/* Tax Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              세금계산서용 이메일 *
            </label>
            <input
              type="email"
              value={corporateData.taxEmail}
              onChange={(e) => setCorporateData({ ...corporateData, taxEmail: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.taxEmail ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="tax@company.com"
            />
            {errors.taxEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.taxEmail}</p>
            )}
          </div>

          {/* Manager Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자 이름 *
            </label>
            <input
              type="text"
              value={corporateData.managerName}
              onChange={(e) => setCorporateData({ ...corporateData, managerName: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.managerName ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="김담당"
            />
            {errors.managerName && (
              <p className="mt-1 text-sm text-red-600">{errors.managerName}</p>
            )}
          </div>

          {/* Manager Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자 전화번호 *
            </label>
            <input
              type="tel"
              value={corporateData.managerPhone}
              onChange={(e) => setCorporateData({ ...corporateData, managerPhone: e.target.value })}
              className={`block w-full px-3 py-2 border ${
                errors.managerPhone ? 'border-red-300' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="010-0000-0000"
            />
            {errors.managerPhone && (
              <p className="mt-1 text-sm text-red-600">{errors.managerPhone}</p>
            )}
          </div>

          {/* Manager Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자 이메일 (선택사항)
            </label>
            <input
              type="email"
              value={corporateData.managerEmail}
              onChange={(e) => setCorporateData({ ...corporateData, managerEmail: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="manager@company.com"
            />
          </div>

          {/* Memo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              메모 (선택사항)
            </label>
            <textarea
              value={corporateData.memo}
              onChange={(e) => setCorporateData({ ...corporateData, memo: e.target.value })}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="추가 정보를 입력하세요"
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  등록 중...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  등록 완료
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Login Link */}
      <div className="mt-6 text-center text-sm text-gray-600">
        {loginText}{' '}
        <a
          href={loginUrl}
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          {loginLinkText}
        </a>
      </div>
    </div>
  );
};

// Business Register Shortcode
export const businessRegisterShortcode: ShortcodeDefinition = {
  name: 'business_register',
  component: ({ attributes }) => (
    <BusinessRegisterComponent
      title={attributes.title as string}
      subtitle={attributes.subtitle as string}
      redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
      loginUrl={attributes.login_url as string || attributes.loginUrl as string}
      loginText={attributes.login_text as string || attributes.loginText as string}
      loginLinkText={attributes.login_link_text as string || attributes.loginLinkText as string}
    />
  )
};

// Default export for auto-registration (BusinessRegisterShortcode.tsx → BusinessRegister)
export default BusinessRegisterComponent;
