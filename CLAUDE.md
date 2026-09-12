# CLAUDE.md — Claude Code 진입점

> **이 문서는 Claude Code 가 이 저장소에서 안전하게 작업하기 위한 진입점 · 안전 경계 · 정본 지도다.**
> 규칙의 원문은 canonical 문서에 있다. 이 파일은 그것을 **복사하지 않고 가리킨다.**
> Codex / 일반 에이전트의 진입점은 [`AGENTS.md`](AGENTS.md) 이며 두 문서는 **동급**이다 — 한쪽이 다른 쪽을 import 하거나 선행 조건으로 요구하지 않는다. 공통 지식은 [`docs/CANONICAL-INDEX.md`](docs/CANONICAL-INDEX.md) 와 각 정본에 둔다.
>
> **§ 번호(§0~§16, §13-A)는 고정이다.** 소스 주석과 기준 문서가 `CLAUDE.md §N` 으로 참조한다. 부록의 번호·순서를 바꾸지 않는다.

---

## Source of Truth

시작 전 확인하는 정본:

| 영역 | 정본 |
|---|---|
| **정본 지도 (전체 색인 · 상태)** | [`docs/CANONICAL-INDEX.md`](docs/CANONICAL-INDEX.md) |
| 사업 철학 (참여 주체 · HUB · AI 역할) | [`O4O-BUSINESS-PHILOSOPHY-V1`](docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) |
| **매장 commerce 경계** (cart · checkout · orders · payments · refund · PG · POS · tablet · QR · 외부 판매채널) | [`O4O-STORE-COMMERCE-BOUNDARY-V1`](docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) — **코드보다 먼저 읽는다** |
| 공급자→매장 B2B 주문 (위 문서의 B2B 축 쌍) | [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) |
| 3자 Canonical Flow | [`O4O-3-ROLE-FLOW-BASELINE-V1`](docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) |
| Domain Boundary · Guard Rules 5종 | [`O4O-BOUNDARY-POLICY-V1`](docs/architecture/O4O-BOUNDARY-POLICY-V1.md) |
| Core 동결 범위 | [`O4O-CORE-FREEZE-V1`](docs/architecture/O4O-CORE-FREEZE-V1.md) |
| 공통 모듈 변경 절차 | [`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`](docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) |
| 개발환경 · 검증 명령 · CI 게이트 · DB 접속 절차 | [`SETUP.md`](SETUP.md) |
| Git 병렬 작업 · PC 이동 | [`O4O-GIT-PARALLEL-WORK-SAFETY-V1`](docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md) |
| 프로덕션 마이그레이션 | [`PRODUCTION-MIGRATION-STANDARD`](docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) |

충돌 시 우선순위:

1. 사용자의 현재 명시적 작업 지시
2. 사업 · 정책 정본 — PHILOSOPHY · COMMERCE-BOUNDARY · B2B-ORDER-CONTRACT · 3-ROLE-FLOW
3. 구조 계약 — Frozen Baselines(§14) · Boundary · Core Freeze · Shared Module Protocol
4. 도메인 · 서비스 정본 — `docs/CANONICAL-INDEX.md` 의 나머지
5. WO / CHECK / IR / archive — **과거 시점의 실행 기록**. 현재 정책을 이기지 않는다

아래 실행 안전 규칙(실행 원칙 · 중지 조건 · Git · DB · 검증 · 보고)은 이 체인 밖에서 **항상** 적용된다.

> **역추론 금지.** 저장소에 cart / checkout / payment / refund / `platform-seller` 코드가 **존재한다는 사실은 그 기능이 현행 사업 기능이라는 근거가 아니다.** 사업 계약이 먼저이고 코드는 그 계약에 맞게 정리한다 (COMMERCE-BOUNDARY §8 · §14).
>
> **현재 정책 ≠ 영구 계약.** "현재 하지 않는다"(예: 플랫폼 직접 판매 계약 NONE, 2026-08-25 확정 / POS 비개발) 를 "앞으로도 절대 하지 않는다"로 읽거나 쓰지 않는다. 사업 모델 변경은 COMMERCE-BOUNDARY §15 절차, Frozen 구조 변경은 명시적 WO 를 따른다.

