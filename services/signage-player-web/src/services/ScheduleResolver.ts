/**
 * ScheduleResolver
 *
 * Sprint 2-4: Schedule-aware content resolution
 * - Time-based playlist selection
 * - Priority-based conflict resolution
 * - Fallback content handling
 * - Auto-refresh scheduling
 *
 * Phase 2: Digital Signage Production Upgrade
 */

import type {
  ScheduleRule,
  Playlist,
  PlaylistItem,
  ActiveContentResponse,
  DayOfWeek,
} from '../types/signage';

// ============================================================================
// Types
// ============================================================================

export interface ResolvedContent {
  playlist: Playlist | null;
  items: PlaylistItem[];
  schedule: ScheduleRule | null;
  source: 'schedule' | 'fallback' | 'none';
  nextCheckAt: Date;
  expiresAt: Date | null;
}

export interface ScheduleResolverConfig {
  apiUrl: string;
  serviceKey: string;
  channelId?: string;
  organizationId?: string;
  fallbackPlaylistId?: string;
  refreshIntervalMs: number;
  timezone: string;
}

const DEFAULT_CONFIG: Partial<ScheduleResolverConfig> = {
  refreshIntervalMs: 60000, // 1 minute
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

// ============================================================================
// ScheduleResolver Class
// ============================================================================

export class ScheduleResolver {
  private config: ScheduleResolverConfig;
  private cachedContent: ResolvedContent | null = null;
  private refreshTimer: number | null = null;
  private onContentChange?: (content: ResolvedContent) => void;

  constructor(config: Partial<ScheduleResolverConfig> & Pick<ScheduleResolverConfig, 'apiUrl' | 'serviceKey'>) {
    this.config = { ...DEFAULT_CONFIG, ...config } as ScheduleResolverConfig;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Resolve active content for the current time
   */
  async resolveActiveContent(): Promise<ResolvedContent> {
    try {
      // Fetch from API
      const response = await this.fetchActiveContent();

      // Build resolved content
      const resolved = this.buildResolvedContent(response);

      // Cache the result
      this.cachedContent = resolved;

      return resolved;
    } catch (error) {
      console.error('[ScheduleResolver] Failed to resolve content:', error);

      // Try to use cached content if available
      if (this.cachedContent) {
        console.warn('[ScheduleResolver] Using cached content due to error');
        return this.cachedContent;
      }

      // Return empty content
      return this.buildEmptyContent();
    }
  }

  /**
   * Get cached content without fetching
   */
  getCachedContent(): ResolvedContent | null {
    return this.cachedContent;
  }

  /**
   * Start auto-refresh loop
   */
  startAutoRefresh(onChange?: (content: ResolvedContent) => void): void {
    this.onContentChange = onChange;
    this.stopAutoRefresh();

    const refresh = async () => {
      const content = await this.resolveActiveContent();

      // Calculate next refresh time
      const now = Date.now();
      let nextRefresh = this.config.refreshIntervalMs;

      if (content.nextCheckAt) {
        const timeUntilNext = content.nextCheckAt.getTime() - now;
        if (timeUntilNext > 0 && timeUntilNext < nextRefresh) {
          nextRefresh = timeUntilNext + 1000; // Add 1 second buffer
        }
      }

      // Notify listener
      if (this.onContentChange) {
        this.onContentChange(content);
      }

      // Schedule next refresh
      this.refreshTimer = window.setTimeout(refresh, nextRefresh);
    };

    // Initial refresh
    refresh();
  }

  /**
   * Stop auto-refresh loop
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Force refresh now
   */
  async refresh(): Promise<ResolvedContent> {
    return this.resolveActiveContent();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopAutoRefresh();
    this.cachedContent = null;
    this.onContentChange = undefined;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async fetchActiveContent(): Promise<ActiveContentResponse> {
    const url = this.buildApiUrl();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch active content: ${response.status}`);
    }

    return response.json();
  }

  private buildApiUrl(): string {
    const base = `${this.config.apiUrl}/api/signage/${this.config.serviceKey}/active-content`;
    const params = new URLSearchParams();

    if (this.config.channelId) {
      params.set('channelId', this.config.channelId);
    }
    if (this.config.organizationId) {
      params.set('organizationId', this.config.organizationId);
    }

    // Add current time for server-side resolution
    params.set('currentTime', new Date().toISOString());
    params.set('timezone', this.config.timezone);

    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
  }

  private buildResolvedContent(response: ActiveContentResponse): ResolvedContent {
    const now = new Date();
    const nextCheckAt = this.calculateNextCheckTime(response, now);
    const expiresAt = this.calculateExpirationTime(response.schedule, now);

    if (response.playlist && response.items.length > 0) {
      return {
        playlist: response.playlist,
        items: response.items,
        schedule: response.schedule,
        source: response.schedule ? 'schedule' : 'fallback',
        nextCheckAt,
        expiresAt,
      };
    }

    // No content from schedule, check fallback
    if (response.fallbackPlaylistId || this.config.fallbackPlaylistId) {
      // Fallback would be resolved server-side typically
      // For now, return what we have
      return {
        playlist: response.playlist,
        items: response.items || [],
        schedule: null,
        source: 'fallback',
        nextCheckAt,
        expiresAt: null,
      };
    }

    return this.buildEmptyContent();
  }

  private buildEmptyContent(): ResolvedContent {
    return {
      playlist: null,
      items: [],
      schedule: null,
      source: 'none',
      nextCheckAt: new Date(Date.now() + this.config.refreshIntervalMs),
      expiresAt: null,
    };
  }

  private calculateNextCheckTime(response: ActiveContentResponse, now: Date): Date {
    // If server provides next refresh time, use it
    if (response.nextRefreshAt) {
      return new Date(response.nextRefreshAt);
    }

    // If we have a schedule with end time, check when it ends
    if (response.schedule?.timeEnd) {
      const scheduleEnd = this.parseScheduleEndTime(response.schedule, now);
      if (scheduleEnd && scheduleEnd > now) {
        return scheduleEnd;
      }
    }

    // Default to refresh interval
    return new Date(now.getTime() + this.config.refreshIntervalMs);
  }

  private calculateExpirationTime(schedule: ScheduleRule | null, now: Date): Date | null {
    if (!schedule) return null;

    // Check validUntil date
    if (schedule.validUntil) {
      const validUntil = new Date(schedule.validUntil);
      if (validUntil > now) {
        return validUntil;
      }
    }

    // Check time end for today
    if (schedule.timeEnd) {
      return this.parseScheduleEndTime(schedule, now);
    }

    return null;
  }

  private parseScheduleEndTime(schedule: ScheduleRule, now: Date): Date | null {
    if (!schedule.timeEnd) return null;

    const [hours, minutes] = schedule.timeEnd.split(':').map(Number);
    const endTime = new Date(now);
    endTime.setHours(hours, minutes, 0, 0);

    // If end time is before now, it's for the next day
    if (endTime <= now) {
      endTime.setDate(endTime.getDate() + 1);
    }

    return endTime;
  }

  /**
   * Check if current time matches schedule
   * Used for client-side validation
   */
  static isScheduleActive(schedule: ScheduleRule, now: Date = new Date()): boolean {
    if (!schedule.isActive) return false;

    // Check date validity
    if (schedule.validFrom) {
      const validFrom = new Date(schedule.validFrom);
      if (now < validFrom) return false;
    }

    if (schedule.validUntil) {
      const validUntil = new Date(schedule.validUntil);
      if (now > validUntil) return false;
    }

    // Check day of week
    if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
      const dayNames: DayOfWeek[] = [
        'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
      ];
      const todayName = dayNames[now.getDay()];
      if (!schedule.daysOfWeek.includes(todayName)) return false;
    }

    // Check time range
    if (schedule.timeStart && schedule.timeEnd) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startHours, startMinutes] = schedule.timeStart.split(':').map(Number);
      const startTotal = startHours * 60 + startMinutes;

      const [endHours, endMinutes] = schedule.timeEnd.split(':').map(Number);
      const endTotal = endHours * 60 + endMinutes;

      // Handle overnight schedules (e.g., 22:00 - 06:00)
      if (startTotal > endTotal) {
        // Overnight: current time must be >= start OR <= end
        if (currentMinutes < startTotal && currentMinutes > endTotal) {
          return false;
        }
      } else {
        // Normal: current time must be >= start AND <= end
        if (currentMinutes < startTotal || currentMinutes > endTotal) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Sort schedules by priority
   */
  static sortByPriority(schedules: ScheduleRule[]): ScheduleRule[] {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

    return [...schedules].sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;
      return aPriority - bPriority;
    });
  }

  /**
   * Find the highest priority active schedule
   */
  static resolveActiveSchedule(schedules: ScheduleRule[], now: Date = new Date()): ScheduleRule | null {
    const activeSchedules = schedules.filter((s) => this.isScheduleActive(s, now));
    const sorted = this.sortByPriority(activeSchedules);
    return sorted[0] || null;
  }
}

// Export singleton factory
let resolverInstance: ScheduleResolver | null = null;

export function getScheduleResolver(
  config?: Partial<ScheduleResolverConfig> & Pick<ScheduleResolverConfig, 'apiUrl' | 'serviceKey'>
): ScheduleResolver {
  if (!resolverInstance && config) {
    resolverInstance = new ScheduleResolver(config);
  }
  if (!resolverInstance) {
    throw new Error('ScheduleResolver not initialized. Call with config first.');
  }
  return resolverInstance;
}

export function resetScheduleResolver(): void {
  if (resolverInstance) {
    resolverInstance.dispose();
    resolverInstance = null;
  }
}
