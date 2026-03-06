/**
 * ContactPage - 협력 문의 페이지
 *
 * Work Order: WO-O4O-NETURE-UI-REFACTORING-V1
 *
 * 4개 섹션:
 * - 공급자 협력 문의
 * - 파트너 협력 문의
 * - 광고 문의
 * - 일반 문의
 *
 * 문의 방식: 이메일 + 전화
 */

import { Mail, Phone, Package, Megaphone, Zap, HelpCircle } from 'lucide-react';

const inquiryTypes = [
  {
    icon: Package,
    title: '공급자 협력 문의',
    description: '제품 공급, 유통 채널 확보, 매장 네트워크 연결에 관한 문의',
    email: 'partners@neture.co.kr',
    color: 'bg-blue-100 text-blue-600',
    borderColor: 'border-blue-200',
  },
  {
    icon: Megaphone,
    title: '파트너 협력 문의',
    description: '마케팅 파트너십, 콘텐츠 협업, 매장 지원 서비스에 관한 문의',
    email: 'partners@neture.co.kr',
    color: 'bg-emerald-100 text-emerald-600',
    borderColor: 'border-emerald-200',
  },
  {
    icon: Zap,
    title: '광고 문의',
    description: '플랫폼 내 광고 게재, 프로모션 등록에 관한 문의',
    email: 'partners@neture.co.kr',
    color: 'bg-purple-100 text-purple-600',
    borderColor: 'border-purple-200',
  },
  {
    icon: HelpCircle,
    title: '일반 문의',
    description: '서비스 이용, 계정, 기술 지원 등 기타 문의',
    email: 'partners@neture.co.kr',
    color: 'bg-gray-100 text-gray-600',
    borderColor: 'border-gray-200',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-3">Contact Us</h1>
          <p className="text-lg text-white/80">
            협력 제안, 서비스 문의 등 무엇이든 물어보세요
          </p>
        </div>
      </section>

      {/* Inquiry Types */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {inquiryTypes.map((type) => (
              <div
                key={type.title}
                className={`p-6 bg-white rounded-xl border ${type.borderColor} hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${type.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <type.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{type.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{type.description}</p>
                    <a
                      href={`mailto:${type.email}?subject=${encodeURIComponent(type.title)}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      <Mail className="w-4 h-4" />
                      {type.email}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 연락처 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">
            직접 연락하기
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">이메일</p>
                <a href="mailto:partners@neture.co.kr" className="text-base font-medium text-gray-900 hover:text-primary-600">
                  partners@neture.co.kr
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">고객센터</p>
                <a href="tel:1577-2779" className="text-base font-medium text-gray-900 hover:text-primary-600">
                  1577-2779
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">회사 정보</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>㈜쓰리라이프존</p>
              <p>사업자등록번호: 108-86-02873</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
