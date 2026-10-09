# 서비스 운영자 지정·서비스별 회원 관리 — 1차 조사

> **상태**: ACTIVE
> **작성일**: 2026-10-09 · **최종 갱신**: 2026-10-09
> **근거 WO/IR**: [초기 정비계획·조사 지시서](../work-orders/WO-O4O-SERVICE-OPERATOR-AND-MEMBERSHIP-INITIAL-PLAN-V1.md)
> **조사 기준**: `19f9338a8f` · `wo/service-operator-membership-plan`
> **검증 범위**: 코드 흐름·기존 mock/contract 테스트. 운영 DB·실계정·브라우저 E2E 미검증.

## 1. 결론

중앙 운영자 지정·편집·해제와 공통 회원관리 화면/API가 이미 존재한다. 전면 재구축보다 경계 정비가 우선이다.
다만 기존 로그인 권한 해제, 회원 유형 변경의 서비스 경계, 명시 서비스 없는 다중 서비스 변경,
공통 계정 수정·재활성화가 초기 목표와 충돌하거나 추가 정책 결정이 필요하다.

공통 회원관리 API는 admin/operator에게 같은 액션을 허용한다. 이를 결함으로 판정하지 않는다.
역할 차이는 아직 미정이며 실제 업무 운영 자료·담당자 확인도 확보하지 못했다.

## 2. 서비스 목록과 식별 기준

출처: `apps/api-server/src/config/service-catalog.ts:137`, `config/operator-role-catalog.ts:23`.
catalog의 존재·joinEnabled=false만으로 은퇴를 판단하지 않았다. operatorWorkspaceEnabled와 명시 은퇴 근거를 함께 확인했다.

| 서비스 키 | 호스트 | 중앙 지정 역할 | 현재 회원 관리 연결 | 판정·주의 |
|---|---|---|---|---|
| neture | neture.co.kr | neture:admin/operator | `/operator/members` → 공통 API, serviceKey=neture | 유지 대상; 대표 홈 로그인 자격과 neture membership은 별개 |
| kpa-society | pharmacy.neture.co.kr | kpa:admin/operator | MemberManagementPage → `/kpa/members` | 유지 대상; 약국 운영 서비스, 분회와 별개. 세미프랜차이즈 접근 자격도 별도 축 |
| pharmacy-hub | pharmacyhub.co.kr | pharmacy-hub:admin/operator | 공통 회원 목록 + 전용 membership 승인 목록 | joinEnabled=false지만 운영 workspace·기존 가입 관리 유지 |
| lecture | study.neture.co.kr | lecture:admin/operator | 공통 API는 허용하나 App.tsx에 서비스 회원 목록 route 없음 | 가입 승인 콘솔을 실제 UI에 연결할지 결정 필요 |
| kpa-branch | kpa.neture.co.kr | kpa-branch:admin만 중앙 지정 | `/admin/service-members` + `/:branchSlug/operator/members` | 서비스 회원과 분회 소속이 별개; 개별 분회 operator는 서비스 관리자가 지정 |
| community | community.neture.co.kr | community:admin만 중앙 지정 | 서비스 공통 API + 개별 community/forum 회원 관리 | 서비스 전역 operator 없음; 개체 운영과 서비스 운영을 구분 |
| supplier | supplier.neture.co.kr | supplier:admin/operator | 공급자 승인·상태 관리 화면; 공통 membership 목록 UI 없음 | 사업자 자격은 organization_members, 서비스 membership과 별개 |
| funding | funding.neture.co.kr | funding:admin/operator | 펀딩 운영 화면; 공통 membership 목록 UI 없음 | 사업 업무와 회원관리 콘솔을 구분 |
| k-cosmetics | retail.neture.co.kr | cosmetics:admin/operator 잔존 | catalog 운영 workspace 닫힘·전용 API mount 제거 | 중복·레거시 후보: 중앙 allowlist에는 아직 지정 가능 역할 존재 |
| cafe24-b2b | neture.co.kr | 없음 | Cafe24 회원 연결 축 | workspace undecided; 일반 운영 서비스로 자동 편입 금지 |

초기 방향의 “각 서비스 admin/operator”와 현재 branch/community의 개체 운영 구조는 같지 않다.
둘에 서비스 전역 operator를 추가할지, 개체 역할을 현행대로 유지할지 사용자 정책 결정이 필요하다.

## 3. 중앙 지정·편집·해제 흐름

- 화면: `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx`.
  행은 사용자 전체가 아니라 role assignment 단위이며 상세·편집·개별/일괄 해제를 제공한다.
