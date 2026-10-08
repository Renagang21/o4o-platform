import { ContactInquiryAdminPage, type ContactInquiryApi } from '@o4o/operator-core-ui/modules/contact-inquiry';
import { api } from '../../lib/apiClient';

const BASE = '/admin/services/lecture/contact-inquiries';
const contactApi: ContactInquiryApi = {
  list: async (_key, params) => (await api.get(BASE, { params })).data.data,
  getDetail: async (_key, id) => (await api.get(`${BASE}/${id}`)).data.data,
  setStatus: async (_key, id, status) => (await api.patch(`${BASE}/${id}/status`, { status })).data.data,
  setNote: async (_key, id, internalNote) => (await api.patch(`${BASE}/${id}/note`, { internalNote })).data.data,
};

export default function OperatorContactPage() {
  return <ContactInquiryAdminPage serviceKey="lecture" api={contactApi} title="강의 서비스 문의 관리"
    inquiryTypeLabels={{ account_permission: '이용 신청', partnership: '강의 개설 · 협업', technical_issue: '오류 신고', other: '기타' }} />;
}
