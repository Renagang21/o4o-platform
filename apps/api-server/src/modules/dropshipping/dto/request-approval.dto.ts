import { IsString, IsOptional, IsNotEmpty, IsUUID, IsEnum } from 'class-validator';

export enum ApprovalType {
  SELLER_APPLICATION = 'seller_application',
  SUPPLIER_APPLICATION = 'supplier_application',
  PARTNER_APPLICATION = 'partner_application',
  PRODUCT_LISTING = 'product_listing',
  TIER_UPGRADE = 'tier_upgrade'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export class RequestApprovalDto {
  @IsEnum(ApprovalType)
  @IsNotEmpty()
  approvalType!: ApprovalType;

  @IsUUID()
  @IsNotEmpty()
  entityId!: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ProcessApprovalDto {
  @IsUUID()
  @IsNotEmpty()
  approvalId!: string;

  @IsEnum(ApprovalStatus)
  @IsNotEmpty()
  status!: ApprovalStatus;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}
