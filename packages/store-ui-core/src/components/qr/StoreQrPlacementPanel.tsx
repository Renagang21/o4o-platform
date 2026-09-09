/**
 * StoreQrPlacementPanel — QR 사용처(Placement) 관리 공통 패널
 *
 * WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §9·§15
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Target 과 Placement 는 다른 질문이다
 *
 *   Target    = 찍으면 무엇이 나오는가   (기존 QR 보드가 이미 보여준다)
 *   Placement = 어디에서 사용하는가      ← 이 패널
 *
 * 순수 표시 컴포넌트다. fetch·serviceKey·라우터를 모른다 —
 * 실행은 전부 `api` 콜백으로 위임한다(§15 Core/Adapter 경계).
 * `'kpa-society'` / `'pharmacy-hub'` 같은 리터럴 분기가 생기면 설계 실패로 본다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 반드시 고지하는 것 (DESIGN §9-3)
 *
 *   같은 QR 이미지를 여러 곳에 붙이면 **스캔이 어디서 발생했는지 알 수 없다.**
 *   모델의 한계가 아니라 물리 현실이다. 그래서 활성 배치가 2개 이상이면
 *   경고를 띄우고 "같은 콘텐츠로 QR 추가" 를 권한다.
 */

import { useState, type ReactNode } from 'react';
import {
  STORE_QR_PLACEMENT_PRESETS,
  storeQrPlacementLabel,
} from './storeQrOperationModel';

export interface StoreQrPlacementRow {
  id: string;
  placement: string;
  label?: string | null;
  cornerRef?: string | null;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string | null;
}

export interface StoreQrPlacementScanRow {
  placement: string;
  label?: string | null;
  scans: number;
}

export interface StoreQrPlacementPanelProps {
  qrTitle: string;
  placements: StoreQrPlacementRow[];
  loading?: boolean;
  error?: string | null;

  /** 사용처별 스캔(구간 귀속). 없으면 통계 영역을 숨긴다. */
  scanBreakdown?: StoreQrPlacementScanRow[];

  /** 배치 시작. `endOthers` 면 기존 활성 배치를 종료하고 시작한다(= 이동). */
  onStart: (input: { placement: string; label?: string; endOthers: boolean }) => Promise<void> | void;
  onEnd: (placementId: string) => Promise<void> | void;
  /** "같은 콘텐츠로 QR 추가" — 위치별 분석의 전제 동선(§8). */
  onCloneForPlacement?: () => void;

  busy?: boolean;
  accentButton?: string;
  footerSlot?: ReactNode;
}

function fmtDate(v?: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ''
    : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function StoreQrPlacementPanel({
  qrTitle,
  placements,
  loading,
  error,
  scanBreakdown,
  onStart,
  onEnd,
  onCloneForPlacement,
  busy,
  accentButton = 'bg-teal-600 hover:bg-teal-700',
  footerSlot,
}: StoreQrPlacementPanelProps) {
  const [placement, setPlacement] = useState<string>(STORE_QR_PLACEMENT_PRESETS[1]!.value);
  const [label, setLabel] = useState('');
  const [move, setMove] = useState(false);

  const active = placements.filter((p) => p.status === 'active');
  const ended = placements.filter((p) => p.status !== 'active');
  const ambiguous = active.length > 1;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-sm font-bold text-slate-800">
          사용처 <span className="font-normal text-slate-400">· {qrTitle}</span>
        </h3>
        {onCloneForPlacement && (
          <button
            type="button"
            onClick={onCloneForPlacement}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            같은 콘텐츠로 QR 추가
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      {/* §9-3 필수 고지 — 위치별 귀속이 불가능한 상태를 숨기지 않는다. */}
      {ambiguous && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          이 QR 은 여러 사용처에 배치되어 있습니다.{' '}
          <span className="font-semibold">스캔이 어느 위치에서 발생했는지는 구분할 수 없습니다.</span>{' '}
          위치별 통계가 필요하면 <span className="font-semibold">[같은 콘텐츠로 QR 추가]</span> 로 사용처별 QR 을 발급하세요.
        </div>
      )}

      {/* 배치 시작 / 이동 */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          사용처
          <select
            value={placement}
            onChange={(e) => setPlacement(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
          >
            {STORE_QR_PLACEMENT_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-slate-500">
          위치 메모 (선택)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="예: 혈당관리 매대"
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        {active.length > 0 && (
          <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-600">
            <input type="checkbox" checked={move} onChange={(e) => setMove(e.target.checked)} />
            기존 배치를 끝내고 이동
          </label>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onStart({ placement, label: label.trim() || undefined, endOthers: move })}
          className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${accentButton}`}
        >
          {move ? '여기로 이동' : '배치 추가'}
        </button>
      </div>

      {loading ? (
        <p className="py-6 text-center text-xs text-slate-400">불러오는 중…</p>
      ) : placements.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
          아직 배치 기록이 없습니다. 이 QR 을 어디에 붙였는지 등록하면 사용처별 스캔을 볼 수 있습니다.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {[...active, ...ended].map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-medium text-slate-800">
                  {storeQrPlacementLabel(p.placement)}
                  {p.label && <span className="ml-1.5 font-normal text-slate-400">· {p.label}</span>}
                </p>
                <p className="m-0 mt-0.5 text-[11px] text-slate-400">
                  {p.status === 'active' ? (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">사용 중</span>
                  ) : (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">종료</span>
                  )}
                  <span className="ml-1.5">
                    {fmtDate(p.startedAt)}
                    {p.endedAt ? ` ~ ${fmtDate(p.endedAt)}` : ' ~'}
                  </span>
                </p>
              </div>
              {p.status === 'active' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onEnd(p.id)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  배치 종료
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 사용처별 스캔 — 구간 귀속 결과. UNPLACED/AMBIGUOUS 를 숨기지 않는다. */}
      {scanBreakdown && scanBreakdown.length > 0 && (
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <p className="m-0 mb-1.5 text-xs font-semibold text-slate-600">사용처별 스캔</p>
          <ul className="m-0 space-y-1 p-0">
            {scanBreakdown.map((r) => (
              <li key={`${r.placement}-${r.label ?? ''}`} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  {storeQrPlacementLabel(r.placement)}
                  {r.label && <span className="text-slate-400"> · {r.label}</span>}
                </span>
                <span className="font-semibold text-slate-800">{r.scans}</span>
              </li>
            ))}
          </ul>
          <p className="m-0 mt-1.5 text-[11px] text-slate-400">
            배치 기간에 맞춰 귀속합니다. <span className="font-medium">배치 없음</span> 은 그 시점에 등록된 사용처가 없던 스캔,{' '}
            <span className="font-medium">구분 불가</span> 는 동시에 여러 곳에 배치돼 위치를 특정할 수 없는 스캔입니다.
          </p>
        </div>
      )}

      {footerSlot}
    </div>
  );
}
