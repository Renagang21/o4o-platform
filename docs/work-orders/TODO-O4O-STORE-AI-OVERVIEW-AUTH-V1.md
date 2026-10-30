# TODO-O4O-STORE-AI-OVERVIEW-AUTH-V1

> **상태**: ACTIVE · **작성일**: 2026-10-30
> **범위**: 로그인한 매장의 AI 현황 설명 인증 오류 보완. 사용자 요청: TODO 작성·재점검 → 개발·검증 → main 병합 전 종료.

## 1. 목적과 경계

매장 화면에는 로그인·선택 매장이 표시되지만 AI 현황 설명은 인증 오류가 나는 제보를 다룬다. 기준 main은 `1b25114069`다. 실제 운영 요청 원문은 확보하지 않았으므로 코드상 결함과 운영 재현을 구분한다.

기존 `requireAuth` → 매장 문맥 → 매장 접근 검사 → AI 현황 handler 순서를 복구한다. 기존 권한·선택 매장·AI Core 가격/한도·사용자 요청 후 실행 계약은 유지한다. 별도 인증·역할·API·원장을 추가하지 않는다.

유튜브 업로드·사이니지 AI 편성 기획은 별도 후속 개발이며 이 오류 수정에 섞지 않는다. main merge·auto-merge·배포, 운영 DB·계정·OAuth 변경, 유료 AI 호출은 수행하지 않는다. 사용자 브라우저의 로그인 세션에 접근했다고 가정하지 않는다.

## 2. TODO

- [x] **원인·소비처 확정**: 화면 오류 매핑, 요청 client의 Bearer/선택 매장 전달, API mount와 미들웨어 순서, 인증/권한 guard, 기존 테스트가 놓친 구간을 대조한다. 현행 Store 접근 정본과 AI 운영 원칙을 확인한다.
- [x] **TODO 재점검**: 아래 검증 표와 실제 router/guard/handler를 다시 비교해 성공뿐 아니라 미인증·잘못된 인증·타 매장·접근 해제·잘못된 입력·AI 실패를 포함했는지 점검한다. 누락과 보완 결과를 §3에 기록한 뒤 구현한다.
- [x] **최소 코드 보완**: 실제 Store Hub router에 기존 인증 미들웨어를 연결한다. 매장 접근 검사와 handler의 실행 시 재확인·자료 범위·AI 과금 계약을 약화하지 않는다.
- [x] **결함 재현·회귀**: 실제 router를 통과하는 합성 HTTP 검증으로 수정 전 정상 인증 요청의 실패를 재현하고 수정 후 통과를 확인한다. 테스트에서 `req.user`/`organizationId`를 endpoint 앞에 임의로 미리 넣어 인증 누락을 가리지 않는다. 실제 DB/provider는 호출하지 않는다.
- [x] **관련 회귀·정적 검증**: 기존 Store/공급자/협업체 AI HTTP·업무 Extension·매장 권한 테스트, API type-check/build, 변경 파일 lint, 문서 민감정보·diff 검사를 실행하고 실패/미실행을 구분한다. UI 변경이 생기면 PC·모바일 browser smoke를 추가한다.
- [x] **문서·재검토**: 검증 명령·결과·운영 미확인 범위·후속 통합 시 API 배포 필요를 기록한다. 기존 과거 CHECK·canonical 판정은 재작성하지 않는다. diff와 TODO를 최종 재검토한다.
- [ ] **main 병합 전 인계**: 경로 지정 stage/commit·branch push·기존 PR 재사용 또는 PR 생성, 인계 HEAD의 CI·Codex 리뷰 지적 보완을 완료한다. branch/HEAD/PR·미해결·main 대비 위치를 보고하고 미병합 상태로 worktree를 보존한다.

## 3. TODO 재점검 기록

2026-10-30 구현 전 두 번째 점검 완료. `StoreOverviewExplanation` → `apiClient` → KPA mount → `createStoreHubController` → `optionalStoreAuth`/workspace guard → handler를 대조했다. client는 Bearer와 선택 매장 헤더를 전달하지만 AI endpoint는 `requireAuth`를 호출하지 않는다. `optionalStoreAuth`는 토큰 검증기가 아니라 `req.user`를 소비하는 조직 문맥 설정기다.

