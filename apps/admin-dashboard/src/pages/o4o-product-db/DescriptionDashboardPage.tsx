/**
 * DescriptionDashboardPage — 설명서 운영 Dashboard (read-only)
 *
 * WO-O4O-ADMIN-DESCRIPTION-DASHBOARD-V1
 *
 * "상품관리 › 설명서 운영" 첫 화면. 운영자가 Review 로 들어가기 전에
 * 얼마나 작성/검토/canonical 되었는지, 어떤 그룹이 미완성인지, source/우선순위 분포를
 * 한눈에 파악한다. 이번 화면은 **조회 전용**(mutation 0). Chart 라이브러리 미사용 —
 * Card + BaseTable + admin 상품관리 스타일만 사용한다.
 *
 * OTC 외 카테고리(의료기기·의약외품·건강기능식품)는 동일 구조로 확장 가능하며,
 * 현재는 데이터가 없어 "준비중"으로 표기한다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle2, ClipboardCheck, XCircle, ScrollText, HelpCircle, Database, Layers,
} from 'lucide-react';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import {
  getDescriptionDashboard,
  type DescriptionDashboard,
  type DescriptionDashboardGroupRow,
  type DescriptionDashboardRecent,
} from '@/api/o4o-product-db.api';

// ─── 상태/소스 라벨 (운영 용어) ────────────────────────────────────────────────
const SPD_STATUS_LABEL: Record<string, string> = {
  canonical: '공식(canonical)',
  needs_review: '검토 필요',
  candidate: '후보',
  hidden: '숨김',
  deprecated: '폐기',
};
const DRAFT_STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  needs_review: '검토 필요',
  approved: '승인',
  rejected: '반려',
  hidden: '숨김',
  deprecated: '폐기',
};
const SOURCE_TYPE_LABEL: Record<string, string> = {
  mfds_easy_drug: 'e약은요(공식 원문)',
  mfds_drug_otc_nutrition_combo: 'OTC·영양제 복합',
  otc_curated_v1: 'OTC 큐레이션 v1',
  supplier: '공급자',
  operator: '운영자',
  ai: 'AI',
  store_contribution: '매장 기여',
  drug_extension: '의약품 확장',
  migration: '마이그레이션',
  manual: '수동',
};
const DISPLAY_LABEL: Record<string, string> = {
  canonical: '공식 설명 적용',
  needs_review: '검토 필요',
  draft: '초안만 존재',
  none: '설명 없음',
};

function stateLabel(kind: 'spd' | 'draft', state: string): string {
  return (kind === 'spd' ? SPD_STATUS_LABEL : DRAFT_STATUS_LABEL)[state] ?? state;
}
function sourceLabel(kind: 'spd' | 'draft', source: string | null): string {
  if (!source) return '—';
  return kind === 'spd' ? (SOURCE_TYPE_LABEL[source] ?? source) : source;
}
function fmtDate(v: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
}

export default function DescriptionDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DescriptionDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDescriptionDashboard());
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '설명서 운영 대시보드를 불러오지 못했습니다');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={load} className="text-sm underline">재시도</button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />)}
        </div>
        <div className="h-64 rounded-lg bg-gray-100 animate-pulse" />
      </div>
    );
  }

  const { summary, categorySummary, workflow, groupSummary, reviewerSummary, sourceSummary, displaySummary, recentActivities } = data;

  const summaryCards = [
    { key: 'canonical', label: '공식(canonical)', tip: '서비스에 적용되는 공식 설명 수입니다.', value: summary.canonical, icon: <CheckCircle2 className="w-6 h-6 text-green-600" />, to: '/admin/o4o-product-db/review?status=canonical' },
    { key: 'needs_review', label: '검토 필요', tip: '공식으로 확정하기 전 검토가 필요한 설명입니다. 그룹 단위 검토 Queue 로 이동합니다.', value: summary.needsReview, icon: <FileText className="w-6 h-6 text-amber-600" />, to: '/admin/o4o-product-db/description-review-queue?status=needs_review' },
    { key: 'draft', label: '초안', tip: '아직 검토 대기 전 초안 상태인 설명 수입니다.', value: summary.draft, icon: <ScrollText className="w-6 h-6 text-blue-600" />, to: '/admin/o4o-product-db/drug-description-drafts' },
    { key: 'rejected', label: '반려', tip: '검토 결과 반려된 설명 초안 수입니다.', value: summary.rejected, icon: <XCircle className="w-6 h-6 text-red-500" />, to: '/admin/o4o-product-db/drug-description-drafts' },
  ];

  const groupColumns: O4OColumn<DescriptionDashboardGroupRow>[] = [
    { key: 'ingredient', header: '그룹(성분)', maxWidth: 240, render: (_, r) => (
      <span className="block max-w-[15rem] truncate font-medium text-gray-900">{r.ingredient || r.groupKey}</span>
    ) },
    { key: 'representative', header: '대표설명', align: 'center', render: (_, r) => (
      r.representativeExists ? <Badge tone="green">있음</Badge> : <span className="text-gray-300">—</span>
    ) },
    { key: 'masterTotal', header: '그룹 상품수', align: 'right', render: (_, r) => (
      <span className="tabular-nums text-gray-700">{r.masterTotal != null ? r.masterTotal.toLocaleString() : '—'}</span>
    ) },
    { key: 'spdMasters', header: '적용 상품수', align: 'right', render: (_, r) => (
      <span className="tabular-nums text-gray-700">{r.spdMasters != null ? r.spdMasters.toLocaleString() : '—'}</span>
    ) },
    { key: 'progress', header: '적용률', align: 'right', render: (_, r) => {
      const pct = r.masterTotal && r.masterTotal > 0 ? Math.round(((r.spdMasters ?? 0) / r.masterTotal) * 100) : null;
      return <span className="tabular-nums text-gray-500">{pct != null ? `${pct}%` : '—'}</span>;
    } },
    { key: 'canonical', header: 'Canonical', align: 'center', render: (_, r) => (
      r.canonical ? <Badge tone="green">YES</Badge> : <Badge tone="gray">NO</Badge>
    ) },
    { key: 'review', header: '검토 상태', align: 'center', render: (_, r) => (
      <div className="flex flex-wrap gap-1 justify-center">
        {r.reviewStatuses.length === 0 ? <span className="text-gray-300">—</span> :
          r.reviewStatuses.map((s) => <Badge key={s} tone={s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'amber'}>{DRAFT_STATUS_LABEL[s] ?? s}</Badge>)}
      </div>
    ) },
    { key: 'updatedAt', header: '최근 수정', align: 'right', render: (_, r) => <span className="text-gray-400 text-xs">{fmtDate(r.updatedAt)}</span> },
  ];

  const recentColumns: O4OColumn<DescriptionDashboardRecent>[] = [
    { key: 'kind', header: '구분', align: 'center', render: (_, r) => (
      <Badge tone={r.kind === 'spd' ? 'blue' : 'gray'}>{r.kind === 'spd' ? '공식/검토' : '초안'}</Badge>
    ) },
    { key: 'title', header: '대상', maxWidth: 300, render: (_, r) => (
      <span className="block max-w-[19rem] truncate text-gray-900">{r.title || '—'}</span>
    ) },
    { key: 'state', header: '상태', align: 'center', render: (_, r) => <span className="text-gray-600 text-xs">{stateLabel(r.kind, r.state)}</span> },
    { key: 'source', header: '출처', maxWidth: 180, render: (_, r) => (
      <span className="block max-w-[11rem] truncate text-gray-500 text-xs">{sourceLabel(r.kind, r.source)}</span>
    ) },
    { key: 'updatedAt', header: '변경일', align: 'right', render: (_, r) => <span className="text-gray-400 text-xs">{fmtDate(r.updatedAt)}</span> },
  ];

  const displayOrder = ['canonical', 'needs_review', 'draft', 'none'];
  const displayTotal = displayOrder.reduce((a, k) => a + (displaySummary[k] ?? 0), 0);

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-admin-blue" /> 설명서 운영 현황
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          설명 작성·검토·공식 적용 현황을 한눈에 봅니다. 이 화면은 조회 전용이며 데이터를 변경하지 않습니다.
          {summary.lastUpdatedAt && <> · 최근 변경 {fmtDate(summary.lastUpdatedAt)}</>}
        </p>
      </div>

      {/* 1. Summary Card */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((c) => (
            <Link key={c.key} to={c.to} className="flex items-center gap-4 border border-gray-200 rounded-lg p-5 bg-white hover:border-admin-blue hover:shadow-sm transition">
              <div className="shrink-0">{c.icon}</div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-gray-900 tabular-nums">{c.value.toLocaleString()}</div>
                <div className="text-sm text-gray-500 flex items-center gap-1"><span className="truncate">{c.label}</span><InfoTip text={c.tip} /></div>
              </div>
            </Link>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          SPD 총 {summary.spdTotal.toLocaleString()} · 초안 총 {summary.draftTotal.toLocaleString()}
          {summary.approved > 0 && <> · 승인 {summary.approved.toLocaleString()}</>}
          {summary.other > 0 && <> · 기타 {summary.other.toLocaleString()}</>}
        </p>
      </section>

      {/* 2. Category Summary */}
      <section>
        <SectionTitle title="설명서 종류" desc="종류별 설명 현황입니다. 현재 OTC 의약품만 운영 중이며, 나머지는 동일 구조로 확장 예정입니다." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorySummary.map((c) => (
            <div key={c.key} className={`border rounded-lg p-4 ${c.active ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">{c.label}</span>
                {c.active
                  ? <Badge tone="green">운영중</Badge>
                  : <Badge tone="gray">준비중</Badge>}
              </div>
              {c.active ? (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Metric label="공식" value={c.canonical} />
                  <Metric label="검토" value={c.needsReview} />
                  <Metric label="초안" value={c.drafts} />
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-400">아직 등록된 설명이 없습니다.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 3. Workflow Summary */}
      <section>
        <SectionTitle title="작성 흐름" desc="초안 → 검토 → 승인 → 공식(canonical) 단계별 개수입니다." />
        <div className="flex flex-wrap items-stretch gap-2">
          {[
            { label: '초안', value: workflow.draft, icon: <ScrollText className="w-4 h-4" /> },
            { label: '검토', value: workflow.review, icon: <FileText className="w-4 h-4" /> },
            { label: '승인', value: workflow.approved, icon: <ClipboardCheck className="w-4 h-4" /> },
            { label: '공식', value: workflow.canonical, icon: <CheckCircle2 className="w-4 h-4" /> },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="flex flex-col items-center justify-center border border-gray-200 rounded-lg px-6 py-3 bg-white min-w-[7rem]">
                <div className="flex items-center gap-1 text-gray-500 text-xs">{s.icon}{s.label}</div>
                <div className="text-xl font-bold text-gray-900 tabular-nums mt-0.5">{s.value.toLocaleString()}</div>
              </div>
              {i < arr.length - 1 && <span className="text-gray-300 text-lg">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* 4. Group Summary (가장 중요) */}
      <section>
        <SectionTitle title="그룹별 진행률" desc="성분·함량·제형 그룹 단위 진행 현황입니다. 적용 상품수는 그룹 내 공식 설명이 적용된 기본상품 수입니다." />
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <BaseTable<DescriptionDashboardGroupRow>
            columns={groupColumns}
            data={groupSummary}
            rowKey={(r) => r.groupKey}
            onRowClick={() => {}}
            emptyMessage="그룹 데이터가 없습니다."
            tableId="o4o-description-dashboard-groups"
            columnVisibility
          />
        </div>
        {groupSummary.length >= 200 && (
          <p className="text-xs text-gray-400 mt-2">최근 수정순 상위 200개 그룹만 표시합니다.</p>
        )}
      </section>

      {/* 5·6·7·8 하단 3분할 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7. Source Summary */}
        <DistList
          title="출처(source)별 분포"
          desc="공식 설명(SPD)의 원천 유형 분포입니다."
          entries={sourceSummary.spdBySourceType.map((e) => ({ key: e.key, label: SOURCE_TYPE_LABEL[e.key] ?? e.key, value: e.count }))}
          extraTitle={sourceSummary.draftBySourceLabel.length ? '초안 source_label' : undefined}
          extra={sourceSummary.draftBySourceLabel.map((e) => ({ key: e.key, label: e.key, value: e.count }))}
        />
        {/* 8. Display Priority Summary */}
        <DistList
          title="설명 표시 우선순위"
          desc="기본상품 기준 최종 노출 상태입니다. 공식 → 검토 필요 → 초안 → 없음 순으로 우선 적용됩니다."
          entries={displayOrder.map((k) => ({ key: k, label: DISPLAY_LABEL[k] ?? k, value: displaySummary[k] ?? 0 }))}
          total={displayTotal}
        />
        {/* 6. Reviewer Summary */}
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <h3 className="text-sm font-semibold text-gray-700">검토자 현황</h3>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">검토자별 승인/검토대기/반려 건수입니다.</p>
          <ul className="space-y-2">
            {reviewerSummary.map((r) => (
              <li key={r.reviewerId ?? 'unattributed'} className="flex items-center justify-between text-xs border-b border-gray-100 pb-2 last:border-0">
                <span className="text-gray-600 truncate max-w-[10rem]" title={r.reviewerLabel}>{r.reviewerLabel}</span>
                <span className="text-gray-500 tabular-nums shrink-0">
                  승인 {r.approved.toLocaleString()} · 검토 {r.pending.toLocaleString()} · 반려 {r.rejected.toLocaleString()}
                </span>
              </li>
            ))}
            {reviewerSummary.length === 0 && <li className="text-xs text-gray-400">검토 기록이 없습니다.</li>}
          </ul>
        </div>
      </section>

      {/* 5. 최근 작업 */}
      <section>
        <SectionTitle title="최근 변경" desc="최근 변경된 설명·초안 20건입니다. (승인/반려/수정/생성 이력 로그가 별도로 없어 최근 변경일 기준으로 표시합니다.)" />
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <BaseTable<DescriptionDashboardRecent>
            columns={recentColumns}
            data={recentActivities}
            rowKey={(r) => `${r.kind}:${r.id}`}
            onRowClick={(r) => { if (r.kind === 'draft') navigate(`/admin/o4o-product-db/drug-description-drafts/${r.id}`); }}
            emptyMessage="최근 변경 내역이 없습니다."
            tableId="o4o-description-dashboard-recent"
          />
        </div>
      </section>

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Database className="w-3.5 h-3.5" />
        모든 수치는 read-only 집계입니다. 이 화면은 설명 데이터를 변경하지 않습니다.
      </p>
    </div>
  );
}

// ─── 보조 컴포넌트 ─────────────────────────────────────────────────────────────
function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-gray-50 py-2">
      <div className="text-lg font-bold text-gray-900 tabular-nums">{value.toLocaleString()}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
}

const BADGE_TONE: Record<string, string> = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-gray-100 text-gray-600',
};
function Badge({ tone, children }: { tone: keyof typeof BADGE_TONE; children: React.ReactNode }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs ${BADGE_TONE[tone]}`}>{children}</span>;
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group align-middle">
      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" aria-label="설명" />
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-30 hidden w-56 -translate-x-1/2 translate-y-1 rounded bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

function DistList({
  title, desc, entries, total, extraTitle, extra,
}: {
  title: string; desc?: string;
  entries: { key: string; label: string; value: number }[];
  total?: number;
  extraTitle?: string;
  extra?: { key: string; label: string; value: number }[];
}) {
  const sum = total ?? entries.reduce((a, e) => a + e.value, 0);
  const max = Math.max(1, ...entries.map((e) => e.value));
  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-white">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {desc && <p className="text-xs text-gray-400 mt-0.5 mb-3">{desc}</p>}
      <ul className="space-y-2.5">
        {entries.map((e) => {
          const pct = sum > 0 ? (e.value / sum) * 100 : 0;
          return (
            <li key={e.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 truncate">{e.label}</span>
                <span className="text-gray-500 tabular-nums ml-2 shrink-0">{e.value.toLocaleString()} <span className="text-gray-400">({pct.toFixed(1)}%)</span></span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-admin-blue/70" style={{ width: `${(e.value / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
        {entries.length === 0 && <li className="text-xs text-gray-400">데이터가 없습니다.</li>}
      </ul>
      {extraTitle && extra && extra.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">{extraTitle}</div>
          <ul className="space-y-1">
            {extra.map((e) => (
              <li key={e.key} className="flex items-center justify-between text-xs">
                <span className="text-gray-500 truncate max-w-[12rem]" title={e.label}>{e.label}</span>
                <span className="text-gray-500 tabular-nums">{e.value.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
