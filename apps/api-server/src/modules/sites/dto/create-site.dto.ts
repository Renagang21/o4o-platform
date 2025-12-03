import { IsString, IsArray, IsOptional, IsObject } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  domain: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  template?: string; // 'default', 'ecommerce', 'forum', etc.

  @IsArray()
  @IsOptional()
  apps?: string[]; // Override template apps

  @IsObject()
  @IsOptional()
  variables?: Record<string, string>; // Template variables

  @IsObject()
  @IsOptional()
  theme?: any; // Theme customization

  @IsOptional()
  deployNow?: boolean; // Trigger deployment immediately
}
