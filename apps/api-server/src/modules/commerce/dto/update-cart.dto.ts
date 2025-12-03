import { IsString, IsNumber, IsOptional, Min, IsNotEmpty, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartDto {
  @IsUUID()
  @IsNotEmpty()
  cartItemId!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
