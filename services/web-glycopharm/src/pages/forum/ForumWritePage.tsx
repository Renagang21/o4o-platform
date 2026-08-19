/**
 * ForumWritePage — Forum Post Creation with RichTextEditor
 *
 * WO-GLYCOPHARM-COMMUNITY-HUB-IMPLEMENTATION-V1
 * WO-O4O-GLYCOPHARM-FORUM-EDITOR-MIGRATION-V1
 * WO-O4O-FORUM-TAG-CANONICAL-ALIGNMENT-V1: category 제거 (KPA Canonical 정렬)
 *
 * Route: /forum/write
 * WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1: @o4o/shared-space-ui ForumWriteForm 기반(create-only).
 * RichTextEditor HTML 을 그대로 전송 — 백엔드 normalizeContent 가 Block[] 정규화.
 * Uses apiClient centralized pattern (GlycoPharm standard).
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createForumPost, fetchForumPost, updateForumPost } from '@/services/forumApi';
import { toast } from '@o4o/error-handling';
// WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1: 공통 글쓰기 폼(create-only)
import { ForumWriteForm, forumContentToHtml } from '@o4o/shared-space-ui';
import type { ForumWriteFormPayload, ForumWriteFormPostTypeOption } from '@o4o/shared-space-ui';

const POST_TYPES: ForumWriteFormPostTypeOption[] = [
  { value: 'discussion', label: '토론' },
  { value: 'question', label: '질문' },
  { value: 'guide', label: '가이드' },
  { value: 'poll', label: '설문' },
  { value: 'announcement', label: '공지' },
];

export default function ForumWritePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  // WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C:
  //   게시글 수정 adoption gap 해소 — 같은 페이지의 edit 모드(KPA ForumWritePage 와 같은 축).
  const { postId } = useParams<{ postId?: string }>();
  const isEdit = Boolean(postId);
  const [loading, setLoading] = useState(isEdit);
  const [initialTitle, setInitialTitle] = useState('');
  const [initialContentHtml, setInitialContentHtml] = useState('');

  useEffect(() => {
    if (!isEdit || !postId) return;
    let alive = true;
    fetchForumPost(postId)
      .then((res) => {
        if (!alive || !res?.data) return;
        setInitialTitle(res.data.title);
        setInitialContentHtml(forumContentToHtml((res.data as any).content));
      })
      .catch(() => toast.error('게시글을 불러오지 못했습니다.'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isEdit, postId]);

  const handleUpdate = async (payload: ForumWriteFormPayload) => {
    if (!postId) return;
    try {
      const data = await updateForumPost(postId, {
        title: payload.title,
        type: payload.type ?? 'discussion',
        content: payload.editorHtml,
      });
      if (data.success) {
        navigate(`/forum/posts/${postId}`);
      } else {
        toast.error(data.error || '게시글 수정에 실패했습니다.');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) toast.error('본인이 작성한 글만 수정할 수 있습니다.');
      else toast.error('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleCreate = async (payload: ForumWriteFormPayload) => {
    try {
      const data = await createForumPost({
        title: payload.title,
        type: payload.type ?? 'discussion',
        // 백엔드 normalizeContent 가 HTML→Block[] 정규화 (forum-core 프론트 의존 제거)
        content: payload.editorHtml,
      });

      // WO-O4O-WEB-UX-STANDARDIZATION-BATCH-V1: 작성 직후 이동 경로가 `/forum/post/:id` 였으나
      // glycopharm 의 게시글 상세 route 는 `/forum/posts/:id` 라 글을 쓰자마자 404 로 떨어졌다.
      if (data.success && data.data?.id) {
        navigate(`/forum/posts/${data.data.id}`);
      } else if (data.id) {
        navigate(`/forum/posts/${data.id}`);
      } else {
        toast.error(data.error || '게시글 작성에 실패했습니다.');
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  if (isEdit && loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <p style={styles.loginText}>불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loginPrompt}>
            <h2 style={styles.loginTitle}>로그인이 필요합니다</h2>
            <p style={styles.loginText}>게시글을 작성하려면 로그인해주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>{isEdit ? '글 수정' : '글쓰기'}</h1>

        {user && (
          <div style={styles.authorInfo}>
            <span style={styles.authorLabel}>작성자 표시명:</span>
            <span style={styles.authorName}>{user.nickname || user.name}</span>
            <p style={styles.authorHint}>(표시명은 프로필에서 변경할 수 있습니다)</p>
          </div>
        )}

        <ForumWriteForm
          initialTitle={initialTitle}
          initialContentHtml={initialContentHtml}
          showPostType
          postTypeOptions={POST_TYPES}
          postTypeLabel="글 유형"
          titleLabel="제목"
          titlePlaceholder="게시글 제목을 입력하세요"
          contentLabel="내용"
          contentPlaceholder="게시글 내용을 작성하세요"
          submitLabel={isEdit ? '수정하기' : '등록'}
          submittingLabel={isEdit ? '수정 중...' : '등록 중...'}
          cancelLabel="취소"
          theme="emerald"
          minHeight="300px"
          editorProps={{ preset: 'compact' }}
          onSubmit={isEdit ? handleUpdate : handleCreate}
          onCancel={() => navigate(-1)}
          onInvalid={(reason) =>
            toast.error(reason === 'title' ? '제목을 입력해주세요.' : '내용을 입력해주세요.')
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
    backgroundColor: '#059669',
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
