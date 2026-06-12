import { Mail, Clock, Building2, FileText } from 'lucide-react';
// WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1
import { PublicContactForm, type ContactInquiryPayload } from '@o4o/shared-space-ui';
import { api } from '@/lib/apiClient';

const GP_INQUIRY_TYPES = [
  { value: 'service_usage', label: '서비스 이용 문의' },
  { value: 'account_permission', label: '약국 가입/권한 문의' },
  { value: 'partnership', label: '공급·제휴 문의' },
  { value: 'technical_issue', label: '오류 신고' },
  { value: 'other', label: '기타 문의' },
];

async function submitInquiry(payload: ContactInquiryPayload): Promise<void> {
  try {
    await api.post('/public/services/glycopharm/contact-inquiries', payload);
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message;
    throw new Error(typeof msg === 'string' ? msg : '문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-3">문의하기</h1>
          <p className="text-slate-500 text-base">
            GlycoPharm 서비스 및 제휴에 관한 문의를 받고 있습니다
          </p>
        </div>
      </section>

      {/* WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1: 문의 폼 (접수 + 운영자 in-app 알림) */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <PublicContactForm
            serviceKey="glycopharm"
            submitInquiry={submitInquiry}
            inquiryTypes={GP_INQUIRY_TYPES}
            organizationLabel="약국명"
            privacyHref="/privacy"
            theme={{ accent: '#0d9488' }}
            introText="약국 운영·서비스 이용·공급 제휴에 관한 문의를 남겨 주세요. 접수 후 운영자가 확인합니다."
          />
        </div>
      </section>

      {/* 직접 연락 (보조) */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-center font-semibold text-slate-700 mb-6">직접 연락</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* 일반 문의 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">일반 문의</h3>
              <p className="text-sm text-slate-500 mb-4">
                서비스 이용, 계정, 기술 지원 관련
              </p>
              <a
                href="mailto:support@glycopharm.co.kr"
                className="text-sm text-primary-600 font-medium hover:text-primary-700"
              >
                support@glycopharm.co.kr
              </a>
            </div>

            {/* 제휴 문의 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center mb-4">
                <Building2 className="w-5 h-5 text-accent-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">제휴 문의</h3>
              <p className="text-sm text-slate-500 mb-4">
                공급사, 파트너십, 사업 제안
              </p>
              <a
                href="mailto:partner@glycopharm.co.kr"
                className="text-sm text-accent-600 font-medium hover:text-accent-700"
              >
                partner@glycopharm.co.kr
              </a>
            </div>

            {/* 입점 문의 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">약국 입점</h3>
              <p className="text-sm text-slate-500 mb-4">
                플랫폼 가입 및 입점 절차 안내
              </p>
              <a
                href="mailto:pharmacy@glycopharm.co.kr"
                className="text-sm text-slate-700 font-medium hover:text-slate-900"
              >
                pharmacy@glycopharm.co.kr
              </a>
            </div>
          </div>

          {/* 운영 정보 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">운영 정보</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">운영시간</p>
                  <p className="text-sm text-slate-500">평일 09:00 - 18:00 (주말/공휴일 휴무)</p>
                </div>
              </div>
            </div>
          </div>

          {/* WO-O4O-GP-KCOS-FOOTER-PLACEHOLDER-LEGAL-INFO-SUPPRESSION-V1:
              미확인 법정정보(상호/대표자/사업자등록번호/통신판매업 신고번호/대표전화/주소 placeholder)
              공개 노출 제거. 실값 임의작성 금지 — 실값 확정 후 ServiceLegalProfile 기반 재도입 (후속 WO). */}

          {/* 안내 문구 */}
          <p className="mt-10 text-center text-xs text-slate-400">
            이메일 문의는 영업일 기준 1-2일 내에 답변 드립니다
          </p>
        </div>
      </section>
    </div>
  );
}
