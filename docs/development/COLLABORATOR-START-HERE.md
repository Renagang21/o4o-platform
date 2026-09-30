# COLLABORATOR-START-HERE

> **대상**: O4O 에 새로 참여하는 사람 공동개발자 · **일자**: 2026-09-30
> 기술 교육 문서가 아니다. **"O4O 가 무엇을 중요하게 보는가, 이 저장소를 어떻게 읽어야 하는가, 어디부터 보면 되는가"** 만 다룬다.
> 규칙의 원문은 각 정본 문서에 있고, 이 문서는 그 문서들을 가리키기만 한다.

---

## 1. O4O 를 보는 관점

O4O 는 어려운 기반 기술을 새로 만드는 프로젝트가 아니다. 경쟁력은 **실제 업무를 분석하고, 그 결과를 서비스로 설계하는 데** 있다.

- 기존 업무를 그대로 전산화하지 않는다.
- 필요 없는 업무는 없애고, 반복 업무는 자동화한다.
- 정보는 그것이 필요한 주체(공급자 · 매장 · 운영자 · 소비자) 사이에서 재사용 · 연결되도록 설계한다.
- 기술과 AI 는 이 업무 설계를 구현하는 **수단**이다.

더 읽을 곳:

- [O4O-BUSINESS-PHILOSOPHY-V1](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) — 사업 철학 · 참여 주체 · AI 의 역할
- [O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) — 자동화 원칙. 사용자의 행동이 아니라 **목적**이 기준이고, 완전 자동화가 아니라 **시간 절감**이 목표다.

> 「O4O 업무분석 및 서비스 설계 기본원칙」은 현재 저장소 밖의 문서다. 필요하면 사용자(저장소 소유자)에게 요청한다.

## 2. 지금 저장소의 상태 — 리팩토링 중

O4O 는 전체 리팩토링 중이다. 그래서 다음을 전제로 읽는다.

- 저장소에 있는 구조가 모두 최종 Architecture 는 아니다. 서비스 경계와 공통 Core 는 계속 정리되고 있다.
- 과거 실험 · 데이터 구축 · 일회성 작업의 코드가 남아 있다.
- **코드가 있다는 사실이 그 기능이 현행 업무라는 근거는 아니다.** 예를 들어 cart · checkout · payment 코드가 있어도 현행 사업 기능이라는 뜻이 아니다. 판단 기준은 정본 문서다.
- 공동개발은 리팩토링이 끝나기를 기다리지 않는다. **안정된 영역부터 하나씩** 공동작업 범위를 넓힌다.

현행 여부가 궁금하면 [docs/CANONICAL-INDEX.md](../CANONICAL-INDEX.md) 를 본다. 문서별 상태(ACTIVE · FROZEN · 판정 대기)가 적혀 있다. `docs/checks/` · `docs/work-orders/` · `docs/ir/` · `docs/investigations/` · `docs/archive/` 는 **과거 시점의 실행 기록**이므로 현재 정책으로 읽지 않는다.

## 3. 첫 공동개발 대상 — neture.co.kr Main 의 O4O Agent

### O4O Agent 는 무엇인가

단순한 AI 챗봇이 아니다. 사용자가 O4O 에서 **무언가를 하려고 할 때 쓰는 자연어 기반 공통 진입점**이다.

```text
기존:       사용자 → 메뉴 탐색 → 기능 선택 → 화면 이동 → 작업
O4O Agent:  사용자 → 자연어로 의도 표현 → Agent 가 의도 파악
            → O4O 정보 · 기능 · (필요하면) 외부 AI 등 적절한 capability 활용
            → 결과 제시, 또는 필요한 작업 화면으로 연결
```

Agent 가 모든 기능을 새로 구현하는 것이 아니다. 기존 O4O 의 데이터와 기능을 활용하고, 필요할 때 외부 AI 를 쓰며, 사용자를 알맞은 O4O 기능으로 연결한다.

### 장기적으로 연결할 수 있는 범위 (예)

