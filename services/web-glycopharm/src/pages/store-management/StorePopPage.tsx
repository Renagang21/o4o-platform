/**
 * StorePopPage — GlycoPharm POP 생성 (thin adapter)
 *
 * WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1:
 *   화면 본체·상태 모델·helper 는 `@o4o/store-ui-core` 의 StorePopComposerView 로 이관했다.
 *   본 파일에는 서비스 고유값만 남는다 — accent · 약국 문구 · 템플릿 라벨 · API endpoint(/glycopharm).
 *   route · router state 계약 · generate payload · PDF 처리 방식 · 사용자 동선은 종전과 동일하다.
 *
 * 이전 WO 계약 유지:
 *   - WO-O4O-GLYCOPHARM-POP-STORE-EXECUTION-V1
 *   - WO-O4O-GP-KCOS-POP-QR-BLOG-AI-ENTRY-REMOVE-V1: 페이지형 AI 문구 생성 진입 없음
 *   - WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1: origin='local' 항목을 org-scoped 단건 API 로 재조회
 *   - WO-O4O-POP-SAVE-AS-CONTENT-V1 / WO-O4O-POP-QR-SELECTOR-GP-KCOS-PARITY-V1
 *
 * 진입점: /store → StoreMainPage QUICK_ACTIONS → /store/marketing/pop
 * 권한: PHARMACIST (StoreLayoutWrapper ProtectedRoute)
 */

import { getAccessToken } from '@o4o/auth-client';
import { toast } from '@o4o/error-handling';
import {
  StorePopComposerView,
  type PopComposerApi,
  type PopComposerLabels,
  type PopTemplateOption,
} from '@o4o/store-ui-core';
import { api, API_BASE_URL } from '@/lib/apiClient';
import { createStaffPopPost } from '@/api/popStaff';
import { getStoreSlug } from '@/api/storeHub';
import { getStoreQrCodes } from '@/api/storeProductionSources';
import { getLocalProduct } from '@/api/localProducts';

const ACCENT = { color: '#ea580c', softBg: '#fff7ed' };

const TEMPLATES: PopTemplateOption[] = [
  { id: 'pop-modern',       label: '모던',   desc: '헤드라인 강조, 미니멀' },
  { id: 'pop-soft',         label: '소프트', desc: '부드러운 설명형' },
  { id: 'pop-pharmacy-pro', label: '약국 전문형', desc: '전문 약국 스타일' },
];

const LABELS: PopComposerLabels = {
  headerTitle: 'POP 생성',
  headerDescription: '공급자 자료와 AI 문구를 결합하여 약국 POP PDF를 생성합니다',
  storeMissingError: '약국 정보를 확인할 수 없습니다',
  saveContentSuccess: 'POP 콘텐츠로 저장되었습니다. 내 약국 POP에서 다시 수정·제작할 수 있습니다.',
  saveContentButtonTitle: 'POP 콘텐츠로 저장 (내 약국 POP 에서 재편집·재제작)',
  saveContentSectionComment: '내 약국 POP',
};

const popApi: PopComposerApi = {
  fetchSupplierItems: async () => {
    const res = await api.get<{ success: boolean; data: any[] }>(
      '/glycopharm/pharmacy/pop/source/supplier-items',
    );
    return (res as any).data?.data ?? [];
  },
  fetchLocalProduct: (id) => getLocalProduct(id) as any,
  fetchQrCodes: () => getStoreQrCodes({ limit: 100 }) as any,
  generate: (payload) => {
    const token = getAccessToken();
    return fetch(`${API_BASE_URL}/api/v1/glycopharm/pharmacy/pop/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
  },
  getStoreSlug: () => getStoreSlug(),
  createPopContent: (slug, body) => createStaffPopPost(slug, body),
};

export default function StorePopPage() {
  return (
    <StorePopComposerView
      accent={ACCENT}
      labels={LABELS}
      templates={TEMPLATES}
      api={popApi}
      notify={toast}
    />
  );
}
