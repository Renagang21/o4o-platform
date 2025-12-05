import { IsNumber, IsNotEmpty, Min } from 'class-validator';

/**
 * UpdateCartItemDto
 * Validates cart item update requests (quantity change)
 */
export class UpdateCartItemDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity!: number;
}