- 지정: 후보 검색 → userId·serviceKey·role → `POST /api/v1/admin/operator-assignments`.
  `routes/admin/operator-assignments.routes.ts:13`은 platform:super_admin DB 역할 검사로 제한한다.
  `operator-role-catalog.ts:82`에서 allowlist와 canonical serviceKey 일치를 확인한다.
- 저장: `services/admin/operator-assignment.service.ts:120`의 transaction에서 Google 연결·Demo 보호 확인 후
  roleAssignmentService.assignRole + ensureServiceMembershipsForRoles를 수행한다.
- 편집: 화면 `handleSubmit` → `PUT /admin/users/:id` → AdminUserController.updateUser → applyAdminRoleEdit.
  카탈로그 운영 역할만 차이로 추가·해제하고 카탈로그 밖 역할은 보존한다.
- 해제: `DELETE /admin/users/:userId/role-assignments/:role` → revokeRoleAssignment.
  사용자 삭제 없이 assignment 비활성화, 자기 권한·마지막 관리자 보호와 역할 cache 무효화 경로가 있다.
- 일반 서비스 회원관리의 assignMemberRole/removeMemberRole은 운영 tier를 비중앙 사용자에게 거부한다
  (`MembershipConsoleController.ts:1344`, `:1476`).

**정상 유지 후보:** 중앙 지정 대상 서비스 검증, 운영 tier 중앙 통제, 계정 유지형 해제, catalog 밖 역할 보존.
**중복 후보:** 기존 `POST /admin/users`도 기존 사용자 운영 역할 추가 경로로 남아 있다.
단일 신규 지정 API와 소비처를 추가 확인한 뒤 통합 여부를 결정한다.

## 4. 회원·권한 저장 구조와 작업 영향

`users`는 공통 계정, `service_memberships`는 (userId, serviceKey) unique 서비스 자격,
`role_assignments`는 활성 권한의 정본이다. 분회·커뮤니티 소속과 공급자 조직 권한은 별도 관계다.

| 작업 | 실제 변경 | 초기 목표와의 관계 |
|---|---|---|
| 중앙 지정 | role assignment + membership 없을 때 active 생성 | 기존 membership 상태는 보존하지만 생성 시 role=admin/operator도 membership.role에 저장 |
| 중앙 권한 해제 | assignment 비활성화 | membership은 유지; 회원 자격과 권한 분리 방향에 부합 |
| 공통 승인 | membership active + 필요 역할 + users 계정 활성화 | users 전역 변경은 서비스 단독 관리와 정책 대조 필요 |
| 공통 반려·정지 | 서비스 membership 상태 + 관련 역할 lifecycle | users 전역 정지 없음; 대상 scope가 명확할 때 서비스 범위 유지 |
| 공통 재활성화 | membership·기존 역할 복구 + deleted users 활성화 가능 | 전역 deleted 상태 해제의 서비스 운영자 권한 결정 필요 |
| 공통 탈퇴/삭제 | 명시 서비스 membership 종료·해당 prefix 역할 종료/제거 | users 삭제·비활성화하지 않음; 삭제 API의 serviceKey 필수 확인 |
| 회원 정보 수정 | membership.role + users 이름·전화·businessInfo | 공통 계정 수정과 서비스 회원 수정이 섞여 있음 |

근거: `services/admin/service-membership-ensure.ts:53`,
`services/approval/MembershipApprovalService.ts:465`, `:1003`, `:1399`, `:1480`,
`controllers/operator/MembershipConsoleController.ts:970`.

## 5. 우선 수정 후보와 정책 미정

### F1 — 기존 토큰의 역할 해제·강등 반영 누락: 구현 결함

`common/middleware/auth/authentication.middleware.ts:267`은 JWT roles를 req.user에 넣는다.
`packages/security-core/src/service-scope-guard.ts:59`는 이 배열로 권한을 판정한다.
membership-guard는 DB membership 상태를 확인하지만 역할을 다시 조회하지 않는다(:145~163).
중앙 회수는 membership을 유지하므로, 역할 해제·admin→operator 변경 후 기존 토큰이 남아 있으면
이 guard 계열은 이전 역할을 계속 인정할 수 있다.

공통 회원 API의 requireRole은 DB를 조회하므로 유일 운영 역할이 해제되면 진입이 차단된다.
그러나 A·B 운영 역할을 가진 사용자의 A 역할만 회수하면 B로 공통 gate를 통과하고,
injectServiceScope가 JWT의 A까지 scope로 사용할 수 있다(`utils/serviceScope.ts:84`).
플랫폼 역할 회수 후 다른 역할이 남는 경우의 stale platform bypass도 같은 추가 조사 대상이다.

