/**
 * ForumWritePage — Simplified Forum Post Creation
 *
 * WO-GLYCOPHARM-COMMUNITY-HUB-IMPLEMENTATION-V1
 *
 * Route: /forum/write
 * Uses textarea (no rich editor dependency).
 * Converts plain text to Block[] format for API submission.
 * Uses apiClient centralized pattern (GlycoPharm standard).
 */

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '../../services/api';
import { toast } from '@o4o/error-handling';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

type PostType = 'discussion' | 'question' | 'guide' | 'poll' | 'announcement';

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'discussion', label: '토론' },
  { value: 'question', label: '질문' },
  { value: 'guide', label: '가이드' },
  { value: 'poll', label: '설문' },
  { value: 'announcement', label: '공지' },
];

/** Convert plain text to Block[] format */
function textToBlocks(text: string): Array<{ type: string; content: string }> {
  return text
    .split('\n\n')
    .filter((p) => p.trim())
    .map((p) => ({ type: 'paragraph', content: p.trim() }));
}

export default function ForumWritePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [postType, setPostType] = useState<PostType>('discussion');
  const [content, setContent] = useState('');

  useEffect(() => {
    apiClient
      .get<ForumCategory[]>('/api/v1/glycopharm/forum/categories')
      .then((res) => {
        const data = (res as any)?.data ?? res;
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!categoryId) {
      toast.error('카테고리를 선택해주세요.');
      return;
    }
    if (!content.trim()) {
      toast.error('내용을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const blocks = textToBlocks(content);
      const res = await apiClient.post('/api/v1/glycopharm/forum/posts', {
        title: title.trim(),
        categoryId,
        type: postType,
        content: blocks,
      });

      const data = res as any;
      if (data.success && data.data?.id) {
        navigate(`/forum/post/${data.data.id}`);
      } else if (data.id) {
        navigate(`/forum/post/${data.id}`);
      } else {
        toast.error(data.error || '게시글 작성에 실패했습니다.');
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

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

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>글쓰기</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Category */}
          <div style={styles.field}>
            <label style={styles.label}>카테고리</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={styles.select}
            >
              <option value="">카테고리를 선택하세요</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Post Type */}
          <div style={styles.field}>
            <label style={styles.label}>글 유형</label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as PostType)}
              style={styles.select}
            >
              {POST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div style={styles.field}>
            <label style={styles.label}>제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="게시글 제목을 입력하세요"
              style={styles.input}
              maxLength={200}
            />
          </div>

          {/* Content */}
          <div style={styles.field}>
            <label style={styles.label}>내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="게시글 내용을 작성하세요. 빈 줄 두 개로 문단을 구분합니다."
              style={styles.textarea}
              rows={12}
            />
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={styles.cancelBtn}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitBtn,
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
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
    backgroundColor: '#059669',
    color: 'white',
    cursor: 'pointer',
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
