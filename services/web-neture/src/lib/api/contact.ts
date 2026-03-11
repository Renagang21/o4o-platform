/**
 * Contact API — WO-O4O-NETURE-CONTACT-PAGE-V1
 */

import { API_BASE_URL, fetchWithTimeout } from './client.js';

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
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
