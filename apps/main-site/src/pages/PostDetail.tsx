import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../api/config/axios';

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
              const res = await axios.get(`/api/public/posts/post/${encodeURIComponent(slugOrId)}`);
              fetched = res.data?.data || res.data;
            } else {
              const res = await axios.get(`/api/posts/${encodeURIComponent(slugOrId)}`);
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
    // If blocks array
    if (Array.isArray(c)) {
      return (
        <div className="prose max-w-none">
          {c.map((b: any) => (
            <div key={b.id || Math.random()}>
              {b.type === 'core/paragraph' ? (
                <p>{b.content?.text || b.attributes?.content || ''}</p>
              ) : (
                <pre className="bg-gray-50 p-3 rounded">{JSON.stringify(b, null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      );
    }
    // If object with blocks
    if (c && typeof c === 'object' && 'blocks' in c) {
      const blocks = (c as any).blocks || [];
      return (
        <div className="prose max-w-none">
          {blocks.map((b: any) => (
            <div key={b.id || Math.random()}>
              {b.type === 'core/paragraph' ? (
                <p>{b.content?.text || b.attributes?.content || ''}</p>
              ) : (
                <pre className="bg-gray-50 p-3 rounded">{JSON.stringify(b, null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      );
    }
    // If string (raw/html)
    if (typeof c === 'string') {
      try {
        const parsed = JSON.parse(c);
        if (Array.isArray(parsed)) {
          return (
            <div className="prose max-w-none">
              {parsed.map((b: any) => (
                <p key={b.id || Math.random()}>{b.content?.text || b.attributes?.content || ''}</p>
              ))}
            </div>
          );
        }
      } catch (err) {
        // Ignore JSON parse error and fall back to rendering as HTML
        void err;
      }
      return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: c }} />;
    }
    return null;
  };

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-4 py-10">
      <article>
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
        {post.excerpt && (
          <p className="text-gray-600 mb-6">{post.excerpt}</p>
        )}
        {renderContent()}
      </article>
    </main>
  );
}
