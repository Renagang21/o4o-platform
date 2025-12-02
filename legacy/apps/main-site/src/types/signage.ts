// Digital Signage Types

export interface SignageContent {
  id: string;
  title: string;
  type: 'image' | 'text' | 'video' | 'notice' | 'playlist' | 'live-tv';
  thumbnail: string;
  url?: string;
  content?: string;
  duration?: number;
  isActive: boolean;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  tags: string[];
  category?: string;
  authorId: string;
  authorName?: string;
  viewCount: number;
  lastPlayedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface SignageStore {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
  screenCount: number;
  totalDuration: number;
  lastSync?: string;
  playlists?: SignagePlaylist[];
}

export interface SignagePlaylist {
  id: string;
  name: string;
  description?: string;
  items: SignagePlaylistItem[];
  duration: number;
  isActive: boolean;
  schedule?: SignageSchedule;
  createdAt: string;
  updatedAt: string;
}

export interface SignagePlaylistItem {
  id: string;
  contentId: string;
  content?: SignageContent;
  order: number;
  duration: number;
  transition?: 'fade' | 'slide' | 'none';
  settings?: Record<string, unknown>;
}

export interface SignageSchedule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  isRecurring: boolean;
  timezone: string;
}

export interface SignageAnalytics {
  storeId: string;
  storeName: string;
  date: string;
  totalPlaytime: number;
  totalViews: number;
  uniqueContent: number;
  popularContent: SignageContent[];
  metrics: {
    avgViewDuration: number;
    peakHours: string[];
    contentPerformance: Array<{
      contentId: string;
      views: number;
      avgDuration: number;
    }>;
  };
}

export interface LiveTVChannel {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  category: string;
  isActive: boolean;
}

export interface LiveTVScheduleItem {
  id: string;
  channelId: string;
  channel?: LiveTVChannel;
  startTime: string;
  endTime: string;
  priority: number;
}

// Search and Filter Types
export type SignageContentSortBy = 'latest' | 'popular' | 'name' | 'duration';
export type SignageContentStatus = 'all' | 'draft' | 'published' | 'scheduled' | 'archived';

export interface SignageSearchOptions {
  query?: string;
  type?: SignageContent['type'] | 'all';
  status?: SignageContentStatus;
  category?: string;
  tags?: string[];
  authorId?: string;
  sortBy?: SignageContentSortBy;
  page: number;
  limit: number;
}

export interface SignageSearchResult {
  content: SignageContent[];
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}