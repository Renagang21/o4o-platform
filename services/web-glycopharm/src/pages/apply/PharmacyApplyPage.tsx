import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Truck, Monitor, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { glycopharmApi } from '@/api/glycopharm';
import type { SubmitApplicationRequest, ServiceType, SlugCheckResponse } from '@/api/glycopharm';

/**
 * Pharmacy Apply Page
 * (A) 약국 참여 / 서비스 신청
 */

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

const SERVICE_OPTIONS: { value: ServiceType; label: string; description: string; icon: typeof Building2 }[] = [
  {
    value: 'dropshipping',
    label: '무재고 판매',
    description: '재고 부담 없이 혈당관리 제품을 판매하세요',
    icon: Truck,
  },
  {
    value: 'sample_sales',
    label: '샘플 판매',
    description: '고객에게 샘플 제품을 제공하고 판매로 연결하세요',
    icon: Building2,
  },
  {
    value: 'digital_signage',
    label: '디지털 사이니지',
    description: '약국 내 디스플레이로 혈당관리 콘텐츠를 노출하세요',
    icon: Monitor,
  },
];

// WO-CORE-STORE-REQUESTED-SLUG-V1: Slug validation status
type SlugStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid';

export default function PharmacyApplyPage() {
  const [formData, setFormData] = useState<SubmitApplicationRequest>({
    organizationType: 'pharmacy',
    organizationName: '',
    businessNumber: '',
    serviceTypes: [],
    note: '',
    requestedSlug: '',
  });
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // WO-CORE-STORE-REQUESTED-SLUG-V1: Slug validation state
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [slugMessage, setSlugMessage] = useState<string>('');

  // Debounced slug check
  useEffect(() => {
    const slug = formData.requestedSlug?.trim() || '';

    // Reset if empty
    if (!slug) {
      setSlugStatus('idle');
      setSlugMessage('');
      return;
    }

    // Minimum length check
    if (slug.length < 3) {
      setSlugStatus('invalid');
      setSlugMessage('최소 3자 이상 입력해주세요');
      return;
    }

    setSlugStatus('checking');
    setSlugMessage('확인 중...');

    const timeoutId = setTimeout(async () => {
      try {
        const result: SlugCheckResponse = await glycopharmApi.checkSlugAvailability(slug);
        if (result.available) {
          setSlugStatus('available');
          setSlugMessage(`사용 가능 (${result.normalizedValue})`);
        } else {
          setSlugStatus('unavailable');
          if (result.reason === 'taken') {
            setSlugMessage('이미 사용 중인 주소입니다');
          } else if (result.reason === 'reserved') {
            setSlugMessage('예약어로 사용할 수 없습니다');
          } else {
            setSlugMessage(result.validationError || '형식이 올바르지 않습니다');
          }
        }
      } catch {
        setSlugStatus('invalid');
        setSlugMessage('확인 중 오류가 발생했습니다');
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [formData.requestedSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.serviceTypes.length === 0) {
      setErrorMessage('최소 1개 이상의 서비스를 선택해주세요.');
      return;
    }

    // WO-CORE-STORE-REQUESTED-SLUG-V1: Validate slug before submit
    if (formData.requestedSlug && slugStatus !== 'available' && slugStatus !== 'idle') {
      setErrorMessage('매장 URL이 사용 불가능합니다. 다른 URL을 입력해주세요.');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      // Clean up empty slug
      const submitData = {
        ...formData,
        requestedSlug: formData.requestedSlug?.trim() || undefined,
      };
      await glycopharmApi.submitApplication(submitData);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      if (err.code === 'UNAUTHORIZED' || err.status === 401) {
        setErrorMessage('로그인이 필요합니다. 먼저 로그인해주세요.');
      } else if (err.code === 'APPLICATION_PENDING') {
        setErrorMessage('이미 심사 대기 중인 신청이 있습니다.');
      } else if (err.code === 'ALREADY_APPROVED') {
        setErrorMessage('이미 승인된 약국입니다.');
      } else if (err.code === 'SLUG_NOT_AVAILABLE') {
        setErrorMessage('입력한 매장 URL이 이미 사용 중입니다.');
      } else {
        setErrorMessage(err.message || '신청 중 오류가 발생했습니다.');
      }
    }
  };

  const handleServiceToggle = (serviceType: ServiceType) => {
    setFormData((prev) => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(serviceType)
        ? prev.serviceTypes.filter((s) => s !== serviceType)
        : [...prev.serviceTypes, serviceType],
    }));
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">신청이 완료되었습니다</h2>
            <p className="text-slate-500 mb-8">
              신청서가 접수되었습니다. 심사 후 결과를 알려드리겠습니다.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/apply/my-applications"
                className="w-full py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
              >
                내 신청 목록 보기
              </Link>
              <Link
                to="/"
                className="w-full py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                홈으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">약국 참여 신청</h1>
          <p className="text-slate-500">
            GlycoPharm 플랫폼에 참여하여 혈당관리 전문 약국으로 성장하세요.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-8">
          {/* Organization Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">조직 유형</label>
            <div className="p-4 rounded-xl border-2 border-primary-500 bg-primary-50">
              <Building2 className="w-6 h-6 mb-2 text-primary-600" />
              <p className="font-medium text-slate-800">개인 약국</p>
              <p className="text-xs text-slate-500">단일 약국 운영</p>
            </div>
          </div>

          {/* Organization Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">약국명</label>
            <input
              type="text"
              value={formData.organizationName}
              onChange={(e) => setFormData((prev) => ({ ...prev, organizationName: e.target.value }))}
              placeholder="예: OO약국"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* Business Number */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">사업자등록번호</label>
            <input
              type="text"
              value={formData.businessNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, businessNumber: e.target.value }))}
              placeholder="예: 123-45-67890"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* WO-CORE-STORE-REQUESTED-SLUG-V1: Requested Slug */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              매장 URL (선택)
            </label>
            <div className="relative">
              <div className="flex items-center">
                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-3 rounded-l-xl border border-r-0 border-slate-200">
                  glycopharm.co.kr/store/
                </span>
                <input
                  type="text"
                  value={formData.requestedSlug || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, requestedSlug: e.target.value }))}
                  placeholder="my-pharmacy"
                  className={`flex-1 px-4 py-3 border rounded-r-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    slugStatus === 'available'
                      ? 'border-green-300 bg-green-50'
                      : slugStatus === 'unavailable' || slugStatus === 'invalid'
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-200'
                  }`}
                />
                {slugStatus === 'checking' && (
                  <Loader2 className="absolute right-3 w-5 h-5 text-slate-400 animate-spin" />
                )}
                {slugStatus === 'available' && (
                  <CheckCircle className="absolute right-3 w-5 h-5 text-green-500" />
                )}
                {(slugStatus === 'unavailable' || slugStatus === 'invalid') && (
                  <AlertCircle className="absolute right-3 w-5 h-5 text-red-500" />
                )}
              </div>
            </div>
            {slugMessage && (
              <p className={`mt-2 text-sm ${
                slugStatus === 'available' ? 'text-green-600' :
                slugStatus === 'checking' ? 'text-slate-500' : 'text-red-600'
              }`}>
                {slugStatus === 'available' && '✓ '}{slugMessage}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              영문, 숫자, 하이픈(-), 한글 사용 가능. 승인 후 매장 URL로 사용됩니다.
            </p>
          </div>

          {/* Service Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">참여 서비스 선택 (복수 선택 가능)</label>
            <div className="space-y-3">
              {SERVICE_OPTIONS.map((service) => {
                const Icon = service.icon;
                const isSelected = formData.serviceTypes.includes(service.value);
                return (
                  <button
                    key={service.value}
                    type="button"
                    onClick={() => handleServiceToggle(service.value)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-100' : 'bg-slate-100'}`}>
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-primary-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{service.label}</p>
                      <p className="text-sm text-slate-500">{service.description}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-slate-300'}`}>
                      {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">추가 메모 (선택)</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="심사에 참고할 내용이 있으면 입력해주세요."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className={`w-full py-4 font-semibold rounded-xl transition-all ${
              status === 'loading'
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {status === 'loading' ? '신청 중...' : '참여 신청하기'}
          </button>
        </form>

        {/* Note */}
        <div className="mt-6 p-4 text-sm text-slate-500">
          <p className="mb-1">* 신청 후 관리자 심사를 거쳐 승인됩니다.</p>
          <p>
            * 이미 신청하셨다면{' '}
            <Link to="/apply/my-applications" className="text-primary-600 hover:underline">
              내 신청 목록
            </Link>
            에서 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
