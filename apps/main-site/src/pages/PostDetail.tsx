import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../services/api';
import { WordPressBlockRenderer } from '../components/WordPressBlockRenderer';
import { useCustomizerSettings } from '../hooks/useCustomizerSettings';

type PostData = {
  id: string;
  title: string;
  slug?: string;
  content?: any;
  excerpt?: string;
  status?: string;
};

function isLikelyId(value: string): boolean {
  // Treat as ID if it looks like a UUID or a 24+ char id
  const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4.test(value) || value.length >= 24;
}

export default function PostDetail() {
  const { slugOrId = '' } = useParams();
  const { currentWidth, currentPadding } = useCustomizerSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<PostData | null>(null);

  const tryOrder = useMemo(() => {
    // Prefer slug lookup first unless it looks like a strong ID
    if (!slugOrId) return [] as const;
    if (isLikelyId(slugOrId)) return ['id', 'slug'] as const;
    return ['slug', 'id'] as const;
  }, [slugOrId]);

  useEffect(() => {
    let active = true;
    const fetchPost = async () => {
      if (!slugOrId) return;
      setLoading(true);
      setError(null);
      try {
        let fetched: any = null;
        for (const mode of tryOrder) {
          try {
            if (mode === 'slug') {
              const res = await apiClient.get(`/public/posts/post/${encodeURIComponent(slugOrId)}`);
              fetched = res.data?.data || res.data;
            } else {
              const res = await apiClient.get(`/posts/${encodeURIComponent(slugOrId)}`);
              fetched = res.data?.data || res.data;
            }
            if (fetched) break;
          } catch (err: any) {
            // continue to next mode if 404
            if (err?.response?.status !== 404) {
              throw err;
            }
          }
        }
        if (!active) return;
        if (!fetched) {
          setError('Post not found');
          setPost(null);
        } else {
          setPost({
            id: fetched.id,
            title: fetched.title || 'Untitled',
            slug: fetched.slug,
            content: fetched.content || fetched.blocks,
            excerpt: fetched.excerpt || fetched?.metadata?.excerpt,
            status: fetched.status,
          });
        }
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Failed to load post');
        setPost(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchPost();
    return () => {
      active = false;
    };
  }, [slugOrId, tryOrder]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading post...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">{error || 'Post not found'}</div>
      </div>
    );
  }

  const renderContent = () => {
    const c = post.content;
    if (!c) return null;

    // Use WordPressBlockRenderer for all block-based content
    // Note: Don't wrap with prose - each block has its own typography styles
    return <WordPressBlockRenderer blocks={c} />;
  };

  return (
    <article
      className="py-10 mx-auto"
      style={{
        maxWidth: `${currentWidth}px`,
        paddingLeft: `${currentPadding.left}px`,
        paddingRight: `${currentPadding.right}px`,
      }}
    >
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      {post.excerpt && (
        <p className="text-gray-600 mb-6">{post.excerpt}</p>
      )}
      {renderContent()}
    </article>
  );
}
