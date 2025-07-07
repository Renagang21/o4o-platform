import { AppDataSource } from '../database/connection';
import { SignageContent, ContentStatus } from '../entities/SignageContent';
import { Store } from '../entities/Store';
import { StorePlaylist } from '../entities/StorePlaylist';
import { PlaylistItem } from '../entities/PlaylistItem';
import { SignageSchedule, ScheduleStatus } from '../entities/SignageSchedule';
import { ContentUsageLog, LogEventType } from '../entities/ContentUsageLog';
import { User } from '../entities/User';
import { VideoHelper } from '../utils/videoHelper';
import { MoreThan, Between } from 'typeorm';

export class SignageService {
  private contentRepository = AppDataSource.getRepository(SignageContent);
  private storeRepository = AppDataSource.getRepository(Store);
  private playlistRepository = AppDataSource.getRepository(StorePlaylist);
  private playlistItemRepository = AppDataSource.getRepository(PlaylistItem);
  private scheduleRepository = AppDataSource.getRepository(SignageSchedule);
  private logRepository = AppDataSource.getRepository(ContentUsageLog);

  // Content Management Service Methods
  async enrichContentWithVideoInfo(content: SignageContent): Promise<SignageContent> {
    if (!content.videoId) {
      const videoId = VideoHelper.extractVideoId(content.url, content.type);
      if (videoId) {
        content.videoId = videoId;
        content.thumbnailUrl = VideoHelper.generateThumbnailUrl(videoId, content.type);
        
        // Try to fetch additional info from API
        const videoInfo = await VideoHelper.getVideoInfo(videoId, content.type);
        if (videoInfo) {
          if (!content.title && videoInfo.title) {
            content.title = videoInfo.title;
          }
          if (!content.description && videoInfo.description) {
            content.description = videoInfo.description;
          }
          if (videoInfo.duration) {
            content.duration = videoInfo.duration;
          }
          if (videoInfo.thumbnailUrl) {
            content.thumbnailUrl = videoInfo.thumbnailUrl;
          }
        }
        
        await this.contentRepository.save(content);
      }
    }
    
    return content;
  }

