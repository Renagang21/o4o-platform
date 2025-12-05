import { IsString, IsOptional, IsEnum, IsNotEmpty, IsNumber, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '../../../entities/Order.js';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status!: OrderStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class CancelOrderDto {
  @IsString()
  @IsNotEmpty()
  cancellationReason!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  refundAmount?: number;
}

export class ReturnOrderDto {
  @IsString()
  @IsNotEmpty()
  returnReason!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  refundAmount?: number;
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  paymentStatus!: PaymentStatus;

  @IsString()
  @IsOptional()
  paymentKey?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
