/**
 * Forum UI Components
 *
 * ViewRenderer-compatible components for forum pages.
 * Uses CSS variables for theming (cosmetics forum support).
 */

export { ForumHomeView } from './ForumHomeView';
export { ForumListView } from './ForumListView';
export { ForumDetailView } from './ForumDetailView';
export { ForumCategoryView } from './ForumCategoryView';
export { ForumTagView } from './ForumTagView';

// Cosmetics Forum Components
export { CosmeticsFilterBar } from './CosmeticsFilterBar';
export type { CosmeticsFilters } from './CosmeticsFilterBar';
export { CosmeticsForumListView } from './CosmeticsForumListView';
export { CosmeticsReviewCard } from './CosmeticsReviewCard';
export type { CosmeticsReviewData } from './CosmeticsReviewCard';
export {
  CosmeticsRecommendedPosts,
  CosmeticsRelatedProducts,
} from './CosmeticsRecommendedPosts';
export { CosmeticsSEO, CosmeticsBreadcrumb } from './CosmeticsSEO';

// Utils
export * from './utils';