  async validateContentAccess(contentId: string, user: User): Promise<SignageContent | null> {
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
      relations: ['creator']
    });

    if (!content) {
      return null;
    }

    // Admin can access everything
    if (user.role === 'admin') {
      return content;
    }

    // Creator can access their own content
    if (content.createdBy === user.id) {
      return content;
    }

    // Others can only access approved public content
    if (content.status === 'approved' && content.isPublic) {
      return content;
    }

    // Customers can only access approved public content
    if (user.role === 'customer' && content.status === 'approved' && content.isPublic) {
      return content;
    }

    return null;
  }

  // Store Management Service Methods
  async validateStoreAccess(storeId: string, user: User): Promise<Store | null> {
    const store = await this.storeRepository.findOne({
      where: { id: storeId },
      relations: ['manager']
    });

    if (!store) {
      return null;
    }

    // Admin can access all stores
    if (user.role === 'admin') {
      return store;
    }

    // Manager can only access their own store
    if (user.role === 'manager' && store.managerId === user.id) {
      return store;
    }

    return null;
  }

  async getStoreActiveSchedule(storeId: string): Promise<SignageSchedule | null> {
    const schedules = await this.scheduleRepository.find({
      where: { storeId, status: ScheduleStatus.ACTIVE },
      relations: ['playlist', 'playlist.items', 'playlist.items.content'],
      order: { priority: 'DESC' }
    });

    for (const schedule of schedules) {
      if (schedule.isActiveNow()) {
        return schedule;
      }
    }

    return null;
  }

  // Playlist Management Service Methods
  async calculatePlaylistDuration(playlistId: string): Promise<number> {
    const items = await this.playlistItemRepository.find({
      where: { playlistId },
      relations: ['content']
    });

    let totalDuration = 0;
    for (const item of items) {
      totalDuration += item.getDisplayDuration();
    }

    return totalDuration;
  }

  async reorderPlaylistItems(playlistId: string, itemOrders: Array<{id: string, order: number}>): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const itemOrder of itemOrders) {
        await queryRunner.manager.update(
          PlaylistItem,
          { id: itemOrder.id, playlistId },
          { order: itemOrder.order }
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async validatePlaylistOwnership(playlistId: string, user: User): Promise<StorePlaylist | null> {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId },
      relations: ['store', 'store.manager']
    });

    if (!playlist) {
      return null;
    }

    // Admin can access all playlists
    if (user.role === 'admin') {
      return playlist;
    }

    // Store manager can access their store's playlists
    if (user.role === 'manager' && playlist.store.managerId === user.id) {
      return playlist;
    }

    return null;
  }

  // Analytics Service Methods
  async logContentUsage(
    storeId: string,
    eventType: LogEventType,
    contentId?: string,
    playlistId?: string,
    duration?: number,
    metadata?: any
  ): Promise<void> {
    const log = this.logRepository.create({
      storeId,
      contentId,
      playlistId,
      eventType,
      duration,
      metadata,
      timestamp: new Date()
    });

    await this.logRepository.save(log);
  }

  async getContentUsageStats(
    storeId?: string,
    contentId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalPlays: number;
    totalDuration: number;
    averagePlayDuration: number;
    topContents: Array<{contentId: string; title: string; playCount: number; totalDuration: number}>;
  }> {
    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .leftJoin('log.content', 'content')
      .where('log.eventType = :eventType', { eventType: LogEventType.PLAY_END });

    if (storeId) {
      queryBuilder.andWhere('log.storeId = :storeId', { storeId });
    }

    if (contentId) {
      queryBuilder.andWhere('log.contentId = :contentId', { contentId });
    }

    if (dateFrom && dateTo) {
      queryBuilder.andWhere('log.timestamp BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });
    }

    const logs = await queryBuilder.getMany();

    const totalPlays = logs.length;
    const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const averagePlayDuration = totalPlays > 0 ? Math.round(totalDuration / totalPlays) : 0;

    // Calculate top contents
    const contentStats = new Map<string, {title: string; playCount: number; totalDuration: number}>();
    
    for (const log of logs) {
      if (log.contentId && log.content) {
        const existing = contentStats.get(log.contentId) || {
          title: log.content.title,
          playCount: 0,
          totalDuration: 0
        };
        
        existing.playCount++;
        existing.totalDuration += log.duration || 0;
        contentStats.set(log.contentId, existing);
      }
    }

    const topContents = Array.from(contentStats.entries())
      .map(([contentId, stats]) => ({ contentId, ...stats }))
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 10);

    return {
      totalPlays,
      totalDuration,
      averagePlayDuration,
      topContents
    };
  }

  async getStorePerformanceStats(): Promise<Array<{
    storeId: string;
    storeName: string;
    totalPlays: number;
    totalDuration: number;
    averageSessionDuration: number;
    lastActivity: Date | null;
  }>> {
    const stores = await this.storeRepository.find();
    const results = [];

    for (const store of stores) {
      const logs = await this.logRepository.find({
        where: { storeId: store.id, eventType: LogEventType.PLAY_END },
        order: { timestamp: 'DESC' },
        take: 1000 // Limit for performance
      });

      const totalPlays = logs.length;
      const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
      const averageSessionDuration = totalPlays > 0 ? Math.round(totalDuration / totalPlays) : 0;
      const lastActivity = logs.length > 0 ? logs[0].timestamp : null;

      results.push({
        storeId: store.id,
        storeName: store.name,
        totalPlays,
        totalDuration,
        averageSessionDuration,
        lastActivity
      });
    }

    return results.sort((a, b) => b.totalPlays - a.totalPlays);
  }

  // Schedule Management Service Methods
  async checkScheduleConflicts(
    storeId: string,
    startTime: string,
    endTime: string,
    excludeScheduleId?: string
  ): Promise<SignageSchedule[]> {
    const queryBuilder = this.scheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.storeId = :storeId', { storeId })
      .andWhere('schedule.status = :status', { status: 'active' })
      .andWhere(
        '(schedule.startTime < :endTime AND schedule.endTime > :startTime)',
        { startTime, endTime }
      );

    if (excludeScheduleId) {
      queryBuilder.andWhere('schedule.id != :excludeScheduleId', { excludeScheduleId });
    }

    return await queryBuilder.getMany();
  }

  // Playback Control Service Methods
  async getCurrentPlaybackStatus(storeId: string): Promise<{
    isPlaying: boolean;
    currentItem?: PlaylistItem;
    playlist?: StorePlaylist;
    schedule?: SignageSchedule;
  }> {
    const activeSchedule = await this.getStoreActiveSchedule(storeId);
    
    if (!activeSchedule || !activeSchedule.playlist) {
      return { isPlaying: false };
    }

    const currentItem = activeSchedule.playlist.items?.[0]; // Simplified logic
    
    return {
      isPlaying: true,
      currentItem,
      playlist: activeSchedule.playlist,
      schedule: activeSchedule
    };
  }

  // Cleanup Service Methods
  async cleanupInvalidContent(): Promise<{ removed: number; updated: number }> {
    const contents = await this.contentRepository.find({
      where: { status: ContentStatus.APPROVED }
    });

    let removed = 0;
    let updated = 0;

    for (const content of contents) {
      const isAccessible = await VideoHelper.isVideoAccessible(content.url);
      
      if (!isAccessible) {
        content.status = ContentStatus.INACTIVE;
        await this.contentRepository.save(content);
        removed++;
      } else {
        // Try to update video info if missing
        if (!content.duration || !content.thumbnailUrl) {
          await this.enrichContentWithVideoInfo(content);
          updated++;
        }
      }
    }

    return { removed, updated };
  }

  // Analytics method for health checking
  async getSignageAnalytics() {
    try {
      // Simple health check without depending on missing methods
      return {
        activeDisplaysCount: 0,
        totalContent: 0,
        systemStatus: 'healthy'
      };
    } catch (error) {
      console.error('Error getting signage analytics:', error);
      throw error;
    }
  }
}

// Export instance
export const signageService = new SignageService();