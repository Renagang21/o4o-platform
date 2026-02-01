/**
 * ForumWritePage - 포럼 글쓰기 페이지
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import { htmlToBlocks, blocksToHtml } from '@o4o/forum-core/utils';
import { PageHeader, LoadingSpinner, Card } from '../../components/common';
import { forumApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { ForumCategory } from '../../types';

export function ForumWritePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
  });

  const [editorHtml, setEditorHtml] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const categoriesRes = await forumApi.getCategories();
      setCategories(categoriesRes.data);

      if (isEdit && id) {
        const postRes = await forumApi.getPost(id);
        const post = postRes.data;

        // Convert Block[] to HTML for editor
        const htmlContent = Array.isArray(post.content)
          ? blocksToHtml(post.content)
          : (typeof post.content === 'string' ? post.content : '');

        setEditorHtml(htmlContent);
        setFormData({
          title: post.title,
          categoryId: post.categoryId,
        });
      }
    } catch (err) {
      alert('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !editorHtml.trim() || !formData.categoryId) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);

      // Convert HTML to Block[]
      const blocks = htmlToBlocks(editorHtml);
      const submitData = {
        ...formData,
        content: blocks,
      };

      if (isEdit && id) {
        await forumApi.updatePost(id, submitData);
        navigate(`/forum/post/${id}`);
      } else {
        const res = await forumApi.createPost(submitData);
        navigate(`/forum/post/${res.data.id}`);
      }
    } catch (err) {
      alert('저장에 실패했습니다.');
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
            <label style={styles.label}>카테고리</label>
            <select
              style={styles.select}
              value={formData.categoryId}
              onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
              required
            >
              <option value="">카테고리 선택</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>제목</label>
            <input
              type="text"
              style={styles.input}
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="제목을 입력하세요"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>내용</label>
            <RichTextEditor
              value={editorHtml}
              onChange={(content) => setEditorHtml(content.html)}
              placeholder="내용을 입력하세요"
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
  select: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: colors.white,
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    lineHeight: 1.6,
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
