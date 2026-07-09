/**
 * ProductDbOverviewPage — O4O 상품 DB 운영 대시보드 (read-only)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1 (현황)
 * WO-O4O-ADMIN-O4O-PRODUCT-DASHBOARD-OPERATION-UX-V1 — "통계 조회" → "오늘 처리할 작업 중심 운영 화면"
 *
 * 개선:
 *  1) 성능: 운영 섹션(오늘 처리할 작업 + 핵심 지표)은 요약 API 소수만 호출해 즉시 표시하고,
 *     26개 분포 통계는 하단에서 별도로 지연 로딩한다(첫 페인트 차단 제거).
 *  2) 운영 중심 용어: DB 상태값(conflict/unmatched 등) → 관리자가 할 일을 나타내는 한글 용어.
 *  3) 오늘 처리할 작업: 상단 우선 배치 + 기존 목록으로 이동(신규 API 없음).
 *  4) 도움말: 각 지표에 CSS hover Tooltip(? 아이콘). AI 없이 화면 자체로 이해 가능.
 *
 * 모든 수치는 기존 read-only 목록/요약 API 의 total 집계이며, 이 화면은 데이터를 변경하지 않는다(mutation 0).
 */

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Database, ClipboardList, Package, AlertTriangle, HelpCircle,
  ImageOff, PackagePlus, CheckCircle2,
} from 'lucide-react';
import {
  listProductCandidates, listProductMasters,
  getImageQualitySummary,
} from '@/api/o4o-product-db.api';

// ProductCandidatesPage 와 동일한 enum 목록 (SSOT: 후보 필터)
const STATUS_OPTIONS = [
  'pending', 'reviewing', 'matched', 'linked',
  'approved_new_master', 'rejected', 'merged', 'archived',
];
const MATCH_STATUS_OPTIONS = [
  'unmatched', 'exact_identifier_match', 'possible_identifier_match',
  'possible_text_match', 'conflict', 'no_match', 'manually_matched',
];
const SOURCE_TYPE_OPTIONS = [
  'supplier_web', 'pharmacy_web', 'store_web', 'mobile_draft',
  'csv_import', 'xlsx_import', 'operator_import', 'external_api', 'unknown',
];

// ─── 운영 중심 라벨 + 도움말 (DB 상태값 → 관리자가 이해하는 용어) ──────────────
const STATUS_LABEL: Record<string, { label: string; desc: string }> = {
  pending: { label: '접수 대기', desc: '아직 검토를 시작하지 않은 신규 후보입니다.' },
  reviewing: { label: '검토 중', desc: '관리자가 검토를 진행 중인 후보입니다.' },
  matched: { label: '자동 매칭됨', desc: '기존 기본상품과 매칭이 확정된 후보입니다.' },
  linked: { label: '연결 완료', desc: '기본상품에 연결이 완료된 후보입니다.' },
  approved_new_master: { label: '신규 기본상품 승인', desc: '새 기본상품으로 승격이 승인된 후보입니다.' },
  rejected: { label: '반려', desc: '검토 결과 반려된 후보입니다.' },
  merged: { label: '병합됨', desc: '다른 후보/상품에 병합된 후보입니다.' },
  archived: { label: '보관', desc: '처리 후 보관 처리된 후보입니다.' },
};
const MATCH_LABEL: Record<string, { label: string; desc: string }> = {
  unmatched: { label: '미매칭 · 신규 생성 대상', desc: '아직 어떤 기본상품과도 연결되지 않은 후보입니다. 새 기본상품 생성 또는 매칭이 필요합니다.' },
  exact_identifier_match: { label: '식별자 정확 매칭', desc: '바코드 등 식별자가 정확히 일치해 자동 매칭된 후보입니다.' },
  possible_identifier_match: { label: '식별자 유사 · 검토 필요', desc: '식별자가 유사해 매칭 후보로 제안된 상태입니다. 관리자 확인이 필요합니다.' },
  possible_text_match: { label: '이름 유사 · 검토 필요', desc: '상품명이 유사해 매칭 후보로 제안된 상태입니다. 관리자 확인이 필요합니다.' },
  conflict: { label: '충돌 · 확인 필요', desc: '동일 식별자가 둘 이상의 상품과 충돌하는 후보입니다. 어느 상품과 연결할지 결정이 필요합니다.' },
  no_match: { label: '매칭 없음', desc: '매칭 가능한 기본상품이 없어 매칭에서 제외된 후보입니다.' },
  manually_matched: { label: '수동 매칭 완료', desc: '관리자가 직접 매칭을 완료한 후보입니다.' },
};
const SOURCE_LABEL: Record<string, { label: string; desc: string }> = {
  supplier_web: { label: '공급자 웹', desc: '공급자가 웹에서 입력한 후보입니다.' },
  pharmacy_web: { label: '약국 웹', desc: '약국이 웹에서 입력한 후보입니다.' },
  store_web: { label: '매장 웹', desc: '매장이 웹에서 입력한 후보입니다.' },
  mobile_draft: { label: '모바일 초안', desc: '모바일에서 작성된 초안 후보입니다.' },
  csv_import: { label: 'CSV 가져오기', desc: 'CSV 파일로 가져온 후보입니다.' },
  xlsx_import: { label: '엑셀 가져오기', desc: '엑셀 파일로 가져온 후보입니다.' },
  operator_import: { label: '운영자 가져오기', desc: '운영자가 직접 가져온 후보입니다.' },
  external_api: { label: '공공데이터/외부 API', desc: '식약처 등 공공데이터·외부 API 로 수집한 후보입니다.' },
  unknown: { label: '출처 미상', desc: '출처가 확인되지 않은 후보입니다.' },
};

