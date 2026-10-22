# CHECK-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1

> 상태: ACTIVE — 개발 검증·push 인계, 운영 활성화 전
> 작성일: 2026-10-22 · 기준 main: `7dc02646dab2808258133139b3ca0714ec3cc14b`
> Branch: `wo/external-ai-content-connection`
> 최초 공급자 구현: `9b0067ef7a` push 완료. 사용자 지시에 따라 같은 branch에서 전체 작업공간을 연속 보완한다. 최종 SHA는 완료 보고에서 확인한다.
> [설계](../design/DESIGN-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md) · [TODO](../work-orders/TODO-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md)

## 1. 변경과 유지 범위

- API `modules/external-ai`에 공식 MCP SDK 기반 Streamable HTTP, OAuth code+S256 PKCE,
  client/redirect/resource 검증, 연결 동의·해제, 해시 자격·refresh 회전·재사용 차단을 구현했다.
- MCP 도구 8개: 작업공간, 상품 검색/문맥, 자료 목록/본문, 초안 생성/수정/조회.
  공급자·약국·협력사업/조합·공동/사업 커뮤니티 네 종류 모두 실제 adapter로 지원한다.
- Supplier canonical 관계, 계정 상태, 메인 가입, 공통·공급자 약관, 현재 소유·작성 자격을 재사용한다.
  연결 발급 때와 매 도구 실행 때 확인하고, 저장은 설정·연결을 잠근 동일 transaction에서 처리한다.
- 기존 자료함 비공개 document와 STORE 설명서 draft 원장을 재사용한다. HTML sanitize,
  재시도 중복 방지, 최신 revision 충돌, 검수/공개 중 자료 변경 차단을 포함한다.
- 관리자 AI 화면에 별도 외부 연결 구분, 사용·중지/기능 체크/예제 CRUD/최근 도구 오류를 추가했다.
  사용자 내 계정에 연결 해제, 기존 로그인 뒤 명시적 동의 화면을 추가했다.
- 외부 ChatGPT 모델·구독·비용·토큰·대화를 수집하지 않는다. O4O 내부 AI 실행/과금,
  소비자 공개 조회/추천, 표준 상품 자동 생성, 외부 AI의 공개/게시/검수 요청은 추가하지 않았다.
- 약국 기존 자료함·사업 콘텐츠·게시판 원장을 연결했다. 초안 결과를 기존 화면에서 열어 검토하며,
  게시판의 공개 전이는 사용자가 기존 화면의 게시 버튼을 눌렀을 때만 요청한다.

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
전체 보완에서도 공용 role/sidebar/Core 소스는 수정하지 않았다.

| 전체 보완 변경 | 소비처 | 영향/확인 |
|---|---|---|
| adapter registry·동의/실행 라우팅 | 모든 MCP 요청·OAuth 동의·내 연결 목록 | 종류+UUID 격리, 종류별 중지, 기존 Supplier UUID 호환, 38개 DB/MCP 사례 |
| StoreAdapter | 기존 Store owner/staff resolver, 취급상품 조회, 자료함 create/update | 기존 함수에 transaction 주입. 원 함수/기존 API 계약 무변경. 실제 원장 저장·직원/경영자 회수·다른 매장 차단 |
| OrganizationAdapter | 사업/조합 운영 관계·기존 콘텐츠 서비스 | 기존 scoped 권한 및 draft 저장, 게시/검수/공급자 handoff 보호 |
| CommunityAdapter | 독립/사업 커뮤니티 resolver·forum_post 원장 | 가입/폐쇄 게시판·작성자별 격리, 게시판 UUID별 동의, 새 역할/원장 없음 |
| ForumWritePage / forumApi | Neture 번들의 공동·CarePharm·기존 forum 작성 UI | draft에서만 명시적 publish 전이. 게시글 수정 동작 유지. HTML 형식 보존 |
| BusinessForumPage | 약국/메가팜 공통 앱의 사업 게시판 | 기존 초안 검토·게시, 기존 글 ID 유지 |
| MemberForum | 조합별 회원 게시판 | 로그인 사용자 ID를 통한 본인 초안 편집 UI, 서버는 기존 작성자 검증. 다른 조합 권한 부여 없음 |
| Store App 신규 진입 | 내 매장 단일 앱·기존 편집기 | 접근 목록 안에서만 지정 매장 선택. desktop/mobile 실제 route smoke |
| ForumPostController 일반 목록/상세·최초 게시 시각 | generic forum 및 service-forum router 전체(독립/사업 커뮤니티·KPA·펀딩 등), admin/operator의 별도 검수 경로는 유지 | draft는 작성자만 조회. 기존 공지/내 글/서비스 경계 회귀 73건과 실제 DB 확인. enum·역할·Core 스키마 무변경 |
| 동의/MySettings | 기존 Neture 계정 설정 | 종류 표시, 계정 전환 시 선택/목록 초기화. 기존 로그인 방식 유지 | Chromium 시험은 합성 세션/API 응답이며 실제 Google 인증 검증을 뜻하지 않는다.

