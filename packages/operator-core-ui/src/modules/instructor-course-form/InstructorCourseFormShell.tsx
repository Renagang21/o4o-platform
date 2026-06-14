/**
 * InstructorCourseFormShell — 강사 강의 기본정보 form 공통 shell
 *
 * WO-O4O-LMS-INSTRUCTOR-COURSE-FORM-SHELL-V1
 *
 * KPA `CourseNewPage`(이미 props-driven) 를 canonical 로 추출한 **순수 form UI shell**.
 * - 제목 / 설명 / 공개범위(visibility) / 강사승인(requiresApproval) / 매장자료함(reusablePolicy) / 태그
 * - 필드는 config 로 토글, 저장은 wrapper 가 주입한 `onSubmit(values)` 가 담당.
 *
 * 경계(엄수):
 * - **API client 를 직접 import 하지 않는다.** create/update 호출·라우팅·재조회는 서비스 wrapper 책임.
 * - 페이지 chrome(page padding / back link / 제목)을 그리지 않는다 — form 만 렌더(임베드 가능).
 * - 레슨 / 퀴즈 / 과제 / AI / 발행·검수 flow / reward 는 범위 밖. 검수·발행 등 부가 액션은
 *   `extraActions` 슬롯으로 wrapper 가 주입(shell 은 review flow 를 알지 못함).
 *
 * 소비: KPA CourseNewPage(create), GlycoPharm InstructorCourseEditPage(edit 기본정보).
 *       K-Cosmetics 는 editor 미구축(Phase 1-B) — 미적용.
 */

import React, { useState } from 'react';

export type CourseFormVisibility = 'public' | 'members';
export type CourseFormReusablePolicy = 'restricted' | 'platform' | 'organization';

export interface InstructorCourseFormValues {
  title: string;
  description: string;
  visibility: CourseFormVisibility;
  requiresApproval: boolean;
  reusablePolicy: CourseFormReusablePolicy;
  tags: string[];
}

export interface InstructorCourseFormConfig {
  /** 제출 버튼 / 태그 강조색 (기본 #4f46e5) */
  accent?: string;
  /** 제출 버튼 라벨 (기본 '강의 생성') */
  submitLabel?: string;
  /** 제출 중 라벨 (기본 '생성 중...') */
  submittingLabel?: string;
  /** 저장 성공 시 액션 행에 잠깐 표시할 메시지 (예: GP '저장되었습니다.') — 미지정 시 미표시 */
  successMessage?: string;
  /** 설명 필수 여부 (KPA create: true). 기본 false */
  requireDescription?: boolean;
  /** 태그 1개 이상 필수 여부 (KPA create: true). 기본 false */
  requireTags?: boolean;
  /** 필드 토글 — 미지정 시 전부 노출 */
  fields?: {
    visibility?: boolean;
    /** members 일 때만 표시. 기본 true */
    requiresApproval?: boolean;
    reusablePolicy?: boolean;
    tags?: boolean;
  };
}

