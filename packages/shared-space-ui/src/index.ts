/* @o4o/shared-space-ui — Shared presentation components for community home pages and HUB templates */

/* WO-O4O-HERO-BANNER-COMMONIZE-V1: 공통 Hero 광고 캐러셀 */
export { HeroBannerSection } from './HeroBannerSection';
export type { HeroBannerAd, HeroBannerFallback, HeroBannerSectionProps } from './HeroBannerSection';

export { NewsNoticesSection } from './NewsNoticesSection';
export { AppEntrySection } from './AppEntrySection';
export { CtaGuidanceSection } from './CtaGuidanceSection';
export { O4OHelpSection } from './O4OHelpSection';
export { SignagePreviewSection } from './SignagePreviewSection';
export { ContentHighlightSection } from './ContentHighlightSection';

// WO-O4O-CROSSSERVICE-POLICY-ROUTES-V1: 공개 정책 문서(약관/개인정보) 뷰어
export { PolicyDocumentViewer } from './legal/PolicyDocumentViewer';
export type { PolicyDocumentViewerProps, PolicyDocumentDto } from './legal/PolicyDocumentViewer';

// WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1: 공개 푸터 동적 법정정보
export { PublicLegalFooterInfo } from './legal/PublicLegalFooterInfo';
export type { PublicLegalFooterInfoProps, PublicLegalProfileDto } from './legal/PublicLegalFooterInfo';

// WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1: 공통 푸터 법정정보 loader factory
export { createFooterLegalLoader } from './legal/footerLegalLoader';

// WO-O4O-STORE-FACING-FOOTER-COVERAGE-V1: store-facing 화면 공통 compact 푸터
export { StoreFacingFooter } from './legal/StoreFacingFooter';
export type { StoreFacingFooterProps, StoreFacingFooterLinks } from './legal/StoreFacingFooter';

// WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1: 공개 문의 폼
export { PublicContactForm } from './legal/PublicContactForm';
export type { PublicContactFormProps, ContactInquiryPayload, PublicContactFormTheme } from './legal/PublicContactForm';

/* HUB common components */
export { HubPagination } from './HubPagination';
export type { HubPaginationProps } from './HubPagination';

/* WO-O4O-FORUM-LIST-SHARED-PRIMITIVES-V1: 포럼 목록 상대 시간 표시 유틸 (공통) */
export { formatForumDate } from './formatForumDate';

/* WO-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1: 포럼 목록 공통 표시 타입 */
export type { ForumListItem, ForumListItemPostType } from './forumListItem';

/* WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1: 포럼 목록 공통 presentational 컴포넌트 */
export { ForumListTemplate } from './ForumListTemplate';
export type { ForumListTemplateProps } from './ForumListTemplate';

/* WO-O4O-GUIDE-UI-COMPONENT-V1: 화면 안 상황 안내 카드 (전 서비스 공통) */
export { GuideBlock } from './GuideBlock';
export type { GuideBlockProps, GuideBlockVariant } from './GuideBlock';

/* WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1: LMS 강의 Reference Metadata preview (자료함/POP/QR/블로그 공용) */

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

/* WO-O4O-FORUM-USER-REQUEST-FORM-COMMONIZATION-V1: 포럼 개설 신청 공통 폼 */
export { ForumRequestForm } from './ForumRequestForm';
export type { ForumRequestFormProps, ForumRequestFormPayload, ForumRequestFormTheme } from './ForumRequestForm';

/* WO-O4O-FORUM-WRITE-FORM-COMMONIZATION-V1: 포럼 글쓰기 공통 폼 (create-only) */
export { ForumWriteForm } from './ForumWriteForm';
export type {
  ForumWriteFormProps,
  ForumWriteFormPayload,
  ForumWriteFormTheme,
  ForumWritePostType,
  ForumWriteFormPostTypeOption,
} from './ForumWriteForm';

