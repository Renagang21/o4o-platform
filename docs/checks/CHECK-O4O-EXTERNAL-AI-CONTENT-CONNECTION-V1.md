# CHECK-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

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
| BusinessForumPage | 약국/드럭스토어형 약국 공통 앱의 사업 게시판 | 기존 초안 검토·게시, 기존 글 ID 유지 |
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
| 약국/드럭스토어형 약국 공통 사업 게시판 | 1파일, 9 PASS |
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
2. 승인된 표준 migration/배포 절차로 운영에 적용한다. API·admin·Neture·Store·약국/드럭스토어형 약국 공통 웹·협동조합 웹이 변경 대상이다.
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
API 164건, Store 6건, 약국 사업 게시판 9건, 조합 16건을 재검증했다. Store·약국/드럭스토어형 약국·조합 웹 build와
Store desktop/mobile 브라우저 2건도 통과했다. 로컬 PostgreSQL 통합 40건 및 테스트 데이터 삭제를 확인했다.

PR의 Codex 지적 2건을 보완했다.

- 공개 등록: SDK에 이미 IP당 시간당 20회 제한이 있음을 확인했고, 이를 명시하면서 기존 trusted-client-IP를
  사용했다. DB 전역 1,000개/시간당 신규 100개 저장 상한과 동시 요청 lock을 추가했다.
- 공통 내 계정: CarePharm·www의 정확한 Origin을 추가하여 해당 호스트에서도 연결 해제가 가능하다.
- main 통합 영향 확인 중 약국·드럭스토어형 약국 초안 URL을 현재 사업 서브도메인의 기존 편집 route로 정렬했다.

보완 후 API compile, 관련 Jest 18건(공통 계정 Origin 6곳의 허용·유사 도메인 거부 포함), 변경 코드 lint가
통과했다. PostgreSQL/공식 SDK 통합은 기존 40건에 등록 429·동시 전역 상한·시간당 상한을 더해 **43건 PASS**다.
기존 사업 게시판 사례에서 약국·드럭스토어형 약국 실제 결과 URL을 함께 확인했다. fixture DB 0개를 확인했다.
운영 DB·실제 외부 연결은 아직 변경하지 않았다. 병합/배포의 최종 상태는 PR 및 통합 완료 보고에서 확인한다.

재리뷰의 인증 전 `/authorize` 저장 상한 지적도 보완했다. SDK의 기존 IP당 15분 100회 제한을 명시하고,
DB 전역 pending 1,000개/client별 100개의 상한과 만료 pending 회수를 같은 lock/transaction에 적용했다.
compile·변경 lint 및 공식 HTTP 429/추가 저장 없음·client별 상한/만료 회수·두 provider의 마지막 슬롯
동시 요청을 검증했다. 기존 사례를 포함한 격리 DB/SDK **46건 PASS**, fixture DB 0개를 확인했다.

후속 재리뷰 2건도 반영했다. 사용자 연결 해제와 전역 설정 변경의 Origin guard를 분리해 관리자 PUT은
admin Origin에서만 허용한다. 드럭스토어형 약국의 사업 콘텐츠 편집 링크도 해당 사업 호스트로 반환한다.
관련 Jest는 관리자/계정 Origin 분리를 포함하여 **25건 PASS**, compile·변경 lint PASS다. DB 통합 46건에서
사업 콘텐츠와 게시판 양쪽의 약국/드럭스토어형 약국 결과 URL을 확인했다.

CI `39751638821`의 웹 job에서 기존 `consultation-speech.test.tsx` 47행의 음성 텍스트 단언 실패를 확인했다.
이번 변경에 포함하지 않은 파일이다. 로컬에서 동일 Store 전체 테스트 **63파일/765건 PASS**를 확인했으며
이 파일을 임의 수정하거나 검증 gate를 완화하지 않았다. 후속 최종 커밋의 CI에서 전체를 다시 확인한다.

