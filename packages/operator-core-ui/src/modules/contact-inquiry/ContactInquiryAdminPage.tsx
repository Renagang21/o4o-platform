/**
 * ContactInquiryAdminPage — 공통 "문의 관리" Admin UI (GP/KCos)
 *
 * WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1
 *
 * serviceKey + api 어댑터 주입. 목록(상태 필터/페이지) + 상세(본문/상태 변경/내부 메모).
 * 본문은 plain text(whitespace-pre-wrap) — dangerouslySetInnerHTML 미사용(XSS 회피).
 *
 * WO-O4O-CROSS-SERVICE-RAW-TABLE-STANDARDIZATION-BATCH-V1:
 *   raw <table> + inline style → 표준 `DataTable`(@o4o/operator-ux-core) + Tailwind 로 전환.
 *   기존 헤더의 "스타일: inline (서비스 Tailwind 비의존)" 방침은 폐기되었다
 *   (표준 Tailwind 통일 결정). 서비스별 차이는 props(title/inquiryTypeLabels)로만 처리하며
 *   공용 컴포넌트 내부에 서비스 조건문·전용 CSS 를 두지 않는다.
 *   목록은 선택 후 일괄 작업이 정의되어 있지 않으므로 체크박스/ActionBar 는 넣지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import {
  CONTACT_STATUSES,
  type ContactInquiryDetail,
  type ContactInquiryListItem,
  type ContactInquiryListResult,
  type ContactInquiryAdminPageProps,
} from './types';

const STATUS_LABEL: Record<string, string> = Object.fromEntries(CONTACT_STATUSES.map((s) => [s.value, s.label]));

const BTN_GHOST =
  'px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed';
const FIELD_LABEL = 'block text-xs text-slate-500 mb-1';
const FIELD_VALUE = 'text-sm text-slate-800';

/** 상태 배지 — O4O 표준 배지 패턴(Tailwind 토큰) 재사용 */
const STATUS_BADGE_CLASS: Record<string, string> = {
  received: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-800',
  answered: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
  spam: 'bg-red-50 text-red-700',
};

function statusBadge(status: string) {
  const label = STATUS_LABEL[status] || status;
  const cls = STATUS_BADGE_CLASS[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{label}</span>
  );
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return '-'; }
}

