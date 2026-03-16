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
