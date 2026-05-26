/**
 * StoreLibraryContentsPage — GlycoPharm 내 자료함 / 콘텐츠
 *
 * WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1: 기본 진입 구조
 * WO-O4O-STORE-LIBRARY-CONTENT-TO-EXECUTION-PHASE2-E-V1: POP/QR 제작 시작 액션 추가
 *
 * API: assetSnapshotApi.list({ type: 'content' }) → /glycopharm/assets?type=content
 * 제작 시작: 항목별 POP/QR 버튼 → navigate('/store/pop' | '/store/qr') with ProductionRouterState
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, RefreshCw, Megaphone, QrCode } from 'lucide-react';
import { assetSnapshotApi, type AssetSnapshotItem } from '@/api/assetSnapshot';
import type { ProductionRouterState } from '@/types/production';

export default function StoreLibraryContentsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AssetSnapshotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionOpenId, setActionOpenId] = useState<string | null>(null);

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

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleStartProduction = (item: AssetSnapshotItem, target: 'pop' | 'qr') => {
    const state: ProductionRouterState = {
      production: {
        source: {
          fromLibrary: 'contents',
          items: [{
            id: item.id,
            title: item.title,
            description: (item.contentJson as Record<string, unknown>)?.description as string | null ?? null,
            origin: 'snapshot',
          }],
        },
        target,
      },
    };
    setActionOpenId(null);
    navigate(`/store/${target}`, { state });
  };

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
            HUB에서 가져온 콘텐츠를 보관합니다. 항목을 선택해 POP·QR 제작에 활용할 수 있습니다.
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
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>보관된 콘텐츠가 없습니다.</p>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>
            HUB에서 콘텐츠를 가져오면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <ContentRow
              key={item.id}
              item={item}
              actionOpen={actionOpenId === item.id}
              onToggleAction={() => setActionOpenId(actionOpenId === item.id ? null : item.id)}
              onStartProduction={(target) => handleStartProduction(item, target)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContentRow({
  item,
  actionOpen,
  onToggleAction,
  onStartProduction,
}: {
  item: AssetSnapshotItem;
  actionOpen: boolean;
  onToggleAction: () => void;
  onStartProduction: (target: 'pop' | 'qr') => void;
}) {
  const sourceLabel = item.sourceService ?? '—';
  const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : '—';

  return (
    <div style={styles.row}>
      <div style={styles.rowMain}>
        <div style={styles.rowTitle}>{item.title}</div>
        <div style={styles.rowMeta}>
          <span style={styles.badge}>{sourceLabel}</span>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{date}</span>
        </div>
      </div>

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={onToggleAction}
          style={styles.startBtn}
          title="제작 시작"
        >
          제작 시작 ▾
        </button>

        {actionOpen && (
          <div style={styles.dropdown}>
            <button
              onClick={() => onStartProduction('pop')}
              style={styles.dropdownItem}
            >
              <Megaphone size={14} style={{ color: '#ea580c' }} />
              POP 만들기
            </button>
            <button
              onClick={() => onStartProduction('qr')}
              style={styles.dropdownItem}
            >
              <QrCode size={14} style={{ color: '#0891b2' }} />
              QR 만들기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: { padding: '24px', maxWidth: '900px', margin: '0 auto' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: '16px', marginBottom: '20px', flexWrap: 'wrap',
  },
  breadcrumb: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '13px', color: '#94a3b8', marginBottom: '6px',
  },
  title: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    fontSize: '20px', fontWeight: 600, color: '#1e293b', margin: 0,
  },
  subtitle: { fontSize: '13px', color: '#64748b', margin: '6px 0 0' },
  refreshBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px',
    fontSize: '13px', color: '#475569', cursor: 'pointer', flexShrink: 0,
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '64px 24px', background: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: '8px', textAlign: 'center',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '6px' },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '12px', padding: '12px 14px', background: '#ffffff',
    border: '1px solid #e2e8f0', borderRadius: '8px',
  },
  rowMain: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: '14px', fontWeight: 500, color: '#1e293b',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  rowMeta: { display: 'flex', alignItems: 'center', gap: '8px' },
  badge: {
    display: 'inline-flex', alignItems: 'center', padding: '2px 6px',
    fontSize: '11px', fontWeight: 500, background: '#eff6ff', color: '#2563eb', borderRadius: '4px',
  },
  startBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer', fontWeight: 500,
  },
  dropdown: {
    position: 'absolute', right: 0, top: 'calc(100% + 4px)',
    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100,
    minWidth: '140px', overflow: 'hidden',
  },
  dropdownItem: {
    display: 'flex', alignItems: 'center', gap: '8px',
    width: '100%', padding: '10px 14px', background: 'transparent', border: 'none',
    textAlign: 'left', fontSize: '13px', color: '#334155', cursor: 'pointer', fontWeight: 500,
  },
};
