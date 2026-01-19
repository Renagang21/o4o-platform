/**
 * SiteGuide API Client
 *
 * @service SiteGuide
 * @domain siteguide.co.kr
 * @independence Neture 종속 아님 - 독립 서비스
 */

import type { QueryRequest, QueryResponse } from './types.js';

export class SiteGuideAPI {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/siteguide/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SiteGuide-Key': this.apiKey,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error.error || `HTTP ${response.status}`,
          errorCode: error.errorCode,
        };
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }
}
