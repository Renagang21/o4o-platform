/**
 * StoreQrOperationBoard — 매장 QR 운영 화면의 공통 Core (2세대)
 *
 * WO-O4O-STORE-QR-CANONICAL-TARGET-CONTENT-SOURCE-AND-KPA-PH-COMMONIZATION-V1 §8
 * 선례: packages/tablet-screen-set-editor/src/TabletCornerBoard.tsx
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 설계 계약 (TabletCornerBoard 와 동일하게 지킨다)
 *
 *   Core 가 갖는 것   : 목록 배치 · 대상/원천 표시 · 액션 배치 · 출력 메뉴 · 상태 표면
 *   서비스가 주는 것  : 데이터 · 콜백 · 문구(labels) · 색(palette) · 행 액션 슬롯
 *
 *   **서비스 조건문 0.** `'kpa-society'` 같은 리터럴 분기가 이 파일에 생기면 설계 실패다.
 *   fetch · router · store 를 알지 않는다. 라우팅이 필요한 액션은 서비스가
 *   `renderRowActionsBefore` 슬롯으로 <Link> 를 주입한다.
 *
 * 표는 @o4o/ui DataTable 을 쓴다 — KPA 의 표준 표 계약
 * (WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1) 을 그대로 유지하기 위해서다.
 * @o4o/store-ui-core 는 이미 @o4o/ui 에 의존하므로 신규 dependency 는 0 이다.
 *
 * 색은 Tailwind class 가 아니라 **inline style palette** 로 주입받는다.
 * KPA(인라인 스타일 + design core colors)와 PH(Tailwind)가 같은 Core 를 쓰려면
 * 어느 한쪽의 스타일 체계에 종속되지 않아야 한다.
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3,
  Check,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  QrCode,
  RotateCcw,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { DataTable, type Column } from '@o4o/ui';
import {
  STORE_QR_EXPORT_PRESETS,
  isArchivedCornerQr,
  isQrExportable,
  storeQrContentSourceLabel,
  storeQrPlacementLabel,
  storeQrTargetLabel,
  hasAmbiguousPlacement,
  type StoreQrExportFormat,
  type StoreQrExportPreset,
  type StoreQrOperationItem,
} from './storeQrOperationModel';

// ────────────────────────────────────────────────────────────────────────────
// 주입 계약
// ────────────────────────────────────────────────────────────────────────────

export interface StoreQrBoardPalette {
  primary: string;
  neutral100: string;
  neutral200: string;
  neutral400: string;
  neutral500: string;
  neutral600: string;
  neutral700: string;
  neutral800: string;
  badgeBg: string;
  /** 위치별 귀속이 불가능한 상태를 눈에 띄게 표시하기 위한 경고색(§9-3). */
  warnBg: string;
  warnFg: string;
  surface: string;
  border: string;
}

/** 서비스가 색을 주지 않아도 화면이 성립하도록 중립 팔레트를 기본값으로 둔다. */
export const DEFAULT_STORE_QR_BOARD_PALETTE: StoreQrBoardPalette = {
  primary: '#2563EB',
  neutral100: '#F3F4F6',
  neutral200: '#E5E7EB',
  neutral400: '#9CA3AF',
  neutral500: '#6B7280',
  neutral600: '#4B5563',
  neutral700: '#374151',
  neutral800: '#1F2937',
  badgeBg: '#F3F4F6',
  warnBg: '#FEF3C7',
  warnFg: '#92400E',
  surface: '#FFFFFF',
  border: '#E5E7EB',
};

export interface StoreQrOperationBoardLabels {
  colQr: string;
  colTarget: string;
  colUrl: string;
  colScan: string;
  colActions: string;
  empty: string;
  export: string;
  exporting: string;
  exportBlocked: string;
  exportBlockedHint: string;
  settings: string;
  analytics: string;
  analyticsClose: string;
  placements: string;
  placementsClose: string;
  placementAmbiguousHint: string;
  copyUrl: string;
  openPage: string;
  deactivate: string;
  reactivate: string;
  archivedBadge: string;
  archivedHint: string;
  inactiveBadge: string;
  inactiveHint: string;
}

