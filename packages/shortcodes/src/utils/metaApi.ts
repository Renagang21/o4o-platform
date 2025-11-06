/**
 * Post Meta API Utility for Shortcodes
 * Phase 4-2: Lightweight fetch wrapper for Meta API
 */

export interface MetaItemResponse {
  id: string;
  post_id: string;
  meta_key: string;
  meta_value: unknown;
  created_at: Date;
  updated_at: Date;
}

export interface MetaSingleResponse {
  data: MetaItemResponse | null;
}

export interface MetaListResponse {
  data: MetaItemResponse[];
  meta: {
    total: number;
  };
}

/**
 * Fetch metadata by key for a specific post
 */
export async function fetchPostMeta(
  postId: string,
  key: string
): Promise<unknown> {
  try {
    const response = await fetch(`/api/v1/posts/${postId}/meta/${key}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Graceful fallback for missing meta
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const result: MetaSingleResponse = await response.json();
    return result.data?.meta_value ?? null;
  } catch (error) {
    console.error(`Failed to fetch meta "${key}" for post ${postId}:`, error);
    return null;
  }
}

/**
 * Fetch all metadata for a specific post
 */
export async function fetchAllPostMeta(
  postId: string
): Promise<MetaItemResponse[]> {
  try {
    const response = await fetch(`/api/v1/posts/${postId}/meta`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result: MetaListResponse = await response.json();
    return result.data || [];
  } catch (error) {
    console.error(`Failed to fetch all meta for post ${postId}:`, error);
    return [];
  }
}
