/**
 * K-Cosmetics 공개 정책 문서 페이지 (이용약관 / 개인정보처리방침)
 *
 * WO-O4O-CROSSSERVICE-POLICY-ROUTES-V1
 *
 * 공통 `PolicyDocumentViewer`(@o4o/shared-space-ui)에 serviceKey('k-cosmetics' canonical) +
 * public API loader 를 주입. Admin 에서 게시한 published 문서만 표시(미게시 → 중립 empty).
 * backend: GET /api/v1/public/services/k-cosmetics/policies/:documentType.
 */

import {
  PolicyDocumentViewer,
  type PolicyDocumentDto,
} from '@o4o/shared-space-ui';
import { api } from '../../lib/apiClient';

const SERVICE_KEY = 'k-cosmetics';

/** public 정책 문서 조회. 미게시/없음(404) → null. 그 외 오류는 throw. */
async function loadPolicy(serviceKey: string, documentType: string): Promise<PolicyDocumentDto | null> {
  try {
    const res = await api.get(`/public/services/${serviceKey}/policies/${documentType}`);
    return res.data?.data ?? null;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export function TermsPage() {
  return <PolicyDocumentViewer serviceKey={SERVICE_KEY} documentType="terms" heading="이용약관" loadPolicy={loadPolicy} />;
}

export function PrivacyPage() {
  return <PolicyDocumentViewer serviceKey={SERVICE_KEY} documentType="privacy" heading="개인정보처리방침" loadPolicy={loadPolicy} />;
}
