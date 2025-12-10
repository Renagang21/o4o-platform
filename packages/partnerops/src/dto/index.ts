/**
 * PartnerOps DTOs
 *
 * Note: Service-specific DTOs (CreateProfileDto, UpdateProfileDto, CreateRoutineDto,
 * UpdateRoutineDto, CreateLinkDto) are defined in their respective services.
 */

// Partner Profile DTOs (legacy, prefer service DTOs)
export interface CreatePartnerDto {
  name: string;
  description?: string;
  snsAccounts?: Record<string, string>;
}

export interface UpdatePartnerDto {
  name?: string;
  description?: string;
  snsAccounts?: Record<string, string>;
}

// Click DTOs
export interface RecordClickDto {
  shortCode: string;
  visitorId?: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
}

// Conversion DTOs
export interface RecordConversionDto {
  partnerId: string;
  linkId?: string;
  clickId?: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
}

// Query DTOs
export interface ListQueryDto {
  page?: number;
  limit?: number;
}

export interface ConversionQueryDto extends ListQueryDto {
  status?: 'pending' | 'approved' | 'rejected' | 'paid';
  startDate?: string;
  endDate?: string;
}

export interface SettlementQueryDto extends ListQueryDto {
  status?: 'pending' | 'approved' | 'paid';
}
