/**
 * ProductDbOverviewPage — O4O 상품 DB 현황 (read-only summary)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1 (현황 확장)
 *
 * 상품 DB 현재 상태 요약 대시보드. 어떤 mutation 도 호출하지 않는다.
 * 집계는 전부 기존 read-only 목록 API 의 total 만 사용한다:
 *  - ProductCandidate 총량 / 후보 상태별 / 매칭 상태별 / source_type별
 *    → GET /operator/product-candidates (limit=1, total 만 사용)
 *  - ProductMaster 총량
 *    → GET /neture/products/library/search (limit=1, meta.total 만 사용)
 *  - 정비 큐(충돌 / 후보 매칭 / 미매칭) 는 매칭 상태 집계를 재사용한다.
 */

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Database, ClipboardList, Package, AlertTriangle, Link2, HelpCircle } from 'lucide-react';
import { listProductCandidates, listProductMasters } from '@/api/o4o-product-db.api';

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

type CountMap = Record<string, number>;

interface OverviewData {
  candidateTotal: number;
  masterTotal: number;
  byStatus: CountMap;
  byMatchStatus: CountMap;
  bySourceType: CountMap;
}

/** 후보 목록 total 만 뽑는다 (limit=1). 실패 시 0. */
async function candidateCount(params: Parameters<typeof listProductCandidates>[0]): Promise<number> {
  const res = await listProductCandidates({ ...params, page: 1, limit: 1 });
  return res.total;
}

export default function ProductDbOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        candidateTotal,
        masterRes,
        statusCounts,
        matchCounts,
        sourceCounts,
      ] = await Promise.all([
        candidateCount({}),
        listProductMasters({ page: 1, limit: 1 }),
        Promise.all(STATUS_OPTIONS.map((s) => candidateCount({ status: s }))),
        Promise.all(MATCH_STATUS_OPTIONS.map((s) => candidateCount({ matchStatus: s }))),
        Promise.all(SOURCE_TYPE_OPTIONS.map((s) => candidateCount({ sourceType: s }))),
      ]);

      const toMap = (keys: string[], vals: number[]): CountMap =>
        keys.reduce((acc, k, i) => ({ ...acc, [k]: vals[i] }), {} as CountMap);

      setData({
        candidateTotal,
        masterTotal: masterRes.meta.total,
        byStatus: toMap(STATUS_OPTIONS, statusCounts),
        byMatchStatus: toMap(MATCH_STATUS_OPTIONS, matchCounts),
        bySourceType: toMap(SOURCE_TYPE_OPTIONS, sourceCounts),
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '현황을 불러오지 못했습니다');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="py-16 text-center text-gray-400">현황을 불러오는 중…</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={load} className="text-sm underline">재시도</button>
      </div>
    );
  }

  if (!data) return null;

  // 정비 큐 (매칭 상태 집계 재사용)
  const conflict = data.byMatchStatus['conflict'] ?? 0;
  const possibleMatch =
    (data.byMatchStatus['possible_identifier_match'] ?? 0) +
    (data.byMatchStatus['possible_text_match'] ?? 0);
  const unmatched = data.byMatchStatus['unmatched'] ?? 0;

  return (
    <div className="space-y-8">
      {/* 총량 KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard
          icon={<ClipboardList className="w-6 h-6 text-admin-blue" />}
          label="공공데이터 후보 (ProductCandidate)"
          value={data.candidateTotal}
          to="/admin/o4o-product-db/candidates"
        />
        <KpiCard
          icon={<Package className="w-6 h-6 text-admin-blue" />}
          label="기본 상품 (ProductMaster)"
          value={data.masterTotal}
          to="/admin/o4o-product-db/masters"
        />
      </div>

      {/* 정비 큐 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">정비 큐</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QueueCard
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            label="충돌 (conflict)"
            value={conflict}
            tone="red"
            to="/admin/o4o-product-db/candidates?matchStatus=conflict"
          />
          <QueueCard
            icon={<Link2 className="w-5 h-5 text-amber-500" />}
            label="후보 매칭 (possible)"
            value={possibleMatch}
            tone="amber"
            to="/admin/o4o-product-db/candidates?matchStatus=possible_identifier_match"
          />
          <QueueCard
            icon={<HelpCircle className="w-5 h-5 text-gray-500" />}
            label="미매칭 (unmatched)"
            value={unmatched}
            tone="gray"
            to="/admin/o4o-product-db/candidates?matchStatus=unmatched"
          />
        </div>
      </section>

      {/* 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DistributionCard
          title="후보 상태별 분포"
          total={data.candidateTotal}
          entries={STATUS_OPTIONS.map((k) => ({ key: k, value: data.byStatus[k] ?? 0 }))}
          linkFor={(k) => `/admin/o4o-product-db/candidates?status=${encodeURIComponent(k)}`}
        />
        <DistributionCard
          title="매칭 상태별 분포"
          total={data.candidateTotal}
          entries={MATCH_STATUS_OPTIONS.map((k) => ({ key: k, value: data.byMatchStatus[k] ?? 0 }))}
          linkFor={(k) => `/admin/o4o-product-db/candidates?matchStatus=${encodeURIComponent(k)}`}
        />
        <DistributionCard
          title="source_type별 분포"
          total={data.candidateTotal}
          entries={SOURCE_TYPE_OPTIONS.map((k) => ({ key: k, value: data.bySourceType[k] ?? 0 }))}
          linkFor={(k) => `/admin/o4o-product-db/candidates?sourceType=${encodeURIComponent(k)}`}
        />
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Database className="w-3.5 h-3.5" />
        모든 수치는 read-only 목록 API 의 total 집계입니다. 이 화면은 데이터를 변경하지 않습니다.
      </p>
    </div>
  );
}

function KpiCard({ icon, label, value, to }: { icon: React.ReactNode; label: string; value: number; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 border border-gray-200 rounded-lg p-5 bg-white hover:border-admin-blue hover:shadow-sm transition"
    >
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </Link>
  );
}

function QueueCard({
  icon, label, value, tone, to,
}: { icon: React.ReactNode; label: string; value: number; tone: 'red' | 'amber' | 'gray'; to: string }) {
  const toneClass = {
    red: 'border-red-200 bg-red-50',
    amber: 'border-amber-200 bg-amber-50',
    gray: 'border-gray-200 bg-gray-50',
  }[tone];
  return (
    <Link to={to} className={`flex items-center justify-between border rounded-lg p-4 hover:shadow-sm transition ${toneClass}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className="text-xl font-bold text-gray-900">{value.toLocaleString()}</span>
    </Link>
  );
}

function DistributionCard({
  title, total, entries, linkFor,
}: {
  title: string;
  total: number;
  entries: { key: string; value: number }[];
  linkFor: (key: string) => string;
}) {
  const max = Math.max(1, ...entries.map((e) => e.value));
  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-white">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <ul className="space-y-2.5">
        {entries.map((e) => {
          const pct = total > 0 ? ((e.value / total) * 100) : 0;
          return (
            <li key={e.key}>
              <Link to={linkFor(e.key)} className="block group">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 group-hover:text-admin-blue truncate">{e.key}</span>
                  <span className="text-gray-500 tabular-nums ml-2">
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
