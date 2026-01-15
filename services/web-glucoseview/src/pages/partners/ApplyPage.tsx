/**
 * Partner Application Page - GlucoseView
 * WO-PARTNER-APPLICATION-V1
 *
 * 파트너 신청 페이지 (공개 - 인증 불필요)
 * - 신청 폼
 * - 제출 완료 화면
 * - API 연동: POST /api/v1/partner/applications
 */

import { useState } from 'react';
import { Building2, Mail, Phone, User, FileText, CheckCircle, Send } from 'lucide-react';

type ServiceInterest = 'DIGITAL_SIGNAGE' | 'PHARMACY_SUPPLY' | 'ADVERTISEMENT';

interface ApplicationForm {
  companyName: string;
  businessNumber: string;
  contactName: string;
  email: string;
  phone: string;
  serviceInterest: ServiceInterest[];
  message: string;
}

const SERVICE_OPTIONS: { value: ServiceInterest; label: string; description: string }[] = [
  {
    value: 'DIGITAL_SIGNAGE',
    label: '디지털 사이니지',
    description: '약국/병원 내 디지털 디스플레이 광고',
  },
  {
    value: 'PHARMACY_SUPPLY',
    label: '의료기기 공급',
    description: '혈당 측정 관련 의료기기 공급',
  },
  {
    value: 'ADVERTISEMENT',
    label: '광고/프로모션',
    description: '플랫폼 내 광고 및 프로모션',
  },
];

export default function PartnerApplyPage() {
  const [form, setForm] = useState<ApplicationForm>({
    companyName: '',
    businessNumber: '',
    contactName: '',
    email: '',
    phone: '',
    serviceInterest: [],
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleServiceToggle = (service: ServiceInterest) => {
    setForm((prev) => ({
      ...prev,
      serviceInterest: prev.serviceInterest.includes(service)
        ? prev.serviceInterest.filter((s) => s !== service)
        : [...prev.serviceInterest, service],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/partner/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: form.companyName,
          businessNumber: form.businessNumber,
          contactName: form.contactName,
          email: form.email,
          phone: form.phone || undefined,
          serviceInterest: form.serviceInterest.length > 0 ? form.serviceInterest : undefined,
          message: form.message || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || '신청 처리 중 오류가 발생했습니다.');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '신청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 제출 완료 화면
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-3">
            신청이 접수되었습니다
          </h1>
          <p className="text-slate-500 mb-6">
            파트너 신청이 정상적으로 접수되었습니다.<br />
            담당자가 검토 후 입력하신 이메일로 연락드리겠습니다.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-3">파트너 신청</h1>
          <p className="text-slate-500 text-base">
            GlucoseView와 함께 성장할 헬스케어 파트너를 모집합니다
          </p>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 회사 정보 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                회사 정보
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    업체명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="주식회사 예시"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    사업자번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.businessNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, businessNumber: e.target.value }))}
                    placeholder="000-00-00000"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 담당자 정보 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                담당자 정보
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    담당자 이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
                    placeholder="홍길동"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    이메일 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="partner@example.com"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    연락처
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="010-0000-0000"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 관심 서비스 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                관심 서비스
              </h2>
              <div className="space-y-3">
                {SERVICE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      form.serviceInterest.includes(option.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.serviceInterest.includes(option.value)}
                      onChange={() => handleServiceToggle(option.value)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-slate-800">{option.label}</p>
                      <p className="text-sm text-slate-500">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 추가 메시지 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-800 mb-4">추가 메시지</h2>
              <textarea
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="파트너십에 대한 추가 문의나 제안 사항을 입력해주세요."
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  신청 처리 중...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  파트너 신청하기
                </>
              )}
            </button>

            {/* Notice */}
            <p className="text-center text-xs text-slate-400">
              신청 후 영업일 기준 3-5일 내에 담당자가 연락드립니다
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
