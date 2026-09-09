/**
 * StoreQrPlacementAnalyticsPanel — 매장 전체 QR 스캔 분포 공통 패널
 *
 * WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §13
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QR 하나가 아니라 **매장 전체**를 세 축으로 본다
 *
 *   사용처(Placement)    어디에 붙인 QR 이 찍히는가   ← 이번 회차 신규 축
 *   콘텐츠 출처(Source)  무엇에서 온 콘텐츠인가
 *   대상(Target)         찍으면 무엇이 나오는가
 *
 * 세 축은 **같은 스캔 모집단을 다르게 자른 것**이라 각 축의 합은 서로 같다.
 * 그래서 축별 합을 total 과 나란히 보여줘 "왜 숫자가 다르지" 를 만들지 않는다.
 *
 * 순수 표시 컴포넌트다. fetch·serviceKey·라우터를 모른다(§15 Core/Adapter 경계).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 숨기지 않는 것
 *
 *   `UNPLACED`(배치 없음) 와 `AMBIGUOUS`(구분 불가) 는 **집계에서 빼지 않는다.**
 *   기존 QR 90건은 backfill 을 하지 않았으므로(§5) 도입 직후 대부분의 스캔이
 *   `UNPLACED` 로 나오는 것이 정상이다. 이를 0 으로 감추면 매장이 분포를 오해한다.
 */

import type { ReactNode } from 'react';
import {
  storeQrPlacementLabel,
  storeQrContentSourceLabel,
  STORE_QR_LANDING_TYPE_LABELS,
} from './storeQrOperationModel';

export interface StoreQrPlacementAnalyticsData {
  byPlacement: Array<{ placement: string; label?: string | null; scans: number }>;
  byContentSource: Array<{ contentSource: string | null; scans: number }>;
  byTargetKind: Array<{ landingType: string | null; scans: number }>;
  totalScans: number;
}

export interface StoreQrPlacementAnalyticsPanelProps {
  data?: StoreQrPlacementAnalyticsData | null;
  loading?: boolean;
  error?: string | null;

  /** 조회 기간(일). 미전달이면 기간 선택을 그리지 않는다. */
  days?: number | null;
  onChangeDays?: (days: number | null) => void;

  title?: string;
  footerSlot?: ReactNode;
}

const DAY_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: 7, label: '최근 7일' },
  { value: 30, label: '최근 30일' },
  { value: 90, label: '최근 90일' },
  { value: null, label: '전체' },
];

function Bar({ ratio }: { ratio: number }) {
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-slate-400"
        style={{ width: `${Math.max(2, Math.round(ratio * 100))}%` }}
      />
    </div>
  );
}

function Axis({
  heading,
  note,
  rows,
}: {
  heading: string;
  note?: string;
  rows: Array<{ key: string; label: string; muted?: string | null; scans: number }>;
}) {
  const total = rows.reduce((s, r) => s + r.scans, 0);
  return (
    <section className="min-w-0 flex-1">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="m-0 text-xs font-bold text-slate-700">{heading}</h4>
        <span className="text-[11px] text-slate-400">{total.toLocaleString()}회</span>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
          집계된 스캔이 없습니다.
        </p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-slate-600">
                  {r.label}
                  {r.muted && <span className="text-slate-400"> · {r.muted}</span>}
                </span>
                <span className="shrink-0 font-semibold text-slate-800">{r.scans.toLocaleString()}</span>
              </div>
              <Bar ratio={total > 0 ? r.scans / total : 0} />
            </li>
          ))}
        </ul>
      )}
      {note && <p className="m-0 mt-2 text-[11px] leading-relaxed text-slate-400">{note}</p>}
    </section>
  );
}

export function StoreQrPlacementAnalyticsPanel({
  data,
  loading,
  error,
  days,
  onChangeDays,
  title = 'QR 스캔 분포',
  footerSlot,
}: StoreQrPlacementAnalyticsPanelProps) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-sm font-bold text-slate-800">
          {title}
          {data && (
            <span className="ml-2 font-normal text-slate-400">
              총 {data.totalScans.toLocaleString()}회
            </span>
          )}
        </h3>
        {onChangeDays && (
          <div className="flex flex-wrap gap-1">
            {DAY_OPTIONS.map((o) => (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => onChangeDays(o.value)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  (days ?? null) === o.value
                    ? 'bg-slate-800 text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-8 text-center text-xs text-slate-400">불러오는 중…</p>
      ) : !data ? (
        <p className="py-8 text-center text-xs text-slate-400">분포를 불러오지 못했습니다.</p>
      ) : (
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          <Axis
            heading="사용처별"
            note="배치 기간에 맞춰 귀속합니다. 배치를 등록하기 전의 스캔은 배치 없음 으로 남습니다."
            rows={data.byPlacement.map((r) => ({
              key: `${r.placement}-${r.label ?? ''}`,
              label: storeQrPlacementLabel(r.placement) ?? r.placement,
              muted: r.label ?? null,
              scans: r.scans,
            }))}
          />
          <Axis
            heading="콘텐츠 출처별"
            rows={data.byContentSource.map((r) => ({
              key: r.contentSource ?? 'null',
              label: storeQrContentSourceLabel(r.contentSource) ?? r.contentSource ?? '미분류',
              scans: r.scans,
            }))}
          />
          <Axis
            heading="대상별"
            rows={data.byTargetKind.map((r) => ({
              key: r.landingType ?? 'null',
              label: (r.landingType && STORE_QR_LANDING_TYPE_LABELS[r.landingType]) || r.landingType || '미분류',
              scans: r.scans,
            }))}
          />
        </div>
      )}

      {footerSlot}
    </div>
  );
}
