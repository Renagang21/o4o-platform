/**
 * Neture 공개 정책 문서 페이지 (이용약관 / 개인정보처리방침)
 *
 * WO-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1
 *
 * 종전 `/terms`·`/privacy` 는 CMS(`GET /api/v1/cms/public/page/:slug`) 를 읽었으나
 * 해당 CMS 라우터는 프로덕션에 **마운트되어 있지 않아 항상 404** → 공개 화면이 영구히
 * "해당 페이지를 준비 중입니다" 를 노출하고 있었다(WO §7 dead surface).
 * GlycoPharm / K-Cosmetics / KPA / Pharmacy-Hub 와 같은 canonical 소스로 정렬한다.
 *
 * backend: GET /api/v1/public/services/neture/policies/:documentType (published only).
 * 문서 미게시 시에는 공통 뷰어의 중립 empty 상태를 쓴다 — 가짜 약관 문구를 만들지 않는다.
 */

import {
  PolicyDocumentViewer,
  type PolicyDocumentDto,
} from '@o4o/shared-space-ui';
import { api } from '../../lib/apiClient';

const SERVICE_KEY = 'neture';

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
