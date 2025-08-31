export class CreateAffiliateDto {
  userId: string;
  commissionRate?: number;
  websiteUrl?: string;
  description?: string;
  metadata?: {
    paymentMethod?: string;
    paymentDetails?: any;
    customSettings?: any;
    notes?: string;
  };
}

export class CreateAffiliateLinkDto {
  affiliateUserId: string;
  landingUrl: string;
  source?: string;
  medium?: string;
  campaign?: string;
  customParams?: Record<string, any>;
}

export class TrackClickDto {
  referralCode: string;
  sessionId: string;
  ipAddress: string;
  userAgent?: string;
  referrerUrl?: string;
  landingUrl: string;
  device?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  metadata?: {
    source?: string;
    medium?: string;
    campaign?: string;
    keyword?: string;
    adId?: string;
    customParams?: any;
  };
}

export class TrackConversionDto {
  sessionId: string;
  orderId?: string;
  customerId?: string;
  orderAmount: number;
  conversionType?: 'sale' | 'signup' | 'subscription' | 'custom';
  ipAddress?: string;
  userAgent?: string;
  metadata?: {
    productIds?: string[];
    couponCode?: string;
    paymentMethod?: string;
    source?: string;
    customData?: any;
  };
}

export class GetAffiliateStatsDto {
  affiliateUserId?: string;
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'week' | 'month';
}