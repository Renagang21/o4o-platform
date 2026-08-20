/**
 * ForumWritePageShell — 공통 포럼 글쓰기/수정 화면 셸 (presentational)
 *
 * WO-O4O-COMMUNITY-FORUM-WRITE-SHELL-TEMPLATE-V1
 *
 * ForumWriteForm(폼 본문)은 이미 공통이나, 그 폼을 감싸는 화면 셸
 * (page/container · heading · 작성자 표시 · 로그인 게이트 · 로딩 · 게시판 selector)이
 * K-Cosmetics / GlycoPharm 에 그대로 복제돼 있었다. 그 셸만 여기로 승격한다.
 *
 * 규칙:
 * - fetch / axios / 서비스 API import 없음. router 의존 없음.
 * - serviceKey 분기 · if (service === ...) · switch(serviceType) 없음.
 * - 게시판 목록·권한·scope 판정은 서비스 wrapper 와 기존 backend contract 가 소유한다.
 *   본 셸은 전달받은 option 을 렌더만 한다.
 * - 폼 본문(제목/에디터/액션/validation)은 children 으로 받는다 — 통상 ForumWriteForm.
 */

import type { CSSProperties, ReactNode } from 'react';

export interface ForumWritePageShellForumOption {
  id: string;
  name: string;
}

export interface ForumWritePageShellLabels {
  createHeading?: string;
  editHeading?: string;
  loadingText?: string;
  loginTitle?: string;
  loginDescription?: string;
  authorLabel?: string;
  authorHint?: string;
  forumLabel?: string;
  forumLoadingOption?: string;
  forumEmptyOption?: string;
  forumEmptyHint?: string;
}

const DEFAULT_LABELS: Required<ForumWritePageShellLabels> = {
  createHeading: '글쓰기',
  editHeading: '글 수정',
  loadingText: '불러오는 중...',
  loginTitle: '로그인이 필요합니다',
  loginDescription: '게시글을 작성하려면 로그인해주세요.',
  authorLabel: '작성자 표시명:',
  authorHint: '(표시명은 프로필에서 변경할 수 있습니다)',
  forumLabel: '게시판',
  forumLoadingOption: '불러오는 중…',
  forumEmptyOption: '게시판 없음',
  forumEmptyHint: '아직 글을 등록할 수 있는 게시판이 없습니다.',
};

export interface ForumWritePageShellProps {
  /** create / edit — heading 과 기본 selector 노출 여부만 결정한다 */
  mode: 'create' | 'edit';
  isAuthenticated: boolean;
  /** edit 초기값 로딩 등 — true 면 로딩 화면만 렌더 */
  isLoading?: boolean;
  /** 있으면 작성자 표시명 블록 노출 */
  authorName?: string | null;

  /** 기본값: mode === 'create' */
  showForumSelect?: boolean;
  forums?: ForumWritePageShellForumOption[];
  forumId?: string;
  forumsLoading?: boolean;
  onForumChange?: (forumId: string) => void;
  /** label htmlFor 연결용 (서비스별 고유 id) */
  selectId?: string;

  labels?: ForumWritePageShellLabels;
  /** 폼 본문 (ForumWriteForm 등) */
  children: ReactNode;
}

export function ForumWritePageShell({
  mode,
  isAuthenticated,
  isLoading = false,
  authorName,
  showForumSelect,
  forums = [],
  forumId = '',
  forumsLoading = false,
  onForumChange,
  selectId = 'forum-write-shell-select',
  labels,
  children,
}: ForumWritePageShellProps) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const isEdit = mode === 'edit';
  const withForumSelect = showForumSelect ?? !isEdit;

  if (isLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <p style={styles.loginText}>{t.loadingText}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loginPrompt}>
            <h2 style={styles.loginTitle}>{t.loginTitle}</h2>
            <p style={styles.loginText}>{t.loginDescription}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>{isEdit ? t.editHeading : t.createHeading}</h1>

        {authorName && (
          <div style={styles.authorInfo}>
            <span style={styles.authorLabel}>{t.authorLabel}</span>
            <span style={styles.authorName}>{authorName}</span>
            <p style={styles.authorHint}>{t.authorHint}</p>
          </div>
        )}

        {withForumSelect && (
          <div style={styles.field}>
            <label style={styles.label} htmlFor={selectId}>{t.forumLabel}</label>
            <select
              id={selectId}
              value={forumId}
              disabled={forumsLoading || forums.length === 0}
              onChange={(e) => onForumChange?.(e.target.value)}
              style={styles.select}
            >
              {forumsLoading && <option value="">{t.forumLoadingOption}</option>}
              {!forumsLoading && forums.length === 0 && <option value="">{t.forumEmptyOption}</option>}
              {forums.map((forum) => (
                <option key={forum.id} value={forum.id}>{forum.name}</option>
              ))}
            </select>
            {!forumsLoading && forums.length === 0 && (
              <p style={styles.authorHint}>{t.forumEmptyHint}</p>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '60vh',
    backgroundColor: '#f8fafc',
  },
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '32px 16px',
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 24,
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
  select: {
    padding: '10px 14px',
    fontSize: 15,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  authorInfo: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginBottom: 24,
  },
  authorLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  authorName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1e293b',
  },
  authorHint: {
    fontSize: 12,
    color: '#94a3b8',
    margin: 0,
    width: '100%',
    marginTop: 2,
  },
  loginPrompt: {
    textAlign: 'center' as const,
    padding: '48px 0',
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 8,
  },
  loginText: {
    fontSize: 14,
    color: '#64748b',
  },
};
