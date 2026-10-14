import { IsInt, IsUUID, Min } from 'class-validator';

export class SignupTermsReferenceDto {
  @IsUUID()
  policyDocumentId!: string;

  @IsInt()
  @Min(1)
  version!: number;
}
