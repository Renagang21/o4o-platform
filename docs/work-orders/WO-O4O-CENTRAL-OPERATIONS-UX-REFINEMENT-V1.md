# O4O 중앙 운영 홈·표준 리스트·알림 정비

> **상태**: ACTIVE
> **작성일**: 2026-10-29 (Asia/Seoul)
> **근거**: 사용자의 `/operations` 가독성·체크 선택 후 상단 작업·운영자 알림 요구, 서비스별 사이드바 접기, 약국·공통 운영 전체 폭·2열 그룹 배치 및 TODO 선행 검증 지시
> **범위**: 개발·로컬 검증·PR·필수 CI·자동 리뷰까지. **main 통합 직전 종료. 병합·auto-merge·배포·운영 DB 변경 금지.**
> **기준**: `75f798ef24a66545b233c63d26ba9fdbb89cc499`에서 시작한 `wo/operations-list-notifications`. 문서 작성 전 일부 로컬 초안이 있으며 검증 완료 구현으로 취급하지 않는다.

## 1. 목표와 완료 기준

운영 홈을 **처리할 업무 → 운영자 알림 → 전체 업무 바로가기** 순서로 구성한다. 긴 메뉴 나열을 줄이고 실제 업무 목록은 체크 선택 후 상단 ActionBar로 조작한다. 현행 위임·서비스·조직·Google proof 경계를 유지한다. 알림 읽음은 업무 승인·완료가 아니다.

사용자 스크린샷의 계정·연락처·문의 원문을 이 문서나 테스트에 복사하지 않는다. 검증에는 합성 fixture만 쓴다.

## 2. 문서·코드 선행 대조

| 확인 | 근거 문서 | 현행 코드 | 판정·보완 |
| --- | --- | --- | --- |
| 체크 선택·상단 작업·상세의 계층 | [Canonical Workflow](../architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md), [Table Canonical](../architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md) | `packages/operator-ux-core/src/list/DataTable.tsx`, `packages/ui/src/components/table/ActionBar.tsx` | BaseTable은 header 선택만 연결하지만 상위 DataTable은 body 선택 컬럼도 자동 생성한다. 커스텀 `_select`가 있으면 중복 자동 생성하지 않도록 보완하고 기본 자동 생성 경로도 회귀 검증한다. |
| 리스트 유형 선행 분류 | [Standard List Baseline](../baseline/O4O-STANDARD-LIST-PHASE1-BASELINE-V1.md), [DataTable 정책](../architecture/OPERATOR-DATATABLE-POLICY-V1.md) | `CentralOperationOverview.tsx`, `CentralOperationNotifications.tsx`, `OperatorContactMessagesPage.tsx` | 현황·알림은 기존 제한된 배열 응답을 재사용하는 E형 최소 적용. 문의는 기존 서버 pagination·상세를 보존하는 B형 targeted adoption. 새 무제한 전량 로드·가짜 server pagination을 만들지 않는다. |
| 서비스 제목 접기 | [Shared Module Protocol](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) | `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx`, `operatorDomainIA.ts` | 기존에는 내부 업무 그룹만 접혔다. 서비스 제목 접기는 opt-in으로 추가하고 중앙 셸에만 활성화한다. 다른 호스트 기본 동작을 바꾸지 않는다. |
| 중앙 접근·노출 범위 | [Architecture V2](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V2.md), [Admin 정책](../baseline/O4O-CURRENT-ADMIN-ROLE-POLICY-V1.md) | `CentralOperationsPage.tsx`, `central-operation-menu-grants.ts`, `central-operation-access.routes.ts` | 메뉴는 서버가 반환한 menuKeys와 실제 renderer의 교집합만 표시한다. 알림·대기 건수에도 같은 범위를 적용한다. |
| 전체 대기 집계 | 동일 V2 | `central-operation-overview.ts`, `modules/contact-inquiry/inbox-tasks.ts` | 기존 집계는 메뉴별 업무가 주이며 일부 서비스의 새 `contact_inquiries` 대기가 빠져 있다. inbox 메뉴 위임이 있는 서비스만 기존 문의함과 동일한 서비스·organization 조건으로 보완한다. 강의의 기존 contact 집계와 중복 합산하지 않는다. 중앙 neture.inbox가 이미 제공하는 내 매장·원내 약품 도구 문의도 같은 메뉴 권한에서 별도 집계한다. |
| 문의 선택 처리 | Canonical Workflow, 현행 문의 상세 계약 | `OperatorContactMessagesPage.tsx`, `neture-service-operations/api.ts`, `contact-operations.service.ts` | 기존 전체 공급자 일괄 확인 버튼은 화면 선택과 무관했다. 선택한 신규 문의만 기존 상세/patch API로 확인한다. `adminNotes` 보존과 `expectedUpdatedAt` 동시 수정 검사가 필수다. |
| 운영자 알림 | 기존 수신·읽음 계약, V2의 메뉴 범위 | `CentralOperationNotifications.tsx`, `central-operation-access.routes.ts`, `routes/notifications.routes.ts` | 기존 개인 수신 원장과 서버 범위 필터를 재사용한다. 홈 목록·벨·선택 읽음과 focus/1분 갱신을 연결한다. 미읽음 우선 정렬 후 20건으로 제한하여 이전 미읽음이 최근 읽은 알림에 가려지지 않게 한다. 전역 모두 읽음·새 수신자 확대·외부 발송은 도입하지 않는다. |

