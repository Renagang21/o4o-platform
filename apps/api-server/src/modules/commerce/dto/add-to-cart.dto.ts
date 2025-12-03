import { IsString, IsNumber, IsOptional, IsObject, Min, IsNotEmpty, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @IsString()
  @IsOptional()
  variationId?: string;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, string>;

  @IsString()
  @IsOptional()
  notes?: string;
}
