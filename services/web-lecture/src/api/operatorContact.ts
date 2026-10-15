import type { ContactInquiryApi } from '@o4o/operator-core-ui/modules/contact-inquiry';
import { api } from '../lib/apiClient';

const BASE = '/admin/services/lecture/contact-inquiries';
/** The shared page owns editing; this adapter fixes every request to lecture. */
export const lectureContactApi: ContactInquiryApi = {
  list: async (_key, params) => (await api.get(BASE, { params })).data.data,
  getDetail: async (_key, id) => (await api.get(`${BASE}/${id}`)).data.data,
  setStatus: async (_key, id, status) => (await api.patch(`${BASE}/${id}/status`, { status })).data.data,
  setNote: async (_key, id, internalNote) => (await api.patch(`${BASE}/${id}/note`, { internalNote })).data.data,
};