상품 · 약품 정보 검색 · 주문 관련 지원 · 콘텐츠 제작 · B2C 사업자의 리뷰 지원 · O4O 기능 안내 · 반복작업 자동화 · 다른 O4O 서비스 / capability 연결 · 외부 AI 활용.

**이 목록을 첫 개발에서 모두 구현한다는 뜻이 아니다.** 먼저 공통 진입점을 만들고, 리팩토링으로 안정되었거나 실제 필요가 확인된 capability 를 하나씩 붙인다. 1차 개발 범위는 별도 작업요청서로 정한다.

### 현장 검증과 함께 개선한다

O4O Agent 는 코드를 작성하는 것만으로 끝나는 트랙이 아니다. 실제 사용 환경에서 다음을 확인하며 개선한다.

- 사용자가 실제로 무엇을 요청하는가
- 어떤 기능이 필요하고, 어디서 반복 업무가 줄어드는가
- 그 요청이 특정 사용자만의 것인가, 여러 사용자에게 공통인가

현장 요청을 그대로 모두 기능화하지는 않는다. 기본 흐름은 다음과 같다.

```text
현장 요구 → 업무 문제 확인 → 공통성 판단 → O4O capability 여부 결정 → 구현
```

## 4. 어디부터 볼 것인가

monorepo 전체를 먼저 분석할 필요는 없다. **`services/web-neture` 부터** 본다.

| 무엇 | 위치 |
|---|---|
| `/` 라우트 (neture.co.kr 메인) | [services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx) — `CURRENT_HOST_PROFILE === 'main'` 일 때 `O4OHomePage` |
| 메인 화면 | [services/web-neture/src/pages/O4OHomePage.tsx](../../services/web-neture/src/pages/O4OHomePage.tsx) — 상단 주석에 화면 원칙과 변경 이력(WO)이 정리되어 있다 |
| 메인의 AI 입력(Composer) 클라이언트 | [services/web-neture/src/lib/ai/](../../services/web-neture/src/lib/ai/) — `unified-request.ts`(`POST /api/ai/request`, 서버가 대화 / 작업 / 확인을 판정) · `home-chat.ts` · `work-agent.ts` |
| 로그인 후 업무 진입 패널 | [services/web-neture/src/components/home/HomeEntryPanel.tsx](../../services/web-neture/src/components/home/HomeEntryPanel.tsx) |
| API client | [services/web-neture/src/lib/apiClient.ts](../../services/web-neture/src/lib/apiClient.ts) (`@o4o/auth-client`) |

메인에는 Agent 의 전신인 AI 입력 경로가 이미 있다. 다만 어디까지가 운영에 반영 · 검증되었는지는 착수 시점에 사용자와 확인한다. 코드가 있다고 해서 현재 제공 중인 기능으로 간주하지 않는다.

그 다음은 **구현에 실제로 필요할 때만** 따라간다.

- 백엔드 AI 라우트: [apps/api-server/src/routes/ai-proxy.routes.ts](../../apps/api-server/src/routes/ai-proxy.routes.ts) (`/api/ai` 로 mount — [register-routes.ts](../../apps/api-server/src/bootstrap/register-routes.ts))
- 라우팅 · 런타임: [apps/api-server/src/services/ai-tools/](../../apps/api-server/src/services/ai-tools/)
- 인증 · 권한 · 데이터 구조 · 공통 package: 필요한 지점에서만

### 처음부터 분석하지 않아도 되는 것

KPA 전체 · Lecture · Hospital Pharmacy · K-Cosmetics 등 다른 서비스 전체 · 은퇴한 서비스 · 과거 migration 전체 · `apps/api-server/src/scripts/**` · 과거 데이터 생산 스크립트 · historical WO / CHECK. 필요해지는 시점에 해당 부분만 확인한다.

### `src/scripts` 주의

`apps/api-server/src/scripts/**` 에는 과거 데이터 구축 · 검증 과정의 스크립트와 산출물이 대량으로 있다. 파일이 있다고 해서 현재 운영 스크립트는 아니다. 상태(ACTIVE · PAUSED · COMPLETED_ONE_OFF / LEGACY)는 [O4O-API-SERVER-SCRIPTS-INVENTORY-V1](../baseline/operations/O4O-API-SERVER-SCRIPTS-INVENTORY-V1.md) 이 정본이다.

