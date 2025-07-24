// O4O Crowdfunding System Types
// 단순한 B2B 모델 - 제품 개발사가 판매자 매장 참여를 모집하는 시스템

export type CrowdfundingProjectStatus = 
  | 'recruiting'   // 모집중
  | 'in_progress'  // 진행중
  | 'completed'    // 완료
  | 'cancelled';   // 중단

export type ParticipationStatus = 
  | 'joined'       // 참여
  | 'cancelled';   // 취소

// 크라우드펀딩 프로젝트 기본 인터페이스
export interface CrowdfundingProject {
  id: string;
  title: string;
  description: string;
  
  // 참여 관련
  targetParticipantCount: number;     // 목표 참여 매장 수
  currentParticipantCount: number;    // 현재 참여 매장 수
  
  // 기간
  startDate: string;  // ISO date string
  endDate: string;    // ISO date string
  
  // 상태
  status: CrowdfundingProjectStatus;
  
  // 생성자 (제품 개발사)
  creatorId: string;
  creatorName?: string;
  
  // 포럼 연동 (단순 링크)
  forumLink?: string;
  
  // 메타데이터
  createdAt: string;
  updatedAt: string;
}

// 프로젝트 생성/수정용 폼 데이터
export interface CrowdfundingProjectFormData {
  title: string;
  description: string;
  targetParticipantCount: number;
  startDate: string;
  endDate: string;
  forumLink?: string;
}

// 참여 정보
export interface CrowdfundingParticipation {
  id: string;
  projectId: string;
  vendorId: string;
  vendorName?: string;
  status: ParticipationStatus;
  joinedAt: string;
  cancelledAt?: string;
}

// 프로젝트 상세 정보 (참여자 목록 포함)
export interface CrowdfundingProjectDetail extends CrowdfundingProject {
  participants: CrowdfundingParticipation[];
  participationStatus?: ParticipationStatus; // 현재 사용자의 참여 상태
}

// 참여 요청/응답
export interface ParticipationRequest {
  projectId: string;
}

export interface ParticipationResponse {
  success: boolean;
  message: string;
  participation?: CrowdfundingParticipation;
}

// 프로젝트 통계
export interface CrowdfundingProjectStats {
  projectId: string;
  participationRate: number;        // 참여율 (0-100)
  remainingDays: number;           // 남은 일수
  isActive: boolean;               // 활성 상태 (기간 내)
  isSuccessful: boolean;           // 목표 달성 여부
}

// API 응답 타입들
export interface CrowdfundingProjectsResponse {
  success: boolean;
  data: CrowdfundingProject[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface CrowdfundingProjectDetailResponse {
  success: boolean;
  data: CrowdfundingProjectDetail;
}

// 쿼리 파라미터
export interface CrowdfundingProjectsQuery {
  status?: CrowdfundingProjectStatus;
  creatorId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// 관리자용 프로젝트 통계
export interface CrowdfundingDashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalParticipants: number;
  successRate: number; // 성공한 프로젝트 비율
}