import { IsString, IsOptional, IsNotEmpty, IsUUID, IsEnum, IsBoolean } from 'class-validator';

export enum AuthorizationAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  SUSPEND = 'suspend',
  REACTIVATE = 'reactivate'
}

export class AuthorizeProductDto {
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @IsEnum(AuthorizationAction)
  @IsNotEmpty()
  action!: AuthorizationAction;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AuthorizeSellerDto {
  @IsUUID()
  @IsNotEmpty()
  sellerId!: string;

  @IsEnum(AuthorizationAction)
  @IsNotEmpty()
  action!: AuthorizationAction;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AuthorizeSupplierDto {
  @IsUUID()
  @IsNotEmpty()
  supplierId!: string;

  @IsEnum(AuthorizationAction)
  @IsNotEmpty()
  action!: AuthorizationAction;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AuthorizePartnerDto {
  @IsUUID()
  @IsNotEmpty()
  partnerId!: string;

  @IsEnum(AuthorizationAction)
  @IsNotEmpty()
  action!: AuthorizationAction;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