DB 의 `o4o_api` 는 로그인 계정이 아니라 **NOLOGIN owner role** 이다. 로그인 identity 는 [SETUP.md §4](../../SETUP.md) 의 "운영 DB identity" 를 따른다.

## 5. 작업 방식

- **도구는 자유다.** IDE · LLM · 코딩 에이전트 등은 본인 판단과 비용으로 쓴다. O4O 가 특정 도구(Claude · Codex · Cursor 등)를 요구하지 않는다. 중요한 것은 결과물과 저장소 규칙 준수다. 다만 production secret · 실제 개인정보 · 운영 DB credential 등 외부 반출이 금지된 정보를 외부 도구에 넣지 않는다.
- **`main` 이 저장소 정본이다.** 공동개발자는 별도 branch 에서 작업하고 PR 로 반영한다.
- 다른 작업자의 변경을 임의로 되돌리지 않는다. 사람과 AI 세션 여럿이 같은 저장소에서 동시에 작업한다.
- 리팩토링 중이므로 기존 구조를 무조건 보존해야 한다고 가정하지 않는다. 반대로, 기존 구조를 이해하지 않은 채 대규모로 재설계하지도 않는다.
- AI 코딩 도구를 쓴다면 [CLAUDE.md](../../CLAUDE.md) · [AGENTS.md](../../AGENTS.md) 가 에이전트용 진입점이다(Git · DB 안전 규칙 포함).

## 6. Production 경계

이 저장소는 개인 계정의 Private 저장소이며, branch protection 이나 배포 승인을 **강제하지 않는다.** Production 통제는 명시적인 합의 규칙과 신뢰로 유지된다.

**사용자(저장소 소유자) 승인 없이 하지 않는 것:**

- `.github/workflows/**` 변경 (다른 branch 에 올려도 저장소 secret 으로 실행된다)
- `DEPLOY_FREEZE` 해제(`false` 로 변경) · production 통제 배포 실행 · `workflow_dispatch` 로 하는 production 작업
  (비상 시 `DEPLOY_FREEZE=true` 설정은 즉시 해도 된다. 일상 LEVEL 2 배포는 main CI 뒤 자동이다)
- `deploy/*` tag 생성 · push
- production migration · production DB write
- Secret · production credential 의 변경 · 열람 · 반출

원문: [README.md — 배포 · Production 변경 원칙](../../README.md#production-변경-원칙-공동개발자-포함--전원-적용)

**인증 정보:** 필요한 것은 본인 GitHub 계정의 저장소 접근뿐이다. 사용자의 GitHub token · SSH key · Google 계정 · GCP service account key · DB password · OAuth secret 등은 공유하지 않는다. GCP 등 운영 접근이 실제로 필요해지면 그때 최소 권한으로 따로 판단한다.

## 7. 다음에 읽을 문서

1. 이 문서
2. [O4O-BUSINESS-PHILOSOPHY-V1](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) · [O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)
3. [README.md](../../README.md) — 기여 · Production 변경 원칙
4. [SETUP.md](../../SETUP.md) — 로컬 개발환경 · 검증 명령 · DB. 공동개발 로컬환경(로컬 API + web-neture, 운영 credential 불필요)은 [§3-1](../../SETUP.md#3-1-공동개발-로컬환경--로컬-api--web-neture)
5. [O4O-API-SERVER-SCRIPTS-INVENTORY-V1](../baseline/operations/O4O-API-SERVER-SCRIPTS-INVENTORY-V1.md)
6. O4O Agent 1차 작업요청서 — 별도로 전달 예정
7. 필요할 때: [docs/CANONICAL-INDEX.md](../CANONICAL-INDEX.md) — 전체 정본 지도. 특히 역할 경계는 [O4O-ROLE-WORKSPACE-ARCHITECTURE-V1](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), 매장 commerce 경계는 [O4O-STORE-COMMERCE-BOUNDARY-V1](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)
