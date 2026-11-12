# CLAUDE.md — Claude Code 진입점

> **저장소 공통 실행 규칙은 [`AGENTS.md`](AGENTS.md) 가 정본이며 아래에서 그대로 가져온다.**
> 이 파일에는 **Claude Code 전용 내용**(세션 유형 · 도구 · 권한 설정 · 커맨드)과 소스가 참조하는 **§ 번호 호환 앵커**(부록 A)만 둔다.
> 공통 규칙을 바꿀 때는 `AGENTS.md` 를 고치고 이 파일에 다시 쓰지 않는다. Codex / 일반 에이전트는 `AGENTS.md` 만 읽는다.
>
> **§ 번호(§0~§16, §13-A)는 고정이다.** 소스 주석 · CI 메시지 · 기준 문서가 `CLAUDE.md §N` 으로 참조한다. 부록의 번호·순서를 바꾸지 않는다.

@AGENTS.md

---

# Claude Code 전용

## 세션 시작 규칙
- 세션 시작 시 HANDOFF.md가 있으면 먼저 읽을 것
- 진행 상황은 CLAUDE.md가 아니라 HANDOFF.md에 기록할 것
- 시작 · 종료 절차는 `/start` · `/handoff` 스킬(`.claude/skills/`)을 따른다. 작업 세션은 commit · push · 인계 기록까지 하고, PR 생성 · 병합 · 배포는 통합 세션 · 통합 담당만 한다 — `AGENTS.md` §4 역할 · §4-1(e).
- 그 밖의 스킬: `/wo-new`(지시서 작성 · 인계) · `/db-readonly`(로컬 전용 운영 DB 조회) · `/verify`(변경 범위 검증) · `/integrate`(통합 세션으로 지정된 PR 만 — `AGENTS.md` §4 역할) · `/worktree-cleanup`(merge 후 정리). 스킬은 규칙을 복사하지 않고 `AGENTS.md` · 정본 절을 가리킨다.
- SessionStart 훅(`.claude/hooks/session-start.mjs`)이 `origin/main` 을 fetch 하고, **clean 한 기준 main checkout 에서만** `pull --ff-only` 한다. 작업 branch · worktree 에서는 ahead/behind 만 보고하며 merge/rebase 하지 않는다. 이 세션 유형(`실행 위치`)의 최근 미완료 지시서도 알려 준다.
- PreToolUse 훅(`.claude/hooks/block-cloud-deploy.mjs`)은 운영 배포 명령을 **클라우드 세션에서는 거부**하고, **로컬 세션에서는 승인을 묻는다**(ask). 단 승인 창이 뜨지 않는 권한 모드(auto · bypassPermissions · dontAsk · 알 수 없음)에서는 **훅이 OS 확인 대화상자를 직접 띄운다**(Windows 예/아니요 · 기본 '아니요' · 항상 위 · 120초 무응답 시 거부) — 사람이 '예'를 누르면 allow, 아니요 · 무응답 · 대화상자를 띄울 수 없음(Linux 등)은 deny. `.claude/settings.json` 의 ask 규칙도, 훅이 반환한 ask 도 auto 모드에서는 승인 창 없이 통과하는 것이 확인됐다(2026-11-09). 판정은 `.claude/hooks/lib/shell.mjs` `approvalFor` 를 아래 `guard-ask-commands.mjs` 와 같이 쓴다. 테스트는 `O4O_HOOK_CONFIRM_DIALOG=off` 로 대화상자를 끈다(이 변수로 승인을 만들 수는 없다). 회귀 테스트 `.claude/hooks/block-cloud-deploy.test.mjs`. 정책은 `AGENTS.md` §9.
- PreToolUse 훅(`.claude/hooks/guard-git-push.mjs`)은 **모든 세션에서** 콜론 refspec 원격 branch 삭제를 거부한다. permission 패턴은 끝이 `:*` 이면 예전 접두어 문법으로 해석돼 의도대로 매칭되지 않으므로, 새 규칙을 `:*` 로 끝내지 않는다(`pnpm run build:*` 처럼 접두어 일치가 의도인 경우만 예외).
- PreToolUse 훅(`.claude/hooks/guard-ask-commands.mjs`)은 **모든 세션에서** `gh api` 쓰기 가능 플래그 · `node`/`pnpm` 의 migration · seed 실행 · `gh … delete` 에 승인을 묻는다(ask — 승인 창이 뜨지 않는 권한 모드에서는 위와 같이 확인 대화상자, 띄울 수 없으면 deny). settings 패턴에는 제외 문법이 없어 읽기 전용 명령까지 묻던 넓은 ask 패턴을 이 훅으로 옮겼고, 예외는 훅 상단 주석의 정확한 형태(GitHub 검색 · CI 정적 검사 · 테스트 파일 실행)뿐이다. 예외를 넓힐 때는 회귀 테스트 `.claude/hooks/guard-ask-commands.test.mjs` 에 우회 사례를 함께 넣는다.
- PreToolUse 훅(`.claude/hooks/guard-mcp-github.mjs` · matcher `mcp__github__.*`)은 위 Bash 훅이 닿지 않는 GitHub MCP 도구를 막는다 — auto-merge 거부 · main 직접 쓰기 거부 · 클라우드에서 검사 전용 workflow 밖 실행 · 재실행 · 취소 거부 · 병합은 squash + `expectedHeadSha` 필수, 클라우드 병합은 main 의 `.claude/integration-sessions.json` 등록과 보호 경로(CI · 배포 인프라 · 에이전트 안전 설정) 미변경까지 확인(조회 실패는 거부). 클라우드 MCP 토큰이 저장소 소유자 계정이라 workflow 의 소유자 게이트도 통과하므로 생긴 훅이다(2026-11-12). 회귀 테스트 `.claude/hooks/guard-mcp-github.test.mjs`. 정책은 `AGENTS.md` §4 역할 · §9.
- 플러그인: 클라우드는 claude.ai 계정 활성화, 로컬은 저장소 선언 — 이유는 `SETUP.md` §1 「Claude Code 플러그인」.

