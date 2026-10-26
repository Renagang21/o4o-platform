/**
 * PolicyPage - 이용약관 페이지 (공개)
 *
 * WO-O4O-KPA-POLICY-DOCUMENTS-SERVICE-POLICY-MIGRATION-V1:
 *   표준 소스 service_policy_documents(serviceKey=kpa-society, type='terms', published) 를 표시.
 *   미게시 시 legacy kpa_legal_documents 로 fallback(전환 안전망). 게시 문서 없으면 중립 empty.
 */

import { LegalDocumentView } from './LegalDocumentView';

export function PolicyPage() {
  return <LegalDocumentView documentType="terms" heading="이용약관" />;
}
