import { IsString, IsOptional, IsEmail, IsIn } from 'class-validator';

/**
 * Update User DTO (Admin only)
 *
 * Validates admin user update data
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended', 'pending', 'approved'])
  status?: string;

  @IsOptional()
  @IsString()
  role?: string;
}
