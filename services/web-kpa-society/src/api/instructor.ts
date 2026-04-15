/**
 * Instructor Dashboard API
 * WO-O4O-INSTRUCTOR-DASHBOARD-V1
 */

import { authClient } from '../contexts/AuthContext';

export interface InstructorProfile {
  displayName: string;
  organization: string | null;
  jobTitle: string | null;
  expertise: string[];
  bio: string | null;
  experience: string | null;
  lecturePlanSummary: string | null;
  lectureTopics: string[];
  portfolioUrl: string | null;
  isActive: boolean;
}

export interface InstructorQualification {
  status: 'approved';
  requestedAt: string | null;
  approvedAt: string | null;
}

export interface InstructorDashboardData {
  qualification: InstructorQualification;
  profile: InstructorProfile | null;
  latestRequest: {
    reviewNote: string | null;
    reviewedAt: string | null;
  } | null;
}

export interface UpdateProfileDto {
  displayName?: string;
  organization?: string | null;
  jobTitle?: string | null;
  expertise?: string[];
  bio?: string | null;
  experience?: string | null;
  lectureTopics?: string[];
  lecturePlanSummary?: string | null;
  portfolioUrl?: string | null;
}

export const instructorApi = {
  /** 내 강사 자격 + 프로필 조회 */
  getMe: () =>
    authClient.api.get<{ success: boolean; data: InstructorDashboardData }>('/kpa/instructor/me'),

  /** 프로필 수정 */
  updateProfile: (dto: UpdateProfileDto) =>
    authClient.api.patch<{ success: boolean; data: InstructorProfile }>('/kpa/instructor/profile', dto),
};
