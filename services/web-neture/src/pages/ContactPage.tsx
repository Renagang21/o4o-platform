/**
 * ContactPage - 문의하기 페이지
 *
 * Work Order: WO-O4O-NETURE-CONTACT-PAGE-V1
 *
 * 구조:
 * 1. Hero - 문의하기
 * 2. 문의 유형 안내 - 4카드 (클릭 시 폼 유형 자동 선택)
 * 3. 문의 입력 폼
 * 4. 제출 완료 메시지
 * 5. 연락처 정보
 */

import { useState, useRef } from 'react';
import { Package, Megaphone, Settings, HelpCircle, Mail, Phone, Send, CheckCircle2 } from 'lucide-react';
import { contactApi } from '../lib/api/contact';
import type { ContactFormData } from '../lib/api/contact';

type ContactType = ContactFormData['contactType'];

const inquiryTypes: { type: ContactType; icon: typeof Package; title: string; desc: string; color: { bg: string; text: string; border: string } }[] = [
  {
    type: 'supplier',
    icon: Package,
    title: '공급자 문의',
    desc: '제품 공급, 유통 채널, 매장 네트워크에 관한 문의',
    color: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  },
  {
    type: 'partner',
    icon: Megaphone,
    title: '파트너 문의',
    desc: '마케팅 파트너십, 콘텐츠 협업, 홍보 활동에 관한 문의',
    color: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  },
  {
    type: 'service',
    icon: Settings,
    title: '서비스 문의',
    desc: '서비스 이용, 계정, 기술 지원에 관한 문의',
    color: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  },
  {
    type: 'other',
    icon: HelpCircle,
    title: '기타 문의',
    desc: '기타 문의 사항',
    color: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  },
];

const typeLabels: Record<ContactType, string> = {
  supplier: 'Supplier 문의',
  partner: 'Partner 문의',
  service: '서비스 문의',
  other: '기타',
};

const initialFormData = {
  contactType: 'other' as ContactType,
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
};

export default function ContactPage() {
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleTypeSelect = (type: ContactType) => {
    setFormData((prev) => ({ ...prev, contactType: type }));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setError('필수 항목을 모두 입력해 주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('올바른 이메일 주소를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await contactApi.submitContactMessage({
        contactType: formData.contactType,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });

      if (result.success) {
        setSubmitted(true);
        setFormData(initialFormData);
      } else {
        setError(result.error?.message || '문의 접수 중 오류가 발생했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* ── 1. Hero ── */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">문의하기</h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Neture 플랫폼에 대한 문의를 보내주세요.
            <br />
            운영팀이 확인 후 답변드립니다.
          </p>
        </div>
      </section>

      {/* ── 2. 문의 유형 안내 ── */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">문의 유형을 선택하세요</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {inquiryTypes.map((t) => (
              <button
                key={t.type}
                onClick={() => handleTypeSelect(t.type)}
                className={`text-left p-5 rounded-xl border-2 transition-all ${
                  formData.contactType === t.type
                    ? `${t.color.border} ${t.color.bg} shadow-sm`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 ${t.color.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <t.icon className={`w-5 h-5 ${t.color.text}`} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{t.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. 문의 입력 폼 ── */}
      <section className="py-12 bg-gray-50" ref={formRef}>
        <div className="max-w-2xl mx-auto px-4">
          {submitted ? (
            /* ── 4. 제출 완료 ── */
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">문의가 접수되었습니다</h2>
              <p className="text-gray-600 mb-6">운영팀이 확인 후 답변드립니다.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-primary-600 bg-white border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
              >
                추가 문의하기
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-6">문의 내용을 입력하세요</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 문의 유형 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">문의 유형</label>
                  <select
                    name="contactType"
                    value={formData.contactType}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* 이름 + 이메일 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="이름을 입력하세요"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이메일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* 전화번호 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* 제목 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    문의 제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="문의 제목을 입력하세요"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* 내용 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    문의 내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    placeholder="문의 내용을 입력하세요"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  />
                </div>

                {/* 제출 버튼 */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? '보내는 중...' : '문의 보내기'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* ── 5. 연락처 정보 ── */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">직접 연락하기</h2>
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
