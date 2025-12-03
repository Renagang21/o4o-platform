import { IsString, IsOptional, IsNotEmpty, IsUUID, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShipmentDto {
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  shippingCarrier!: string;

  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;

  @IsString()
  @IsOptional()
  trackingUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  estimatedDeliveryDate?: Date;
}

export class UpdateShipmentDto {
  @IsString()
  @IsOptional()
  shippingCarrier?: string;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  trackingUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  estimatedDeliveryDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  actualDeliveryDate?: Date;
}

export class TrackShipmentDto {
  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;

  @IsString()
  @IsOptional()
  carrier?: string;
}
