/**
 * SiteOperatorPage - 사이트 운영자 대상 안내
 *
 * 관점:
 * - 매장 네트워크를 대상으로 비즈니스하는 사업자 중
 * - 이미 Cafe24, SaaS 등으로 사이트를 운영하고 있는 경우
 * - 기존 사이트에 연결하여 활용할 수 있는 서비스 안내
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Globe, MessageCircle, Sparkles, Truck, Building2, Megaphone } from 'lucide-react';

export default function SiteOperatorPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-primary-400 text-sm font-medium mb-3">
            O4O Platform · 기존 사이트 연결
          </p>
          <h1 className="text-3xl font-bold mb-4">사이트 운영자</h1>
          <p className="text-slate-300 leading-relaxed max-w-2xl mx-auto">
            매장 네트워크 대상 비즈니스를 위해
            <br />
            <strong className="text-white">이미 사이트를 운영하고 있는 사업자</strong>를 위한 서비스입니다.
            <br />
            기존 사이트에 연결하여 바로 활용할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 대상 사업자 */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">
          이런 사업자가 활용합니다
        </h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          Cafe24, 아임웹, 기타 SaaS로 사이트를 이미 운영 중인 경우
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <Truck className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-gray-700 font-medium">공급자</p>
            <p className="text-xs text-gray-500 mt-1">매장 대상 상품 공급 사이트</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <Building2 className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-gray-700 font-medium">본부</p>
            <p className="text-xs text-gray-500 mt-1">프랜차이즈 가맹점 지원 사이트</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <Megaphone className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-gray-700 font-medium">마케팅 파트너</p>
            <p className="text-xs text-gray-500 mt-1">매장 대상 서비스 사이트</p>
          </div>
        </div>

        {/* 핵심 안내 */}
        <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 text-center mb-12">
          <p className="text-slate-700 leading-relaxed">
            새 홈페이지를 만들 필요가 없습니다.
            <br />
            기존 사이트에 <strong>배너·버튼·링크</strong> 형태로 연결하면
            <br />
            바로 활용할 수 있습니다.
          </p>
        </div>

        {/* SiteGuide 소개 */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
            기존 사이트에 연결할 수 있는 서비스
          </h2>

          <a
            href="https://siteguide.co.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-8 bg-white rounded-xl border border-slate-200 hover:border-primary-300 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">SiteGuide</h3>
              </div>
              <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors" />
            </div>

            <p className="text-gray-600 mb-6">
              방문자 질문에 사이트가 직접 답하는 AI 기반 안내 서비스
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <MessageCircle className="w-5 h-5 text-slate-600 mb-2" />
                <p className="text-sm text-slate-700 font-medium">질문에 바로 응답</p>
                <p className="text-xs text-slate-500 mt-1">방문자가 묻고, 사이트가 답합니다</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <Globe className="w-5 h-5 text-slate-600 mb-2" />
                <p className="text-sm text-slate-700 font-medium">페이지 맥락 이해</p>
                <p className="text-xs text-slate-500 mt-1">현재 페이지 기준으로 안내합니다</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <Sparkles className="w-5 h-5 text-slate-600 mb-2" />
                <p className="text-sm text-slate-700 font-medium">간편한 연결</p>
                <p className="text-xs text-slate-500 mt-1">배너 하나로 바로 시작</p>
              </div>
            </div>
          </a>
        </div>

        {/* 연결 방식 안내 */}
        <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">연결 방식</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-200">
                <span className="text-slate-600 font-bold">1</span>
              </div>
              <p className="text-sm text-slate-700">SiteGuide에서 안내 설정</p>
            </div>
            <div>
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-200">
                <span className="text-slate-600 font-bold">2</span>
              </div>
              <p className="text-sm text-slate-700">기존 사이트에 배너/링크 추가</p>
            </div>
            <div>
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-200">
                <span className="text-slate-600 font-bold">3</span>
              </div>
              <p className="text-sm text-slate-700">방문자가 바로 이용</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-8 border-t border-slate-200">
        <Link
          to="/o4o"
          className="inline-flex items-center text-slate-500 hover:text-slate-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          o4o 메인으로
        </Link>
      </div>
    </div>
  );
}
