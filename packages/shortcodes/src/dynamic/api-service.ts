/**
 * Dynamic Shortcode API Service
 * Provides API methods for fetching CPT, ACF, and meta data
 * Uses @o4o/auth-client for authenticated requests
 */

import type { CPTQueryParams, CPTPost, ACFFieldValue } from './types';

/**
 * Dynamic Shortcode API Service Class
 */
export class DynamicShortcodeAPIService {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  /**
   * Fetch CPT posts
   */
  async fetchCPTPosts(params: CPTQueryParams): Promise<CPTPost[]> {
    const { type, count = 10, orderby = 'date', order = 'DESC', ...rest } = params;

    const queryString = new URLSearchParams({
      type,
      count: count.toString(),
      orderby,
      order,
      ...Object.fromEntries(
        Object.entries(rest).map(([k, v]) => [k, String(v)])
      ),
    }).toString();

    try {
      // Use fetch with authClient if available, otherwise plain fetch
      const authClient = await this.getAuthClient();

      if (authClient) {
        const response = await authClient.api.get(`/cpt/posts?${queryString}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch CPT posts: ${response.statusText}`);
        }
        return response.data;
      } else {
        const response = await fetch(`${this.baseURL}/cpt/posts?${queryString}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch CPT posts: ${response.statusText}`);
        }
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching CPT posts:', error);
      throw error;
    }
  }

  /**
   * Fetch CPT field value
   */
  async fetchCPTField(params: {
    postId?: string;
    postType?: string;
    field: string;
  }): Promise<any> {
    const { postId, postType, field } = params;

    const url = postId
      ? `${this.baseURL}/cpt/posts/${postId}/fields/${field}`
      : `${this.baseURL}/cpt/current/${postType}/fields/${field}`;

    try {
      const authClient = await this.getAuthClient();

      if (authClient) {
        const response = await authClient.api.get(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch field: ${response.statusText}`);
        }
        return response.data;
      } else {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch field: ${response.statusText}`);
        }
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching CPT field:', error);
      throw error;
    }
  }

  /**
   * Fetch ACF field value
   */
  async fetchACFField(params: {
    postId?: string;
    fieldName: string;
  }): Promise<ACFFieldValue> {
    const { postId, fieldName } = params;

    const url = postId
      ? `${this.baseURL}/acf/posts/${postId}/fields/${fieldName}`
      : `${this.baseURL}/acf/current/fields/${fieldName}`;

    try {
      const authClient = await this.getAuthClient();

      if (authClient) {
        const response = await authClient.api.get(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch ACF field: ${response.statusText}`);
        }
        return response.data;
      } else {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch ACF field: ${response.statusText}`);
        }
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching ACF field:', error);
      throw error;
    }
  }

  /**
   * Fetch meta field value
   */
  async fetchMetaField(params: {
    postId?: string;
    key: string;
  }): Promise<any> {
    const { postId, key } = params;

    const url = postId
      ? `${this.baseURL}/meta/posts/${postId}/fields/${key}`
      : `${this.baseURL}/meta/current/fields/${key}`;

    try {
      const authClient = await this.getAuthClient();

      if (authClient) {
        const response = await authClient.api.get(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch meta field: ${response.statusText}`);
        }
        return response.data;
      } else {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch meta field: ${response.statusText}`);
        }
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching meta field:', error);
      throw error;
    }
  }

  /**
   * Get auth client if available
   * Returns null if not in browser or auth-client not available
   */
  private async getAuthClient(): Promise<any | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      // Dynamic import to avoid SSR issues
      const { authClient } = await import('@o4o/auth-client');
      return authClient;
    } catch (error) {
      // auth-client not available, use plain fetch
      return null;
    }
  }
}

/**
 * Default API service instance
 */
export const dynamicAPI = new DynamicShortcodeAPIService();

/**
 * Cached API Service (extends base service with caching)
 */
export class CachedDynamicAPIService extends DynamicShortcodeAPIService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private defaultTTL: number = 300000; // 5 minutes

  /**
   * Fetch with caching
   */
  private async cachedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });

    return data;
  }

  /**
   * Fetch CPT posts with caching
   */
  async fetchCPTPosts(params: CPTQueryParams): Promise<CPTPost[]> {
    const cacheKey = `cpt_list_${JSON.stringify(params)}`;
    return this.cachedFetch(cacheKey, () => super.fetchCPTPosts(params), 300000);
  }

  /**
   * Fetch CPT field with caching
   */
  async fetchCPTField(params: {
    postId?: string;
    postType?: string;
    field: string;
  }): Promise<any> {
    const cacheKey = `cpt_field_${JSON.stringify(params)}`;
    return this.cachedFetch(cacheKey, () => super.fetchCPTField(params), 60000);
  }

  /**
   * Fetch ACF field with caching
   */
  async fetchACFField(params: {
    postId?: string;
    fieldName: string;
  }): Promise<ACFFieldValue> {
    const cacheKey = `acf_field_${JSON.stringify(params)}`;
    return this.cachedFetch(cacheKey, () => super.fetchACFField(params), 60000);
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      Array.from(this.cache.keys()).forEach(key => {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      });
    } else {
      this.cache.clear();
    }
  }
}

/**
 * Cached API service instance
 */
export const cachedDynamicAPI = new CachedDynamicAPIService();
