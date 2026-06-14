/**
 * CommunityContentWriteShell — O4O 표준 커뮤니티 콘텐츠 작성/수정 form shell
 *
 * WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-V1
 *
 * KPA `/content` 회원 작성형 콘텐츠 작성 폼을 service-neutral 순수 form shell 로 추출.
 * (InstructorCourseFormShell 패턴 — API client 미 import, 저장은 onSubmit 주입.)
 *
 * - 순수 presentational: 제목 / AI 보조 배너(+AiContentModal) / 본문(RichTextEditor) /
 *   요약 / 태그(chip) / 매장 가져가기 정책 / 액션(취소·임시저장·공개).
 * - **API client / router / toast 미 import** — 저장은 wrapper 가 주입한 `onSubmit(values, status)`.
 * - 검증(제목 필수·태그 최소 1)·저장 진행·인라인 에러는 shell 소유.
 * - 서비스 고유 요소(GuideBlock 등)는 `guideSlot` 으로 wrapper 주입.
 * - content_type/sub_type 등 분류 상수·라우팅·소유권·인증은 wrapper 책임(shell 미관여).
 */

import { useState, type ReactNode, type CSSProperties } from 'react';
import { RichTextEditor, AiContentModal } from '@o4o/content-editor';

export type CommunityContentReusablePolicy = 'platform' | 'restricted';

export interface CommunityContentWriteValues {
  title: string;
  body: string;
  summary: string;
  tags: string[];
  reusablePolicy: CommunityContentReusablePolicy;
}

export interface CommunityContentWriteConfig {
  mode?: 'create' | 'edit';
  /** 태그 최소 1개 필수 (기본 true) */
  requireTags?: boolean;
  /** 매장 가져가기 정책 필드 노출 (기본 true) */
  reusablePolicyField?: boolean;
  /** AI 보조 배너 + 모달 노출 (기본 true) */
  aiBanner?: boolean;
  /** RichTextEditor 커뮤니티/매장 저장 툴바 플래그 (기본 true) */
  showCommunitySave?: boolean;
  showStoreSave?: boolean;
  // 라벨/placeholder (서비스별 문구 주입)
  titlePlaceholder?: string;
  bodyPlaceholder?: string;
  summaryPlaceholder?: string;
  tagsPlaceholder?: string;
  cancelLabel?: string;
  draftLabel?: string;
  publishLabel?: string;
}

export interface CommunityContentWriteShellProps {
  initialValues?: Partial<CommunityContentWriteValues>;
  config?: CommunityContentWriteConfig;
  /** AI/에디터 요청 인증 헤더 (wrapper 가 토큰 주입) */
  aiRequestHeaders?: Record<string, string> | undefined;
  /** 서비스 고유 안내(GuideBlock 등) — form 상단에 렌더 */
  guideSlot?: ReactNode;
  /** 저장 — wrapper 가 API 호출·라우팅 담당. 실패 시 throw 하면 shell 이 인라인 에러 표시 */
  onSubmit: (values: CommunityContentWriteValues, status: 'draft' | 'published') => Promise<void> | void;
  onCancel?: () => void;
  disabled?: boolean;
}

function extractTitleFromHtml(html: string): string {
  const match = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').trim();
}