## 세션 유형 — 클라우드 · 데스크톱 로컬

| 세션 | 판별 | 하는 일 | 하지 않는 일 |
|---|---|---|---|
| **클라우드 세션** (claude.ai/code) | `CLAUDE_CODE_REMOTE=true` | 코드 · 문서 · 테스트 · branch push · 인계 기록(PR 생성은 통합 세션 — `AGENTS.md` §4-1(e)) | 운영 DB 접속 — gcloud 인증 · Cloud SQL Proxy 가 없다 |
| **상시 통합 세션** (클라우드) | 위 판별 + main 의 `.claude/integration-sessions.json` 에 세션 ID 등록 | 묶음 PR 생성 · CI · 리뷰 확인 · squash 병합 · 자동 Delivery 결과 · 배포 후 Demo 확인(`/integrate`) | 배포 · promote 실행 · CI · 배포 인프라 · 에이전트 안전 설정 PR 의 병합(로컬 · 통합 담당) |
| **로컬 세션 (VS Code)** | 그 밖 | 운영 DB read-only 조회 · 통합 담당이 승인한 운영 작업(`AGENTS.md` §5) · 실 PC smoke | 승인 없는 DB write · DDL · migration 수동 적용 (`AGENTS.md` §5) |

- 작업 위치 분담(개발은 클라우드, 병합 · 배포 · 로컬 작업은 VS Code 로컬)은 `AGENTS.md` §4 「작업 위치 분담」을 따른다.
- 클라우드 세션에서 운영 DB 확인이 필요하면 멈추고, read-only SQL 과 판정 기준을 담은 지시서를 `docs/work-orders/` 에 작성해 작업 branch 로 push 한 뒤 `HANDOFF.md` 로 로컬 세션에 넘긴다. 로컬 세션은 결과를 마스킹해 같은 branch 에 기록하고 push 한다.
- 두 세션 모두 `AGENTS.md` §4-1 의 전용 worktree · branch 규칙을 따른다.

### 클라우드 세션 규칙 (환경 `o4o-platform`)