/auth/me 역할 cache 무효화와 60초 TTL은 UI 재조회에 도움을 주지만, 기존 token의 server 판정 문제를 해결하지 않는다.
근거: `modules/auth/utils/role-cache.ts`, `modules/auth/controllers/auth-account.controller.ts:43`.
판정은 코드 경로에 근거하며 실제 회수·강등 HTTP E2E는 미검증이다.

### F2 — 회원 유형 수정의 대상 서비스 검증 누락: 구현 결함

`MembershipConsoleController.updateMember`는 대상 사용자가 운영자의 어느 서비스에 속하는지만 확인한다(:989).
이후 요청 `membershipServiceKey`를 검증 없이 UPDATE의 service_key로 사용한다(:1014).
A 서비스 운영자가 A·B 회원인 사용자의 B membership 유형을 지정할 수 있는 코드 경로다.
운영 tier 문자열 차단은 있지만 비운영 회원 유형도 서비스 경계를 넘어 변경되면 안 된다.
DB 실행 없이 정적 확인했다. 수정 시 요청 서비스 권한과 대상 membership을 함께 확인해야 한다.

### F3 — 명시 서비스 없는 다중 scope 변경·상세 조회: 구현 결함/레거시 후보

resolveWriteScope(:103)는 serviceKey가 없거나 all이면 운영자의 전체 serviceKeys를 반환한다.
상태 변경·일괄 변경·재활성화에서 같은 사용자의 여러 membership에 적용될 수 있다.
삭제 API는 이미 서비스 한 개를 필수로 요구하지만 이 세 경로는 그렇지 않다.
Neture·Pharmacy-Hub 정상 UI는 serviceKey를 보내므로 정상 UI와 API 계약의 방어 수준을 구분한다.

상세 조회 getMemberDetail(:343)는 query serviceKey 대신 전체 scope를 사용한다.
roleRows는 대상 사용자의 모든 서비스 역할을 조회한다(:378). 회원 목록의 단일 서비스 필터와 다르다.
정보 노출 범위와 “현재 서비스만 관리” 계약을 정리하고, 직접 API 호출에서도 같은 경계를 적용해야 한다.

### F4 — 서비스 회원관리에서 공통 계정 수정·복구: 정책 미정

updateMember(:1031~1101)는 users 이름·전화·businessInfo를 갱신한다.
approveMembership은 users의 pending/inactive/deleted/rejected 등을 active로 바꿀 수 있다(:476).
reactivateMembership은 서비스 운영자도 users.status=deleted를 active로 바꿀 수 있다(:1006).
suspended 상태는 보호하지만, 공통 계정 관리와 서비스 회원 관리의 구분은 완결되지 않았다.
현행 계약·공통 프로필 수정의 실제 업무를 확인해 허용 범위를 결정한다. 단순히 기존 동작을 모두 삭제하지 않는다.

### F5 — 운영 역할이 회원 유형에 재사용됨: 정책 미정/계약 불일치 후보

새 중앙 지정은 membership이 없으면 roleName(admin/operator)을 membership.role에 저장한다.
반면 공통 회원 유형 수정 API는 동일 운영 tier 저장을 INVALID_MEMBERSHIP_ROLE로 거부한다(:1002).
회수 후 membership은 남으므로 회원 유형 표시에 이전 operator가 남는 경우도 조사해야 한다.
신규 role 기반 회원 자동 생성·정지/복구의 실제 필요를 확인한 뒤 참여 유형과 운영 권한의 분리를 구체화한다.

### F6 — 서비스마다 관리 화면·운영자 층위가 다름: 정책 미정

lecture는 운영 UI에 강의·강사·수료 관리만 있고 회원관리 route가 없다(App.tsx:65~71).
supplier/funding/community의 SubdomainOperatorLayoutWrapper는 전용 업무 메뉴만 제공한다.
공통 API 허용과 사용 가능한 회원관리 화면은 같은 것이 아니다.
분회 operator는 서비스 admin이 분회 소속자에게 지정하고(requireBranchScope와 이중 guard),
커뮤니티 개체 운영자는 community_memberships로 관리한다.
서비스 전체 operator와 개체 operator를 한 문자열로 합치지 말고 중앙 지정 범위를 결정한다.

### F7 — 은퇴 역할·문서 잔재: 중복·레거시

k-cosmetics는 운영 workspace가 닫혔지만 중앙 allowlist와 공통 회원 API에는 cosmetics 역할이 남아 있다.
기존 보유자·사용 route·운영 인프라를 추가 확인한 뒤 신규 지정 차단과 잔재 제거를 계획한다.
회원관리·승인 서비스의 일부 주석은 users 전역 삭제·비밀번호 변경 등 이미 바뀐 동작을 설명한다.
문서/주석만으로 현재 실행 동작을 판단하지 않는다.