// ─── 데이터 타입 ──────────────────────────────────────────────────────────────
interface OpsData {
  candidateTotal: number;
  masterTotal: number;
  conflict: number;
  unmatched: number;
  missingImage: number;  // 대표 이미지 없음
}
type CountMap = Record<string, number>;
interface DistData {
  byStatus: CountMap;
  byMatchStatus: CountMap;
  bySourceType: CountMap;
}

/** 후보 목록 total 만 뽑는다 (limit=1). */
async function candidateCount(params: Parameters<typeof listProductCandidates>[0]): Promise<number> {
  const res = await listProductCandidates({ ...params, page: 1, limit: 1 });
  return res.total;
}

export default function ProductDbOverviewPage() {
  // 운영 섹션(빠른 첫 페인트) — 요약 API 6회
  const [ops, setOps] = useState<OpsData | null>(null);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);

  // 세부 통계(지연 로딩) — 26회, 첫 페인트를 막지 않는다
  const [dist, setDist] = useState<DistData | null>(null);
  const [distLoading, setDistLoading] = useState(false);
  const [distError, setDistError] = useState<string | null>(null);

  const loadOps = useCallback(async () => {
    setOpsLoading(true);
    setOpsError(null);
    try {
      const [candidateTotal, masterRes, conflict, unmatched, imgSummary] = await Promise.all([
        candidateCount({}),
        listProductMasters({ page: 1, limit: 1 }),
        candidateCount({ matchStatus: 'conflict' }),
        candidateCount({ matchStatus: 'unmatched' }),
        getImageQualitySummary(),
      ]);
      setOps({
        candidateTotal,
        masterTotal: masterRes.meta.total,
        conflict,
        unmatched,
        missingImage: imgSummary.missing_image ?? 0,
      });
    } catch (e: any) {
      setOpsError(e?.response?.data?.error || e?.message || '현황을 불러오지 못했습니다');
      setOps(null);
    } finally {
      setOpsLoading(false);
    }
  }, []);

  const loadDist = useCallback(async () => {
    setDistLoading(true);
    setDistError(null);
    try {
      const [statusCounts, matchCounts, sourceCounts] = await Promise.all([
        Promise.all(STATUS_OPTIONS.map((s) => candidateCount({ status: s }))),
        Promise.all(MATCH_STATUS_OPTIONS.map((s) => candidateCount({ matchStatus: s }))),
        Promise.all(SOURCE_TYPE_OPTIONS.map((s) => candidateCount({ sourceType: s }))),
      ]);
      const toMap = (keys: string[], vals: number[]): CountMap =>
        keys.reduce((acc, k, i) => ({ ...acc, [k]: vals[i] }), {} as CountMap);
      setDist({
        byStatus: toMap(STATUS_OPTIONS, statusCounts),
        byMatchStatus: toMap(MATCH_STATUS_OPTIONS, matchCounts),
        bySourceType: toMap(SOURCE_TYPE_OPTIONS, sourceCounts),
      });
    } catch (e: any) {
      setDistError(e?.response?.data?.error || e?.message || '세부 통계를 불러오지 못했습니다');
      setDist(null);
    } finally {
      setDistLoading(false);
    }
  }, []);

  useEffect(() => { loadOps(); }, [loadOps]);
  useEffect(() => { loadDist(); }, [loadDist]);

  if (opsError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 flex items-center justify-between">
        <span>{opsError}</span>
        <button onClick={loadOps} className="text-sm underline">재시도</button>
      </div>
    );
  }

  // 오늘 처리할 작업 (우선순위 순) — 이미 존재하는 목록으로만 이동
  const tasks = ops ? [
    {
      key: 'conflict', icon: <AlertTriangle className="w-5 h-5" />, tone: 'red' as const,
      label: '충돌 확인', count: ops.conflict,
      desc: '동일 식별자가 여러 상품과 충돌하는 후보입니다. 어느 상품과 연결할지 결정하세요.',
      to: '/admin/o4o-product-db/candidates?matchStatus=conflict',
    },
    {
      key: 'missing_image', icon: <ImageOff className="w-5 h-5" />, tone: 'gray' as const,
      label: '이미지 없는 상품', count: ops.missingImage,
      desc: '대표 이미지가 없어 보강이 필요한 기본상품입니다.',
      to: '/admin/o4o-product-db/image-quality',
    },
    {
      key: 'new_master', icon: <PackagePlus className="w-5 h-5" />, tone: 'indigo' as const,
      label: '신규 기본상품 생성 대상', count: ops.unmatched,
      desc: '아직 매칭되지 않아 새 기본상품 생성이 필요한 후보입니다.',
      to: '/admin/o4o-product-db/candidates?matchStatus=unmatched',
    },
  ] : [];

  return (
    <div className="space-y-8">
      {/* ── 1. 오늘 처리할 작업 (가장 위) ─────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-1">오늘 처리할 작업</h2>
        <p className="text-xs text-gray-500 mb-3">관리자가 확인·처리해야 할 항목입니다. 카드를 누르면 해당 목록으로 이동합니다.</p>
        {opsLoading || !ops ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((t) => <TaskCard key={t.key} {...t} />)}
          </div>
        )}
      </section>

      {/* ── 2. 핵심 운영 지표 ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">핵심 운영 지표</h2>
        {opsLoading || !ops ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCard
              icon={<Package className="w-6 h-6 text-admin-blue" />}
              label="기본 상품 (ProductMaster)"
              tip="검증된 대표 상품 데이터입니다. 매장·주문·설명이 이 기본상품을 기준으로 연결됩니다."
              value={ops.masterTotal}
              to="/admin/o4o-product-db/masters"
            />
            <KpiCard
              icon={<ClipboardList className="w-6 h-6 text-admin-blue" />}
              label="공공데이터 후보 (ProductCandidate)"
              tip="공공데이터·가져오기·입력으로 수집된 후보입니다. 검토를 거쳐 기본상품으로 연결·승격됩니다."
              value={ops.candidateTotal}
              to="/admin/o4o-product-db/candidates"
            />
          </div>
        )}
      </section>

      {/* ── 3. 세부 통계 (지연 로딩) ─────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">세부 통계</h2>
        {distError ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded p-3 text-sm flex items-center justify-between">
            <span>{distError}</span>
            <button onClick={loadDist} className="underline">재시도</button>
          </div>
        ) : distLoading || !dist ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <div key={i} className="h-64 rounded-lg bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DistributionCard
              title="후보 상태별 분포"
              total={ops?.candidateTotal ?? 0}
              entries={STATUS_OPTIONS.map((k) => ({ key: k, value: dist.byStatus[k] ?? 0 }))}
              labelMap={STATUS_LABEL}
              linkFor={(k) => `/admin/o4o-product-db/candidates?status=${encodeURIComponent(k)}`}
            />
            <DistributionCard
              title="매칭 상태별 분포"
              total={ops?.candidateTotal ?? 0}
              entries={MATCH_STATUS_OPTIONS.map((k) => ({ key: k, value: dist.byMatchStatus[k] ?? 0 }))}
              labelMap={MATCH_LABEL}
              linkFor={(k) => `/admin/o4o-product-db/candidates?matchStatus=${encodeURIComponent(k)}`}
            />
            <DistributionCard
              title="출처(source)별 분포"
              total={ops?.candidateTotal ?? 0}
              entries={SOURCE_TYPE_OPTIONS.map((k) => ({ key: k, value: dist.bySourceType[k] ?? 0 }))}
              labelMap={SOURCE_LABEL}
              linkFor={(k) => `/admin/o4o-product-db/candidates?sourceType=${encodeURIComponent(k)}`}
            />
          </div>
        )}
      </section>

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Database className="w-3.5 h-3.5" />
        모든 수치는 read-only 목록·요약 API 의 total 집계입니다. 이 화면은 데이터를 변경하지 않습니다.
      </p>
    </div>
  );
}

// ─── Tooltip (의존성 없는 CSS hover) ───────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group align-middle">
      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" aria-label="설명" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 hidden w-56 -translate-x-1/2 translate-y-1 rounded bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg group-hover:block"
      >
        {text}
      </span>
    </span>
  );
}

const TASK_TONE: Record<string, string> = {
  red: 'border-red-200 bg-red-50 text-red-600',
  amber: 'border-amber-200 bg-amber-50 text-amber-600',
  blue: 'border-blue-200 bg-blue-50 text-blue-600',
  gray: 'border-gray-200 bg-gray-50 text-gray-500',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-600',
};

function TaskCard({
  icon, label, count, desc, tone, to,
}: { icon: React.ReactNode; label: string; count: number; desc: string; tone: keyof typeof TASK_TONE; to: string }) {
  const done = count === 0;
  return (
    <Link
      to={to}
      className={`flex flex-col gap-2 border rounded-lg p-4 transition hover:shadow-sm ${done ? 'border-gray-200 bg-white' : TASK_TONE[tone]}`}
    >
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 ${done ? 'text-gray-400' : ''}`}>
          {done ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : icon}
          <span className="text-sm font-semibold text-gray-800">{label}</span>
        </div>
        <span className="text-2xl font-bold text-gray-900 tabular-nums">{count.toLocaleString()}</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{done ? '처리할 항목이 없습니다.' : desc}</p>
    </Link>
  );
}

function KpiCard({
  icon, label, value, to, tip, suffix, sub,
}: {
  icon: React.ReactNode; label: string; value: number; to: string;
  tip?: string; suffix?: string; sub?: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 border border-gray-200 rounded-lg p-5 bg-white hover:border-admin-blue hover:shadow-sm transition"
    >
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-gray-900 tabular-nums">
          {value.toLocaleString()}{suffix}
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-1">
          <span className="truncate">{label}</span>
          {tip && <InfoTip text={tip} />}
        </div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </Link>
  );
}

function DistributionCard({
  title, total, entries, linkFor, labelMap,
}: {
  title: string;
  total: number;
  entries: { key: string; value: number }[];
  linkFor: (key: string) => string;
  labelMap: Record<string, { label: string; desc: string }>;
}) {
  const max = Math.max(1, ...entries.map((e) => e.value));
  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-white">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <ul className="space-y-2.5">
        {entries.map((e) => {
          const pct = total > 0 ? ((e.value / total) * 100) : 0;
          const meta = labelMap[e.key];
          return (
            <li key={e.key}>
              <Link to={linkFor(e.key)} className="block group">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 group-hover:text-admin-blue truncate flex items-center gap-1">
                    {meta?.label ?? e.key}
                    {meta?.desc && <InfoTip text={meta.desc} />}
                  </span>
                  <span className="text-gray-500 tabular-nums ml-2 shrink-0">
                    {e.value.toLocaleString()}
                    <span className="text-gray-400"> ({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-admin-blue/70 group-hover:bg-admin-blue"
                    style={{ width: `${(e.value / max) * 100}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
