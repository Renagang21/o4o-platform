# COLLABORATOR-START-HERE

> **대상**: O4O 에 새로 참여하는 사람 공동개발자 · **일자**: 2026-09-30
> **상태**: ACTIVE · **최종 갱신**: 2026-10-25 — AI 공통 회계 통합·전문 기능 가격 준비 경계 반영
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

### AI 개발의 현재 기준 — 2026-10-25

신규 개발자는 현재 `main`에서 로컬 개발·테스트·PR 작업을 시작할 수 있다. 다음 공통 기반이 구현·통합됐다.

- 기존 `@o4o/ai-core` 실행기 위에 업체와 독립적인 업무 Extension 계약을 연결했다. 서비스 카탈로그의 질의·요약·초안/운영 요약과 기존 콘텐츠 번역·LMS 피드백·Neture 추천 등이 이를 사용한다.
- 기존 `modules/ai-policy`에 가격 snapshot·원자 quota 예약/정산·사용 이력을 연결했다. 새 결제·Assistant·Memory 기반을 중복 생성하지 않는다.
- Work Agent의 관찰·계획·실행·Task 책임을 분리하고 요청별 state를 공유한다. 공통 콘텐츠 편집기의 문맥 변경·늦은 응답·저장 중복 처리도 정비했다.
- 누적 변경은 PR #549/#552/#557로 main에 반영됐다. 승인된 quota migration과 API·admin·neture·kpa-society·lecture·store·kpa-branch 배포가 성공했고, 배포 후 읽기 전용 HTTP 점검 16/16이 통과했다.

이는 모든 서비스 화면의 AI 기능이나 Windows/실계정 업무 자동화가 검증됐다는 뜻은 아니다. 전문 AI의 실제 모델별 가격·예산 설정과 실계정 사용량·비용·한도, Sonar 중복률 정비, 매장·사용자 청구/외부 계정 연결은 후속 확인·개발 범위다. 신규 PC 설치·로그인도 해당 PC에서 검증한다.

책임과 적용 범위는 [AI Core + Extension 구조](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md), 운영 증거는 [최종 통합·배포 CHECK](../checks/CHECK-O4O-AI-MAIN-INTEGRATION-DEPLOYMENT-V1.md)를 읽는다. CHECK는 적용 증거이며 사업·권한 정책을 대신하지 않는다.