## 6. 현재 admin/operator 회원관리 권한

| 서비스/경로 | 현재 구분 |
|---|---|
| 공통 `/operator/members` | 같은 allowlist로 조회·수정·승인·반려·정지·복구·삭제 허용; 일반 역할 관리도 같은 gate |
| 운영 tier 부여·회수 | 서비스 admin/operator 모두 거부, 중앙 platform:super_admin만 허용 |
| KPA `/kpa/members` 목록·상태 변경 | requireScope(kpa:operator), admin도 계층으로 허용 |
| Pharmacy-Hub 전용 가입 승인 | operator guard에서 admin/operator 계층 허용 |
| KPA Branch 서비스 가입 승인 | admin 경로; 분회 회원관리와 개별 operator 지정은 별도 층위 |
| Community | 서비스 admin과 개체 membership 운영 권한 구분; 서비스 operator 없음 |

장기 이용 제한 등 새 권한 차이를 확정할 업무 근거는 확보하지 못했다.
이 표는 구현 현황이며 새 정책 권고나 최종 권한표가 아니다.

## 7. 실행 검증과 한계

기존 Jest 테스트 9개 suite, 119개 항목 통과(0 skipped, 0 failed).

- MembershipConsoleController.crossServiceIsolation / deleteScope / roleRevokeSafety
- operator-assignment.service / operator-role-catalog.branch-admin
- admin-role-edit / branch-operator-designation / community-operator-designation
- subdomain-operator-scope.runtime

실행: 저장소 루트에서 기존 설치의 Jest를 사용하고 `--config apps/api-server/jest.config.cjs --runInBand --runTestsByPath`에 위 파일을 지정했다.
worktree에는 의존성을 새로 설치하지 않고 NODE_PATH와 --modulePaths를 기존 node_modules로 지정했다.
테스트는 DB mock 또는 source contract이며 실제 DB/실계정의 지정·해제·상태 변경을 수행하지 않는다.
runner는 저장소 설정의 forceExit=true를 사용했다. 테스트 종료 성공을 서비스 E2E 성공으로 확대하지 않는다.

운영 DB·자격정보·검증 계정이 없고 운영 변경 권한을 요청하지 않았으므로 실제 데이터 건수,
기존 세션 HTTP 거부, desktop/mobile 버튼·API 일치, 실사용 업무·운영 인프라 소비 여부는 미검증이다.
전체 서비스의 모든 별도 endpoint를 전수 감사한 결과도 아니다. 본문에서 확인한 경로와 추가 조사 대상을 구분한다.

## 8. 수정 계획 작성에 넘길 사항

| 순서 | 대상 | 변경 목표 | 추가 확인/정책 결정 |
|---|---|---|---|
| 1 | server 역할 freshness와 scope | 회수·강등 후 기존 token의 권한 차단 | Core/Frozen 소비처, cache·instance 경계 |
| 2 | 회원 유형·상태·상세 scope | 모든 요청에서 서비스 하나를 명시·검증 | 미채택 client 목록, 플랫폼 cross-service 조회 예외 |
| 3 | 공통 계정 수정·활성화 | 서비스 lifecycle과 공통 계정 관리 분리 | 실제 업무 필요·프로필 허용 필드·계정 복구 권한 |
| 4 | 중앙 지정과 membership 관계 | 회원 자격·운영 권한 독립성 일관화 | 초기 생성 참여 유형·기존 비활성 회원 지정 정책 |
| 5 | 서비스별 관리 UI와 역할 | 유지 서비스별 관리 경로 명시 | branch/community의 서비스 operator 정책, supplier/funding 회원 정의 |
| 6 | 잔재 | 은퇴 신규 지정·중복 경로 정리 | cosmetics 실제 소비처·AdminUser 구 지정 API |

추가 조사는 각 항목의 미확인 소비처·현행 계약·실제 업무에 한정한다.
admin/operator 권한 차이와 서비스/개체 역할 정책을 사용자와 결정한 뒤 수정 계획을 확정한다.
이번 조사에서 소스·설정·DB를 수정하지 않았다. 조사 문서만 추가했다.

**문서 정합:** 초기 방향과 branch/community 개체 운영 계약, membership 기반 Operator 식별·role scope의 관계,
승인/재활성화의 공통 계정 쓰기, 은퇴 cosmetics 지정 목록을 후속 정합 대상으로 기록했다. 정본은 변경하지 않았다.
