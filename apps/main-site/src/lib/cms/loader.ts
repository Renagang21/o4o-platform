/**
 * CMS-Integrated View Loader
 *
 * Extends the original loader to support loading views from CMS V2
 * Falls back to static JSON files for non-CMS routes
 */

import type { ViewSchema } from '@/view/types';
import { fetchPageBySlug } from './client';
import { adaptCMSViewToViewSchema, isViewRendererCompatible } from './adapter';

// Cache for CMS pages to avoid redundant API calls
interface CachedEntry {
  data: ViewSchema | null;
  timestamp: number;
}

const cmsPageCache = new Map<string, CachedEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load a view from CMS by page slug
 * Returns null if page not found or not published
 */
export async function loadCMSView(slug: string): Promise<ViewSchema | null> {
  // Check cache first
  const cached = getCachedView(slug);
  if (cached !== undefined) {
    return cached;
  }

  try {
    // Fetch page from CMS API
    const page = await fetchPageBySlug(slug);

    if (!page) {
      // Page not found or not published
      setCachedView(slug, null);
      return null;
    }

    // Check if page has an associated view
    if (!page.view) {
      console.error(`CMS Page ${slug} has no associated view`);
      setCachedView(slug, null);
      return null;
    }

    // Check ViewRenderer compatibility
    if (!isViewRendererCompatible(page.view)) {
      console.error(`CMS View for page ${slug} is not ViewRenderer compatible`);
      setCachedView(slug, null);
      return null;
    }

    // Adapt CMS view to ViewRenderer format
    const viewSchema = adaptCMSViewToViewSchema(page.view, page);

    // Cache the result
    setCachedView(slug, viewSchema);

    return viewSchema;
  } catch (error) {
    console.error(`Error loading CMS view for slug: ${slug}`, error);
    setCachedView(slug, null);
    return null;
  }
}

/**
 * Check if a slug corresponds to a CMS page
 */
export async function isCMSPage(slug: string): Promise<boolean> {
  const view = await loadCMSView(slug);
  return view !== null;
}

/**
 * Clear CMS page cache (useful for development)
 */
export function clearCMSCache(): void {
  cmsPageCache.clear();
}

/**
 * Get cached view if available and not expired
 */
function getCachedView(slug: string): ViewSchema | null | undefined {
  const cached = cmsPageCache.get(slug);

  if (!cached) {
    return undefined;
  }

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    // Cache expired
    cmsPageCache.delete(slug);
    return undefined;
  }

  return cached.data;
}

/**
 * Set cached view with timestamp
 */
function setCachedView(slug: string, data: ViewSchema | null): void {
  cmsPageCache.set(slug, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Hot Module Replacement support
 */
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    clearCMSCache();
  });
}
