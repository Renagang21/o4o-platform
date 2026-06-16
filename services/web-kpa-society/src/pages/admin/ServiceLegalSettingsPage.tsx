/**
 * KPA Society Admin — 법정정보 설정 wrapper
 *
 * WO-O4O-KPA-ADMIN-SERVICE-LEGAL-SETTINGS-WIRING-V1
 *
 * 공통 컴포넌트 `@o4o/operator-core-ui/modules/service-legal` 에 serviceKey('kpa-society')
 * + coreApiClient 어댑터를 주입한다. backend: /api/v1/admin/services/kpa-society/legal-profile.
 *
 * 범위(중요):
 *   - 법정정보(service_legal_profiles) + 정책문서(service_policy_documents) + 공개 상태 확인 전체 탭 사용.
 *   - WO-O4O-KPA-POLICY-DOCUMENTS-SERVICE-POLICY-MIGRATION-V1: KPA 정책문서 표준 소스를
 *     service_policy_documents 로 전환 → 정책 문서 탭에서 편집/게시하면 공개 /policy·/privacy 에 반영.
 *   - legacy `kpa_legal_documents`/`/operator/legal` 은 보존(전환 안전망)하되 canonical 아님.
 *
 * api: KPA 기본 apiClient 는 /api/v1/kpa prefix 라 공통 admin 엔드포인트에 닿지 못하므로,
 *   prefix 없는 coreApiClient(/api/v1)를 사용한다. (ServiceContactSettingsPage 와 동일 관례)
 */

import {
  ServiceLegalSettingsPage as SharedServiceLegalSettingsPage,
  type ServiceLegalApi,
} from '@o4o/operator-core-ui/modules/service-legal';
import { coreApiClient } from '../../api/client';

const SERVICE_KEY = 'kpa-society';

function toError(err: any): Error {
  const status = err?.status;
  const serverMsg = err?.message;
  if (status === 401) return new Error('로그인이 필요합니다.');
  if (status === 403) return new Error('이 서비스 설정을 수정할 권한이 없습니다.');
  if (status === 404) return new Error(typeof serverMsg === 'string' ? serverMsg : '데이터를 찾을 수 없습니다.');
  if (status === 400 || status === 422) return new Error(typeof serverMsg === 'string' ? serverMsg : '입력값을 확인해 주세요.');
  return new Error(typeof serverMsg === 'string' ? serverMsg : '서버 오류가 발생했습니다.');
}

const legalApi: ServiceLegalApi = {
  async getLegalProfile(serviceKey) {
    try {
      const res = await coreApiClient.get<{ data: any }>(`/admin/services/${serviceKey}/legal-profile`);
      return (res as any)?.data ?? null;
    } catch (err) { throw toError(err); }
  },
  async updateLegalProfile(serviceKey, payload) {
    try {
      const res = await coreApiClient.put<{ data: any }>(`/admin/services/${serviceKey}/legal-profile`, payload);
      return (res as any)?.data;
    } catch (err) { throw toError(err); }
  },
  // 아래 정책문서 메서드는 KPA 에서 정책 문서 탭을 숨기므로 호출되지 않는다(인터페이스 충족용).
  async listPolicies(serviceKey) {
    try {
      const res = await coreApiClient.get<{ data: any[] }>(`/admin/services/${serviceKey}/policies`);
      return (res as any)?.data ?? [];
    } catch (err) { throw toError(err); }
  },
  async createPolicy(serviceKey, payload) {
    try {
      const res = await coreApiClient.post<{ data: any }>(`/admin/services/${serviceKey}/policies`, payload);
      return (res as any)?.data;
    } catch (err) { throw toError(err); }
  },
  async updatePolicy(serviceKey, id, payload) {
    try {
      const res = await coreApiClient.put<{ data: any }>(`/admin/services/${serviceKey}/policies/${id}`, payload);
      return (res as any)?.data;
    } catch (err) { throw toError(err); }
  },
  async publishPolicy(serviceKey, id, action) {
    try {
      const res = await coreApiClient.patch<{ data: any }>(`/admin/services/${serviceKey}/policies/${id}/publish`, { action });
      return (res as any)?.data;
    } catch (err) { throw toError(err); }
  },
};

export default function ServiceLegalSettingsPage() {
  return (
    <div>
      <div
        style={{
          maxWidth: 920,
          margin: '0 auto',
          padding: '16px 16px 0',
          fontSize: 13,
          color: '#64748b',
          lineHeight: 1.6,
        }}
      >
        법정정보와 정책문서(이용약관·개인정보처리방침)는 KPA 공개 푸터 및 <strong>/policy · /privacy</strong> 에
        반영됩니다. 정책 문서는 <strong>정책 문서</strong> 탭에서 작성·게시하세요.
        (기존 운영자 “법률 관리” 화면은 legacy 이며 추후 제거될 수 있습니다.)
      </div>
      <SharedServiceLegalSettingsPage
        serviceKey={SERVICE_KEY}
        api={legalApi}
        title="서비스 설정 — 법정정보·약관"
      />
    </div>
  );
}