---

## 실행 원칙

```text
조사 → 문제확정 → 최소 수정 → 검증 → CHECK/IR 갱신 → path-specific stage → commit → push → 완료 보고
```

- WO 가 **조사 전용**이면 구현하지 않는다.
- WO 가 **구현을 명시**하면 조사 후 안전 범위 안에서 검증까지 불필요한 중간 승인 없이 진행한다.
- **작업 범위 외 수정 금지.** 범위 밖에서 발견한 문제는 고치지 말고 보고 후 별도 WO 로 분리한다.

## 중지 조건

아래는 진행을 멈추고 사용자 판단을 요청한다.

- WO 범위 밖 파일 수정 필요 / 다른 세션의 dirty · 미추적 파일 접촉 필요
- DB schema · migration · 데이터 삭제 · 대량 update · seed 변경 필요
- `package.json` · lockfile · dependency 변경 필요
- Docker · CI · build 인프라 변경 필요
- Core(§3) · Frozen Baseline(§14) · 공통 계약 변경 필요
- 권한 · role · route · API contract 변경 필요
- 결제 · 정산 · 법률 · 규제 판단 필요
- 실제 계정 · 자격정보 · 외부 서비스 승인 필요
- 현재 변경과 무관한 build · test 실패

## Git · 병렬 작업 안전

**다중 PC · 다중 세션(사람 + AI)이 같은 `main` 에 직접 커밋**하는 환경이다. 절차의 정본은 [`O4O-GIT-PARALLEL-WORK-SAFETY-V1`](docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md). 아래는 예외 없이 지킨다.

- 작업 전 `git fetch origin` → `git status -sb`. **pull(merge/rebase)은 작업트리가 clean 할 때만.**
- **`git add .` · `git add -A` · `git commit -am` 금지.** path-specific stage 만 사용한다.
- **커밋에도 pathspec 을 붙인다.** foreign staged 파일이 있으면 pathspec 없는 `git commit` 금지 — 커밋 직전 `node scripts/git/check-staged-scope.mjs <내 작업 경로...>` → `git commit -m "..." -- <내 파일...>`.
- 다른 세션의 수정 · 미추적 · staged 파일은 **불가침** (판단 · 커밋 · 정리 · `restore` · `reset` · `stash` 대상 아님).
- **`--force` push 금지.** 공유 `main` 이력은 재작성하지 않는다(오타 정정도 후속 커밋으로).
- 완료 조건은 저장소 전체 clean 이 아니라 **`이번 WO 범위의 미커밋 변경 0건` + `HEAD == origin/main`**.
- feature 브랜치는 명시적 요청 또는 대규모 리팩토링 · 실험적 변경에서만.

## DB · 보안 경계

- **기본 환경은 프로덕션이다.** 접속 절차 · 포트 · 프록시 · 도구는 [`SETUP.md`](SETUP.md) 가 유일 정본이다 (여기 복제하지 않는다).
- read-only 검증(SELECT · 마이그레이션 이력 · 상태 조회)은 승인된 채널(`gcloud` · Admin API · Console)로 직접 수행 가능.
- **UPDATE / DELETE / DDL · 대량 write · migration 수동 적용은 사용자 명시 승인 필요.** 마이그레이션은 CI/CD 자동 실행이 원칙 ([`PRODUCTION-MIGRATION-STANDARD`](docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md)).
- 실제 DB host · password · 계정값을 문서 · 로그 · 커밋 · 스크린샷에 기록하지 않는다. 운영 데이터 보고 시 민감정보는 요약 · 마스킹한다.
- 진단 · seed · repair route 의 안전 규칙은 §8.

## 검증 · 완료 보고

- **검증하지 않은 것을 PASS 로 보고하지 않는다.** 빌드 성공만으로 UI 작업을 종결하지 않는다.
- **실패하거나 건너뛴 검증을 숨기지 않는다.** 통과한 것만 골라 보고하지 않는다. smoke 가 불가하면 구체적 이유를 적는다.
- 보고는 **한국어**. 파일명 · route · API · component · commit hash 등 기술 식별자는 원문 유지.
- 긴 diff 나 전체 파일을 그대로 붙이지 않는다. 변경 / 미변경 / 검증 결과 / CHECK / Git 상태 중심.
- 모든 완료 보고에 **`문서 정합`** 한 줄을 포함한다 (§16-5).