2026-10-25 선행 텍스트·전문 호출 정비는 [PR #811](https://github.com/Renagang21/o4o-platform/pull/811)/main `67654de1fe`에 함께 병합됐다. 이미지/PDF·화면·검색·OCR·TTS·Qwen·편집/강의 직접 호출을 기존 회계에 연결하며, 관리자 집계의 UUID 비교 오류도 실제 PostgreSQL에서 재현·수정했다. 구현 계약은 [전문 AI TODO](../work-orders/TODO-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md), 개발 검증은 [CHECK](../checks/CHECK-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md), 최신 운영 적용 증거는 [후속 통합·배포 CHECK](../checks/CHECK-O4O-AI-ACCOUNTING-INTEGRATION-20261025.md)를 따른다. native 요율/profile 미준비 시 provider 이전에 503으로 거부하므로 코드 배포를 전문 기능의 실제 사용 활성화로 해석하지 않는다. 일반 개발/fixture 테스트에는 운영 key나 유료 호출이 필요하지 않다.

## 3. 첫 공동개발 대상 — O4O Personal Assistant의 약국 경영 업무 지원

### 서비스 정의

**O4O Personal Assistant**는 사용자별 하나의 AI 업무 비서다. 사용자의 업무 목적과 상황을 이해하고, 필요한 업무를 계획·수행·검증하며, 업무 경험과 사용자 교정을 다음 작업에 활용한다. **완전 자동화가 아니라 실제 업무시간 절감**이 목표다.

첫 공동개발 대상은 **O4O를 이용하는 약국 경영자의 일상적인 반복업무**이며, 진입점은 `neture.co.kr` 메인의 자연어 채팅이다. 특정 웹사이트나 PC 프로그램 하나를 자동화하는 제품으로 정의하지 않는다.

- **일반 웹사이트:** 의약품·상품정보 조회, 공급업체 웹사이트 등에서 반복되는 업무
- **PC 프로그램:** 약국 경영자가 사용하는 Windows 업무 프로그램의 반복 조작
- **O4O 내부 기능:** 상품·매장·콘텐츠 등 권한 내 업무
- **로컬 데이터와 복합 업무:** PC 자료를 활용하거나 여러 환경을 연결하는 업무

위 항목은 **적용 대상의 예시**이며, 모두 현재 구현·운영 검증됐다는 의미는 아니다. 업무 유형과 절차를 처음부터 고정하지 않고, 실제 사용자 요청과 경험에 따라 확장한다. 사용자·매장별 검증된 방법을 우선하며 여러 매장에 하나의 표준 Workflow를 강제하지 않는다.

### AI 서비스 용어와 관계

| 용어 | 의미 |
|---|---|
| **O4O Personal Assistant** | 사용자별 하나의 공통 AI 업무 비서. 의도·Task·업무 맥락·기억·실행 조정·결과 확인을 담당 |
| **O4O Service AI Agent** | 각 O4O 서비스의 업무·데이터에 특화하는 전문 AI 기능. 공통 질의/요약·기존 업무 Extension 기반을 재사용해 확대하며, Personal Assistant와 연계하고 별도 개인 비서를 강제하지 않음 |
| **O4O Local Agent** | 사용자 PC의 브라우저·Windows 프로그램·로컬 자원을 활용하는 **실행 도구**. Personal Assistant 자체가 아님 |
| **Execution Layer / Node** | API·브라우저·MCP·RPA 등 실행 수단과 PC·클라우드 등 실행 장소 |
| **Experience / Skill** | 실제 업무 수행과 사용자 교정에서 얻는 경험, 검증을 거쳐 재사용하는 수행 능력 |

**구조 정본:** [O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md). 과거 [O4O-AUTOMATION-AGENT-ARCHITECTURE-V1](../baseline/O4O-AUTOMATION-AGENT-ARCHITECTURE-V1.md)은 SUPERSEDED이므로 신규 설계의 기준으로 사용하지 않는다.

### 첫 공동개발 착수와 산출물

첫 단계는 대규모 신규 개발이 아니라 **기존 구현을 확인하고 첫 적용 업무를 정하는 것**이다.

1. 개발자가 자신의 PC와 선호 도구로 로컬 개발환경을 구성하고 실행을 확인한다.
2. 메인 채팅·AI 요청 처리·Personal Assistant·Local Agent·일반 웹사이트/Windows 실행·경험/기억/Skill·실행 노드의 현행 구현을 필요한 범위에서 조사한다.
3. 위의 완료된 공통 기반과 실제 검증 범위를 먼저 읽고, 담당 업무의 재사용 기능·미구현 부분을 구분한다. 기존 Core·정산·Task·저장을 다시 만들지 않는다.
4. 약국 경영자의 반복업무 중 첫 적용 후보와 구현 방향·현장 검증 방법을 제안한다.

**1차 산출물:** (a) 개발환경 실행 확인 결과, (b) 현행 구현과 재사용 기능 요약, (c) 보완 필요사항, (d) 첫 자동화 적용 후보 및 구현·검증 제안.

사용자는 사업 목적·업무분석·우선순위를 결정하고, 개발자는 기술 설계·구현을 담당한다. 경험 있는 PM은 본업과 병행하여 필요할 때 **조정·조언**을 제공하며 상시 개발관리나 코드 검토를 맡지 않는다. 첫 개발범위는 조사 결과를 놓고 함께 확정한다.

### 현장 검증과 개선

사용자의 실제 요청, 소요시간, 질문·교정, 성공·부분완료·인계 사례를 확인한다. **사용자 편의와 업무 성공 가능성을 AI 비용보다 우선**하고, 반복 경험을 통해 시간·비용·사용자 개입을 줄인다. 검증되지 않은 기능을 운영 완료로 소개하지 않는다.

## 4. 어디부터 볼 것인가

monorepo 전체를 먼저 분석할 필요는 없다. **`services/web-neture` 부터** 본다.

| 무엇 | 위치 |
|---|---|
| `/` 라우트 (neture.co.kr 메인) | [services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx) — `CURRENT_HOST_PROFILE === 'main'` 일 때 `O4OHomePage` |
| 메인 화면 | [services/web-neture/src/pages/O4OHomePage.tsx](../../services/web-neture/src/pages/O4OHomePage.tsx) — 상단 주석에 화면 원칙과 변경 이력(WO)이 정리되어 있다 |
| 메인의 AI 입력(Composer) 클라이언트 | [services/web-neture/src/lib/ai/](../../services/web-neture/src/lib/ai/) — `unified-request.ts`(`POST /api/ai/request`, 서버가 대화 / 작업 / 확인을 판정) · `home-chat.ts` · `work-agent.ts` |
| 로그인 후 업무 진입 패널 | [services/web-neture/src/components/home/HomeEntryPanel.tsx](../../services/web-neture/src/components/home/HomeEntryPanel.tsx) |
| API client | [services/web-neture/src/lib/apiClient.ts](../../services/web-neture/src/lib/apiClient.ts) (`@o4o/auth-client`) |

메인에는 O4O Personal Assistant로 이어지는 AI 입력 경로가 이미 있다. 위 완료 기록과 담당 업무의 최신 CHECK에서 적용/검증 범위를 확인한다. 적용 업무·자료·도구 범위는 사용자와 정하며, 코드 존재나 배포 성공만으로 실계정 업무 검증을 완료로 간주하지 않는다.

그 다음은 **구현에 실제로 필요할 때만** 따라간다.

- 백엔드 AI 라우트: [apps/api-server/src/routes/ai-proxy.routes.ts](../../apps/api-server/src/routes/ai-proxy.routes.ts) (`/api/ai` 로 mount — [register-routes.ts](../../apps/api-server/src/bootstrap/register-routes.ts))
- 라우팅 · 런타임: [apps/api-server/src/services/ai-tools/](../../apps/api-server/src/services/ai-tools/)
- 공통 실행·업무 계약: [packages/ai-core/src/](../../packages/ai-core/src/), 서비스 Extension: [apps/api-server/src/services/ai-extensions/](../../apps/api-server/src/services/ai-extensions/)
- 가격·quota·정산: [apps/api-server/src/modules/ai-policy/](../../apps/api-server/src/modules/ai-policy/) — 기존 실행과 원장을 재사용
- 인증 · 권한 · 데이터 구조 · 공통 package: 필요한 지점에서만

### 처음부터 분석하지 않아도 되는 것

KPA 전체 · Lecture · Hospital Pharmacy · K-Cosmetics 등 다른 서비스 전체 · 은퇴한 서비스 · 과거 migration 전체 · `apps/api-server/src/scripts/**` · 과거 데이터 생산 스크립트 · historical WO / CHECK. 필요해지는 시점에 해당 부분만 확인한다.

### `src/scripts` 주의

`apps/api-server/src/scripts/**` 에는 과거 데이터 구축 · 검증 과정의 스크립트와 산출물이 대량으로 있다. 파일이 있다고 해서 현재 운영 스크립트는 아니다. 상태(ACTIVE · PAUSED · COMPLETED_ONE_OFF / LEGACY)는 [O4O-API-SERVER-SCRIPTS-INVENTORY-V1](../baseline/operations/O4O-API-SERVER-SCRIPTS-INVENTORY-V1.md) 이 정본이다.

DB 의 `o4o_api` 는 로그인 계정이 아니라 **NOLOGIN owner role** 이다. 로그인 identity 는 [SETUP.md §4](../../SETUP.md) 의 "운영 DB identity" 를 따른다.

## 5. 작업 방식

- **도구는 자유다.** IDE · LLM · 코딩 에이전트 등은 본인 판단과 비용으로 쓴다. O4O 가 특정 도구(Claude · Codex · Cursor 등)를 요구하지 않는다. 중요한 것은 결과물과 저장소 규칙 준수다. 다만 production secret · 실제 개인정보 · 운영 DB credential 등 외부 반출이 금지된 정보를 외부 도구에 넣지 않는다.
- **`main` 이 저장소 정본이다.** 독립 작업은 최신 main에서 전용 worktree·branch로 시작하고 PR로 반영한다([AGENTS §4-1](../../AGENTS.md#4-1-parallel-session--worktree-policy)). 개발은 병렬, main 통합·공유 runtime 변경은 순차다.
- 다른 작업자의 변경을 임의로 되돌리지 않는다. 사람과 AI 세션 여럿이 같은 저장소에서 동시에 작업한다.
- 리팩토링 중이므로 기존 구조를 무조건 보존해야 한다고 가정하지 않는다. 반대로, 기존 구조를 이해하지 않은 채 대규모로 재설계하지도 않는다.
- 중복·함수 길이만으로 즉시 공통화하지 않는다. 개별 서비스 작업에서는 업무 차이를 확인하고, 서비스 간 공통화는 전체 정비에서 소비처를 함께 조사한다.
- AI 코딩 도구를 쓴다면 [CLAUDE.md](../../CLAUDE.md) · [AGENTS.md](../../AGENTS.md) 가 에이전트용 진입점이다(Git · DB 안전 규칙 포함).

## 6. Production 경계

이 저장소는 **Public** 이다. 공동개발자 작업 경로는 **본인 worktree/branch → PR → required CI·review blocker 확인 → PR merge → `main`** 이다.

- `main`은 PR + required check `CI Gate`로 보호된다. 필수 human approval은 기본 gate가 아니며, 기술 gate와 계정 권한을 충족한 정상 PR merge에는 반복 사용자 승인을 요구하지 않는다. 직접 push·force push·ruleset 우회는 하지 않는다 — 상세는 [AGENTS.md §4-1(e)](../../AGENTS.md#4-1-parallel-session--worktree-policy). 실제 ruleset은 통합 직전에 조회한다.
- Production 은 소유자 통제다: `production` Environment 는 `main` · `deploy/*` tag 에서만 실행되고, `deploy/*` tag 는 소유자만 만들 수 있으며, 수동 배포는 소유자가 실행할 때만 게이트가 열린다.
- production credential은 `production` environment secret으로 둔다. [2026-10-02 이행 CHECK](../checks/CHECK-O4O-PRODUCTION-SECRET-ENVIRONMENT-MIGRATION-AND-COLLABORATOR-SAFETY-CLOSURE-V1.md)는 이전·repository 사본 삭제 완료를 기록한다. 이후 실제 등록 상태는 권한 있는 운영자가 확인하며, 과거 기록을 현재 live 조회 결과로 대신하지 않는다. 개발환경에 운영 key를 전달하지 않는다.
- GitHub Actions 의 GCP 인증은 WIF(장기 SA key 없음)이며 소유자 통제 workflow(`main` · `deploy/*` · `production` environment)에서만 성립한다. 공동개발자에게 production GCP credential 은 제공하지 않는다.

**사용자(저장소 소유자) 승인 없이 하지 않는 것:**

- `.github/workflows/**` 변경 (PR 로 올려도 merge 전 소유자 검토)
- `DEPLOY_FREEZE` 해제(`false`로 변경)·새 배포 인프라/운영 설정 변경
  (비상 시 `DEPLOY_FREEZE=true` 설정은 즉시 해도 된다. 정상 배포는 현재 Delivery gate·실행 계정 권한·공유 runtime 직렬화 규칙을 따른다)
- `deploy/*` tag 생성 · push
- 아직 명시적으로 승인되지 않은 production migration·production DB write. 이전 AI quota up 승인은 다른 migration·rollback·repair·seed/delete 승인으로 확대하지 않는다.
- Secret · production credential 의 변경 · 열람 · 반출

원문: [README.md — 배포 · Production 변경 원칙](../../README.md#production-변경-원칙-공동개발자-포함--전원-적용)

**인증 정보:** 필요한 것은 본인 GitHub 계정의 저장소 접근뿐이다. 사용자의 GitHub token · SSH key · Google 계정 · GCP service account key · DB password · OAuth secret 등은 공유하지 않는다. GCP 등 운영 접근이 실제로 필요해지면 그때 최소 권한으로 따로 판단한다.

## 7. 다음에 읽을 문서

1. 이 문서
2. [O4O-BUSINESS-PHILOSOPHY-V1](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) · [O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)
3. [README.md](../../README.md) — 기여 · Production 변경 원칙
4. [SETUP.md](../../SETUP.md) — 로컬 개발환경 · 검증 명령 · DB. 공동개발 로컬환경(로컬 API + web-neture, 운영 credential 불필요)은 [§3-1](../../SETUP.md#3-1-공동개발-로컬환경--로컬-api--web-neture)
5. [O4O-API-SERVER-SCRIPTS-INVENTORY-V1](../baseline/operations/O4O-API-SERVER-SCRIPTS-INVENTORY-V1.md)
6. O4O Personal Assistant 약국 경영 업무 자동화 1차 개발범위 — 현행 구현 조사 후 확정
7. [O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) — AI 업무 비서의 현재 구조 정본
8. [AI Core + Extension 구조](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md) — 공통 계약·현재 코드 위치·적용 완료/후속 범위. [최종 통합·배포 CHECK](../checks/CHECK-O4O-AI-MAIN-INTEGRATION-DEPLOYMENT-V1.md)는 운영 증거
9. 필요할 때: [docs/CANONICAL-INDEX.md](../CANONICAL-INDEX.md) — 전체 정본 지도. 특히 역할 경계는 [O4O-ROLE-WORKSPACE-ARCHITECTURE-V1](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), 매장 commerce 경계는 [O4O-STORE-COMMERCE-BOUNDARY-V1](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)
