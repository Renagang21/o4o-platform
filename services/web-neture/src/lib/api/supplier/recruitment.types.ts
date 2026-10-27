// ==================== Supplier Recruitment Creation API ====================
// WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1

// WO-O4O-SELLER-RECRUITMENT-EXPOSURE-SUPPLIER-STATUS-V1: 서비스 노출 승인 상태 (운영 상태 status 와 분리)
export type RecruitmentExposureStatus = 'pending' | 'approved' | 'rejected';

export interface SupplierRecruitment {
  recruitmentKind: 'public' | 'semi-franchise';
  semiFranchiseId?: string | null;
  id: string;
  productId: string;
  productName: string;
  serviceId: string;
  serviceName: string;
  commissionRate: number;
  consumerPrice: number;
  supplyUnitPrice?: number | null;
  status: string;
  // WO-O4O-SELLER-RECRUITMENT-EXPOSURE-SUPPLIER-STATUS-V1: 서비스 노출 승인 상태 (읽기 전용 표시)
  exposureStatus: RecruitmentExposureStatus;
  exposureReviewedAt: string | null;
  exposureReviewedBy: string | null;
  exposureReviewNote: string | null;
  createdAt: string;
  applications: { total: number; pending: number; approved: number; rejected: number };
}

// WO-O4O-SELLER-RECRUITMENT-SUPPLIER-APPLICATION-REVIEW-V1
export interface RecruitmentApplication {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  organizationName: string;
  status: string;
  appliedAt: string;
  decidedAt: string | null;
  reason: string;
  // WO-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1: 참여 해지 파생 상태
  participationTerminated?: boolean;
}

export interface RecruitmentDetail {
  recruitment: {
    recruitmentKind: 'public' | 'semi-franchise';
    id: string;
    productId: string;
    productName: string;
    serviceId: string;
    serviceName: string;
    commissionRate: number;
    consumerPrice: number;
  supplyUnitPrice?: number | null;
    status: string;
    // WO-O4O-SELLER-RECRUITMENT-EXPOSURE-SUPPLIER-STATUS-V1: 서비스 노출 승인 상태 (읽기 전용 표시)
    exposureStatus: RecruitmentExposureStatus;
    exposureReviewedAt: string | null;
    exposureReviewedBy: string | null;
    exposureReviewNote: string | null;
    createdAt: string;
  };
  applications: RecruitmentApplication[];
}
