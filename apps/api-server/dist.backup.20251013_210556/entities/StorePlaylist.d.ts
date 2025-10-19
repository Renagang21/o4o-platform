import { Store } from './Store';
import { PlaylistItem } from './PlaylistItem';
export declare enum PlaylistStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SCHEDULED = "scheduled"
}
export declare class StorePlaylist {
    id: string;
    name: string;
    description?: string;
    status: PlaylistStatus;
    isDefault: boolean;
    loop: boolean;
    totalDuration: number;
    storeId: string;
    store: Promise<Store>;
    items: PlaylistItem[];
    createdAt: Date;
    updatedAt: Date;
    isActive(): boolean;
}
//# sourceMappingURL=StorePlaylist.d.ts.map