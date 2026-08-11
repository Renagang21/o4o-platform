/**
 * SupplierStoreMaterialsStatusPage — 매장 제공 자료 / 검수·게시 현황
 *
 * WO-O4O-NETURE-SUPPLIER-DASHBOARD-STORE-MATERIALS-IA-V1
 * 근거: IR-O4O-KPA-STORE-QR-TABLET-CONTENT-FLOW-AUDIT-V1 §9-4 (검수 상태가 화면마다 흩어져 있음)
 *
 * 성격: **읽기 전용 집계 화면**. 기존 3개 목록 API 를 클라이언트에서 합칠 뿐,
 *       신규 백엔드 API·테이블·migration 이 없다. 상태 변경 액션도 두지 않는다
 *       (수정·게시·철회는 각 자료 화면이 canonical 진입점 — 여기서는 이동만).
 *
 * 집계 원본 3종:
 *   매장용 상품 설명서  supplierStoreDescriptionApi.listMine()  (SPD STORE, 검수 큐 경유)
 *   태블릿 화면 자료    fetchSupplierScreenSets()               (origin='supplier', hub_target_store_type 보유)
 *   디지털 사이니지      fetchSupplierSignageList()              (signage_media, source='supplier')
 *
 * 게시 대상(약국/비약국) 표기 규칙 — CHECK-O4O-SUPPLIER-SIGNAGE-HUB-TARGET-AND-MEDICATION-GUARD-ALIGN-V1 §0-A:
 *   태블릿 화면 자료만 hub_target_store_type 을 가진다(상품 블록 기반 의약품 가드 대상).
 *   **사이니지·설명서에는 매장 유형 대상 개념이 없다** — "대상" 칸에 약국/비약국을 표기하지 않는다.
 *   Signage 를 의약품/비의약품으로 판정하지 않는 것이 확정 정책이므로, 이 화면도 그 축을 만들지 않는다.
 *
 * load-error 계약: 3개 소스를 Promise.allSettled 로 **영역별 격리**한다.
 *   한 소스가 실패해도 나머지는 표시하고, 실패한 소스는 "0건" 으로 위장하지 않고 배너로 드러낸다
 *   (기존 공급자 표면의 A 패턴 — throw + 4상태 + 재시도).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  supplierApi,
  supplierStoreDescriptionApi,
  type SupplierProduct,
  type SupplierStoreDescriptionDraft,
} from '../../lib/api';
import { fetchSupplierScreenSets, type SupplierScreenSet } from '../../lib/api/supplierScreenSets';
import { fetchSupplierSignageList, type SupplierSignageMedia } from '../../lib/api/supplierSignage';
import StoreMaterialUsageNote from '../../components/supplier/StoreMaterialUsageNote';

/* ------------------------------------------------------------------ */
/*  자료 유형 · 상태 표기                                                */
/* ------------------------------------------------------------------ */

type MaterialKind = 'description' | 'screen-set' | 'signage';

const KIND_META: Record<MaterialKind, { label: string; path: string; cls: string }> = {
  description: { label: '매장용 상품 설명서', path: '/supplier/store-descriptions', cls: 'bg-sky-50 text-sky-700' },
  'screen-set': { label: '태블릿 화면 자료', path: '/supplier/tablet-screen-sets', cls: 'bg-violet-50 text-violet-700' },
  signage: { label: '디지털 사이니지', path: '/supplier/signage', cls: 'bg-teal-50 text-teal-700' },
};

/**
 * 상태 라벨 — 자료 유형별로 상태 어휘가 다르므로 각 원본의 값을 그대로 매핑한다(임의 통합 금지).
 *   SPD        : draft / needs_review / revision_requested / canonical / hidden / candidate / deprecated
 *   ScreenSet  : draft / active / archived
 *   Signage    : draft / active / archived
 * `tone` 은 아래 요약 카드 집계에 쓰는 의미 축이다.
 */
type Tone = 'working' | 'waiting' | 'action' | 'live' | 'closed';

const TONE_CLS: Record<Tone, string> = {
  working: 'bg-slate-100 text-slate-600',
  waiting: 'bg-amber-50 text-amber-700',
  action: 'bg-orange-50 text-orange-700',
  live: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-slate-100 text-slate-400',
};

const DESCRIPTION_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: '임시저장', tone: 'working' },
  needs_review: { label: '검수 대기', tone: 'waiting' },
  revision_requested: { label: '수정 요청', tone: 'action' },
  canonical: { label: '매장 노출', tone: 'live' },
  hidden: { label: '숨김', tone: 'closed' },
  candidate: { label: '후보', tone: 'working' },
  deprecated: { label: '만료', tone: 'closed' },
};

