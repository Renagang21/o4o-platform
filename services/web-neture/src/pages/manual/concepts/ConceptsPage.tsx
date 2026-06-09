/**
 * ConceptsPage - o4o 개념 문서
 *
 * Work Order: WO-O4O-PUBLIC-SITE-PHASE1-BUILD-V1
 *
 * 포함:
 * - 채널 개념과 용도
 * - "왜 채널은 분리되어야 하는가" 1단락
 *
 * 제외:
 * - 기술
 * - 구조
 * - 작동 방식
 * - 내부 규칙
 */

import { Link } from 'react-router-dom';

export default function ConceptsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-slate-500 text-sm mb-2">
            이 문서는 o4o를 이해하기 위한 개념 문서입니다.
          </p>
          <h1 className="text-3xl font-bold text-slate-900">개념</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* 채널 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">채널</h2>
          <p className="text-slate-700 leading-relaxed mb-6">
            채널은 사업자가 고객과 만나는 접점입니다.
            온라인 쇼핑몰, 오프라인 매장, 디지털 사이니지, 커뮤니티 포럼, 교육 플랫폼 등
            다양한 형태가 있습니다.
          </p>
          <p className="text-slate-700 leading-relaxed mb-6">
            o4o에서 채널은 사업자가 직접 운영합니다.
            플랫폼이 채널을 대신 운영하지 않습니다.
          </p>

          {/* Channel types */}
          <div className="bg-slate-50 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-slate-900 mb-4">채널 유형</h3>
            <ul className="space-y-3 text-slate-700">
              <li className="flex items-start gap-3">
                <span className="font-medium text-slate-900 w-20 flex-shrink-0">온라인</span>
                <span>웹/앱을 통한 판매 채널</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-slate-900 w-20 flex-shrink-0">오프라인</span>
                <span>매장을 통한 대면 판매 채널</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-slate-900 w-20 flex-shrink-0">사이니지</span>
                <span>디지털 화면을 통한 안내 채널</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-slate-900 w-20 flex-shrink-0">포럼</span>
                <span>커뮤니티 기반 소통 채널</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-slate-900 w-20 flex-shrink-0">LMS</span>
                <span>교육 콘텐츠 제공 채널</span>
              </li>
            </ul>
          </div>

          <div className="text-center">
            <Link
              to="/manual/concepts/channel-map"
              className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
            >
              채널 도식 보기
            </Link>
          </div>
        </section>

        {/* 왜 채널 분리인가 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            왜 채널은 분리되어야 하는가
          </h2>
          <p className="text-slate-700 leading-relaxed">
            채널이 분리되면 사업자는 자신의 고객과 직접 관계를 맺습니다.
            플랫폼에 종속되지 않고, 채널을 자유롭게 운영하고 확장할 수 있습니다.
          </p>
        </section>

        {/* Navigation */}
        <div className="border-t border-slate-200 pt-8">
          <div className="flex justify-between text-sm">
            <Link to="/" className="text-slate-500 hover:text-slate-700">
              메인으로
            </Link>
            <Link to="/o4o" className="text-primary-600 hover:text-primary-700">
              o4o 소개
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
