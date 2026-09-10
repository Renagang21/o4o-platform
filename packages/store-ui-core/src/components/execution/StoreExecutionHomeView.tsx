/**
 * StoreExecutionHomeView — 매장 실행 홈 공통 Core
 * WO-O4O-STORE-EXECUTION-HOME-TABLET-QR-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 화면이 답하는 것   : "어디에서 무엇이 지금 사용 중인가"
 * 이 화면이 하지 않는 것 : 제작 · 편집 · 생성 · 삭제
 *
 *   Core 가 갖는 것   : 위치 묶음 배치 · 상태 표면 · 실측 수치 표시
 *   서비스가 주는 것  : 데이터 · 문구(labels) · 색(palette) · 이동 링크 슬롯
 *
 *   **serviceKey 조건문 0.** `'kpa-society'` · `'pharmacy-hub'` 같은 리터럴 분기가
 *   이 파일에 생기면 설계 실패다. fetch · router · store 를 알지 않는다.
 *   화면 이동은 서비스가 `renderGroupLinks` / `headerActions` 슬롯에 넣는다.
 *
 * 색은 Tailwind class 가 아니라 inline style palette 로 주입받는다 —
 * KPA(인라인 스타일)와 Pharmacy-Hub(Tailwind)가 같은 Core 를 쓰기 위해서다.
 * 선례: components/qr/StoreQrOperationBoard.tsx
 *
 * 표시하지 않는 것 (의도적 부재 — placeholder 도 만들지 않는다)
 *   - POP · Signage · ESL 행 : 배치 축이 없어 "지금 어디" 를 말할 수 없다
 *   - 태블릿 노출수 · 재생수 : 측정 수단이 없다. 유일한 실측치는 QR scan 이다
 */

import type { CSSProperties, ReactNode } from 'react';
import { MapPin, Monitor, QrCode } from 'lucide-react';
import {
  STORE_EXECUTION_REASON_LABELS,
  STORE_EXECUTION_STATUS_LABELS,
  groupStoreExecution,
  summarizeStoreExecution,
  type StoreExecutionGroup,
  type StoreExecutionQr,
  type StoreExecutionQrInput,
  type StoreExecutionStatus,
  type StoreExecutionTablet,
  type StoreExecutionTabletInput,
} from './storeExecutionModel';

// ────────────────────────────────────────────────────────────────────────────
// 주입 계약
// ────────────────────────────────────────────────────────────────────────────

export interface StoreExecutionPalette {
  primary: string;
  surface: string;
  border: string;
  neutral100: string;
  neutral400: string;
  neutral500: string;
  neutral600: string;
  neutral800: string;
  okBg: string;
  okFg: string;
  warnBg: string;
  warnFg: string;
  mutedBg: string;
  mutedFg: string;
}

export const DEFAULT_STORE_EXECUTION_PALETTE: StoreExecutionPalette = {
  primary: '#2563EB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  neutral100: '#F3F4F6',
  neutral400: '#9CA3AF',
  neutral500: '#6B7280',
  neutral600: '#4B5563',
  neutral800: '#1F2937',
  okBg: '#DCFCE7',
  okFg: '#166534',
  warnBg: '#FEF3C7',
  warnFg: '#92400E',
  mutedBg: '#F3F4F6',
  mutedFg: '#4B5563',
};

export interface StoreExecutionHomeLabels {
  summaryCorners: string;
  summaryTablets: string;
  summaryQrPlaced: string;
  summaryScans: string;
  tabletsHeading: string;
  qrHeading: string;
  emptyAll: string;
  emptyHint: string;
  scanUnit: string;
  noScanMeasure: string;
  unlocatedHint: string;
  unplacedHint: string;
  loading: string;
}

