/**
 * K-Cosmetics Admin — 문의 설정 wrapper
 *
 * WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1
 *
 * 공통 컴포넌트 `@o4o/operator-core-ui/modules/service-contact-settings` 에
 * serviceKey('k-cosmetics') + authClient api 어댑터를 주입.
 * backend: /api/v1/admin/services/k-cosmetics/contact-settings.
 */

import {
  ServiceContactSettingsPage as SharedServiceContactSettingsPage,
  type ContactSettingsApi,
} from '@o4o/operator-core-ui/modules/service-contact-settings';
import { api } from '../../lib/apiClient';

const SERVICE_KEY = 'k-cosmetics';

function toError(err: any): Error {
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.error?.message || err?.response?.data?.error;
  if (status === 401) return new Error('로그인이 필요합니다.');
  if (status === 403) return new Error('이 서비스 설정을 수정할 권한이 없습니다.');
  if (status === 400 || status === 422) return new Error(typeof serverMsg === 'string' ? serverMsg : '입력값을 확인해 주세요.');
  return new Error(typeof serverMsg === 'string' ? serverMsg : '서버 오류가 발생했습니다.');
}

const contactSettingsApi: ContactSettingsApi = {
  async getSettings(serviceKey) {
    try {
      const res = await api.get(`/admin/services/${serviceKey}/contact-settings`);
      return res.data?.data;
    } catch (err) { throw toError(err); }
  },
  async updateSettings(serviceKey, payload) {
    try {
      const res = await api.put(`/admin/services/${serviceKey}/contact-settings`, payload);
      return res.data?.data;
    } catch (err) { throw toError(err); }
  },
};

export default function ServiceContactSettingsPage() {
  return <SharedServiceContactSettingsPage serviceKey={SERVICE_KEY} api={contactSettingsApi} />;
}
