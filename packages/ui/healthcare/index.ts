// Healthcare platform components exports

// Main page component
export { HealthcareMainPage } from './HealthcareMainPage';

// Block components
export { HeroSectionBlock } from './blocks/HeroSectionBlock';
export { ExpertContentBlock } from './blocks/ExpertContentBlock';
export { ProductListBlock } from './blocks/ProductListBlock';
export { TrendingIssuesBlock } from './blocks/TrendingIssuesBlock';
export { BusinessBannersBlock } from './blocks/BusinessBannersBlock';
export { CommunityBannerBlock } from './blocks/CommunityBannerBlock';

// Types and interfaces
export type {
  HealthcareBlock,
  HeroBlockData,
  ExpertContentBlockData,
  ProductListBlockData,
  TrendingBlockData,
  BusinessBannersBlockData,
  CommunityBannerBlockData,
  DragDropState,
  EditorMode,
  BlockActions,
  ResponsiveSettings
} from './types';

// Sample data
export {
  expertContents,
  recommendedProducts,
  newProducts,
  popularProducts,
  trendingIssues,
  businessBanners,
  communityBanner,
  heroSectionData
} from './sampleData';

export type {
  ExpertContent,
  Product,
  TrendingIssue,
  BusinessBanner
} from './sampleData';