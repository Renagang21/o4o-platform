import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { cookieAuthClient } from '@o4o/auth-client';
import { metaApi, MetaItemResponse } from '../../services/metaApi';
import type { ViewPreset, ViewPresetConfig } from '@o4o/types';

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
  // Phase 1: Preset IDs
  defaultViewPresetId?: string;
  defaultTemplatePresetId?: string;
}

// Archive configuration interface
interface ArchiveConfig {
  pageSize: number;
  orderBy: string;
  order: 'ASC' | 'DESC';
  status: string;
  columns: number;
}

// Helper: Apply ViewPreset config to archive settings with fallback
function applyViewPresetToArchiveConfig(
  presetConfig: ViewPresetConfig | undefined,
  defaults: ArchiveConfig
): ArchiveConfig {
  if (!presetConfig) return defaults;

  return {
    ...defaults,
    // Pagination
    pageSize: presetConfig.pageSize ?? defaults.pageSize,
    // Sorting
    orderBy: presetConfig.sort?.field ?? defaults.orderBy,
    order: presetConfig.sort?.direction?.toUpperCase() as 'ASC' | 'DESC' ?? defaults.order,
    // Filters (can extend later)
    status: defaults.status, // Keep default for now
    // Layout
    columns: presetConfig.columns ?? defaults.columns,
  };
}

const CPTArchive: React.FC = () => {
  const { cptSlug } = useParams<{ cptSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<CPTPost[]>([]);
  const [cptInfo, setCptInfo] = useState<CPTType | null>(null);
  const [viewPreset, setViewPreset] = useState<ViewPreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [postMetaMap, setPostMetaMap] = useState<Map<string, MetaItemResponse[]>>(new Map());

  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Default archive config (fallback)
  const defaultConfig: ArchiveConfig = {
    pageSize: 12,
    orderBy: 'date',
    order: 'DESC',
    status: 'publish',
    columns: 4,
  };

  // Apply ViewPreset if available
  const archiveConfig = applyViewPresetToArchiveConfig(viewPreset?.config, defaultConfig);

  // Fetch CPT information and ViewPreset
  useEffect(() => {
    const fetchCPTInfo = async () => {
      try {
        const response = await cookieAuthClient.api.get(`/cpt/types/${cptSlug}`);
        const cptData = response.data;

        // Check if this CPT has archive enabled
        if (!cptData.hasArchive) {
          setError('This post type does not have an archive page.');
          setLoading(false);
          return;
        }

        setCptInfo(cptData);

        // Phase 1: Fetch ViewPreset if configured
        if (cptData.defaultViewPresetId) {
          try {
            const presetResponse = await cookieAuthClient.api.get(`/presets/views/${cptData.defaultViewPresetId}`);
            if (presetResponse.data.success && presetResponse.data.data) {
              setViewPreset(presetResponse.data.data);
              console.log('[CPTArchive] ViewPreset loaded:', presetResponse.data.data.name);
            }
          } catch (presetErr) {
            console.warn('[CPTArchive] Failed to load ViewPreset, using fallback:', presetErr);
            // Graceful fallback - continue without preset
            setViewPreset(null);
          }
        } else {
          console.log('[CPTArchive] No defaultViewPresetId configured, using fallback layout');
          setViewPreset(null);
        }
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

        // Phase 1: Use archiveConfig from ViewPreset or fallback
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: archiveConfig.pageSize.toString(),
          status: archiveConfig.status,
          orderby: archiveConfig.orderBy,
          order: archiveConfig.order
        });

        const response = await cookieAuthClient.api.get(`/cpt/${cptSlug}/posts?${params}`);

        if (response.data.success) {
          const fetchedPosts = response.data.data || [];
          setPosts(fetchedPosts);
          setTotalPages(Math.ceil((response.data.total || 0) / archiveConfig.pageSize));

          // Phase 4-2: Batch fetch metadata for price display (ds_product only)
          if (cptSlug === 'ds_product' && fetchedPosts.length > 0) {
            try {
              const postIds = fetchedPosts.map((p: CPTPost) => p.id);
              const metaMap = await metaApi.getBatch(postIds, 'price');
              setPostMetaMap(metaMap);
            } catch (metaErr) {
              console.error('Failed to batch fetch price metadata:', metaErr);
              // Continue without metadata - graceful fallback
            }
          }
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
  }, [cptSlug, cptInfo, currentPage, archiveConfig.pageSize, archiveConfig.orderBy, archiveConfig.order, archiveConfig.status]);

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
            <div className={`grid grid-cols-1 md:grid-cols-2 ${
              archiveConfig.columns === 3 ? 'lg:grid-cols-3' :
              archiveConfig.columns === 4 ? 'lg:grid-cols-3 xl:grid-cols-4' :
              archiveConfig.columns === 2 ? 'lg:grid-cols-2' :
              'lg:grid-cols-3 xl:grid-cols-4'
            } gap-6 mb-8`}>
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
                    
                    {/* Price for products - Phase 4-2: Use Meta API */}
                    {cptSlug === 'ds_product' && (() => {
                      const metaItems = postMetaMap.get(post.id);
                      const priceItem = metaItems?.find(m => m.meta_key === 'price');
                      const price = priceItem?.meta_value as number | undefined;

                      if (price) {
                        return (
                          <div className="mt-3 text-lg font-bold text-blue-600">
                            ₩{price.toLocaleString()}
                          </div>
                        );
                      }
                      return null;
                    })()}
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