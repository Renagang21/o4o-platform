# CHECK-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1

> 상태: ACTIVE — 개발 검증·push 인계, 운영 활성화 전
> 작성일: 2026-10-22 · 기준 main: `7dc02646dab2808258133139b3ca0714ec3cc14b`
> Branch: `wo/external-ai-content-connection`
> [설계](../design/DESIGN-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md) · [TODO](../work-orders/TODO-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md)

## 1. 변경과 유지 범위

- API `modules/external-ai`에 공식 MCP SDK 기반 Streamable HTTP, OAuth code+S256 PKCE,
  client/redirect/resource 검증, 연결 동의·해제, 해시 자격·refresh 회전·재사용 차단을 구현했다.
- MCP 도구 8개: 작업공간, 상품 검색/문맥, 자료 목록/본문, 초안 생성/수정/조회.
  첫 실제 adapter는 공급자이며 다른 조직·약국·커뮤니티는 준비 상태만 표시한다.
- Supplier canonical 관계, 계정 상태, 메인 가입, 공통·공급자 약관, 현재 소유·작성 자격을 재사용한다.
  연결 발급 때와 매 도구 실행 때 확인하고, 저장은 설정·연결을 잠근 동일 transaction에서 처리한다.
- 기존 자료함 비공개 document와 STORE 설명서 draft 원장을 재사용한다. HTML sanitize,
  재시도 중복 방지, 최신 revision 충돌, 검수/공개 중 자료 변경 차단을 포함한다.
- 관리자 AI 화면에 별도 외부 연결 구분, 사용·중지/기능 체크/예제 CRUD/최근 도구 오류를 추가했다.
  사용자 내 계정에 연결 해제, 기존 로그인 뒤 명시적 동의 화면을 추가했다.
- 외부 ChatGPT 모델·구독·비용·토큰·대화를 수집하지 않는다. O4O 내부 AI 실행/과금,
  소비자 공개 조회/추천, 표준 상품 자동 생성, 공개/게시/검수 요청은 추가하지 않았다.

## 2. Consumer Impact Matrix

| 변경 | 실제 소비처 | 영향·검증 |
|---|---|---|
| Zod override 3.25.76 | admin의 UserForm/AdminAccountsSettings/ai-management/service-health 및 API 새 도구 schema | 공식 SDK 요구사항과 타입 중복 해소. admin 전체 31파일 446건, frontend 전체 type-check, API type/build |
| 공통 SQL 문자 탐지 | setup-middlewares를 통과하는 전체 API 서비스 | 새 OAuth 경로·필드의 길이 제한된 URL-safe proof만 예외. 기존 경로·의심 입력·Kakao proof 검증은 유지. 신규/기존 보안 회귀 포함 5 suite 91건 |
| register-routes | 공통 API bootstrap | 별도 모듈 mount, 미설정/중지는 fail-closed. 기존 로그인 router/인증 token/role 원장 무변경 |
| AiManagement | admin settings의 AI 운영 관리 | 내부 AI를 별도 구분으로 보존. 외부 설정 실패가 내부 화면 진입을 막지 않음. 전체 admin 테스트·desktop/mobile |
| Neture App/MySettings | main·supplier·community·funding host의 같은 웹 앱 | 기존 로그인과 계정 설정 재사용, 새 동의 route, canonical account host의 해제 요청. 관련 단위 테스트·desktop/mobile |
| 기존 Supplier 서비스 | 자료함·상품 설명서 | 기존 서비스/서버 sanitizer를 transaction에 바인딩. 별도 콘텐츠 원장·직접 ProductMaster write 없음. 실제 PostgreSQL 저장 검증 |
| 기존 로그인·기타 서비스 | Auth Core·KPA·강의·매장 등 | 새 위임 자격은 로그인 JWT와 다름. 기존 authority를 발급/변경하지 않음. frontend 전체 타입 검사·Supplier boundary 회귀 |

Zod 소스 직접 소비처는 `rg -l "from ['\"]zod['\"]" apps packages services --glob '*.{ts,tsx}'`로 산출했다.
기타 공용 UI/role/sidebar 소스는 수정하지 않았다. Chromium 시험은 합성 세션/API 응답이며 실제 Google 인증 검증을 뜻하지 않는다.

## 3. 검증

| 검증 | 결과 |
|---|---|
| 의존 설치·workspace package build | PASS, frozen lockfile 재확인 PASS |
| API 계약·browser Origin·신규/기존 opaque proof·Supplier boundary | 5 suite, 91 PASS |
| admin 전체 Vitest | 31파일, 446 PASS |
| Neture 동의/해제·기존 MyPageHub Vitest | 3파일, 17 PASS |
| 격리 PostgreSQL 16 통합 | 24 PASS, 공식 SDK client HTTP 왕복 포함 |
| migration | baseline+기존 전체 prefix 일치, 새 up/빈 상태 down/up, fixture DB 제거 확인 |
| 신규 schema fingerprint | `4a3cdac0e841e2e089f9c48ae34ee7a78c3c3b97182a4222ffe782959b4af8f3`, 6838 lines |
| frontend 전체 type-check | PASS |
| API type-check/tsc build·main/migrate tsup | PASS |
| admin/Neture production build | PASS |
| admin/Neture desktop·mobile Chromium | 2+6=8 PASS, 합성 세션/API 응답 |
| lint·정적 guard·문서 검사 | PASS(기존 lint baseline 유지), unsafe route 0, entity registry·migration contract PASS, 변경 문서 민감정보 0 |

