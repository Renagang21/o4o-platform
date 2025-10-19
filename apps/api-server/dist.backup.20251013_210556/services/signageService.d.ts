import { SignageContent } from '../entities/SignageContent';
import { Store } from '../entities/Store';
import { StorePlaylist } from '../entities/StorePlaylist';
import { PlaylistItem } from '../entities/PlaylistItem';
import { SignageSchedule } from '../entities/SignageSchedule';
import { LogEventType } from '../entities/ContentUsageLog';
import { User } from '../entities/User';
export declare class SignageService {
    private contentRepository;
    private storeRepository;
    private playlistRepository;
    private playlistItemRepository;
    private scheduleRepository;
    private logRepository;
    enrichContentWithVideoInfo(content: SignageContent): Promise<SignageContent>;
    validateContentAccess(contentId: string, user: User): Promise<SignageContent | null>;
    validateStoreAccess(storeId: string, user: User): Promise<Store | null>;
    getStoreActiveSchedule(storeId: string): Promise<SignageSchedule | null>;
    calculatePlaylistDuration(playlistId: string): Promise<number>;
    reorderPlaylistItems(playlistId: string, itemOrders: Array<{
        id: string;
        order: number;
    }>): Promise<void>;
    validatePlaylistOwnership(playlistId: string, user: User): Promise<StorePlaylist | null>;
    logContentUsage(storeId: string, eventType: LogEventType, contentId?: string, playlistId?: string, duration?: number, metadata?: Record<string, unknown>): Promise<void>;
    getContentUsageStats(storeId?: string, contentId?: string, dateFrom?: Date, dateTo?: Date): Promise<{
        totalPlays: number;
        totalDuration: number;
        averagePlayDuration: number;
        topContents: Array<{
            contentId: string;
            title: string;
            playCount: number;
            totalDuration: number;
        }>;
    }>;
    getStorePerformanceStats(): Promise<Array<{
        storeId: string;
        storeName: string;
        totalPlays: number;
        totalDuration: number;
        averageSessionDuration: number;
        lastActivity: Date | null;
    }>>;
    checkScheduleConflicts(storeId: string, startTime: string, endTime: string, excludeScheduleId?: string): Promise<SignageSchedule[]>;
    getCurrentPlaybackStatus(storeId: string): Promise<{
        isPlaying: boolean;
        currentItem?: PlaylistItem;
        playlist?: StorePlaylist;
        schedule?: SignageSchedule;
    }>;
    cleanupInvalidContent(): Promise<{
        removed: number;
        updated: number;
    }>;
    getSignageAnalytics(): Promise<{
        activeDisplaysCount: number;
        totalContent: number;
        systemStatus: string;
    }>;
}
export declare const signageService: SignageService;
//# sourceMappingURL=signageService.d.ts.map