추가 재리뷰의 MCP 요청·저장량 상한도 적용했다. IP/검증한 연결별 HTTP 제한, DB의 연결별/사용자별 24시간
저장 상한, 재시도 비차감, 동일 사용자의 동시 저장 직렬화 및 최근 오류 1,000개 보관을 검증했다.
HTTP 반복 검증에서 잘못된 토큰의 한국어 오류가 `WWW-Authenticate` 헤더를 깨뜨리는 SDK 접점도 확인해
프로토콜 오류 문구만 ASCII로 수정했다. 실제 401 응답·헤더와 IP/연결별 429를 확인했다.
API compile·변경 lint와 전체 PostgreSQL/공식 SDK 통합 **50건 PASS**다. 신규 migration은 추가하지 않았다.
직전 최종 CI `39753053319`의 Store 테스트/웹 빌드는 PASS이며 최종 보완 HEAD에서 CI를 다시 확인한다.

후속 지적의 연결 해제/cleanup 후 사용자 저장 상한 초기화도 수정했다. 최근 요청 기록이 남은 해제/만료
연결의 최소 부모 행만 기록 만료까지 유지하고, 해당 자격은 cleanup에서 제거한다. 사용자 상한은 해제 연결의
최근 요청도 포함한다. 실제 DB에서 세 연결의 저장 상한 도달 → 해제 → cleanup → 새 연결 저장 거부 →
요청 기록 만료 → cleanup → 부모 행 삭제/정상 저장 회복을 확인했다. 전체 통합 **50건 PASS**, compile·lint PASS다.

## 7. 운영 활성화·실제 ChatGPT 연결 검증 (2026-10-23)

- **배포**: PR #775(운영 활성화)·#778(MCP 결과 `structuredContent` 동시 반환)을 merge 했다. #765(KPA 정리, auth-backend LEVEL_3)가
  선행 포함되어 Delivery 가 `HELD_LEVEL_3` 로 판정했고, 기존 promote 실행으로 `5a6ab8f23` 가 반영되었다. 서빙 revision 의
  commit label 일치·Ready·트래픽 100%, MCP 무인증 401·PRM 200 을 확인했다.
- **관리자 설정**: 외부 AI 연결 사용·ChatGPT 연결 허용·약국 자료 조회·약국 초안 저장·수정 = 켬. 나머지 범위는 끔.
- **실제 ChatGPT 연결(약국 경영자 Demo 계정, 사용자가 직접 Google/이메일 로그인)**
  - 동의 화면에서 작업공간·권한 선택 → 연결 생성. `list_workspaces`·`search_products`·`get_product_context`·`list_materials`·`get_material` PASS.
  - `get_material` 이 ChatGPT 에서 `{}` 로 전달되던 문제는 #778 반영 후 키·title 정상 확인(PASS).
  - 동의하지 않은 다른 매장 작업공간 지정 → `WORKSPACE_FORBIDDEN` (격리 PASS).
  - 초안 권한으로 재연결 후 `save_content_draft` → `update_content_draft`(revision 갱신) → `get_content_draft` 일치 PASS.
    `openUrl` 로 O4O 매장 제작 자료 편집 화면에서 제목·수정 본문을 확인했다(비공개 상태).
  - O4O 계정 설정에서 연결 해제 → 두 연결 모두 `revoked_at` 기록, 이후 ChatGPT 도구 호출 실패·토큰 갱신 400 (차단 PASS).
- **테스트 자료**: 시험 초안 1건과 저장 요청 기록 2건을 사용자 승인 후 id·조직·제목 조건으로 삭제했다. 잔존 0건 확인.
  해제된 연결 2건은 감사 기록으로 유지한다.
- **관찰된 후속 후보(이번 범위 외)**
  1. 권한별 도구 등록 때문에 쓰기 권한 재연결 후 ChatGPT 에서 "도구 새로 고침"이 필요했다 — 쓰기 도구는 항상 등록하고 호출 시 권한으로 거부하는 방식 검토.
  2. ChatGPT "다시 연결"은 새 연결을 만들고 이전 연결을 해제하지 않는다 — 같은 client 재연결 시 이전 연결 정리 검토.
  3. 연결 해제 후 ChatGPT 에 구체 오류 코드 대신 "failed internally" 가 표시된다(토큰 갱신 400).
  4. 동의 화면에서 로그인하면 동의 화면이 아닌 매장 홈으로 이동한다.
- **앱 공개 등록**: 등록안은 작성했고 공개 제출은 하지 않았다. 개발자 인증·도메인 확인 토큰·심사용 계정·시연 영상·로고·지원 연락처는 사용자 확인 대상이다.

## 8. 후속 보완 — 동의 복귀·권한/해제 응답·재연결·등록 자료·설명 불일치 조사 (2026-10-23)

