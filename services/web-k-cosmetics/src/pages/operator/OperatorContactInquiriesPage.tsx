/**
 * K-Cosmetics Operator — 문의 관리 wrapper
 *
 * WO-O4O-KCOS-OPERATOR-CONTACT-MANAGEMENT-MIGRATION-V1
 *
 * 문의 처리(목록·상세·상태 변경·메모)는 operator 업무다. 공통 컴포넌트
 * `@o4o/operator-core-ui/modules/contact-inquiry` 에 serviceKey('k-cosmetics') +
 * authClient api 어댑터를 주입. backend: /api/v1/admin/services/k-cosmetics/contact-inquiries.
 *
 * 권한: 해당 backend 가드는 본 WO 에서 requireServiceLegalScope('operator') 로 조정됨.
 *   KCos scopeRoleMapping('cosmetics:operator' → ['cosmetics:operator','cosmetics:admin']) 상
 *   operator/admin 모두 통과한다 (GlycoPharm 의 frontend-only 패턴과 달리 backend 1라인 조정 필요했음).
 *
 * admin 의존 제거: admin 의 ContactInquiriesPage 를 import 하지 않고 operator 가 어댑터를 자체 보유한다.
 *   후속 WO 에서 admin 문의 관리 메뉴/페이지를 제거해도 operator 는 영향 없다.
 */

import {
  ContactInquiryAdminPage,
  type ContactInquiryApi,
} from '@o4o/operator-core-ui/modules/contact-inquiry';
import { api } from '../../lib/apiClient';

const KCOS_TYPE_LABELS: Record<string, string> = {
  service_usage: '서비스 이용 문의',
  account_permission: '매장 가입/권한 문의',
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

export default function OperatorContactInquiriesPage() {
  return <ContactInquiryAdminPage serviceKey="k-cosmetics" api={inquiryApi} inquiryTypeLabels={KCOS_TYPE_LABELS} />;
}