export function ContactInquiryAdminPage({ serviceKey, api, inquiryTypeLabels = {}, title }: ContactInquiryAdminPageProps) {
  const [statusFilter, setStatusFilter] = useState('');
  const [result, setResult] = useState<ContactInquiryListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detail, setDetail] = useState<ContactInquiryDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState('');
  const [detailNote, setDetailNote] = useState('');
  const [saving, setSaving] = useState(false);

  const typeLabel = (t: string) => inquiryTypeLabels[t] || t;

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const r = await api.list(serviceKey, { status: statusFilter || undefined, page, limit: 20 });
      setResult(r);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '문의 목록을 불러오지 못했습니다.' });
    } finally {
      setLoading(false);
    }
  }, [api, serviceKey, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const openDetail = async (id: string) => {
    setMessage(null);
    try {
      const d = await api.getDetail(serviceKey, id);
      setDetail(d);
      setDetailStatus(d.status);
      setDetailNote(d.internalNote ?? '');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '문의 상세를 불러오지 못했습니다.' });
    }
  };

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    setMessage(null);
    try {
      let updated = detail;
      if (detailStatus !== detail.status) updated = await api.setStatus(serviceKey, detail.id, detailStatus);
      if (detailNote !== (detail.internalNote ?? '')) updated = await api.setNote(serviceKey, detail.id, detailNote);
      setDetail(updated);
      setMessage({ type: 'success', text: '저장되었습니다.' });
      await load(result?.pagination.page ?? 1);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const columns: ListColumnDef<ContactInquiryListItem>[] = [
    { key: 'createdAt', header: '접수일', width: '150px', render: (_v, i) => fmt(i.createdAt) },
    { key: 'inquiryType', header: '유형', width: '110px', render: (_v, i) => typeLabel(i.inquiryType) },
    {
      key: 'subject',
      header: '제목',
      minWidth: 200,
      render: (_v, i) => (
        <span className="block max-w-[240px] truncate" title={i.subject}>{i.subject}</span>
      ),
    },
    { key: 'name', header: '이름', width: '110px', render: (_v, i) => i.name },
    { key: 'organizationName', header: '소속', width: '140px', render: (_v, i) => i.organizationName || '-' },
    { key: 'status', header: '상태', width: '100px', render: (_v, i) => statusBadge(i.status) },
    { key: 'handledAt', header: '처리일', width: '150px', render: (_v, i) => (i.handledAt ? fmt(i.handledAt) : '-') },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 mb-1">{title ?? '문의 관리'}</h1>
      <p className="text-sm text-slate-500 mb-4">
        공개 문의(Contact)로 접수된 내역을 확인·처리합니다. 대상 서비스: <strong>{serviceKey}</strong>
      </p>

      {message && (
        <div
          className={`px-4 py-2.5 rounded-lg text-sm mb-4 border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3.5">
        <select
          className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">전체 상태</option>
          {CONTACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button type="button" className={BTN_GHOST} onClick={() => load(1)}>새로고침</button>
      </div>

      <DataTable<ContactInquiryListItem>
        columns={columns}
        data={result?.items ?? []}
        rowKey={(i) => i.id}
        loading={loading}
        emptyMessage="접수된 문의가 없습니다."
        onRowClick={(i) => openDetail(i.id)}
      />

      {result && result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3.5">
          <button
            type="button"
            className={BTN_GHOST}
            disabled={result.pagination.page <= 1}
            onClick={() => load(result.pagination.page - 1)}
          >
            이전
          </button>
          <span className="text-sm text-slate-500">
            {result.pagination.page} / {result.pagination.totalPages}
          </span>
          <button
            type="button"
            className={BTN_GHOST}
            disabled={result.pagination.page >= result.pagination.totalPages}
            onClick={() => load(result.pagination.page + 1)}
          >
            다음
          </button>
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
          onClick={() => setDetail(null)}
        >
          <div
            className="w-[min(560px,100%)] h-full bg-white overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900 m-0">{detail.subject}</h2>
              <button type="button" className={BTN_GHOST} onClick={() => setDetail(null)}>닫기</button>
            </div>

            <div className="mb-3"><span className={FIELD_LABEL}>유형</span><span className={FIELD_VALUE}>{typeLabel(detail.inquiryType)}</span></div>
            <div className="flex gap-4">
              <div className="mb-3 flex-1"><span className={FIELD_LABEL}>이름</span><span className={FIELD_VALUE}>{detail.name}</span></div>
              <div className="mb-3 flex-1"><span className={FIELD_LABEL}>이메일</span><span className={FIELD_VALUE}>{detail.email}</span></div>
            </div>
            <div className="flex gap-4">
              <div className="mb-3 flex-1"><span className={FIELD_LABEL}>연락처</span><span className={FIELD_VALUE}>{detail.phone || '-'}</span></div>
              <div className="mb-3 flex-1"><span className={FIELD_LABEL}>소속</span><span className={FIELD_VALUE}>{detail.organizationName || '-'}</span></div>
            </div>
            <div className="mb-3">
              <span className={FIELD_LABEL}>문의 내용</span>
              {/* plain text 유지 — dangerouslySetInnerHTML 미사용(XSS 회피) */}
              <div className="text-sm text-slate-800 whitespace-pre-wrap break-words bg-slate-50 border border-slate-200 rounded-lg p-3">
                {detail.message}
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mb-3 flex-1"><span className={FIELD_LABEL}>접수일</span><span className={FIELD_VALUE}>{fmt(detail.createdAt)}</span></div>
              <div className="mb-3 flex-1"><span className={FIELD_LABEL}>알림 상태</span><span className={FIELD_VALUE}>{detail.notificationStatus || '-'}</span></div>
            </div>
            {detail.sourcePath && (
              <div className="mb-3"><span className={FIELD_LABEL}>경로</span><span className={FIELD_VALUE}>{detail.sourcePath}</span></div>
            )}

            <div className="h-px bg-slate-200 my-3.5" />

            <div className="mb-3">
              <span className={FIELD_LABEL}>상태</span>
              <select
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                value={detailStatus}
                onChange={(e) => setDetailStatus(e.target.value)}
              >
                {CONTACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <span className={FIELD_LABEL}>내부 메모</span>
              <textarea
                className="w-full box-border px-2.5 py-2 text-sm border border-slate-300 rounded-lg min-h-20 font-[inherit]"
                value={detailNote}
                onChange={(e) => setDetailNote(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
