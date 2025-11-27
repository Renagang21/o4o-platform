/**
 * Signup Complete Page
 * Additional information collection for new social login users
 *
 * Collects:
 * - Phone number (required)
 * - Terms of Service acceptance (required)
 * - Privacy Policy acceptance (required)
 * - Marketing consent (optional)
 * - Shipping address (optional)
 */

import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MapPin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { cookieAuthClient } from '@o4o/auth-client';
import { useAuth } from '../../contexts/AuthContext';

interface SignupCompleteForm {
  phone: string;
  tosAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
}

export const SignupComplete: FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [formData, setFormData] = useState<SignupCompleteForm>({
    phone: '',
    tosAccepted: false,
    privacyAccepted: false,
    marketingAccepted: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.warning('로그인이 필요합니다.');
      navigate('/auth/login', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, toast]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = '휴대폰 번호를 입력해주세요';
    } else if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(formData.phone.replace(/-/g, ''))) {
      newErrors.phone = '올바른 휴대폰 번호를 입력해주세요 (예: 010-1234-5678)';
    }

    // Terms validation
    if (!formData.tosAccepted) {
      newErrors.tosAccepted = '이용약관에 동의해주세요';
    }

    if (!formData.privacyAccepted) {
      newErrors.privacyAccepted = '개인정보처리방침에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (value: string) => {
    // Auto-format phone number
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length >= 3) {
      formatted = cleaned.slice(0, 3);
      if (cleaned.length >= 7) {
        formatted += '-' + cleaned.slice(3, 7);
        if (cleaned.length >= 11) {
          formatted += '-' + cleaned.slice(7, 11);
        } else if (cleaned.length > 7) {
          formatted += '-' + cleaned.slice(7);
        }
      } else if (cleaned.length > 3) {
        formatted += '-' + cleaned.slice(3);
      }
    }

    setFormData(prev => ({ ...prev, phone: formatted }));
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleCheckboxChange = (field: keyof SignupCompleteForm, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await cookieAuthClient.api.post('/auth/signup-complete', {
        phone: formData.phone.replace(/-/g, ''), // Remove hyphens before sending
        tosAccepted: formData.tosAccepted,
        privacyAccepted: formData.privacyAccepted,
        marketingAccepted: formData.marketingAccepted,
      });

      if (response.data.success) {
        toast.success('회원가입이 완료되었습니다! 쇼핑을 시작하세요.');
        // Redirect to account dashboard
        setTimeout(() => {
          navigate('/account', { replace: true });
        }, 1000);
      }
    } catch (error: any) {
      console.error('Signup complete error:', error);

      const errorData = error.response?.data;
      const errorCode = errorData?.errorCode || errorData?.code;
      const errorMessage = errorData?.message;

      let displayMessage = '정보 저장에 실패했습니다';

      if (errorCode === 'TOS_NOT_ACCEPTED') {
        displayMessage = '이용약관과 개인정보처리방침에 동의해주세요';
      } else if (errorMessage) {
        displayMessage = errorMessage;
      }

      toast.error(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">환영합니다!</h2>
          <p className="mt-2 text-sm text-gray-600">
            {user?.name}님, 쇼핑을 시작하기 위해 몇 가지 정보를 입력해주세요
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                휴대폰 번호 *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  maxLength={13}
                  required
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                  placeholder="010-1234-5678"
                  disabled={isLoading}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.phone}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                주문 확인 및 배송 알림을 위해 필요합니다
              </p>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900">약관 동의</h3>

              {/* Terms of Service */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tosAccepted}
                    onChange={(e) => handleCheckboxChange('tosAccepted', e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-700">
                    <a href="/terms" target="_blank" className="text-blue-600 hover:text-blue-800 underline font-medium">
                      이용약관
                    </a>
                    에 동의합니다 (필수)
                  </span>
                </label>
                {errors.tosAccepted && (
                  <p className="mt-1 ml-7 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.tosAccepted}
                  </p>
                )}
              </div>

              {/* Privacy Policy */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.privacyAccepted}
                    onChange={(e) => handleCheckboxChange('privacyAccepted', e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-700">
                    <a href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-800 underline font-medium">
                      개인정보처리방침
                    </a>
                    에 동의합니다 (필수)
                  </span>
                </label>
                {errors.privacyAccepted && (
                  <p className="mt-1 ml-7 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.privacyAccepted}
                  </p>
                )}
              </div>

              {/* Marketing Consent */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.marketingAccepted}
                    onChange={(e) => handleCheckboxChange('marketingAccepted', e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-700">
                    <a href="/marketing" target="_blank" className="text-blue-600 hover:text-blue-800 underline font-medium">
                      마케팅 정보 수신
                    </a>
                    에 동의합니다 (선택)
                  </span>
                </label>
                <p className="mt-1 ml-7 text-xs text-gray-500">
                  할인 쿠폰, 이벤트 등의 혜택 정보를 받아보실 수 있습니다
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  쇼핑 시작하기
                </>
              )}
            </button>
          </form>

          {/* Skip Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              * 필수 정보를 모두 입력해주셔야 쇼핑을 시작하실 수 있습니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupComplete;
