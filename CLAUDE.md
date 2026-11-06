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
- 시작 · 종료 절차는 `/start` · `/handoff` 커맨드(`.claude/commands/`)를 따른다.
- SessionStart 훅(`.claude/hooks/session-start.mjs`)이 `origin/main` 을 fetch 하고, **clean 한 기준 main checkout 에서만** `pull --ff-only` 한다. 작업 branch · worktree 에서는 ahead/behind 만 보고하며 merge/rebase 하지 않는다. 이 세션 유형(`실행 위치`)의 최근 미완료 지시서도 알려 준다.

## 세션 유형 — 클라우드 · 데스크톱 로컬

| 세션 | 판별 | 하는 일 | 하지 않는 일 |
|---|---|---|---|
| **클라우드 세션** (claude.ai/code) | `CLAUDE_CODE_REMOTE=true` | 코드 · 문서 · 테스트 · branch push · (통합 담당 지정 시) PR | 운영 DB 접속 — gcloud 인증 · Cloud SQL Proxy 가 없다 |
| **데스크톱 로컬 세션** | 그 밖 | 운영 DB read-only 조회 · 사용자가 승인한 운영 작업 · 실 PC smoke | 승인 없는 DB write · DDL · migration 수동 적용 (`AGENTS.md` §5) |

- 클라우드 세션에서 운영 DB 확인이 필요하면 멈추고, read-only SQL 과 판정 기준을 담은 지시서를 `docs/work-orders/` 에 작성해 작업 branch 로 push 한 뒤 `HANDOFF.md` 로 로컬 세션에 넘긴다. 로컬 세션은 결과를 마스킹해 같은 branch 에 기록하고 push 한다.
- 두 세션 모두 `AGENTS.md` §4-1 의 전용 worktree · branch 규칙을 따른다.

## 명령 실행 원칙 (Claude Code 도구)
- **항상 사용자 확인:** 운영 DB 직접 접속 · 시크릿 · IAM · 프로덕션 리소스 삭제. `.claude/settings.json` 의 ask 규칙(allow 보다 우선)이 이 범위를 강제한다.
- ask 대상 명령은 다른 명령과 `;` · `&&` · `|` 로 묶지 않는다 — 섞이면 한 줄 전체가 승인 대상이 되어 무엇을 승인하는지 흐려진다.
- `gh pr view` · `gh pr checks` · `gh run view` 로 알 수 있는 정보는 `gh api` 를 쓰지 않는다.
- `gh api` 는 GET 조회만 사용하고, `-X` · `--method` · `-f` · `-F` · `--input` 옵션은 쓰지 않는다.
- 결과 표시용 `echo` 는 생략한다.
- 권한 설정은 `.claude/settings.json`(공유 · 커밋) 이 정본이다. 개인 PC 전용 허용은 `.claude/settings.local.json`(미추적) 에 둔다.

---

# 부록 A — 호환 reference (§ 번호 고정)

> 각 절은 요지 + 정본 링크만 둔다. 상세는 정본이 우선한다.

## 0. 환경 원칙

- 기본 환경은 프로덕션(`o4o-platform-db` / `o4o_platform`). 실제 endpoint 는 문서에 고정하지 않는다.
- DB 접근 정책은 [`AGENTS.md` §5](AGENTS.md#5-위험-변경--사용자-확인) **DB·보안 경계**. 접속 절차 · 포트 분리 · 프록시 기동 · 로컬 도구는 [`SETUP.md`](SETUP.md).

## 1. 개발 기본 규칙

- 브랜치: 독립 작업은 전용 worktree · 전용 branch 가 기본(2026-10-03~). 규칙은 [`AGENTS.md` §4](AGENTS.md#4-git--병렬-작업-안전) (§4-1 worktree · §4-2 stage/commit/push).
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

동결 Core: `cms-core` · `auth-core` · `platform-core` · `organization-core`. 구조 · 테이블 변경은 명시적 WO 승인 필요. 정본: [`O4O-CORE-FREEZE-V1`](docs/architecture/O4O-CORE-FREEZE-V1.md).

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

- SSOT: `docs/local/TEST-ACCOUNTS.local.md` (로컬 전용 · git 미추적 · 2026-10-16 기준 변경, 이전 `TEST-ACCOUNT.txt` 미사용). 브라우저 검증 전 반드시 참조.
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
