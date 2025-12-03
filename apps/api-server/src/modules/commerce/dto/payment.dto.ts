import { IsString, IsNumber, IsOptional, IsEnum, IsNotEmpty, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../../entities/Order.js';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod!: PaymentMethod;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @IsString()
  @IsOptional()
  currency?: string = 'KRW';

  @IsString()
  @IsOptional()
  paymentKey?: string;

  @IsString()
  @IsOptional()
  paymentProvider?: string = 'tosspayments';

  @IsString()
  @IsOptional()
  cardNumber?: string;

  @IsString()
  @IsOptional()
  cardExpiry?: string;

  @IsString()
  @IsOptional()
  cardCvc?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  bankCode?: string;
}

export class ConfirmPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  paymentKey!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;
}

export class RefundPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  refundAmount?: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