- **의존성:** SessionStart 훅(`.claude/hooks/session-start.sh`)이 클라우드에서만 `pnpm install --frozen-lockfile` 을 실행한다. 실패해도 세션은 열리며 마지막 출력을 보여 준다 — 그때는 같은 명령을 직접 다시 실행한다. 환경 setup script 의 설치 · `build:packages` 는 미리 데워 두는 용도일 뿐이다 — setup 결과는 캐시돼 lockfile 변경을 놓칠 수 있으므로, 정확한 설치는 매 세션 SessionStart 훅의 `--frozen-lockfile` 이 맡는다(2026-11-12 실제 setup script 와 맞춤).
- **시작 동기화:** 작업 전에는 `git fetch origin` 후 working tree 상태와 `origin/main` 대비 ahead/behind 만 확인한다. 시작했다는 이유로 merge · rebase 하지 않는다(`AGENTS.md` §4-1(d)).
  - 최신 main 이 실제로 필요하면(충돌 · 통합 준비 · 의존 변경) 충돌 여부와 통합 필요성을 먼저 확인한 뒤, clean 상태에서 자기 branch 에만 반영한다.
  - 아직 push 하지 않은 branch 는 `git pull --rebase origin main`, 이미 push 한 branch 는 `git merge origin/main` 을 쓴다(원격 이력 재작성 금지 · §4-1(e) · §4-2). dirty 상태에서는 pull 하지 않는다.
- **branch · PR:** 세션에 지정된 `claude/*` branch 에서 작업하고 push · 인계 기록까지 한다. PR 생성 · 병합은 통합 세션 몫이다(`AGENTS.md` §4-1(e)). main 직접 push · auto-merge 는 어느 세션도 하지 않는다.
- **통합 담당 몫:** 원격 branch 삭제 · 배포 · CI · 배포 인프라 변경(`AGENTS.md` §5) PR 의 병합은 통합 담당이 직접 한다. 상시 통합 세션도 그 PR 은 CI 결과만 보고한다.
- **클라우드 GitHub 도구:** GraphQL 이 막혀 `gh pr view` · `checks` · `list` · `create` · `merge` 는 실패한다. 조회는 `gh api` REST GET · `gh pr diff` · `gh run list/view [--log]`, PR 생성 · 병합은 GitHub MCP 도구를 쓴다(대응표는 `/integrate`). Actions 변수 · Environments API 는 프록시가 막는다 — `DEPLOY_FREEZE` 등은 Delivery Classify 로그로 확인한다.
- **테스트 계정:** [`docs/TEST-ACCOUNTS.md`](docs/TEST-ACCOUNTS.md) 를 쓴다. 환경 변수에 계정 값을 두지 않는다.
- **시크릿:** 코드 · 문서 · 커밋 · PR · 대화에 남기지 않는다. 환경 설정 화면의 환경 변수에도 넣지 않는다(편집 권한자와 에이전트가 읽을 수 있다).

## 명령 실행 원칙 (Claude Code 도구)
- **항상 사용자 확인:** 운영 DB 직접 접속 · 시크릿 · IAM · 프로덕션 리소스 삭제. `.claude/settings.json` 의 ask 규칙(allow 보다 우선)이 이 범위를 강제한다. 운영 변경(운영 DB 쓰기 · 시크릿 · 배포)의 승인자는 통합 담당이다 — 다른 개발자의 세션이면 ask 창을 승인하기 전에 통합 담당 승인을 받는다(`AGENTS.md` §5).
- ask 대상 명령은 다른 명령과 `;` · `&&` · `|` 로 묶지 않는다 — 섞이면 한 줄 전체가 승인 대상이 되어 무엇을 승인하는지 흐려진다.
- `gh pr view` · `gh pr checks` · `gh run view` 로 알 수 있는 정보는 `gh api` 를 쓰지 않는다.
- `gh api` 는 GET 조회만 사용하고, `-X` · `--method` · `-f` · `-F` · `--input` 옵션은 쓰지 않는다. 예외는 GitHub 검색 `gh api -X GET search/<code|issues|commits|repositories|users> -f q='…' [--paginate]` 한 형태뿐이다(`guard-ask-commands.mjs`).
- 결과 표시용 `echo` 는 생략한다.
- 권한 설정은 `.claude/settings.json`(공유 · 커밋) 이 정본이다. 개인 PC 전용 허용은 `.claude/settings.local.json`(미추적) 에 둔다.

