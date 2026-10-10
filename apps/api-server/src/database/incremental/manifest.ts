/**
 * Incremental migration manifest
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1,
 *  rolled over by WO-O4O-RETIRED-SERVICE-MIGRATION-HISTORY-SQUASH-AND-BASELINE-FINAL-CLOSURE-V1)
 *
 * This is the ONLY migration list the deploy job (src/migrate.ts) and the TypeORM CLI load.
 * It contains migrations created AFTER the canonical baseline 2026-09-18-id685. The historical
 * migration source files in src/database/migrations/ are frozen by
 * historical-migrations.manifest.json and are never loaded, never replayed and never
 * bulk-inserted into typeorm_migrations. They are not runtime provenance: legacy production
 * history is verified by the ordered history fingerprint in legacy-history-baseline.ts.
 *
 * The 7 incremental migrations of baseline 2026-09-15-id678 were absorbed into baseline
 * 2026-09-18-id685 (their typeorm_migrations rows are part of the legacy history fingerprint;
 * their source files were removed together with the rollover).
 *
 * Adding a migration (enforced by scripts/db/check-migration-contract.mjs in CI):
 *   1. file    src/database/migrations/<epoch13>-<PascalName>.ts     (epoch13 = Date.now(), 13 digits)
 *   2. class   export class <PascalName><epoch13> implements MigrationInterface
 *   3. name    name = '<PascalName><epoch13>'   (identical to the class name)
 *   4. epoch13 > every epoch already in INCREMENTAL_MIGRATIONS (strictly increasing) and
 *      >= INCREMENTAL_MIGRATION_CUTOFF.minimumEpoch13
 *   5. import it here and append it to INCREMENTAL_MIGRATIONS (append only; never reorder)
 *   6. register the resulting expected schema state in expected-schema-states.ts (lockstep)
 * Never rename, renumber or edit an applied migration; never modify typeorm_migrations rows.
 */

import type { MigrationInterface } from 'typeorm';
// WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1 (종료·반환·7일 파기 case SSOT)
import { CreateStoreOwnerTerminationCases1789701000000 } from '../migrations/1789701000000-CreateStoreOwnerTerminationCases.js';
// WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-1 (handoff_tokens: SERVICE / WORKSPACE('store') 두 형태 · CHECK)
import { AlterHandoffTokensTargetWorkspace1789974015939 } from '../migrations/1789974015939-AlterHandoffTokensTargetWorkspace.js';
// WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §8 (operator_invitations)
import { CreateOperatorInvitations1790125106065 } from '../migrations/1790125106065-CreateOperatorInvitations.js';
// WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1 §8·§9 (hospital_devices · hospital_device_enrollment_codes · 해시만)
import { CreateHospitalDeviceTables1790125390245 } from '../migrations/1790125390245-CreateHospitalDeviceTables.js';
// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 §43 Phase B-2 (destructive · 사용자 승인 2026-09-24)
//   service_credentials · password_reset_tokens DROP + users 의 password/재설정/lockout 컬럼 5개 DROP.
//   런타임 의존은 Phase B-1 에서 0 이 됐고(B-1 revision 서빙 상태에서 Google 로그인 회귀 PASS),
//   deploy 는 migration 이 새 revision 보다 먼저 실행되므로 코드 선행이 필수였다.
import { DropLegacyPasswordAuthSchema1790251584623 } from '../migrations/1790251584623-DropLegacyPasswordAuthSchema.js';
import { CreateCommunityDomain1790400000000 } from '../migrations/1790400000000-CreateCommunityDomain.js';
// WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §5 (branch_creation_requests: 분회 개설 신청 축)
import { CreateBranchCreationRequests1790400000001 } from '../migrations/1790400000001-CreateBranchCreationRequests.js';
// WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (service_session_revocations: 서비스 단위 세션 폐기)
import { CreateServiceSessionRevocations1790400000002 } from '../migrations/1790400000002-CreateServiceSessionRevocations.js';
// WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (handoff 원장에 출발 서비스 세대 보관)
import { AlterHandoffTokensSourceSessionEpoch1790400000003 } from '../migrations/1790400000003-AlterHandoffTokensSourceSessionEpoch.js';
// WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2 (이메일·비밀번호 인증 저장 구조 3테이블 · 신규)
import { CreateEmailPasswordAuthTables1790683000000 } from '../migrations/1790683000000-CreateEmailPasswordAuthTables.js';
// WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 최종 보완 1 (handoff 원장에 출발 세션 인증 수단 보관)
import { AddHandoffTokenSourceAuthMethod1790684000000 } from '../migrations/1790684000000-AddHandoffTokenSourceAuthMethod.js';
// WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 Phase B-A (demo_accounts registry)
import { CreateDemoAccounts1790940000000 } from '../migrations/1790940000000-CreateDemoAccounts.js';
// WO-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1 (assistant_tasks + work_run_coordination.task_id)
import { CreateAssistantTasks1791012819443 } from '../migrations/1791012819443-CreateAssistantTasks.js';
// WO-O4O-PERSONAL-ASSISTANT-MEMORY-CLOUD-CONTINUITY-V1 (assistant_procedural_patterns + assistant_run_frames)
import { CreateAssistantProceduralMemory1791100000000 } from '../migrations/1791100000000-CreateAssistantProceduralMemory.js';
// WO-O4O-PERSONAL-ASSISTANT-PHASE-D-EXECUTION-NODE-RUNTIME-STATE-COORDINATION-V1 (local_agent_devices.capabilities)
import { AddLocalAgentDeviceCapabilities1791177033073 } from '../migrations/1791177033073-AddLocalAgentDeviceCapabilities.js';
// WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 (내 매장(약국) 신청 · 세미프랜차이즈 · 복수 공급 제안 · 이벤트 부분 unique)
import { CreateNeturePharmacyCommerce1791200000000 } from '../migrations/1791200000000-CreateNeturePharmacyCommerce.js';
import { AlignSellerRecruitmentApplicationIdentity1791477914134 } from '../migrations/1791477914134-AlignSellerRecruitmentApplicationIdentity.js';