코드 경로의 `Central*.tsx`는 `apps/admin-dashboard/src/pages/operators/`, 문의 공통 UI는 `packages/operator-core-ui/src/modules/neture-service-operations/` 기준이다.

## 3. 소비처와 변경 경계

- 공통 사이드바: 중앙 관리자 셸, Neture operator/admin/subdomain wrapper, KPA 등 기본 `OperatorAreaShell` 소비처. 신규 `collapsibleDomains` 옵션의 기본값은 기존 동작이며 중앙만 opt-in한다. desktop/mobile은 동일 트리를 쓴다.
- 문의 화면: 중앙 `CentralNetureServiceOperations`, Neture `pages/operator/OperatorContactMessagesPage`, 기존 admin alias. 공통 컴포넌트를 한 번 고치고 호스트별 API binding·경로·오류 복구를 대조한다.
- 현황·알림·바로가기: 중앙 전용 컴포넌트로 한정한다. 공통 NotificationBell의 기본 동작이나 다른 서비스의 알림 목록을 임의 변경하지 않는다.
- 상태 변경: 선택 문의의 `new → in_progress`, 선택한 본인 알림의 읽음만. 다른 업무의 일괄 승인·반려·삭제는 추가하지 않는다. DB schema·migration·새 알림 저장소·과거 데이터 정리는 범위 밖이다.
- 외부 알림(메일·브라우저 push 등)의 새 채널과 수신자 정책은 이번 작업에 포함하지 않는다. 기존 운영 알림 전달은 유지한다.

## 4. 추적 TODO

완료 표시는 실제 검증 근거가 있을 때만 `[x]`로 바꾼다. 미실행·실패·skip은 PASS와 분리한다.

### A. 선행 확인

- [x] A1 사용자 요구와 main 통합 직전 종료 범위를 문서에 고정했다.
- [x] A2 표준 리스트·sidebar·중앙 위임 문서와 실제 API/렌더러를 대조했다.
- [x] A3 공통 sidebar/문의 화면의 소비처를 검색하고 기본 동작 보존 경계를 정했다.
- [x] A4 빠진 문의 대기 집계, 선택과 무관한 일괄 처리, notes/version 요구를 선행 보완 항목으로 확인했다.
- [x] A5 TODO의 각 요구를 구현 파일·테스트와 다시 대조해 계획 누락이 없는지 확인한다.

### B. 메뉴·레이아웃

- [x] B1 sidebar에 서비스 제목+역삼각형 펼침을 제공한다. 현재 경로의 서비스/그룹 자동 열기, 수동 접기, 주기적 권한 갱신 중 접힘 유지, 직접 진입과 권한 회수 동작을 확인한다.
- [x] B2 약국·공통 운영을 전체 폭으로 배치하고 회원·승인/콘텐츠·커뮤니티/상품·사업/운영·설정 그룹을 2열로 접고 펼친다. 공급자와 다른 서비스는 아래로 내린다. 모바일 1열을 확인한다.
- [x] B3 홈 순서를 대기 현황→운영자 알림→업무 바로가기로 고정한다. 모든 허용 메뉴의 그룹 진입을 유지하고 존재하지 않거나 위임되지 않은 메뉴를 추가하지 않는다.
- [x] B4 공유 옵션 미사용 호스트의 원래 메뉴·모바일 drawer·ESC/링크 이동 동작을 회귀 검증한다.

### C. 전체 업무 대기 현황