기존 `ai-overview-http.spec.ts`는 handler 앞에 사용자·조직을 직접 주입하므로 이 결함을 검출하지 못했다. 새 검증은 실제 router·인증 middleware·매장 guard·handler를 통과하고, 토큰 해석/DB/provider만 합성 fixture로 대체한다. 두 번째 점검에서 누락하기 쉬운 **세션 해제·계정 제한·약관 및 약사 자격/경영자 계약 제한**, guard 이후 접근 해제, 기존 GET 회귀도 포함하기로 보완했다. 실제 서명 검증·운영 로그인·provider 성공을 대체한다고 보고하지 않는다.

## 4. 필수 검증 표

| 조건 | 기대 결과 |
|---|---|
| 정상 인증 + 허용된 선택 매장 | 인증 middleware가 사용자를 먼저 확정, 그 매장 집계만 읽고 합성 AI 결과 반환 |
| 토큰 없음·잘못된 토큰 | 인증 단계 거부, 매장 조회와 AI 실행 없음 |
| 타 매장 선택·매장 접근 불가 | 기존 guard 거부, 집계와 AI 실행 없음 |
| guard 통과 후 접근 해제 | handler 재확인 거부, 집계와 AI 실행 없음 |
| client가 집계/매장 scope를 body로 지정 | 400, client 제공 집계나 scope를 사용하지 않음 |
| AI 한도·provider/자료 실패 | 기존 오류 상태 유지, 성공·0건 현황을 조작하지 않음 |
| 기존 GET·공급자·협업체 | 기존 인증 및 각 조직/역할 범위 유지 |

## 5. 완료·운영 확인

로컬 검증과 PR CI/review는 운영 수정 완료를 뜻하지 않는다. API 변경은 후속 통합 후 API 배포와 별도 허용 범위의 운영 확인이 필요하다. 이번 작업에서 실제 AI 성공·실계정 왕복·운영 401 해소를 검증했다고 보고하지 않는다.

## 6. 로컬 검증과 최종 점검

실제 코드 변경은 `store-hub.controller.ts`의 AI route에 기존 `requireAuth`를 추가한 1행이다. 새 `store-ai-overview-router.spec.ts`는 실제 router·인증 middleware·workspace guard·handler·AI Extension을 통과한다. 토큰 해석은 합성 결과이며 서명 검증 자체의 시험이 아니다. 사용자·권한 조회의 원천과 provider 응답은 fixture로 대체했다. 실제 운영 사용자·DB·provider 호출은 없다.

- 수정 전 focused HTTP: 14건 중 12건 실패·2건 통과. 정상 인증 요청도 401로 실패하고 토큰 검증기 미호출을 확인했다. 최초 실행의 sandbox `listen EPERM`은 제품 검증 결과에서 제외하고, 로컬 서버 실행 권한으로 다시 재현했다.
- 수정 후 focused HTTP: 직원 승인/해제·quota·자료 전체 실패까지 추가한 **17건 통과**. 이 17건은 아래 API 84건에 포함되며 중복 합산하지 않는다.
- `pnpm --filter @o4o/api-server exec jest --runInBand --runTestsByPath`로 새 router spec, `ai-overview-http`, `ai-dashboard-overview`, `store-member-workspace-access`, `store-owner-membership-gate`, `store-owner-service-scoped-org`, `store-hub-live-signals` 실행: **7개 파일·84건 통과**.
- `pnpm exec vitest run --config services/web-store/vitest.config.mjs`로 `ai-overview-panel`, `store-ai-assistant`, `store-ai` 실행: **3개 파일·17건 통과**.
- `pnpm install --frozen-lockfile --offline`, `pnpm run build:packages`, API `type-check`와 `build`: 통과. dependency·lockfile 변경 없음.
- 변경 controller·신규 test ESLint: 오류·경고 0. 문서 민감정보 guard와 `git diff --check`로 마무리한다.
- frontend/UI 변경 없음. 신규 PC·모바일 browser smoke는 실행하지 않았으며 기존 단위 회귀로 실제 브라우저·운영 성공을 주장하지 않는다.

최종 TODO 대조: §4의 각 검증 조건을 실제 테스트와 대조했으며 원격 PR/HEAD 검사만 남았다. 권한·약관·자격·조직 선택 정본은 [매장 접근 정본](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md)을 그대로 따른다. 기존 [AI 콘텐츠 제작 운영 원칙](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md)과 가격/한도·공급자·협업체 계약은 변경하지 않았다.

원격 CI·Codex·최신 HEAD와 미해결 여부는 같은 작업 PR의 최신 검사 및 인계 댓글에 기록한다. 이전 HEAD 성공을 새 HEAD의 검사로 대체하지 않는다. main 병합·배포는 별도 통합 요청 전까지 수행하지 않는다.
