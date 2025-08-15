import { StorePlaylist } from './StorePlaylist';
import { SignageContent } from './SignageContent';
export declare enum ItemType {
    VIDEO = "video",
    IMAGE = "image"
}
export declare class PlaylistItem {
    id: string;
    type: ItemType;
    order: number;
    duration?: number;
    customSettings?: {
        volume?: number;
        autoplay?: boolean;
        startTime?: number;
        endTime?: number;
    };
    playlistId: string;
    playlist: StorePlaylist;
    contentId?: string;
    content?: SignageContent;
    imageUrl?: string;
    title?: string;
    createdAt: Date;
    updatedAt: Date;
    isVideo(): boolean;
    isImage(): boolean;
    getDisplayDuration(): number;
}
//# sourceMappingURL=PlaylistItem.d.ts.map