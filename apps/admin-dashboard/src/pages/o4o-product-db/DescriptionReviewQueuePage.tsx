/**
 * DescriptionReviewQueuePage — 설명서 검토 Queue (Group 중심, read-only)
 *
 * WO-O4O-ADMIN-DESCRIPTION-REVIEW-QUEUE-V1
 *
 * Dashboard 다음 단계. 운영자가 설명서를 "목록"이 아니라 **검토 대상(Group)** 단위로 처리하는
 * 업무동선의 시작. 행 = (성분·함량·제형) Group, 행 클릭 → Group Detail Drawer(읽기 전용).
 *
 * 이번 WO 범위: Queue 조회 + 검색/상태/Source 필터 + 정렬 + Group Detail(적용 Master 목록·상담 블록).
 * 제외(다음 WO): Approve / Reject / Editor / Preview / History / Rollback / Canonical Apply.
 * mutation 0 — 조회 전용.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Layers, FileText, Users, RefreshCw } from 'lucide-react';
import { BaseTable, BaseDetailDrawer } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import {
  getDescriptionReviewQueue,
  getReviewQueueFilterOptions,
  getReviewQueueDetail,
  type ReviewQueueRow,
  type ReviewQueueDetail,
} from '@/api/o4o-product-db.api';

// WO-O4O-ADMIN-DESCRIPTION-REVIEW-QUEUE-SPD-SOURCE-V1
const SOURCE_STORE_LABEL: Record<string, string> = { otc_draft: 'OTC 초안', spd: '공식 설명서(SPD)' };
function sourceStoreBadge(s: 'OTC_DRAFT' | 'SPD') {
  const tone = s === 'SPD' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700';
  return <span className={`inline-block px-2 py-0.5 rounded text-xs ${tone}`}>{s === 'SPD' ? '공식 설명서' : 'OTC 초안'}</span>;
}

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  needs_review: '검토 필요',
  approved: '승인',
  rejected: '반려',
  hidden: '숨김',
  deprecated: '폐기',
};
const SORT_OPTIONS = [
  { value: 'applied_master', label: '적용 Master 많은 순' },
  { value: 'updated_at', label: '최근 수정순' },
  { value: 'group', label: '그룹명순' },
];

function fmtDate(v: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
}
function statusBadge(s: string) {
  const tone = s === 'approved' ? 'bg-green-100 text-green-700'
    : s === 'rejected' ? 'bg-red-100 text-red-700'
    : s === 'needs_review' ? 'bg-amber-100 text-amber-700'
    : 'bg-gray-100 text-gray-600';
  return <span className={`inline-block px-2 py-0.5 rounded text-xs ${tone}`}>{STATUS_LABEL[s] ?? s}</span>;
}

export default function DescriptionReviewQueuePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReviewQueueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('needs_review');
  const [source, setSource] = useState('');
  const [sourceStore, setSourceStore] = useState<'all' | 'otc_draft' | 'spd'>('all');
  const [sort, setSort] = useState('updated_at');

  const [sourceStores, setSourceStores] = useState<{ value: string; count: number }[]>([]);
  const [sources, setSources] = useState<{ value: string; count: number }[]>([]);
  const [statuses, setStatuses] = useState<{ value: string; count: number }[]>([]);

  // 상세 Drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<ReviewQueueDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // 검색어 debounce
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    getReviewQueueFilterOptions()
      .then((o) => { setSourceStores(o.sourceStores); setSources(o.sources); setStatuses(o.statuses); })
      .catch(() => { /* 필터 옵션 실패는 치명적 아님 */ });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDescriptionReviewQueue({
        q: q || undefined,
        status: status || undefined,
        source: source || undefined,
        sourceStore,
        sort: sort as any,
        page,
        limit,
      });
      setRows(res.items);
      setTotal(res.meta.total);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '검토 Queue 를 불러오지 못했습니다');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q, status, source, sourceStore, sort, page, limit]);

  useEffect(() => { load(); }, [load]);

  const openDetail = useCallback(async (draftId: string) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await getReviewQueueDetail(draftId));
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // OTC 초안 그룹 = 그룹 상세 Drawer, SPD needs_review = 기존 기본상품 상세 화면.
  const handleRowClick = useCallback((r: ReviewQueueRow) => {
    if (r.detailKind === 'queue' && r.draftId) openDetail(r.draftId);
    else if (r.masterId) navigate(`/admin/o4o-product-db/masters/${r.masterId}`);
  }, [openDetail, navigate]);

  const columns: O4OColumn<ReviewQueueRow>[] = useMemo(() => [
    { key: 'sourceStore', header: '구분', align: 'center', maxWidth: 96, render: (_, r) => sourceStoreBadge(r.sourceStore) },
    {
      key: 'group', header: '검토 대상', maxWidth: 320, render: (_, r) => (
        <div className="max-w-[20rem]">
          <div className="font-medium text-gray-900 truncate">
            {r.sourceStore === 'SPD' ? (r.productName || '—') : (r.ingredient || r.groupKey || '—')}
          </div>
          <div className="text-xs text-gray-400 truncate">
            {r.sourceStore === 'SPD'
              ? [r.manufacturerName, r.descriptionType].filter(Boolean).join(' · ') || r.primaryUse || ''
              : (r.primaryUse || '')}
          </div>
        </div>
      ),
    },
    { key: 'sourceLabel', header: 'Source', maxWidth: 150, render: (_, r) => <span className="text-xs text-gray-500 truncate block max-w-[9rem]">{r.sourceLabel || '—'}</span> },
    {
      key: 'appliedMasterCount', header: '적용 Master', align: 'right', render: (_, r) => (
        <span className="tabular-nums text-gray-800 font-medium">
          {r.appliedMasterCount != null ? r.appliedMasterCount.toLocaleString() : '—'}
          {r.groupMasterCount != null && <span className="text-gray-400 font-normal"> / {r.groupMasterCount.toLocaleString()}</span>}
        </span>
      ),
    },
    { key: 'reviewStatus', header: '상태', align: 'center', render: (_, r) => statusBadge(r.reviewStatus) },
    { key: 'updatedAt', header: '최근 수정', align: 'right', render: (_, r) => <span className="text-xs text-gray-400">{fmtDate(r.updatedAt)}</span> },
    { key: 'author', header: '작성자', align: 'center', render: (_, r) => <span className="text-xs text-gray-500">{r.author || 'AI 생성'}</span> },
    { key: 'reviewer', header: '검토자', align: 'center', render: (_, r) => <span className="text-xs text-gray-400">{r.reviewer || '미배정'}</span> },
  ], []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-admin-blue" /> 설명서 검토 Queue
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          검토가 필요한 설명서를 <b>공식 설명서(SPD needs_review)</b>와 <b>OTC 초안(성분·함량·제형 그룹)</b> 두 소스로 함께 봅니다.
          행을 누르면 SPD는 기본상품 상세, OTC 초안은 그룹 상세(적용 대상 기본상품)로 이동합니다. (읽기 전용 — 승인/반려/편집은 다음 단계)
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="상품명 / 성분 / 그룹 / 용도 검색"
            className="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm w-64"
          />
        </div>
        <select value={sourceStore} onChange={(e) => { setSourceStore(e.target.value as any); setPage(1); }} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="all">전체 소스</option>
          {sourceStores.map((s) => <option key={s.value} value={s.value}>{SOURCE_STORE_LABEL[s.value] ?? s.value} ({s.count.toLocaleString()})</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="">전체 상태</option>
          {statuses.map((s) => <option key={s.value} value={s.value}>{(STATUS_LABEL[s.value] ?? s.value)} ({s.count})</option>)}
        </select>
        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="">전체 Source</option>
          {sources.map((s) => <option key={s.value} value={s.value}>{s.value} ({s.count})</option>)}
        </select>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={load} className="p-1.5 border border-gray-300 rounded text-gray-500 hover:text-gray-700" title="새로고침"><RefreshCw className="w-4 h-4" /></button>
        <span className="text-xs text-gray-400 ml-auto">총 {total.toLocaleString()} 건</span>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="text-sm underline">재시도</button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <BaseTable<ReviewQueueRow>
            columns={columns}
            data={rows}
            rowKey={(r) => r.reviewItemId}
            onRowClick={handleRowClick}
            emptyMessage={loading ? '불러오는 중…' : '검토 대상이 없습니다.'}
            tableId="o4o-description-review-queue"
            columnVisibility
          />
          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
              <span className="text-gray-500">{page} / {totalPages} 페이지</span>
              <div className="flex gap-2">
                <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40">이전</button>
                <button disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40">다음</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Group Detail Drawer (읽기 전용) */}
      <BaseDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="검토 그룹 상세"
        width={620}
        loading={detailLoading}
        actions={[{ label: '닫기', onClick: () => setDetailOpen(false), variant: 'default' }]}
      >
        {detail && <GroupDetail d={detail} />}
      </BaseDetailDrawer>
    </div>
  );
}

// ─── Group Detail 본문 (읽기 전용) ─────────────────────────────────────────────
function GroupDetail({ d }: { d: ReviewQueueDetail }) {
  return (
    <div className="space-y-5 text-sm">
      {/* 메타 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800">{d.ingredient || d.groupKey}</h3>
        <div className="mt-2 grid grid-cols-2 gap-y-1 gap-x-4 text-xs">
          <Meta label="그룹 키" value={d.groupKey} mono />
          <Meta label="상태" value={STATUS_LABEL[d.reviewStatus] ?? d.reviewStatus} />
          <Meta label="함량 / 제형" value={[d.strengthToken, d.doseForm].filter(Boolean).join(' / ') || '—'} />
          <Meta label="Source" value={d.sourceLabel || '—'} />
          <Meta label="작성일" value={fmtDate(d.generatedAt)} />
          <Meta label="작성자" value={d.author || 'AI 생성'} />
          <Meta label="검토자" value={d.reviewer || '미배정'} />
          <Meta label="원문 출처" value={d.blocks.contentSource || '—'} />
        </div>
        {d.reviewFlags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {d.reviewFlags.map((f) => <span key={f} className="inline-block px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">{f}</span>)}
          </div>
        )}
      </section>

      {/* 상담 블록 */}
      <Block title="주요 용도 (Primary Clinical Use)" body={d.blocks.primaryClinicalUse} />
      <Block title="선택 포인트 (Selection Point)" body={d.blocks.selectionPoint} />
      <Block title="복약·상담 포인트 (Counseling Point)" body={d.blocks.counselingPoint} />
      <Block title="안전 정보 (Safety Block)" body={d.blocks.safetyBlock} tone="warn" />

      {/* 대표 설명 원문 */}
      {d.blocks.bodyMarkdown && (
        <section>
          <h4 className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> 대표 설명 (원문)</h4>
          <pre className="whitespace-pre-wrap break-words text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-3 max-h-72 overflow-auto">{d.blocks.bodyMarkdown}</pre>
        </section>
      )}

      {/* 적용 대상 Master 목록 */}
      <section>
        <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> 적용 대상 기본상품 ({d.appliedMasterTotal.toLocaleString()})
          {d.appliedMasterSampleLimited && <span className="text-gray-400 font-normal">· 상위 {d.appliedMasters.length}건 표시</span>}
        </h4>
        {d.appliedMasters.length === 0 ? (
          <p className="text-xs text-gray-400">이 그룹에 매칭되는 기본상품이 없습니다. (성분·함량·제형 파싱 기준)</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded max-h-72 overflow-auto">
            {d.appliedMasters.map((m) => (
              <li key={m.masterId} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <div className="min-w-0">
                  <div className="text-gray-800 truncate">{m.name}</div>
                  <div className="text-gray-400 font-mono">{m.barcode || '—'}</div>
                </div>
                <div className="shrink-0 ml-2">
                  {m.hasCanonical ? <span className="inline-block px-1.5 py-0.5 rounded bg-green-100 text-green-700">공식</span>
                    : m.hasNeedsReview ? <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">검토</span>
                    : <span className="text-gray-300">—</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-gray-400">읽기 전용입니다. 승인/반려/편집은 다음 단계에서 제공됩니다.</p>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-gray-400">{label}</span>
      <span className={`text-gray-700 ${mono ? 'font-mono break-all' : ''}`}>{value}</span>
    </div>
  );
}

function Block({ title, body, tone }: { title: string; body: string | null; tone?: 'warn' }) {
  if (!body) return null;
  return (
    <section>
      <h4 className="text-xs font-semibold text-gray-500 mb-1">{title}</h4>
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${tone === 'warn' ? 'text-red-700 bg-red-50 border border-red-100 rounded p-2' : 'text-gray-700'}`}>{body}</p>
    </section>
  );
}
