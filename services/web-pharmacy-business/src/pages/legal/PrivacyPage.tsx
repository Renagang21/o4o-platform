/**
 * PrivacyPage - 개인정보처리방침 페이지 (공개)
 *
 * WO-O4O-KPA-POLICY-DOCUMENTS-SERVICE-POLICY-MIGRATION-V1:
 *   표준 소스 service_policy_documents(serviceKey=kpa-society, type='privacy', published) 를 표시.
 *   미게시 시 legacy kpa_legal_documents 로 fallback(전환 안전망). 게시 문서 없으면 중립 empty.
 */

import { LegalDocumentView } from './LegalDocumentView';

export function PrivacyPage() {
  return <LegalDocumentView documentType="privacy" heading="개인정보처리방침" />;
}
