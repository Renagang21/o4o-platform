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
 *
 * WO-O4O-KPA-CONTENT-CREATION-AI-ENTRY-REMOVE-V1:
 *   페이지형 AI 진입 제거 — StartProductionModal 의 AI 카드(onAiAction 미전달로 숨김) +
 *   in-page AiContentModal("AI 매장 제작 자료 초안") 제거. 콘텐츠 선택·복사, 제작 시작(POP/QR/
 *   블로그/상품설명), 빈 편집기 콘텐츠 제작(CreateContentFromResourcesModal)은 보존.
 *   공통 StartProductionModal(@o4o/store-ui-core)은 미변경 — GP/KCos 무영향.
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-SELECTOR-MODAL-V1:
 *   기존 페이지 내부에 직접 정의되어 있던 TopTabBar / SubTabBar / DocumentsSection /
 *   LessonsSection 을 StoreContentsSelector 로 추출. 본 페이지와 production-materials
 *   모달이 같은 canonical selector 를 공유한다. 페이지 동작/UX 변경 없음.
 */

import { useState, useCallback, type CSSProperties } from 'react';
import { BookOpen, RefreshCw, PenSquare, Lightbulb } from 'lucide-react';
// WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATION-GUIDE-MODAL-V1: 콘텐츠 제작 가이드(안내 UI)
import { ContentCreationGuideModal } from './ContentCreationGuideModal';
import { storeAssetControlApi } from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';
import { StartProductionModal, type ProductionSource, type ProductionSourceItem } from './StartProductionModal';
import { CreateContentFromResourcesModal } from './CreateContentFromResourcesModal';
import { StoreContentsSelector } from './StoreContentsSelector';

export default function StoreLibraryContentsPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<ProductionSource | null>(null);
  const [createFromResourcesOpen, setCreateFromResourcesOpen] = useState(false);
  // WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATION-GUIDE-MODAL-V1
  const [guideOpen, setGuideOpen] = useState(false);

  const openProduction = useCallback((items: ProductionSourceItem[]) => {
    if (items.length === 0) return;
    setModalSource({ fromLibrary: 'contents', items });
    setModalOpen(true);
  }, []);

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
            콘텐츠(Full Copy 자산)와 강의(LMS 참조 자산)를 함께 관리합니다. 콘텐츠를 선택하면 하단 작업막대에서 필요한 제작 기능을 사용할 수 있습니다.
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
          {/* WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATION-GUIDE-MODAL-V1: 보조 버튼(가이드 모달) */}
          <button type="button" onClick={() => setGuideOpen(true)} style={styles.guideBtn}>
            <Lightbulb size={14} />
            콘텐츠 제작 가이드
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
        // WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1: 선택 작업 영역에 인쇄용 PDF 만들기
        enablePdfExport
      />

      <StartProductionModal
        open={modalOpen}
        source={modalSource}
        onClose={() => setModalOpen(false)}
      />

      <CreateContentFromResourcesModal
        open={createFromResourcesOpen}
        onClose={() => setCreateFromResourcesOpen(false)}
        onCreated={reload}
      />

      {/* WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATION-GUIDE-MODAL-V1 */}
      <ContentCreationGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
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
  // WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATION-GUIDE-MODAL-V1: 보조(outline) 버튼
  guideBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: colors.white,
    border: `1px solid ${colors.primary}`,
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.primary,
    cursor: 'pointer',
  },
};
