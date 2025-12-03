import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

/**
 * Assign Role DTO
 *
 * Validates role assignment data
 */
export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  role: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

/**
 * Remove Role DTO
 *
 * Validates role removal data
 */
export class RemoveRoleDto {
  @IsString()
  @IsNotEmpty()
  role: string;
}
