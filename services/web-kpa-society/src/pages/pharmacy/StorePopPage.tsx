/**
 * StorePopPage — POP 편집/출력 화면
 *
 * WO-O4O-POP-LIBRARY-INTEGRATION-V1
 * WO-O4O-QR-POP-AUTO-GENERATOR-V1
 * WO-STORE-POP-ASSET-INTEGRATION-V1
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1:
 *   "신규 제작 시작" 버튼 제거 — 제작 시작은 "내 자료함"에서만 진입.
 * WO-O4O-KPA-POP-PRODUCTION-FLOW-CANONICAL-CORRECTION-V1:
 *   - 라벨/breadcrumb/empty state canonical 통일 (POP)
 *   - dead path 제거: state.selectedLibraryItem, addBtn style
 *   - origin 정렬: library / snapshot / direct 모두 수용 (silent fail 제거)
 *   - PDF 출력은 library origin 한정 (백엔드 제약) — 비대상 항목은 사용자 메시지로 처리
 * WO-O4O-POP-TEMPLATE-WORKFLOW-V1:
 *   - selectedTemplateId 수신 + template metadata 표시
 *   - AI 문구 생성 패널 추가 (AiContentModal, template-aware)
 *   - popAiContent (title/bullets/shortText/longText) 상태 관리
 *   - handleGenerate에 templateId + aiContent 전달
 *
 * 본 페이지 역할:
 *   - 선택된 자료 표시
 *   - template 정보 표시
 *   - AI 문구 생성 (선택)
 *   - QR 연결 (선택)
 *   - layout 선택
 *   - PDF 출력
 */

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import {
  Megaphone, Trash2, ExternalLink, FileDown, QrCode, FolderOpen,
  ChevronDown, ChevronUp, CheckCircle2, LayoutTemplate, Save,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { colors } from '../../styles/theme';
import { getStoreExecutionAsset, getStoreExecutionAssets, deleteStoreExecutionAsset, type StoreExecutionAsset } from '../../api/storeExecutionAssets';
import { getStoreQrCodes } from '../../api/storeQr';
import type { StoreQrCode } from '../../api/storeQr';
// WO-O4O-POP-SAVE-AS-CONTENT-V1: 제작 결과를 재편집 가능한 POP 콘텐츠(store_pops)로 저장
import { createStaffPopPost } from '../../api/popStaff';
import { getStoreSlug } from '../../api/pharmacyInfo';
import { getAccessToken } from '../../contexts/AuthContext';
import { findTemplate } from './productionTemplates';
import type { ProductionTemplate } from './productionTemplates';
import type { ProductionRouterState } from './productionTargets';
import { GuideBackLink } from '@o4o/store-ui-core';

// ─── Types ────────────────────────────────────────────────────────────────────

type PopItemOrigin = 'library' | 'snapshot' | 'direct';

interface PopItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  fileUrl: string | null;
  assetType: string;
  url: string | null;
  origin: PopItemOrigin;
}

/** AI 생성 POP 문구 세트 */
interface PopAiContent {
  title: string;
  bullets: string[];
  shortText: string;
  longText: string;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  file: '파일',
  content: '콘텐츠',
  'external-link': '외부 링크',
};

