/**
 * O4O Partner(`partner-support`) 운영자 경계 — `partner-support:admin` ⊃ `partner-support:operator`.
 *
 * TODO-O4O-LEGAL-BASIC-DOCUMENTS-ADMIN-V1 3단계: Partner 법적 문서(이용약관 · 개인정보 안내)를
 * 공통 법적 문서 편집기에서 다루기 위해 다른 서브도메인 서비스와 같은 구성(createSubdomainOperatorScope)을 쓴다.
 * 중앙 운영 서비스(CENTRAL_OPERATION_SERVICES)이므로 중앙 메뉴 위임도 그대로 적용된다.
 */
import { createSubdomainOperatorScope } from './subdomain-operator-scope.js';

const { config, guard } = createSubdomainOperatorScope('partner-support');

export const PARTNER_SUPPORT_SCOPE_CONFIG = config;
export const requirePartnerSupportScope = guard;