- [x] C1 대기 합계·업무 종류·조회 확인 필요를 구분한다. 실패/null은 0으로 합산하거나 준비 완료로 표시하지 않는다.
- [x] C2 서비스/표시 필터, 대기 우선 정렬, 최초 접수, 업무 진입을 표준 DataTable로 구성한다. 체크 후 상단 모아보기·업무 열기를 제공한다. 이 선택은 승인 명령이 아니다.
- [x] C3 새 서비스 문의 대기를 기존 문의함 조건으로 보완한다. 위임 없는 inbox·조직별 문의·타 서비스는 집계하지 않고 강의 문의와 중복 합산하지 않는다.
- [x] C4 갱신 실패·늦은 이전 응답·scope 변경·필터 변경·자동 갱신에서 건수/선택/링크 정합을 확인한다.

### D. 문의 표준 리스트

- [x] D1 제목·상태·접수자를 우선 표시하고 연락처·본문은 확장/상세에 유지해 가로 스크롤과 중복 정보를 줄인다.
- [x] D2 기본/커스텀 `_select`의 중복 컬럼을 방지하고 두 경로를 검증한다. body 체크박스·현재 페이지 전체 선택·상단 작업을 연결한다. 선택하지 않은 문의나 다른 페이지를 처리하지 않는다.
- [x] D3 선택한 신규 문의만 기존 API로 확인한다. 메모를 보존하고 동시 수정 409를 표시한다. 신규 외 상태는 건너뛴다.
- [x] D4 성공/실패/건너뜀을 구분하고 실패 항목만 재시도한다. 저장 성공 후 조회 실패 시 성공한 write를 자동 재전송하지 않는다.
- [x] D5 중복 클릭·필터/페이지 변경·상세 저장 충돌·unmount 후 응답·선택 잔존을 검증한다.

### E. 운영자 알림

- [x] E1 header의 알림명·미읽음 건수와 홈의 최신 개인 알림 목록을 제공한다. 빈 목록과 조회 오류를 구분한다.
- [x] E2 체크 후 상단 선택 읽음을 제공한다. 표시된 본인 미읽음 ID만 기존 읽음 API에 전달한다. 업무 상태는 바꾸지 않는다.
- [x] E3 읽음 후 벨/목록이 함께 갱신되고 focus·1분 갱신·실패 복구·scope 교체가 정상인지 확인한다.
- [x] E4 알림 링크는 기존 중앙 경로 해석기를 통과한다. 다른 서비스·외부 임의 URL·위임되지 않은 데이터로 접근을 확대하지 않는다.

### F. 검증·인계

- [x] F1 관련 UI/공통 sidebar/문의 API adapter/백엔드 집계 테스트가 요구 B~E를 실제로 검증한다. 기존 테스트의 요구 변경도 함께 대조한다.
- [x] F2 필요한 패키지 빌드, 관리자·관련 웹 호스트 타입 검사/빌드, API 타입 검사와 문서 민감정보·diff 범위 검사를 수행한다.
- [x] F3 합성 데이터로 desktop/mobile 브라우저에서 서비스 접기·약국 2열·선택→상단 작업·문의 부분 실패·알림 읽음·빈값/오류를 확인한다. 새 데이터의 운영 write는 하지 않는다.
- [ ] F4 셀프 리뷰 후 같은 branch/PR의 CI·Codex 리뷰 지적을 해결한다. 최신 HEAD의 required CI와 미해결 스레드를 확인한다.
- [ ] F5 이 문서에 검증 명령/결과/잔여 한계를 채우고 commit·push·PR을 인계한다. **main 미병합·미배포**, 작업용 branch/worktree 보존을 보고한다.

## 5. 계획 검증 후 확정할 구현 규칙

1. 도메인 접기는 중앙만 opt-in하며, 주기적 menuKeys 갱신만으로 사용자의 수동 접힘을 되돌리지 않는다.
2. 대기 현황의 일괄 선택은 서로 다른 업무를 자동 승인하는 기능이 아니다. 실제 처리는 권한 검사되는 업무 상세에서 한다.
3. 문의 확인은 선택 범위만 처리한다. 상세 API의 메모·버전 계약을 생략하지 않는다. 실패 재시도는 성공 항목을 포함하지 않는다.
4. 알림 수신·읽음·업무 완료는 별개다. 수신 정책과 기존 감사 원장은 재사용하고 새 원장을 만들지 않는다.
5. UI 문구/테스트/문서가 충돌하면 현재 사용자 요구→현행 canonical→기존 코드 순으로 대조한다. 과거 구현의 테스트 기대값만으로 이전 정책을 복원하지 않는다.

## 6. 요구별 검증 연결

