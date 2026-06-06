/**
 * StoreAssetDerivationViewer — 공통 "원본 보기" 모달
 *
 * WO-O4O-STORE-ASSET-DERIVATION-VIEWER-COMPONENT-EXTRACT-V1
 *
 * KPA StoreProductionMaterialsPage 의 원본 보기 모달을 canonical 기준으로 공통 컴포넌트 승격.
 * 결과물(derivedKind + derivedId) 1건의 원본(source) 역추적 결과를 읽기 전용으로 표시한다.
 * KPA / GlycoPharm / K-Cosmetics 3 서비스가 동일 코드를 사용한다.
 *
 * 제로-의존 원칙:
 *   - @o4o/* 직접 import 금지 — peerDeps(react, lucide-react)만 사용
 *   - endpoint 를 알지 않는다 — 서비스가 fetchDerivations 를 주입(서비스별 API base/컨벤션 흡수)
 *   - 백엔드 store_asset_derivations 는 이미 service-neutral (변경 없음)
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { Link2, X, Loader2 } from 'lucide-react';

/** 백엔드 store_asset_derivations 응답 1건 (read-only). */
export interface StoreAssetDerivationItem {
  id: string;
  serviceKey: string;
  organizationId: string;
  sourceKind: string;
  sourceId: string;
  sourceTitle?: string | null;
  derivedKind: string;
  derivedId: string;
  derivedTitle?: string | null;
  createdAt: string;
}

/** 결과물 종류. material/pop = POP 결과물, qr = QR-code, blog = 블로그. */
export type StoreResultKind = 'material' | 'pop' | 'qr' | 'blog';

/** ResultKind → store_asset_derivations.derivedKind 공통 매핑. material|pop→pop_pdf, qr→qr_code, blog→blog_post. */
export function resultKindToDerivedKind(kind: StoreResultKind): 'pop_pdf' | 'qr_code' | 'blog_post' {
  return kind === 'qr' ? 'qr_code' : kind === 'blog' ? 'blog_post' : 'pop_pdf';
}

/** source_kind → 사용자 문구 기본 맵 (개발자 용어 비노출). 서비스가 sourceKindLabels 로 override 가능. */
const DEFAULT_SOURCE_KIND_LABELS: Record<string, string> = {
  content_snapshot: '콘텐츠',
  content_direct: '콘텐츠',
  library_resource: '자료',
  production_material: '매장 제작 자료',
  store_execution_asset: '자료',
};

export interface StoreAssetDerivationViewerProps {
  open: boolean;
  onClose: () => void;
  /** 결과물 식별 — 서비스가 resultKindToDerivedKind 로 매핑해 전달 */
  derivedKind: string;
  derivedId: string;
  /** 헤더 본문 표기: `{kindLabel} · {title}` (kindLabel 없으면 title 만) */
  title: string;
  kindLabel?: string;
  /** endpoint 주입 — 서비스별 API base/컨벤션 흡수. viewer 는 호출만 한다. */
  fetchDerivations: (p: { derivedKind: string; derivedId: string }) => Promise<{ items: StoreAssetDerivationItem[] }>;
  /** source_kind → 사용자 라벨 override (미지정 시 기본 맵) */
  sourceKindLabels?: Record<string, string>;
}

/**
 * 결과물 1건의 원본 역추적 결과를 보여주는 읽기 전용 모달.
 * 승인/삭제 등 mutation 없음 — 조회 전용.
 */
export function StoreAssetDerivationViewer({
  open,
  onClose,
  derivedKind,
  derivedId,
  title,
  kindLabel,
  fetchDerivations,
  sourceKindLabels,
}: StoreAssetDerivationViewerProps) {
  const [items, setItems] = useState<StoreAssetDerivationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !derivedId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setItems([]);
    fetchDerivations({ derivedKind, derivedId })
      .then((res) => {
        if (!cancelled) setItems(res?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('원본 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, derivedKind, derivedId, fetchDerivations]);

  if (!open) return null;

  const labelFor = (k: string) => (sourceKindLabels ?? DEFAULT_SOURCE_KIND_LABELS)[k] ?? '자료';

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>
            <Link2 size={16} style={{ color: C.primary }} />
            원본 자료
          </span>
          <button type="button" onClick={onClose} style={styles.modalClose} aria-label="닫기">
            <X size={16} />
          </button>
        </div>
        <div style={styles.modalBody}>
          <p style={styles.modalTargetTitle}>{kindLabel ? `${kindLabel} · ${title}` : title}</p>
          {loading ? (
            <div style={styles.modalState}>
              <Loader2 size={18} style={{ color: C.neutral400 }} /> 불러오는 중...
            </div>
          ) : error ? (
            <div style={{ ...styles.modalState, color: '#DC2626' }}>{error}</div>
          ) : items.length === 0 ? (
            <div style={styles.modalEmpty}>
              연결된 원본 정보가 없습니다.
              <span style={styles.modalEmptySub}>
                이전 버전에서 생성되었거나 원본 관계가 기록되지 않은 자료일 수 있습니다.
              </span>
            </div>
          ) : (
            <>
              <p style={styles.modalIntro}>
                이 자료는 아래 {items.length}개의 원본 자료를 바탕으로 만들어졌습니다.
              </p>
              <ul style={styles.modalList}>
                {items.map((d) => (
                  <li key={d.id} style={styles.modalListItem}>
                    <span style={styles.modalSourceBadge}>{labelFor(d.sourceKind)}</span>
                    <span style={styles.modalSourceTitle}>{d.sourceTitle || '제목 없는 자료'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// KPA styles/theme 와 동일 hex (화면 무변화 보장). 제로-의존 원칙상 인라인 상수.
const C = {
  primary: '#2563EB',
  neutral800: '#1E293B',
  neutral700: '#334155',
  neutral600: '#475569',
  neutral500: '#64748B',
  neutral400: '#94A3B8',
  neutral200: '#E2E8F0',
  neutral50: '#F8FAFC',
  white: '#FFFFFF',
};

const styles: Record<string, CSSProperties> = {
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 60,
    background: 'rgba(15,23,42,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  modalCard: {
    width: '100%',
    maxWidth: '440px',
    maxHeight: '80vh',
    overflowY: 'auto',
    background: C.white,
    borderRadius: '12px',
    boxShadow: '0 24px 60px -20px rgba(15,23,42,0.4)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    borderBottom: `1px solid ${C.neutral200}`,
  },
  modalTitle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 600,
    color: C.neutral800,
  },
  modalClose: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: 'none',
    color: C.neutral400,
    cursor: 'pointer',
    borderRadius: '6px',
  },
  modalBody: {
    padding: '16px 18px',
  },
  modalTargetTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: C.neutral700,
    margin: '0 0 12px',
  },
  modalState: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '20px 0',
    fontSize: '14px',
    color: C.neutral500,
  },
  modalEmpty: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '12px 0',
    fontSize: '14px',
    color: C.neutral600,
  },
  modalEmptySub: {
    fontSize: '12px',
    color: C.neutral400,
    lineHeight: 1.6,
  },
  modalIntro: {
    fontSize: '13px',
    color: C.neutral600,
    margin: '0 0 10px',
  },
  modalList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  modalListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: C.neutral50,
    border: `1px solid ${C.neutral200}`,
    borderRadius: '8px',
  },
  modalSourceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: '4px',
    background: '#EEF2FF',
    color: '#4338CA',
    flexShrink: 0,
  },
  modalSourceTitle: {
    fontSize: '14px',
    color: C.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
