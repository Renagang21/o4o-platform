/**
 * BranchForumWritePage - 분회 포럼 글쓰기/수정
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';

import { useAuth } from '../../contexts';
import { branchApi } from '../../api/branch';
import { colors } from '../../styles/theme';

export function BranchForumWritePage() {
  const { branchId, id } = useParams<{ branchId: string; id?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: 'general',
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      loadPost();
    }
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const res = await branchApi.getForumPostDetail(branchId!, id!);
      setFormData({
        title: res.data.post.title,
        content: res.data.post.content,
        categoryId: res.data.post.categoryId || 'general',
      });
    } catch (err) {
      alert('게시글을 불러오는데 실패했습니다.');
      navigate(`/branch/${branchId}/forum`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        await branchApi.updateForumPost(branchId!, id!, formData);
        navigate(`/branch/${branchId}/forum/post/${id}`);
      } else {
        const res = await branchApi.createForumPost(branchId!, formData);
        navigate(`/branch/${branchId}/forum/post/${res.data.id}`);
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
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="글을 작성하려면 로그인해주세요."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="게시글을 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title={isEdit ? '글 수정' : '글쓰기'}
        breadcrumb={[
          { label: '홈', href: `/branch/${branchId}` },
          { label: '포럼', href: `/branch/${branchId}/forum` },
          { label: isEdit ? '수정' : '글쓰기' },
        ]}
      />

      <Card padding="large">
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>카테고리</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              style={styles.select}
            >
              <option value="general">일반</option>
              <option value="qna">질문/답변</option>
              <option value="info">정보공유</option>
              <option value="free">자유게시판</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>제목</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={styles.input}
              placeholder="제목을 입력하세요"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>내용</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              style={styles.textarea}
              placeholder="내용을 입력하세요"
              rows={15}
              required
            />
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => navigate(`/branch/${branchId}/forum`)}
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
    padding: '14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '15px',
    boxSizing: 'border-box',
  },
  select: {
    width: '200px',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: colors.white,
  },
  textarea: {
    width: '100%',
    padding: '14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '15px',
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
    padding: '14px 28px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '14px 28px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
