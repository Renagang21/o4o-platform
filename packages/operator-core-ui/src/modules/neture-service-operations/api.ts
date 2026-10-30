import type { AxiosInstance } from 'axios';
export interface RegistrationRecord {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  status: string;
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
  //   사업자등록증 3 canonical 추가 필드 (업태 businessType 는 기존). users.businessInfo 출처.
  businessItem?: string;
  businessEntityType?: string;
  businessStartDate?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectReason?: string;
  operatorNotes?: string;
  supplierStatus?: string;
}

// ==================== Operator Contact Messages ====================
// WO-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-OPERATOR-SCOPE-V1
//   /admin/contact-messages 와 의도적으로 분리한 별도 endpoint. operator 화면 노출
//   안전 필드만 응답. adminNotes / ipAddress / userAgent 없음. message 는 preview 만.

export interface OperatorContactMessage {
  id: string;
  contactType: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  /** 본문 preview (앞 160자). 상세 처리는 admin 화면. */
  messagePreview: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorContactPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OperatorContactListParams {
  contactType?: 'supplier' | 'partner' | 'service' | 'other';
  status?: 'new' | 'in_progress' | 'resolved';
  page?: number;
  limit?: number;
}


export function createNetureServiceApi(api: AxiosInstance) {
const operatorRegistrationApi = {
  async getRegistrations(filters?: { status?: string }): Promise<RegistrationRecord[]> {
    const qs = filters?.status ? `?status=${filters.status}` : '';
    const response = await api.get(`/neture/operator/registrations${qs}`);
    return response.data.data || [];
  },

  async approve(userId: string): Promise<{ success: boolean }> {
    const response = await api.post(
      `/neture/operator/registrations/${userId}/approve`,
      {},
    );
    return response.data;
  },

  async reject(userId: string, reason: string): Promise<{ success: boolean }> {
    const response = await api.post(
      `/neture/operator/registrations/${userId}/reject`,
      { reason },
    );
    return response.data;
  },

  async updateNotes(userId: string, notes: string): Promise<{ success: boolean }> {
    const response = await api.patch(
      `/neture/operator/registrations/${userId}/notes`,
      { notes },
    );
    return response.data;
  },

  async batchProcess(ids: string[], action: 'approve' | 'reject', reason?: string): Promise<any> {
    const response = await api.post('/neture/operator/registrations/batch', {
      ids,
      action,
      ...(reason ? { reason } : {}),
    });
    return response.data;
  },
};

const operatorContactApi = {
  async list(params: OperatorContactListParams = {}): Promise<{ items: OperatorContactMessage[]; pagination: OperatorContactPagination } | null> {
    try {
      const qs = new URLSearchParams();
      if (params.contactType) qs.set('contactType', params.contactType);
      if (params.status) qs.set('status', params.status);
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      const suffix = qs.toString() ? `?${qs}` : '';
      const response = await api.get(`/neture/operator/contact-messages${suffix}`);
      return response.data?.data ?? null;
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Operator Contact API] Failed to list:', error);
      if ((error as any)?.response?.status === 404) return null;
      throw error;
    }
  },

  /** Confirm exactly one selected new inquiry, preserving its notes and optimistic version. */
  async markRead(item: Pick<OperatorContactMessage, 'id' | 'updatedAt'>): Promise<{ skipped: boolean }> {
    const path = `/neture/operator/contact-messages/${encodeURIComponent(item.id)}`;
    const response = await api.get(path);
    const detail = response.data?.data;
    if (response.data?.success !== true || !detail || detail.id !== item.id) throw new Error('문의 상세를 확인하지 못했습니다.');
    if (detail.status !== 'new') return { skipped: true };
    if (typeof item.updatedAt !== 'string' || detail.updatedAt !== item.updatedAt) throw new Error('다른 운영자가 수정한 문의입니다. 목록을 새로고침한 뒤 다시 선택해 주세요.');
    const saved = await api.patch(path, { status: 'in_progress', adminNotes: detail.adminNotes ?? '', expectedUpdatedAt: item.updatedAt });
    if (saved.data?.success !== true) throw new Error('문의 확인을 저장하지 못했습니다.');
    return { skipped: false };
  },

  /** supplier/partner 유형 문의 일괄 mark-read (status='new' → 'in_progress'). */
  async bulkMarkRead(): Promise<{ updated: number; scope: string[] } | null> {
    try {
      const response = await api.post('/neture/operator/actions/execute/inquiries-mark-read');
      return response.data?.data ?? null;
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Operator Contact API] Failed to mark-read:', error);
      if ((error as any)?.response?.status === 404) return null;
      throw error;
    }
  },
};


return {operatorRegistrationApi, operatorContactApi};
}
