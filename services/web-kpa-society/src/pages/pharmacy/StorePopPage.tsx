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
  Sparkles, ChevronDown, ChevronUp, CheckCircle2, LayoutTemplate,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { AiContentModal } from '@o4o/content-editor';
import { colors } from '../../styles/theme';
import { getStoreExecutionAsset } from '../../api/storeExecutionAssets';
import { getStoreQrCodes } from '../../api/storeQr';
import type { StoreQrCode } from '../../api/storeQr';
import { getAccessToken } from '../../contexts/AuthContext';
import { findTemplate } from './productionTemplates';
import type { ProductionTemplate } from './productionTemplates';
import type { ProductionRouterState } from './productionTargets';

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
  const [aiOpen, setAiOpen] = useState(false);
  const [popAiContent, setPopAiContent] = useState<PopAiContent | null>(null);
  const [aiPanelExpanded, setAiPanelExpanded] = useState(false);

  // QR selection
  const [qrCodes, setQrCodes] = useState<StoreQrCode[]>([]);
  const [selectedQrId, setSelectedQrId] = useState<string>('');

  // Layout + generate
  const [layout, setLayout] = useState<'A4' | 'A5'>('A4');
  const [generating, setGenerating] = useState(false);

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

  // ─── AI 문구 생성 ──────────────────────────────────────────────────────────

  /** items에서 AI 입력용 텍스트 조합 */
  const buildAiInputText = (): string => {
    if (popItems.length === 0) return '';
    const lines = ['다음 자료를 참고하여 POP 인쇄물용 문구 세트를 만들어 주세요.', ''];
    popItems.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.title}`);
      if (item.description) lines.push(`   설명: ${item.description}`);
    });
    return lines.join('\n').trim();
  };

  /** AiContentModal onInsert 콜백 */
  const handleAiInsert = useCallback((data: { html: string; title: string }) => {
    // AiContentModal의 onInsert는 html + title만 보내므로,
    // result 전체는 모달 내부에서 소비됨.
    // 여기서는 data.html을 파싱해 title/bullets/shortText/longText 추출.
    setAiOpen(false);
    // html에서 구조 파싱 (POP AI output은 title/bullets/shortText/longText가 html로 조합되어 있음)
    // 단순하게 title과 html을 그대로 저장하고, bullets는 html의 <li> 항목으로 추출.
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.html, 'text/html');
    const bullets = Array.from(doc.querySelectorAll('li')).map((li) => li.textContent?.trim() || '').filter(Boolean);
    const paragraphs = Array.from(doc.querySelectorAll('p')).map((p) => p.textContent?.trim() || '').filter(Boolean);

    setPopAiContent({
      title: data.title || paragraphs[0] || '',
      bullets: bullets.slice(0, 3),
      shortText: paragraphs[0] || '',
      longText: paragraphs.slice(0, 3).join(' '),
    });
    setAiPanelExpanded(true);
    toast.success('AI 문구가 생성되었습니다. 내용을 확인하고 PDF를 출력하세요.');
  }, []);

  // ─── PDF 생성 ─────────────────────────────────────────────────────────────

  const apiBase = import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/kpa`
    : '/api/v1/kpa';

  const handleGenerate = async () => {
    const libraryItems = popItems.filter((p) => p.origin === 'library');
    const otherCount = popItems.length - libraryItems.length;

    if (libraryItems.length === 0) {
      toast.error('PDF 출력은 "내 자료함 → 자료" 항목만 지원합니다');
      return;
    }
    if (otherCount > 0) {
      toast(`콘텐츠 항목 ${otherCount}개는 PDF 출력에서 제외됩니다`);
    }

    const token = getAccessToken();
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    setGenerating(true);
    try {
      const resp = await fetch(`${apiBase}/pharmacy/pop/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({
          libraryItemIds: libraryItems.map((p) => p.id),
          qrId: selectedQrId || undefined,
          layout,
          // WO-O4O-POP-TEMPLATE-WORKFLOW-V1: template + AI 문구 전달
          templateId: selectedTemplate?.id,
          ...(popAiContent ? { aiContent: popAiContent } : {}),
        }),
      });
      if (!resp.ok) throw new Error('Generate failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
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
          {/* WO-KPA-STORE-CONTENT-LIBRARY-CROSS-CREATE-CTA-V1:
              PDF 제약을 토스트에만 의존하지 않고 화면에서 사전 안내 (IR Phase 1) */}
          <p
            style={{
              display: 'inline-block',
              fontSize: '12px',
              color: '#92400E',
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '6px',
              padding: '8px 10px',
              margin: '10px 0 0',
              maxWidth: '560px',
              lineHeight: 1.6,
            }}
          >
            PDF 출력은 현재 <strong>내 자료함 → 자료</strong>의 파일형 자료를 기준으로 지원됩니다.
            콘텐츠 기반 POP 출력은 후속 단계에서 보강됩니다.
          </p>
        </div>
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

            {/* ── WO-O4O-POP-TEMPLATE-WORKFLOW-V1: AI 문구 생성 패널 ── */}
            <div style={styles.aiPanel}>
              <div style={styles.aiPanelHeader}>
                <div style={styles.aiPanelHeaderLeft}>
                  <Sparkles size={16} style={{ color: '#16a34a' }} />
                  <span style={styles.aiPanelTitle}>
                    AI 문구 생성
                    {popAiContent && (
                      <CheckCircle2 size={14} style={{ color: '#16a34a', marginLeft: '6px' }} />
                    )}
                  </span>
                  {selectedTemplate && (
                    <span style={styles.aiPanelTemplateBadge}>{selectedTemplate.name} 스타일 적용</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAiOpen(true)}
                    style={styles.aiGenerateBtn}
                  >
                    <Sparkles size={13} />
                    {popAiContent ? '재생성' : 'AI 문구 만들기'}
                  </button>
                  {popAiContent && (
                    <button
                      type="button"
                      onClick={() => setAiPanelExpanded((v) => !v)}
                      style={styles.aiExpandBtn}
                    >
                      {aiPanelExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              </div>

              {/* AI 문구 프리뷰 */}
              {popAiContent && aiPanelExpanded && (
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
                    AI 문구 제거 (원본 자료로 출력)
                  </button>
                </div>
              )}

              {!popAiContent && (
                <p style={styles.aiPanelHint}>
                  AI 문구를 생성하면 PDF에 {selectedTemplate?.name ?? 'POP'} 스타일 레이아웃이 적용됩니다.
                  생성하지 않으면 자료의 제목·설명을 그대로 사용합니다.
                </p>
              )}
            </div>

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

      {/* WO-O4O-POP-TEMPLATE-WORKFLOW-V1: AiContentModal (template-aware) */}
      <AiContentModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={null}
        onInsert={handleAiInsert}
        initialMode="pop"
        initialText={buildAiInputText()}
        templateId={selectedTemplate?.id}
        templateSystemPrompt={selectedTemplate?.systemPromptOverride}
        templateForcedOptions={selectedTemplate?.forcedOptions}
        headerLabel="POP 문구 AI 생성"
        aiRequestHeaders={(() => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })()}
      />
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
