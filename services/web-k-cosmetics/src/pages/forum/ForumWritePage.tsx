/**
 * ForumWritePage — Simplified Forum Post Creation
 *
 * WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1
 *
 * Route: /forum/write
 * Uses textarea (no rich editor dependency).
 * Converts plain text to Block[] format for API submission.
 */

import { useState, useEffect, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPopularForums, type PopularForum } from '../../services/forumApi';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.o4o.world';

type PostType = 'discussion' | 'question' | 'guide' | 'poll' | 'announcement';

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'discussion', label: 'Discussion' },
  { value: 'question', label: 'Question' },
  { value: 'guide', label: 'Guide' },
  { value: 'poll', label: 'Poll' },
  { value: 'announcement', label: 'Announcement' },
];

function getAuthToken(): string | null {
  try {
    const authData = localStorage.getItem('auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.accessToken || parsed.token || null;
    }
  } catch {
    // Ignore
  }
  return null;
}

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
  const [categories, setCategories] = useState<PopularForum[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [postType, setPostType] = useState<PostType>('discussion');
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchPopularForums(50)
      .then((res) => {
        setCategories(res.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter a title.');
      return;
    }
    if (!categoryId) {
      alert('Please select a category.');
      return;
    }
    if (!content.trim()) {
      alert('Please enter content.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      alert('Please log in to write a post.');
      return;
    }

    try {
      setSubmitting(true);
      const blocks = textToBlocks(content);
      const res = await fetch(`${API_URL}/api/v1/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          categoryId,
          type: postType,
          content: blocks,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.id) {
        navigate(`/forum/post/${data.data.id}`);
      } else {
        alert(data.error || 'Failed to create post.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
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
        <h1 style={styles.heading}>Write a Post</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Category */}
          <div style={styles.field}>
            <label style={styles.label}>Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={styles.select}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Post Type */}
          <div style={styles.field}>
            <label style={styles.label}>Post Type</label>
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
            <label style={styles.label}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              style={styles.input}
              maxLength={200}
            />
          </div>

          {/* Content */}
          <div style={styles.field}>
            <label style={styles.label}>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content here. Use double line breaks for paragraphs."
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitBtn,
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Posting...' : 'Post'}
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
    backgroundColor: '#DB2777',
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
