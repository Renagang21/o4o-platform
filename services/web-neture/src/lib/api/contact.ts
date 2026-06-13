/**
 * Contact API — WO-O4O-NETURE-CONTACT-PAGE-V1
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 */

import { api } from './client.js';

export interface ContactFormData {
  contactType: 'supplier' | 'partner' | 'service' | 'other';
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  /** 개인정보 수집·이용 동의 (WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1) — 미동의 시 backend 400. */
  privacyConsent: boolean;
}

export interface ContactSubmitResult {
  success: boolean;
  data?: { id: string; message: string };
  error?: { code: string; message: string };
}

export const contactApi = {
  async submitContactMessage(data: ContactFormData): Promise<ContactSubmitResult> {
    const response = await api.post('/neture/contact', data);
    return response.data;
  },
};
