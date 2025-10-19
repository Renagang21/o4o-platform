import type { User } from '../entities/User';
export type FundingStatus = 'draft' | 'pending' | 'ongoing' | 'successful' | 'failed' | 'cancelled';
export type FundingCategory = 'tech' | 'art' | 'design' | 'fashion' | 'food' | 'social' | 'other';
export type PaymentMethod = 'card' | 'bank_transfer' | 'kakao_pay' | 'naver_pay' | 'toss' | 'paypal';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
export type BackingStatus = 'active' | 'cancelled' | 'fulfilled' | 'refunded';
export interface BaseEntity {
    id: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}
export interface MediaItem {
    id: string;
    url: string;
    type: string;
    name?: string;
    size?: number;
}
export interface FundingProject extends BaseEntity {
    title: string;
    slug: string;
    description: string;
    shortDescription: string;
    category: FundingCategory;
    tags: string[];
    creatorId: string;
    creator?: User;
    creatorName: string;
    creatorDescription?: string;
    targetAmount: number;
    currentAmount: number;
    minimumAmount?: number;
    startDate: Date | string;
    endDate: Date | string;
    estimatedDeliveryDate?: Date | string;
    backerCount: number;
    viewCount: number;
    likeCount: number;
    shareCount: number;
    updateCount: number;
    status: FundingStatus;
    isVisible: boolean;
    isFeatured: boolean;
    isStaffPick: boolean;
    mainImage?: MediaItem | string;
    images: MediaItem[] | string[];
    videoUrl?: string;
    story: string;
    risks?: string;
    faqs?: ProjectFAQ[];
    updates?: ProjectUpdate[];
    allowComments: boolean;
    allowAnonymousBacking: boolean;
    showBackerList: boolean;
    approvedAt?: Date | string;
    approvedBy?: string;
    rejectionReason?: string;
}
export interface ProjectFAQ {
    id: string;
    question: string;
    answer: string;
    order: number;
    createdAt: Date | string;
}
export interface ProjectUpdate {
    id: string;
    projectId: string;
    title: string;
    content: string;
    isPublic: boolean;
    author: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}
export interface Backing extends BaseEntity {
    projectId: string;
    backerId: string;
    backer?: User;
    amount: number;
    currency: string;
    rewards: BackerReward[];
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    paymentId?: string;
    paidAt?: Date | string;
    status: BackingStatus;
    isAnonymous: boolean;
    displayName?: string;
    backerMessage?: string;
    isMessagePublic: boolean;
    cancelledAt?: Date | string;
    cancellationReason?: string;
    refundedAt?: Date | string;
    refundAmount?: number;
}
export interface BackerReward {
    rewardId: string;
    quantity: number;
    shippingAddress?: string;
    shippingStatus?: string;
    trackingNumber?: string;
}
export interface RewardTier extends BaseEntity {
    projectId: string;
    title: string;
    description: string;
    amount: number;
    currency: string;
    items: RewardItem[];
    estimatedDelivery: Date | string;
    shippingRequired: boolean;
    shippingFee?: number;
    limitedQuantity?: number;
    remainingQuantity?: number;
    backerCount: number;
    isHidden: boolean;
    order: number;
    imageUrl?: string;
    restrictions?: string;
}
export interface RewardItem {
    name: string;
    quantity: number;
    description?: string;
}
export interface FundingProjectFormData {
    title: string;
    description: string;
    shortDescription: string;
    category: FundingCategory;
    tags: string[];
    targetAmount: number;
    minimumAmount?: number;
    startDate: string;
    endDate: string;
    estimatedDeliveryDate?: string;
    story: string;
    risks?: string;
    mainImage?: File | string;
    images?: (File | string)[];
    videoUrl?: string;
}
export interface ProjectStats {
    projectId: string;
    dailyBackers: number;
    dailyAmount: number;
    totalBackers: number;
    totalAmount: number;
    conversionRate: number;
    averageBackingAmount: number;
    fundingProgress: number;
    daysLeft: number;
    estimatedEndAmount: number;
}
export interface ProjectFilters {
    search?: string;
    category?: FundingCategory;
    status?: FundingStatus;
    minAmount?: number;
    maxAmount?: number;
    creatorId?: string;
    tags?: string[];
    sortBy?: 'latest' | 'popular' | 'ending_soon' | 'most_funded';
    page?: number;
    limit?: number;
}
//# sourceMappingURL=crowdfunding-types.d.ts.map