/**
 * StoreLibraryContentsPage — 내 자료함 / 콘텐츠
 *
 * WO-O4O-STORE-LIBRARY-CONTENTS-TAB-RESTRUCTURE-V1
 *   - 상위 탭: [콘텐츠] [강의]
 *   - 콘텐츠 탭 내부: [문서형] [코스형]
 *
 * 이전 WO 흐름 보존:
 *   WO-O4O-STORE-LIBRARY-CONTENTS-CANONICAL-TABLE-SPLIT-V1
 *   WO-O4O-STORE-LIBRARY-SERVER-PAGINATION-V1: server-side pagination + search
 *   WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1: 가상 type='document' = cms+content 통합
 *   WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: lesson Reference Metadata 노출
 *   WO-O4O-KPA-STORE-LIBRARY-CONTENTS-REMOVE-FLOW-FIX-V1
 *   WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1: duplicate 허용 유지
 *   WO-O4O-STORE-PRODUCTION-MATERIALS-FLOW-RECOVERY-V1: AiContentModal 호출 흐름 복구
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-SELECTOR-MODAL-V1:
 *   기존 페이지 내부에 직접 정의되어 있던 TopTabBar / SubTabBar / DocumentsSection /
 *   LessonsSection 을 StoreContentsSelector 로 추출. 본 페이지와 production-materials
 *   모달이 같은 canonical selector 를 공유한다. 페이지 동작/UX 변경 없음.
 */

import { useState, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, RefreshCw, PenSquare } from 'lucide-react';
import { AiContentModal } from '@o4o/content-editor';
import { storeAssetControlApi } from '../../api/assetSnapshot';
import { getAccessToken } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';
import { StartProductionModal, type ProductionSource, type ProductionSourceItem } from './StartProductionModal';
import { CreateContentFromResourcesModal } from './CreateContentFromResourcesModal';
import { composeSourceTextFromItems } from './productionTargets';
import { StoreContentsSelector } from './StoreContentsSelector';

export default function StoreLibraryContentsPage() {
  const navigate = useNavigate();

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<ProductionSource | null>(null);
  const [createFromResourcesOpen, setCreateFromResourcesOpen] = useState(false);

  // WO-O4O-STORE-PRODUCTION-MATERIALS-FLOW-RECOVERY-V1:
  // AI 흐름은 in-page AiContentModal 호출 → onInsert 시 ProductionMaterialEditorPage 로 결과 HTML 전달.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInitialText, setAiInitialText] = useState('');
  const [aiSourceMetadata, setAiSourceMetadata] = useState<
    { sourceContentId?: string; sourceTitle?: string; sourceOrigin?: string } | null
  >(null);

  const openProduction = useCallback((items: ProductionSourceItem[]) => {
    if (items.length === 0) return;
    setModalSource({ fromLibrary: 'contents', items });
    setModalOpen(true);
  }, []);

  const handleAiAction = useCallback((source: ProductionSource) => {
    const text = composeSourceTextFromItems(source.items);
    const first = source.items[0];
    setAiInitialText(text);
    setAiSourceMetadata(
      first
        ? { sourceContentId: first.id, sourceTitle: first.title, sourceOrigin: first.origin }
        : null,
    );
    setModalOpen(false);
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

  const removeSnapshots = useCallback(async (snapshotIds: string[]): Promise<number> => {
    if (snapshotIds.length === 0) return 0;
    await Promise.all(snapshotIds.map((id) => storeAssetControlApi.updatePublishStatus(id, 'hidden')));
    return snapshotIds.length;
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>
            <span>내 자료함</span>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral700 }}>콘텐츠</span>
          </div>
          <h1 style={styles.title}>
            <BookOpen size={20} style={{ color: colors.primary }} />
            콘텐츠
          </h1>
          <p style={styles.subtitle}>
            콘텐츠(Full Copy 자산)와 강의(LMS 참조 자산)를 함께 관리합니다. 선택 후 "제작 시작"으로 POP / QR / 블로그 / 상품 상세설명을 만들 수 있습니다.
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => setCreateFromResourcesOpen(true)}
            style={styles.createBtn}
          >
            <PenSquare size={14} />
            콘텐츠 제작
          </button>
          <button onClick={reload} style={styles.refreshBtn}>
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      {/* WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-SELECTOR-MODAL-V1:
          공통 selector 를 'page' 모드로 mount — 콘텐츠/강의 탭 + 검색 + 선택 + 제작 시작 + 선택 제거 */}
      <StoreContentsSelector
        reloadKey={reloadKey}
        onStartProduction={openProduction}
        onRemoveSnapshots={removeSnapshots}
        onAfterRemove={reload}
        mode="page"
      />

      <StartProductionModal
        open={modalOpen}
        source={modalSource}
        onClose={() => setModalOpen(false)}
        onAiAction={handleAiAction}
      />

      <CreateContentFromResourcesModal
        open={createFromResourcesOpen}
        onClose={() => setCreateFromResourcesOpen(false)}
        onCreated={reload}
      />

      {/* WO-O4O-STORE-PRODUCTION-MATERIALS-FLOW-RECOVERY-V1
          콘텐츠/강의 선택 → StartProductionModal 의 AI 카드 → 본 모달에서 AI 생성 →
          onInsert 시 ProductionMaterialEditorPage 로 결과 HTML 전달 */}
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1100px',
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
    color: colors.neutral400,
    marginBottom: '6px',
  },
  title: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '20px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '6px 0 0',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  createBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.white,
    cursor: 'pointer',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
};
