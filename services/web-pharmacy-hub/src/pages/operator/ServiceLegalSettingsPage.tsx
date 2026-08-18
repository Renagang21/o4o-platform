/**
 * Pharmacy-Hub Operator — 법정정보 설정 wrapper
 *
 * WO-O4O-PHARMACY-HUB-SERVICE-LEGAL-SETTINGS-ADOPTION-V1
 *
 * Neture / GlycoPharm / K-Cosmetics / KPA 와 동일하게 공통 컴포넌트
 * `@o4o/operator-core-ui/modules/service-legal` 에 serviceKey('pharmacy-hub') +
 * authClient 기반 api 어댑터만 주입한다. 전용 대형 페이지를 새로 만들지 않는다.
 *
 * backend 계약: WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1
 *   GET/PUT /api/v1/admin/services/pharmacy-hub/legal-profile
 * 권한: requireServiceLegalScope → PHARMACY_HUB_SCOPE_CONFIG
 *   조회 = pharmacy-hub:operator 이상 / 저장 = pharmacy-hub:admin
 *   (WO-O4O-PHARMACY-HUB-LEGAL-SERVICE-SCOPE-AND-FOOTER-404-FIX-V1 에서 legal scope 연결 완료)
 *
 * 탭 범위: 전체(profile · policies · status).
 *   WO-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1 에서 공개 route
 *   `/terms` · `/privacy` (공통 PolicyDocumentViewer) 가 생겨 게시 문서가 도달 가능해졌으므로,
 *   보류했던 'policies' 탭을 다른 4서비스와 동일하게 연다(enabledTabs 미지정 = 전체).
 */

import {
  ServiceLegalSettingsPage as SharedServiceLegalSettingsPage,
  type ServiceLegalApi,
} from '@o4o/operator-core-ui/modules/service-legal';
import { api } from '../../lib/apiClient';
import { SERVICE_KEY } from '../../config/service';

/** axios 오류 → 사용자 메시지(권한 우회 없이 상태별 표시). */
function toError(err: any): Error {
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.error?.message || err?.response?.data?.error;
  if (status === 401) return new Error('로그인이 필요합니다.');
  if (status === 403) return new Error('이 서비스 설정을 수정할 권한이 없습니다. (저장은 서비스 관리자 권한이 필요합니다)');
  if (status === 404) return new Error(typeof serverMsg === 'string' ? serverMsg : '데이터를 찾을 수 없습니다.');
  if (status === 400 || status === 422) return new Error(typeof serverMsg === 'string' ? serverMsg : '입력값을 확인해 주세요.');
  return new Error(typeof serverMsg === 'string' ? serverMsg : '서버 오류가 발생했습니다.');
}

const legalApi: ServiceLegalApi = {
  async getLegalProfile(serviceKey) {
    try {
      const res = await api.get(`/admin/services/${serviceKey}/legal-profile`);
      return res.data?.data ?? null;
    } catch (err) {
      throw toError(err);
    }
  },
  async updateLegalProfile(serviceKey, payload) {
    try {
      const res = await api.put(`/admin/services/${serviceKey}/legal-profile`, payload);
      return res.data?.data;
    } catch (err) {
      throw toError(err);
    }
  },
  // 아래 정책문서 메서드는 'policies' 탭을 노출하지 않으므로 호출되지 않는다(인터페이스 충족용).
  async listPolicies(serviceKey) {
    try {
      const res = await api.get(`/admin/services/${serviceKey}/policies`);
      return res.data?.data ?? [];
    } catch (err) {
      throw toError(err);
    }
  },
  async createPolicy(serviceKey, payload) {
    try {
      const res = await api.post(`/admin/services/${serviceKey}/policies`, payload);
      return res.data?.data;
    } catch (err) {
      throw toError(err);
    }
  },
  async updatePolicy(serviceKey, id, payload) {
    try {
      const res = await api.put(`/admin/services/${serviceKey}/policies/${id}`, payload);
      return res.data?.data;
    } catch (err) {
      throw toError(err);
    }
  },
  async publishPolicy(serviceKey, id, action) {
    try {
      const res = await api.patch(`/admin/services/${serviceKey}/policies/${id}/publish`, { action });
      return res.data?.data;
    } catch (err) {
      throw toError(err);
    }
  },
};

export default function ServiceLegalSettingsPage() {
  return (
    <SharedServiceLegalSettingsPage
      serviceKey={SERVICE_KEY}
      api={legalApi}
      title="서비스 설정 — 법정정보·약관"
    />
  );
}