| 요구 | 검증 파일/범위 |
| --- | --- |
| B1/B4 | `apps/admin-dashboard/src/pages/operators/CentralOperationsPage.test.tsx`, 공통 sidebar opt-in/default·직접 진입·focus·모바일 smoke |
| B2/B3 | `CentralOperationDirectory.test.tsx`와 desktop/mobile 브라우저: 약국 전체 폭·2열 그룹·공급자 아래·허용 메뉴 유지 |
| C1/C2/C4 | `CentralOperationOverview.test.tsx`: 대기/실패/0건 구분·필터·선택·늦은 응답 |
| C3 | `apps/api-server/src/services/admin/__tests__/central-operation-overview.test.ts`: inbox 위임·service/organization 격리·강의 중복 방지·조회 실패 |
| D1~D5 | `services/web-neture/src/pages/operator/OperatorContactMessagesPage.test.tsx`, 공통 `api` adapter 테스트·기존 상세 workflow 테스트·중앙/Neture 브라우저 |
| E1~E4 | `CentralOperationNotifications.test.tsx`, 기존 central-access route/경로 resolver 테스트·홈/벨 읽음 동기화 smoke |

위 파일명은 검증 계획이며 실제 실행 여부·결과는 아래에 따로 기록한다. 새 중앙 테스트 파일은 동일 `pages/operators` 폴더에 둔다.

## 7. 검증 기록

로컬 개발/검증 결과(2026-10-29):

| 실행 | 결과 |
| --- | --- |
| `pnpm run build:packages` | PASS — 기존 공통 의존성 사전 빌드 |
| `pnpm --filter @o4o/admin-dashboard exec vitest run --maxWorkers=2` | 55 files / 571 tests PASS |
| `pnpm exec vitest run --config packages/operator-core-ui/vitest.config.mjs --maxWorkers=2` | 33 files / 223 tests PASS (API adapter 2건 포함) |
| `pnpm exec vitest run --config services/web-neture/vitest.config.mjs services/web-neture/src/pages/operator/OperatorContactMessagesPage.test.tsx --maxWorkers=2` | 1 file / 7 tests PASS |
| API Jest: `central-operation-overview.test.ts`, `central-operation-access.routes.test.ts` | 2 suites / 12 tests PASS |
| 관리자/API `type-check`, 관리자 `vite build`, `VITE_API_BASE_URL=http://localhost:3002 pnpm --filter @o4o/web-neture run build` | PASS — Neture build에 TypeScript 검사 포함 |
| 문서 링크·TODO ID·실제 경로 검사, `git diff --check` | PASS |
| `node scripts/check-doc-sensitive.mjs docs/work-orders/WO-O4O-CENTRAL-OPERATIONS-UX-REFINEMENT-V1.md` | PASS — 새 문서 1건 |

검증 수는 중복 재실행을 합산하지 않는다. 로컬 813건은 위 서로 다른 네 테스트 범위의 합계다. CI 결과는 최신 PR HEAD에서 별도로 확인한다.

브라우저: Chromium의 합성 fixture로 desktop 1440, tablet 768, mobile 390 폭을 확인했다. 서비스 제목 접기·모바일 ESC·약국 전체 폭/2열 그룹·공급자 아래 배치·선택 작업 표시·선택 모아보기 종료·알림 읽음과 벨 동기화·선택 문의만 patch·메모 보존·브라우저 오류 없음 PASS. mobile은 대기/알림/문의 표가 컨테이너 폭 안에 들어오는 것도 재검증했다. desktop/mobile에 문의 부분 실패를 주입하여 성공 ID를 재전송하지 않고 실패 ID만 재시도함을 확인했고, 집계 요청 실패 시 0건 summary를 만들지 않음을 확인했다.

중간 실패: 커스텀 `_select` 중복 생성, 중복 복구 버튼, 모바일 nowrap 상속으로 인한 내부 가로 스크롤을 실제 테스트/브라우저에서 발견해 수정한 후 해당 검증을 재실행했다. 초기 실패 결과는 최종 PASS 수에 포함하지 않는다.

제한: 실제 운영 계정 로그인·운영 상태 변경·외부 알림 발송·운영 배포는 실행하지 않았다. 수신자별 실데이터 및 실제 승인 처리 결과는 이번 합성 UI 검증이 대신하지 않는다. main 통합·배포는 사용자 지시에 따라 범위 밖이다.

선행 문서 검사: 상대 링크 대상 존재, TODO ID 중복 없음, 핵심 구현/기존 API 경로 존재 확인. A5는 이 계획 대조의 완료이며 B~F 구현 완료와 구분한다.

공통 선택 컬럼 소비처 대조: TS AST로 `_select` 명시 컬럼 11개를 확인했으며 render 없는 선언은 0개였다. 기본 자동 생성/커스텀 단일 생성 테스트와 공통 운영 UI 223건을 함께 통과했다.