/* WO-O4O-FORUM-DETAIL-PRIMITIVES-EXTRACTION-V1: forum detail 본문 렌더 공통 부품 + content 변환기 */
export { ForumPostContent } from './ForumPostContent';
export type { ForumPostContentProps } from './ForumPostContent';
export { forumContentToHtml } from './forumContentToHtml';
export type { ForumContentToHtmlOptions } from './forumContentToHtml';

/* WO-O4O-FORUM-DETAIL-STATES-HEADER-EXTRACTION-V1: forum detail header + loading/error/not-found 공통 부품 */
export { ForumPostHeader } from './ForumPostHeader';
export type { ForumPostHeaderProps } from './ForumPostHeader';
export {
  ForumDetailLoadingState,
  ForumDetailErrorState,
  ForumDetailNotFoundState,
  ForumDetailSkeletonState,
} from './ForumDetailStates';
export type {
  ForumDetailLoadingStateProps,
  ForumDetailErrorStateProps,
  ForumDetailNotFoundStateProps,
  ForumDetailSkeletonStateProps,
} from './ForumDetailStates';

/* WO-O4O-FORUM-DETAIL-COMMENT-LIST-COMMONIZATION-V1: forum 댓글 목록 표시 공통 부품 */
export { ForumCommentList } from './ForumCommentList';
export type { ForumCommentListItem, ForumCommentListProps } from './ForumCommentList';

/* WO-O4O-COMMUNITY-FORUM-KPA-NETURE-VIEW-CONVERGENCE-V1: KPA/Neture 포럼 목록·상세 수렴 부품 */
export { ForumLikeButton } from './ForumLikeButton';
export type { ForumLikeButtonProps } from './ForumLikeButton';
export { ForumCommentForm } from './ForumCommentForm';
export type { ForumCommentFormProps } from './ForumCommentForm';
export { ForumListToolbar, ForumListInfoBar } from './ForumListToolbar';
export type {
  ForumListToolbarProps,
  ForumListInfoBarProps,
  ForumListFilterChip,
} from './ForumListToolbar';

/* WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1:
 * 포럼 소유자 영역 (내 포럼 대시보드 · 폐쇄형 회원 관리) 공통 View + adapter 계약.
 * 서비스는 API adapter · links · theme · slot 만 주입한다 (서비스 분기 없음). */
export * from './forum-owner';

/* WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-V1: O4O 표준 커뮤니티 콘텐츠 작성 form shell (KPA canonical 추출) */
export { CommunityContentWriteShell } from './community/CommunityContentWriteShell';
export type {
  CommunityContentWriteShellProps,
  CommunityContentWriteValues,
  CommunityContentWriteConfig,
  CommunityContentReusablePolicy,
} from './community/CommunityContentWriteShell';

/* WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-PHASE2-V1: 콘텐츠 상세 표시 + 검색 primitive */
export { CommunityContentDetailView } from './community/CommunityContentDetailView';
export type {
  CommunityContentDetailViewProps,
  CommunityContentDetailData,
  CommunityContentBadge,
  CommunityContentBadgeTone,
} from './community/CommunityContentDetailView';
export { CommunityContentSearchBar } from './community/CommunityContentSearchBar';
export type { CommunityContentSearchBarProps } from './community/CommunityContentSearchBar';

/* WO-O4O-COMMUNITY-CONTENT-RESOURCE-FRONTEND-VIEW-COMMONIZATION-V1:
 * 커뮤니티 콘텐츠·자료실 목록/상세 공통 View + adapter 계약.
 * 서비스는 fetch adapter · config · renderLink 만 주입한다 (서비스 분기 없음). */
