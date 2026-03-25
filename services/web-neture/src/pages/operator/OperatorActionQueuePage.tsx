/**
 * OperatorActionQueuePage — Action Queue 전용 페이지
 *
 * WO-O4O-OPERATOR-ACTION-QUEUE-V1
 *
 * 모든 대기 항목을 타입/우선순위/설명과 함께 표시.
 * 클릭 → 해당 관리 페이지로 이동.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/apiClient';

interface ActionQueueItem {
  id: string;
  type: 'approval' | 'curation' | 'inquiry' | 'product';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  count: number;
  oldestAt: string | null;
  actionUrl: string;
  actionLabel: string;
}

interface ActionQueueData {
  summary: { total: number; high: number; today: number };
  items: ActionQueueItem[];
}

const TYPE_LABELS: Record<string, string> = {
  approval: '승인',
  curation: '큐레이션',
  inquiry: '문의',
  product: '상품',
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-500',
};

export default function OperatorActionQueuePage() {
  const [data, setData] = useState<ActionQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/neture/operator/actions');
      setData(response.data?.data ?? null);
    } catch (err) {
      console.error('[Action Queue] Fetch failed:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">{error || '데이터를 불러올 수 없습니다.'}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // Empty state
  if (data.items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-slate-800">Action Queue</h1>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <p className="text-lg font-semibold text-green-800 mb-1">모든 항목 처리 완료</p>
          <p className="text-sm text-green-700">현재 대기 중인 작업이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Action Queue</h1>

      {/* Summary KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">총 작업</p>
          <p className="text-2xl font-bold text-slate-800">{data.summary.total}<span className="text-sm font-normal text-slate-500 ml-1">건</span></p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">긴급</p>
          <p className="text-2xl font-bold text-red-600">{data.summary.high}<span className="text-sm font-normal text-slate-500 ml-1">건</span></p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">오늘 발생</p>
          <p className="text-2xl font-bold text-slate-800">{data.summary.today}<span className="text-sm font-normal text-slate-500 ml-1">건</span></p>
        </div>
      </div>

      {/* Action List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
          <span>우선순위</span>
          <span>항목</span>
          <span className="text-right">건수</span>
          <span></span>
        </div>
        {data.items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors"
          >
            {/* Priority + Type badge */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[item.priority]}`}>
                {item.priority === 'high' ? '긴급' : '보통'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                {TYPE_LABELS[item.type] || item.type}
              </span>
            </div>

            {/* Title + Description */}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
              <p className="text-xs text-slate-500 truncate">{item.description}</p>
            </div>

            {/* Count */}
            <span className="text-sm font-semibold text-amber-600 whitespace-nowrap">
              {item.count}건
            </span>

            {/* Action button */}
            <Link
              to={item.actionUrl}
              className="inline-flex items-center px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              {item.actionLabel}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
