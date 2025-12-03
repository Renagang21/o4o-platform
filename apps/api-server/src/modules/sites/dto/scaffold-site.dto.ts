import { IsString, IsArray, IsOptional } from 'class-validator';

export class ScaffoldSiteDto {
  @IsString()
  siteId: string;

  @IsArray()
  @IsOptional()
  additionalApps?: string[]; // Additional apps to install

  @IsOptional()
  autoDeployDepends?: boolean; // Auto-deploy after scaffolding
}
