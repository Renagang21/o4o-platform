/**
 * ForumWritePage - 게시글 작성 페이지
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 * Phase B-3: 글 작성 기능 구현
 *
 * 역할: o4o·네뚜레에 대해 의견을 남길 수 있는 공식 입구
 * - 로그인 불필요 (게스트 포함 누구나 작성 가능)
 * - 제목/내용 입력
 * - 성공 시 포럼 목록으로 이동
 *
 * 금지:
 * - 글 유형 선택 (공지/질문 등)
 * - 태그/카테고리 선택
 * - 첨부파일/이미지 업로드
 * - 임시저장/자동 초안
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import { htmlToBlocks } from '@o4o/forum-core';
import { useAuth } from '../../contexts';
import {
  createForumPost,
  fetchUserContactSettings,
  type UserContactSettings,
} from '../../services/forumApi';

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_SLUG = 'neture-forum';
const MIN_CONTENT_LENGTH = 5;

// ============================================================================
// Main Component
// ============================================================================

export function ForumWritePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  // NOTE: 현재 AuthContext는 테스트용이라 token이 없음
  // Real API 연동 시 AuthContext에 token 추가 필요
  const token = '';

  const [title, setTitle] = useState('');
  const [editorHtml, setEditorHtml] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WO-NETURE-EXTERNAL-CONTACT-V1: Contact settings
  const [contactSettings, setContactSettings] = useState<UserContactSettings | null>(null);
  const [showContactOnPost, setShowContactOnPost] = useState(false);

  // Load contact settings on mount (only for authenticated users)
  useEffect(() => {
    async function loadContactSettings() {
      if (!isAuthenticated) return;

      try {
        const settings = await fetchUserContactSettings(token);
        setContactSettings(settings);
      } catch (err) {
        console.error('Error loading contact settings:', err);
      }
    }

    loadContactSettings();
  }, [isAuthenticated, token]);

  // Check if user has contact info configured
  const hasContactInfo = contactSettings?.contactEnabled &&
    (contactSettings?.kakaoOpenChatUrl || contactSettings?.kakaoChannelUrl);

  const isFormValid = title.trim().length > 0 && editorHtml.trim().length >= MIN_CONTENT_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isFormValid) {
      setError('제목과 내용을 모두 입력해주세요. (내용은 최소 20자 이상)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Convert HTML to Block[]
      const blocks = htmlToBlocks(editorHtml);

      const response = await createForumPost(
        {
          title: title.trim(),
          content: blocks,
          categorySlug: CATEGORY_SLUG,
          // WO-NETURE-EXTERNAL-CONTACT-V1
          showContactOnPost: hasContactInfo ? showContactOnPost : false,
        },
        token || ''
      );

      if (response.success && response.data) {
        // 성공 시 작성한 글로 이동
        navigate(`/forum/post/${response.data.slug}`);
      } else {
        setError(response.error || '게시글 작성에 실패했습니다.');
      }
    } catch (err) {
      console.error('Error submitting post:', err);
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    if (title.trim() || editorHtml.trim()) {
      if (!window.confirm('작성 중인 내용이 있습니다. 정말 취소하시겠습니까?')) {
        return;
      }
    }
    navigate('/forum');
  }

  return (
    <div style={styles.container}>
      {/* Breadcrumb */}
      <nav style={styles.breadcrumb}>
        <Link to="/" style={styles.breadcrumbLink}>홈</Link>
        <span style={styles.breadcrumbDivider}>/</span>
        <Link to="/forum" style={styles.breadcrumbLink}>포럼</Link>
        <span style={styles.breadcrumbDivider}>/</span>
        <span style={styles.breadcrumbCurrent}>글쓰기</span>
      </nav>

      {/* Page Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>의견 남기기</h1>
        <p style={styles.description}>
          o4o와 네뚜레 구조에 대한 질문과 의견을 남겨주세요.
        </p>
      </header>

      {/* Notice Banner */}
      <div style={styles.noticeBanner}>
        <p style={styles.noticeText}>
          이 포럼은 상품 홍보나 고객 문의를 위한 공간이 아닙니다.
          <br />
          구조에 대한 질문·의견·제안을 환영합니다.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorBanner}>
          <p style={styles.errorText}>{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Title Input */}
        <div style={styles.formGroup}>
          <label htmlFor="title" style={styles.label}>
            제목 <span style={styles.required}>*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            style={styles.input}
            disabled={isSubmitting}
            maxLength={200}
          />
        </div>

        {/* Content Input */}
        <div style={styles.formGroup}>
          <label htmlFor="content" style={styles.label}>
            내용 <span style={styles.required}>*</span>
            <span style={styles.hint}> (최소 {MIN_CONTENT_LENGTH}자)</span>
          </label>
          <RichTextEditor
            value={editorHtml}
            onChange={(content) => setEditorHtml(content.html)}
            placeholder="의견을 작성해주세요..."
            minHeight="300px"
            editable={!isSubmitting}
          />
          <div style={styles.charCount}>
            {editorHtml.length}자
            {editorHtml.length < MIN_CONTENT_LENGTH && editorHtml.length > 0 && (
              <span style={styles.charCountWarning}>
                {' '}(최소 {MIN_CONTENT_LENGTH - editorHtml.length}자 더 필요)
              </span>
            )}
          </div>
        </div>

        {/* WO-NETURE-EXTERNAL-CONTACT-V1: Contact Option */}
        {hasContactInfo ? (
          <div style={styles.contactOption}>
            <label style={styles.contactLabel}>
              <input
                type="checkbox"
                checked={showContactOnPost}
                onChange={(e) => setShowContactOnPost(e.target.checked)}
                style={styles.checkbox}
                disabled={isSubmitting}
              />
              <span style={styles.contactText}>연락 정보 표시</span>
            </label>
            <p style={styles.contactHint}>
              이 글에 카카오톡 연락 링크를 표시합니다.
            </p>
          </div>
        ) : (
          <div style={styles.contactPrompt}>
            <p style={styles.contactPromptText}>
              연락 정보를 등록하면 글에 연락처를 표시할 수 있습니다.
            </p>
            <Link to="/profile/contact" style={styles.contactPromptLink}>
              연락 설정하기 →
            </Link>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button
            type="button"
            onClick={handleCancel}
            style={styles.cancelButton}
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="submit"
            style={{
              ...styles.submitButton,
              ...((!isFormValid || isSubmitting) ? styles.submitButtonDisabled : {}),
            }}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const PRIMARY_COLOR = '#2563EB';
const GRAY_100 = '#f1f5f9';
const GRAY_200 = '#e2e8f0';
const GRAY_400 = '#94a3b8';
const GRAY_500 = '#64748b';
const GRAY_600 = '#475569';
const GRAY_700 = '#334155';
const GRAY_900 = '#0f172a';
const RED_500 = '#ef4444';
const RED_50 = '#fef2f2';
const AMBER_50 = '#fffbeb';
const AMBER_700 = '#b45309';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '40px 20px',
  },

  // Breadcrumb
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    marginBottom: '24px',
  },
  breadcrumbLink: {
    color: GRAY_500,
    textDecoration: 'none',
  },
  breadcrumbDivider: {
    color: GRAY_400,
  },
  breadcrumbCurrent: {
    color: GRAY_400,
  },

  // Header
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: GRAY_900,
    margin: '0 0 8px 0',
  },
  description: {
    fontSize: '15px',
    color: GRAY_500,
    margin: 0,
    lineHeight: 1.5,
  },

  // Notice Banner
  noticeBanner: {
    backgroundColor: AMBER_50,
    border: `1px solid ${AMBER_700}33`,
    borderRadius: '8px',
    padding: '16px 20px',
    marginBottom: '24px',
  },
  noticeText: {
    fontSize: '14px',
    color: AMBER_700,
    margin: 0,
    lineHeight: 1.6,
  },

  // Error Banner
  errorBanner: {
    backgroundColor: RED_50,
    border: `1px solid ${RED_500}33`,
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
  },
  errorText: {
    fontSize: '14px',
    color: RED_500,
    margin: 0,
  },

  // Form
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: GRAY_700,
  },
  required: {
    color: RED_500,
  },
  hint: {
    fontWeight: 400,
    color: GRAY_400,
  },
  input: {
    padding: '12px 16px',
    fontSize: '15px',
    border: `1px solid ${GRAY_200}`,
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  textarea: {
    padding: '12px 16px',
    fontSize: '15px',
    border: `1px solid ${GRAY_200}`,
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.7,
    minHeight: '200px',
  },
  charCount: {
    fontSize: '13px',
    color: GRAY_400,
    textAlign: 'right',
  },
  charCountWarning: {
    color: AMBER_700,
  },

  // Contact Option (WO-NETURE-EXTERNAL-CONTACT-V1)
  contactOption: {
    padding: '16px 20px',
    backgroundColor: GRAY_100,
    borderRadius: '8px',
  },
  contactLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  contactText: {
    fontSize: '14px',
    fontWeight: 600,
    color: GRAY_700,
  },
  contactHint: {
    fontSize: '13px',
    color: GRAY_500,
    margin: '8px 0 0 28px',
  },
  contactPrompt: {
    padding: '16px 20px',
    backgroundColor: GRAY_100,
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  contactPromptText: {
    fontSize: '14px',
    color: GRAY_500,
    margin: 0,
  },
  contactPromptLink: {
    fontSize: '14px',
    color: PRIMARY_COLOR,
    textDecoration: 'none',
    fontWeight: 500,
  },

  // Actions
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '16px',
    borderTop: `1px solid ${GRAY_100}`,
  },
  cancelButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: GRAY_600,
    backgroundColor: 'transparent',
    border: `1px solid ${GRAY_200}`,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  submitButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: PRIMARY_COLOR,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  submitButtonDisabled: {
    backgroundColor: GRAY_400,
    cursor: 'not-allowed',
  },

};

export default ForumWritePage;
