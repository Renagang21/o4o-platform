/**
 * Pharmacy-Hub 공개 정책 문서 페이지 (이용약관 / 개인정보처리방침)
 *
 * WO-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1
 *
 * GlycoPharm / K-Cosmetics 와 동일한 공통 `PolicyDocumentViewer`(@o4o/shared-space-ui) 소비.
 * serviceKey('pharmacy-hub' canonical) + public API loader 만 주입한다 — 화면을 복사하지 않는다.
 * backend: GET /api/v1/public/services/pharmacy-hub/policies/:documentType (published only).
 *
 * 이 route 가 생김으로써 운영자 법정정보 설정의 `policies` 탭을 활성화할 수 있다
 * (게시한 문서가 도달 가능한 공개 페이지를 갖는다 — 데드링크 0).
 */

import {
  PolicyDocumentViewer,
  type PolicyDocumentDto,
} from '@o4o/shared-space-ui';
import { api } from '../../lib/apiClient';
import { SERVICE_KEY } from '../../config/service';

/** public 정책 문서 조회. 미게시/없음(404) → null. 그 외 오류는 throw(viewer 가 error 상태 표시). */
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
