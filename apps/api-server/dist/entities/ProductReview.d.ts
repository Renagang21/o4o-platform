import { Product } from './Product';
import { User } from './User';
import { Order } from './Order';
export declare class ProductReview {
    id: string;
    productId: string;
    product: Product;
    variationId?: string;
    userId: string;
    user: User;
    orderId?: string;
    order?: Order;
    rating: number;
    title: string;
    content: string;
    images?: string[];
    pros?: string[];
    cons?: string[];
    isVerifiedPurchase: boolean;
    isRecommended: boolean;
    helpfulCount: number;
    unhelpfulCount: number;
    status: 'pending' | 'approved' | 'rejected';
    moderationNote?: string;
    merchantReply?: string;
    merchantReplyAt?: Date;
    attributes?: {
        size?: string;
        color?: string;
        fit?: string;
        quality?: string;
        [key: string]: any;
    };
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    votes: ReviewVote[];
}
export declare class ReviewVote {
    id: string;
    reviewId: string;
    review: ProductReview;
    userId: string;
    user: User;
    voteType: 'helpful' | 'unhelpful';
    createdAt: Date;
}
export declare class Wishlist {
    id: string;
    userId: string;
    user: User;
    productId: string;
    product: Product;
    variationId?: string;
    priceWhenAdded: number;
    targetPrice?: number;
    notifyOnPriceDrop: boolean;
    notifyOnRestock: boolean;
    note?: string;
    priority: number;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=ProductReview.d.ts.map