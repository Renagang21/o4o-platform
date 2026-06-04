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
import { BookOpen, RefreshCw, PenSquare, Megaphone, QrCode, PenLine, MonitorPlay } from 'lucide-react';
import { AiContentModal } from '@o4o/content-editor';
import { storeAssetControlApi } from '../../api/assetSnapshot';
import { getAccessToken } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';
import { StartProductionModal, type ProductionSource, type ProductionSourceItem } from './StartProductionModal';
import { CreateContentFromResourcesModal } from './CreateContentFromResourcesModal';
import { composeSourceTextFromItems } from './productionTargets';
import { StoreContentsSelector } from './StoreContentsSelector';

// ─── WO-KPA-STORE-CONTENT-LIBRARY-CROSS-CREATE-CTA-V1 ─────────────────────────
// 콘텐츠를 기반으로 POP·QR·블로그·사이니지 제작 화면으로 바로 이동(교차 진입).
// 기존 제작 화면(route)만 재사용 — 신규 API/DB 없음. (IR Phase 1)
const QUICK_CREATE: { key: string; label: string; icon: typeof Megaphone; to: string }[] = [
  { key: 'pop',     label: 'POP 만들기',      icon: Megaphone,   to: '/store/marketing/pop' },
  { key: 'qr',      label: 'QR-code 만들기',  icon: QrCode,      to: '/store/marketing/qr' },
  { key: 'blog',    label: '블로그 글쓰기',    icon: PenLine,     to: '/store/content/blog' },
  { key: 'signage', label: '사이니지에 추가',  icon: MonitorPlay, to: '/store/marketing/signage/playlist' },
];

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

      {/* WO-KPA-STORE-CONTENT-LIBRARY-CROSS-CREATE-CTA-V1: 재사용 안내 + 바로 만들기 진입 */}
      <div style={styles.useBanner}>
        <p style={styles.useBannerText}>
          내 자료함의 콘텐츠는 보관용이 아니라 <strong>POP · QR-code · 블로그 · 사이니지</strong> 제작에 다시 활용할 수 있는 원본입니다.
          항목을 선택해 "제작 시작"으로 만들거나, 아래에서 제작 화면으로 바로 이동하세요.
        </p>
        <div style={styles.useBannerActions}>
          {QUICK_CREATE.map((c) => {
            const Icon = c.icon;
            return (
              <button key={c.key} type="button" onClick={() => navigate(c.to)} style={styles.useChip}>
                <Icon size={13} />
                {c.label}
              </button>
            );
          })}
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
  useBanner: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px 14px',
    background: '#EFF6FF',
    border: '1px solid #DBEAFE',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  useBannerText: {
    fontSize: '13px',
    color: colors.neutral600,
    lineHeight: 1.6,
    margin: 0,
  },
  useBannerActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  useChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral700,
    cursor: 'pointer',
  },
};
