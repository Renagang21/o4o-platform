/**
 * StoreQrPage — K-Cosmetics QR 관리
 *
 * WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1
 * WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1:
 *   화면 본체를 @o4o/store-ui-core 의 StoreQrConsoleView 로 이관.
 *   이 파일은 API adapter(prefix `/cosmetics`) + accent + 문구 + template registry 주입만 담는다.
 *   기존 계약(WO-O4O-QR-EDITOR-GP-KCOS-PARITY-V1 편집 모드 포함)은 View 안에서 유지된다.
 *
 * API prefix: /cosmetics (backend: createStoreQrLandingController serviceKey='cosmetics')
 */

import {
  StoreQrConsoleView,
  type StoreQrConsoleApi,
  type StoreQrItem,
  type StoreQrCreateInput,
} from '@o4o/store-ui-core';
import { API_BASE_URL } from '@/lib/apiClient';
import { getAccessToken } from '@o4o/auth-client';
import { findTemplate } from '../../config/productionTemplates';

async function qrFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/cosmetics${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `요청 실패 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const qrApi: StoreQrConsoleApi = {
  list: async () => {
    const res = await qrFetch<{ success: boolean; data: { items: StoreQrItem[] } }>('/pharmacy/qr');
    return res.data?.items ?? [];
  },
  create: async (input: StoreQrCreateInput) => {
    await qrFetch('/pharmacy/qr', { method: 'POST', body: JSON.stringify(input) });
  },
  update: async (id, input) => {
    await qrFetch(`/pharmacy/qr/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  },
  remove: async (id) => {
    await qrFetch(`/pharmacy/qr/${id}`, { method: 'DELETE' });
  },
  downloadImage: async (id) => {
    const token = getAccessToken();
    const res = await fetch(
      `${API_BASE_URL}/api/v1/cosmetics/pharmacy/qr/${id}/image?format=png&size=512`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) throw new Error('이미지 다운로드 실패');
    return res.blob();
  },
};

export default function StoreQrPage() {
  return (
    <StoreQrConsoleView
      api={qrApi}
      theme={{ accent: '#db2777', accentSoft: '#fdf2f8' }}
      labels={{
        subtitlePrefix: '매장 QR 코드 생성 및 관리',
        emptyHint: '새 QR 코드를 만들어 매장 자료, 홈페이지, 이벤트 페이지로 연결하세요',
      }}
      findTemplate={(id) => findTemplate(id) ?? null}
    />
  );
}
