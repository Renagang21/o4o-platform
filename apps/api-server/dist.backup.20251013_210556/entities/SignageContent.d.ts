import { User } from './User';
export declare enum ContentType {
    YOUTUBE = "youtube",
    VIMEO = "vimeo"
}
export declare enum ContentStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    INACTIVE = "inactive"
}
export declare class SignageContent {
    id: string;
    title: string;
    description?: string;
    type: ContentType;
    url: string;
    videoId?: string;
    thumbnailUrl?: string;
    duration?: number;
    status: ContentStatus;
    tags?: string[];
    isPublic: boolean;
    createdBy: string;
    creator: User;
    approvedBy?: string;
    approver?: User;
    approvedAt?: Date;
    rejectedReason?: string;
    createdAt: Date;
    updatedAt: Date;
    canBeApprovedBy(user: User): boolean;
    isApproved(): boolean;
    isAvailableForStores(): boolean;
}
//# sourceMappingURL=SignageContent.d.ts.map