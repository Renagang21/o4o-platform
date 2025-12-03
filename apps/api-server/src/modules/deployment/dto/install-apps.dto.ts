import { IsString, IsArray } from 'class-validator';

export class InstallAppsDto {
  @IsString()
  instanceId: string;

  @IsArray()
  @IsString({ each: true })
  apps: string[];
}
