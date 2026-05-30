/**
 * StoreLibraryContentsPage — K-Cosmetics 내 자료함 / 콘텐츠
 *
 * WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1: 기본 진입 구조
 * WO-O4O-STORE-LIBRARY-CONTENT-TO-EXECUTION-PHASE2-E-V1: POP/QR 제작 시작 액션 추가
 * WO-O4O-START-PRODUCTION-MODAL-SHARED-COMPONENT-PHASE2-H-V1:
 *   드롭다운 → 공통 StartProductionModal 전환.
 *   target config: POP/QR 2개.
 * WO-O4O-PRODUCTION-AI-EDITOR-CROSSSERVICE-PHASE2-I-V1:
 *   onAiAction 연결 — AiContentModal → ProductionMaterialEditorPage 흐름 추가.
 * WO-O4O-PRODUCTION-TEMPLATE-REGISTRY-CROSSSERVICE-PHASE2-J-V1:
 *   supportsTemplates: true + getTemplates 연결 — K-Cosmetics 전용 POP/QR 템플릿 registry.
 *
 * API: assetSnapshotApi.list({ type: 'content' }) → /cosmetics/assets?type=content
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, RefreshCw, Megaphone, QrCode } from 'lucide-react';
import { AiContentModal } from '@o4o/content-editor';
import { getAccessToken } from '@o4o/auth-client';
import { assetSnapshotApi, type AssetSnapshotItem } from '../../api/assetSnapshot';
import {
  StartProductionModal,
  type StartProductionTargetConfig,
  type ProductionSource,
  composeSourceTextFromItems,
} from '@o4o/store-ui-core';
import { getTemplatesForTarget } from '../../config/productionTemplates';

const COSMETICS_PRODUCTION_TARGETS: StartProductionTargetConfig[] = [
  {
    key: 'pop',
    label: 'POP',
    Icon: Megaphone,
    iconColor: '#f59e0b',
    route: '/store/marketing/pop',
    supportsTemplates: true,
    defaultTemplateId: 'kcos-pop-beauty-expert',
  },
  {
    key: 'qr',
    label: 'QR 코드',
    Icon: QrCode,
    iconColor: '#0ea5e9',
    route: '/store/marketing/qr',
    supportsTemplates: true,
    defaultTemplateId: 'kcos-qr-usage-guide',
  },
];

export default function StoreLibraryContentsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AssetSnapshotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [productionSource, setProductionSource] = useState<ProductionSource | null>(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiInitialText, setAiInitialText] = useState('');
  const [aiSourceMetadata, setAiSourceMetadata] = useState<
    { sourceContentId?: string; sourceTitle?: string; sourceOrigin?: string } | null
  >(null);

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

  const handleOpenProduction = (item: AssetSnapshotItem) => {
    setProductionSource({
      fromLibrary: 'contents',
      items: [{
        id: item.id,
        title: item.title,
        description: (item.contentJson as Record<string, unknown>)?.description as string | null ?? null,
        origin: 'snapshot',
      }],
    });
  };

  const handleAiAction = useCallback((source: ProductionSource) => {
    const text = composeSourceTextFromItems(source.items);
    const first = source.items[0];
    setAiInitialText(text);
    setAiSourceMetadata(
      first
        ? { sourceContentId: first.id, sourceTitle: first.title, sourceOrigin: first.origin }
        : null,
    );
    setProductionSource(null);
    setAiOpen(true);
  }, []);

  const handleAiInsert = useCallback(
    (data: { html: string; title: string }) => {
      setAiOpen(false);
      navigate('/store/library/production-materials/new', {
        state: {
          generatedHtml: data.html,
          title: data.title || undefined,
          sourceMetadata: aiSourceMetadata ?? undefined,
        },
      });
    },
    [navigate, aiSourceMetadata],
  );

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
              onStartProduction={() => handleOpenProduction(item)}
            />
          ))}
        </div>
      )}

      <StartProductionModal
        open={!!productionSource}
        source={productionSource}
        targets={COSMETICS_PRODUCTION_TARGETS}
        onClose={() => setProductionSource(null)}
        onAiAction={handleAiAction}
        getTemplates={getTemplatesForTarget}
      />

      <AiContentModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={null}
        onInsert={handleAiInsert}
        initialText={aiInitialText}
        headerLabel="AI 매장 제작 자료 초안"
        aiRequestHeaders={(() => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })()}
      />
    </div>
  );
}

function ContentRow({
  item,
  onStartProduction,
}: {
  item: AssetSnapshotItem;
  onStartProduction: () => void;
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

      <button onClick={onStartProduction} style={styles.startBtn}>
        제작 시작
      </button>
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
    flexShrink: 0,
  },
};
