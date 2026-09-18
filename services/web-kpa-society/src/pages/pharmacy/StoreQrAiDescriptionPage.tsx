/**
 * StoreQrAiDescriptionPage — QR 안내 콘텐츠 만들기 (단일 상품 / 코너) — 외부 LLM(ChatGPT로 작업) 전용
 *
 * WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1 (원 계약 · 저장/QR 흐름은 그대로)
 *
 * 흐름:
 *   1. 단일 상품: 상품명 + 강조점 / 코너: 코너명 + 상품 항목 입력
 *   2. "ChatGPT로 작업" → Prompt 복사 → 사용자의 외부 AI → 결과 HTML 붙여넣기 → 편집기
 *   3. 표준 RichTextEditor 에서 확인·수정
 *   4. "콘텐츠로 저장하고 QR 만들기"
 *      → POST /store-contents (source_type='direct', content_json.html SSOT + aiDescription metadata)
 *      → createStoreQrCode(landingType='page', landingTargetId=contentId)
 *   5. 콘텐츠 저장 성공 후 QR 저장 실패 시 콘텐츠 ID 를 유지하고 QR 재시도 제공.
 *
 * 코너 모드(다품목)는 같은 페이지에 후속 단계로 추가. 본 단계는 단일 상품 E2E.
 *
 * WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 §24~§30:
 *   외부 LLM(ChatGPT 등) 경로 추가 — 사용자가 입력한 상품명/코너명/강조점/항목만 Source Context 로 Prompt 를 만들고,
 *   결과 HTML 을 편집기에 넣은 뒤 기존 "콘텐츠 저장 → QR 생성" 흐름을 그대로 탄다(자동 저장·자동 QR 없음).
 *   provenance: 결과에는 provider·model·generatedAt 을 기록하지 않고 provider-specific 값도 만들지 않는다.
 *   content_json.aiDescription 에는 화면 구조 정보(mode · productName/cornerName · emphasis · items[name/emphasis]) 만
 *   남긴다 — QR 목록/자료함 필터 SSOT(read compatibility 유지).
 *
 * WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1:
 *   legacy 내부 AI(handleGenerate → POST /api/ai/qr-description · Gemini) 은퇴. 외부 LLM 경로만 남는다.
 *   기존 저장 데이터의 aiDescription(legacy model/generatedBy/items[].descriptionHtml)은 읽기만 하고 재기록하지 않는다.
 *   route(/store/marketing/qr/ai-description)·컴포넌트명은 route 계약이므로 유지.
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, ArrowLeft, QrCode, ExternalLink, Trash2, Plus } from 'lucide-react';
import { RichTextEditor, ContentRenderer, LlmAssistPanel, type EditorContent } from '@o4o/content-editor';
import { buildStoreContentAuthoringPrompt, STORE_LLM_ASSIST_LABEL } from '@o4o/store-ui-core';
import { toast } from '@o4o/error-handling';
import { apiClient } from '../../api/client';
import { createStoreQrCode } from '../../api/storeQr';
import { directContentApi } from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';

interface AiDescriptionMeta {
  version: number;
  mode: 'single' | 'corner';
  productName?: string;
  cornerName?: string;
  emphasis?: string;
  items?: any[];
  /** legacy(Gemini 시절) 저장 데이터에만 존재 — 읽기 호환용. 신규 기록 없음(WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1) */
  model?: string;
  generatedBy?: string;
  generatedAt?: string;
}

