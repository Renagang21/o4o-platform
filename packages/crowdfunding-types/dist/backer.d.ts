import type { BaseEntity, User } from '@o4o/types';
import type { RewardTier, BackerReward } from './reward';

export interface Backing extends BaseEntity {
  // Identifiers
  projectId: string;
  backerId: string;
  backer?: User;
  
  // Amount
  amount: number;
  currency: string;
  
  // Rewards
  rewards: BackerReward[];
  
  // Payment
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  paidAt?: Date | string;
  
  // Status
  status: BackingStatus;
  
  // Anonymous
  isAnonymous: boolean;
  displayName?: string; // 익명 후원시 표시 이름
  
  // Message
  backerMessage?: string; // 창작자에게 남기는 메시지
  isMessagePublic: boolean;
  
  // Cancellation
  cancelledAt?: Date | string;
  cancellationReason?: string;
  refundedAt?: Date | string;
  refundAmount?: number;
}

export type PaymentMethod = 'card' | 'bank_transfer' | 'kakao_pay' | 'naver_pay' | 'toss' | 'paypal';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
export type BackingStatus = 'active' | 'cancelled' | 'fulfilled' | 'refunded';

export interface BackerProfile {
  userId: string;
  user?: User;
  
  // Statistics
  totalBackings: number;
  totalAmount: number;
  successfulProjects: number;
  
  // Preferences
  interests: string[];
  preferredCategories: string[];
  notificationSettings: BackerNotificationSettings;
  
  // Privacy
  showProfile: boolean;
  showBackings: boolean;
}

export interface BackerNotificationSettings {
  projectUpdates: boolean;
  projectComments: boolean;
  rewardShipping: boolean;
  newProjects: boolean;
  marketing: boolean;
}

export interface BackingActivity {
  id: string;
  backingId: string;
  type: BackingActivityType;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date | string;
}

export type BackingActivityType = 
  | 'backing_created'
  | 'payment_completed'
  | 'reward_selected'
  | 'shipping_updated'
  | 'message_sent'
  | 'backing_cancelled'
  | 'refund_processed';

// Aggregate types
export interface BackerStats {
  backerId: string;
  totalBackings: number;
  activeBackings: number;
  totalSpent: number;
  categoriesSupported: string[];
  firstBackingDate: Date | string;
  lastBackingDate: Date | string;
  averageBackingAmount: number;
}