/**
 * ForumWritePage — Simplified Forum Post Creation
 *
 * WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1
 * WO-O4O-FORUM-TAG-CANONICAL-ALIGNMENT-V1: category 제거 (KPA Canonical 정렬)
 *
 * Route: /forum/write
 * WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1: @o4o/shared-space-ui ForumWriteForm 기반(create-only).
 * RichTextEditor HTML 을 그대로 전송 — 백엔드 normalizeContent 가 Block[] 정규화.
 */

import { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createForumPost } from '../../services/forumApi';
import { toast } from '@o4o/error-handling';
// WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1: 공통 글쓰기 폼(create-only)
import { ForumWriteForm } from '@o4o/shared-space-ui';
import type { ForumWriteFormPayload, ForumWriteFormPostTypeOption } from '@o4o/shared-space-ui';

const POST_TYPES: ForumWriteFormPostTypeOption[] = [
  { value: 'discussion', label: 'Discussion' },
  { value: 'question', label: 'Question' },
  { value: 'guide', label: 'Guide' },
  { value: 'poll', label: 'Poll' },
  { value: 'announcement', label: 'Announcement' },
];

export default function ForumWritePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const handleCreate = async (payload: ForumWriteFormPayload) => {
    try {
      const data = await createForumPost({
        title: payload.title,
        type: payload.type ?? 'discussion',
        // 백엔드 normalizeContent 가 HTML→Block[] 정규화 (forum-core 프론트 의존 제거)
        content: payload.editorHtml,
      });

      if (data.success && data.data?.id) {
        navigate(`/forum/post/${data.data.id}`);
      } else {
        toast.error(data.error || 'Failed to create post.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Network error. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loginPrompt}>
            <h2 style={styles.loginTitle}>Login Required</h2>
            <p style={styles.loginText}>Please log in to write a post.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>Write a Post</h1>

        {user && (
          <div style={styles.authorInfo}>
            <span style={styles.authorLabel}>Display name:</span>
            <span style={styles.authorName}>{user.nickname || user.name}</span>
            <p style={styles.authorHint}>(You can change your display name in your profile settings)</p>
          </div>
        )}

        <ForumWriteForm
          showPostType
          postTypeOptions={POST_TYPES}
          postTypeLabel="Post Type"
          titleLabel="Title"
          titlePlaceholder="Enter post title"
          contentLabel="Content"
          contentPlaceholder="Write your post content here"
          submitLabel="Post"
          submittingLabel="Posting..."
          cancelLabel="Cancel"
          theme="pink"
          minHeight="300px"
          editorProps={{ preset: 'compact' }}
          onSubmit={handleCreate}
          onCancel={() => navigate(-1)}
          onInvalid={(reason) =>
            toast.error(reason === 'title' ? 'Please enter a title.' : 'Please enter content.')
          }
        />
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
  textarea: {
    padding: '12px 14px',
    fontSize: 15,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    backgroundColor: 'white',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    lineHeight: 1.6,
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
    backgroundColor: '#DB2777',
    color: 'white',
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
