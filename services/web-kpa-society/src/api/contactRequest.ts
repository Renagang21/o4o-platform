/**
 * Contact Request API Client
 *
 * WO-O4O-KPA-CONTACT-FORM-WORKFLOW-V1
 * WO-O4O-KPA-OPERATOR-COLLABORATION-INBOX-V1
 */

import { apiClient } from './client';

export type ContactRequestType = 'partner' | 'education';
export type ContactRequestStatus = 'pending' | 'reviewing' | 'done';

export interface ContactRequestPayload {
  type: ContactRequestType;
  name: string;
  email: string;
  phone?: string;
  organization_name?: string;
  subject?: string;
  message: string;
}

export interface ContactRequestResult {
  id: string;
  status: ContactRequestStatus;
}

export interface ContactRequestItem {
  id: string;
  type: ContactRequestType;
  organization_name: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: ContactRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CollaborationRequestListResponse {
  success: true;
  data: {
    items: ContactRequestItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const contactRequestApi = {
  /** POST /api/v1/kpa/contact-requests — 공개 */
  submit: (payload: ContactRequestPayload) =>
    apiClient.post<{ success: true; data: ContactRequestResult }>(
      '/contact-requests',
      payload,
    ),
};

export const collaborationRequestApi = {
  /** GET /api/v1/kpa/operator/contact-requests — kpa:operator+ */
  list: (params?: { page?: number; limit?: number; status?: string; type?: string }) =>
    apiClient.get<CollaborationRequestListResponse>('/operator/contact-requests', params as Record<string, string | number | boolean | undefined>),

  /** PATCH /api/v1/kpa/operator/contact-requests/:id/status — kpa:operator+ */
  updateStatus: (id: string, status: ContactRequestStatus) =>
    apiClient.patch<{ success: true; data: ContactRequestResult }>(
      `/operator/contact-requests/${id}/status`,
      { status },
    ),
};
