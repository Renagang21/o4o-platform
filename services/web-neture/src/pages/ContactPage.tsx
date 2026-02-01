/**
 * ContactPage - 문의 안내 페이지
 *
 * PartnerInfoPage 협력사 "문의하기" 링크 대상
 * 일반 문의 연락처 안내
 */

import { Link } from 'react-router-dom';
import { Mail, Phone, ArrowLeft, Building2 } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <Link
        to="/workspace/partners/info"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        참여 안내로 돌아가기
      </Link>

      {/* 회사 소개 */}
      <div className="mb-10 p-6 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-50 rounded-lg">
            <Building2 className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">네뚜레 (Neture)</h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          네뚜레는 공급자·파트너·매장을 연결하는 유통 정보 플랫폼입니다.
          건강기능식품, 화장품, 의료기기 등 다양한 카테고리의 상품을 하나의 플랫폼에서 관리하고 유통할 수 있도록 지원합니다.
        </p>
      </div>

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

      <div className="mt-12">
        <Link
          to="/workspace/partners/requests/new"
          className="block w-full text-center py-3 px-6 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          참여 신청하기
        </Link>
      </div>
    </div>
  );
}
