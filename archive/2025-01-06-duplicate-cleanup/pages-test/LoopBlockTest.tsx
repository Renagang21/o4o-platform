import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { IntegrationStatus } from '@/components/IntegrationStatus';

interface WordPressPost {
  id: number;
  date: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  acf?: Record<string, any>;
  _embedded?: {
    author?: Array<{
      name: string;
    }>;
    'wp:featuredmedia'?: Array<{
      source_url: string;
    }>;
  };
}

export default function LoopBlockTest() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postType, setPostType] = useState('products');
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(`/cpt/${postType}/posts`, {
        params: {
          per_page: 10,
          page: currentPage,
          _embed: true,
          orderby: 'date',
          order: 'desc'
        }
      });

      setPosts(response.data);
      
      // Get total pages from headers
      const totalPagesHeader = response.headers['x-wp-totalpages'];
      if (totalPagesHeader) {
        setTotalPages(parseInt(totalPagesHeader));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch posts');
      // console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [postType, currentPage]);

  const renderPost = (post: WordPressPost) => {
    const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    const authorName = post._embedded?.author?.[0]?.name || 'Unknown';

    return (
      <Card key={post.id} className="mb-4">
        <CardHeader>
          <CardTitle>{typeof post.title?.rendered === 'string' ? post.title.rendered : (post.title?.rendered as any)?.rendered || 'Untitled'}</CardTitle>
          <div className="text-sm text-gray-500">
            By {authorName} on {new Date(post.date).toLocaleDateString()}
          </div>
        </CardHeader>
        <CardContent>
          {featuredImage && (
            <img 
              src={featuredImage} 
              alt={typeof post.title?.rendered === 'string' ? post.title.rendered : 'Post image'}
              className="w-full h-48 object-cover mb-4 rounded"
            />
          )}
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: typeof post.content?.rendered === 'string' ? post.content.rendered : '' }}
          />
          
          {post.acf && Object.keys(post.acf).length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h4 className="font-semibold mb-2">Custom Fields (ACF):</h4>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(post.acf, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6">
      {/* Integration Status Summary */}
      <div className="mb-8">
        <IntegrationStatus />
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Loop Block API Test</h1>
        
        <div className="flex gap-4 items-center mb-4">
          <Select value={postType} onValueChange={setPostType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="products">Products</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="events">Events</SelectItem>
              <SelectItem value="testimonials">Testimonials</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={fetchPosts} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {posts.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No posts found for this post type.</p>
            </CardContent>
          </Card>
        )}

        {posts.map(renderPost)}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2">API Endpoint:</h3>
        <code className="text-sm">/api/v1/cpt/{postType}/posts?per_page=10&page=1&_embed=true</code>
        <p className="text-sm mt-2">
          This endpoint returns WordPress REST API formatted data that can be consumed by the Loop block.
        </p>
      </div>

      <div className="mt-4 p-4 bg-green-50 rounded">
        <h3 className="font-semibold mb-2">Integration Status:</h3>
        <ul className="text-sm space-y-1">
          <li>✅ WordPress Post 형식 변환 완료</li>
          <li>✅ ACF 필드 매핑 (fields → acf) 완료</li>
          <li>✅ Loop 블록 CPT API 연동 완료</li>
          <li>✅ WordPress API 미들웨어 설정 완료</li>
        </ul>
        <p className="text-sm mt-2">
          이제 Gutenberg 에디터의 Loop 블록에서 CPT 데이터를 불러올 수 있습니다.
        </p>
      </div>
    </div>
  );
}