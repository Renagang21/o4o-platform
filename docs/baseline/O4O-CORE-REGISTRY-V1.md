# O4O Core Registry V1 — 현행 Core 목록 · 소유 · 변경 경계

> **상태**: ACTIVE
> **작성일**: 2026-11-11
> **근거**: [`IR-O4O-CORE-CONSOLIDATION-V1`](../investigations/IR-O4O-CORE-CONSOLIDATION-V1.md) (조사 · 기준 코드 `fb649107`) · WO-O4O-CORE-OWNERSHIP-AND-CHANGE-BOUNDARY-V1
> **기계 판독 목록**: [`scripts/ci/core-paths.mjs`](../../scripts/ci/core-paths.mjs) — B 등급 경로의 단일 목록. [`.github/CODEOWNERS`](../../.github/CODEOWNERS) 와 PR `core-change` 라벨이 이 목록을 쓴다
> **관계**: 과거 동결 결정([`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md) 등)은 **그대로 보존**한다. 이 문서는 그 결정을 폐기하지 않고, **지금 코드에서 Core 가 어디에 있는지와 변경을 어떻게 표시 · 검토하는지**를 정한다

---

## 1. 이 문서가 정하는 것

1. **Core 의 현행 정의.** Core 는 「여러 서비스가 함께 기대는 계약」이다. 패키지 이름에 `core` 가 붙었는지와 무관하다.
2. **실제 위치.** 현재 Core 구현은 대부분 `apps/api-server` 안에 있다. 이유는 하나의 DB 연결 설정(`AppDataSource`)과 같은 트랜잭션을 공유하기 때문이다(IR §0 · §4). `packages/*-core` 가운데 상당수는 UI · 껍데기 · 잔재다(§5).
3. **변경 등급 A / B / C**(§3)와 **B 변경의 표시 방법**(§4).

**정하지 않는 것:**
- 소스 이동 · 패키지 분리 · 중복 구현 수정(IR §9 의 후속 WO)
- 브랜치 보호 · ruleset 변경
- 저장소 공개 범위 · 협업자 권한 부여

## 2. 과거 동결 문서와의 관계

| 문서 | 성격 | 이 문서와의 관계 |
|---|---|---|
| [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md) (F10, 2026-03-11) | Auth · Membership · Approval · RBAC 4축 동결 **결정의 기록**. §2 파일 경로 일부는 현행 코드에 없다(문서 상단 2026-11-10 해석 안내) | 동결 결정(구조 · 테이블 · 계약 변경은 WO 필요)은 유효하다. 현재 파일 위치는 이 문서 §3 의 identity 행을 본다 |
| [`CLAUDE.md` §3](../../CLAUDE.md) · [`core-boundary`](core-boundary.md) 의 「동결 Core: `cms-core` · `auth-core` · `platform-core` · `organization-core`」 | 패키지 이름 기준 목록 | **2026-11-11 이 문서로 대체.** `auth-core` 는 소비처 0 인 껍데기다(실제 인증은 api-server `modules/auth`). `platform-core` 는 매장 slug · 정책 엔티티 패키지다. 네 패키지는 계속 B 등급(§3)이고 구조 · 테이블 변경에 WO 가 필요하다는 규칙도 그대로다 |
| [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md) (F9) · [`USER-OPERATOR-FREEZE-V1`](../architecture/USER-OPERATOR-FREEZE-V1.md) (F11) | `role_assignments` SSOT · 3테이블 고정 | 그대로 유효. IR §4 의 중복 쓰기 경로(organization-core `PermissionService.assignRole`)는 별도 WO 에서 처리한다 |
| [`NETURE-DISTRIBUTION-ENGINE-FREEZE-V1`](NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md) (F8) · [`CHECKOUT-STABLE-DECLARATION-V2`](CHECKOUT-STABLE-DECLARATION-V2.md) | 유통 · 주문 계약 | 그대로 유효. 해당 코드는 §3 의 product · commerce 행이다 |

**Freeze 는 소스 열람 제한이 아니다**(CORE-FREEZE 상단 안내). Core 변경 승인 정책과 GitHub 저장소 접근 정책은 별개다.

## 3. Core 목록과 변경 등급

### 3-1. 등급

| 등급 | 뜻 | 하는 일 |
|---|---|---|
| **A — 일반 개발** | 서비스 기능 · UI · 서비스별 업무 구현 | 읽기 · 수정 · 테스트 · push 를 평소대로 한다 |
| **B — 핵심 계약 변경 시 승인** | 여러 서비스가 기대는 계약 · 스키마 · 권한 · 정산 | 읽기 · 수정 · push 는 자유다. **계약이 바뀌면** 인계 기록 · PR 설명에 「Core 계약 변경」과 영향 범위를 적고, 통합 담당이 병합 전에 판단한다. 동결 문서(F8 · F9 · F10 · F11)가 걸리면 그 문서의 WO 규칙을 따른다. 계약이 그대로인 버그 수정 · 테스트 · 문서는 일반 절차다 |
| **C — 소스 분리 검토 후보** | 향후 별도 저장소 · 서비스 · 설정으로 뺄지 **검토만** 하는 대상 | 분리 전까지는 **B 로 관리**한다. 같은 저장소 안에서는 숨길 수 없다(협업자 read 권한은 저장소 단위) |

### 3-2. B 등급 — Core 계약 경로

정확한 경로 목록은 [`scripts/ci/core-paths.mjs`](../../scripts/ci/core-paths.mjs) 이다. 아래 표는 그 목록을 영역별로 요약한 것이다. 목록과 표가 다르면 목록이 맞다. 목록을 바꿀 때 이 표도 함께 고친다.

| 영역 | 경로 (요약) | 소유 · 근거 |
|---|---|---|
| identity | api-server `modules/auth/` · `common/middleware/auth/` · `auth.middleware.ts` · `membership-guard.middleware.ts` · `middleware/service-membership.middleware.ts` · `modules/policy-acceptance/` · `modules/service-legal/` · `entities/LinkedAccount.ts` · `controllers/admin/AdminUserController.ts` · `controllers/operator/MembershipConsoleController.ts` / packages `security-core` · `auth-utils` · `auth-client` · `types/src/auth.ts` | F9 · F10 · F11. JWT · `role_assignments` · `service_memberships` · 서비스 scope 가드 |
| organization | packages `organization-core` · `platform-core` | `organizations` · `organization_members`, 매장 slug · 정책 테이블을 패키지가 소유 |
| commerce | api-server `services/checkout.service.ts` · `services/cart/` · `entities/checkout/` · `entities/cart/` / packages `payment-core` | CLAUDE.md §4 · CHECKOUT-V2. `createOrder()` 단일 지점 |
| product | api-server `modules/neture/entities/` · neture 공통 규칙 파일(master-link · offer-write · 유통 · 서비스 승인 · 서비스가 · 특가 · 모집 공급가 · 일괄 매칭 · 별칭 · 카탈로그 · 식별자 · drug-commerce 가드) · `utils/gtin.ts` · `modules/product-policy-v2/` · `entities/ProductApproval.ts` · `modules/store-core/entities/` | F8 · F12. 상품 마스터 · 식별자 · 공급 오퍼 · 매장 진열 원장 |
| ai | packages `ai-core` · `file-understanding-core` / api-server `modules/ai-policy/` | AI 실행 계약 · quota 예약 · 정산 · 가격 |
| assistant | api-server `services/assistant/` · `ai-tools` 의 판단 파일(work-planner · unified-request-router · task-modality-router · workflow-candidate · work-experience) · `services/local-agent/browser-dom-contract.ts` / `tools/o4o-local-agent` 의 프로토콜 사본(`browser-dom-limits.mjs` · `handlers.mjs`) · `release/`(내장 Node 22.18.0 · installer 계약) | Personal Assistant 판단 · 서버 ↔ PC 프로그램 계약 (C 후보 포함) |
| schema | api-server `database/entities.ts` · `database/migrations/` · `database/incremental/` / `cms-core` 전체, 엔티티 패키지의 엔티티 디렉터리(forum · signage · interactive-content · education · lms · mail · market-trial · asset-copy · action-log) | DB 스키마 · 엔티티 등록. migration 은 [PRODUCTION-MIGRATION-STANDARD](operations/PRODUCTION-MIGRATION-STANDARD.md) · AGENTS.md §4-3 R4 |

`.github/workflows/` 와 `.github/CODEOWNERS` 는 Core 가 아니다. 다만 저장소 자동화이므로 CODEOWNERS 에서 같은 소유자를 지정하고, 변경은 README 「Production 변경 원칙」을 따른다.

### 3-3. A 등급 — 일반 개발 (예)

위 목록에 없는 경로는 모두 A 다. 대표 예는 다음과 같다.
- `services/web-*` 전체
- 공통 UI 패키지: `ui` · `content-editor` · `shared-space-ui` · `operator-core-ui` · `store-ui-core` · `operator-ux-core` · `admin-ux-core` · `auth-react` · `account-ui` 등
- 서비스별 업무 모듈: `neture-pharmacy` · `cooperation-workflows` · `store-ai` · `copilot` · `ai-extensions` · `content-guard` · `media` · `lms` · `survey` 등
- neture 모듈 중 위 공통 규칙 파일이 아닌 것(정산 · 대시보드 · 모집 · onboarding 등)
- `ai-tools` 실행기 · 사이트 어댑터
- `ai-prompts`

이름에 `core` 가 붙어도 A 인 패키지가 있다(UI 패키지). 반대로 이름에 `core` 가 없어도 B 인 경로가 있다(`modules/neture/entities/` 등).

### 3-4. C 등급 — 소스 분리 검토 후보 (실행하지 않음)

| 후보 | 이유 | 현재 처리 |
|---|---|---|
| Personal Assistant 판단 정책 — `services/assistant/*` 의 계획 · 판정 · 이해 프롬프트, `ai-tools` 판단 프롬프트, Experience → Skill 승격 규칙 | 업무 판단 노하우. Skill 은 아직 구현되지 않아 처음부터 분리 설계가 가능하다 | B 로 관리 |
| 핵심 업무 연결 규칙의 순수 함수 — master-link-policy · offer-write-policy · 식별자 정규화 · drug-commerce 판정 · 상태 enum | 공급자 → 매장 연결 규칙 | B 로 관리. 엔티티 · 트랜잭션 서비스는 공유 DataSource 때문에 분리할 수 없다(IR §4) |

분리 방식(별도 저장소 · 서버 · 설정 외부화)의 비교와 비용은 IR §7-3 에 있다. 실행은 사용자 결정 후 별도 WO 로 한다.

## 4. B 변경의 표시 · 검토

| 장치 | 동작 | 강제 여부 |
|---|---|---|
| PR `core-change` 라벨 | [`automation-pr-overlap.yml`](../../.github/workflows/automation-pr-overlap.yml) 이 PR 이 Ready 일 때(열림 · push · Ready 전환) 바뀐 파일을 `scripts/ci/core-paths.mjs` 와 대조한다. 걸리면 라벨을 달고, 더 이상 걸리지 않으면 뗀다. 드래프트 · fork PR 에서는 돌지 않는다 | **표시만.** 병합 gate(`CI Gate`)가 아니다. 라벨 API 실패는 로그만 남기고 겹침 알림은 계속한다 |
| `.github/CODEOWNERS` | B 경로를 바꾼 PR 에 통합 담당의 리뷰를 요청한다. PR 작성자 본인에게는 GitHub 가 요청하지 않는다 | **표시만.** ruleset 의 code owner review 필수화는 별도 결정 전까지 켜지 않는다 |
| 인계 기록 · PR 설명 | 작업 세션은 B 경로의 계약을 바꾸면 인계 기록(HANDOFF.md)의 결정 사항에 「Core 계약 변경 — 영역 · 영향 서비스」를 적는다. 통합 세션이 PR 설명으로 옮긴다(AGENTS.md §4-1(e)) | 규칙 |

- 라벨은 자동이다. 사람이 손으로 달거나 떼도 다음 push 때 파일 목록 기준으로 다시 맞춰진다.
- 저장소에 라벨이 없으면 GitHub 가 처음 라벨을 달 때 기본 색으로 만든다. 색 · 설명은 `automation-repo-setup.yml` 수동 실행으로 맞출 수 있다.
- B 변경의 병합 판단은 지금도 통합 담당(또는 지정된 통합 세션)이 한다(AGENTS.md §4). 이 장치는 새 승인 계층을 만들지 않는다. 판단할 PR 을 놓치지 않게 할 뿐이다.

## 5. 패키지 이름과 실제 (참고 · IR §3 요약)

| 구분 | 패키지 |
|---|---|
| 이름은 Core 지만 소비처 0 · 잔재 | `auth-core` · `store-core` · `operator-core` (+ 소비처 0: `api-types` · `content-core` · `forum-cosmetics` · `organization-forum` · `organization-lms`, 사실상 0: `pharmacy-ai-insight`) — 제거는 별도 WO |
| 이름은 Core 지만 UI | `operator-ux-core` · `admin-ux-core` · `store-ui-core` · `store-asset-policy-core` · `hub-core` · `tablet-kiosk-core` |
| 이름은 Core 고 실제 계약 · 엔티티를 가짐 | `security-core` · `payment-core` · `ai-core` · `file-understanding-core` · `organization-core` · `platform-core` · `cms-core` · `lms-core` · `mail-core` · `asset-copy-core` · `action-log-core` · `interactive-content-core` · `digital-signage-core` · `forum-core`(엔티티 · utils) |

## 6. 이 문서와 목록의 갱신

- Core 경로를 더하거나 뺄 때는 `scripts/ci/core-paths.mjs` · `.github/CODEOWNERS` · 이 문서 §3-2 를 **같은 변경**에서 고친다.
  - 대조 테스트 `scripts/ci/__tests__/core-paths.test.mjs` 가 CI 에서 목록 형식 · 경로 존재 · CODEOWNERS 일치를 확인한다.
  - 파일 이동 · 이름 변경으로 경로가 사라지면 이 테스트가 실패하므로 목록도 함께 옮긴다.
- 등급 변경(A ↔ B, C 분리 실행)은 사용자 결정 사항이다.
