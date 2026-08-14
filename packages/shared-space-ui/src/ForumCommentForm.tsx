/**
 * ForumCommentForm — forum 댓글 작성 입력 공통 부품 (presentational)
 *
 * WO-O4O-COMMUNITY-FORUM-KPA-NETURE-VIEW-CONVERGENCE-V1
 *
 * KPA / Neture 상세가 각각 복제하던 "댓글 textarea + 등록 버튼 + 미로그인 안내" 를 수렴한다.
 * 상태(value)·제출은 호출측이 소유하며, 이 부품은 comment API / auth / router 를 알지 않는다.
 * - 미로그인 처리 차이(KPA=로그인 링크 · Neture=로그인 모달 버튼)는 `loginPrompt` slot 으로 표현한다.
 * - 제출 실패 인라인 배너는 `error` prop 으로만 표시하고, 입력값은 지우지 않는다(호출측 정책 유지).
 */

import type { CSSProperties, ReactNode } from 'react';

export interface ForumCommentFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
  /** false 면 form 대신 loginPrompt 를 렌더한다. */
  authenticated?: boolean;
  loginPrompt?: ReactNode;
  /** 인라인 오류 배너 (없으면 미표시) */
  error?: string | null;
  placeholder?: string;
  rows?: number;
  submitLabel?: string;
  submittingLabel?: string;
  /** 모바일 터치 타깃(44px) 확보 */
  compact?: boolean;
  /** 제출 버튼 색 (서비스 accent) */
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
}

export function ForumCommentForm({
  value,
  onChange,
  onSubmit,
  submitting = false,
  authenticated = true,
  loginPrompt,
  error,
  placeholder = '댓글을 입력하세요',
  rows = 3,
  submitLabel = '댓글 등록',
  submittingLabel = '등록 중...',
  compact = false,
  accentColor = '#2563EB',
  className,
  style,
}: ForumCommentFormProps) {
  if (!authenticated) {
    return <>{loginPrompt ?? null}</>;
  }

  const disabled = submitting || !value.trim();

  return (
    <form
      className={className}
      style={{ ...styles.form, ...style }}
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        onSubmit();
      }}
    >
      {error && (
        <div style={styles.errorBanner}>
          <p style={styles.errorText}>{error}</p>
        </div>
      )}
      <textarea
        style={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
      <div style={styles.actions}>
        <button
          type="submit"
          disabled={disabled}
          style={{
            ...styles.submit,
            backgroundColor: accentColor,
            ...(compact ? { minHeight: 44, padding: '10px 18px' } : null),
            ...(disabled ? styles.submitDisabled : null),
          }}
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, CSSProperties> = {
  form: {
    marginBottom: 24,
  },
  textarea: {
    width: '100%',
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    resize: 'vertical',
    boxSizing: 'border-box',
    outline: 'none',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  submit: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  submitDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  errorBanner: {
    padding: '10px 12px',
    marginBottom: 8,
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
  },
  errorText: {
    margin: 0,
    fontSize: 13,
    color: '#dc2626',
  },
};