export const DEFAULT_STORE_QR_OPERATION_BOARD_LABELS: StoreQrOperationBoardLabels = {
  colQr: 'QR',
  colTarget: '대상',
  colUrl: 'URL',
  colScan: '스캔',
  colActions: '액션',
  empty: '등록된 QR 코드가 없습니다',
  export: '출력',
  exporting: '준비 중…',
  exportBlocked: '출력 불가',
  exportBlockedHint: '보관된 화면 세트의 QR은 출력할 수 없습니다. 보관을 해제하면 같은 주소로 다시 출력됩니다.',
  settings: 'QR 설정',
  analytics: '스캔 통계',
  analyticsClose: '통계 닫기',
  placements: '사용처 관리',
  placementsClose: '사용처 닫기',
  placementAmbiguousHint: '여러 곳에 동시 배치되어 있어 스캔 위치를 구분할 수 없습니다.',
  copyUrl: 'QR URL 복사',
  openPage: 'QR 페이지 열기',
  deactivate: 'QR 내리기',
  reactivate: '다시 올리기',
  archivedBadge: '보관',
  archivedHint: '화면 세트가 보관되어 이 QR은 열리지 않습니다 · 주소는 유지되며 보관 해제 시 다시 열립니다',
  inactiveBadge: '내림',
  inactiveHint: '내린 QR입니다 · 주소는 그대로 남아 있어 다시 올리면 같은 곳이 열립니다',
};

export interface StoreQrOperationBoardProps<T extends StoreQrOperationItem = StoreQrOperationItem> {
  items: T[];
  loading?: boolean;

  /** 공개 QR 주소. 서비스마다 origin 이 달라 Core 가 만들지 않는다. */
  publicUrl: (item: T) => string;
  /** 목록에 보여줄 상대 경로 표기(기본 `/qr/{slug}`). */
  displayPath?: (item: T) => string;

  onExport?: (item: T, format: StoreQrExportFormat, preset: StoreQrExportPreset) => void;
  exportingId?: string | null;

  onOpenSettings?: (item: T) => void;
  onShowAnalytics?: (item: T) => void;
  analyticsId?: string | null;
  /** 표 아래에 펼치는 통계 패널. DataTable 이 행 아래 펼침을 직접 지원하지 않는다. */
  analyticsPanel?: ReactNode;

  // ── 사용처(Placement) — WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §9 ──
  //   전부 optional 이다. 미전달 서비스(K-Cosmetics 등)는 기존 화면 그대로다.
  /** 행의 '사용처' 액션. 미전달이면 버튼을 그리지 않는다. */
  onShowPlacements?: (item: T) => void;
  placementId?: string | null;
  /** 표 아래에 펼치는 사용처 패널(analyticsPanel 과 같은 자리). */
  placementPanel?: ReactNode;

  onCopyUrl?: (item: T) => void;
  copiedId?: string | null;

  onDeactivate?: (item: T) => void;
  onReactivate?: (item: T) => void;

