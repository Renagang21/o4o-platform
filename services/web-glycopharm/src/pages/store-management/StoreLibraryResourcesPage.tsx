/**
 * StoreLibraryResourcesPage — GlycoPharm 내 자료함 / 자료
 *
 * WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1
 *
 * 콘텐츠를 만들 때 참고할 원소스 자료를 보관합니다.
 * Phase 2-B 범위: 목록 표시만. 자료 등록·삭제·AI 연동은 후속 WO 대상.
 *
 * API: getStoreLibraryItems() → /glycopharm/pharmacy/library
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { Library, RefreshCw, ExternalLink, FileText, FileDown, Link as LinkIcon } from 'lucide-react';
import { getStoreLibraryItems, type StoreLibraryItem } from '@/api/storeLibrary';

function getItemIcon(mimeType: string | null, fileName: string | null) {
  const mime = mimeType?.toLowerCase() ?? '';
  const name = fileName?.toLowerCase() ?? '';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return FileDown;
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) return FileText;
  return FileText;
}

export default function StoreLibraryResourcesPage() {
  const [items, setItems] = useState<StoreLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStoreLibraryItems({ limit: 100 });
      setItems((res.data?.items ?? []).filter((it) => it.isActive));
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
            <span style={{ color: '#334155' }}>자료</span>
          </div>
          <h1 style={styles.title}>
            <Library size={20} style={{ color: '#3b82f6' }} />
            자료
          </h1>
          <p style={styles.subtitle}>
            콘텐츠를 만들 때 참고할 원소스 자료를 보관합니다.
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
          <Library size={32} style={{ color: '#cbd5e1', marginBottom: 12 }} />
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            등록된 자료가 없습니다.
          </p>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>
            커뮤니티 자료실 또는 공급자 라이브러리에서 자료를 가져올 수 있습니다.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <ResourceRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceRow({ item }: { item: StoreLibraryItem }) {
  const Icon = getItemIcon(item.mimeType, item.fileName);
  const date = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : '—';
  const href = item.fileUrl ?? undefined;

  return (
    <div style={styles.row}>
      <Icon size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
      <div style={styles.rowMain}>
        <div style={styles.rowTitle}>{item.title}</div>
        <div style={styles.rowMeta}>
          {item.category && (
            <span style={styles.badge}>{item.category}</span>
          )}
          {item.description && (
            <span style={styles.descText}>{item.description}</span>
          )}
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{date}</span>
        </div>
      </div>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          style={styles.actionBtn}
          title="원본 열기"
        >
          {item.mimeType?.startsWith('http') ? (
            <LinkIcon size={14} />
          ) : (
            <ExternalLink size={14} />
          )}
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
    background: '#f1f5f9',
    color: '#475569',
    borderRadius: '4px',
  },
  descText: {
    fontSize: '12px',
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '300px',
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
