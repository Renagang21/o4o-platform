# CHECK-O4O-NETURE-LEGACY-ADMIN-OPERATOR-API-RETIREMENT-V1

- 작업: WO-O4O-NETURE-LEGACY-ADMIN-OPERATOR-API-RETIREMENT-V1
- 일자: 2026-08-11
- 판정: **PASS**
- 선행: WO-O4O-MEMBERSHIP-CONSOLE-ROLE-REVOKE-SAFETY-GUARDS-V1 (`c2be1f693`) ·
  WO-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-CACHE-INVALIDATION-V1 (`447f486ca`) ·
  WO-O4O-NETURE-ADMIN-OPERATORS-GUIDE-REPLACE-V1 (`2c3b30358`)

## 1. 목적

소비처가 0이 된 Neture 전용 운영자 관리 프런트 함수와 백엔드 4개 API 를 은퇴하여,
`neture:admin` 이 중앙 정책(플랫폼 관리자 전용 운영자·관리자 부여)을 우회하는 경로를 폐쇄한다.

## 2. 삭제한 백엔드 route (4)

`apps/api-server/src/routes/neture/controllers/neture.controller.ts` 의
`ADMIN: OPERATOR MANAGEMENT` 섹션 전체(약 337줄) 제거. 모두 `requireAuth + requireNetureScope('neture:admin')` 였다.

| Method | Route | 기능 |
|---|---|---|
| POST | `/api/v1/neture/admin/operators` | 운영자 자동판별 등록(신규 user 생성 + role_assignments INSERT/복원 + membership upsert) |
| GET | `/api/v1/neture/admin/operators` | 운영자 목록 |
| PATCH | `/api/v1/neture/admin/operators/:id/deactivate` | 역할 비활성화 |
| PATCH | `/api/v1/neture/admin/operators/:id/reactivate` | 역할 복원 |

함께 제거한 잔여:

- 파일 로컬 helper `upsertNetureMembership` (외부 export·참조 0, POST 경로에서만 사용)
- dead import `hashPassword`
- dead import `isPasswordPolicyCompliant, PASSWORD_POLICY_MESSAGE`

`requireNetureScope` 는 같은 파일의 다른 route 2곳에서 계속 사용하므로 유지했다.

## 3. 삭제한 프런트

- `services/web-neture/src/lib/api/admin.ts` — `adminOperatorApi` 4개 함수, `NetureOperatorInfo`,
  `OperatorActionResult`(이 API 전용 타입) 제거. 자리에 은퇴 사유 주석만 남김.
- `services/web-neture/src/lib/api/index.ts` — `adminOperatorApi` · `type NetureOperatorInfo` re-export 2줄 제거.

## 4. 공용 소비처 조사 결과

| 확인 항목 | 결과 |
|---|---|
| 4개 route 의 호출 계층 | controller 파일 내 inline handler. **service layer 없음** |
| 중앙 `/operators` 가 같은 코드 재사용? | 아니오 — `AdminUserController` + `roleAssignmentService` 별도 경로 |
| 공용 회원 관리(`MembershipConsoleController`) 재사용? | 아니오 |
| Neture 안내 화면·메뉴·회원 완전삭제 차단 안내 의존? | 아니오 (모두 프런트 route `/admin/operators` 링크만 사용) |
| `admin-dashboard.controller.ts:167` quick-action | 프런트 route 링크(`/admin/operators` 안내 화면). API 의존 아님 — 유지 |

## 5. 삭제 후 우회 경로 재확인

`neture:admin` 이 운영자 생성·비활성화·재활성화·역할 부여를 수행할 수 있는 잔여 경로를 재조사했다.

- `service_memberships.role = 'admin' | 'operator'` 를 Neture 에 기록하던 유일한 write 경로가
  삭제된 `upsertNetureMembership` 이었다.
- Neture 가입 신청(`auth-register.controller.ts`)의 허용 신청 role 은 **supplier / partner 뿐**이며
  `admin` / `operator` 는 신청 경로가 없다.
- 따라서 `operator-registration.service.ts:143` 의
  `finalRole = neture:${rawRole}` (rawRole ∈ {admin, operator}) 분기는 **입력 원천이 사라져 도달 불가**가 된다.

**보고(수정하지 않음)**: 위 분기 자체는 코드에 남아 있고, 그 컨트롤러 guard(`requireOperatorOrAdmin`)는
`neture:admin` 을 허용한다. 지금은 도달 불가지만 방어적으로 좁히는 편이 안전하며,
사용자 지시대로 접두 없는 역할 파라미터·비활성 유령 assignment 와 함께 **별도 정합성 작업**으로 분리한다.

## 6. 검증

| 항목 | 결과 |
|---|---|
| `adminOperatorApi` · `NetureOperatorInfo` · `OperatorActionResult` · `upsertNetureMembership` 참조 | **0** |
| 삭제된 4개 URL 문자열 참조 | 소스 0 (주석 provenance 2건은 `(은퇴됨)` 표기) |
| `/admin/operators` 잔존 참조 | 프런트 route·메뉴·안내 화면(정상) + quick-action 링크 |
| api-server `npx tsc --noEmit` | PASS |
| api-server jest (`controllers/admin`, `controllers/operator`) | **8 suites / 118 tests PASS** |
| web-neture `npx tsc --noEmit` · `npm run build` | PASS (`@o4o/ui` dist 재빌드 후. `AccessDenied` 미export 오류는 다른 세션의 진행 중 변경으로 인한 stale dist — 본 WO 무관) |

## 7. 유지한 것

중앙 `/operators` 관리 기능 · Neture `/admin/operators` 안내 화면과 이동 버튼 · 일반 회원 관리 ·
역할 체계 · membership · service credential · 로그인 구조 · DB schema 와 기존 데이터 (migration 없음).

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
(= `operator-registration.service.ts` 역할 승격 분기 + 접두 없는 role 파라미터 + 비활성 유령 assignment 정합성)