## 3. 최초 공급자 검증 기록 (전체 보완 결과는 §3-1)

| 검증 | 결과 |
|---|---|
| 의존 설치·workspace package build | PASS, frozen lockfile 재확인 PASS |
| API 계약·browser Origin·신규/기존 opaque proof·Supplier boundary | 5 suite, 91 PASS |
| admin 전체 Vitest | 31파일, 446 PASS |
| Neture 동의/해제·기존 MyPageHub Vitest | 3파일, 17 PASS |
| 격리 PostgreSQL 16 통합 | 24 PASS, 공식 SDK client HTTP 왕복 포함 |
| migration | baseline+기존 전체 prefix 일치, 새 up/빈 상태 down/up, fixture DB 0개·이번 임시 컨테이너 제거 확인 |
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

## 3-1. 전체 작업공간 보완 — 최종 검증

사용자의 “작업을 나누지 말고 한번에” 지시에 따라 같은 branch에서 공급자 외의 세 공간까지 구현했다.
이전 커밋의 준비 상태 표시는 실제 adapter로 대체했다. 운영 설정 기본 OFF·외부 계정 미검증 경계는 그대로다.

| 검증 | 실제 결과 |
|---|---|
| API 입력·OAuth·Origin·Supplier 및 포럼 공유 경계 | 11 suite, 164 PASS |
| admin 전체 Vitest | 31파일, 446 PASS |
| Neture 동의/계정 전환/해제/초안 검토/기존 자료 복사·MyPage | 5파일, 24 PASS |
| Store 진입·기존 매장 선택 | 2파일, 6 PASS |
| 약국/메가팜 공통 사업 게시판 | 1파일, 9 PASS |
| 조합 게시판·기존 앱 | 2파일, 16 PASS |
| 격리 PostgreSQL + 공식 SDK OAuth/HTTP/MCP | 40 PASS (최초 24건 포함, 중복 합산하지 않음) |
| browser desktop/mobile | admin 2 + Neture 8 + Store 2 = 12 PASS |
| 타입·빌드 | frontend 전체 타입, API 타입/tsc, API main/migrate bundle, admin·Neture·Store·약국 공통·조합 웹 build PASS |
| 정적 검사 | unsafe route 1307파일/위반 0, entity registry 기존 동결 3건 외 불일치 0, migration contract 21 PASS |
| migration/데이터 정리 | 기존 37 incremental 전체 fingerprint 일치, 테스트 DB 0개 확인·전용 tmpfs 컨테이너 제거 |

새 사례는 네 종류의 동의/선택/저장처 격리, 바코드 없는 매장 상품, 타 매장 상품 차단,
약국 기존 자료함 저장·멱등·충돌·QR 참조 보호, 사업 draft·공급자 수신 자료 보호,
독립/사업/조합 게시판, 다른 작성자 draft 차단, 폐쇄 게시판·독립 서비스 정지,
직원·사업 운영자·조합 운영자의 현재 권한 회수, 종류별 관리자 중지를 포함한다.