  /** 서비스 고유 진입점(AI 설명 편집 · 화면 세트 열기 등)을 액션 앞에 끼운다. */
  renderRowActionsBefore?: (item: T) => ReactNode;
  /** 제목 옆 배지(AI 설명 표식 등). */
  renderTitleBadges?: (item: T) => ReactNode;

  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  labels?: Partial<StoreQrOperationBoardLabels>;
  palette?: Partial<StoreQrBoardPalette>;
  emptyText?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// 출력 메뉴 — DataTable 클리핑 회피용 portal
// ────────────────────────────────────────────────────────────────────────────

/**
 * DataTable(BaseTable) 내부 wrapper 가 `overflow-x-auto` 라 CSS 규칙상 overflow-y 도
 * visible 이 아니게 계산되어, 행 안의 position:absolute 메뉴가 세로로 잘린다.
 * BaseTable 은 공통 표준이라 고치지 않고 메뉴를 body 로 portal(position:fixed) 한다.
 * (WO-O4O-KPA-STORE-QR-EXPORT-MENU-CLIP-FIX-V1 에서 확립된 해법을 Core 로 승격.)
 */
function QrExportMenu({
  exporting,
  onExport,
  palette,
  labels,
}: {
  exporting: boolean;
  onExport: (format: StoreQrExportFormat, preset: StoreQrExportPreset) => void;
  palette: StoreQrBoardPalette;
  labels: StoreQrOperationBoardLabels;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [rect, setRect] = useState<{ top: number; bottom: number; right: number } | null>(null);

  const MENU_W = 200;
  const MENU_H = 248; // 5항목 근사 높이

  const toggle = () => {
    if (exporting) return;
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.top, bottom: r.bottom, right: r.right });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const openUp = rect ? window.innerHeight - rect.bottom < MENU_H && rect.top > MENU_H : false;
  const left = rect ? Math.max(8, rect.right - MENU_W) : 0;

  const btnStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 10px',
    borderRadius: '6px',
    border: `1px solid ${palette.border}`,
    backgroundColor: palette.surface,
    color: palette.neutral700,
    fontSize: '12px',
    fontWeight: 600,
    opacity: exporting ? 0.6 : 1,
    cursor: exporting ? 'wait' : 'pointer',
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        style={btnStyle}
        disabled={exporting}
        title="QR 출력/다운로드"
      >
        <Download size={14} />
        {exporting ? labels.exporting : labels.export}
      </button>
      {open &&
        rect &&
        createPortal(
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={() => setOpen(false)} />
            <div
              style={{
                position: 'fixed',
                left,
                ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
                zIndex: 1001,
                width: MENU_W,
                backgroundColor: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                padding: '4px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {STORE_QR_EXPORT_PRESETS.map((opt) => (
                <button
                  key={`${opt.format}-${opt.preset}`}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onExport(opt.format, opt.preset);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: palette.neutral700 }}>
                    {opt.label}
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: palette.neutral400, marginTop: '1px' }}>
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Board
// ────────────────────────────────────────────────────────────────────────────

export function StoreQrOperationBoard<T extends StoreQrOperationItem = StoreQrOperationItem>({
  items,
  loading,
  publicUrl,
  displayPath,
  onExport,
  exportingId,
  onOpenSettings,
  onShowAnalytics,
  analyticsId,
  analyticsPanel,
  onShowPlacements,
  placementId,
  placementPanel,
  onCopyUrl,
  copiedId,
  onDeactivate,
  onReactivate,
  renderRowActionsBefore,
  renderTitleBadges,
  selectedIds,
  onSelectionChange,
  labels: labelOverrides,
  palette: paletteOverrides,
  emptyText,
}: StoreQrOperationBoardProps<T>) {
  const labels = { ...DEFAULT_STORE_QR_OPERATION_BOARD_LABELS, ...labelOverrides };
  const palette = { ...DEFAULT_STORE_QR_BOARD_PALETTE, ...paletteOverrides };

  const iconBtn: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: palette.neutral500,
    cursor: 'pointer',
    textDecoration: 'none',
  };

  const badge = (bg: string, fg: string): CSSProperties => ({
    marginLeft: 6,
    display: 'inline-flex',
    padding: '1px 7px',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: bg,
    color: fg,
    verticalAlign: 'middle',
  });

  const columns: Column<T>[] = [
    {
      key: 'title',
      title: labels.colQr,
      render: (_v, item) => {
        const archived = isArchivedCornerQr(item);
        const inactive = item.isActive === false;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: palette.neutral100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <QrCode size={18} style={{ color: palette.primary }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: palette.neutral800,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.title}
                {renderTitleBadges?.(item)}
                {/* 사용처 배지 — WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §9.
                    `primaryPlacement` 를 안 내려주는 서비스(K-Cosmetics 등)에서는 아무것도 그리지 않는다.
                    여러 곳에 동시 배치된 QR 은 위치별 귀속이 불가능하므로 목록에서부터 구분해 보여준다. */}
                {item.primaryPlacement && (
                  <span
                    style={
                      hasAmbiguousPlacement(item)
                        ? badge(palette.warnBg, palette.warnFg)
                        : badge(palette.neutral100, palette.neutral600)
                    }
                    title={
                      hasAmbiguousPlacement(item)
                        ? labels.placementAmbiguousHint
                        : labels.placements
                    }
                  >
                    {storeQrPlacementLabel(item.primaryPlacement) ?? item.primaryPlacement}
                    {hasAmbiguousPlacement(item) && (item.activePlacementCount ?? 0) > 1
                      ? ` ${item.activePlacementCount}`
                      : ''}
                  </span>
                )}
                {archived && <span style={badge(palette.neutral200, palette.neutral600)}>{labels.archivedBadge}</span>}
                {inactive && !archived && (
                  <span style={badge(palette.neutral200, palette.neutral600)}>{labels.inactiveBadge}</span>
                )}
              </p>
              {archived && (
                <p style={{ fontSize: '11px', color: palette.neutral500, margin: '2px 0 0 0' }}>{labels.archivedHint}</p>
              )}
              {inactive && !archived && (
                <p style={{ fontSize: '11px', color: palette.neutral500, margin: '2px 0 0 0' }}>{labels.inactiveHint}</p>
              )}
              {item.description && (
                <p
                  style={{
                    fontSize: '12px',
                    color: palette.neutral500,
                    margin: '2px 0 0 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'target',
      title: labels.colTarget,
      align: 'center',
      render: (_v, item) => {
        // 대상(무엇을) 과 원천(어디서) 을 한 칸에 위아래로 둔다 — 두 축이 다른 질문임을 보이되
        // 열을 늘리지 않는다. 원천이 HOLD(null)면 배지를 그리지 않는다(추측 표시 금지).
        const source = storeQrContentSourceLabel(item.contentSource);
        return (
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <span
              style={{
                display: 'inline-flex',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                backgroundColor: palette.badgeBg,
                color: palette.neutral600,
              }}
            >
              {storeQrTargetLabel(item)}
            </span>
            {source && <span style={{ fontSize: '10px', color: palette.neutral400 }}>{source}</span>}
          </div>
        );
      },
    },
    {
      key: 'slug',
      title: labels.colUrl,
      render: (_v, item) => (
        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: palette.neutral500 }}>
          {displayPath ? displayPath(item) : `/qr/${item.slug}`}
        </span>
      ),
    },
    {
      key: 'scanCount',
      title: labels.colScan,
      align: 'center',
      render: (_v, item) =>
        (item.scanCount ?? 0) > 0 ? (
          <span style={{ fontSize: '12px', color: palette.primary, fontWeight: 600 }}>{item.scanCount}</span>
        ) : (
          <span style={{ fontSize: '12px', color: palette.neutral400 }}>-</span>
        ),
    },
    {
      key: 'actions',
      title: labels.colActions,
      align: 'right',
      render: (_v, item) => {
        const inactive = item.isActive === false;
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            {renderRowActionsBefore?.(item)}

            {onOpenSettings && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings(item);
                }}
                style={iconBtn}
                title={labels.settings}
              >
                <Settings size={16} />
              </button>
            )}

            {onExport &&
              (isQrExportable(item) ? (
                <QrExportMenu
                  exporting={exportingId === item.id}
                  onExport={(format, preset) => onExport(item, format, preset)}
                  palette={palette}
                  labels={labels}
                />
              ) : (
                <button
                  type="button"
                  disabled
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${palette.border}`,
                    backgroundColor: palette.surface,
                    color: palette.neutral500,
                    fontSize: '12px',
                    fontWeight: 600,
                    opacity: 0.45,
                    cursor: 'not-allowed',
                  }}
                  title={labels.exportBlockedHint}
                >
                  <Download size={14} />
                  {labels.exportBlocked}
                </button>
              ))}

            {onShowPlacements && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowPlacements(item);
                }}
                style={{ ...iconBtn, color: placementId === item.id ? palette.primary : palette.neutral500 }}
                title={placementId === item.id ? labels.placementsClose : labels.placements}
              >
                {placementId === item.id ? <X size={16} /> : <MapPin size={16} />}
              </button>
            )}

            {onShowAnalytics && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowAnalytics(item);
                }}
                style={{ ...iconBtn, color: analyticsId === item.id ? palette.primary : palette.neutral500 }}
                title={analyticsId === item.id ? labels.analyticsClose : labels.analytics}
              >
                {analyticsId === item.id ? <X size={16} /> : <BarChart3 size={16} />}
              </button>
            )}

            {onCopyUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyUrl(item);
                }}
                style={iconBtn}
                title={labels.copyUrl}
              >
                {copiedId === item.id ? <Check size={16} style={{ color: palette.primary }} /> : <Copy size={16} />}
              </button>
            )}

            <a
              href={publicUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={iconBtn}
              title={labels.openPage}
            >
              <ExternalLink size={16} />
            </a>

            {/* 내리기 ↔ 다시 올리기는 같은 자리에서 토글된다.
                내린 QR 이 목록에서 사라지면 되살릴 경로가 없어지므로 두 액션을 한 축으로 둔다. */}
            {inactive
              ? onReactivate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReactivate(item);
                    }}
                    style={iconBtn}
                    title={labels.reactivate}
                  >
                    <RotateCcw size={16} />
                  </button>
                )
              : onDeactivate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeactivate(item);
                    }}
                    style={iconBtn}
                    title={labels.deactivate}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable<T>
        columns={columns}
        dataSource={items}
        rowKey={(record) => record.id}
        loading={loading}
        emptyText={emptyText ?? labels.empty}
        {...(selectedIds && onSelectionChange
          ? { rowSelection: { selectedRowKeys: selectedIds, onChange: onSelectionChange } }
          : {})}
      />
      {analyticsPanel}
      {placementPanel}
    </>
  );
}
