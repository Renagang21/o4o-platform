/**
 * ContactPage - 문의 안내 페이지
 *
 * PartnerInfoPage 협력사 "문의하기" 링크 대상
 * 일반 문의 연락처 안내
 */

import { Link } from 'react-router-dom';
import { Mail, Phone, ArrowLeft } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <Link
        to="/supplier-ops/partners/info"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        참여 안내로 돌아가기
      </Link>

      <h1 className="text-3xl font-bold text-slate-800 mb-4">문의하기</h1>
      <p className="text-gray-600 mb-8">
        협력 제안, 서비스 문의 등은 아래 연락처로 문의해 주세요.
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">이메일</p>
            <a href="mailto:partners@neture.co.kr" className="text-base font-medium text-slate-800 hover:text-primary-600">
              partners@neture.co.kr
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg">
            <Phone className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">고객센터</p>
            <a href="tel:1577-2779" className="text-base font-medium text-slate-800 hover:text-primary-600">
              1577-2779
            </a>
          </div>
        </div>
      </div>

      <div className="mt-12 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
        <p>
          공급자/파트너 참여 신청은{' '}
          <Link to="/supplier-ops/partners/apply" className="text-primary-600 hover:underline">
            참여 신청 페이지
          </Link>
          에서 진행해 주세요.
        </p>
      </div>
    </div>
  );
}
