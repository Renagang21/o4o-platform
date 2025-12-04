import { IsString, IsNumber, IsOptional, IsEnum, IsNotEmpty, IsDate, Min, IsUUID, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { SettlementPartyType, SettlementStatus } from '../entities/Settlement.js';

export class CreateSettlementDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['seller', 'supplier', 'platform', 'partner'])
  partyType!: SettlementPartyType;

  @IsUUID()
  @IsNotEmpty()
  partyId!: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  periodStart!: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  periodEnd!: Date;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalSaleAmount!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalBaseAmount!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalCommissionAmount!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalMarginAmount!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  payableAmount!: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  memo?: string;
}

export class UpdateSettlementDto {
  @IsEnum(SettlementStatus)
  @IsOptional()
  status?: SettlementStatus;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  payableAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  memo?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  paidAt?: Date;
}

export class SettlementQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['seller', 'supplier', 'platform', 'partner'])
  partyType?: SettlementPartyType;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc', 'ASC', 'DESC'])
  sortOrder?: string = 'desc';
}