**발견·수정:** 기존 ForumPostController의 명시적 status 목록/상세 조회가 draft 작성자를 제한하지 않았다.
공통 일반 조회에서 draft를 작성자에게만 허용하도록 보완했다. 포럼 query/recommendation/home 조회는
이미 published 조건을 사용하며, 운영 삭제 점검의 건수 조회는 본문 공개가 아니므로 변경하지 않았다.
독립/사업 커뮤니티·서비스 포럼·일반 포럼 mount, 내 글·고정 공지·작성 경계의 기존 회귀를 함께 실행했다.
이 변경은 새 역할이나 운영자 예외 개입을 추가하지 않는다. 다른 상태의 기존 검수 흐름은 유지한다.

40건 중 일반 게시판 검증은 기존 controller에 fixture repository를 주입하여 실제 PostgreSQL로 실행한다.
타인/익명 draft 조회 거부 → 본인 조회·수정 → 본인의 기존 게시 API 실행 → 게시 시각 기록 →
외부 도구 수정 차단을 확인했다. 폐쇄 게시판·서비스 가입 판정은 별도 MCP 사례에서 실제 resolver로 검증했다.
일반 상세 조회의 조회수 갱신이 수정 충돌을 일으키지 않도록 게시글 revision은 본문/제목/상태/잠금 기준이다.
브라우저는 실제 앱/편집기를 사용하되 합성 인증·API 응답이며 실제 Google·ChatGPT 연결 검증으로 보고하지 않는다.

추가 재현 명령:

```text
pnpm exec vitest run --config services/web-store/vitest.config.mjs <관련 테스트 경로>
pnpm exec vitest run --config services/web-kpa-society/vitest.config.mjs <관련 테스트 경로>
pnpm exec vitest run --config services/web-pharmacy-coop/vitest.config.mjs <관련 테스트 경로>
pnpm --filter store-web exec playwright test --config playwright.external-ai.config.ts
```

전체 frontend 타입 검사에서 발견한 미사용 import는 제거했고 재실행 PASS다.
새 Store 진입 컴포넌트의 hook 경고도 제거했다. 최종 변경 경로 lint는 오류/경고 0건이며, 전체 ratchet은 기존 46 errors/947 warnings baseline으로 통과했다. 운영 DB·계정·기존 상품/권한 원장은 변경하지 않았다.

## 4. 운영 적용 조건 — 이번에는 실행하지 않음

1. 통합 담당이 PR·CI·review·병합을 진행하고 신규 migration 1개(6개 테이블·인덱스)를 별도로 검토한다.
   기존 콘텐츠·계정·역할 데이터 backfill은 없다. 빈 상태 이외의 down은 삭제를 거부한다.
2. 승인된 표준 migration/배포 절차로 운영에 적용한다. API·admin·Neture·Store·약국/메가팜 공통 웹·협동조합 웹이 변경 대상이다.
3. API 환경에 canonical `EXTERNAL_AI_ISSUER_URL`, `EXTERNAL_AI_WEB_ORIGIN`, connector의 exact
   `EXTERNAL_AI_REDIRECT_URIS`, 별도 지속 보관 Secret `EXTERNAL_AI_CREDENTIAL_KEY`를 연결한다.
   키 값은 생성·보관 담당의 Secret 저장소에서 관리하고 문서/채팅/Git에 기록하지 않는다.
   개발 admin origin은 선택 `EXTERNAL_AI_ADMIN_ORIGIN`으로 지정한다. production 기본은 admin 도메인이다.
4. 관리자 외부 연결 기본 OFF를 유지하고, 실제 ChatGPT 계정의 MCP 지원 조건·Google 로그인·동의·저장·해제를 시험한다.
   개발용 연결과 일반 사용자 공개 배포/앱 심사는 별개다. 이번에는 공개 앱 등록·외부 AI 호출·운영 업무 데이터를 만들지 않았다.
