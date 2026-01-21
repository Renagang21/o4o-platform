/**
 * PharmacyTargetPage - 약국 대상 사업자 안내
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Monitor, Tablet, Tv, GraduationCap, Store } from 'lucide-react';

export default function PharmacyTargetPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-primary-400 text-sm font-medium mb-3">
            O4O Platform · 대상 사업자
          </p>
          <h1 className="text-3xl font-bold mb-4">약국</h1>
          <p className="text-slate-300 leading-relaxed">
            건강기능식품, 의약외품을 취급하는 약국을 위한 채널 운영 환경
          </p>
        </div>
      </div>

      {/* 제공 채널 */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">
          제공되는 채널
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* 자체 홈페이지/앱 */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                <Monitor className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-gray-900">자체 홈페이지</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              약국 전용 웹사이트를 통해 상품 안내, 예약, 상담 접수가 가능합니다.
              고객이 온라인에서 먼저 확인하고 방문할 수 있습니다.
            </p>
          </div>

          {/* 키오스크/태블릿 */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                <Tablet className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-gray-900">키오스크 / 태블릿</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              매장 내 키오스크나 태블릿을 통해 고객이 직접 상품을 검색하고
              정보를 확인할 수 있습니다. 대기 시간을 활용한 안내가 가능합니다.
            </p>
          </div>

          {/* 디지털 사이니지 */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                <Tv className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-gray-900">디지털 사이니지</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              매장 내 TV나 모니터로 자체 방송 채널을 운영할 수 있습니다.
              건강 정보, 신상품 안내, 프로모션 등을 직접 편성합니다.
            </p>
          </div>

          {/* LMS */}
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                <GraduationCap className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-gray-900">LMS (교육 콘텐츠)</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              건강기능식품 복용법, 질환별 관리 방법 등 자체 교육 콘텐츠를 제작하고
              고객에게 제공할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 핵심 가치 */}
        <div className="bg-primary-50 rounded-xl p-8 border border-primary-200 text-center">
          <Store className="w-8 h-8 text-primary-600 mx-auto mb-4" />
          <p className="text-primary-800 leading-relaxed">
            약국이 직접 운영하는 채널입니다.
            <br />
            플랫폼에 종속되지 않고, 고객과 직접 연결됩니다.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-8 border-t border-slate-200">
        <Link
          to="/"
          className="inline-flex items-center text-slate-500 hover:text-slate-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          메인으로
        </Link>
      </div>
    </div>
  );
}
