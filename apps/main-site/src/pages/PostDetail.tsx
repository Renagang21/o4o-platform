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

export default function PostDetail() {
  const { slugOrId = '' } = useParams();
  const { currentWidth, currentPadding } = useCustomizerSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<PostData | null>(null);

  useEffect(() => {
    let active = true;
    const fetchPost = async () => {
      if (!slugOrId) return;
      setLoading(true);
      setError(null);
      try {
        // Use public API for both slug and ID lookups
        const res = await apiClient.get(`/public/posts/post/${encodeURIComponent(slugOrId)}`);
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
  }, [slugOrId]);

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
