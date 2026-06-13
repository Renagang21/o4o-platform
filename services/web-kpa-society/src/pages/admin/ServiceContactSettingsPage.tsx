/**
 * KPA Society Admin — 문의 설정 wrapper
 *
 * WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1
 *
 * 공통 컴포넌트 `@o4o/operator-core-ui/modules/service-contact-settings` 에
 * serviceKey('kpa-society') + coreApiClient 어댑터를 주입.
 * backend: /api/v1/admin/services/kpa-society/contact-settings.
 *
 * 주의(Option D): KPA 기존 저장소(contact_requests)·공개 submit(/api/v1/kpa/contact-requests)·
 *   운영자 문의 관리(/operator/collaboration-requests) 는 그대로 유지된다.
 *   본 화면은 이메일 알림 수신자·자동 회신 등 "설정"만 관리한다.
 *
 * api: KPA 기본 apiClient 는 /api/v1/kpa prefix 라 공통 admin 엔드포인트에 닿지 못하므로,
 *   prefix 없는 coreApiClient(/api/v1)를 사용한다.
 */

import {
  ServiceContactSettingsPage as SharedServiceContactSettingsPage,
  type ContactSettingsApi,
} from '@o4o/operator-core-ui/modules/service-contact-settings';
import { coreApiClient } from '../../api/client';

const SERVICE_KEY = 'kpa-society';

function toError(err: any): Error {
  const status = err?.status;
  const serverMsg = err?.message;
  if (status === 401) return new Error('로그인이 필요합니다.');
  if (status === 403) return new Error('이 서비스 설정을 수정할 권한이 없습니다.');
  if (status === 400 || status === 422) return new Error(typeof serverMsg === 'string' ? serverMsg : '입력값을 확인해 주세요.');
  return new Error(typeof serverMsg === 'string' ? serverMsg : '서버 오류가 발생했습니다.');
}

const contactSettingsApi: ContactSettingsApi = {
  async getSettings(serviceKey) {
    try {
      const res = await coreApiClient.get<{ data: any }>(`/admin/services/${serviceKey}/contact-settings`);
      return (res as any)?.data;
    } catch (err) { throw toError(err); }
  },
  async updateSettings(serviceKey, payload) {
    try {
      const res = await coreApiClient.put<{ data: any }>(`/admin/services/${serviceKey}/contact-settings`, payload);
      return (res as any)?.data;
    } catch (err) { throw toError(err); }
  },
};

export default function ServiceContactSettingsPage() {
  return <SharedServiceContactSettingsPage serviceKey={SERVICE_KEY} api={contactSettingsApi} />;
}
