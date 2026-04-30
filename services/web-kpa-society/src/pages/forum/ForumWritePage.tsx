/**
 * ForumWritePage - 포럼 글쓰기 페이지
 *
 * WO-O4O-FORUM-CATEGORY-FULL-REMOVAL-V2:
 * 카테고리 완전 제거 — 제목 + 내용만 작성
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { RichTextEditor } from '@o4o/content-editor';
import { htmlToBlocks, blocksToHtml } from '@o4o/forum-core/utils';
import { PageHeader, LoadingSpinner, Card } from '../../components/common';
import { forumApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';

export function ForumWritePage() {
  const { id, slug: forumSlug } = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [editorHtml, setEditorHtml] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    forumApi.getPost(id)
      .then((res) => {
        const post = res.data;
        const htmlContent = Array.isArray(post.content)
          ? blocksToHtml(post.content)
          : (typeof post.content === 'string' ? post.content : '');
        setTitle(post.title);
        setEditorHtml(htmlContent);
      })
      .catch(() => toast.error('데이터를 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !editorHtml.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요.');
      return;
    }
    try {
      setSubmitting(true);
      const blocks = htmlToBlocks(editorHtml);
      // WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1: forumSlug 전달 → 백엔드에서 forum_id 매핑
      const submitData = forumSlug
        ? { title, content: blocks, forumSlug }
        : { title, content: blocks };
      if (isEdit && id) {
        await forumApi.updatePost(id, submitData);
        navigate(`/forum/post/${id}`);
      } else {
        const res = await forumApi.createPost(submitData);
        // 글이 속한 포럼 피드로 이동 (forum slug 있으면 포럼 피드, 없으면 게시글 상세)
        if (forumSlug) {
          navigate(`/forum/${forumSlug}`);
        } else {
          navigate(`/forum/post/${res.data.id}`);
        }
      }
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <Card padding="large">
          <p style={styles.loginPrompt}>글을 작성하려면 로그인이 필요합니다.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="로딩 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title={isEdit ? '글 수정' : '글쓰기'}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '포럼', href: '/forum' },
          { label: isEdit ? '수정' : '글쓰기' },
        ]}
      />

      <Card padding="large">
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>제목</label>
            <input
              type="text"
              style={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 세무 신고 어떻게 하시나요? / 신제품 입고 후기 공유"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>내용</label>
            <RichTextEditor
              value={editorHtml}
              onChange={(content) => setEditorHtml(content.html)}
              placeholder="질문, 정보 공유, 경험담 등 자유롭게 작성해보세요"
              minHeight="400px"
              editable={!submitting}
            />
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => navigate(-1)}
            >
              취소
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? '저장 중...' : isEdit ? '수정하기' : '등록하기'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  loginPrompt: {
    ...typography.bodyL,
    color: colors.neutral500,
    textAlign: 'center',
    padding: '40px',
  },
  field: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    color: colors.neutral700,
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '32px',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '12px 32px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
