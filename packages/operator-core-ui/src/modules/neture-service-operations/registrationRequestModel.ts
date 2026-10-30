import type { RegistrationRecord } from './api';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';
// WO-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-AND-MEMBER-TYPE-FIX-V1:
// Neture 회원 유형에서 'consumer' 제거. 'user' 는 백엔드가 role 미지정 시 fallback 으로만 사용.
export type UserRole = 'supplier' | 'user' | 'seller' | 'pharmacist' | 'ALL';

export interface RegistrationRequest {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  service: string;
  companyName?: string;
  businessNumber?: string;
  licenseNumber?: string;
  // WO-O4O-NETURE-SUPPLIER-REGISTRATION-BUSINESS-INFO-V1
  representativeName?: string;
  taxInvoiceEmail?: string;
  contactName?: string;
  managerPhone?: string;
  businessAddress?: string;
  businessAddressDetail?: string;
  businessType?: string;
  // WO-O4O-OPERATOR-BUSINESS-REGISTRATION-DISPLAY-ALIGNMENT-V1:
  //   사업자등록증 3 canonical 추가 (업태 businessType 는 기존). users.businessInfo 출처.
  businessItem?: string;
  businessEntityType?: string;
  businessStartDate?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectReason?: string;
  operatorNotes?: string;
  supplierStatus?: string;
}

function mapStatus(raw: string | undefined): 'PENDING' | 'APPROVED' | 'REJECTED' {
  switch (raw?.toLowerCase()) {
    case 'active':
    case 'approved':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
    case 'pending':
    default:
      return 'PENDING';
  }
}

export function mapRegistrationRequest(r: RegistrationRecord, now = () => new Date().toISOString()): RegistrationRequest {
  return {
    id: r.id,
    email: r.email || '',
    name: r.name || '',
    phone: r.phone || '',
    // WO-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-AND-MEMBER-TYPE-FIX-V1:
    // 백엔드가 role 을 빈 값으로 반환할 때 'consumer' 대신 'user' fallback.
    role: (r.role as UserRole) || 'user',
    service: r.service || 'neture',
    companyName: r.companyName,
    businessNumber: r.businessNumber,
    licenseNumber: r.licenseNumber,
    representativeName: r.representativeName,
    taxInvoiceEmail: r.taxInvoiceEmail,
    contactName: r.contactName,
    managerPhone: r.managerPhone,
    businessAddress: r.businessAddress,
    businessAddressDetail: r.businessAddressDetail,
    businessType: r.businessType,
    businessItem: r.businessItem,
    businessEntityType: r.businessEntityType,
    businessStartDate: r.businessStartDate,
    status: mapStatus(r.status),
    createdAt: r.createdAt || now(),
    processedAt: r.processedAt,
    processedBy: r.processedBy,
    rejectReason: r.rejectReason,
    operatorNotes: r.operatorNotes,
    supplierStatus: r.supplierStatus,
  };
}

export function filterRegistrationRequests(
  requests: RegistrationRequest[],
  { searchQuery, statusFilter, roleFilter }: { searchQuery: string; statusFilter: RequestStatus; roleFilter: UserRole },
): RegistrationRequest[] {
  return requests.filter((request) => {
    const matchesSearch =
      request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
    const matchesRole = roleFilter === 'ALL' || request.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });
}

/** 선택 순서와 첫 일치 레코드 기준을 보존한다. */
export function getSelectedPendingRegistrationIds(requests: RegistrationRequest[], selectedIds: Set<string>): string[] {
  return [...selectedIds].filter(id => requests.find(request => request.id === id)?.status === 'PENDING');
}
