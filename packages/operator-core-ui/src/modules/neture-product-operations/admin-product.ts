export interface AdminProduct {
  id: string;
  masterId: string;
  marketingName: string;
  // WO-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1: backend 가 함께 반환(field contract 정합)
  masterName?: string;
  supplierName: string;
  category: string | null;
  distributionType: string;
  approvalStatus: string;
  isActive: boolean;
  createdAt: string;
  consumerShortDescription?: string | null;
  consumerDetailDescription?: string | null;
  businessShortDescription?: string | null;
  businessDetailDescription?: string | null;
}