Branch: `wo/external-ai-connection-followup` (기준 main `825e6b4500`). 운영 배포·DB write 없음.

| §7 후속 후보 | 원인 | 조치 |
|---|---|---|
| 4. 동의 화면 로그인 후 매장 홈 이동 | 이메일·Google 로그인은 `returnUrl` 로 복귀했으나 **Demo 로그인**이 `returnUrl` 을 무시하고 역할별 착지(매장 handoff)로 이동 | `LoginModal` Demo 경로도 `returnUrl`(`/workspace/` 제외) 우선. 지정이 없을 때 기존 Demo 착지 불변 |
| 1. 권한 변경 후 도구 새로 고침 필요 | 쓰기 도구를 연결 범위에 따라 등록 → 재연결로 권한이 바뀌어도 클라이언트의 기존 목록에 쓰기 도구 없음 | 8개 도구 항상 등록. 권한 없는 쓰기 호출은 기존 실행 검사가 `SCOPE_FORBIDDEN` + 재연결 안내로 거부 |
| 3. 해제 후 "failed internally" | 해제·만료 연결의 토큰 갱신이 `invalid_token`(토큰 endpoint 오류 코드 아님) 400 으로 응답. 도구 실행 중 해제는 일반 실패 코드 | code·refresh 교환은 `invalid_grant` 로 응답(재연결 유도). 실행 중 해제·만료는 `CONNECTION_REVOKED`(401) + 재연결 안내. MCP bearer 는 기존 401 `invalid_token` 유지 |
| 2. 다시 연결 시 이전 연결 잔존 | 재연결이 새 연결만 만들고 이전 연결 정리 경로 없음. 같은 앱이라도 다른 AI 계정의 정상 복수 연결이 있을 수 있어 자동 해제는 부적합 | 동의 화면이 같은 사용자·같은 앱의 활성 연결 수를 보여 주고 "이전 연결을 이 연결로 바꾸기"(기본 선택) 를 묻는다. 선택 시에만 같은 transaction 에서 같은 사용자·같은 client 의 이전 연결 해제. 다른 앱·다른 사용자·유지 선택은 불변. 계정 설정 목록에 연결 시각 표시 |

### 8-1. 검증

| 검증 | 결과 |
|---|---|
| DB fixture(로컬 test 전용 PostgreSQL · 실제 OAuth/MCP 경로) `node scripts/dev/run-external-ai-fixture.mjs` | PASS 54줄(신규 4: 읽기 연결의 도구 8개 노출+`SCOPE_FORBIDDEN` · 해제 시 refresh `invalid_grant`/MCP 401/도구 `CONNECTION_REVOKED` · 만료 시 refresh `invalid_grant` · 같은 client 재연결 교체/유지/타 client·타 사용자 불변), fixture DB 정리 0 |
| web-neture 전체 Vitest | 1275 중 1274 PASS. 실패 1건은 `demoAccounts.test` 의 소스 전수 스캔 5초 timeout(D: worktree 디스크) — 단독 재실행 시 timeout 연장으로 4/4 PASS(10.8s), 코드 문제 아님 |
| LoginModal · 동의 화면 · 연결 카드 집중 테스트 | 신규 Demo 복귀 2건 · 기존 연결 교체/유지 2건 · 첫 연결 1건 포함 PASS |
| API 외부 AI jest (`src/modules/external-ai` · opaque-fields) | 단독 재실행 5 suite 45/45 PASS. 최초 실행은 web 전체 테스트와 동시 실행 중 2 suite 실패로 집계됐으나 상세 로그를 남기지 못해 원인 미확인 — 재실행 결과만 근거로 한다 |
| type-check | api-server · web-neture 0 오류 |
| 변경 파일 ESLint | 0 오류 |

실제 ChatGPT 재연결·도구 새로 고침 체감은 배포 후 실계정으로만 확인할 수 있다 — 이번에는 미실행.

### 8-2. 헤모텐캡슐 설명 불일치 — 원인 (운영 DB read-only, 사용자 승인 후)

