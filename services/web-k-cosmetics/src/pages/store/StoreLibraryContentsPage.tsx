/**
 * StoreLibraryContentsPage — K-Cosmetics 내 자료함 / 콘텐츠
 *
 * WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1
 *
 * HUB에서 가져온 콘텐츠 스냅샷 목록 (기본 진입 구조).
 * Phase 2-B 범위: 목록 표시만. AI 생성·제작 흐름은 후속 WO 대상.
 *
 * API: assetSnapshotApi.list({ type: 'content' }) → /cosmetics/assets?type=content
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { BookOpen, RefreshCw, ExternalLink } from 'lucide-react';
import { assetSnapshotApi, type AssetSnapshotItem } from '../../api/assetSnapshot';

export default function StoreLibraryContentsPage() {
  const [items, setItems] = useState<AssetSnapshotItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await assetSnapshotApi.list({ type: 'content', limit: 100 });
      setItems(res.data?.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>
            <span>내 자료함</span>
            <span style={{ color: '#94a3b8' }}>/</span>
            <span style={{ color: '#334155' }}>콘텐츠</span>
          </div>
          <h1 style={styles.title}>
            <BookOpen size={20} style={{ color: '#3b82f6' }} />
            콘텐츠
          </h1>
          <p style={styles.subtitle}>
            HUB에서 가져온 콘텐츠를 보관합니다. 콘텐츠를 선택해 POP·QR·블로그 제작에 활용할 수 있습니다.
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
      ) : items.length === 0 ? (
        <div style={styles.empty}>
          <BookOpen size={32} style={{ color: '#cbd5e1', marginBottom: 12 }} />
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            보관된 콘텐츠가 없습니다.
          </p>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>
            HUB에서 콘텐츠를 가져오면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <ContentRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContentRow({ item }: { item: AssetSnapshotItem }) {
  const sourceLabel = item.sourceService ?? '—';
  const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : '—';
  const contentUrl = (item.contentJson as Record<string, unknown>)?.url as string | undefined;

  return (
    <div style={styles.row}>
      <div style={styles.rowMain}>
        <div style={styles.rowTitle}>{item.title}</div>
        <div style={styles.rowMeta}>
          <span style={styles.badge}>{sourceLabel}</span>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{date}</span>
        </div>
      </div>
      {contentUrl && (
        <a
          href={contentUrl}
          target="_blank"
          rel="noreferrer"
          style={styles.actionBtn}
          title="원본 열기"
        >
          <ExternalLink size={14} />
        </a>
      )}
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
    color: '#64748b',
    borderRadius: '4px',
    textDecoration: 'none',
    flexShrink: 0,
  },
};
