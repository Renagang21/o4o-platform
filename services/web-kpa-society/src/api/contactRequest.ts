/**
 * Contact Request API Client
 *
 * WO-O4O-KPA-CONTACT-FORM-WORKFLOW-V1
 */

import { apiClient } from './client';

export type ContactRequestType = 'partner' | 'education';

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
  status: string;
}

export const contactRequestApi = {
  /** POST /api/v1/kpa/contact-requests — 공개 */
  submit: (payload: ContactRequestPayload) =>
    apiClient.post<{ success: true; data: ContactRequestResult }>(
      '/contact-requests',
      payload,
    ),
};
