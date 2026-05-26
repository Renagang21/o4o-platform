/* @o4o/shared-space-ui — Shared presentation components for community home pages and HUB templates */

/* WO-O4O-HERO-BANNER-COMMONIZE-V1: 공통 Hero 광고 캐러셀 */
export { HeroBannerSection } from './HeroBannerSection';
export type { HeroBannerAd, HeroBannerFallback, HeroBannerSectionProps } from './HeroBannerSection';

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

/* WO-O4O-GUIDE-UI-COMPONENT-V1: 화면 안 상황 안내 카드 (전 서비스 공통) */
export { GuideBlock } from './GuideBlock';
export type { GuideBlockProps, GuideBlockVariant } from './GuideBlock';

/* WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1: LMS 강의 Reference Metadata preview (자료함/POP/QR/블로그 공용) */
export { LessonCardPreview } from './LessonCardPreview';
export type { LessonCardPreviewProps, LessonCardPreviewVariant } from './LessonCardPreview';

/* WO-O4O-APPRECIATION-PANEL-COMPONENT-EXTRACTION-V1: 감사 포인트 공통 컴포넌트 (Forum/LMS/Content 공용) */
export { AppreciationPanel } from './AppreciationPanel';
export type {
  AppreciationPanelProps,
  AppreciationTargetType,
  AppreciationSummaryData,
  AppreciationRecentItem,
  AppreciationApi,
  AppreciationTheme,
  AppreciationVariant,
} from './AppreciationPanel';

/* WO-O4O-GUIDE-CLIENT-EXTRACTION-V1: guide_contents API client + GuideEditableSection (Base) */
export * from './guide-client';

/* WO-O4O-HOME-SHARED-ICONS-V1: AppEntry 카드용 공통 아이콘 */
export { ForumIcon, EducationIcon, ContentIcon, SignageIcon, ResourcesIcon } from './HomeAppIcons';

/* WO-O4O-STANDARD-HOME-TEMPLATE-V1: 공통 Home 레이아웃 (KPA/GlycoPharm/K-Cosmetics) */
export { StandardHomeTemplate } from './StandardHomeTemplate';
export type { StandardHomeTemplateProps } from './StandardHomeTemplate';

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

/* Public Blog UI — WO-O4O-BLOG-UI-PARTIAL-EXTRACT-V1
 * 검증된 pure layer 만 추출: BlogPublicHeader / blogTemplates / useBlogSeo / public API client.
 * Staff editor / AI wiring / settings UI / backend extraction 은 비포함 — premature abstraction 회피. */
export * from './blog';

/* SEO registry hook + 공통 유틸 — WO-O4O-KPA-NETURE-SEO-REGISTRY-USEPAGESEO-V1 / WO-O4O-BLOG-SEO-JSONLD-CANONICAL-V1
 * usePageSeo: registry 기반 페이지별 메타 설정 (브라우저/SNS 보조용).
 * getMeta/setMeta/removeMeta: DOM meta 태그 조작 유틸.
 * setCanonical/removeCanonical: canonical 링크 관리.
 * insertJsonLd/removeJsonLd/buildArticleJsonLd: JSON-LD 구조화 데이터 관리. */
export type { PageSeoConfig, SeoRegistry } from './seo/types';
export { usePageSeo, getMeta, setMeta, removeMeta, setCanonical, removeCanonical, insertJsonLd, removeJsonLd, buildArticleJsonLd } from './seo';

export type {
  /* Data types */
  NoticeItem,
  FeaturedPost,
  RecentPost,
  SignageMediaItem,
  SignagePlaylistItem,
  ContentHighlightItem,
  /* WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1: LMS 강의 Reference Metadata 공용 타입 */
  LessonSnapshotContent,
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