const ORIGIN_BADGE: Record<PopItemOrigin, { label: string; bg: string; color: string }> = {
  library:  { label: '자료',          bg: '#EFF6FF', color: '#2563EB' },
  snapshot: { label: '커뮤니티 콘텐츠', bg: '#F1F5F9', color: '#475569' },
  direct:   { label: '직접 작성 콘텐츠', bg: '#F0FDF4', color: '#16A34A' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function StorePopPage() {
  const location = useLocation();
  const [popItems, setPopItems] = useState<PopItem[]>([]);

  // WO-O4O-POP-TEMPLATE-WORKFLOW-V1: template 정보
  const [selectedTemplate, setSelectedTemplate] = useState<ProductionTemplate | null>(null);

  // WO-O4O-POP-TEMPLATE-WORKFLOW-V1: AI 생성 문구
  const [popAiContent, setPopAiContent] = useState<PopAiContent | null>(null);
  const [aiPanelExpanded, setAiPanelExpanded] = useState(false);

  // WO-O4O-POP-IMPORT-TO-BUILDER-LINK-V1: 가져온 POP 사본 prefill (router state)
  useEffect(() => {
    const pf = (location.state as { prefillPop?: { title?: string; content?: string; excerpt?: string } } | null)?.prefillPop;
    if (!pf) return;
    const bodyText = (pf.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    setPopAiContent({ title: pf.title || '', bullets: [], shortText: (pf.excerpt || '').trim(), longText: bodyText });
    setAiPanelExpanded(true);
    window.history.replaceState({}, document.title);
  }, [location.state]);

  // QR selection
  const [qrCodes, setQrCodes] = useState<StoreQrCode[]>([]);
  const [selectedQrId, setSelectedQrId] = useState<string>('');

  // Layout + generate
  const [layout, setLayout] = useState<'A4' | 'A5'>('A4');
  const [generating, setGenerating] = useState(false);

  // WO-O4O-KPA-POP-LIST-GENERATED-ASSETS-V1: 생성된 POP PDF 목록(store_execution_assets usage_type='pop')
  const [generatedPops, setGeneratedPops] = useState<StoreExecutionAsset[]>([]);
  const [loadingPops, setLoadingPops] = useState(true);
  const [deletingPopId, setDeletingPopId] = useState<string | null>(null);
  const loadGeneratedPops = useCallback(async () => {
    setLoadingPops(true);
    try {
      const res = await getStoreExecutionAssets({ usageType: 'pop', limit: 50 });
      setGeneratedPops(res?.data?.items ?? []);
    } catch {
      // best-effort — 목록 로드 실패는 생성 흐름을 막지 않는다
    } finally {
      setLoadingPops(false);
    }
  }, []);
  useEffect(() => { loadGeneratedPops(); }, [loadGeneratedPops]);
  const handleDeletePop = useCallback(async (id: string) => {
    if (!confirm('이 POP을 삭제하시겠습니까?')) return;
    setDeletingPopId(id);
    try {
      await deleteStoreExecutionAsset(id);
      setGeneratedPops((prev) => prev.filter((p) => p.id !== id));
      toast.success('POP을 삭제했습니다');
    } catch {
      toast.error('삭제에 실패했습니다');
    } finally {
      setDeletingPopId(null);
    }
  }, []);

  // WO-O4O-POP-SAVE-AS-CONTENT-V1: POP 콘텐츠로 저장
  const [savingContent, setSavingContent] = useState(false);
  const handleSaveAsContent = useCallback(async () => {
    if (!popAiContent) {
      toast.error('저장할 POP 문구가 없습니다. 먼저 AI 문구를 만들거나 가져온 POP으로 시작하세요.');
      return;
    }
    const slug = await getStoreSlug().catch(() => null);
    if (!slug) {
      toast.error('매장 정보를 확인할 수 없습니다');
      return;
    }
    setSavingContent(true);
    try {
      const contentHtml = [
        popAiContent.shortText ? `<p>${popAiContent.shortText}</p>` : '',
        popAiContent.bullets.length ? `<ul>${popAiContent.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : '',
        popAiContent.longText ? `<p>${popAiContent.longText}</p>` : '',
      ].filter(Boolean).join('');
      await createStaffPopPost(slug, {
        title: popAiContent.title || 'POP',
        content: contentHtml,
        excerpt: popAiContent.shortText || undefined,
      });
      toast.success('POP 콘텐츠로 저장되었습니다. 내 매장 POP에서 다시 수정·제작할 수 있습니다.');
    } catch (e: any) {
      toast.error(e?.message || 'POP 콘텐츠 저장에 실패했습니다');
    } finally {
      setSavingContent(false);
    }
  }, [popAiContent]);

  const fetchQrCodes = useCallback(async () => {
    try {
      const res = await getStoreQrCodes({ limit: 100 });
      if (res.success && res.data) {
        setQrCodes(res.data.items);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchQrCodes();
  }, [fetchQrCodes]);

  // 자료 수신 — "내 자료함 → 제작 시작 → POP" 진입의 production state.
  // WO-O4O-POP-TEMPLATE-WORKFLOW-V1: selectedTemplateId도 함께 수신.
  useEffect(() => {
    const state = location.state as ProductionRouterState | null;
    const incoming = state?.production?.source?.items;
    const templateId = state?.production?.selectedTemplateId;

    // template 조회 — 선택된 template 또는 pop-modern 기본값
    const tpl = templateId
      ? findTemplate(templateId)
      : findTemplate('pop-modern');
    if (tpl) setSelectedTemplate(tpl);

    if (!incoming?.length) return;

    let cancelled = false;
    (async () => {
      const fetched: PopItem[] = [];
      const unsupported: string[] = [];

      for (const it of incoming) {
        const origin = (it.origin as PopItemOrigin | undefined) ?? null;
        if (origin === 'library') {
          try {
            const res = await getStoreExecutionAsset(it.id);
            const lib = res.data;
            fetched.push({
              id: lib.id,
              title: lib.title,
              description: lib.description ?? null,
              category: lib.category,
              fileUrl: lib.fileUrl,
              assetType: lib.assetType,
              url: lib.url,
              origin: 'library',
            });
          } catch {
            // 단건 fetch 실패 — 항목 제외
          }
        } else if (origin === 'snapshot' || origin === 'direct') {
          fetched.push({
            id: it.id,
            title: it.title,
            description: it.description ?? null,
            category: null,
            fileUrl: null,
            assetType: 'content',
            url: null,
            origin,
          });
        } else {
          unsupported.push(it.id);
        }
      }

      if (cancelled) return;

      if (fetched.length) {
        setPopItems((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...fetched.filter((f) => !ids.has(f.id))];
        });
      }

      if (unsupported.length) {
        console.warn('[StorePopPage] 지원하지 않는 origin', unsupported);
        toast.error(`${unsupported.length}개 항목은 POP에 사용할 수 없습니다`);
      }
    })();

    window.history.replaceState({}, document.title);
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = (id: string) => {
    setPopItems((prev) => prev.filter((p) => p.id !== id));
  };

  // WO-O4O-KPA-POP-AI-STEP-REMOVE-V1: AI 문구 생성(buildAiInputText/handleAiInsert/AiContentModal) 제거.
  //   popAiContent 는 가져온 POP(prefillPop) 경로에서만 설정된다.

  // ─── PDF 생성 ─────────────────────────────────────────────────────────────

  const apiBase = import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/kpa`
    : '/api/v1/kpa';

  const handleGenerate = async () => {
    // WO-KPA-POP-CONTENT-TO-PDF-GENERATION-V1:
    //   파일형 자료(library)뿐 아니라 콘텐츠(direct/snapshot)도 POP 입력으로 전달.
    //   origin 별로 백엔드 source 필드에 분기 — 백엔드가 id 로 organization 격리 조회한다.
    if (popItems.length === 0) {
      toast.error('POP로 만들 자료를 먼저 선택해 주세요');
      return;
    }
    const libraryItemIds = popItems.filter((p) => p.origin === 'library').map((p) => p.id);
    const directContentItemIds = popItems.filter((p) => p.origin === 'direct').map((p) => p.id);
    const snapshotItemIds = popItems.filter((p) => p.origin === 'snapshot').map((p) => p.id);

    const token = getAccessToken();
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    setGenerating(true);
    try {
      const resp = await fetch(`${apiBase}/pharmacy/pop/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({
          ...(libraryItemIds.length ? { libraryItemIds } : {}),
          ...(directContentItemIds.length ? { directContentItemIds } : {}),
          ...(snapshotItemIds.length ? { snapshotItemIds } : {}),
          qrId: selectedQrId || undefined,
          layout,
          // WO-O4O-POP-TEMPLATE-WORKFLOW-V1: template + AI 문구 전달
          templateId: selectedTemplate?.id,
          ...(popAiContent ? { aiContent: popAiContent } : {}),
          // WO-KPA-POP-RESULT-PERSIST-AND-CONTENT-PDF-PATH-V1:
          // 생성 결과를 내 자료함(매장 제작 자료)에 저장 → 다시 열기/재출력 가능.
          save: true,
          title: popAiContent?.title || popItems[0]?.title || 'POP',
        }),
      });
      if (!resp.ok) throw new Error('Generate failed');
      const result = await resp.json();
      const fileUrl: string | undefined = result?.data?.fileUrl;
      if (!fileUrl) throw new Error('No fileUrl in response');
      window.open(fileUrl, '_blank');
      toast.success('POP가 생성되었습니다. 아래 "생성된 POP" 목록에서 다시 열고 출력할 수 있습니다.');
      // WO-O4O-KPA-POP-LIST-GENERATED-ASSETS-V1: 생성 직후 POP 목록 갱신
      loadGeneratedPops();
    } catch {
      toast.error('POP PDF 생성에 실패했습니다');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link to="/store" style={{ color: colors.neutral400, fontSize: '13px', textDecoration: 'none' }}>
              매장 실행
            </Link>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral600, fontSize: '13px' }}>POP</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={styles.title}>POP</h1>
            {/* WO-O4O-POP-TEMPLATE-WORKFLOW-V1: template 스타일 뱃지 */}
            {selectedTemplate && (
              <span style={styles.templateBadge}>
                <LayoutTemplate size={12} />
                {selectedTemplate.name}
                {selectedTemplate.style ? ` · ${selectedTemplate.style}` : ''}
              </span>
            )}
          </div>
          <p style={styles.subtitle}>선택된 자료에 QR 코드를 연결하여 POP 광고를 PDF로 출력합니다</p>
          <div style={{ marginTop: 8 }}><GuideBackLink to="/guide/features/pop" label="POP 제작 방법" /></div>
          {/* WO-KPA-POP-CONTENT-TO-PDF-GENERATION-V1:
              파일형 자료 + 콘텐츠/매장 제작 자료 모두 POP 입력으로 지원 (Phase 2). */}
          <p
            style={{
              display: 'inline-block',
              fontSize: '12px',
              color: '#1E40AF',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '6px',
              padding: '8px 10px',
              margin: '10px 0 0',
              maxWidth: '600px',
              lineHeight: 1.6,
            }}
          >
            콘텐츠를 선택해 POP를 만들 수 있습니다. 생성한 POP는 아래 <strong>생성된 POP</strong> 목록에서 다시 열고 출력할 수 있습니다.
          </p>
        </div>
      </div>

      {/* WO-O4O-KPA-POP-LIST-GENERATED-ASSETS-V1: 생성된 POP PDF 목록 (store_execution_assets usage_type='pop') */}
      <div style={styles.body}>
        <div style={styles.genPopHeader}>
          <h2 style={styles.genPopTitle}>생성된 POP</h2>
          <Link to="/store/library/contents" style={styles.genPopNewBtn}>
            <FolderOpen size={14} />
            콘텐츠에서 새 POP 만들기
          </Link>
        </div>
        {loadingPops ? (
          <p style={{ color: colors.neutral400, fontSize: 13, padding: '8px 0' }}>불러오는 중…</p>
        ) : generatedPops.length === 0 ? (
          <div style={styles.genPopEmpty}>
            <p style={{ color: colors.neutral500, fontSize: 14, margin: 0 }}>아직 만든 POP이 없습니다.</p>
            <p style={{ color: colors.neutral400, fontSize: 13, marginTop: 4 }}>콘텐츠 목록에서 콘텐츠를 선택해 POP을 만들 수 있습니다.</p>
          </div>
        ) : (
          <div style={styles.genPopList}>
            {generatedPops.map((pop) => (
              <div key={pop.id} style={styles.genPopCard}>
                <div style={styles.genPopInfo}>
                  <span style={styles.genPopName}>{pop.title}</span>
                  <span style={styles.genPopMeta}>
                    {pop.createdAt ? new Date(pop.createdAt).toLocaleDateString('ko-KR') : ''}
                    {pop.mimeType === 'application/pdf' ? ' · PDF' : ''}
                  </span>
                </div>
                <div style={styles.genPopActions}>
                  {pop.fileUrl && (
                    <a href={pop.fileUrl} target="_blank" rel="noreferrer" style={styles.genPopOpenBtn}>
                      <ExternalLink size={13} /> PDF 열기
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeletePop(pop.id)}
                    disabled={deletingPopId === pop.id}
                    style={styles.genPopDelBtn}
                    aria-label="POP 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POP Item List */}
      <div style={styles.body}>
        {popItems.length === 0 ? (
          <div style={styles.emptyState}>
            <Megaphone size={48} style={{ color: colors.neutral300, marginBottom: '12px' }} />
            <p style={{ color: colors.neutral500, fontSize: '14px', margin: 0 }}>
              POP 자료가 없습니다.
            </p>
            <p style={{ color: colors.neutral400, fontSize: '13px', marginTop: '4px' }}>
              내 자료함에서 자료를 선택해 POP를 제작할 수 있습니다.
            </p>
            <Link to="/store/library/contents" style={styles.emptyStateBtn}>
              <FolderOpen size={14} />
              내 자료함 열기
            </Link>
          </div>
        ) : (
          <>
            <div style={styles.list}>
              {popItems.map((item) => {
                const originMeta = ORIGIN_BADGE[item.origin];
                return (
                  <div key={item.id} style={styles.card}>
                    <div style={styles.cardIcon}>
                      <Megaphone size={24} style={{ color: '#f59e0b' }} />
                    </div>
                    <div style={styles.cardInfo}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <p style={styles.cardTitle}>{item.title}</p>
                        <span style={{ ...styles.originBadge, background: originMeta.bg, color: originMeta.color }}>
                          {originMeta.label}
                        </span>
                        {item.origin === 'library' && (
                          <span style={styles.assetTypeBadge}>
                            {ASSET_TYPE_LABELS[item.assetType] || item.assetType}
                          </span>
                        )}
                      </div>
                      {item.category && (
                        <span style={styles.cardCategory}>{item.category}</span>
                      )}
                      {item.assetType === 'external-link' && item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={styles.cardLink}>
                          <ExternalLink size={12} /> {item.url}
                        </a>
                      ) : item.fileUrl ? (
                        <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" style={styles.cardLink}>
                          <ExternalLink size={12} /> URL 열기
                        </a>
                      ) : item.description ? (
                        <p style={styles.cardDescription}>{item.description}</p>
                      ) : null}
                    </div>
                    <button onClick={() => handleRemove(item.id)} style={styles.removeBtn}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* WO-O4O-KPA-POP-AI-STEP-REMOVE-V1: AI 문구 생성 진입점 제거(초안 생성 AI 제거 정책).
                POP 문구는 선택 자료의 제목·설명을 그대로 사용한다. 가져온 POP(prefill) 문구가 있을 때만
                미리보기/저장 패널을 노출한다. (AiContentModal·/api/ai/content·Toolbar AI 정리는 유지.) */}
            {popAiContent && (
              <div style={styles.aiPanel}>
                <div style={styles.aiPanelHeader}>
                  <div style={styles.aiPanelHeaderLeft}>
                    <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                    <span style={styles.aiPanelTitle}>가져온 POP 문구</span>
                    {selectedTemplate && (
                      <span style={styles.aiPanelTemplateBadge}>{selectedTemplate.name} 스타일 적용</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleSaveAsContent}
                      disabled={savingContent}
                      style={styles.aiGenerateBtn}
                      title="POP 콘텐츠로 저장 (내 매장 POP 에서 재편집·재제작)"
                    >
                      <Save size={13} />
                      {savingContent ? '저장 중...' : 'POP 콘텐츠로 저장'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiPanelExpanded((v) => !v)}
                      style={styles.aiExpandBtn}
                    >
                      {aiPanelExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {aiPanelExpanded && (
                  <div style={styles.aiContentPreview}>
                    <div style={styles.aiPreviewRow}>
                      <span style={styles.aiPreviewLabel}>제목</span>
                      <span style={styles.aiPreviewValue}>{popAiContent.title}</span>
                    </div>
                    {popAiContent.shortText && (
                      <div style={styles.aiPreviewRow}>
                        <span style={styles.aiPreviewLabel}>짧은 문구</span>
                        <span style={styles.aiPreviewValue}>{popAiContent.shortText}</span>
                      </div>
                    )}
                    {popAiContent.bullets.length > 0 && (
                      <div style={styles.aiPreviewRow}>
                        <span style={styles.aiPreviewLabel}>핵심 포인트</span>
                        <ul style={styles.aiPreviewBullets}>
                          {popAiContent.bullets.map((b, i) => (
                            <li key={i} style={styles.aiPreviewBulletItem}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {popAiContent.longText && (
                      <div style={styles.aiPreviewRow}>
                        <span style={styles.aiPreviewLabel}>본문</span>
                        <span style={{ ...styles.aiPreviewValue, color: colors.neutral500 }}>{popAiContent.longText}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setPopAiContent(null)}
                      style={styles.aiClearBtn}
                    >
                      문구 제거 (원본 자료로 출력)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Generate Settings */}
            <div style={styles.settingsPanel}>
              <h3 style={styles.settingsTitle}>POP 생성 설정</h3>

              {/* QR Selection */}
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>
                  <QrCode size={14} style={{ marginRight: '6px' }} />
                  QR 코드 연결 (선택사항)
                </label>
                <select
                  value={selectedQrId}
                  onChange={(e) => setSelectedQrId(e.target.value)}
                  style={styles.select}
                >
                  <option value="">QR 코드 없음</option>
                  {qrCodes.map((qr) => (
                    <option key={qr.id} value={qr.id}>
                      {qr.title} (/qr/{qr.slug})
                    </option>
                  ))}
                </select>
              </div>

              {/* Layout Selection */}
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>레이아웃</label>
                <div style={styles.layoutToggle}>
                  <button
                    onClick={() => setLayout('A4')}
                    style={{ ...styles.layoutBtn, ...(layout === 'A4' ? styles.layoutBtnActive : {}) }}
                  >
                    A4 (1장 1개)
                  </button>
                  <button
                    onClick={() => setLayout('A5')}
                    style={{ ...styles.layoutBtn, ...(layout === 'A5' ? styles.layoutBtnActive : {}) }}
                  >
                    A5 (1장 2개)
                  </button>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating || popItems.length === 0}
                style={{ ...styles.generateBtn, opacity: generating ? 0.7 : 1 }}
              >
                <FileDown size={16} />
                {generating
                  ? 'PDF 생성 중...'
                  : `POP PDF 생성 (${popItems.length}개)${popAiContent ? ' · AI 문구 적용' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* WO-O4O-KPA-POP-AI-STEP-REMOVE-V1: POP 문구 AI 생성 모달 진입점 제거 (AiContentModal 컴포넌트는 유지) */}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '900px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  templateBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    background: '#FFF7ED',
    border: '1px solid #FED7AA',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#C2410C',
    fontWeight: 500,
  },
  body: {
    minHeight: '300px',
  },
  // WO-O4O-KPA-POP-LIST-GENERATED-ASSETS-V1
  genPopHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 },
  genPopTitle: { fontSize: 16, fontWeight: 700, color: colors.neutral800, margin: 0 },
  genPopNewBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#EA580C', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, textDecoration: 'none' },
  genPopEmpty: { padding: '24px 16px', border: `1px dashed ${colors.neutral200}`, borderRadius: 12, background: colors.neutral50, textAlign: 'center' },
  genPopList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 },
  genPopCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: `1px solid ${colors.neutral200}`, borderRadius: 10, background: '#fff' },
  genPopInfo: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  genPopName: { fontSize: 14, fontWeight: 600, color: colors.neutral800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  genPopMeta: { fontSize: 12, color: colors.neutral400 },
  genPopActions: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  genPopOpenBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 13, fontWeight: 600, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, textDecoration: 'none' },
  genPopDelBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: `1px solid ${colors.neutral200}`, background: '#fff', borderRadius: 8, color: '#DC2626', cursor: 'pointer' },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    border: `1px dashed ${colors.neutral200}`,
    borderRadius: '12px',
    backgroundColor: colors.neutral50,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '10px',
    backgroundColor: '#fff',
  },
  cardIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  originBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  assetTypeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: '#f0fdf4',
    fontSize: '11px',
    fontWeight: 500,
    color: '#15803d',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  cardCategory: {
    display: 'inline-block',
    marginTop: '4px',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: colors.neutral100,
    fontSize: '11px',
    color: colors.neutral500,
  },
  cardLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '6px',
    fontSize: '12px',
    color: colors.primary,
    textDecoration: 'none',
  },
  cardDescription: {
    fontSize: '12px',
    color: colors.neutral500,
    margin: '6px 0 0',
    lineHeight: 1.5,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  removeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.neutral400,
    cursor: 'pointer',
    borderRadius: '6px',
    flexShrink: 0,
  },
  // ── AI 패널 ──────────────────────────────────────────────────────────────
  aiPanel: {
    marginBottom: '16px',
    padding: '16px',
    border: '1px solid #d1fae5',
    borderRadius: '10px',
    backgroundColor: '#f0fdf4',
  },
  aiPanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiPanelHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  aiPanelTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#15803d',
    display: 'flex',
    alignItems: 'center',
  },
  aiPanelTemplateBadge: {
    fontSize: '11px',
    color: '#6b7280',
    background: '#e5e7eb',
    padding: '1px 7px',
    borderRadius: '8px',
  },
  aiGenerateBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  aiExpandBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: `1px solid #a7f3d0`,
    borderRadius: '6px',
    color: '#15803d',
    cursor: 'pointer',
  },
  aiPanelHint: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '8px 0 0',
    lineHeight: 1.5,
  },
  aiContentPreview: {
    marginTop: '12px',
    padding: '12px',
    background: '#fff',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  aiPreviewRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  aiPreviewLabel: {
    flexShrink: 0,
    width: '70px',
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: 500,
    paddingTop: '2px',
  },
  aiPreviewValue: {
    flex: 1,
    fontSize: '13px',
    color: colors.neutral800,
    lineHeight: 1.5,
  },
  aiPreviewBullets: {
    flex: 1,
    margin: 0,
    paddingLeft: '16px',
    fontSize: '13px',
    color: colors.neutral800,
  },
  aiPreviewBulletItem: {
    lineHeight: 1.6,
  },
  aiClearBtn: {
    alignSelf: 'flex-start',
    marginTop: '4px',
    padding: '4px 0',
    background: 'transparent',
    border: 'none',
    color: '#dc2626',
    fontSize: '11px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  // ── Settings panel ───────────────────────────────────────────────────────
  settingsPanel: {
    padding: '20px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    backgroundColor: '#fff',
  },
  settingsTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 16px',
  },
  settingRow: {
    marginBottom: '16px',
  },
  settingLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral600,
    marginBottom: '6px',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: colors.neutral800,
    backgroundColor: '#fff',
    outline: 'none',
  },
  layoutToggle: {
    display: 'flex',
    gap: '8px',
  },
  layoutBtn: {
    padding: '8px 16px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    backgroundColor: '#fff',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  layoutBtnActive: {
    backgroundColor: colors.primary,
    color: '#fff',
    borderColor: colors.primary,
  },
  generateBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    marginTop: '20px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  emptyStateBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '16px',
    padding: '8px 14px',
    border: `1px solid ${colors.primary}`,
    backgroundColor: '#fff',
    color: colors.primary,
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'pointer',
  },
};