---

# 부록 A — 호환 reference (§ 번호 고정)

> 각 절은 요지 + 정본 링크만 둔다. 상세는 정본이 우선한다.

## 0. 환경 원칙

- 기본 환경은 프로덕션(`o4o-platform-db` / `o4o_platform`). 실제 endpoint 는 문서에 고정하지 않는다.
- DB 접근 정책은 [`AGENTS.md` §5](AGENTS.md#5-위험-변경--사용자-확인) **DB·보안 경계**. 접속 절차 · 포트 분리 · 프록시 기동 · 로컬 도구는 [`SETUP.md`](SETUP.md).

## 1. 개발 기본 규칙

- 브랜치: 독립 작업은 전용 worktree · 전용 branch 가 기본(2026-10-03~). 규칙은 [`AGENTS.md` §4](AGENTS.md#4-git--병렬-작업-안전) (§4-1 worktree · §4-2 stage/commit/push · §4-3 공유 코드 허브 lane · 작업 순서).
- App 계층: `Core → Extension → Feature → Service`. 역방향 의존 금지.
- API 호출: `authClient.api.get()` / `.post()` 필수. 환경변수 직접 사용 · 하드코딩 URL 금지.
- 공통 모듈 · config · sidebar · layout · capability map · core+extension contract 수정은 **모든 소비처를 먼저 식별**하고 단일 서비스 기준으로 완료 판단하지 않는다. 식별자 검색만으로 소비처 0 을 선언하지 않는다(`node scripts/quality/check-literal-consumers.mjs --source <파일>`). 절차: [`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`](docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md).

## 2. TypeORM Entity – ESM Rules (FROZEN)

> 위반 시 API 서버 기동 실패. 근거: [`ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01`](docs/reference/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md)

```typescript
// ❌ FORBIDDEN
import { RelatedEntity } from './related.entity.js';
@ManyToOne(() => RelatedEntity, (e) => e.property)

// ✅ REQUIRED
import type { RelatedEntity } from './related.entity.js';
@ManyToOne('RelatedEntity', 'property')
```

## 3. Core 동결 정책

- **현행 Core 목록 · 위치 · 변경 등급(A/B/C)은 [`O4O-CORE-REGISTRY-V1`](docs/baseline/O4O-CORE-REGISTRY-V1.md) 이 정본이다**(2026-11-11). Core 계약 경로(B)를 바꾸는 PR 에는 `core-change` 라벨이 자동으로 붙는다(표시만 · 병합 gate 아님). 경로 목록은 `scripts/ci/core-paths.mjs` 다.
- 동결 결정(구조 · 테이블 · 계약 변경은 명시적 WO 승인 필요)은 [`O4O-CORE-FREEZE-V1`](docs/architecture/O4O-CORE-FREEZE-V1.md)(F10) 그대로다. 그 문서의 파일 경로는 2026-03-11 기록이며, 현재 위치는 registry 를 본다.
- 예전 「동결 Core: `cms-core` · `auth-core` · `platform-core` · `organization-core`」 패키지 목록은 registry 로 대체했다. `auth-core` 는 소비처 0 인 껍데기이고 실제 인증 Core 는 api-server `modules/auth` 다. 네 패키지 모두 registry 에서 B 등급이며 WO 규칙도 유지된다.

## 4. Order / Commerce Contract

- **주문 생성은 `checkoutService.createOrder()` 단일 지점.** 독립 `*_orders` · `*_payments` 테이블 신설 금지 (`scripts/check-forbidden-tables.mjs` 가 검사).
- 현재 O4O 안에서 살아 있는 내부 주문 경로는 **공급자→매장 B2B** (event-offer / Neture B2B → `store_cart_items → checkout_orders`). 정본: [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md). 소비자→매장 commerce 는 [`O4O-STORE-COMMERCE-BOUNDARY-V1`](docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) 이 정한다.
- 새 주문 구조 · 결제 · 환불을 만들기 전에 위 두 정본을 먼저 확인한다. 이는 현행 계약이며, 사업 모델 변경은 COMMERCE-BOUNDARY §15 절차를 따른다.
- 주문 생성 기술 계약(`createOrder()` 단일 지점 · 독립 테이블 금지 · PaymentCore)의 정본은 [`CHECKOUT-STABLE-DECLARATION-V2`](docs/baseline/CHECKOUT-STABLE-DECLARATION-V2.md) §2 다. 구 `E-COMMERCE-ORDER-CONTRACT` 는 2026-10-07 SUPERSEDED(`OrderType` 열거는 현행 코드에 없음, 서비스 구분은 `metadata.serviceKey`) — [`CANONICAL-INDEX` §9](docs/CANONICAL-INDEX.md) 판정 해제 기록.

## 5. O4O Store & Order

- 모든 매장은 O4O Store Template 사용. 주문 생성은 §4. 3중 방어(런타임 Guard + 계약 + 스키마 검사). 정본: [`O4O-STORE-RULES`](docs/architecture/O4O-STORE-RULES.md).
- Store Production Material 작업 전 [`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`](docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md) 선행. `kpa_store_contents` 는 legacy 물리 테이블명(KPA / Cosmetics 공용) — 성급한 rename 제안 금지.

## 6. 인프라 (GCP Cloud Run)

- 배포는 Cloud Run (API `o4o-core-api` + 서비스별 web). 서비스 목록은 `.github/workflows/deploy-*.yml` 이 정본이다.
- 금지: Source 배포 · PM2 · AWS EC2 · 구 IP `43.202.242.215` 참조.

## 7. Boundary Policy (FROZEN)

정본: [`O4O-BOUNDARY-POLICY-V1`](docs/architecture/O4O-BOUNDARY-POLICY-V1.md) — Domain Primary Boundary(Broadcast=`serviceKey` / Community · Store Ops=`organizationId` / Commerce=`storeId`).

**Guard Rules — 모든 신규 개발 필수:**

1. UUID 단독 조회 금지 — Domain Primary Boundary 복합 조건 필수
2. Raw SQL Parameter Binding 필수 — String Interpolation 금지
3. Domain Primary Boundary 필터 필수 — 모든 쿼리에 적용
4. serviceKey 스푸핑 금지 — URL 경로 파라미터에서만 추출
5. Cross-domain JOIN 금지 — 명시적 WO 예외 외

## 8. 화면 디버깅 · 진단 경로 규칙

**진단 · seed · 복구 경로 규칙 (필수 · 2026-08-08 사고 재발 방지):**

1. 진단 · seed · repair · backfill 은 **CLI 우선**. HTTP route 로 만들지 않는다.
2. HTTP 가 불가피하면 **`requireAuth` + role guard 필수**.
3. debug / test 성격 route 는 **프로덕션에 등록하지 않는다** (`NODE_ENV !== 'production'` 게이트).
4. **GET 으로 상태를 변경하지 않는다.**
5. 권한을 코드에서 하드코딩하지 않는다 (`isPlatformAdmin: true` 등). 요청자 권한에서 파생한다.

- 버그 디버깅 표준: 의심 API 를 Raw JSON 으로 출력하는 SSR 테스트 페이지 → 브라우저 확인 → 원인 확정 후 최소 수정. 가이드: [`DEBUG-SSR-TEST-PAGE-GUIDE-V1`](docs/platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md).
- JSON 응답 표준: `{ success: true, data: T }` / `{ success: false, error, code }`.

## 9. 도메인별 규칙 (참조)

K-Cosmetics(퇴역 결정 2026-10-05 · 운영 runtime 제거 완료 · 잔여 유지 계약 — 제거된 runtime 재생성 금지 · 새 테이블 · Core FK · 개인정보 필드 · 전용 기능 추가 금지 · 주문 데이터는 §4 원장) · Design Core(신규 화면은 Design Core v1.0) — 정본은 [`CANONICAL-INDEX` §5](docs/CANONICAL-INDEX.md).
`O4O-RETAIL-STABLE-V1` 은 SUPERSEDED(소비자 commerce loop 은퇴 완료) — [`CANONICAL-INDEX` §9](docs/CANONICAL-INDEX.md) 판정 해제 기록.

## 10. KPA Society 구조

옛 단일 도메인 3개 서비스 구조는 은퇴(SUPERSEDED 2026-10-20). 약국 협력사업 `pharmacy` 는 `drugstore` · `pharmcoop` · `carepharm` 과 동급 독립 사업, 분회는 `kpa.neture.co.kr`. 정본: [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](docs/baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) · 진행: [`WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1`](docs/work-orders/WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1.md).

## 11. Operator Dashboard 표준

- Guard: `requireAuth` → `require{Service}Scope('{service}:{role}')`. 레거시 `requireAdmin` 서비스 레벨 사용 금지.
- Route: Backend `/api/v1/{service}/operator/*` · `/admin/*` — Frontend `/operator/*` · `/admin/*`.
- Admin = 구조 · 정책 · 거버넌스 · 금융 / Operator = 운영 · 콘텐츠 · 모니터링 (사업적 정의는 PHILOSOPHY §3.2). 5-Block 대시보드 · A~F 6 Workspace · AI Summary 는 backend 생성.
- 정본: [`OPERATOR-DASHBOARD-STANDARD-V1`](docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) 외 [`CANONICAL-INDEX` §3](docs/CANONICAL-INDEX.md).

## 12. 플랫폼 개발 참조

Content Core · LMS · Navigation · Extension · HUB Template 은 [`CANONICAL-INDEX` §6](docs/CANONICAL-INDEX.md). 핵심: Content 단일 출처 / Core 불변 / 데이터 소유권 분리 / 이벤트 기반 통신.

## 13. O4O 공통 구조 원칙

forum · lms · signage 는 **플랫폼 공통 구조**. KPA 가 reference implementation. 서비스별 재구현 · 독립 테이블 금지, 데이터는 serviceKey 격리. 정본: [`o4o-common-structure`](docs/o4o-common-structure.md).

## 13-A. APP 표준화 (Baseline Lock)

모든 APP = `@o4o/types/{app}` + `{App}QueryService` + 표준 UI. 서비스 코드는 QueryService 호출 + 설정만. 상태: [`APP-LMS-BASELINE`](docs/architecture/APP-LMS-BASELINE.md).

## 14. Frozen Baselines

공통: **버그 수정 · 성능 · 문서 · 테스트 허용. 구조 변경은 명시적 WO 필수.**

| # | 대상 | 문서 |
|---|---|---|
| F1 | Operator OS | [`BASELINE-OPERATOR-OS-V1`](docs/baseline/BASELINE-OPERATOR-OS-V1.md) |
| F2 | KPA UX | [`KPA-UX-BASELINE-V1`](docs/baseline/KPA-UX-BASELINE-V1.md) |
| F3 | Store Layer | [`STORE-LAYER-ARCHITECTURE`](docs/architecture/STORE-LAYER-ARCHITECTURE.md) |
| F4 | Platform Content Policy | [`PLATFORM-CONTENT-POLICY-V1`](docs/baseline/PLATFORM-CONTENT-POLICY-V1.md) |
| F5 | Content Stable | [`CONTENT-STABLE-DECLARATION-V1`](docs/baseline/CONTENT-STABLE-DECLARATION-V1.md) |
| F6 | Boundary Policy | [`O4O-BOUNDARY-POLICY-V1`](docs/architecture/O4O-BOUNDARY-POLICY-V1.md) |
| F7 | ~~Neture Partner Contract~~ | **은퇴 (SUPERSEDED 2026-09-15)** — Legacy Partner runtime 전면 은퇴. 대체: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §7. 물리 정리 완료(2026-09-16). 원문 [archive](docs/archive/obsolete/partner/NETURE-PARTNER-CONTRACT-FREEZE-V1.md). 번호 재사용 없음 |
| F8 | Neture Distribution Engine | [`NETURE-DISTRIBUTION-ENGINE-FREEZE-V1`](docs/baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md) |
| F9 | RBAC SSOT | [`RBAC-FREEZE-DECLARATION-V1`](docs/rbac/RBAC-FREEZE-DECLARATION-V1.md) |
| F10 | O4O Core | [`O4O-CORE-FREEZE-V1`](docs/architecture/O4O-CORE-FREEZE-V1.md) |
| F11 | User / Operator | [`USER-OPERATOR-FREEZE-V1`](docs/architecture/USER-OPERATOR-FREEZE-V1.md) |
| F12 | Product Resource Architecture | [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md) |

## 15. Browser Verification Test Accounts

- SSOT: [`docs/TEST-ACCOUNTS.md`](docs/TEST-ACCOUNTS.md) (저장소 추적 · 2026-11-08 기준 변경, 이전 `docs/local/TEST-ACCOUNTS.local.md` · `TEST-ACCOUNT.txt` 미사용). 브라우저 검증 전 반드시 참조. 클라우드 세션도 이 파일을 쓴다.
- 사용자 테스트는 **로그인 화면의 「테스트 로그인」 버튼**(매장 경영자 · 공급자 · 매장 직원 — 공개 Demo 계정)으로 한다. Google · 카카오 로그인 화면은 사용자에게 넘겨 사용자가 직접 로그인한다.
  사용자 화면은 **배포 후** 이 버튼으로 검증한다(2026-11-08) — 절차 · 예외는 [`AGENTS.md` §6](AGENTS.md#6-검증--완료-보고) · [`SETUP.md` 배포 후 Demo 검증](SETUP.md#배포-후-demo-검증).
- 실제 운영 계정 사용 금지. **자격증명 하드코딩 금지** — seed · 테스트 코드 · CI 어디에도 박지 않는다. 발견 시 즉시 제거.

## 16. 문서 Drift 발견 시 정비

정본: [`DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1`](docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md) · 공통 규칙 [`AGENTS.md` §8](AGENTS.md#8-문서-drift). 본 절은 **발동 조건**만 정한다(16-1~16-6 번호는 기준 문서가 참조하므로 유지). 일괄 정리가 아니라 조사 · 개발 중 발견 시 처리한다.

- **16-1 대상은 기준 문서뿐** — `docs/baseline/` · `architecture/` · `rules/` · `rbac/` · `platform/` · `guides/` 와 `docs/CANONICAL-INDEX.md`. `checks/` · `investigations/` · `ir/` · `work-orders/` · `archive/**` 는 기록물이므로 대상이 아니다.
- **16-2 기본 동작은 보고다.** 범위 밖 문서를 즉시 고치는 것은 범위 외 수정이다.
- **16-3 인라인 허용 2가지뿐** — ① 낡은 기준 문서 상단에 `> **상태**: SUPERSEDED · **대체 문서**: <경로> · **표기일**: YYYY-MM-DD` 한 줄(본문 불변, 대체 문서를 못 적으면 보고만) ② 깨진 링크 · 이동된 경로의 기계적 수정.
- **16-4 인라인 금지** — 삭제 · 통합 · 분할 · archive 이동 · `CANONICAL-INDEX` 행 변경 · Frozen Baseline 본문 수정 · 기준 문서의 내용 · 판정 변경. 보고 후 별도 WO.
- **16-5 완료 보고 필수 항목** — `문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건` (없으면 `해당 없음`).
- **16-6 판단 불가는 그대로 둔다** — 애매하면 ACTIVE 로 유지하고 보고만 한다. 잘못된 표기보다 방치가 안전하다.

---

# 부록 B — 상세 규칙 색인

영역별 세부 규칙 문서(Frozen · 도메인 · Operator · RBAC · 콘텐츠 저작 등)의 전체 목록과 상태는 [`docs/CANONICAL-INDEX.md`](docs/CANONICAL-INDEX.md) 에 있다. 이 파일에는 복제하지 않는다.

---

*Updated: 2026-11-06*
*Version: 10.0 — `@AGENTS.md` import 구조*
*Status: Active — Claude Code Entry Point*
