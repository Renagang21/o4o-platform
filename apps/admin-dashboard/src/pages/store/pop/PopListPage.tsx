/**
 * POP 목록 페이지
 *
 * WO-STORE-POP-CREATION-RESTRUCTURE-V1
 *
 * 경로: /store/pop
 * - 새 POP 만들기 진입점
 * - POP 제작 흐름 안내
 */

import { useNavigate } from 'react-router-dom';
import { Printer, Plus, ArrowRight, Sparkles, FileText, Download } from 'lucide-react';

export default function PopListPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Printer className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">POP 제작</h1>
            <p className="text-sm text-gray-500 mt-0.5">상품 기반 POP(Point of Purchase)를 AI로 생성하고 PDF로 출력합니다</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/store/pop/create')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          새 POP 만들기
        </button>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">제작 흐름</h2>
        <div className="flex items-start gap-2">
          {[
            { icon: <FileText className="w-4 h-4" />, label: '상품 선택', desc: '카탈로그에서 상품을 선택합니다' },
            { icon: <Sparkles className="w-4 h-4" />, label: 'AI 문구 생성', desc: '상품 정보 기반 POP 문구를 자동 생성합니다' },
            { icon: <Printer className="w-4 h-4" />, label: '편집 및 출력', desc: '문구를 수정하고 PDF로 다운로드합니다' },
          ].map((step, i) => (
            <div key={i} className="flex-1 flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
                  {step.icon}
                </div>
                {i < 2 && (
                  <div className="hidden sm:flex items-center mt-4">
                    <ArrowRight className="w-4 h-4 text-gray-300 absolute ml-8" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{step.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-orange-50 rounded-xl border border-orange-200 p-6 text-center">
        <Download className="w-8 h-8 text-orange-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-800 mb-1">POP를 만들어 보세요</h3>
        <p className="text-sm text-gray-500 mb-4">상품을 선택하면 AI가 POP 문구를 자동으로 생성합니다.<br/>A4/A5 레이아웃으로 바로 PDF 출력이 가능합니다.</p>
        <button
          onClick={() => navigate('/store/pop/create')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          새 POP 만들기
        </button>
      </div>
    </div>
  );
}
