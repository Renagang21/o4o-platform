import { Store } from './Store';
import { StorePlaylist } from './StorePlaylist';
export declare enum ScheduleType {
    DAILY = "daily",
    WEEKLY = "weekly",
    ONE_TIME = "one_time"
}
export declare enum ScheduleStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    EXPIRED = "expired"
}
export declare class SignageSchedule {
    id: string;
    name: string;
    description?: string;
    type: ScheduleType;
    status: ScheduleStatus;
    startTime: string;
    endTime: string;
    daysOfWeek?: number[];
    specificDate?: Date;
    validFrom?: Date;
    validUntil?: Date;
    priority: number;
    storeId: string;
    store: Store;
    playlistId: string;
    playlist: StorePlaylist;
    createdAt: Date;
    updatedAt: Date;
    isActiveNow(): boolean;
    conflictsWith(other: SignageSchedule): boolean;
}
//# sourceMappingURL=SignageSchedule.d.ts.map