---

# 부록 A — 호환 reference (§ 번호 고정)

> 각 절은 요지 + 정본 링크만 둔다. 상세는 정본이 우선한다.

## 0. 환경 원칙

- 기본 환경은 프로덕션(`o4o-platform-db` / `o4o_platform`). 실제 endpoint 는 문서에 고정하지 않는다.
- DB 접근 정책은 위 **DB · 보안 경계** 절. 접속 절차 · 포트 분리 · 프록시 기동 · 로컬 도구는 [`SETUP.md`](SETUP.md).

## 1. 개발 기본 규칙

- 브랜치: 현재(2026-09 기준) 운영 단계에서는 **main 직접 작업**이 기본. 규칙은 위 **Git · 병렬 작업 안전** 절.
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
- 현재 O4O 안에서 살아 있는 내부 주문 경로는 **공급자→매장 B2B** (event-offer / Neture B2B / PharmacyHub → `store_cart_items → checkout_orders`). 정본: [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md). 소비자→매장 commerce 는 [`O4O-STORE-COMMERCE-BOUNDARY-V1`](docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) 이 정한다.
- 새 주문 구조 · 결제 · 환불을 만들기 전에 위 두 정본을 먼저 확인한다. 이는 현행 계약이며, 사업 모델 변경은 COMMERCE-BOUNDARY §15 절차를 따른다.
- 기술 계약 [`E-COMMERCE-ORDER-CONTRACT`](docs/baseline/E-COMMERCE-ORDER-CONTRACT.md) 는 `createOrder()` 단일 지점 규칙만 유효하고 `OrderType` 열거 절은 stale — 상태는 [`CANONICAL-INDEX` §9](docs/CANONICAL-INDEX.md).

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

Cosmetics(`cosmetics_` 독립 스키마 · 주문은 §4 경유) · Business Service(OpenAPI 계약 우선) · Design Core(신규 화면은 Design Core v1.0) — 정본은 [`CANONICAL-INDEX` §5](docs/CANONICAL-INDEX.md).
`O4O-RETAIL-STABLE-V1` 은 현행 규칙이 아니라 **판정 대기(UNKNOWN)** — [`CANONICAL-INDEX` §9](docs/CANONICAL-INDEX.md).

## 10. KPA Society 구조

3개 서비스 공존(커뮤니티 / 분회 / 데모). 라우트 위치 ≠ 서비스 소속. 정본: [`KPA-SOCIETY-SERVICE-STRUCTURE`](docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md).

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
| F7 | Neture Partner Contract | [`NETURE-PARTNER-CONTRACT-FREEZE-V1`](docs/baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md) |
| F8 | Neture Distribution Engine | [`NETURE-DISTRIBUTION-ENGINE-FREEZE-V1`](docs/baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md) |
| F9 | RBAC SSOT | [`RBAC-FREEZE-DECLARATION-V1`](docs/rbac/RBAC-FREEZE-DECLARATION-V1.md) |
| F10 | O4O Core | [`O4O-CORE-FREEZE-V1`](docs/architecture/O4O-CORE-FREEZE-V1.md) |
| F11 | User / Operator | [`USER-OPERATOR-FREEZE-V1`](docs/architecture/USER-OPERATOR-FREEZE-V1.md) |
| F12 | Product Resource Architecture | [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md) |

## 15. Browser Verification Test Accounts

- SSOT: `docs/local/TEST-ACCOUNTS.local.md` (로컬 전용 · git 미추적). 브라우저 검증 전 반드시 참조.
- 실제 운영 계정 사용 금지. **자격증명 하드코딩 금지** — seed · 테스트 코드 · CI 어디에도 박지 않는다. 발견 시 즉시 제거.

## 16. 문서 Drift 발견 시 정비

정본: [`DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1`](docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md). 본 절은 **발동 조건**만 정한다. 일괄 정리가 아니라 조사 · 개발 중 발견 시 처리한다.

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

*Updated: 2026-09-12*
*Version: 9.0*
*Status: Active — Claude Code Entry Point*
