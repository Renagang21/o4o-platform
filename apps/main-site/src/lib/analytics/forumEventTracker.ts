/**
 * Forum Event Tracker
 *
 * Tracks user interactions with cosmetics forum posts.
 * Events are sent to the server for analytics and recommendation improvements.
 */

import { authClient } from '@o4o/auth-client';

// Event types for forum interactions
export type ForumEventType =
  | 'view_post'
  | 'scroll_depth'
  | 'view_category'
  | 'view_tag'
  | 'comment_create'
  | 'like_post'
  | 'unlike_post'
  | 'bookmark_post'
  | 'unbookmark_post'
  | 'share_post'
  | 'filter_apply'
  | 'search_query'
  | 'click_recommendation';

export interface ForumEventPayload {
  eventType: ForumEventType;
  postId?: string;
  categoryId?: string;
  tagSlug?: string;
  scrollDepth?: number;
  metadata?: {
    skinType?: string;
    concerns?: string[];
    brand?: string;
    productId?: string;
    searchQuery?: string;
    filterValues?: Record<string, any>;
    recommendationPosition?: number;
    recommendationType?: 'trending' | 'popular' | 'personalized' | 'related';
    referrer?: string;
    sessionDuration?: number;
  };
}

interface EventQueueItem {
  payload: ForumEventPayload;
  timestamp: number;
}

// Configuration
const CONFIG = {
  API_ENDPOINT: '/api/v1/cosmetics/forum/events',
  BATCH_SIZE: 10,
  FLUSH_INTERVAL: 5000, // 5 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

class ForumEventTracker {
  private queue: EventQueueItem[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isEnabled: boolean = true;
  private sessionId: string;
  private sessionStartTime: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();

    // Auto-flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Enable or disable tracking (for user privacy preferences)
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.queue = [];
    }
  }

  /**
   * Track an event
   */
  track(payload: ForumEventPayload): void {
    if (!this.isEnabled) return;

    const enrichedPayload: ForumEventPayload = {
      ...payload,
      metadata: {
        ...payload.metadata,
        sessionDuration: Date.now() - this.sessionStartTime,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      },
    };

    this.queue.push({
      payload: enrichedPayload,
      timestamp: Date.now(),
    });

    // Auto-flush if batch size reached
    if (this.queue.length >= CONFIG.BATCH_SIZE) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  /**
   * Schedule a flush if not already scheduled
   */
  private scheduleFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flush();
      this.flushTimer = null;
    }, CONFIG.FLUSH_INTERVAL);
  }

  /**
   * Flush all queued events to the server
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      await this.sendEvents(events);
    } catch (error) {
      // Put events back in queue for retry
      this.queue = [...events, ...this.queue];
      console.error('Failed to send forum events:', error);
    }
  }

  /**
   * Send events to the server
   */
  private async sendEvents(events: EventQueueItem[]): Promise<void> {
    const payload = {
      sessionId: this.sessionId,
      events: events.map((e) => ({
        ...e.payload,
        timestamp: new Date(e.timestamp).toISOString(),
      })),
    };

    // Use beacon API for reliability on page unload
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      });
      const success = navigator.sendBeacon(CONFIG.API_ENDPOINT, blob);
      if (success) return;
    }

    // Fallback to fetch
    const response = await authClient.api.post(CONFIG.API_ENDPOINT, payload);
    if (!response.ok) {
      throw new Error(`Failed to send events: ${response.status}`);
    }
  }

  // ============================================
  // Convenience methods for common events
  // ============================================

  /**
   * Track post view
   */
  trackPostView(postId: string, metadata?: ForumEventPayload['metadata']): void {
    this.track({
      eventType: 'view_post',
      postId,
      metadata,
    });
  }

  /**
   * Track scroll depth (called at 25%, 50%, 75%, 100%)
   */
  trackScrollDepth(postId: string, depth: number): void {
    this.track({
      eventType: 'scroll_depth',
      postId,
      scrollDepth: depth,
    });
  }

  /**
   * Track category view
   */
  trackCategoryView(categoryId: string): void {
    this.track({
      eventType: 'view_category',
      categoryId,
    });
  }

  /**
   * Track tag view
   */
  trackTagView(tagSlug: string): void {
    this.track({
      eventType: 'view_tag',
      tagSlug,
    });
  }

  /**
   * Track comment creation
   */
  trackCommentCreate(postId: string): void {
    this.track({
      eventType: 'comment_create',
      postId,
    });
  }

  /**
   * Track post like
   */
  trackLike(postId: string, liked: boolean): void {
    this.track({
      eventType: liked ? 'like_post' : 'unlike_post',
      postId,
    });
  }

  /**
   * Track post bookmark
   */
  trackBookmark(postId: string, bookmarked: boolean): void {
    this.track({
      eventType: bookmarked ? 'bookmark_post' : 'unbookmark_post',
      postId,
    });
  }

  /**
   * Track post share
   */
  trackShare(postId: string): void {
    this.track({
      eventType: 'share_post',
      postId,
    });
  }

  /**
   * Track filter application
   */
  trackFilterApply(filterValues: Record<string, any>): void {
    this.track({
      eventType: 'filter_apply',
      metadata: { filterValues },
    });
  }

  /**
   * Track search query
   */
  trackSearch(query: string): void {
    this.track({
      eventType: 'search_query',
      metadata: { searchQuery: query },
    });
  }

  /**
   * Track recommendation click
   */
  trackRecommendationClick(
    postId: string,
    recommendationType: 'trending' | 'popular' | 'personalized' | 'related',
    position: number
  ): void {
    this.track({
      eventType: 'click_recommendation',
      postId,
      metadata: {
        recommendationType,
        recommendationPosition: position,
      },
    });
  }
}

// Singleton instance
export const forumEventTracker = new ForumEventTracker();

// React hook for easy use in components
export function useForumEventTracker() {
  return forumEventTracker;
}

export default forumEventTracker;
