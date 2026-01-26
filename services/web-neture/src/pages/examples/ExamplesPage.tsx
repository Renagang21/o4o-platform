/**
 * ExamplesPage - o4o 서비스 예제 목록
 *
 * Work Order: WO-O4O-EXAMPLE-SERVICE-LIST-V1
 *
 * 목적:
 * - o4o 기반 서비스 예제 진입점
 * - 여러 서비스가 이미 존재한다는 인상 제공
 * - 운영자/관리자 화면 노출 없음
 * - 비로그인 체험 가능
 */

import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink } from 'lucide-react';

export default function ExamplesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">서비스 예제</h1>
          <p className="text-slate-300">
            o4o 기반으로 운영 중인 서비스를 직접 체험해 보세요
          </p>
        </div>
      </div>

      {/* Examples Cards */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 약국 매장 예제 */}
          <Link
            to="/examples/store/pharmacy"
            className="group p-8 rounded-xl transition-all border bg-white border-slate-200 hover:border-primary-300 hover:shadow-lg"
          >
            <h2 className="text-xl font-semibold text-slate-900 mb-3 flex items-center justify-between">
              약국 매장 예제
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary-600 transition-colors" />
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              매장 운영 화면의 한 예시
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs text-primary-600 font-medium">직접 보기</span>
            </div>
          </Link>

          {/* SiteGuide */}
          <a
            href="https://siteguide.co.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-8 rounded-xl transition-all border bg-white border-slate-200 hover:border-primary-300 hover:shadow-lg"
          >
            <h2 className="text-xl font-semibold text-slate-900 mb-3 flex items-center justify-between">
              SiteGuide
              <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-primary-600 transition-colors" />
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              기존 사이트에 연결해 사용하는 AI 기반 안내 서비스
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs text-primary-600 font-medium">사이트 방문</span>
            </div>
          </a>

          {/* 추가 예정 */}
          <div className="p-8 rounded-xl border border-slate-200 bg-slate-50">
            <h2 className="text-xl font-semibold text-slate-400 mb-3 flex items-center justify-between">
              추가 예정
              <span className="text-xs font-normal text-slate-400 bg-slate-200 px-2 py-1 rounded">준비 중</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              새로운 서비스 예제가 추가될 예정입니다
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="border-t border-slate-200 pt-8">
          <div className="flex justify-between text-sm">
            <Link to="/o4o" className="text-slate-500 hover:text-slate-700">
              o4o 소개로 돌아가기
            </Link>
            <Link to="/" className="text-primary-600 hover:text-primary-700">
              메인으로
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
