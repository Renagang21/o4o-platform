/**
 * Blog UI — Public Blog 공통 모듈
 *
 * WO-O4O-BLOG-UI-PARTIAL-EXTRACT-V1
 *
 * KPA / Neture 에서 verbatim 재사용이 검증된 pure UI / SEO / template / public client 만 추출.
 * staff editor / AI wiring / settings UI / backend extraction 은 의도적 비포함.
 */

// Public API client + types
export {
  fetchBlogPosts,
  fetchBlogPost,
  fetchPublicStoreInfo,
  fetchPublicBlogSettings,
  type BlogPost,
  type BlogListResponse,
  type PublicStoreInfo,
  type PublicBlogSettings,
} from './client';

// Header + templates + SEO
export { BlogPublicHeader } from './BlogPublicHeader';
export {
  BlogList,
  BlogPost as BlogPostTemplate,
  pickBlogTemplate,
  resolveBlogTemplateKey,
  getTemplateLabel,
  BLOG_TEMPLATE_KEYS,
  type BlogTemplateKey,
} from './blogTemplates';
export { useBlogSeo } from './useBlogSeo';
