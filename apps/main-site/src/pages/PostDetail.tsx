import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cookieAuthClient } from '@o4o/auth-client';
import { BlockRenderer } from '@o4o/block-renderer';
import { useCustomizerSettings } from '../hooks/useCustomizerSettings';
import AccessDeniedMessage from '../components/common/AccessDeniedMessage';

type PostData = {
  id: string;
  title: string;
  slug?: string;
  content?: any;
  excerpt?: string;
  status?: string;
};

export default function PostDetail() {
  const { slugOrId = '' } = useParams();
  const { currentWidth, currentPadding } = useCustomizerSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<any>(null);
  const [post, setPost] = useState<PostData | null>(null);

  useEffect(() => {
    let active = true;
    const fetchPost = async () => {
      if (!slugOrId) return;
      setLoading(true);
      setError(null);
      try {
        // Use public API for both slug and ID lookups
        const res = await cookieAuthClient.api.get(`/public/posts/post/${encodeURIComponent(slugOrId)}`);
        const fetched = res.data?.data || res.data;

        if (!active) return;
        setPost({
          id: fetched.id,
          title: fetched.title || 'Untitled',
          slug: fetched.slug,
          content: fetched.content || fetched.blocks,
          excerpt: fetched.excerpt || fetched?.metadata?.excerpt,
          status: fetched.status,
        });
      } catch (e: any) {
        if (!active) return;

        // Check for access denied error (403)
        if (e?.response?.status === 403 && e?.response?.data?.code === 'ACCESS_DENIED') {
          setAccessDenied(e.response.data);
        } else {
          setError(e?.message || 'Failed to load post');
        }
        setPost(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchPost();
    return () => {
      active = false;
    };
  }, [slugOrId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading post...</div>
      </div>
    );
  }

  // Access denied state
  if (accessDenied) {
    return (
      <AccessDeniedMessage
        message={accessDenied.message}
        redirectUrl={accessDenied.redirectUrl}
        requiresAuth={accessDenied.requiresAuth}
      />
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

    // Use BlockRenderer for all block-based content
    // Note: Don't wrap with prose - each block has its own typography styles
    return <BlockRenderer blocks={c} />;
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
