import { IsString, IsOptional, IsDate, IsIn, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class DashboardQueryDto {
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
  @IsIn(['day', 'week', 'month', 'year'])
  period?: 'day' | 'week' | 'month' | 'year' = 'month';

  @IsOptional()
  @IsString()
  @IsIn(['revenue', 'orders', 'products', 'customers'])
  metric?: 'revenue' | 'orders' | 'products' | 'customers';
}

export class SellerDashboardQueryDto extends DashboardQueryDto {
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['overview', 'sales', 'products', 'partners', 'settlements'])
  view?: 'overview' | 'sales' | 'products' | 'partners' | 'settlements' = 'overview';
}

export class SupplierDashboardQueryDto extends DashboardQueryDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['overview', 'products', 'orders', 'settlements'])
  view?: 'overview' | 'products' | 'orders' | 'settlements' = 'overview';
}

export class PartnerDashboardQueryDto extends DashboardQueryDto {
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['overview', 'performance', 'earnings', 'settlements'])
  view?: 'overview' | 'performance' | 'earnings' | 'settlements' = 'overview';
}
