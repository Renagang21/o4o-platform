/**
 * CMS V2 Integration Library
 *
 * Exports all CMS-related functionality for main-site
 */

export * from './client';
export * from './adapter';
export * from './loader';

// Re-export commonly used functions
export {
  fetchPageBySlug,
  fetchViewById,
  fetchCPTBySlug,
  checkPageExists,
  getPageSEO,
  CMSClientError,
} from './client';

export {
  adaptCMSViewToViewSchema,
  isViewRendererCompatible,
  extractPageTitle,
  extractPageDescription,
  generateMetaTags,
} from './adapter';

export {
  loadCMSView,
  isCMSPage,
  clearCMSCache,
} from './loader';
