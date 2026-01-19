/**
 * SiteGuide Page Context Collector
 *
 * 자동으로 페이지 메타데이터를 수집합니다.
 * CMS 연동이나 크롤링 없이, DOM에서 직접 읽습니다.
 */

import type { PageContext } from './types.js';

export interface CollectedContext {
  url: string;
  title: string;
  description?: string;
  pageType?: string;
  category?: string;
  tags?: string[];
  customData?: Record<string, unknown>;
}

export function collectPageContext(manualContext?: PageContext): CollectedContext {
  const context: CollectedContext = {
    url: window.location.href,
    title: document.title,
  };

  // Meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    context.description = metaDescription.getAttribute('content') || undefined;
  }

  // Open Graph description fallback
  if (!context.description) {
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      context.description = ogDescription.getAttribute('content') || undefined;
    }
  }

  // Canonical URL (if different)
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    const canonicalUrl = canonical.getAttribute('href');
    if (canonicalUrl && canonicalUrl !== context.url) {
      context.url = canonicalUrl;
    }
  }

  // Article metadata
  const articleSection = document.querySelector('meta[property="article:section"]');
  if (articleSection) {
    context.category = articleSection.getAttribute('content') || undefined;
  }

  // Keywords as tags
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    const keywords = metaKeywords.getAttribute('content');
    if (keywords) {
      context.tags = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    }
  }

  // Merge manual context (overrides auto-collected)
  if (manualContext) {
    if (manualContext.pageType) context.pageType = manualContext.pageType;
    if (manualContext.category) context.category = manualContext.category;
    if (manualContext.tags) context.tags = manualContext.tags;
    if (manualContext.customData) context.customData = manualContext.customData;
  }

  return context;
}

/**
 * 세션 ID 생성/관리
 * 브라우저 세션 동안 유지
 */
export function getSessionId(): string {
  const storageKey = 'siteguide_session_id';
  let sessionId = sessionStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId = generateId();
    sessionStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
}

function generateId(): string {
  return 'sg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}