export interface InstructorCourseFormShellProps {
  config?: InstructorCourseFormConfig;
  initialValues?: Partial<InstructorCourseFormValues>;
  /** 저장 로직(생성/수정) — wrapper 책임. reject 시 shell 이 에러 표시. */
  onSubmit: (values: InstructorCourseFormValues) => Promise<void> | void;
  /** 취소 버튼 노출(있을 때만). */
  onCancel?: () => void;
  /** 액션 행에 추가로 렌더할 노드(예: GP 승인요청/강의종료). shell 은 내용을 알지 못함. */
  extraActions?: React.ReactNode;
  /** 폼 전체 비활성화. */
  disabled?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: {
    padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, color: '#111827', outline: 'none',
  },
  textarea: {
    padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, color: '#111827', outline: 'none', resize: 'vertical', minHeight: 100,
  },
  radioRow: { display: 'flex', gap: 16 },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' },
  checkRow: { display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' },
  tagContainer: {
    display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px',
    border: '1px solid #d1d5db', borderRadius: 8, minHeight: 44, alignItems: 'center',
  },
  tagRemove: { cursor: 'pointer', fontSize: 14, lineHeight: 1 },
  tagInput: { border: 'none', outline: 'none', fontSize: 13, flex: 1, minWidth: 80, color: '#111827' },
  hint: { fontSize: 11, color: '#9ca3af' },
  actions: { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end', marginTop: 8, flexWrap: 'wrap' },
  cancelBtn: {
    padding: '10px 20px', background: '#f3f4f6', color: '#374151',
    border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer',
  },
  error: { color: '#ef4444', fontSize: 13, margin: 0 },
  success: { fontSize: 13, color: '#16a34a' },
};

function hexToTint(accent: string): { bg: string; fg: string } {
  // 기본 보라 계열 톤(KPA canonical) — accent 별 칩 색은 단순화하여 accent 자체를 텍스트색으로.
  return { bg: '#f3f4f6', fg: accent };
}

export function InstructorCourseFormShell({
  config = {},
  initialValues,
  onSubmit,
  onCancel,
  extraActions,
  disabled = false,
}: InstructorCourseFormShellProps) {
  const accent = config.accent ?? '#4f46e5';
  const submitLabel = config.submitLabel ?? '강의 생성';
  const submittingLabel = config.submittingLabel ?? '생성 중...';
  const showVisibility = config.fields?.visibility ?? true;
  const showRequiresApproval = config.fields?.requiresApproval ?? true;
  const showReusablePolicy = config.fields?.reusablePolicy ?? true;
  const showTags = config.fields?.tags ?? true;

  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [visibility, setVisibility] = useState<CourseFormVisibility>(initialValues?.visibility ?? 'members');
  const [requiresApproval, setRequiresApproval] = useState(initialValues?.requiresApproval ?? false);
  const [reusablePolicy, setReusablePolicy] = useState<CourseFormReusablePolicy>(initialValues?.reusablePolicy ?? 'restricted');
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const tint = hexToTint(accent);

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (!t || t.length > 30 || tags.includes(t)) { setTagInput(''); return; }
    setTags((prev) => [...prev, t]);
    setTagInput('');
  };
  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const isValid =
    title.trim().length > 0 &&
    (!config.requireDescription || description.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    if (config.requireTags && showTags && tags.length === 0) {
      setError('태그를 1개 이상 입력해주세요');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        visibility,
        requiresApproval,
        reusablePolicy,
        tags,
      });
      if (config.successMessage) {
        setSuccess(config.successMessage);
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitBtnStyle: React.CSSProperties = {
    padding: '10px 24px',
    background: (!isValid || submitting || disabled) ? '#c4b5fd' : accent,
    color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
    cursor: (!isValid || submitting || disabled) ? 'not-allowed' : 'pointer',
  };

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <div style={styles.field}>
        <label style={styles.label}>강의 제목 *</label>
        <input
          style={styles.input}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="강의 제목을 입력하세요"
          maxLength={255}
          disabled={disabled}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>강의 설명{config.requireDescription ? ' *' : ''}</label>
        <textarea
          style={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="강의 내용과 목표를 설명해 주세요"
          disabled={disabled}
        />
      </div>

      {showVisibility && (
        <div style={styles.field}>
          <label style={styles.label}>공개 범위 *</label>
          <div style={styles.radioRow}>
            {(['members', 'public'] as CourseFormVisibility[]).map((v) => (
              <label key={v} style={styles.radioLabel}>
                <input
                  type="radio"
                  name="visibility"
                  value={v}
                  checked={visibility === v}
                  onChange={() => setVisibility(v)}
                  disabled={disabled}
                />
                {v === 'members' ? '회원제 강의' : '공개 강의'}
              </label>
            ))}
          </div>
          <span style={styles.hint}>회원제는 로그인 회원만, 공개는 모두에게 노출됩니다.</span>
        </div>
      )}

      {showVisibility && showRequiresApproval && visibility === 'members' && (
        <div style={styles.field}>
          <label style={styles.checkRow}>
            <input
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              style={{ marginTop: 2 }}
              disabled={disabled}
            />
            <span>
              <span style={{ ...styles.label, display: 'block' }}>강사 승인 필요</span>
              <span style={styles.hint}>수강 신청 후 강사가 직접 승인해야 수강이 가능합니다.</span>
            </span>
          </label>
        </div>
      )}

      {showReusablePolicy && (
        <div style={styles.field}>
          <label style={styles.label}>매장 자료함 활용 허용</label>
          <div style={styles.radioRow}>
            {(['restricted', 'platform'] as CourseFormReusablePolicy[]).map((v) => (
              <label key={v} style={styles.radioLabel}>
                <input
                  type="radio"
                  name="reusablePolicy"
                  value={v}
                  checked={reusablePolicy === v}
                  onChange={() => setReusablePolicy(v)}
                  disabled={disabled}
                />
                {v === 'restricted' ? '차단(기본)' : '모든 매장 허용'}
              </label>
            ))}
          </div>
          <span style={styles.hint}>허용 시 매장 운영자가 이 강의를 자료함에 추가하여 매장 콘텐츠로 활용할 수 있습니다(공개 메타데이터만 노출, 강의 본문/영상은 복사되지 않음).</span>
        </div>
      )}

      {showTags && (
        <div style={styles.field}>
          <label style={styles.label}>태그</label>
          <div style={styles.tagContainer}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px',
                  background: tint.bg, color: tint.fg, borderRadius: 999, fontSize: 12, fontWeight: 500,
                }}
              >
                {tag}
                <span style={{ ...styles.tagRemove, color: tint.fg }} onClick={() => !disabled && removeTag(tag)}>×</span>
              </span>
            ))}
            <input
              style={styles.tagInput}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="태그 입력 후 Enter"
              disabled={disabled}
            />
          </div>
          <span style={styles.hint}>Enter 키로 태그를 추가하세요</span>
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.actions}>
        {onCancel && (
          <button type="button" style={styles.cancelBtn} onClick={onCancel} disabled={disabled}>
            취소
          </button>
        )}
        <button type="submit" style={submitBtnStyle} disabled={!isValid || submitting || disabled}>
          {submitting ? submittingLabel : submitLabel}
        </button>
        {extraActions}
        {success && <span style={styles.success}>{success}</span>}
      </div>
    </form>
  );
}

export default InstructorCourseFormShell;
