/**
 * StoreProductionMaterialsView — 제작 자료 목록 공통 presentational 컴포넌트
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-PAGE-COMPONENT-EXTRACTION-V1
 *
 * GP/KCos `/store/library/production-materials` near-identical 페이지 UI 추출.
 * - UI/레이아웃/액션만 담당. fetch/병합은 서비스 wrapper 가 수행 후 items 주입.
 * - 서비스별 차이(derivations API 경로)는 fetchDerivations prop 으로 주입.
 * - CTA 교차 진입 route(/store/marketing/*, /store/content/blog)는 3서비스 공통 → 내부 보유.
 * - KPA 는 richer 자체 페이지 — 본 컴포넌트 미사용.
 */

import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileEdit, RefreshCw, Link2, Megaphone, QrCode, PenLine, MonitorPlay } from 'lucide-react';
import { StoreAssetDerivationViewer, resultKindToDerivedKind } from './StoreAssetDerivationViewer';
import { GuideBackLink } from './GuideBackLink';
import {
  PRODUCTION_USAGE_LABELS,
  PRODUCTION_ASSET_TYPE_LABELS,
  PRODUCTION_KIND_BADGE,
  PRODUCTION_BLOG_STATUS_LABELS,
  type ProductionMaterialItem,
} from '../utils/productionMaterials';

export interface StoreProductionMaterialsViewProps {
  items: ProductionMaterialItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  /** 원본(derivation) 조회 — 서비스별 API 경로 주입 */
  fetchDerivations: (args: { derivedKind: string; derivedId: string }) => Promise<{ items: any[] }>;
}

// 제작 자료 기반 교차 진입(기존 제작 화면 route 재사용 — 신규 API/DB 없음, 3서비스 공통)
const CROSS_CREATE: { key: string; label: string; icon: typeof Megaphone; to: string }[] = [
  { key: 'pop', label: 'POP 만들기', icon: Megaphone, to: '/store/marketing/pop' },
  { key: 'qr', label: 'QR-code 만들기', icon: QrCode, to: '/store/marketing/qr' },
  { key: 'blog', label: '블로그 글쓰기', icon: PenLine, to: '/store/content/blog' },
  { key: 'signage', label: '사이니지에 추가', icon: MonitorPlay, to: '/store/marketing/signage/playlist' },
];

export function StoreProductionMaterialsView({
  items,
  loading,
  error,
  onRefresh,
  fetchDerivations,
}: StoreProductionMaterialsViewProps) {
  const navigate = useNavigate();
  const [derivTarget, setDerivTarget] = useState<
    { id: string; title: string; kind: 'pop' | 'blog'; kindLabel: string } | null
  >(null);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>
            <span>내 자료함</span>
            <span style={{ color: '#94a3b8' }}>/</span>
            <span style={{ color: '#334155' }}>제작 자료</span>
          </div>
          <h1 style={styles.title}>
            <FileEdit size={20} style={{ color: '#3b82f6' }} />
            제작 자료
          </h1>
          <p style={styles.subtitle}>
            POP·QR·블로그·상품 상세설명 등 매장 실행 자산을 관리합니다.
          </p>
          <div style={{ marginTop: 8 }}>
            <GuideBackLink to="/guide/features/production-materials" label="제작 자료 활용 방법" />
          </div>
        </div>
        <button onClick={onRefresh} style={styles.refreshBtn} disabled={loading}>
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* cross-create CTA — 제작 자료에서 POP/QR/블로그/사이니지 제작 화면으로 진입 */}
      <div style={styles.ctaBar}>
        {CROSS_CREATE.map(({ key, label, icon: Icon, to }) => (
          <button key={key} style={styles.ctaBtn} onClick={() => navigate(to)}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.empty}>
          <p style={{ color: '#64748b', fontSize: 14 }}>불러오는 중...</p>
        </div>
      ) : error ? (
        <div style={styles.empty}>
          <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>{error}</p>
          <button onClick={onRefresh} style={{ ...styles.refreshBtn, marginTop: 12 }}>
            다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div style={styles.empty}>
          <FileEdit size={36} style={{ color: '#cbd5e1', marginBottom: 14 }} />
          <p style={{ margin: 0, color: '#475569', fontSize: 15, fontWeight: 500 }}>
            저장된 제작 자료가 없습니다.
          </p>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
            위 만들기 버튼 또는 내 자료함 → 콘텐츠에서 제작 작업을 시작하세요.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <AssetRow
              key={`${item.kind}-${item.id}`}
              item={item}
              onViewSource={(it) =>
                setDerivTarget({
                  id: it.id,
                  title: it.title,
                  kind: it.derivedResultKind,
                  kindLabel: it.kind === 'blog' ? '블로그' : 'POP',
                })
              }
            />
          ))}
        </div>
      )}

      {derivTarget && (
        <StoreAssetDerivationViewer
          open
          onClose={() => setDerivTarget(null)}
          derivedKind={resultKindToDerivedKind(derivTarget.kind)}
          derivedId={derivTarget.id}
          title={derivTarget.title}
          kindLabel={derivTarget.kindLabel}
          fetchDerivations={fetchDerivations}
        />
      )}
    </div>
  );
}

function AssetRow({
  item,
  onViewSource,
}: {
  item: ProductionMaterialItem;
  onViewSource: (item: ProductionMaterialItem) => void;
}) {
  const kindBadge = PRODUCTION_KIND_BADGE[item.kind];
  const usageLabel = item.usageType ? (PRODUCTION_USAGE_LABELS[item.usageType] ?? item.usageType) : null;
  const typeLabel = item.assetType ? (PRODUCTION_ASSET_TYPE_LABELS[item.assetType] ?? item.assetType) : null;
  const statusLabel = item.status ? (PRODUCTION_BLOG_STATUS_LABELS[item.status] ?? item.status) : null;
  const date = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : '—';
  // 원본 보기: POP 결과물(material+usageType=pop) 또는 블로그 결과물
  const canViewSource = (item.kind === 'material' && item.usageType === 'pop') || item.kind === 'blog';

  return (
    <div style={styles.row}>
      <div style={styles.rowMain}>
        <div style={styles.rowTitle}>{item.title}</div>
        <div style={styles.rowMeta}>
          <span style={{ ...styles.badge, background: kindBadge.bg, color: kindBadge.fg }}>{kindBadge.label}</span>
          {typeLabel && <span style={styles.badge}>{typeLabel}</span>}
          {usageLabel && (
            <span style={{ ...styles.badge, background: '#f0fdf4', color: '#16a34a' }}>{usageLabel}</span>
          )}
          {statusLabel && <span style={{ ...styles.badge, background: '#f1f5f9', color: '#475569' }}>{statusLabel}</span>}
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{date}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {canViewSource && (
          <button style={styles.viewSourceBtn} title="원본 보기" onClick={() => onViewSource(item)}>
            <Link2 size={13} />
            원본 보기
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: { padding: '24px', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' },
  title: { display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 600, color: '#1e293b', margin: 0 },
  subtitle: { fontSize: '13px', color: '#64748b', margin: '6px 0 0' },
  refreshBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer', flexShrink: 0 },
  ctaBar: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' },
  ctaBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: '#334155', cursor: 'pointer' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' },
  list: { display: 'flex', flexDirection: 'column', gap: '6px' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' },
  rowMain: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 },
  rowTitle: { fontSize: '14px', fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowMeta: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '2px 6px', fontSize: '11px', fontWeight: 500, background: '#eff6ff', color: '#2563eb', borderRadius: '4px' },
  viewSourceBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' },
};