export const DEFAULT_STORE_EXECUTION_HOME_LABELS: StoreExecutionHomeLabels = {
  summaryCorners: '위치',
  summaryTablets: '사용 중 태블릿',
  summaryQrPlaced: '배치된 QR',
  summaryScans: 'QR 스캔',
  tabletsHeading: '태블릿',
  qrHeading: 'QR',
  emptyAll: '매장에서 사용 중인 태블릿과 QR 이 아직 없습니다.',
  emptyHint: '태블릿을 등록하거나 QR 을 배치하면 이곳에 위치별로 표시됩니다.',
  scanUnit: '회',
  noScanMeasure: '태블릿은 노출 수를 측정하지 않습니다.',
  unlocatedHint: '설치 위치를 입력하면 해당 위치 묶음으로 이동합니다.',
  unplacedHint: '만들어 두었지만 아직 매장 어디에도 사용 중이 아닌 QR 입니다.',
  loading: '불러오는 중…',
};

export interface StoreExecutionHomeViewProps {
  tablets: StoreExecutionTabletInput[];
  qrs: StoreExecutionQrInput[];
  loading?: boolean;
  palette?: Partial<StoreExecutionPalette>;
  labels?: Partial<StoreExecutionHomeLabels>;
  /** 요약 줄 오른쪽. 서비스가 새로고침 · 이동 링크를 넣는다. */
  headerActions?: ReactNode;
  /** 각 위치 묶음 헤더 우측. 서비스가 <Link> 로 태블릿/QR 화면 이동을 넣는다. */
  renderGroupLinks?: (group: StoreExecutionGroup) => ReactNode;
  /** 비어 있을 때 보여줄 안내 위 슬롯(예: 최초 등록 유도 링크). */
  emptyAction?: ReactNode;
}

// ────────────────────────────────────────────────────────────────────────────

function statusStyle(status: StoreExecutionStatus, p: StoreExecutionPalette): CSSProperties {
  const map: Record<StoreExecutionStatus, [string, string]> = {
    ok: [p.okBg, p.okFg],
    unset: [p.mutedBg, p.mutedFg],
    stopped: [p.neutral100, p.neutral500],
    attention: [p.warnBg, p.warnFg],
  };
  const [bg, fg] = map[status];
  return {
    background: bg,
    color: fg,
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };
}

function StatusBadge({ status, palette }: { status: StoreExecutionStatus; palette: StoreExecutionPalette }) {
  return <span style={statusStyle(status, palette)}>{STORE_EXECUTION_STATUS_LABELS[status]}</span>;
}

function ReasonLine({ row, palette }: { row: { reasons: readonly string[] }; palette: StoreExecutionPalette }) {
  if (row.reasons.length === 0) return null;
  const text = row.reasons
    .map((r) => STORE_EXECUTION_REASON_LABELS[r as keyof typeof STORE_EXECUTION_REASON_LABELS])
    .filter(Boolean)
    .join(' · ');
  if (!text) return null;
  return <div style={{ fontSize: 12, color: palette.neutral500, marginTop: 2 }}>{text}</div>;
}

const rowStyle = (palette: StoreExecutionPalette): CSSProperties => ({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  padding: '8px 0',
  borderTop: `1px solid ${palette.neutral100}`,
});

function TabletRow({ t, palette }: { t: StoreExecutionTablet; palette: StoreExecutionPalette }) {
  return (
    <div style={rowStyle(palette)}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, color: palette.neutral800 }}>{t.name}</div>
        <ReasonLine row={t} palette={palette} />
      </div>
      <StatusBadge status={t.status} palette={palette} />
    </div>
  );
}

