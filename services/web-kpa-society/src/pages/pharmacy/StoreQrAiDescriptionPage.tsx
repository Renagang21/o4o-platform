/**
 * StoreQrAiDescriptionPage — QR 전용 AI 설명 만들기 (단일 상품)
 *
 * WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1
 *
 * 흐름(§4):
 *   1. 단일 상품: 상품명 + 강조점 입력
 *   2. "AI로 설명 만들기" → POST /api/ai/qr-description → 생성 HTML
 *   3. 표준 RichTextEditor 에서 확인·수정
 *   4. "콘텐츠로 저장하고 QR 만들기"
 *      → POST /store-contents (source_type='direct', content_json.html SSOT + aiDescription metadata)
 *      → createStoreQrCode(landingType='page', landingTargetId=contentId)
 *   5. 콘텐츠 저장 성공 후 QR 저장 실패 시 콘텐츠 ID 를 유지하고 QR 재시도 제공.
 *
 * 코너 모드(다품목)는 같은 페이지에 후속 단계로 추가. 본 단계는 단일 상품 E2E.
 */

import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, QrCode, ExternalLink } from 'lucide-react';
import { RichTextEditor, type EditorContent } from '@o4o/content-editor';
import { toast } from '@o4o/error-handling';
import { apiClient } from '../../api/client';
import { createStoreQrCode } from '../../api/storeQr';
import { getAccessToken } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';

