import type { BaseEntity, MediaItem } from '@o4o/types';

export interface RewardTier extends BaseEntity {
  projectId: string;
  
  // Basic Info
  title: string;
  description: string;
  
  // Pricing
  price: number;
  earlyBirdPrice?: number;
  earlyBirdLimit?: number;
  
  // Inventory
  totalQuantity?: number; // undefined = unlimited
  remainingQuantity?: number;
  
  // Delivery
  estimatedDeliveryDate: Date | string;
  shippingRequired: boolean;
  shippingRegions: ShippingRegion[];
  
  // Media
  images: MediaItem[] | string[];
  
  // Options
  includesItems: RewardItem[];
  options?: RewardOption[];
  
  // Status
  isActive: boolean;
  isHidden: boolean;
  
  // Limits
  maxPerBacker: number;
  minimumBackers?: number; // 최소 후원자 수 (달성해야 제공)
  
  // Order
  sortOrder: number;
}

export interface RewardItem {
  name: string;
  quantity: number;
  description?: string;
}

export interface RewardOption {
  id: string;
  name: string; // e.g., "Size", "Color"
  type: 'single' | 'multiple';
  required: boolean;
  choices: RewardOptionChoice[];
}

export interface RewardOptionChoice {
  id: string;
  value: string;
  additionalPrice?: number;
  available: boolean;
}

export interface ShippingRegion {
  name: string;
  countries: string[];
  shippingFee: number;
  estimatedDays: string; // e.g., "7-14 days"
}

export interface BackerReward {
  id: string;
  backingId: string;
  rewardId: string;
  reward: RewardTier;
  quantity: number;
  selectedOptions?: { [optionId: string]: string | string[] };
  shippingAddress?: ShippingAddress;
  shippingRegion?: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  shippedAt?: Date | string;
  deliveredAt?: Date | string;
}

export interface ShippingAddress {
  recipientName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  instructions?: string;
}