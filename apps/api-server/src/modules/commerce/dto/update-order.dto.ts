import { IsString, IsNotEmpty, IsIn } from 'class-validator';

/**
 * UpdateOrderDto
 * Validates order status update requests
 */
export class UpdateOrderDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
  status!: string;
}