const PUBLISH_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: '작성 중', tone: 'working' },
  active: { label: '게시 중', tone: 'live' },
  archived: { label: '보관', tone: 'closed' },
  operator_template: { label: '운영자 원본', tone: 'closed' },
};

const HUB_TARGET_LABEL: Record<string, string> = {
  pharmacy: '약국 매장',
  non_pharmacy: '비약국 매장',
  all: '전체 매장',
};

/** 집계 표의 단일 행. 3개 원본을 이 형태로 정규화한다. */
interface StatusRow {
  key: string;
  kind: MaterialKind;
  title: string;
  statusLabel: string;
  tone: Tone;
  /** 게시 대상(태블릿 화면 자료만 보유). null = 대상 개념 없음 — 약국/비약국을 임의로 채우지 않는다. */
  target: string | null;
  /** 운영자 수정 요청 사유 등 조치 안내(있을 때만). */
  note: string | null;
  updatedAt: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

/** 소스별 로드 상태 — 실패를 "0건"으로 위장하지 않기 위해 개별 추적한다. */
interface SourceState<T> {
  rows: T[];
  failed: boolean;
}

const EMPTY = { rows: [], failed: false };

export default function SupplierStoreMaterialsStatusPage() {
  const [loading, setLoading] = useState(true);
  const [descriptions, setDescriptions] = useState<SourceState<SupplierStoreDescriptionDraft>>(EMPTY);
  const [screenSets, setScreenSets] = useState<SourceState<SupplierScreenSet>>(EMPTY);
  const [signage, setSignage] = useState<SourceState<SupplierSignageMedia>>(EMPTY);
  /** 설명서 행의 masterId → 상품명 해석용. 실패해도 화면은 masterId 축약 표기로 동작한다. */
  const [products, setProducts] = useState<SupplierProduct[]>([]);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      supplierStoreDescriptionApi.listMine(),
      fetchSupplierScreenSets(),
      fetchSupplierSignageList(),
      supplierApi.getProducts(),
    ])
      .then(([desc, sets, media, prods]) => {
        setDescriptions(
          desc.status === 'fulfilled' ? { rows: desc.value ?? [], failed: false } : { rows: [], failed: true },
        );
        setScreenSets(
          sets.status === 'fulfilled' ? { rows: sets.value ?? [], failed: false } : { rows: [], failed: true },
        );
        setSignage(
          media.status === 'fulfilled' ? { rows: media.value ?? [], failed: false } : { rows: [], failed: true },
        );
        // 상품명은 보조 정보라 실패해도 오류로 다루지 않는다(제목이 masterId 축약으로 떨어질 뿐).
        setProducts(prods.status === 'fulfilled' ? prods.value ?? [] : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const productNameByMaster = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) {
      if (p.masterId) m.set(p.masterId, p.name || p.masterName || '');
    }
    return m;
  }, [products]);

  const rows = useMemo<StatusRow[]>(() => {
    const out: StatusRow[] = [];

    for (const d of descriptions.rows) {
      const meta = DESCRIPTION_STATUS[d.status] ?? { label: d.status, tone: 'working' as Tone };
      const name = productNameByMaster.get(d.masterId);
      const lang = (d.language || 'ko').toUpperCase();
      out.push({
        key: `desc:${d.id}`,
        kind: 'description',
        title: `${name || `상품 ${d.masterId.slice(0, 8)}`} · ${lang}`,
        statusLabel: meta.label,
        tone: meta.tone,
        target: null, // 설명서에는 매장 유형 대상 개념이 없다.
        note:
          d.status === 'revision_requested'
            ? d.reviewNote?.trim()
              ? `수정 요청: ${d.reviewNote.trim()}`
              : '운영자가 수정을 요청했습니다.'
            : null,
        updatedAt: d.updatedAt,
      });
    }

    for (const s of screenSets.rows) {
      const meta = PUBLISH_STATUS[s.status] ?? { label: s.status, tone: 'working' as Tone };
      out.push({
        key: `set:${s.id}`,
        kind: 'screen-set',
        title: s.name,
        statusLabel: meta.label,
        tone: meta.tone,
        // 게시(active) 상태에서만 대상이 의미를 갖는다. draft 는 아직 미지정일 수 있다.
        target: s.hubTargetStoreType ? HUB_TARGET_LABEL[s.hubTargetStoreType] ?? s.hubTargetStoreType : null,
        note: null,
        updatedAt: s.updatedAt,
      });
    }

    for (const m of signage.rows) {
      const meta = PUBLISH_STATUS[m.status] ?? { label: m.status, tone: 'working' as Tone };
      out.push({
        key: `sig:${m.id}`,
        kind: 'signage',
        title: m.name,
        statusLabel: meta.label,
        tone: meta.tone,
        target: null, // 사이니지는 매장 유형 대상 축이 없다(확정 정책).
        note: null,
        updatedAt: m.updatedAt,
      });
    }

    return out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  }, [descriptions.rows, screenSets.rows, signage.rows, productNameByMaster]);

  const summary = useMemo(() => {
    const count = (tone: Tone) => rows.filter((r) => r.tone === tone).length;
    return {
      action: count('action'),
      waiting: count('waiting'),
      live: count('live'),
      working: count('working'),
    };
  }, [rows]);

  const failedSources = [
    descriptions.failed ? '매장용 상품 설명서' : null,
    screenSets.failed ? '태블릿 화면 자료' : null,
    signage.failed ? '디지털 사이니지' : null,
  ].filter(Boolean) as string[];

  const allFailed = failedSources.length === 3;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">검수·게시 현황</h1>
          <p className="mt-1 text-sm text-slate-500">
            매장에 제공하는 자료의 검수·게시 상태를 한곳에서 확인합니다. 수정과 게시는 각 자료 화면에서
            진행합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          새로고침
        </button>
      </div>

      <StoreMaterialUsageNote
        className="mb-4"
        channels="QR · 태블릿 · 매장 자료함 · 매장 사이니지 화면"
      />

      {/* 일부 소스 실패 — 남은 소스는 그대로 보여주되 무엇이 빠졌는지 명시한다. */}
      {failedSources.length > 0 && !allFailed && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <span>{failedSources.join(' · ')} 목록을 불러오지 못했습니다. 아래 현황에서 빠져 있습니다.</span>
          <button
            type="button"
            onClick={reload}
            className="shrink-0 rounded-md bg-amber-100 px-3 py-1 font-medium text-amber-800 hover:bg-amber-200"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 요약 — 조치 필요 우선 */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: '수정 요청', value: summary.action, cls: 'text-orange-700' },
          { label: '검수 대기', value: summary.waiting, cls: 'text-amber-700' },
          { label: '매장 노출·게시 중', value: summary.live, cls: 'text-emerald-700' },
          // WO-O4O-NETURE-SUPPLIER-MATERIALS-STATUS-AND-REALDATA-CLOSEOUT-BATCH-V1:
          //   'live' 는 이미 '매장 노출·게시 중' 으로 두 어휘를 병기하는데 'working' 만 '작성 중' 이라
          //   설명서 행의 '임시저장' 배지와 어긋났다(같은 집계에 들어가는데 라벨이 다름). 동일 패턴으로 병기한다.
          { label: '작성 중·임시저장', value: summary.working, cls: 'text-slate-600' },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className={`mt-1 text-2xl font-semibold ${c.cls}`}>{loading ? '–' : c.value}</div>
          </div>
        ))}
      </div>

      {/* 현황 목록 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">불러오는 중…</div>
        ) : allFailed ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-500">현황을 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={reload}
              className="mt-3 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              다시 시도
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            아직 매장에 제공한 자료가 없습니다. 왼쪽 메뉴의 자료 화면에서 시작하세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">자료 유형</th>
                  <th className="px-4 py-2 font-medium">제목</th>
                  <th className="px-4 py-2 font-medium">상태</th>
                  <th className="px-4 py-2 font-medium">게시 대상</th>
                  <th className="px-4 py-2 font-medium">최종 수정</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const kind = KIND_META[r.kind];
                  return (
                    <tr key={r.key} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${kind.cls}`}>{kind.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {r.title}
                        {r.note && <div className="mt-1 text-xs text-orange-700">{r.note}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${TONE_CLS[r.tone]}`}>
                          {r.statusLabel}
                        </span>
                      </td>
                      {/* 대상 개념이 없는 자료는 '—' 로 비운다. 약국/비약국을 임의로 채우지 않는다. */}
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{r.target ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(r.updatedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link to={kind.path} className="text-sm font-medium text-emerald-700 hover:underline">
                          관리
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        게시 대상은 태블릿 화면 자료에만 있습니다. 매장용 상품 설명서는 운영자 검수를 거쳐 매장에 노출되고,
        디지털 사이니지는 매장 유형 구분 없이 제공됩니다.
      </p>
    </div>
  );
}