export const INCREMENTAL_MIGRATION_CUTOFF = {
  baselineVersion: '2026-09-18-id685',
  /**
   * Every incremental migration must carry a 13-digit epoch >= this value — one past the epoch of
   * the last migration absorbed into the baseline, so no incremental can sort before the baseline.
   */
  minimumEpoch13: 1789690338676,
} as const;

export type MigrationClass = new () => MigrationInterface;

/** Append only. Order must match ascending epoch. */
import { RepairCanonicalDemoExperience1791501198171 } from '../migrations/1791501198171-RepairCanonicalDemoExperience.js';
import { CreateBrowserSessionRevocations1791509600000 } from '../migrations/1791509600000-CreateBrowserSessionRevocations.js';
import { AllowKakaoHandoffAuthMethod1791527589096 } from '../migrations/1791527589096-AllowKakaoHandoffAuthMethod.js';

import { CreateSocialAuthFlows1791592932097 } from '../migrations/1791592932097-CreateSocialAuthFlows.js';

export const INCREMENTAL_MIGRATIONS: readonly MigrationClass[] = [
  CreateStoreOwnerTerminationCases1789701000000,
  AlterHandoffTokensTargetWorkspace1789974015939,
  CreateOperatorInvitations1790125106065,
  CreateHospitalDeviceTables1790125390245,
  DropLegacyPasswordAuthSchema1790251584623,
  CreateCommunityDomain1790400000000,
  CreateBranchCreationRequests1790400000001,
  CreateServiceSessionRevocations1790400000002,
  AlterHandoffTokensSourceSessionEpoch1790400000003,
  CreateEmailPasswordAuthTables1790683000000,
  AddHandoffTokenSourceAuthMethod1790684000000,
  CreateDemoAccounts1790940000000,
  CreateAssistantTasks1791012819443,
  CreateAssistantProceduralMemory1791100000000,
  AddLocalAgentDeviceCapabilities1791177033073,
  CreateNeturePharmacyCommerce1791200000000,
  AlignSellerRecruitmentApplicationIdentity1791477914134,
  RepairCanonicalDemoExperience1791501198171,
  CreateBrowserSessionRevocations1791509600000,
  AllowKakaoHandoffAuthMethod1791527589096,
  CreateSocialAuthFlows1791592932097,
];

export function incrementalMigrationNames(): string[] {
  // Append-only registry: empty right after a baseline rollover, populated by the next incremental
  // migration. The emptiness is a point-in-time fact, not a reason to drop this read path.
  return INCREMENTAL_MIGRATIONS.map((m) => { // NOSONAR typescript:S4158
    const instance = new m();
    const name = (instance as { name?: string }).name ?? m.name;
    if (name !== m.name) {
      throw new Error(`incremental migration name/class mismatch: name='${name}' class='${m.name}'`);
    }
    return name;
  });
}
