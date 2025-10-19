import { Store } from './Store';
import { SignageContent } from './SignageContent';
import { StorePlaylist } from './StorePlaylist';
export declare enum LogEventType {
    PLAY_START = "play_start",
    PLAY_END = "play_end",
    PLAY_PAUSE = "play_pause",
    PLAY_RESUME = "play_resume",
    PLAY_SKIP = "play_skip",
    SCHEDULE_CHANGE = "schedule_change",
    PLAYLIST_CHANGE = "playlist_change"
}
export declare class ContentUsageLog {
    id: string;
    eventType: LogEventType;
    timestamp: Date;
    duration?: number;
    metadata?: {
        userAgent?: string;
        resolution?: string;
        volume?: number;
        position?: number;
        templateId?: string;
        zoneId?: string;
    };
    storeId: string;
    store: Store;
    contentId?: string;
    content?: SignageContent;
    playlistId?: string;
    playlist?: StorePlaylist;
    createdAt: Date;
    static createPlayLog(storeId: string, contentId: string, playlistId: string, eventType: LogEventType, duration?: number, metadata?: {
        userAgent?: string;
        resolution?: string;
        volume?: number;
        position?: number;
        templateId?: string;
        zoneId?: string;
    }): Partial<ContentUsageLog>;
    static createScheduleLog(storeId: string, eventType: LogEventType, metadata?: Record<string, unknown>): Partial<ContentUsageLog>;
}
//# sourceMappingURL=ContentUsageLog.d.ts.map