# O4O 두 단계 계정 제거 공통 영향 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-12 · **최종 갱신**: 2026-10-12
> **근거 WO/IR**: [Core WO](../work-orders/WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1.md) §10
> **범위**: 코드/격리 합성 검증·PR/main 추적. 운영 DB/GCS 집행·일반 실계정 OAuth 완료 기록이 아니다.

## Shared Module Change Verification

### Changed shared module

- Module: AccountErasureService, MembershipApprovalService의 scoped stop, auth-context의 active CAS.
- Package: apps/api-server와 Admin 공통 계정 관리.
- Direct consumers: 두 DELETE route, platform Admin, Neture 서비스 중지.
- Indirect consumers: 공통 인증을 사용하는 Neture/KPA/K-Cosmetics/GlycoPharm/GlucoseView 및 분회 참조, service membership/개인 파일/공통 DB writers.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | 검증 방식 | 결과 |
|---|---:|---|---|---|
| Admin 두 DELETE/client/공통 계정 UI | 예 | 동일 완료/미완료 결과·status/retry·기본 숨김 | 실제 router+JWT+DB·UI6 tests·Chromium 합성 API | PASS; 실제 OAuth 미실행 |
| Neture scoped stop | 예 | 원장 없는 verified-email 접근도 서비스만 중지 | 격리 DB, 타서비스/전체계정 보존·승인157 tests | PASS |
| 모든 서비스 공통 인증 | 간접 | pending은 접근/발급/refresh/handoff 거절 | 실제 token/session/helper·인증182 tests | PASS; 실제 브라우저/OAuth 미실행 |
| KPA/K-Cosmetics 공통 소비처 | 간접 | 공통 계정·writer fence 영향 | source/schema census·API build·공통 인증 검증 | 전용 UI smoke 미실행; runtime 기본 비활성 |
| GlycoPharm/GlucoseView/My Home | 간접 | 공통 session/user 참조 | 공통 인증·타 origin session 검증 | 사용자 본인 데이터 최종 검증 대기 |
| 분회 참조 | 간접 | 공통 인증/writer, 전용 원장은 미분류 검토 | schema references·기존 API build | 기간 확정/전용 구현/배포 없음 |
| business/forum/shared 파일 | 예 | 무검토 CASCADE/삭제 성공 금지 | synthetic residual/타인 보존·ownership/generation | PASS; domain/파일 전수 handler 미완료 |
| 기존 retention job6 targets | 아니오 | community live 자동파기 추가 없음 | import/registration 확인 | 변경 없음; 새 maintenance 기본 dry-run |

### Route / role / capability check

- Route existence: 기존 두 DELETE 유지, Admin erasure-capabilities/status/retry 추가. 신규 프론트 route/menu 없음.
- Role guard: authenticate+현재 DB platform:super_admin 및 기존 Google 경계 유지. Operator에게 전체 삭제 권한 부여 없음.
- Capability map: 공통 메뉴 map 변경 없음. 현재 Admin role+서버 enabled=true일 때만 control 표시.
- Visibility/filter: feature 기본 off; Demo/super admin 서버 보호. role revoke는 기존 독립 flow 유지.
- Empty group/block removal: 해당 없음.

### Smoke result

- Admin: Chromium1440/375/320, 합성 API에서 incomplete→상태 확인→confirmed, 가로 넘침 없음; 실계정 사용 없음.
- KPA: 공통 source/schema/token 검증; 서비스 UI 사용자 smoke 대기.
- K-Cosmetics: 공통 source/token 검증; 서비스 UI 사용자 smoke 대기.
- Neture: scoped stop 실제 격리 DB PASS; 실제 Google/Kakao·공급자/내 매장 사용자 smoke 대기.

## 검증 증거와 한계

격리 PostgreSQL19, 승인157, 인증182, Admin UI6, 설계11 tests PASS. API build·Admin typecheck/build·migration contract21 checks PASS. 새 DB의 정식 baseline→23 migration runner 최종 schema assertion PASS (`f1ff5cc8f6f6aec9eeb1bc793021ff02b32a0fa613cac5ae12b255f42867612c`,6613 lines). 상세 검증 대상/운영 미확인 항목은 WO §10.2~§10.3을 따른다. storage SDK mock4 tests도 PASS. 실제 GCS가 아닌 mock 검증이다. PR CI는 아래 통합 기록에 추가한다.

실계정/운영 DB/실제 GCS 데이터 테스트0. 새 기능은 기본 비활성이고 운영 migration·전수 개인 파일 inventory·법정1/2년 근거·writer 규모·외부 upload/orphan/버전/백업 검증 없이는 활성화하지 않는다. 기존 문서 제안의 전수 handler/자동 backoff/producer 계약이 모두 완료됐다고 판정하지 않는다.

## 통합·Delivery 추적

- Base: 시작 시 최신 origin/main `63653694b3bc35b4d127541fafb76f021df1bf68`.
- Branch: `wo/integrated-account-erasure-contract` (기존 통합 WO의 후속 phase).
- Ruleset 조회: main은 PR·CI Gate 필수, human approval0. bypass를 사용하지 않는다.
- PR/main/post-merge: 진행 중. required CI와 Codex blocker/미해결 스레드를 확인한 뒤 정상 병합한다.
- Deployment: MANUAL/GATED 예상. migration 포함 promote는 AGENTS §4-1(f)/§5의 별도 운영 DDL 실행 승인 전 dispatch하지 않는다.
- Worktree: KEEP — 운영 검증·법률 시행·마지막 사용자 테스트 잔여.

문서 정합: 승인 전 조사 기록을 삭제하지 않고 WO §10에 실제 구현/제한을 추가했다. #501/#498/#500의 기존 완료를 되돌리지 않으며 분회 보존기간과 새 법률 본문 시행을 추정하지 않는다.

## 격리 검증 재현 계약

integration suite는 명시적 `O4O_ERASURE_TEST_PORT=55469`에서만 실행한다. loopback의 전용 disposable PostgreSQL cluster와 `o4o_erasure_fixture` DB를 준비하고 정식 baseline/migrate runner로 schema를 적용한 뒤 실행한다. suite의 TRUNCATE는 해당 fixture 전용이며 운영/staging DB에 연결하지 않는다. 일반 CI에서는 DB fixture 없이 skip되므로 위 실제 로컬19개 실행 증거와 구분한다. storage/unit 검증은 DB 없이 실행된다.

```bash
pnpm --filter @o4o/api-server exec jest --runInBand --runTestsByPath src/services/privacy/__tests__/account-erasure.storage.test.ts
O4O_ERASURE_TEST_PORT=55469 pnpm --filter @o4o/api-server exec jest --runInBand --runTestsByPath src/services/privacy/__tests__/account-erasure.integration.test.ts
pnpm --filter @o4o/admin-dashboard exec vitest run src/pages/platform/account-governance/AccountErasureControls.test.tsx
node scripts/db/check-migration-contract.mjs
```

재시도 권한 회수 회귀 PASS: 준비·파일 단계·최종 DB commit에서 현재 platform super admin을 재확인한다. 회수된 권한의 retry는403이며 operation을 재분류/수정하지 않는다. 최종 격리 DB19개+storage mock4개=23 tests PASS.
