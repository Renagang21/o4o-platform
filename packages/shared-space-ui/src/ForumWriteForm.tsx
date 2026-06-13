/**
 * ForumWriteForm — 공통 포럼 글쓰기 폼 (presentational)
 *
 * WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1
 *
 * 4서비스(KPA / GlycoPharm / K-Cosmetics / Neture) forum write CREATE 화면 공통화 기반.
 * - 제목 input + RichTextEditor + (선택) postType select + (선택) 확장 슬롯 + 액션 버튼
 * - 자체 상태 소유: title / editorHtml / postType / submitting
 * - submit 시 raw editorHtml(HTML string) 을 payload 로 전달. content 변환은 하지 않는다.
 *   백엔드 ForumPostController.create/update 가 normalizeContent(content) 로 HTML→Block[] 정규화하므로
 *   프론트엔드 변환(htmlToBlocks)은 불필요하며, forum-core 의존을 도입하지 않는다.
 *   (GP/KCos Dockerfile 은 packages/forum-core 를 COPY 하지 않아 transitive 의존 시 빌드 실패 — 회피)
 * - API client / router / 백엔드 route / 서비스별 role helper / forum-core 미 import (순수 표현 컴포넌트)
 *
 * 범위: create-only 공통화. edit route parity / detail / postType 정책 변경은 범위 밖.
 * (단 form body 자체는 create/edit 공용이므로 KPA edit 등 parent 가 initial* + onSubmit 로 재사용 가능.)
 */

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { RichTextEditor } from '@o4o/content-editor';
import type { ContentEditorProps } from '@o4o/content-editor';

export type ForumWritePostType = 'discussion' | 'question' | 'announcement' | 'poll' | 'guide';

export interface ForumWriteFormPostTypeOption {
  value: ForumWritePostType;
  label: string;
}

export interface ForumWriteFormPayload {
  /** trim 된 제목 */
  title: string;
  /** RichTextEditor HTML 출력 — 백엔드 normalizeContent 가 Block[] 로 정규화 (그대로 content 전송) */
  editorHtml: string;
  /** showPostType=true 일 때만 포함 */
  type?: ForumWritePostType;
}

export type ForumWriteFormTheme = 'blue' | 'emerald' | 'pink' | 'primary';

export interface ForumWriteFormProps {
  initialTitle?: string;
  initialContentHtml?: string;
  initialType?: ForumWritePostType;

  showPostType?: boolean;
  postTypeOptions?: ForumWriteFormPostTypeOption[];
  postTypeLabel?: string;

  titleLabel?: string;
  titlePlaceholder?: string;
  titleMaxLength?: number;
  contentLabel?: string;
  contentPlaceholder?: string;

  submitLabel?: string;
  submittingLabel?: string;
  cancelLabel?: string;

  theme?: ForumWriteFormTheme;
  /** theme accent 직접 override (예: KPA colors.primary) */
  submitColor?: string;

  minHeight?: string;
  /** RichTextEditor 추가 props (aiRequestHeaders / showStoreSave / showCommunitySave / preset 등) */
  editorProps?: Partial<Omit<ContentEditorProps, 'value' | 'onChange'>>;

  /** 액션 버튼 위 확장 슬롯 (예: Neture contact 옵션) */
  renderExtra?: ReactNode;
  /**
   * 에디터 하단 메타 슬롯 (예: Neture live charCount / 최소 길이 안내).
   * 폼 내부 editorHtml 을 인자로 받아 라이브 렌더한다. 미지정 시 미노출 — 기존 소비처(KPA/GP/KCos) 무영향.
   * WO-O4O-FORUM-WRITE-NETURE-FORM-COMMONIZATION-V1
   */
  renderContentMeta?: (state: { html: string; textLength: number }) => ReactNode;

  onSubmit: (payload: ForumWriteFormPayload) => Promise<void> | void;
  onCancel?: () => void;
  /** 빈 입력 시 호출 — 서비스별 toast/error 메시지 매핑 */
  onInvalid?: (reason: 'title' | 'content') => void;
}

const THEME_COLORS: Record<ForumWriteFormTheme, string> = {
  blue: '#2563EB',
  emerald: '#059669',
  pink: '#DB2777',
  primary: '#2563EB',
};

const DEFAULT_POST_TYPES: ForumWriteFormPostTypeOption[] = [
  { value: 'discussion', label: '토론' },
  { value: 'question', label: '질문' },
  { value: 'guide', label: '가이드' },
  { value: 'poll', label: '설문' },
  { value: 'announcement', label: '공지' },
];

function isHtmlEmpty(html: string): boolean {
  return !html || html === '<p></p>' || html.replace(/<[^>]*>/g, '').trim() === '';
}

export function ForumWriteForm({
  initialTitle = '',
  initialContentHtml = '',
  initialType = 'discussion',
  showPostType = false,
  postTypeOptions = DEFAULT_POST_TYPES,
  postTypeLabel = '글 유형',
  titleLabel = '제목',
  titlePlaceholder = '제목을 입력하세요',
  titleMaxLength = 200,
  contentLabel = '내용',
  contentPlaceholder = '내용을 작성하세요',
  submitLabel = '등록',
  submittingLabel = '등록 중...',
  cancelLabel = '취소',
  theme = 'blue',
  submitColor,
  minHeight = '300px',
  editorProps,
  renderExtra,
  renderContentMeta,
  onSubmit,
  onCancel,
  onInvalid,
}: ForumWriteFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [editorHtml, setEditorHtml] = useState(initialContentHtml);
  const [postType, setPostType] = useState<ForumWritePostType>(initialType);
  const [submitting, setSubmitting] = useState(false);

  const accent = submitColor ?? THEME_COLORS[theme];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onInvalid?.('title');
      return;
    }
    if (isHtmlEmpty(editorHtml)) {
      onInvalid?.('content');
      return;
    }
    try {
      setSubmitting(true);
      const payload: ForumWriteFormPayload = {
        title: title.trim(),
        editorHtml,
        ...(showPostType ? { type: postType } : {}),
      };
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {showPostType && (
        <div style={styles.field}>
          <label style={styles.label}>{postTypeLabel}</label>
          <select
            value={postType}
            onChange={(e) => setPostType(e.target.value as ForumWritePostType)}
            style={styles.select}
            disabled={submitting}
          >
            {postTypeOptions.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      )}

      <div style={styles.field}>
        <label style={styles.label}>{titleLabel}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
          style={styles.input}
          maxLength={titleMaxLength}
          disabled={submitting}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>{contentLabel}</label>
        <RichTextEditor
          {...editorProps}
          value={editorHtml}
          onChange={(c) => setEditorHtml(c.html)}
          placeholder={contentPlaceholder}
          minHeight={minHeight}
          editable={!submitting}
        />
        {renderContentMeta?.({
          html: editorHtml,
          textLength: editorHtml.replace(/<[^>]*>/g, '').trim().length,
        })}
      </div>

      {renderExtra}

      <div style={styles.actions}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={styles.cancelBtn}
            disabled={submitting}
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{ ...styles.submitBtn, backgroundColor: accent, opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
  },
  input: {
    padding: '10px 14px',
    fontSize: 15,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    backgroundColor: 'white',
  },
  select: {
    padding: '10px 14px',
    fontSize: 15,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    backgroundColor: 'white',
    color: '#475569',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 32px',
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
  },
};
