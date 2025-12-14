import { IsString, IsNotEmpty, IsNumber, IsOptional, IsObject, IsEnum } from 'class-validator';

export class SubmitCerApplicationDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  methodologyId: string;

  @IsNumber()
  accuUnits: number;

  @IsObject()
  @IsNotEmpty()
  applicationData: Record<string, any>;

  @IsString()
  @IsOptional()
  serReference?: string;
}

export enum CerApplicationStatus {
  SUBMITTED = 'SUBMITTED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  MORE_INFO_REQUIRED = 'MORE_INFO_REQUIRED',
}

export class CerApplicationStatusResponseDto {
  @IsString()
  applicationId: string;

  @IsString()
  externalReferenceId: string;

  @IsEnum(CerApplicationStatus)
  status: CerApplicationStatus;

  @IsString()
  lastUpdated: string;

  @IsOptional()
  details?: any;
}
