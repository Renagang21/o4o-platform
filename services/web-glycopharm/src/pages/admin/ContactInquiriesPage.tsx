/**
 * GlycoPharm Admin — 문의 관리 wrapper
 *
 * WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1
 *
 * 공통 컴포넌트 `@o4o/operator-core-ui/modules/contact-inquiry` 에 serviceKey('glycopharm') +
 * authClient api 어댑터를 주입. backend: /api/v1/admin/services/glycopharm/contact-inquiries.
 */

import {
  ContactInquiryAdminPage,
  type ContactInquiryApi,
} from '@o4o/operator-core-ui/modules/contact-inquiry';
import { api } from '../../lib/apiClient';

const GP_TYPE_LABELS: Record<string, string> = {
  service_usage: '서비스 이용 문의',
  account_permission: '약국 가입/권한 문의',
  partnership: '공급·제휴 문의',
  technical_issue: '오류 신고',
  other: '기타 문의',
};

function toError(err: any): Error {
  const status = err?.response?.status;
  const msg = err?.response?.data?.error?.message;
  if (status === 401) return new Error('로그인이 필요합니다.');
  if (status === 403) return new Error('문의를 조회·처리할 권한이 없습니다.');
  return new Error(typeof msg === 'string' ? msg : '요청 처리 중 오류가 발생했습니다.');
}

const inquiryApi: ContactInquiryApi = {
  async list(serviceKey, params) {
    try {
      const res = await api.get(`/admin/services/${serviceKey}/contact-inquiries`, { params });
      return res.data?.data;
    } catch (err) { throw toError(err); }
  },
  async getDetail(serviceKey, id) {
    try {
      const res = await api.get(`/admin/services/${serviceKey}/contact-inquiries/${id}`);
      return res.data?.data;
    } catch (err) { throw toError(err); }
  },
  async setStatus(serviceKey, id, status) {
    try {
      const res = await api.patch(`/admin/services/${serviceKey}/contact-inquiries/${id}/status`, { status });
      return res.data?.data;
    } catch (err) { throw toError(err); }
  },
  async setNote(serviceKey, id, internalNote) {
    try {
      const res = await api.patch(`/admin/services/${serviceKey}/contact-inquiries/${id}/note`, { internalNote });
      return res.data?.data;
    } catch (err) { throw toError(err); }
  },
};

export default function ContactInquiriesPage() {
  return <ContactInquiryAdminPage serviceKey="glycopharm" api={inquiryApi} inquiryTypeLabels={GP_TYPE_LABELS} />;
}