function slugify(title: string): string {
  const stripped = title
    .toLowerCase()
    .trim()
    .replace(/[가-힣]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return stripped || `qr-${Date.now().toString(36)}`;
}

interface CornerItemInput {
  key: string;
  name: string;
  emphasis: string;
}

function makeKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `it-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  }
}

export default function StoreQrAiDescriptionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // 편집 모드: ?content=<direct id> (기존 QR 안내 콘텐츠 수정). ?qr=<slug> 는 성공 화면 공개링크용.
  const editContentId = searchParams.get('content');
  const editQrSlug = searchParams.get('qr');
  const isEdit = !!editContentId;

  // 모드
  const [mode, setMode] = useState<'single' | 'corner'>('single');

  // 입력 (single)
  const [productName, setProductName] = useState('');
  const [emphasis, setEmphasis] = useState('');

  // 입력 (corner)
  const [cornerName, setCornerName] = useState('');
  const [cornerItems, setCornerItems] = useState<CornerItemInput[]>([
    { key: makeKey(), name: '', emphasis: '' },
  ]);

  // 편집기 노출(외부 LLM 결과 적용 또는 기존 콘텐츠 로드 후 true)
  const [generated, setGenerated] = useState(false);
  const [title, setTitle] = useState('');
  // editorSeed = RichTextEditor 초기 주입용(외부 결과 적용/기존 로드 시에만 변경). editorContent = 라이브 편집 결과(저장용).
  const [editorSeed, setEditorSeed] = useState('');
  const [editorContent, setEditorContent] = useState<EditorContent>({ html: '' });
  const [aiMeta, setAiMeta] = useState<AiDescriptionMeta | null>(null);

  // 저장
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedContentId, setSavedContentId] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);

  // 편집 모드: 기존 direct 콘텐츠(content_json.html + aiDescription)를 불러와 폼/편집기 prefill.
  useEffect(() => {
    if (!editContentId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await directContentApi.get(editContentId);
        if (cancelled) return;
        const cj = (res?.data?.contentJson ?? {}) as Record<string, any>;
        const ai = (cj.aiDescription ?? {}) as AiDescriptionMeta;
        const loadedMode: 'single' | 'corner' = ai.mode === 'corner' ? 'corner' : 'single';
        setMode(loadedMode);
        setProductName(typeof ai.productName === 'string' ? ai.productName : '');
        setCornerName(typeof ai.cornerName === 'string' ? ai.cornerName : '');
        setEmphasis(typeof ai.emphasis === 'string' ? ai.emphasis : '');
        if (loadedMode === 'corner' && Array.isArray(ai.items) && ai.items.length > 0) {
          setCornerItems(
            ai.items.map((it: any) => ({
              key: typeof it?.key === 'string' ? it.key : makeKey(),
              name: typeof it?.name === 'string' ? it.name : '',
              emphasis: typeof it?.emphasis === 'string' ? it.emphasis : '',
            })),
          );
        }
        const html = typeof cj.html === 'string' ? cj.html : '';
        setEditorSeed(html);
        setEditorContent({ html });
        setTitle(res?.data?.title || ai.productName || ai.cornerName || 'QR 안내');
        setAiMeta(ai && Object.keys(ai).length > 0 ? ai : null);
        setSavedContentId(editContentId);
        setGenerated(true); // 기존 콘텐츠가 있으므로 확인·수정 영역 노출
      } catch {
        toast.error('기존 콘텐츠를 불러오지 못했습니다');
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editContentId]);

  const validCornerItems = cornerItems.filter((it) => it.name.trim().length > 0);
  // 외부 LLM 패널 노출 조건 — 입력이 갖춰졌을 때만(빈 Context 로 사실을 만들게 하지 않는다)
  const canAuthor =
    mode === 'single'
      ? productName.trim().length > 0
      : cornerName.trim().length > 0 && validCornerItems.length > 0;

  // 코너 항목 편집 헬퍼
  const addCornerItem = useCallback(
    () => setCornerItems((prev) => [...prev, { key: makeKey(), name: '', emphasis: '' }]),
    [],
  );
  const removeCornerItem = useCallback(
    (key: string) => setCornerItems((prev) => (prev.length <= 1 ? prev : prev.filter((it) => it.key !== key))),
    [],
  );
  const updateCornerItem = useCallback(
    (key: string, field: 'name' | 'emphasis', value: string) =>
      setCornerItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it))),
    [],
  );

  // ── 외부 LLM 경로 (WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 §25~§27 · 이 화면의 유일한 작성 경로) ──
  // Prompt Context = 사용자가 이미 입력한 값만(single: 상품명·강조점 / corner: 코너명·강조점·항목명·항목 강조점).
  const externalReferenceText = useMemo(() => {
    if (mode === 'single') return emphasis.trim();
    const lines: string[] = [];
    if (emphasis.trim()) lines.push(`코너 강조점: ${emphasis.trim()}`);
    validCornerItems.forEach((it, idx) => {
      lines.push(`상품 ${idx + 1}: ${it.name.trim()}${it.emphasis.trim() ? ` / 강조점: ${it.emphasis.trim()}` : ''}`);
    });
    return lines.join('\n');
  }, [mode, emphasis, validCornerItems]);

  const buildExternalPrompt = useCallback(
    ({ additionalInstruction }: { additionalInstruction: string }) =>
      buildStoreContentAuthoringPrompt({
        task: 'qr',
        title: mode === 'corner' ? cornerName.trim() : title.trim() || null,
        productName: mode === 'single' ? productName.trim() : null,
        currentHtml: generated ? editorContent.html : null,
        referenceText: externalReferenceText,
        additionalInstruction,
      }),
    [mode, cornerName, title, productName, generated, editorContent, externalReferenceText],
  );

  // 결과 HTML → 편집기(editorSeed + editorContent 동시 갱신). 저장·QR 생성은 하지 않는다(사용자가 기존 버튼을 누른다).
  //   aiDescription 은 화면 구조 정보만(provider·model·generatedAt 없음). 코너 항목의 per-item descriptionHtml 은 만들지 않는다
  //   (본문 하나에 상품별 소제목으로 들어간다) — 공개 landing 아코디언은 descriptionHtml 이 있는 항목만 그리므로 영향 없음.
  const handleExternalApply = useCallback(
    (html: string) => {
      const nextTitle =
        title.trim() || (mode === 'single' ? productName.trim() : cornerName.trim()) || 'QR 안내';
      setEditorSeed(html);
      setEditorContent({ html });
      setTitle(nextTitle);
      if (!isEdit && !slug.trim()) setSlug(slugify(nextTitle));
      setAiMeta({
        version: 1,
        mode,
        productName: mode === 'single' ? productName.trim() || undefined : undefined,
        cornerName: mode === 'corner' ? cornerName.trim() || undefined : undefined,
        emphasis: emphasis.trim() || undefined,
        items:
          mode === 'corner'
            ? validCornerItems.map((it) => ({ key: it.key, name: it.name.trim(), emphasis: it.emphasis.trim() || undefined }))
            : undefined,
      });
      setGenerated(true);
    },
    [title, mode, productName, cornerName, emphasis, validCornerItems, isEdit, slug],
  );

  // 콘텐츠 저장(없으면 생성) → 저장된 콘텐츠 ID 반환
  const ensureContentSaved = useCallback(async (): Promise<string | null> => {
    if (savedContentId) return savedContentId;
    const html = editorContent.html.trim();
    if (!html || html === '<p></p>') {
      toast.error('본문이 비어 있습니다');
      return null;
    }
    const res = await apiClient.post<{ success: boolean; data: { id: string } }>('/store-contents', {
      title: title.trim() || productName.trim() || 'QR 안내',
      // 'AI 설명' 태그 = QR 안내 콘텐츠 분류 라벨(QR 목록 탭·자료함 필터 보조). provider 의미 아님.
      tags: ['AI 설명'],
      contentJson: {
        html,
        // provider provenance(generatedBy/model) 기록 없음 — 사용자가 편집·확정한 Store direct 콘텐츠.
        aiDescription: aiMeta ?? undefined,
      },
    });
    const id = res?.data?.id ?? null;
    if (id) setSavedContentId(id);
    return id;
  }, [savedContentId, editorContent, title, productName, aiMeta]);

  // QR 생성 (콘텐츠는 이미 저장됨)
  const createQr = useCallback(
    async (contentId: string): Promise<boolean> => {
      const qrSlug = slug.trim() || slugify(title || productName);
      try {
        const res = await createStoreQrCode({
          title: title.trim() || productName.trim() || 'QR 안내',
          landingType: 'page',
          landingTargetId: contentId,
          slug: qrSlug,
        });
        if (res?.success) {
          setCreatedSlug(res.data.slug);
          return true;
        }
        return false;
      } catch (err: any) {
        toast.error(err?.message || 'QR 생성에 실패했습니다');
        return false;
      }
    },
    [slug, title, productName],
  );

  const handleSaveAndCreate = useCallback(async () => {
    if (!slug.trim()) {
      toast.error('QR 공개 URL(slug)을 입력해 주세요');
      return;
    }
    setSaving(true);
    try {
      const contentId = await ensureContentSaved();
      if (!contentId) return;
      const ok = await createQr(contentId);
      if (ok) toast.success('QR 안내 콘텐츠와 QR이 만들어졌습니다');
    } catch (err: any) {
      if (err?.status === 403) toast.error('매장 경영자 권한이 필요합니다');
      else toast.error(err?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }, [slug, ensureContentSaved, createQr]);

  const handleRetryQr = useCallback(async () => {
    if (!savedContentId) return;
    setSaving(true);
    try {
      const ok = await createQr(savedContentId);
      if (ok) toast.success('QR이 만들어졌습니다');
    } finally {
      setSaving(false);
    }
  }, [savedContentId, createQr]);

  // 편집 모드: 기존 콘텐츠 PUT 업데이트(같은 id) → QR(landingTargetId) 불변. 신규 QR 생성 없음.
  //   기존 content_json 키 보존을 위해 GET 후 merge → PUT. 새 초안 확인 전에는 호출되지 않음(저장 클릭 시에만).
  const handleUpdate = useCallback(async () => {
    if (!editContentId) return;
    const html = editorContent.html.trim();
    if (!html || html === '<p></p>') {
      toast.error('본문이 비어 있습니다');
      return;
    }
    setSaving(true);
    try {
      const cur = await directContentApi.get(editContentId);
      const curJson = (cur?.data?.contentJson ?? {}) as Record<string, unknown>;
      await directContentApi.update(editContentId, {
        title: title.trim() || productName.trim() || cornerName.trim() || 'QR 안내',
        contentJson: {
          ...curJson,
          html,
          // 최상위 provider provenance 는 기록하지 않는다(undefined → JSON 직렬화 시 키 제거 · legacy 값도 이월 안 함).
          generatedBy: undefined,
          aiDescription: aiMeta ?? (curJson.aiDescription as unknown),
        },
        tags: ['AI 설명'],
      });
      setUpdated(true);
      toast.success('QR 안내 콘텐츠가 수정되었습니다');
    } catch (err: any) {
      if (err?.status === 403) toast.error('매장 경영자 권한이 필요합니다');
      else toast.error(err?.message || '수정에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }, [editContentId, editorContent, title, productName, cornerName, aiMeta]);

  // 공개 QR 페이지는 웹 호스트(현재 origin)의 /qr/:slug 라우트(QrLandingPage)에서 렌더된다 — API 호스트 아님.
  const publicSlug = createdSlug || editQrSlug;
  const publicUrl = useMemo(
    () => (publicSlug ? `${window.location.origin}/qr/${publicSlug}` : ''),
    [publicSlug],
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button type="button" onClick={() => navigate('/store/marketing/qr')} style={styles.backBtn}>
          <ArrowLeft size={14} /> QR 목록
        </button>
        <h1 style={styles.title}>
          <Sparkles size={20} style={{ color: colors.primary }} />
          {isEdit ? 'QR 안내 콘텐츠 수정' : 'QR 안내 콘텐츠 만들기'}
        </h1>
        <p style={styles.subtitle}>
          {isEdit
            ? '본문을 직접 수정하거나, 항목을 바꿔 "ChatGPT로 작업" 결과를 다시 넣은 뒤 저장하면 연결된 QR에 그대로 반영됩니다(같은 QR 주소 유지).'
            : '상품명·강조점(또는 코너·상품 항목)을 입력하고 "ChatGPT로 작업"으로 안내 본문을 만들어 붙여 넣으세요. 확인·수정 후 콘텐츠로 저장하면 QR이 함께 생성됩니다.'}
        </p>
      </div>

      {loadingExisting ? (
        <div style={styles.card}>불러오는 중…</div>
      ) : createdSlug || updated ? (
        /* 성공 화면 */
        <div style={styles.successCard}>
          <QrCode size={28} style={{ color: colors.primary }} />
          <h2 style={styles.successTitle}>{updated ? 'QR 안내 콘텐츠가 수정되었습니다' : 'QR이 만들어졌습니다'}</h2>
          {publicSlug && (
            <p style={styles.successDesc}>
              공개 주소: <code style={styles.code}>/qr/{publicSlug}</code>
            </p>
          )}
          <div style={styles.successActions}>
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noreferrer" style={styles.primaryBtn}>
                <ExternalLink size={14} /> 공개 페이지 열기
              </a>
            )}
            <button type="button" onClick={() => navigate('/store/marketing/qr')} style={styles.secondaryBtn}>
              QR 목록으로
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1단계: 입력 */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>1. 무엇을 안내할까요?</h3>
            {/* 모드 선택 — 단일 상품 / 코너·다품목 */}
            <div style={styles.modeRow}>
              <button
                type="button"
                onClick={() => setMode('single')}
                disabled={generated || isEdit}
                style={mode === 'single' ? styles.modeBtnActive : styles.modeBtn}
              >
                단일 상품
              </button>
              <button
                type="button"
                onClick={() => setMode('corner')}
                disabled={generated || isEdit}
                style={mode === 'corner' ? styles.modeBtnActive : styles.modeBtn}
              >
                코너·다품목
              </button>
            </div>

            {mode === 'single' ? (
              <>
                <label style={styles.label}>상품명 *</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="예: 종합비타민 골드"
                  style={styles.input}
                />
                <label style={styles.label}>강조점 (선택)</label>
                <input
                  type="text"
                  value={emphasis}
                  onChange={(e) => setEmphasis(e.target.value)}
                  placeholder="예: 하루 한 알, 가족 모두"
                  style={styles.input}
                />
              </>
            ) : (
              <>
                <label style={styles.label}>코너명 *</label>
                <input
                  type="text"
                  value={cornerName}
                  onChange={(e) => setCornerName(e.target.value)}
                  placeholder="예: 환절기 면역 코너"
                  style={styles.input}
                />
                <label style={styles.label}>코너 강조점 (선택)</label>
                <input
                  type="text"
                  value={emphasis}
                  onChange={(e) => setEmphasis(e.target.value)}
                  placeholder="예: 환절기 건강관리"
                  style={styles.input}
                />
                <label style={styles.label}>상품 항목 *</label>
                {cornerItems.map((it, idx) => (
                  <div key={it.key} style={styles.itemRow}>
                    <span style={styles.itemIndex}>{idx + 1}</span>
                    <input
                      type="text"
                      value={it.name}
                      onChange={(e) => updateCornerItem(it.key, 'name', e.target.value)}
                      placeholder="상품명"
                      style={{ ...styles.input, margin: 0, flex: 1 }}
                    />
                    <input
                      type="text"
                      value={it.emphasis}
                      onChange={(e) => updateCornerItem(it.key, 'emphasis', e.target.value)}
                      placeholder="강조점(선택)"
                      style={{ ...styles.input, margin: 0, flex: 1 }}
                    />
                    {cornerItems.length > 1 && (
                      <button type="button" onClick={() => removeCornerItem(it.key)} style={styles.itemRemoveBtn} aria-label="삭제">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addCornerItem} style={styles.addItemBtn}>
                  <Plus size={14} /> 상품 추가
                </button>
                {generated && (
                  <p style={styles.previewNote}>※ 항목·강조점을 바꾼 뒤 ‘ChatGPT로 작업’ 결과를 다시 넣으면 새 본문으로 바뀝니다(저장 전까지 기존 콘텐츠는 변경되지 않습니다).</p>
                )}
              </>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
              {/* 외부 LLM 경로 — 입력이 갖춰졌을 때만 노출. 이 화면의 유일한 작성 경로(WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1) */}
              {canAuthor ? (
                <LlmAssistPanel
                  label={STORE_LLM_ASSIST_LABEL}
                  contextLabel={
                    mode === 'single'
                      ? 'QR 안내 콘텐츠 — 입력한 상품명·강조점만으로 작성합니다'
                      : 'QR 코너 안내 콘텐츠 — 입력한 코너명·상품 항목·강조점만으로 작성합니다'
                  }
                  guideText={buildExternalPrompt}
                  currentHtml={generated ? editorContent.html : undefined}
                  onApplyHtml={handleExternalApply}
                />
              ) : (
                <p style={styles.previewNote}>
                  {mode === 'single' ? '상품명을 입력하면' : '코너명과 상품 항목을 입력하면'} ‘ChatGPT로 작업’ 버튼이 나타납니다.
                </p>
              )}
            </div>
          </div>

          {/* 2단계: 확인·수정·저장 */}
          {generated && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>2. 확인 후 저장</h3>
              <p style={styles.helper}>
                {isEdit
                  ? '내용을 확인하고 필요하면 수정한 뒤 저장하세요. 같은 콘텐츠를 갱신하므로 연결된 QR(주소·landingTarget)은 그대로 유지됩니다.'
                  : '외부 AI 결과를 편집기에 넣었습니다. 내용을 확인하고 필요하면 수정한 뒤 저장하세요. 저장하면 내 자료함 콘텐츠로 보관되고 QR이 생성됩니다.'}
              </p>
              <label style={styles.label}>제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.input}
              />
              <label style={styles.label}>{mode === 'corner' ? '코너 소개 본문' : '본문'}</label>
              <div style={styles.editorWrap}>
                <RichTextEditor showInternalAi={false} value={editorSeed} onChange={setEditorContent} preset="full" />
              </div>

              {/* 코너 모드: 기존 저장 데이터의 상품별 설명(legacy items[].descriptionHtml) 읽기 전용 미리보기 —
                  공개 QR 아코디언과 동일 정제(ContentRenderer). 신규 작성 경로는 상품별 설명을 만들지 않으므로
                  descriptionHtml 이 있는 항목이 있을 때만 보인다. */}
              {mode === 'corner' && aiMeta?.items && aiMeta.items.some((it: any) => it?.descriptionHtml) && (
                <div style={styles.previewBox}>
                  <p style={styles.previewTitle}>상품별 설명 ({aiMeta.items.length}개)</p>
                  {(aiMeta.items as any[]).filter((it) => it?.descriptionHtml).map((it) => (
                    <div key={it.key} style={styles.previewItem}>
                      <strong style={styles.previewItemName}>{it.name}</strong>
                      <div style={styles.previewItemBody}>
                        <ContentRenderer html={it.descriptionHtml || ''} variant="guide" />
                      </div>
                    </div>
                  ))}
                  <p style={styles.previewNote}>※ 이전에 저장된 상품별 설명입니다. ‘ChatGPT로 작업’ 결과를 새로 넣으면 코너 본문 하나로 통합되고 이 상품별 설명은 저장 시 제거됩니다.</p>
                </div>
              )}

              {/* slug 는 신규 생성에서만(편집은 기존 QR 유지) */}
              {!isEdit && (
                <>
                  <label style={styles.label}>QR 공개 URL (slug)</label>
                  <div style={styles.slugRow}>
                    <span style={styles.slugPrefix}>/qr/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="slug"
                      style={{ ...styles.input, margin: 0 }}
                    />
                  </div>
                </>
              )}

              {isEdit ? (
                <button type="button" onClick={handleUpdate} disabled={saving} style={styles.saveBtn}>
                  <QrCode size={14} />
                  {saving ? '저장 중…' : '수정 저장 (QR 유지)'}
                </button>
              ) : savedContentId && !createdSlug ? (
                <div style={styles.retryBox}>
                  <p style={styles.retryText}>콘텐츠는 저장되었지만 QR 생성에 실패했습니다. slug를 확인하고 다시 시도해 주세요.</p>
                  <button type="button" onClick={handleRetryQr} disabled={saving} style={styles.saveBtn}>
                    {saving ? 'QR 생성 중…' : 'QR 다시 만들기'}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={handleSaveAndCreate} disabled={saving} style={styles.saveBtn}>
                  <QrCode size={14} />
                  {saving ? '저장 중…' : '콘텐츠로 저장하고 QR 만들기'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: { padding: 24, maxWidth: 820, margin: '0 auto' },
  header: { marginBottom: 20 },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px',
    background: 'transparent', border: 'none', color: colors.neutral500, fontSize: 13, cursor: 'pointer',
    marginBottom: 8,
  },
  title: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 600, color: colors.neutral800, margin: 0 },
  subtitle: { fontSize: 13, color: colors.neutral500, margin: '8px 0 0' },
  card: {
    background: colors.white, border: `1px solid ${colors.neutral200}`, borderRadius: 10,
    padding: 20, marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: 600, color: colors.neutral800, margin: '0 0 12px' },
  modeRow: { display: 'flex', gap: 8, marginBottom: 8 },
  modeBtn: {
    flex: 1, padding: '8px 12px', background: colors.white, color: colors.neutral600,
    border: `1px solid ${colors.neutral300}`, borderRadius: 6, fontSize: 13, cursor: 'pointer',
  },
  modeBtnActive: {
    flex: 1, padding: '8px 12px', background: colors.primary, color: colors.white,
    border: `1px solid ${colors.primary}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  itemRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  itemIndex: { fontSize: 12, color: colors.neutral400, width: 16, textAlign: 'center', flexShrink: 0 },
  itemRemoveBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6,
    background: colors.white, color: colors.neutral500, border: `1px solid ${colors.neutral300}`,
    borderRadius: 6, cursor: 'pointer', flexShrink: 0,
  },
  addItemBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '6px 10px',
    background: colors.white, color: colors.primary, border: `1px dashed ${colors.primary}`,
    borderRadius: 6, fontSize: 12.5, cursor: 'pointer',
  },
  previewBox: { marginTop: 14, padding: 14, background: colors.neutral100, borderRadius: 8 },
  previewTitle: { fontSize: 13, fontWeight: 600, color: colors.neutral700, margin: '0 0 8px' },
  previewItem: { padding: '8px 0', borderTop: `1px solid ${colors.neutral200}` },
  previewItemName: { fontSize: 13, color: colors.neutral800, display: 'block', marginBottom: 4 },
  previewItemBody: { fontSize: 12.5, color: colors.neutral600, lineHeight: 1.5 },
  previewNote: { fontSize: 11.5, color: colors.neutral400, margin: '8px 0 0' },
  helper: { fontSize: 12.5, color: colors.neutral500, margin: '0 0 12px', lineHeight: 1.5 },
  label: { display: 'block', fontSize: 12.5, fontWeight: 500, color: colors.neutral600, margin: '12px 0 4px' },
  input: {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13,
    border: `1px solid ${colors.neutral300}`, borderRadius: 6, marginBottom: 4,
  },
  editorWrap: { border: `1px solid ${colors.neutral200}`, borderRadius: 6, overflow: 'hidden' },
  slugRow: { display: 'flex', alignItems: 'center', gap: 4 },
  slugPrefix: { fontSize: 13, color: colors.neutral400 },
  saveBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '9px 18px',
    background: colors.primary, color: colors.white, border: 'none', borderRadius: 6,
    fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
  },
  retryBox: { marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 8 },
  retryText: { fontSize: 12.5, color: '#92400e', margin: '0 0 8px' },
  successCard: {
    background: colors.white, border: `1px solid ${colors.neutral200}`, borderRadius: 10,
    padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  successTitle: { fontSize: 18, fontWeight: 600, color: colors.neutral800, margin: 0 },
  successDesc: { fontSize: 13, color: colors.neutral500, margin: 0 },
  code: { background: colors.neutral100, padding: '2px 6px', borderRadius: 4, fontSize: 12.5 },
  successActions: { display: 'flex', gap: 8, marginTop: 12 },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', textDecoration: 'none',
    background: colors.primary, color: colors.white, borderRadius: 6, fontSize: 13, fontWeight: 500,
  },
  secondaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px',
    background: colors.white, color: colors.neutral700, border: `1px solid ${colors.neutral300}`,
    borderRadius: 6, fontSize: 13, cursor: 'pointer',
  },
};
