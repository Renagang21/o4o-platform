/**
 * Cosmetics Analytics Widget Blocks
 *
 * Block renderers for cosmetics analytics widgets (trending, popular, personalized).
 * These wrap the UI components for use in ViewRenderer.
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';
import { CosmeticsTrendingPosts } from '@/components/ui/forum/CosmeticsTrendingPosts';
import { CosmeticsPopularPosts } from '@/components/ui/forum/CosmeticsPopularPosts';
import { CosmeticsPersonalizedFeed } from '@/components/ui/forum/CosmeticsPersonalizedFeed';

/**
 * CosmeticsTrendingBlock - Shows trending posts with growth indicators
 *
 * Props:
 * - limit: number (default: 5)
 * - period: '24h' | '7d' | '30d' (default: '24h')
 * - title: string (default: '지금 뜨는 리뷰')
 * - showViewCount: boolean (default: true)
 * - compact: boolean (default: false)
 */
export const CosmeticsTrendingBlock = ({ node }: BlockRendererProps) => {
  const {
    limit = 5,
    period = '24h',
    title = '지금 뜨는 리뷰',
    showViewCount = true,
    compact = false,
  } = node.props;

  return (
    <CosmeticsTrendingPosts
      limit={limit}
      period={period}
      title={title}
      showViewCount={showViewCount}
      compact={compact}
    />
  );
};

/**
 * CosmeticsPopularBlock - Shows popular posts with rank badges
 *
 * Props:
 * - limit: number (default: 5)
 * - categorySlug: string (optional)
 * - title: string (default: '인기 리뷰')
 * - compact: boolean (default: false)
 * - variant: 'list' | 'grid' (default: 'list')
 */
export const CosmeticsPopularBlock = ({ node }: BlockRendererProps) => {
  const {
    limit = 5,
    categorySlug,
    title = '인기 리뷰',
    compact = false,
    variant = 'list',
  } = node.props;

  return (
    <CosmeticsPopularPosts
      limit={limit}
      categorySlug={categorySlug}
      title={title}
      compact={compact}
      variant={variant}
    />
  );
};

/**
 * CosmeticsPersonalizedBlock - Shows personalized recommendations
 *
 * Props:
 * - limit: number (default: 5)
 * - title: string (default: '나를 위한 추천')
 * - showMatchReason: boolean (default: true)
 * - compact: boolean (default: false)
 */
export const CosmeticsPersonalizedBlock = ({ node }: BlockRendererProps) => {
  const {
    limit = 5,
    title = '나를 위한 추천',
    showMatchReason = true,
    compact = false,
  } = node.props;

  return (
    <CosmeticsPersonalizedFeed
      limit={limit}
      title={title}
      showMatchReason={showMatchReason}
      compact={compact}
    />
  );
};
