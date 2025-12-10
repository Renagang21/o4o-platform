/**
 * LMS-Yaksa Types
 */

/**
 * 보수교육 학점
 */
export interface EducationCredit {
  id: string;
  memberId: string;
  year: number;
  earnedCredits: number;
  requiredCredits: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 연수 프로그램
 */
export interface TrainingProgram {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  credits: number;
  startDate: Date;
  endDate: Date;
  maxParticipants?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 교육 이력
 */
export interface EducationHistory {
  id: string;
  memberId: string;
  programId?: string;
  courseId?: string;
  title: string;
  credits: number;
  completedAt: Date;
  certificateId?: string;
  createdAt: Date;
}

/**
 * 이수증 템플릿
 */
export interface CertificateTemplate {
  id: string;
  organizationId: string;
  name: string;
  templateContent: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