export {
  CommunityContentLoadingState,
  CommunityContentErrorState,
  CommunityContentEmptyState,
  formatCommunityContentDate,
} from './community/CommunityContentStates';
export type {
  CommunityContentLoadingStateProps,
  CommunityContentErrorStateProps,
  CommunityContentEmptyStateProps,
} from './community/CommunityContentStates';
export { CommunityContentListView, CommunityContentListTemplate } from './community/CommunityContentListView';
export type {
  CommunityContentListItem,
  CommunityContentListViewProps,
  CommunityContentListConfig,
  CommunityContentListTemplateProps,
  CommunityContentListFetchParams,
  CommunityContentListFetchResult,
  CommunityContentRenderLink,
} from './community/CommunityContentListView';
export {
  STANDARD_CONTENT_STATUS_LABEL,
  standardContentBadges,
  standardContentToListItem,
  standardContentToDetailData,
} from './community/standardContentAdapters';
export type { StandardCommunityContentRecord } from './community/standardContentAdapters';
export { CommunityContentDetailTemplate } from './community/CommunityContentDetailTemplate';
export type {
  CommunityContentDetailConfig,
  CommunityContentDetailTemplateProps,
} from './community/CommunityContentDetailTemplate';

/* WO-O4O-COMMUNITY-HOME-LATEST-ACTIVITY-SECTION-COMMONIZATION-V1: 홈 최신 활동 공통 View */
export {
  LatestActivitySection,
  LATEST_ACTIVITY_ACCENTS,
  LATEST_ACTIVITY_BADGES,
  LATEST_ACTIVITY_SUMMARY_LIMIT,
  buildLatestActivityTabs,
} from './community/LatestActivitySection';
export type {
  LatestActivitySectionProps,
  LatestActivityItem,
  LatestActivityTab,
  LatestActivityAccent,
} from './community/LatestActivitySection';

export { StoreHubTemplate } from './StoreHubTemplate';
export type { StoreHubResourceCard, StoreHubFlowStep, StoreHubConfig, StoreHubTemplateProps } from './StoreHubTemplate';

export { ContentHubTemplate } from './ContentHubTemplate';
export type { ContentHubItem, ContentHubFilter, ContentHubFetchParams, ContentHubFetchResult, ContentHubItemContext, ContentHubConfig } from './ContentHubTemplate';
/* WO-O4O-STORE-HUB-CONTENT-BROWSE-COMPONENT-EXTRACTION-V1: GP/KCos 공통 카드 그리드 */
export { contentHubCardGrid } from './ContentHubCardGrid';
export type { ContentHubCardAccent } from './ContentHubCardGrid';

export { ResourcesHubTemplate } from './ResourcesHubTemplate';
export type { ResourcesHubItem, ResourcesHubFetchParams, ResourcesHubFetchResult, ResourcesHubConfig } from './ResourcesHubTemplate';

export { SignageHubTemplate } from './SignageHubTemplate';
export type { SignageHubItem, SignageHubFilter, SignageHubFetchParams, SignageHubFetchResult, SignageHubRenderContext, SignageHubConfig } from './SignageHubTemplate';

export { SignageManagerTemplate } from './SignageManagerTemplate';
export type { SignageHubVideo, SignageHubPlaylist, SignageManagerConfig } from './SignageManagerTemplate';

/* WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1: 사이니지 플레이리스트 등록 공통 shell (community/operator/store) */
export { SignagePlaylistCreateShell } from './signage/SignagePlaylistCreateShell';
export type {
  SignagePlaylistCreateShellProps,
  SignagePlaylistCreateConfig,
  SignagePlaylistCreateValues,
  SignagePlaylistCreateItem,
  SignagePlaylistSurface,
} from './signage/SignagePlaylistCreateShell';

/* WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-A:
   내 매장 플레이리스트 등록 화면 공통 View (KPA/KCos/GP 3벌 껍데기 복제 제거) */
export { StorePlaylistCreateView } from './signage/StorePlaylistCreateView';
export type { StorePlaylistCreateViewProps } from './signage/StorePlaylistCreateView';

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
  SignageMediaItem,
  SignagePlaylistItem,
  ContentHighlightItem,
  /* WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1: LMS 강의 Reference Metadata 공용 타입 */
  LessonSnapshotContent,
  /* Component props */
  NewsNoticesSectionProps,
  AppEntrySectionProps,
  CtaGuidanceSectionProps,
  O4OHelpSectionProps,
  O4OHelpUsageItem,
  O4OHelpServiceItem,
  SignagePreviewSectionProps,
  ContentHighlightSectionProps,
} from './types';