- 상품 정본: 헤모텐캡슐 master 2건(바코드별, 제조사 A). 검증 매장 진열은 그중 1건을 가리킨다 — 진열·검색 ID 매핑은 정상.
- 참조 자료: 두 master 의 canonical 설명(ko `mfds_easy_drug` 08-05 · en `mfds_drug_otc_nutrition_combo` 08-07)이 제목만 헤모텐캡슐이고 **본문 개요·효능은 다른 품목(훼로바프리미엄캡슐, 제조사 B)의 e약은요 원문**이다. 07-22 의 이전 설명(deprecated)은 정상이었다.
- 근본 원인: 두 master 의 `product_identifiers` `MFDS_CODE` 가 다른 품목(훼로바프리미엄캡슐)의 품목기준코드로 연결되어 있다. easy-drug 렌더는 master→`MFDS_CODE`→e약은요 원문 순으로 원문을 고르므로 다른 품목 원문이 정본 설명이 되었고, `get_product_context` 가 그대로 전달해 ChatGPT 결과도 틀어졌다. 외부 AI 코드 결함이 아니다.
- 범위 추정: 품목코드 하나에 제조사 2곳 이상의 master 가 연결된 경우 4,899 코드·32,990 master. 위탁제조 등 정상 사례가 섞여 있어 그대로 오류 수는 아니다. 본문 제품명 ≠ master 상품명 표본에서도 성분 유사 타 품목(예: 같은 성분 다른 브랜드) 사례가 확인됐다.
- 생성 결과: 시험 초안은 §7 에서 삭제되어 원문 대조는 위 정본 설명 기준으로 했다.
- **후속(별도 WO · 운영 write 승인 필요)**: `MFDS_CODE` 연결 재검증(본문 제품명·제조사·바코드 교차) → 잘못 연결된 master 의 canonical 설명 회수/재생성. 그 전까지 외부 AI 제출 심사 자료의 의약품 설명 사용은 주의.

### 8-3. 앱 등록 자료

`apps/api-server/src/modules/external-ai/submission/` — `chatgpt-app-submission.json`(앱 정보 · 도구 8개 hint·근거 · 시험 5/부정 3) · `app-submission-draft.md`(양식 항목 · 사용자 확인 항목 · 심사 점검). 원래 로컬 `app-submission-draft.md` 는 이 PC 에서 찾지 못해 코드 기준으로 새로 작성했다. 공개 제출 미실행.

## 9. 운영 실제 ChatGPT 최종 실사용 검증 (2026-10-24)

- **대상 배포**: §8 보완은 PR #785(`1bbf7fd4fd`)로 반영. 검증 시점 서빙은 API `1c6374083f` · Neture web `0d0d878a19`로 둘 다 `1bbf7fd4fd`를 포함하고, 이후 외부 AI 코드 변경은 없다. 추가 코드 수정·배포 없음.
- **방법**: 담당자가 시험 전용 Chrome 프로필을 CDP로 직접 조작했다. ChatGPT·Google 로그인만 사용자가 했다. DB 확인은 read-only 채널로 했다.
- **검증 범위**: Google 계정으로는 로그인·동의 화면 복귀만 확인했다. 그 계정은 소속 약국이 0건이라 작업공간이 없다. 나머지 기능은 매장 경영자 Demo 계정(테스트 약국)으로 확인했다.
  **실제 약국이 연결된 Google 계정의 전체 흐름은 검증하지 않았다.**
  다른 약국 대조에는 Demo 계정이 소속되지 않은 KPA 매장 하나를 썼다.

| 항목 | 결과 |
|---|---|
| Google 로그인 후 동의 화면 복귀 | PASS — 같은 `request` 동의 화면 복귀. 계정에 약국이 없어 "연결할 수 있는 작업공간이 없습니다" 표시(정상) |
| Demo 로그인 후 동의 화면 복귀 | PASS — 같은 동의 화면, 작업공간 표시 |
| 읽기 연결의 도구 노출·쓰기 거부 | PASS — 도구 8개 노출, `save_content_draft` → `SCOPE_FORBIDDEN` + 재연결 안내 |
| 쓰기 권한 재연결 후 도구 새로 고침 없이 저장·수정 | PASS — 같은 채팅에서 save → update(revision 갱신) → get 일치 |
| O4O 편집 화면 확인 | PASS — `openUrl` → 로그인 후 제작 자료 편집 화면 복귀, 수정 제목·본문 표시, 비공개(사용처 없음) |
| 재연결 시 이전 연결 유지 | PASS — 선택 해제 시 이전 연결 활성 유지(2개 공존) |
| 재연결 시 이전 연결 교체 | PASS — 동의 화면 "기존 연결 2개" 안내, 기본 선택으로 연결 시 이전 2개가 새 연결과 같은 transaction 시각으로 해제 |
| 다른 약국 작업공간 차단 | PASS — 미소속 매장 지정 `search_products` → `WORKSPACE_FORBIDDEN`, 데이터 노출 없음 |
| 연결 해제 후 차단 | PASS — O4O 설정에서 해제 후 ChatGPT가 "연결이 만료되었습니다… 다시 연결" 안내(§7의 "failed internally" 아님) |
| 재인증 후 연결·조회 | PASS — 재연결 후 보류 요청 재개, `list_workspaces`·`get_content_draft` 성공(새 권한대로 쓰기 false) |