통합 사례에는 callback/PKCE/resource/code 재사용, 동의 시 타 공간 거부, encrypted client secret,
작업공간 동시 조회, 타 상품 차단, 실제 비공개 저장·sanitize·동시 멱등·수정 충돌,
공개 자료 변경 차단, 설명서 draft, 중지/쓰기만 중지/조회 전용 grant,
공통 약관, 관계 해제, 계정 중지, refresh 재사용 폐기, 토큰·본문 비저장, 만료/해제 정리를 포함한다.
미실행 테스트를 합산하거나 OAuth fixture를 실제 ChatGPT/Google 인증 PASS로 보고하지 않는다.
전체 lint ratchet은 기존 오류 46건 baseline 안에서 통과했다(46 errors/947 warnings).
변경 경로 focused lint는 오류 0이며 공통 securityMiddleware의 기존 미사용 import 경고 1건을 유지한다.
Vite의 기존 큰 chunk/Browserslist/Tailwind 개발 경고는 이번 기능의 실패로 처리하거나 무관하게 수정하지 않았다.

재현 명령:

```text
pnpm --filter @o4o/api-server build
node scripts/dev/run-external-ai-fixture.mjs
pnpm --filter @o4o/admin-dashboard exec vitest run
pnpm exec vitest run --config services/web-neture/vitest.config.mjs <관련 테스트 경로>
pnpm --filter @o4o/admin-dashboard exec playwright test external-ai-connections.spec.ts --project chromium --workers 1
pnpm --filter @o4o/web-neture exec playwright test --config playwright.external-ai.config.ts
```

DB fixture는 고정 loopback 포트 55449의 테스트 전용 PostgreSQL과 전용 role을 요구한다.
이미 존재하는 fixture DB를 재사용·삭제하지 않으며 생성 marker가 같은 DB만 종료 시 제거한다.
Playwright 기본 browser가 없으면 `O4O_TEST_CHROMIUM_PATH`로 설치된 Chromium 경로를 지정한다.

## 4. 운영 적용 조건 — 이번에는 실행하지 않음

1. 통합 담당이 PR·CI·review·병합을 진행하고 신규 migration 1개(6개 테이블·인덱스)를 별도로 검토한다.
   기존 콘텐츠·계정·역할 데이터 backfill은 없다. 빈 상태 이외의 down은 삭제를 거부한다.
2. 승인된 표준 migration/배포 절차로 운영에 적용한다. API와 admin, Neture 웹이 변경 대상이다.
3. API 환경에 canonical `EXTERNAL_AI_ISSUER_URL`, `EXTERNAL_AI_WEB_ORIGIN`, connector의 exact
   `EXTERNAL_AI_REDIRECT_URIS`, 별도 지속 보관 Secret `EXTERNAL_AI_CREDENTIAL_KEY`를 연결한다.
   키 값은 생성·보관 담당의 Secret 저장소에서 관리하고 문서/채팅/Git에 기록하지 않는다.
   개발 admin origin은 선택 `EXTERNAL_AI_ADMIN_ORIGIN`으로 지정한다. production 기본은 admin 도메인이다.
4. 관리자 외부 연결 기본 OFF를 유지하고, 실제 ChatGPT 계정의 MCP 지원 조건·Google 로그인·동의·저장·해제를 시험한다.
   개발용 연결과 일반 사용자 공개 배포/앱 심사는 별개다. 이번에는 공개 앱 등록·외부 AI 호출·운영 업무 데이터를 만들지 않았다.
5. 실제 외부 전달 범위와 운영 고지, 연결 만료/재동의 안내를 확인한 뒤 검증된 공급자 기능만 활성화한다.

연결·refresh는 최대 30일, access는 최대 15분, pending은 10분, code는 5분이다.
자격은 만료·해제 시 즉시 사용을 거부하며 저장된 만료 행은 모듈 정리에서 제거한다.
정리 함수는 API가 살아 있는 동안 시간별 실행된다. Cloud Run 유휴/scale-to-zero에서 별도 주기 작업 보장이
필요하면 기존 운영 retention 실행 경로와 함께 검토한다. 외부 도구 오류 메타는 기존 AI 메타 1년 기준을 따른다.

## 5. 문서 정합·인계

기준 문서 2곳의 직접 연결 금지 표현을 사용자 승인 범위로 정렬했다. 기존 복사/붙여넣기와 내부 LLM 제한,
역할·게시 책임은 유지한다. Supplier 이전 작성 보조 WO는 과거 계획으로 보존하고 이번 설계/TODO를 별도로 연결한다.
`docs/CANONICAL-INDEX.md`, FROZEN Supplier 본문, 기존 WO 이력을 임의 재작성하지 않았다.

WORKTREE_DISPOSITION

```text
worktree: /workspace/o4o-wt/external-ai-content-connection
branch: wo/external-ai-content-connection
base: 7dc02646dab2808258133139b3ca0714ec3cc14b
main integration: 미실행 / CI: PR 미생성으로 미실행
deployment: 미실행 / production DB: 미변경
smoke: 로컬 fixture만, 실제 Google·ChatGPT 미실행
verdict: KEEP — push 후 통합·운영 확인 및 후속 수정에 필요
```
