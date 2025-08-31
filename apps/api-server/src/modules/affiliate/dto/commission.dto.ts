export class GetCommissionsDto {
  affiliateUserId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'paid';
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  orderBy?: 'createdAt' | 'amount' | 'status';
  orderDirection?: 'ASC' | 'DESC';
}

export class CalculateCommissionDto {
  conversionId: string;
  orderId?: string;
  orderAmount: number;
  metadata?: any;
}

export class ProcessCommissionsDto {
  commissionIds: string[];
  action: 'approve' | 'reject' | 'pay';
  reason?: string;
  paymentReference?: string;
  notes?: string;
}

export class CreatePayoutDto {
  affiliateUserId: string;
  commissionIds: string[];
  paymentMethod: 'bank_transfer' | 'paypal' | 'stripe' | 'manual' | 'other';
  bankAccount?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    swiftCode?: string;
    routingNumber?: string;
    iban?: string;
  };
  paymentDetails?: {
    paypalEmail?: string;
    stripeAccountId?: string;
    wireDetails?: any;
    otherDetails?: any;
  };
  notes?: string;
}

export class GetPayoutsDto {
  affiliateUserId?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  month?: string; // YYYY-MM format
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class UpdateAffiliateStatusDto {
  status: 'active' | 'inactive' | 'suspended';
  reason?: string;
}

export class GetAffiliateUsersDto {
  status?: 'active' | 'inactive' | 'suspended';
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: 'createdAt' | 'totalEarnings' | 'totalClicks' | 'totalConversions';
  orderDirection?: 'ASC' | 'DESC';
}

export class AdminDashboardQueryDto {
  period?: 'today' | 'week' | 'month' | 'year' | 'all';
  startDate?: Date;
  endDate?: Date;
}