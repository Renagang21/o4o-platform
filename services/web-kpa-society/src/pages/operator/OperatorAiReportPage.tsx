/**
 * OperatorAiReportPage - 서비스 운영자 AI/Context Asset 리포트
 *
 * Work Order: WO-AI-SERVICE-OPERATOR-REPORT-V1
 * Work Order: WO-AI-ASSET-QUALITY-LOOP-V1 (품질 인사이트 섹션 추가)
 * WO-O4O-ADMIN-UI-COMPLETION-V1: mock 제거, empty state 적용
 *
 * KPA Society 버전 - 분석 인프라 구축 후 실데이터 연동 예정 (별도 WO)
 */

import { Info } from 'lucide-react';

export default function OperatorAiReportPage() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">AI/Context Asset 리포트</h1>
        <p className="text-slate-500 mt-1">
          AI 응답에서 노출된 Context Asset 현황을 분석합니다
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800">
            <strong>Context Asset</strong>은 AI 응답에 포함된 강좌, 회원, 문서, 공동구매 정보입니다.
            이 리포트를 통해 회원들이 어떤 정보를 많이 찾고 있는지 파악하고,
            서비스 개선에 활용할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Info className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">분석 데이터 준비 중</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          AI 응답 분석 인프라가 준비되면 KPI, Context Asset 노출 현황,
          노출 사유 분포, 일별 트렌드, 품질 인사이트가 표시됩니다.
        </p>
      </div>
    </div>
  );
}
