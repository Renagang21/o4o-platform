/**
 * PartnerOverviewPage - 파트너 현황 페이지
 * Reference: GlycoPharm (복제)
 */

import { FileText, Calendar, Activity } from 'lucide-react';

export default function PartnerOverviewPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">파트너 현황</h1>
        <p className="text-slate-500 mt-1">
          GlucoseView 파트너로서의 활동 현황을 확인하세요.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">2</p>
              <p className="text-sm text-slate-500">활성 콘텐츠</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">1</p>
              <p className="text-sm text-slate-500">진행 중 이벤트</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">정상</p>
              <p className="text-sm text-slate-500">전체 상태</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">최근 활동</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-slate-600">신규 혈당 관리 콘텐츠가 등록되었습니다.</span>
            <span className="text-slate-400 ml-auto">1일 전</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-slate-600">1월 건강 이벤트가 시작되었습니다.</span>
            <span className="text-slate-400 ml-auto">3일 전</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
            <span className="text-slate-600">홍보 대상이 업데이트되었습니다.</span>
            <span className="text-slate-400 ml-auto">1주 전</span>
          </div>
        </div>
      </div>
    </div>
  );
}
