# 운영자 코드 정비 1차 — 공통 회원 조회 분리 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: [전체 TODO](../work-orders/WO-O4O-OPERATOR-CODE-REFINEMENT-TODO-V1.md)

COMPLETED는 이번 조회 분리 작업의 개발·검증 범위다. 1차 전체 정비나 main 병합·배포 완료를 뜻하지 않는다.
종료 범위는 commit/push이며, 실제 대상자 지정·재로그인·접근 검증은 사용자가 진행한다.

## 기준과 결정

- 착수 기준: `origin/main f66ed5f5f8e6198e0043053b24cae6230ffa96cf`.
- 앞서 push된 회원관리 보완·펀딩·소규모 업무 보완 branch를 자동 합치지 않았다.
- 온보딩 skill의 새 worktree 생성 제한과 기존 작업공간 보존을 함께 지키기 위해 별도의 세션 전용 clone/branch에서 작업했다.
- 변경은 읽기 상태와 조회 책임의 이동이다. 상태 변경, 일괄 처리, 권한, serviceKey, API, 외부 props/exports를 바꾸지 않는다.
- 약사회 분회는 작업 대상에서 제외했다. 이번 공통 콘솔의 runtime import도 확인되지 않았다.

## Shared Module Change Verification

### Changed shared module

- Package: `@o4o/operator-core-ui` (source-only, 별도 build script 없음).
- Module: `OperatorMembersConsolePage`.
- Internal hook: `useMembersConsoleQuery` (공개 export 추가 없음).
- Direct consumers: Neture `UsersManagementPage`, KPA-Society `MemberManagementPage`, 공통 `ServiceMembersWorkspace`.
- Indirect consumers: Neture supplier/funding/community `ServiceMembersPage`, 강의 `OperatorMembersPage`.
- Source-path literal 소비처 검사: 과거 기록물·설명 참조만 확인, 살아 있는 raw-source 계약 없음.
- 회원관리 테스트의 기존 정책 계약은 그대로 실행했다.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | route/role/capability 영향 | 검증 방식 | 결과 |
|---|---|---|---|---|---|
| Neture 일반 회원 | 직접 | 읽기 구현 이동 | 계약 유지 | tsc + production build | PASS |
| Neture supplier/funding/community 회원 | 간접 | 동일 공통 workspace | 서비스 원장/권한 유지 | 공통 정책 테스트 + supplier 합성 API browser smoke | PASS |
| 강의 회원 | 간접 | 동일 공통 workspace | operator 업무/admin 민감 처리 경계 유지 | 공통 정책 테스트 + build + lecture 합성 API browser smoke | PASS |
| KPA-Society 약국 사업자 회원 | 직접 | 조회 hook 사용 | 기존 adapter·entity·확장 slot 유지 | tsc + production build | PASS |
| 약사회 분회 | 미확인 소비 없음 | 해당 모듈 runtime import 없음 | 작업 제외 | import census만 확인 | 변경 없음 |
| 전체 관리자 | 해당 회원 콘솔 미사용 | 없음 | 운영자 지정 화면 무변경 | import census | 변경 없음 |

### Route / role / capability check

- 기존 Neture `/operator/members`, `/operator/users`, `/admin/users` 경로와 supplier/funding/community 회원 경로 유지.
- 강의 `/operator/members`, `/operator/members/:id`, KPA `/operator/members` 경로 유지.
- route/menu/role guard/capability map/visibility filter는 수정하지 않음.
- 가입 승인 전용 adapter의 optional stats/listAll 및 list pagination fallback 유지.
- 단건·일괄 처리 이후 기존 fetchUsers/fetchStats 호출 유지.

### 검증 결과

| 검증 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile --offline --store-dir /workspace/.pnpm-store` | PASS, lockfile 변경 없음 |
| `pnpm run build:packages` | PASS |
| `pnpm exec vitest run --config packages/operator-core-ui/vitest.config.mjs` | 7파일·55테스트 PASS |
| 변경 TS/TSX 3파일 eslint `--max-warnings 0` | PASS |
| Neture `tsc --noEmit` + `pnpm --filter @o4o/web-neture build` | PASS |
| KPA-Society `tsc --noEmit` + `pnpm --filter @o4o/web-kpa-society build` | PASS |
| `pnpm --filter lecture-web build` (tsc 포함) | PASS |
| desktop 1440/mobile 390 × supplier/lecture 공통 workspace smoke | 4시나리오 PASS |
| `git diff --check` | PASS |

새 테스트 5개는 상태/검색/선택적 서버 정렬, pending 탭과 pagination fallback,
조회 실패 후 재시도, active+approved/역할/상태 통계, optional 통계 실패와 목록 성공 분리를 검증한다.

최초 전체 테스트는 공통 패키지 산출물 부재로 4 suite가 수집에 실패했다.
공통 패키지 빌드 후 전체 7 suite·55테스트를 다시 실행해 통과했다.
최초 Neture/KPA build filter는 package 이름 불일치로 실행되지 않았으며,
실제 package 이름으로 재실행한 빌드 결과만 PASS로 기록했다.

### Smoke result

합성 API와 실제 공통 컴포넌트/스타일을 사용한 로컬 Chromium 검증이다.
공급자와 강의에 사용되는 `ServiceMembersWorkspace`를 각각 마운트했다.
실서비스 전체 wrapper·인증·운영 데이터 흐름 검증으로 확대 해석하지 않는다.

- 목록 → 상세 → 승인 → 올바른 serviceKey의 PATCH → 목록/통계 재조회 → 활성 회원 일상 행동 확인.
- operator의 민감한 삭제 버튼 비노출.
- 4시나리오 모두 browser page error 없음.
- 실제 계정 지정·재로그인·서비스 접근은 사용자 담당이며 이번 개발 완료의 차단 조건이 아님.

## 동일 범위 재조사와 독립 검토

화면 파일은 1,036→953줄, 화면의 useState 호출은 17→12개로 줄었다.
115줄 내부 hook이 조회 상태·목록·통계·자동 조회를 소유한다.
전체 코드 줄 수 감소가 아닌 책임 분리가 이번 효과다.

이동 전후 조회 callback 본문과 dependency 배열을 대조하고,
기존 호출자가 사용하는 fetchUsers/fetchStats, role/status count, 오류 표시 계약을 재확인했다.
공개 타입·props·exports·API와 회원 쓰기 handler는 그대로다.

남은 사항: 화면은 여전히 크다. URL/필터 상태, 선택, Drawer, 단건/일괄 처리의 분리는 후속 1차 항목이다.
기존 조회의 늦은 응답 처리·통계 재시도 정책은 이번에 변경하지 않았다.
이는 TODO의 후속 조사 대상이며 이번 책임 이동이 모든 비동기 문제를 해결했다는 뜻이 아니다.

## 문서 정합

전체 TODO를 ACTIVE로 작성하고 1차 첫 작업과 남은 항목을 구분했다.
기존 정본·과거 WO/CHECK의 정책 판정은 수정하지 않았다.
회원관리 API의 과거 설명 주석 정정은 API 차수에 남겼다.
