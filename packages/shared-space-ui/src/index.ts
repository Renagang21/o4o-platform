/* @o4o/shared-space-ui — Shared presentation components for community home pages and HUB templates */

export { HeroSummarySection } from './HeroSummarySection';
export { NewsNoticesSection } from './NewsNoticesSection';
export { ActivitySection } from './ActivitySection';
export { AppEntrySection } from './AppEntrySection';
export { CtaGuidanceSection } from './CtaGuidanceSection';
export { O4OHelpSection } from './O4OHelpSection';
export { SignagePreviewSection } from './SignagePreviewSection';
export { ContentHighlightSection } from './ContentHighlightSection';

/* HUB common components */
export { HubPagination } from './HubPagination';
export type { HubPaginationProps } from './HubPagination';

/* HUB page templates */
export { LmsHubTemplate } from './LmsHubTemplate';
export type { LmsHubCourse, LmsHubFetchParams, LmsHubConfig } from './LmsHubTemplate';

export { ForumHubTemplate } from './ForumHubTemplate';
export type { ForumHubCategory, ForumHubPost, ForumHubConfig } from './ForumHubTemplate';

export { StoreHubTemplate } from './StoreHubTemplate';
export type { StoreHubResourceCard, StoreHubFlowStep, StoreHubConfig, StoreHubTemplateProps } from './StoreHubTemplate';

export { ContentHubTemplate } from './ContentHubTemplate';
export type { ContentHubItem, ContentHubFilter, ContentHubFetchParams, ContentHubFetchResult, ContentHubItemContext, ContentHubConfig } from './ContentHubTemplate';

export { ResourcesHubTemplate } from './ResourcesHubTemplate';
export type { ResourcesHubItem, ResourcesHubFetchParams, ResourcesHubFetchResult, ResourcesHubConfig } from './ResourcesHubTemplate';

export { SignageHubTemplate } from './SignageHubTemplate';
export type { SignageHubItem, SignageHubFilter, SignageHubFetchParams, SignageHubFetchResult, SignageHubRenderContext, SignageHubConfig } from './SignageHubTemplate';

export { SignageManagerTemplate } from './SignageManagerTemplate';
export type { SignageHubVideo, SignageHubPlaylist, SignageManagerConfig } from './SignageManagerTemplate';

/* Template Presets — WO-O4O-TEMPLATE-PRESET-DEFINITION-V1 */
export { templates, templatePresets } from './templates';
export type { TemplateKey, TemplateTokens, TemplatePreset, PresetCategory } from './templates';

/* Guide pages — WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1 */
export * from './guide';

export type {
  /* Data types */
  NoticeItem,
  FeaturedPost,
  RecentPost,
  SignageMediaItem,
  SignagePlaylistItem,
  ContentHighlightItem,
  /* Component props */
  HeroSummarySectionProps,
  NewsNoticesSectionProps,
  ActivitySectionProps,
  AppEntrySectionProps,
  CtaGuidanceSectionProps,
  O4OHelpSectionProps,
  O4OHelpUsageItem,
  O4OHelpServiceItem,
  SignagePreviewSectionProps,
  ContentHighlightSectionProps,
} from './types';
