/**
 * CPT/ACF Loop Block Utility Functions
 */

import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import type { PostType, Post, QueryParams } from './types';

/**
 * Fetch available post types
 */
export async function fetchPostTypes(): Promise<PostType[]> {
  try {
    // First try our CPT API
    const cptResponse = await apiFetch<{ success: boolean; data: any[] }>({
      path: '/cpt/types',
    }).catch(() => null);

    if (cptResponse?.success && cptResponse.data) {
      // Transform CPT data to WordPress post type format
      return cptResponse.data.map((cpt: any) => ({
        slug: cpt.slug,
        name: cpt.name,
        description: cpt.description || '',
        hierarchical: false,
        rest_base: cpt.slug,
        labels: {
          name: cpt.name,
          singular_name: cpt.singularName || cpt.name,
        },
        _links: {},
      }));
    }

    // Fallback to WordPress API
    const types = await apiFetch<Record<string, PostType>>({
      path: '/wp/v2/types',
    });

    // Filter out unwanted post types
    const excludedTypes = [
      'attachment',
      'wp_block',
      'wp_template',
      'wp_template_part',
      'wp_navigation',
      'revision',
    ];

    return Object.values(types).filter(
      (type: PostType) => !excludedTypes.includes(type.slug)
    );
  } catch (error: any) {
    // Silently handle error - will return empty array
    return [];
  }
}

/**
 * Fetch posts based on query parameters
 */
export async function fetchPosts(
  postType: string,
  params: Partial<QueryParams>
): Promise<Post[]> {
  try {
    // Find the rest base for the post type
    const postTypes = await fetchPostTypes();
    const selectedType = postTypes.find((type: any) => type.slug === postType);
    const restBase = selectedType?.rest_base || postType;

    // Build query parameters
    const queryParams: QueryParams = {
      per_page: params.per_page || 12,
      orderby: params.orderby || 'date',
      order: params.order || 'desc',
      _embed: true,
      ...params,
    };

    // Try our CPT API first
    const cptPath = addQueryArgs(`/cpt/${restBase}/posts`, queryParams as any);
    const posts = await apiFetch<Post[]>({ path: cptPath }).catch(async () => {
      // Fallback to WordPress API
      const wpPath = addQueryArgs(`/wp/v2/${restBase}`, queryParams as any);
      return apiFetch<Post[]>({ path: wpPath });
    });

    return posts;
  } catch (error: any) {
    // Silently handle error - will return empty array
    return [];
  }
}

/**
 * Fetch ACF field groups for a post type
 */
export async function fetchACFFieldGroups(postType: string): Promise<any[]> {
  try {
    // Check if ACF REST API is available
    const response = await apiFetch<any[]>({
      path: `/acf/v3/field_groups?post_type=${postType}`,
    }).catch(() => null);

    if (!response) {
      // Try alternative endpoint
      return await apiFetch<any[]>({
        path: `/wp/v2/acf-field-groups?post_type=${postType}`,
      }).catch(() => []);
    }

    return response;
  } catch (error: any) {
    // Silently handle error - will return empty array
    return [];
  }
}

/**
 * Fetch ACF fields for a field group
 */
export async function fetchACFFields(fieldGroupId: string): Promise<any[]> {
  try {
    const response = await apiFetch<any[]>({
      path: `/acf/v3/field_groups/${fieldGroupId}/fields`,
    }).catch(() => null);

    if (!response) {
      // Try alternative endpoint
      return await apiFetch<any[]>({
        path: `/wp/v2/acf-fields?parent=${fieldGroupId}`,
      }).catch(() => []);
    }

    return response;
  } catch (error: any) {
    // Silently handle error - will return empty array
    return [];
  }
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get featured image URL from post
 */
export function getFeaturedImageUrl(
  post: Post,
  size: string = 'medium'
): string | null {
  if (!post._embedded?.['wp:featuredmedia']?.[0]) {
    return null;
  }

  const media = post._embedded['wp:featuredmedia'][0];
  
  // Try to get specific size
  if (media.media_details?.sizes?.[size]) {
    return media.media_details.sizes[size].source_url;
  }

  // Fallback to full size
  return media.source_url || null;
}

/**
 * Get author name from post
 */
export function getAuthorName(post: Post): string {
  if (!post._embedded?.author?.[0]) {
    return 'Unknown';
  }

  return post._embedded.author[0].name || 'Unknown';
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Strip HTML tags from string
 */
export function stripHtml(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}