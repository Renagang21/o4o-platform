/**
 * Supplier Content Handoff Targets — Supplier → Service Operator 제공 대상 서비스
 *
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1 (2026-09-16)
 *
 * ROLE-WORKSPACE-ARCHITECTURE §2-1 의 두 번째 공식 경로 `Supplier → Service Operator` 에서
 * 공급자가 고를 수 있는 "Service" 의 단일 판정 지점.
 *
 * 판정 규칙 (WO §10 — Service Tenant Foundation 의 canonical identity/metadata 재사용):
 *   1. `O4O_SERVICES` 에 실제 등록된 Service Identity 여야 한다 (별칭·임의 키 불가).
 *   2. `workspace.operatorWorkspaceEnabled === true` — 받아서 검토·수정·발행할 운영자 업무공간이 있어야 한다.
 *   3. `workspace.workspaceMode === 'standard'` — 매장 사업 서비스(Store Workspace 보유)여야 제공 경로가 성립한다.
 *      · `neture`(special) 는 공급자 자신의 서비스이므로 제외.
 *      · `kpa-branch`(none) · `cafe24-b2b`(undecided) 는 자동 제외 — 임의 포함 금지 (WO §10).
 *
 * 이 파일은 서비스를 하드코딩하지 않는다. 카탈로그 metadata 가 바뀌면 대상도 함께 바뀐다.
 *
 * cms 물리 serviceKey 매핑:
 *   KPA 매장 HUB 의 CMS 소비 지점은 serviceKey='kpa' 정확일치로 조회한다
 *   (routes/kpa/services/supplier-content.service.ts 의 SERVICE_KEY 주석 참조). canonical `kpa-society` 로
 *   기록하면 승인 후에도 HUB 에 나타나지 않으므로 이 표로 물리 키를 정한다. 그 외 서비스는 canonical 키 그대로.
 */

import { O4O_SERVICES, type O4OService } from '../../../config/service-catalog.js';

export interface SupplierContentHandoffTarget {
  /** canonical service key (service-catalog) */
  key: string;
  name: string;
  nameKo: string;
  /** cms_contents."serviceKey" 에 기록되는 물리 키 */
  cmsServiceKey: string;
}

const CMS_SERVICE_KEY_OVERRIDE: Readonly<Record<string, string>> = Object.freeze({
  'kpa-society': 'kpa',
});

export function isSupplierContentHandoffTarget(service: O4OService | undefined): boolean {
  if (!service) return false;
  const ws = service.workspace;
  return ws.operatorWorkspaceEnabled === true && ws.workspaceMode === 'standard';
}

export function toCmsServiceKey(canonicalKey: string): string {
  return CMS_SERVICE_KEY_OVERRIDE[canonicalKey] ?? canonicalKey;
}

/** 공급자가 콘텐츠를 제공할 수 있는 서비스 목록 (카탈로그 순서 유지) */
export function listSupplierContentHandoffTargets(): SupplierContentHandoffTarget[] {
  return O4O_SERVICES.filter(isSupplierContentHandoffTarget).map((s) => ({
    key: s.key,
    name: s.name,
    nameKo: s.nameKo ?? s.name,
    cmsServiceKey: toCmsServiceKey(s.key),
  }));
}

export function getSupplierContentHandoffTarget(key: string): SupplierContentHandoffTarget | undefined {
  return listSupplierContentHandoffTargets().find((t) => t.key === key);
}
