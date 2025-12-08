/**
 * CosmeticsSEO - SEO Meta Tags Component for Cosmetics Forum
 *
 * Generates:
 * - Standard meta tags (title, description, keywords)
 * - OpenGraph tags for social sharing
 * - Twitter Card tags
 * - JSON-LD structured data for reviews and products
 */

'use client';

import { useEffect } from 'react';

interface CosmeticsSEOProps {
  type: 'list' | 'detail' | 'category' | 'product';
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  keywords?: string[];
  // For detail pages
  post?: {
    id: string;
    title: string;
    excerpt?: string;
    authorName?: string;
    createdAt: string;
    updatedAt?: string;
    rating?: number;
    productName?: string;
    brand?: string;
    skinType?: string;
    concerns?: string[];
  };
  // For product pages
  product?: {
    id: string;
    name: string;
    brand: string;
    imageUrl?: string;
    averageRating?: number;
    reviewCount?: number;
    price?: number;
    currency?: string;
  };
}

// Generate JSON-LD structured data
function generateStructuredData(props: CosmeticsSEOProps): string {
  if (props.type === 'detail' && props.post) {
    // Review structured data
    const reviewData: any = {
      '@context': 'https://schema.org',
      '@type': 'Review',
      name: props.post.title,
      reviewBody: props.post.excerpt || props.description,
      author: {
        '@type': 'Person',
        name: props.post.authorName || '익명',
      },
      datePublished: props.post.createdAt,
      dateModified: props.post.updatedAt || props.post.createdAt,
    };

    // Add review rating if available
    if (props.post.rating) {
      reviewData.reviewRating = {
        '@type': 'Rating',
        ratingValue: props.post.rating,
        bestRating: 5,
        worstRating: 1,
      };
    }

    // Add item reviewed (product) if available
    if (props.post.productName) {
      reviewData.itemReviewed = {
        '@type': 'Product',
        name: props.post.productName,
        brand: props.post.brand
          ? {
              '@type': 'Brand',
              name: props.post.brand,
            }
          : undefined,
      };
    }

    return JSON.stringify(reviewData);
  }

  if (props.type === 'product' && props.product) {
    // Product structured data
    const productData: any = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: props.product.name,
      brand: {
        '@type': 'Brand',
        name: props.product.brand,
      },
      image: props.product.imageUrl,
    };

    // Add aggregate rating if available
    if (props.product.averageRating && props.product.reviewCount) {
      productData.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: props.product.averageRating,
        reviewCount: props.product.reviewCount,
        bestRating: 5,
        worstRating: 1,
      };
    }

    // Add offers if price available
    if (props.product.price) {
      productData.offers = {
        '@type': 'Offer',
        price: props.product.price,
        priceCurrency: props.product.currency || 'KRW',
      };
    }

    return JSON.stringify(productData);
  }

  if (props.type === 'list' || props.type === 'category') {
    // Collection page structured data
    const collectionData = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: props.title,
      description: props.description,
      url: props.url,
    };

    return JSON.stringify(collectionData);
  }

  return '';
}

// Generate meta keywords
function generateKeywords(props: CosmeticsSEOProps): string {
  const baseKeywords = [
    '화장품',
    '스킨케어',
    '뷰티',
    '리뷰',
    '후기',
    '추천',
  ];

  const additionalKeywords = props.keywords || [];

  if (props.post) {
    if (props.post.skinType) {
      const skinTypeMap: Record<string, string> = {
        dry: '건성',
        oily: '지성',
        combination: '복합성',
        sensitive: '민감성',
        normal: '중성',
      };
      additionalKeywords.push(skinTypeMap[props.post.skinType] || props.post.skinType);
    }

    if (props.post.concerns) {
      additionalKeywords.push(...props.post.concerns);
    }

    if (props.post.brand) {
      additionalKeywords.push(props.post.brand);
    }

    if (props.post.productName) {
      additionalKeywords.push(props.post.productName);
    }
  }

  if (props.product) {
    additionalKeywords.push(props.product.brand, props.product.name);
  }

  const allKeywords = [...baseKeywords, ...additionalKeywords];
  return [...new Set(allKeywords)].join(', ');
}

export function CosmeticsSEO(props: CosmeticsSEOProps) {
  const structuredData = generateStructuredData(props);
  const keywords = generateKeywords(props);

  useEffect(() => {
    // Update document title
    document.title = `${props.title} | Neture 화장품 리뷰`;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;

      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }

      tag.content = content;
    };

    // Standard meta tags
    updateMeta('description', props.description);
    updateMeta('keywords', keywords);

    // OpenGraph tags
    updateMeta('og:title', props.title, true);
    updateMeta('og:description', props.description, true);
    updateMeta('og:url', props.url, true);
    updateMeta('og:type', props.type === 'detail' ? 'article' : 'website', true);
    updateMeta('og:site_name', 'Neture', true);

    if (props.imageUrl) {
      updateMeta('og:image', props.imageUrl, true);
    }

    // Twitter Card tags
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', props.title);
    updateMeta('twitter:description', props.description);

    if (props.imageUrl) {
      updateMeta('twitter:image', props.imageUrl);
    }

    // Update structured data
    let scriptTag = document.querySelector(
      'script[type="application/ld+json"]'
    ) as HTMLScriptElement;

    if (structuredData) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }

      scriptTag.textContent = structuredData;
    }

    // Canonical URL
    let canonicalTag = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement;

    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.rel = 'canonical';
      document.head.appendChild(canonicalTag);
    }

    canonicalTag.href = props.url;

    // Cleanup function - optional, depends on your needs
    return () => {
      // Could remove added tags here if needed
    };
  }, [props, structuredData, keywords]);

  // This component doesn't render anything visible
  return null;
}

/**
 * CosmeticsBreadcrumb - Breadcrumb component with SEO-friendly markup
 */
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface CosmeticsBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function CosmeticsBreadcrumb({ items }: CosmeticsBreadcrumbProps) {
  // Generate breadcrumb structured data
  useEffect(() => {
    const breadcrumbData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: item.href
          ? `${window.location.origin}${item.href}`
          : undefined,
      })),
    };

    let scriptTag = document.querySelector(
      'script[data-type="breadcrumb-ld"]'
    ) as HTMLScriptElement;

    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.type = 'application/ld+json';
      scriptTag.setAttribute('data-type', 'breadcrumb-ld');
      document.head.appendChild(scriptTag);
    }

    scriptTag.textContent = JSON.stringify(breadcrumbData);
  }, [items]);

  return (
    <nav
      className="cosmetics-breadcrumb mb-4"
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-1 text-sm flex-wrap">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span
                className="mx-2"
                style={{ color: 'var(--forum-text-muted)' }}
              >
                /
              </span>
            )}
            {item.href ? (
              <a
                href={item.href}
                className="hover:underline"
                style={{ color: 'var(--forum-text-link)' }}
              >
                {item.label}
              </a>
            ) : (
              <span style={{ color: 'var(--forum-text-muted)' }}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default CosmeticsSEO;
