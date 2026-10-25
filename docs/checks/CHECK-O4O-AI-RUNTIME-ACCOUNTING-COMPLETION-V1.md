# AI 텍스트 실행 경로 회계 연결 검증

> **상태**: COMPLETED
> **개발 결과**: push 인계 · 2026-10-25 (Asia/Seoul)
> **작업**: [TODO](../work-orders/TODO-O4O-AI-RUNTIME-ACCOUNTING-COMPLETION-V1.md) · `wo/ai-runtime-accounting-completion`
> **기준**: main `b7d2cfd86edf4d26d19d1e954fa754f74faf8f7d`
> **종료점**: local 검증·commit/push 인계. main 통합/배포·운영 변경 미실행

## 1. 조사와 구현 판정

실제 호출·문맥/권한·actor·저장·CONNECT/KEEP/DEFER 표는 [TODO §3](../work-orders/TODO-O4O-AI-RUNTIME-ACCOUNTING-COMPLETION-V1.md#3-조사설계-보완)에 모았다. 기존 `AiAccountedExecution`, quota 예약/정산, 관리 모델 선택, `PRODUCT_CONTENT` 정책을 재사용한다. Core 패키지·Extension 계약·Task/Memory 원장·schema/migration·dependency를 변경하지 않았다. 플랫폼 부담 외 청구/계정 연결은 구현 완료가 아니다.

홈·파일·계획의 텍스트 호출은 SERVICE_QUERY/neture에 귀속한다. public 파일 host는 익명으로 남고 로그인/상품 host의 actor는 기존 인증/권한 검사 결과만 사용한다. client body에 userId/serviceKey를 추가해도 청구 주체가 바뀌지 않는다. 상품 태그 실패 후 콘텐츠 fan-out을 중단하며 기존 비동기 시작 응답은 유지한다. 사용량 누락과 정산 기록 실패는 기존 adapter의 보류·성공 반환 처리를 유지한다.

## 2. Shared Module Change Verification

### Changed shared module

- Module: 서버 `ai-tools/work-planner.ts`, `multimodal-chat.ts`, `file-understanding/structure-inference.service.ts`, `utils/ai-provider-runtime.ts`, `ai-management/catalog.ts`, 전역 상품 태그/콘텐츠 서비스·컨트롤러.
- Package: `@o4o/api-server`. `@o4o/ai-core`, file/hospital Core 패키지는 계약/소스 변경 없음.
- Direct consumers: 인증 AI proxy host, 공개 hospital host, 상품 태그/콘텐츠 routers, catalog-import의 기존 서버 콘텐츠 작업, standalone 파일 smoke.
- Indirect consumers: Neture 홈·병원약국 공개 파일 화면, 관리자 AI 운영 목록·전역 상품 POP API. 공유 웹 메뉴/props/visibility는 변경하지 않음.
- 소비처 조사: 전체 apps/packages/services/scripts의 import·호출·route 문자열을 검색해 factory 4종과 두 파일 host, standalone 직접 caller, 상품 content의 import-common caller를 대조. legacy insight는 현재 생성/호출을 찾지 못해 복구하지 않음.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | route/role/capability 영향 | 검증 방식 | 결과 |
|---|---|---|---|---|---|
| Neture 홈·작업 계획 | 직접 | 텍스트 quota/사용량·인증 actor, 일반/강화 모델 유지 | Neture 가입·scope/tool guard 유지. 새 도구/권한 없음 | HTTP fixture·factory/실회계 adapter 연동·web typecheck/소비 테스트 | PASS (local fixture) |
| 병원약국 공개 파일 | 직접 | 기존 표본 추론에 예약·정산 | 무로그인·표본/schema bounds·IP 제한 유지, 익명 사용자 identity 없음 | 실제 router HTTP fixture·공용 file pipeline·web typecheck/소비 테스트 | PASS (local fixture) |
| admin AI 운영 목록·전역 상품 API | 직접/간접 | 연결/부분 연결·scope 안내, 인증 actor·실패 후 fan-out 차단 | 전역 상품 자원 권한 유지, 모델 선택 UI/응답 형식 유지 | catalog/관리/API·보안 테스트·admin typecheck, source 소비처 대조 | PASS (local fixture) |
| import-common 서버 콘텐츠 | 직접 | optional actor 부재 상태 유지 | 기존 PRODUCT_CONTENT 정책·서비스 한도, 사용자 추정 없음 | actor 없는 서비스 fixture·기존 import caller 검색 | PASS |
| standalone 파일 smoke | 직접 | 명시 Core invocation 전달 | 개발자 환경 계정 전용, HTTP 우회 플래그 추가 없음 | 전체 caller 검색·소스 검토. 유료 실행 미실행 | 호환 반영, 실호출 미검증 |
| KPA/매장·협력 모임 현황 Extension | 관련 기존 기능 | 이번 호출 경로 대상 아님 | 기존 권한/자료 분리·정책 유지 | API 전체 회귀 | PASS (API 회귀, 실브라우저 미실행) |
| K-Cosmetics / PharmacyHub 폐기 runtime | 미사용 | 없음 | 폐기 기능/route/UI 재생성 없음 | current source·canonical 대조 | N/A |

### Route / role / capability check

- Route existence: 기존 `/api/ai/home-chat`, `/api/ai/request`, `/api/ai/file-understanding`, `/api/hospital/ai/structure`, 상품 AI routes 유지. 신규 route/메뉴 없음.
- Role guard: Home/통합 Neture guard, 파일 로그인, 상품 `resolveGlobalProductResourceAccess` 유지. 공개 파일만 기존 무로그인.
- Capability map: 기존 자료/tool/planner 검증 유지. 새 상태 변경 도구·우회 권한 없음.
- Visibility/filter·empty group/block removal: 웹 메뉴/visibility 변경 없음, 해당 없음.
- 오류 응답: 기존 success/error/code envelope에 한도 429·quota DB/가격 장애 503 추가. provider 오류 분류와 구별하며 응답/로그에 원문을 싣지 않음.

### Smoke result

Neture 인증 요청과 공개 hospital 구조 요청의 실제 Express router를 supertest로 검증했다. provider/DB transport는 fixture다. 유료 공급자·실계정·실브라우저·운영 DB smoke는 하지 않았으며 UI/layout 변경이 없어 desktop/mobile 화면 검증 대상으로 확대하지 않았다. KPA/K-Cosmetics의 새 UI나 runtime을 만들지 않았다.

## 3. 검증 기록

| 검증 | 실제 결과 |
|---|---|
| 환경 | Node 22.18.0 / pnpm 10.25.0, frozen lockfile install 성공. ignore-scripts 설치 뒤 테스트용 better-sqlite3만 로컬 Node headers로 재빌드 |
| 공통 package build | `pnpm run build:packages` PASS |
| API typecheck/build | `pnpm --filter @o4o/api-server run type-check`·`run build` PASS |
| 관리 모델·정책 회귀 | `ai-management-http`·`ai-policy-model-retirement`: Jest 2 suites / 16 tests PASS. 최종 목록 안내 문구 수정 후 재검증 |
| 신규 실패·귀속 회귀 | 일반/강화/provider별 계획, 가격/한도 선차단, parse 실패 후 1회 사용량 기록, 정산 장애 재호출 0, 파일 공개/인증 actor, 상품 권한·fan-out 차단 PASS |
| API 전체 회귀 | `pnpm --filter @o4o/api-server exec jest --runInBand --no-coverage`: 627 suites 중 576 PASS / 51 SKIP. 9,304 tests PASS / 760 SKIP, 실패 0. exit 0 |
| 소비 웹 typecheck/test | Neture `tsc --noEmit`·hospital `tsc -b`·admin `type-check` PASS. Neture 첨부 소비 Vitest 1 file / 10 tests, hospital 파일 선택 Vitest 1 file / 20 tests PASS |
| 변경 TS/MTS lint·문서 민감정보/링크·diff | 변경 18개 TS/MTS lint 오류/경고 0. 지정 문서 5개 민감정보 0, 로컬 파일/heading 링크 81개 유효, diff 공백 검사 PASS. 최종 문서·staged scope 확인 후 commit/push 인계 |

`ai-text-runtime-accounting.spec.ts`는 실제 회계 adapter와 실제 planner/file service/public router를 사용하고 DB quota/provider 경계만 주입한다. `product-ai-actor-accounting.spec.ts`는 실제 권한 검사·router·상품 서비스를 사용하며 provider/policy만 주입한다. 기존 회계 테스트는 사용량 누락 보류, model별 가격, 정산 장애·fallback/retry 중복 호출 방지를 함께 확인한다. focused 실행의 성공 수를 전체 회귀와 합산하지 않는다.

CI 영향 판정은 API·관리자 true, Neture/매장/약국/병원약국 웹 false였다. 실제 배포 실행 결과가 아니다. API 전체 회귀에서 SKIP한 51 suites/760 tests를 PASS로 합산하지 않으며 위 웹 소비 테스트와 focused 테스트도 API 전체 성공 수에 더하지 않는다. 원본 상세 로그는 로컬 임시 경로에만 두고 공개 저장소에 업로드하지 않았다.

## 4. 인계·남은 범위

native 이미지/PDF/vision, 검색 tool 비용, Qwen/OCR/TTS는 현재 텍스트 계약과 구분해 DEFER한다. 운영 가격/한도·응답 품질·실제 청구·신규 계정 연결·유료 호출은 미검증이다. `DEPLOYMENT = REQUIRED`인 코드 변경이나 이번 개발에서 PR 생성·CI 운영·main 병합·배포는 수행하지 않는다. 전체 TODO S2-2/S4-4는 계속 미체크다.

문서 정합: [구조 문서 §15](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md#15-텍스트-회계-연결-보완--개발-branch-2026-10-25), [전체 TODO §12](../work-orders/TODO-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md#12-비용quota-텍스트-경로-후속--개발-branch-2026-10-25), [AI 활용 흐름 §11.6](../baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md#116-비용--사용량-현재-상태)에 개발 branch의 연결 범위와 본문 비저장 경계를 반영했다. 앞선 main/배포 CHECK는 변경하지 않는다.

WORKTREE_DISPOSITION: `/workspace/o4o-wt/ai-runtime-accounting-completion` · `wo/ai-runtime-accounting-completion` · base `b7d2cfd86e` · main integration/PR CI/deployment 미실행 · verdict `KEEP` (push 후 통합 담당 인계·후속 수정용).

최종 인계는 이 문서를 포함하는 branch HEAD를 기준으로 하며 commit SHA·원격 SHA 일치·clean 상태는 완료 보고에서 확인한다. 미병합 개발 branch이므로 worktree/branch를 보존한다.
