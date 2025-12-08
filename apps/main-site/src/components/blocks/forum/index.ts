/**
 * Forum Block Components
 *
 * Block renderers for forum-related content.
 * Styled with CMS Theme tokens (CSS variables).
 */

export { ForumHomeBlock } from './ForumHome';
export { ForumPostListBlock } from './ForumPostList';
export { ForumPostDetailBlock } from './ForumPostDetail';
export { ForumCommentSectionBlock } from './ForumCommentSection';
export { ForumCategoryListBlock } from './ForumCategoryList';

// Cosmetics-specific blocks
export { CosmeticsPostListBlock } from './CosmeticsPostList';

// Cosmetics Analytics Widgets
export {
  CosmeticsTrendingBlock,
  CosmeticsPopularBlock,
  CosmeticsPersonalizedBlock,
} from './CosmeticsAnalyticsWidgets';

// Theme utilities
export { forumStyles, getPrimaryColor, getPrimaryBg, mergeStyles } from './theme';