function QrRow({
  q,
  palette,
  labels,
}: {
  q: StoreExecutionQr;
  palette: StoreExecutionPalette;
  labels: StoreExecutionHomeLabels;
}) {
  return (
    <div style={rowStyle(palette)}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, color: palette.neutral800 }}>{q.title}</div>
        <ReasonLine row={q} palette={palette} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* 실측 지표는 스캔 하나뿐이다. 0 도 숨기지 않는다 — 0 은 사실이다. */}
        <span style={{ fontSize: 12, color: palette.neutral500, whiteSpace: 'nowrap' }}>
          {(q.scanCount ?? 0).toLocaleString('ko-KR')}
          {labels.scanUnit}
        </span>
        <StatusBadge status={q.status} palette={palette} />
      </div>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  palette,
}: {
  label: string;
  value: number;
  palette: StoreExecutionPalette;
}) {
  return (
    <div style={{ minWidth: 96 }}>
      <div style={{ fontSize: 12, color: palette.neutral500 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: palette.neutral800, lineHeight: 1.2 }}>
        {value.toLocaleString('ko-KR')}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export function StoreExecutionHomeView({
  tablets,
  qrs,
  loading = false,
  palette: paletteOverride,
  labels: labelOverride,
  headerActions,
  renderGroupLinks,
  emptyAction,
}: StoreExecutionHomeViewProps) {
  const palette = { ...DEFAULT_STORE_EXECUTION_PALETTE, ...paletteOverride };
  const labels = { ...DEFAULT_STORE_EXECUTION_HOME_LABELS, ...labelOverride };

  const groups = groupStoreExecution(tablets, qrs);
  const summary = summarizeStoreExecution(groups);

  const card: CSSProperties = {
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    borderRadius: 12,
    padding: 16,
  };

  if (loading) {
    return (
      <div style={{ ...card, color: palette.neutral500, fontSize: 14 }}>{labels.loading}</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 요약 — 셀 수 있는 것과 실측 스캔만 */}
      <div
        style={{
          ...card,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <SummaryCell label={labels.summaryCorners} value={summary.cornerCount} palette={palette} />
          <SummaryCell label={labels.summaryTablets} value={summary.tabletInUse} palette={palette} />
          <SummaryCell label={labels.summaryQrPlaced} value={summary.qrPlaced} palette={palette} />
          <SummaryCell label={labels.summaryScans} value={summary.scanTotal} palette={palette} />
        </div>
        {headerActions ? <div>{headerActions}</div> : null}
        {/* 왜 태블릿 지표가 없는지 화면에서 밝힌다 — 없는 숫자를 만들지 않는다는 계약의 표면. */}
        <div style={{ flexBasis: '100%', fontSize: 12, color: palette.neutral400 }}>
          {labels.noScanMeasure}
        </div>
      </div>

      {groups.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 14, color: palette.neutral600 }}>{labels.emptyAll}</div>
          <div style={{ fontSize: 13, color: palette.neutral500, marginTop: 6 }}>{labels.emptyHint}</div>
          {emptyAction ? <div style={{ marginTop: 12 }}>{emptyAction}</div> : null}
        </div>
      ) : (
        groups.map((g) => {
          const isBucket = g.kind !== 'corner';
          return (
            <section key={g.key} style={card}>
              <header
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <MapPin size={16} color={isBucket ? palette.neutral400 : palette.primary} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: palette.neutral800 }}>{g.label}</span>
                  {!isBucket ? <StatusBadge status={g.status} palette={palette} /> : null}
                  {g.qrs.length > 0 ? (
                    <span style={{ fontSize: 12, color: palette.neutral500 }}>
                      {labels.summaryScans} {g.scanCount.toLocaleString('ko-KR')}
                      {labels.scanUnit}
                    </span>
                  ) : null}
                </div>
                {renderGroupLinks ? <div>{renderGroupLinks(g)}</div> : null}
              </header>

              {g.kind === 'tablet-unlocated' ? (
                <div style={{ fontSize: 13, color: palette.neutral500, marginTop: 6 }}>{labels.unlocatedHint}</div>
              ) : null}
              {g.kind === 'qr-unplaced' ? (
                <div style={{ fontSize: 13, color: palette.neutral500, marginTop: 6 }}>{labels.unplacedHint}</div>
              ) : null}

              {g.tablets.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: palette.neutral600,
                    }}
                  >
                    <Monitor size={14} />
                    {labels.tabletsHeading} ({g.tablets.length})
                  </div>
                  {g.tablets.map((t) => (
                    <TabletRow key={t.id} t={t} palette={palette} />
                  ))}
                </div>
              ) : null}

              {g.qrs.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: palette.neutral600,
                    }}
                  >
                    <QrCode size={14} />
                    {labels.qrHeading} ({g.qrs.length})
                  </div>
                  {g.qrs.map((q) => (
                    <QrRow key={q.id} q={q} palette={palette} labels={labels} />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}
