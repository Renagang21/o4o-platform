import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { apiClient as api } from '../../services/api';

interface CPTPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  meta?: any;
  author?: {
    id: string;
    name: string;
  };
}

interface CPTType {
  id: string;
  name: string;
  slug: string;
  labels?: any;
  hasArchive: boolean;
  public: boolean;
  rewrite?: any;
}

const CPTArchive: React.FC = () => {
  const { cptSlug } = useParams<{ cptSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<CPTPost[]>([]);
  const [cptInfo, setCptInfo] = useState<CPTType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const postsPerPage = 12;

  // Fetch CPT information
  useEffect(() => {
    const fetchCPTInfo = async () => {
      try {
        const response = await api.get(`/cpt/types/${cptSlug}`);
        const cptData = response.data;
        
        // Check if this CPT has archive enabled
        if (!cptData.hasArchive) {
          setError('This post type does not have an archive page.');
          setLoading(false);
          return;
        }
        
        setCptInfo(cptData);
      } catch (err: any) {
        console.error('Error fetching CPT info:', err);
        setError('Post type not found');
        setLoading(false);
      }
    };

    if (cptSlug) {
      fetchCPTInfo();
    }
  }, [cptSlug]);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!cptInfo) return;
      
      try {
        setLoading(true);
        
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: postsPerPage.toString(),
          status: 'publish',
          orderby: 'date',
          order: 'DESC'
        });

        const response = await api.get(`/cpt/${cptSlug}/posts?${params}`);
        
        if (response.data.success) {
          setPosts(response.data.data || []);
          setTotalPages(Math.ceil((response.data.total || 0) / postsPerPage));
        } else {
          setPosts([]);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    if (cptInfo) {
      fetchPosts();
    }
  }, [cptSlug, cptInfo, currentPage]);

  const handlePageChange = (page: number) => {
    setSearchParams({ page: page.toString() });
    window.scrollTo(0, 0);
  };

  const handlePostClick = (post: CPTPost) => {
    navigate(`/cpt/${cptSlug}/${post.slug}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const archiveTitle = cptInfo?.labels?.all_items || `${cptInfo?.name} Archive`;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Archive Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{archiveTitle}</h1>
          {cptInfo?.labels?.menu_name && (
            <p className="text-gray-600">{cptInfo.labels.menu_name}</p>
          )}
        </div>

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handlePostClick(post)}
                >
                  {/* Featured Image */}
                  {post.featuredImage && (
                    <div className="aspect-w-16 aspect-h-9">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="p-4">
                    <h2 className="text-xl font-semibold mb-2 line-clamp-2">
                      {post.title}
                    </h2>
                    
                    {post.excerpt && (
                      <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                        {post.excerpt}
                      </p>
                    )}
                    
                    {/* Meta info */}
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      {post.author && <span>{post.author.name}</span>}
                    </div>
                    
                    {/* Price for products */}
                    {cptSlug === 'ds_product' && post.meta?.price && (
                      <div className="mt-3 text-lg font-bold text-blue-600">
                        ₩{post.meta.price.toLocaleString()}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex justify-center">
                <ul className="flex space-x-2">
                  {/* Previous button */}
                  <li>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded ${
                        currentPage === 1
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border'
                      }`}
                    >
                      Previous
                    </button>
                  </li>

                  {/* Page numbers */}
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    // Show only nearby pages
                    if (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 2
                    ) {
                      return (
                        <li key={page}>
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`px-4 py-2 rounded ${
                              page === currentPage
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border'
                            }`}
                          >
                            {page}
                          </button>
                        </li>
                      );
                    } else if (
                      page === currentPage - 3 ||
                      page === currentPage + 3
                    ) {
                      return <li key={page}>...</li>;
                    }
                    return null;
                  })}

                  {/* Next button */}
                  <li>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded ${
                        currentPage === totalPages
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border'
                      }`}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No posts found in this archive.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CPTArchive;