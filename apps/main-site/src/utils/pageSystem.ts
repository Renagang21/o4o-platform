// Page system utilities

export interface PageContent {
  id: string;
  slug: string;
  title: string;
  content: any;
  json?: Record<string, unknown>;
  status?: 'published' | 'draft';
  author?: string;
  seo?: {
    metaDescription?: string;
    keywords?: string[];
  };
  meta?: {
    description?: string;
    keywords?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export function loadPageContent(slug: string): PageContent {
  // Mock implementation - should be replaced with actual API call
  const stored = localStorage.getItem(`page-${slug}`);
  if (stored) {
    return JSON.parse(stored);
  }
  
  return {
    id: `page-${slug}`,
    slug,
    title: 'New Page',
    content: { blocks: [] },
    status: 'draft',
    author: 'Admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function savePageContent(content: PageContent): void {
  localStorage.setItem(`page-${content.slug}`, JSON.stringify(content));
}

export function getPageViewUrl(slug: string): string {
  return `/pages/${slug}`;
}
