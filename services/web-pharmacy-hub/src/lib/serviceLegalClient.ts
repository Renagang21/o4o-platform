/**
 * serviceLegalClient — Pharmacy-Hub service-legal API 어댑터 (SSOT)
 *
 * WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1
 *
 * 기존에는 법정정보 설정 화면 안에 어댑터가 들어 있었다. 관리자 대시보드도 같은
 * endpoint 를 읽어야 하므로(정책 문서 게시 현황) 어댑터를 lib 로 올려 **한 벌만** 둔다.
 *
 * backend 계약: WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1
 *   GET/PUT  /api/v1/admin/services/pharmacy-hub/legal-profile
 *   GET/POST/PUT/PATCH /api/v1/admin/services/pharmacy-hub/policies[/:id][/publish|/lifecycle]
 * 권한: requireServiceLegalScope(PHARMACY_HUB_SCOPE_CONFIG) — 조회 operator 이상 / 저장 admin.
 */

import type { ServiceLegalApi } from '@o4o/operator-core-ui/modules/service-legal';
import { api } from './apiClient';

/** axios 오류 → 사용자 메시지(권한 우회 없이 상태별 표시). */
function toError(err: any): Error {
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.error?.message || err?.response?.data?.error;
  if (status === 401) return new Error('로그인이 필요합니다.');
  if (status === 403) return new Error('이 서비스 설정을 수정할 권한이 없습니다. (저장은 서비스 관리자 권한이 필요합니다)');
  if (status === 404) return new Error(typeof serverMsg === 'string' ? serverMsg : '데이터를 찾을 수 없습니다.');
  if (status === 400 || status === 409 || status === 422) return new Error(typeof serverMsg === 'string' ? serverMsg : '입력값을 확인해 주세요.');
  return new Error(typeof serverMsg === 'string' ? serverMsg : '서버 오류가 발생했습니다.');
}

export const legalApi: ServiceLegalApi = {
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
  async changePolicyLifecycle(serviceKey, id, action) {
    try {
      const res = await api.patch(`/admin/services/${serviceKey}/policies/${id}/lifecycle`, { action });
      return res.data?.data;
    } catch (err) {
      throw toError(err);
    }
  },
};
