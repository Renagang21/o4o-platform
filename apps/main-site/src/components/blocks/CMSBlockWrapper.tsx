/**
 * CMS Block Wrapper
 *
 * Wraps CMS blocks and handles data fetching
 */

'use client';

import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import type { DesignerNode } from './BlockRenderer';
import { fetchCMSDataForBlock, type CMSContext } from '@/lib/cms/loader';

interface CMSBlockWrapperProps {
  node: DesignerNode;
  children: (nodeWithData: DesignerNode) => React.ReactNode;
}

const CMS_BLOCK_TYPES = [
  'CPTList',
  'CPTItem',
  'CategoryList',
  'TagCloud',
  'RecentPosts',
  'RelatedPosts',
  'Breadcrumb',
  'Pagination',
  'SearchBar',
];

/**
 * Check if a block type is a CMS block that needs data fetching
 */
export function isCMSBlock(type: string): boolean {
  return CMS_BLOCK_TYPES.includes(type);
}

/**
 * Wrapper component that handles data fetching for CMS blocks
 */
export function CMSBlockWrapper({ node, children }: CMSBlockWrapperProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Build CMS context from current route and params
        const context: CMSContext = {
          currentSlug: location.pathname.split('/').pop() || undefined,
          preview: searchParams.get('preview') === '1',
          searchQuery: searchParams.get('q') || undefined,
          page: parseInt(searchParams.get('page') || '1', 10),
        };

        // Fetch data for this block
        const blockData = await fetchCMSDataForBlock(node, context);
        setData(blockData);
      } catch (err) {
        console.error('Error fetching CMS block data:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [node.type, node.props, location.pathname, searchParams]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-sm text-red-600">Error loading content: {error.message}</div>
      </div>
    );
  }

  // Inject fetched data into node props
  const nodeWithData: DesignerNode = {
    ...node,
    props: {
      ...node.props,
      data,
    },
  };

  return <>{children(nodeWithData)}</>;
}
