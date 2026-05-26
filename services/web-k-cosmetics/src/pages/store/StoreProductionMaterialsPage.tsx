/**
 * StoreProductionMaterialsPage — K-Cosmetics 내 자료함 / 제작 자료
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-CROSSSERVICE-PHASE2-C-V1: 기본 진입 구조
 * WO-O4O-STORE-EXECUTION-ASSETS-CROSSSERVICE-PHASE2-D-V1: store_execution_assets 기반 목록형 전환
 *
 * Phase 2-D 범위: store_execution_assets 목록 표시.
 * directContentApi(kpa_store_contents) 병합은 후속 WO 대상.
 * AI 생성·POP/QR 연결은 후속 WO 대상.
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { FileEdit, RefreshCw, Trash2 } from 'lucide-react';
import { getStoreExecutionAssets, type StoreExecutionAsset } from '../../api/storeExecutionAssets';

const USAGE_LABELS: Record<string, string> = {
  pop: 'POP',
  qr: 'QR 코드',
  signage: '사이니지',
  banner: '배너',
  notice: '공지',
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  file: '파일',
  content: '콘텐츠',
  'external-link': '외부 링크',
};

export default function StoreProductionMaterialsPage() {
  const [items, setItems] = useState<StoreExecutionAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStoreExecutionAssets({ limit: 100 });
      setItems(res.data?.items ?? []);
    } catch (e: any) {
      setError(e?.message || '불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

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
        </div>
        <button onClick={fetchItems} style={styles.refreshBtn} disabled={loading}>
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {loading ? (
        <div style={styles.empty}>
          <p style={{ color: '#64748b', fontSize: 14 }}>불러오는 중...</p>
        </div>
      ) : error ? (
        <div style={styles.empty}>
          <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>{error}</p>
          <button onClick={fetchItems} style={{ ...styles.refreshBtn, marginTop: 12 }}>
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
            내 자료함 → 콘텐츠에서 콘텐츠를 선택한 뒤 제작 작업을 시작하세요.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <AssetRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetRow({ item }: { item: StoreExecutionAsset }) {
  const usageLabel = item.usageType ? (USAGE_LABELS[item.usageType] ?? item.usageType) : '—';
  const typeLabel = ASSET_TYPE_LABELS[item.assetType] ?? item.assetType;
  const date = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : '—';

  return (
    <div style={styles.row}>
      <div style={styles.rowMain}>
        <div style={styles.rowTitle}>{item.title}</div>
        <div style={styles.rowMeta}>
          <span style={styles.badge}>{typeLabel}</span>
          {item.usageType && (
            <span style={{ ...styles.badge, background: '#f0fdf4', color: '#16a34a' }}>
              {usageLabel}
            </span>
          )}
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{date}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button style={styles.actionBtn} title="삭제" disabled>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  title: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: '6px 0 0',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#475569',
    cursor: 'pointer',
    flexShrink: 0,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    textAlign: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px 14px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  },
  rowMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: 500,
    background: '#eff6ff',
    color: '#2563eb',
    borderRadius: '4px',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'not-allowed',
    borderRadius: '4px',
    opacity: 0.5,
  },
};