const AI_ROOT_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface AiDescriptionMeta {
  version: number;
  mode: 'single' | 'corner';
  productName?: string;
  cornerName?: string;
  emphasis?: string;
  items?: unknown[];
  model?: string;
  generatedBy?: string;
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

export default function StoreQrAiDescriptionPage() {
  const navigate = useNavigate();

  // 입력
  const [productName, setProductName] = useState('');
  const [emphasis, setEmphasis] = useState('');

  // 생성 결과
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [title, setTitle] = useState('');
  // editorSeed = RichTextEditor 초기 주입용(생성/재생성 시에만 변경). editorContent = 라이브 편집 결과(저장용).
  const [editorSeed, setEditorSeed] = useState('');
  const [editorContent, setEditorContent] = useState<EditorContent>({ html: '' });
  const [aiMeta, setAiMeta] = useState<AiDescriptionMeta | null>(null);

  // 저장
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedContentId, setSavedContentId] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const canGenerate = productName.trim().length > 0 && !generating;

  const handleGenerate = useCallback(async () => {
    if (!productName.trim()) {
      toast.error('상품명을 입력해 주세요');
      return;
    }
    setGenerating(true);
    try {
      const token = getAccessToken();
      const resp = await fetch(`${AI_ROOT_BASE}/api/ai/qr-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: 'single',
          productName: productName.trim(),
          emphasis: emphasis.trim() || undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) {
        throw new Error(data?.error || 'AI 설명 생성에 실패했습니다');
      }
      const html: string = data.html || '';
      const aiTitle: string = data.title || productName.trim();
      setEditorSeed(html);
      setEditorContent({ html });
      setTitle(aiTitle);
      setSlug(slugify(aiTitle));
      setAiMeta(data.aiDescription || null);
      setGenerated(true);
      if (data.usageWarning?.detected) {
        toast.warning('표현에 주의가 필요한 문구가 감지되었습니다. 저장 전 확인해 주세요.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'AI 설명 생성 중 오류가 발생했습니다');
    } finally {
      setGenerating(false);
    }
  }, [productName, emphasis]);

  // 콘텐츠 저장(없으면 생성) → 저장된 콘텐츠 ID 반환
  const ensureContentSaved = useCallback(async (): Promise<string | null> => {
    if (savedContentId) return savedContentId;
    const html = editorContent.html.trim();
    if (!html || html === '<p></p>') {
      toast.error('본문이 비어 있습니다');
      return null;
    }
    const res = await apiClient.post<{ success: boolean; data: { id: string } }>('/store-contents', {
      title: title.trim() || productName.trim() || 'AI 설명',
      tags: ['AI 설명'],
      contentJson: {
        html,
        generatedBy: 'gemini-qr-description',
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
          title: title.trim() || productName.trim() || 'AI 설명 QR',
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
      if (ok) toast.success('AI 설명 콘텐츠와 QR이 만들어졌습니다');
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

  const publicUrl = useMemo(
    () => (createdSlug ? `${AI_ROOT_BASE.replace(/\/$/, '')}/qr/${createdSlug}` : ''),
    [createdSlug],
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button type="button" onClick={() => navigate('/store/marketing/qr')} style={styles.backBtn}>
          <ArrowLeft size={14} /> QR 목록
        </button>
        <h1 style={styles.title}>
          <Sparkles size={20} style={{ color: colors.primary }} />
          AI 설명 QR 만들기
        </h1>
        <p style={styles.subtitle}>
          상품명과 강조점을 입력하면 AI가 QR 안내 콘텐츠 초안을 만듭니다. 확인·수정 후 콘텐츠로 저장하면 QR이 함께 생성됩니다.
        </p>
      </div>

      {/* 성공 화면 */}
      {createdSlug ? (
        <div style={styles.successCard}>
          <QrCode size={28} style={{ color: colors.primary }} />
          <h2 style={styles.successTitle}>QR이 만들어졌습니다</h2>
          <p style={styles.successDesc}>
            공개 주소: <code style={styles.code}>/qr/{createdSlug}</code>
          </p>
          <div style={styles.successActions}>
            <a href={publicUrl} target="_blank" rel="noreferrer" style={styles.primaryBtn}>
              <ExternalLink size={14} /> 공개 페이지 열기
            </a>
            <button type="button" onClick={() => navigate('/store/marketing/qr')} style={styles.secondaryBtn}>
              QR 목록으로
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1단계: 입력 */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>1. 상품 정보</h3>
            <label style={styles.label}>상품명 *</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="예: 종합비타민 골드"
              style={styles.input}
              disabled={generated}
            />
            <label style={styles.label}>강조점 (선택)</label>
            <input
              type="text"
              value={emphasis}
              onChange={(e) => setEmphasis(e.target.value)}
              placeholder="예: 하루 한 알, 가족 모두"
              style={styles.input}
              disabled={generated}
            />
            {!generated && (
              <button type="button" onClick={handleGenerate} disabled={!canGenerate} style={styles.generateBtn}>
                <Sparkles size={14} />
                {generating ? 'AI가 작성 중…' : 'AI로 설명 만들기'}
              </button>
            )}
            {generated && (
              <button type="button" onClick={handleGenerate} disabled={generating} style={styles.regenBtn}>
                <Sparkles size={14} />
                {generating ? '다시 작성 중…' : 'AI 다시 만들기'}
              </button>
            )}
          </div>

          {/* 2단계: 확인·수정·저장 */}
          {generated && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>2. 확인 후 저장</h3>
              <p style={styles.helper}>
                AI 초안입니다. 내용을 확인하고 필요하면 수정한 뒤 저장하세요. 저장하면 내 자료함 콘텐츠로 보관되고 QR이 생성됩니다.
              </p>
              <label style={styles.label}>제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.input}
              />
              <label style={styles.label}>본문</label>
              <div style={styles.editorWrap}>
                <RichTextEditor value={editorSeed} onChange={setEditorContent} preset="full" />
              </div>
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

              {savedContentId && !createdSlug ? (
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
  helper: { fontSize: 12.5, color: colors.neutral500, margin: '0 0 12px', lineHeight: 1.5 },
  label: { display: 'block', fontSize: 12.5, fontWeight: 500, color: colors.neutral600, margin: '12px 0 4px' },
  input: {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13,
    border: `1px solid ${colors.neutral300}`, borderRadius: 6, marginBottom: 4,
  },
  editorWrap: { border: `1px solid ${colors.neutral200}`, borderRadius: 6, overflow: 'hidden' },
  slugRow: { display: 'flex', alignItems: 'center', gap: 4 },
  slugPrefix: { fontSize: 13, color: colors.neutral400 },
  generateBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '8px 16px',
    background: colors.primary, color: colors.white, border: 'none', borderRadius: 6,
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  regenBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '6px 12px',
    background: colors.white, color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: 6,
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
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
