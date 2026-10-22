/**
 * Neture Admin — 서비스 설정(법정정보·약관) wrapper
 *
 * WO-O4O-ADMIN-SERVICE-LEGAL-POLICY-SETTINGS-UI-V1
 *
 * 공통 컴포넌트 `@o4o/operator-core-ui/modules/service-legal` 에 serviceKey('neture') +
 * authClient 기반 api 어댑터를 주입한다. backend 계약:
 * WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1 (/api/v1/admin/services/:serviceKey/*).
 */

import {
  ServiceLegalSettingsPage as SharedServiceLegalSettingsPage,
  type ServiceLegalApi,
} from '@o4o/operator-core-ui/modules/service-legal';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';


/** axios 오류 → 사용자 메시지(권한 우회 없이 상태별 표시). */
function toError(err: any): Error {
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.error?.message || err?.response?.data?.error;
  if (status === 401) return new Error('로그인이 필요합니다.');
  if (status === 403) return new Error('이 서비스 설정을 수정할 권한이 없습니다.');
  if (status === 404) return new Error(typeof serverMsg === 'string' ? serverMsg : '데이터를 찾을 수 없습니다.');
  if (status === 400 || status === 409 || status === 422) return new Error(typeof serverMsg === 'string' ? serverMsg : '입력값을 확인해 주세요.');
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

export default function ServiceLegalSettingsPage({ serviceKey = 'neture' }: { serviceKey?: 'neture' | 'supplier' | 'community' | 'funding' | 'carepharm' }) {
  const { user } = useAuth();
  if (serviceKey === 'carepharm' && !user?.roles?.some(role => ['neture:carepharm_admin', 'neture:admin'].includes(role))) {
    return <p className="p-6" role="alert">CarePharm 약관·법정정보는 담당 관리자가 설정합니다. 공개 약관은 하단 이용약관·개인정보처리방침에서 확인할 수 있습니다.</p>;
  }
  return <>{serviceKey === 'carepharm' && <p className="mx-auto max-w-[920px] px-4 pt-6 text-sm">CarePharm 가입용 이용약관과 개인정보 안내를 새 문서로 작성하고 같은 버전과 시행일로 게시해 주세요. 두 문서가 게시돼야 신규 가입을 신청할 수 있습니다. 공통 계정 약관과 사업 이용 조건은 각각 확인합니다.</p>}<SharedServiceLegalSettingsPage serviceKey={serviceKey} api={legalApi} newPolicyVersion={serviceKey === 'carepharm' ? 2 : 1} /></>;
}
