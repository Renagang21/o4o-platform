/**
 * PartnerStatusPage - 상태 확인 페이지
 *
 * Work Order: WO-GLYCOPHARM-PARTNER-DASHBOARD-IMPLEMENTATION-V1
 *
 * 포함 요소:
 * - 콘텐츠 상태: 활성/비활성
 * - 이벤트 상태: 진행 중/종료
 *
 * 금지:
 * - 분석
 * - 비교
 * - 추천
 */

import { FileText, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

// Mock 데이터 (API 연동 구조 유지)
interface StatusItem {
  id: string;
  name: string;
  type: 'content' | 'event';
  status: 'active' | 'inactive' | 'ongoing' | 'ended';
  updatedAt: string;
}

const mockStatusItems: StatusItem[] = [
  {
    id: '1',
    name: '신규 건강기능식품 안내',
    type: 'content',
    status: 'active',
    updatedAt: '2026-01-15',
  },
  {
    id: '2',
    name: '1월 프로모션 배너',
    type: 'content',
    status: 'active',
    updatedAt: '2026-01-14',
  },
  {
    id: '3',
    name: '당뇨 관리 가이드',
    type: 'content',
    status: 'inactive',
    updatedAt: '2026-01-10',
  },
  {
    id: '4',
    name: '1월 신년 이벤트',
    type: 'event',
    status: 'ongoing',
    updatedAt: '2026-01-01',
  },
  {
    id: '5',
    name: '12월 연말 캠페인',
    type: 'event',
    status: 'ended',
    updatedAt: '2025-12-31',
  },
];

const statusConfig = {
  active: { label: '활성', icon: CheckCircle, color: 'green' },
  inactive: { label: '비활성', icon: XCircle, color: 'slate' },
  ongoing: { label: '진행 중', icon: Clock, color: 'blue' },
  ended: { label: '종료', icon: XCircle, color: 'slate' },
};

export default function PartnerStatusPage() {
  const items = mockStatusItems;

  const contentItems = items.filter((item) => item.type === 'content');
  const eventItems = items.filter((item) => item.type === 'event');

  const renderStatusBadge = (status: keyof typeof statusConfig) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-${config.color}-100 text-${config.color}-700`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">상태</h1>
        <p className="text-slate-500 mt-1">
          콘텐츠와 이벤트의 현재 상태를 확인하세요.
        </p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {contentItems.filter((i) => i.status === 'active').length}
          </p>
          <p className="text-sm text-slate-500">활성 콘텐츠</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-400">
            {contentItems.filter((i) => i.status === 'inactive').length}
          </p>
          <p className="text-sm text-slate-500">비활성 콘텐츠</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {eventItems.filter((i) => i.status === 'ongoing').length}
          </p>
          <p className="text-sm text-slate-500">진행 중 이벤트</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-400">
            {eventItems.filter((i) => i.status === 'ended').length}
          </p>
          <p className="text-sm text-slate-500">종료 이벤트</p>
        </div>
      </div>

      {/* Content Status */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold text-slate-800">콘텐츠 상태</h2>
        </div>

        {contentItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            등록된 콘텐츠가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {contentItems.map((item) => (
              <li key={item.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-400">업데이트: {item.updatedAt}</p>
                </div>
                {renderStatusBadge(item.status as 'active' | 'inactive')}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Event Status */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold text-slate-800">이벤트 상태</h2>
        </div>

        {eventItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            등록된 이벤트가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {eventItems.map((item) => (
              <li key={item.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-400">업데이트: {item.updatedAt}</p>
                </div>
                {renderStatusBadge(item.status as 'ongoing' | 'ended')}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center">
        <p className="text-sm text-slate-400">
          상태 변경이 필요한 경우 각 메뉴에서 수정하세요.
        </p>
      </div>
    </div>
  );
}
