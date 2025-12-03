import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';

export enum InstanceRegion {
  AP_NORTHEAST_2 = 'ap-northeast-2',
  US_EAST_1 = 'us-east-1',
  EU_WEST_1 = 'eu-west-1',
}

export enum InstanceType {
  NANO = 'nano_3_0',
  MICRO = 'micro_3_0',
  SMALL = 'small_3_0',
  MEDIUM = 'medium_3_0',
}

export class CreateInstanceDto {
  @IsString()
  domain: string;

  @IsArray()
  @IsString({ each: true })
  apps: string[];

  @IsOptional()
  @IsEnum(InstanceRegion)
  region?: InstanceRegion = InstanceRegion.AP_NORTHEAST_2;

  @IsOptional()
  @IsEnum(InstanceType)
  instanceType?: InstanceType = InstanceType.NANO;

  @IsOptional()
  @IsString()
  description?: string;
}