export function CommunityContentWriteShell({
  initialValues,
  config,
  aiRequestHeaders,
  guideSlot,
  onSubmit,
  onCancel,
  disabled,
}: CommunityContentWriteShellProps) {
  const requireTags = config?.requireTags ?? true;
  const showReusablePolicy = config?.reusablePolicyField ?? true;
  const showAiBanner = config?.aiBanner ?? true;

  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [body, setBody] = useState(initialValues?.body ?? '');
  const [summary, setSummary] = useState(initialValues?.summary ?? '');
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [reusablePolicy, setReusablePolicy] = useState<CommunityContentReusablePolicy>(
    initialValues?.reusablePolicy ?? 'platform',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const handleAiInsert = ({ html, title: aiTitle }: { html: string; title: string; sourceUrl?: string }) => {
    const finalTitle = (aiTitle || '').trim() || extractTitleFromHtml(html);
    if (finalTitle && !title.trim()) setTitle(finalTitle);
    setBody(html);
  };

  const commitTagInput = () => {
    const t = tagInput.trim();
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput('');
  };

  const handleSave = async (status: 'draft' | 'published') => {
    setError(null);
    if (!title.trim()) { setError('제목을 입력해주세요'); return; }
    const pendingFromInput = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
    const tagArr = Array.from(new Set([...tags, ...pendingFromInput]));
    if (requireTags && tagArr.length === 0) { setError('태그를 1개 이상 입력해주세요'); return; }

    setSaving(true);
    try {
      await onSubmit(
        { title: title.trim(), body, summary, tags: tagArr, reusablePolicy },
        status,
      );
    } catch (e: any) {
      setError(e?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || !!disabled;

  return (
    <div style={styles.card}>
      {guideSlot}

      {/* 제목 */}
      <div style={styles.field}>
        <label style={styles.label}>제목 <span style={styles.required}>*</span></label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={config?.titlePlaceholder ?? '콘텐츠 제목을 입력하세요'}
          style={styles.input}
        />
      </div>

      {/* AI 보조 배너 */}
      {showAiBanner && (
        <div style={styles.aiBanner}>
          <div style={styles.aiBannerText}>
            <div style={styles.aiBannerTitle}>✨ AI 보조</div>
            <div style={styles.aiBannerDesc}>유튜브 URL 또는 콘텐츠 URL로 제목과 본문을 한 번에 생성합니다.</div>
          </div>
          <button type="button" onClick={() => setAiOpen(true)} style={styles.aiBannerBtn}>AI로 만들기</button>
        </div>
      )}

      {/* 본문 */}
      <div style={styles.field}>
        <label style={styles.label}>본문</label>
        <RichTextEditor
          value={body}
          onChange={(content) => setBody(content.html)}
          placeholder={config?.bodyPlaceholder ?? '내용을 입력하세요'}
          minHeight="300px"
          aiRequestHeaders={aiRequestHeaders}
          showCommunitySave={config?.showCommunitySave ?? true}
          showStoreSave={config?.showStoreSave ?? true}
        />
      </div>

      {/* 요약 */}
      <div style={styles.field}>
        <label style={styles.label}>요약 <span style={styles.hint}>(선택)</span></label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={config?.summaryPlaceholder ?? '콘텐츠 요약을 입력하세요 (목록에서 미리보기로 표시됩니다)'}
          rows={3}
          style={styles.textarea}
        />
      </div>

      {/* 태그 */}
      <div style={styles.field}>
        <label style={styles.label}>
          태그 {requireTags && <span style={styles.required}>*</span>}{' '}
          <span style={styles.hint}>(Enter 또는 쉼표로 추가{requireTags ? ', 최소 1개' : ''})</span>
        </label>
        <div style={styles.tagInputWrap}>
          {tags.map((tag) => (
            <span key={tag} style={styles.tagChip}>
              {tag}
              <button
                type="button"
                onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                style={styles.tagChipRemove}
                aria-label={`${tag} 삭제`}
              >×</button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => {
              const v = e.target.value;
              if (v.includes(',')) {
                const parts = v.split(',');
                const last = parts.pop() || '';
                setTags((prev) => {
                  const next = [...prev];
                  parts.forEach((p) => { const t = p.trim(); if (t && !next.includes(t)) next.push(t); });
                  return next;
                });
                setTagInput(last);
              } else {
                setTagInput(v);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitTagInput(); }
              else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
                e.preventDefault();
                setTags((prev) => prev.slice(0, -1));
              }
            }}
            placeholder={tags.length === 0 ? (config?.tagsPlaceholder ?? '예: 약국경영, 복약지도, 건강관리') : ''}
            style={styles.tagInput}
          />
        </div>
      </div>

      {/* 매장 가져가기 정책 */}
      {showReusablePolicy && (
        <div style={styles.field}>
          <label style={styles.label}>매장 가져가기 허용</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="reusable_policy"
                value="platform"
                checked={reusablePolicy === 'platform'}
                onChange={() => setReusablePolicy('platform')}
              />
              매장에서 내 자료함으로 가져가기 허용
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="reusable_policy"
                value="restricted"
                checked={reusablePolicy === 'restricted'}
                onChange={() => setReusablePolicy('restricted')}
              />
              가져가기 불가
            </label>
          </div>
          <span style={{ ...styles.hint, marginTop: '4px', display: 'block' }}>
            가져가기 불가로 설정해도 커뮤니티에서 일반 열람은 그대로 가능합니다.
          </span>
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}

      {/* 액션 */}
      <div style={styles.actions}>
        {onCancel && (
          <button onClick={onCancel} style={styles.cancelBtn} disabled={busy}>
            {config?.cancelLabel ?? '취소'}
          </button>
        )}
        <button onClick={() => handleSave('draft')} disabled={busy} style={styles.draftBtn}>
          {saving ? '저장 중...' : (config?.draftLabel ?? '임시 저장')}
        </button>
        <button onClick={() => handleSave('published')} disabled={busy} style={styles.publishBtn}>
          {saving ? '저장 중...' : (config?.publishLabel ?? '공개')}
        </button>
      </div>

      {showAiBanner && (
        <AiContentModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          editor={null}
          onInsert={handleAiInsert}
          aiRequestHeaders={aiRequestHeaders}
        />
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: '28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: 6 },
  required: { color: '#ef4444' },
  hint: { fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' },
  input: {
    width: '100%', padding: '10px 14px', fontSize: '0.875rem',
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '10px 14px', fontSize: '0.875rem',
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
  },
  tagInputWrap: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, width: '100%', minHeight: 44,
    padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', boxSizing: 'border-box',
  },
  tagChip: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.8125rem',
    fontWeight: 500, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 9999, lineHeight: 1.2,
  },
  tagChipRemove: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, padding: 0,
    border: 'none', background: 'rgba(29, 78, 216, 0.12)', color: '#1d4ed8', fontSize: '0.875rem',
    cursor: 'pointer', lineHeight: 1, borderRadius: '50%',
  },
  tagInput: { flex: 1, minWidth: 120, padding: '4px 4px', fontSize: '0.875rem', border: 'none', outline: 'none', background: 'transparent' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' },
  error: { margin: '0 0 12px', fontSize: '0.8125rem', color: '#dc2626' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16, borderTop: '1px solid #f1f5f9' },
  cancelBtn: {
    padding: '10px 20px', fontSize: '0.875rem', fontWeight: 500, color: '#64748b',
    backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
  },
  draftBtn: {
    padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, color: '#334155',
    backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
  },
  publishBtn: {
    padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff',
    backgroundColor: '#2563eb', border: '1px solid #2563eb', borderRadius: 8, cursor: 'pointer',
  },
  aiBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    padding: '12px 14px', marginBottom: 20, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8,
  },
  aiBannerText: { flex: 1, minWidth: 0 },
  aiBannerTitle: { fontSize: 13, fontWeight: 600, color: '#4338ca', marginBottom: 2 },
  aiBannerDesc: { fontSize: 12, color: '#6366f1' },
  aiBannerBtn: {
    padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 7,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },
};

export default CommunityContentWriteShell;
