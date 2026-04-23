/* @o4o/shared-space-ui — Shared presentation components for community home pages and HUB templates */

export { HeroSummarySection } from './HeroSummarySection';
export { NewsNoticesSection } from './NewsNoticesSection';
export { ActivitySection } from './ActivitySection';
export { AppEntrySection } from './AppEntrySection';
export { CtaGuidanceSection } from './CtaGuidanceSection';
export { SignagePreviewSection } from './SignagePreviewSection';
export { ContentHighlightSection } from './ContentHighlightSection';

/* HUB page templates */
export { LmsHubTemplate } from './LmsHubTemplate';
export type { LmsHubCourse, LmsHubFetchParams, LmsHubConfig } from './LmsHubTemplate';

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
  SignagePreviewSectionProps,
  ContentHighlightSectionProps,
} from './types';
