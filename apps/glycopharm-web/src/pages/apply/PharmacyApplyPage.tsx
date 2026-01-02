import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Package, Monitor, CheckCircle } from 'lucide-react';
import { glycopharmApi, CreateApplicationRequest, ServiceType } from '@/api/glycopharm';

/**
 * Pharmacy Application Page
 * (A) 약국 참여 / 서비스 신청
 */

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

const SERVICE_OPTIONS: { type: ServiceType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    type: 'dropshipping',
    label: '무재고 판매',
    description: '재고 없이 당뇨 관련 제품을 판매할 수 있습니다.',
    icon: <Package className="w-6 h-6" />,
  },
  {
    type: 'sample_sales',
    label: '샘플 판매',
    description: 'CGM 샘플 및 체험 제품을 판매합니다.',
    icon: <Building2 className="w-6 h-6" />,
  },
  {
    type: 'digital_signage',
    label: '디지털 사이니지',
    description: '약국 내 디지털 사이니지 콘텐츠를 표시합니다.',
    icon: <Monitor className="w-6 h-6" />,
  },
];

export default function PharmacyApplyPage() {
  const [formData, setFormData] = useState<CreateApplicationRequest>({
    pharmacyName: '',
    businessNumber: '',
    serviceTypes: [],
    address: '',
    phone: '',
    note: '',
  });
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleServiceToggle = (serviceType: ServiceType) => {
    setFormData((prev) => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(serviceType)
        ? prev.serviceTypes.filter((t) => t !== serviceType)
        : [...prev.serviceTypes, serviceType],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.serviceTypes.length === 0) {
      setErrorMessage('최소 하나의 서비스를 선택해주세요.');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      await glycopharmApi.createApplication(formData);
      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      const apiError = err as { code?: string; status?: number; message?: string };
      if (apiError.code === 'UNAUTHORIZED' || apiError.status === 401) {
        setErrorMessage('로그인이 필요합니다. 먼저 로그인해주세요.');
      } else if (apiError.code === 'APPLICATION_PENDING') {
        setErrorMessage('이미 심사 대기 중인 신청이 있습니다.');
      } else {
        setErrorMessage(apiError.message || '신청 중 오류가 발생했습니다.');
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">신청이 완료되었습니다</h2>
          <p className="text-gray-600 mb-8">
            신청서가 접수되었습니다. 심사 후 결과를 알려드리겠습니다.
          </p>
          <div className="space-y-3">
            <Link
              to="/apply/status"
              className="block w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              내 신청 목록 보기
            </Link>
            <Link
              to="/"
              className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">약국 참여 신청</h1>
          <p className="text-gray-600">
            글라이코팜 서비스에 참여하시려면 아래 정보를 입력해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8">
          {/* Pharmacy Info Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">약국 정보</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  약국명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="pharmacyName"
                  value={formData.pharmacyName}
                  onChange={handleChange}
                  placeholder="예: 행복약국"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사업자등록번호
                </label>
                <input
                  type="text"
                  name="businessNumber"
                  value={formData.businessNumber}
                  onChange={handleChange}
                  placeholder="예: 123-45-67890"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주소
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="예: 서울시 강남구 테헤란로 123"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  연락처
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="예: 02-1234-5678"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Service Selection Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              참여 서비스 선택 <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              참여를 원하는 서비스를 선택해주세요. (복수 선택 가능)
            </p>

            <div className="space-y-3">
              {SERVICE_OPTIONS.map((service) => (
                <label
                  key={service.type}
                  className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                    formData.serviceTypes.includes(service.type)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.serviceTypes.includes(service.type)}
                    onChange={() => handleServiceToggle(service.type)}
                    className="sr-only"
                  />
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      formData.serviceTypes.includes(service.type)
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {service.icon}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="font-medium text-gray-900">{service.label}</div>
                    <div className="text-sm text-gray-500">{service.description}</div>
                  </div>
                  {formData.serviceTypes.includes(service.type) && (
                    <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Note Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              추가 메모 (선택)
            </label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="심사에 참고할 내용이 있으면 입력해주세요."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-colors ${
              status === 'loading'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {status === 'loading' ? '신청 중...' : '신청하기'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>* 신청 후 관리자 심사를 거쳐 승인됩니다.</p>
          <p className="mt-1">
            이미 신청하셨다면{' '}
            <Link to="/apply/status" className="text-primary-600 hover:underline">
              내 신청 목록
            </Link>
            에서 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