- **시험 자료 정리(사용자 지시 범위)**: 시험 초안 1건(id·조직·제목·출처 조건)과 저장 요청 기록 2건(연결·요청 id 조건)을 건수 검증 transaction으로 삭제했다. 잔존 0건 확인. 마지막 활성 연결은 O4O 설정에서 해제했다(활성 0).
  해제된 연결 4건·자격정보는 기존 매시간 정리(`ExternalAiOAuthProvider.cleanup`)가 지운다. 임의 SQL 삭제는 하지 않는다.
  **상태: 자동 정리 대기.** 2026-10-24 07:10 UTC read-only 기준으로 연결 4건(활성 0)·자격정보 15건이 남아 있다.
  오류 기록 2건(도구명·코드만 저장)은 1년 보존 정책대로 유지한다.
- **관찰(결함 아님)**: ChatGPT 재연결 직후 이전 응답 하나가 "이 응답을 불러오지 못했습니다"로 표시됐다. 응답 내용은 표시 전에 이미 확인했고, ChatGPT 화면 쪽 표시 현상으로 본다.
- **앱 공개 제출**: 계속 보류.

## 10. 공개 등록 준비 자료 정리 (2026-10-24)

사용자 지시로 클라우드가 할 수 있는 문서·등록 준비를 진행하고, 실제 계정·로컬 브라우저·운영 접근에 필요한 잔여 항목만 인계한다.

- PR #794와 §9의 검증 문서는 이미 main에 반영됐음을 확인했다. 같은 변경의 PR·기능 검증·운영 배포를 재실행하지 않는다.
- 공식 제출·패키지·등록 지침을 직접 읽어 현재 ZIP/plugin.json/mcp.json·OAuth DCR 설정 형식을 확인했다. 기존 등록 초안의 단일 JSON 제출 안내는 현재 준비 문서로 연결했다.
- [등록 준비 자료](../design/DESIGN-O4O-CHATGPT-PUBLIC-SUBMISSION-PACK-V1.md)에 국·영문 문안, 요청문 3개, manifest/MCP 설정 초안, 정상5·거부3 시험 사례, 합성 자료 명세, 영상 대본, 아이콘 후보·규격, 외부 연결 개인정보 안내 검토안을 작성했다.
- 공개 지원·privacy·terms 화면은 HTTP 200이었다. 공개 정책 API도 HTTP 200이지만 게시 본문에서 ChatGPT/OpenAI/외부 AI 연결 명시 문구를 확인하지 못했다. 연결 기능을 위한 고지 반영 검토가 필요하며, 정책·법적 분류를 이 작업이 확정하거나 게시하지 않는다.
- 자동 정리는 API 실행 중의 시간 간격 작업임을 코드에서 확인했다. 이 클라우드에는 GCP·운영 DB 인증이 없어 §9 시험 연결4·자격정보의 물리 삭제 완료는 확인하지 못했다. “1시간 내 반드시 삭제”로 안내하지 않고, 잔여 건수 확인은 해당 비공개 시험 식별자를 가진 로컬 담당자에게 맡긴다.
- 운영 설정·Secret·DB·MCP 도구·기능 배포는 변경하지 않았다. 실제 Google/ChatGPT 로그인·영상·아이콘 생성·ZIP 업로드·도메인 challenge 게시·심사 제출·공개 publish는 이번에 실행하지 않았다.

진행 상태와 남은 담당·완료 조건은 [공개 등록 TODO](../work-orders/TODO-O4O-CHATGPT-PUBLIC-SUBMISSION-V1.md)에 있다. 새 등록 시나리오 작성과 §9의 실제10개 PASS를 별개로 기록한다.