5. 실제 외부 전달 범위와 운영 고지, 연결 만료/재동의 안내를 확인한 뒤 네 종류 모두 실제 서비스 계정·역할·저장 결과를 확인한 뒤 관리자가 필요한 대상만 활성화한다.

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
smoke: 로컬 DB/MCP 40건·desktop/mobile 12건, 실제 Google·ChatGPT 미실행
uncommitted/untracked: 최종 commit 후 작업 범위 0건 확인
other session usage: 이 전용 worktree는 본 작업만 사용
branch-only commits: 공급자 구현 + 전체 작업공간 연속 보완, main 미병합
verdict: KEEP — push 후 통합·운영 확인 및 후속 수정에 필요
```

개발 중 read-only fetch에서 main이 최초 `efcf96ec28`, push 직전 `05f63d8865`까지 이동한 것을 확인했다. 개발 branch를 자동 merge/rebase하지 않았으며, 통합 담당은 최신 main 기준으로 소비처 변경을 함께 재검증한다. 다른 worktree는 수정하지 않았다.

## 6. 사용자 통합 지시 후 추가 검증 (2026-10-22)

이후 사용자가 main 병합·배포를 지시하여 이 공간에서 PR #766을 생성했다. 앞 절은 개발 push 당시 기록이다.
최신 main `05f63d8865`를 merge한 `6b11fc1956`에서 API build, 전체 frontend 타입, 관리자 446건,
API 164건, Store 6건, 약국 사업 게시판 9건, 조합 16건을 재검증했다. Store·약국/메가팜·조합 웹 build와
Store desktop/mobile 브라우저 2건도 통과했다. 로컬 PostgreSQL 통합 40건 및 테스트 데이터 삭제를 확인했다.

PR의 Codex 지적 2건을 보완했다.

- 공개 등록: SDK에 이미 IP당 시간당 20회 제한이 있음을 확인했고, 이를 명시하면서 기존 trusted-client-IP를
  사용했다. DB 전역 1,000개/시간당 신규 100개 저장 상한과 동시 요청 lock을 추가했다.
- 공통 내 계정: CarePharm·www의 정확한 Origin을 추가하여 해당 호스트에서도 연결 해제가 가능하다.
- main 통합 영향 확인 중 약국·MegaPharm 초안 URL을 현재 사업 서브도메인의 기존 편집 route로 정렬했다.

보완 후 API compile, 관련 Jest 18건(공통 계정 Origin 6곳의 허용·유사 도메인 거부 포함), 변경 코드 lint가
통과했다. PostgreSQL/공식 SDK 통합은 기존 40건에 등록 429·동시 전역 상한·시간당 상한을 더해 **43건 PASS**다.
기존 사업 게시판 사례에서 약국·MegaPharm 실제 결과 URL을 함께 확인했다. fixture DB 0개를 확인했다.
운영 DB·실제 외부 연결은 아직 변경하지 않았다. 병합/배포의 최종 상태는 PR 및 통합 완료 보고에서 확인한다.

재리뷰의 인증 전 `/authorize` 저장 상한 지적도 보완했다. SDK의 기존 IP당 15분 100회 제한을 명시하고,
DB 전역 pending 1,000개/client별 100개의 상한과 만료 pending 회수를 같은 lock/transaction에 적용했다.
compile·변경 lint 및 공식 HTTP 429/추가 저장 없음·client별 상한/만료 회수·두 provider의 마지막 슬롯
동시 요청을 검증했다. 기존 사례를 포함한 격리 DB/SDK **46건 PASS**, fixture DB 0개를 확인했다.

후속 재리뷰 2건도 반영했다. 사용자 연결 해제와 전역 설정 변경의 Origin guard를 분리해 관리자 PUT은
admin Origin에서만 허용한다. MegaPharm의 사업 콘텐츠 편집 링크도 해당 사업 호스트로 반환한다.
관련 Jest는 관리자/계정 Origin 분리를 포함하여 **25건 PASS**, compile·변경 lint PASS다. DB 통합 46건에서
사업 콘텐츠와 게시판 양쪽의 약국/MegaPharm 결과 URL을 확인했다.

CI `39751638821`의 웹 job에서 기존 `consultation-speech.test.tsx` 47행의 음성 텍스트 단언 실패를 확인했다.
이번 변경에 포함하지 않은 파일이다. 로컬에서 동일 Store 전체 테스트 **63파일/765건 PASS**를 확인했으며
이 파일을 임의 수정하거나 검증 gate를 완화하지 않았다. 후속 최종 커밋의 CI에서 전체를 다시 확인한다.
