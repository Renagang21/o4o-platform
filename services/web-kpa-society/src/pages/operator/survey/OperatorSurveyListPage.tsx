/**
 * OperatorSurveyListPage — 설문조사 관리
 * WO-O4O-SURVEY-POINT-REWARD-PHASE1-V1
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, RefreshCw, AlertCircle, Plus, Loader2, Trash2, PlayCircle, StopCircle } from 'lucide-react';
import { RowActionMenu } from '@o4o/ui';
import { DataTable, Pagination, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { surveyApi, type SurveyItem } from '../../../api/survey';
import { toast } from '@o4o/error-handling';

const STATUS_CONFIG: Record<string, { text: string; cls: string }> = {
  draft:    { text: '초안',   cls: 'bg-amber-50 text-amber-600' },
  active:   { text: '진행중', cls: 'bg-green-50 text-green-700' },
  closed:   { text: '종료',   cls: 'bg-slate-100 text-slate-500' },
  archived: { text: '보관',   cls: 'bg-slate-100 text-slate-400' },
};

const COLUMNS: ListColumnDef<SurveyItem>[] = [
  {
    key: 'title',
    header: '제목',
    render: (row) => <span className="font-medium text-slate-800">{row.title}</span>,
  },
  {
    key: 'status',
    header: '상태',
    render: (row) => {
      const cfg = STATUS_CONFIG[row.status] ?? { text: row.status, cls: '' };
      return <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${cfg.cls}`}>{cfg.text}</span>;
    },
  },
  {
    key: 'reward',
    header: '보상',
    render: (row) => row.rewardEnabled
      ? <span className="text-xs font-semibold text-emerald-700">{row.rewardAmount}P</span>
      : <span className="text-xs text-slate-400">미지급</span>,
  },
  {
    key: 'responseCount',
    header: '응답 수',
    render: (row) => (
      <span className="text-sm text-slate-600">
        {row.responseCount}{row.maxResponses ? ` / ${row.maxResponses}` : ''}
      </span>
    ),
  },
  {
    key: 'period',
    header: '기간',
    render: (row) => {
      const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('ko-KR') : '-';
      return <span className="text-xs text-slate-500">{fmt(row.startAt)} ~ {fmt(row.endAt)}</span>;
    },
  },
  {
    key: 'createdAt',
    header: '생성일',
    render: (row) => <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString('ko-KR')}</span>,
  },
];

const surveyActionPolicy = defineActionPolicy<SurveyItem>('kpa:surveys', {
  rules: [
    {
      key: 'activate',
      label: '활성화',
      visible: (row) => row.status === 'draft',
    },
    {
      key: 'close',
      label: '종료',
      visible: (row) => row.status === 'active',
      confirm: (row) => ({
        title: '설문 종료',
        description: `"${row.title}" 설문을 종료하시겠습니까?`,
        confirmLabel: '종료',
        cancelLabel: '취소',
      }),
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'destructive',
      visible: (row) => row.status === 'draft' || row.status === 'archived',
      confirm: (row) => ({
        title: '설문 삭제',
        description: `"${row.title}" 설문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
        confirmLabel: '삭제',
        cancelLabel: '취소',
      }),
    },
  ],
});

export default function OperatorSurveyListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SurveyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await surveyApi.list({ page, limit: LIMIT });
      setItems(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e.message ?? '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleAction = useCallback(async (key: string, row: SurveyItem) => {
    try {
      if (key === 'activate') {
        await surveyApi.update(row.id, { status: 'active' });
        toast.success('활성화되었습니다');
        load();
      } else if (key === 'close') {
        await surveyApi.update(row.id, { status: 'closed' });
        toast.success('종료되었습니다');
        load();
      } else if (key === 'delete') {
        await surveyApi.delete(row.id);
        toast.success('삭제되었습니다');
        load();
      }
    } catch (e: any) {
      toast.error(e.message ?? '작업 실패');
    }
  }, [load]);

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-slate-600" />
          <h1 className="text-lg font-semibold text-slate-800">설문조사 관리</h1>
          <span className="text-sm text-slate-500">({total}건)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 border rounded hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            새로고침
          </button>
          <button
            onClick={() => navigate('/operator/surveys/new')}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-emerald-600 rounded hover:bg-emerald-700"
          >
            <Plus className="w-3.5 h-3.5" />
            설문 만들기
          </button>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* 테이블 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <DataTable
          columns={COLUMNS}
          data={items}
          rowKey="id"
          renderRowActions={(row) => (
            <RowActionMenu
              actions={buildRowActions(surveyActionPolicy, row, {
                onActivate: () => handleAction('activate', row),
                onClose: () => handleAction('close', row),
                onDelete: () => handleAction('delete', row),
              })}
            />
          )}
        />
      )}

      {/* 페이지네이션 */}
      {total > LIMIT && (
        <Pagination
          page={page}
          totalPages={Math.ceil(total / LIMIT)}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
