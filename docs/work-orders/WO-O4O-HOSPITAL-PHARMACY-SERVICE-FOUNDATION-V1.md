# WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1

> **상태: 핸드오프 (미실행)**
> 등록일: 2026-09-22 · 등록 시 HEAD: `d25e3757b50b12795a51d1b17b147658e6c92f77` (main)
> 이 문서는 실행 대상 작업요청서이며, 본 커밋 시점에는 **어떤 코드도 구현되지 않았다.**
> 실행은 별도 명시 지시가 있을 때만 착수한다. 실행 전 아래 "작업 시작 전 공통 확인"을 먼저 수행한다.

---

## 작업 시작 전 공통 확인

1. VS Code/Claude Code 선택 영역 공유를 해제하고, 긴 문서·JSON이 자동 첨부되지 않았는지 확인한다.
2. 현재 폴더가 실제 O4O 저장소인지 확인한다.
3. `git fetch origin` → `git status -sb` → `git rev-parse HEAD origin/main` 으로 상태를 점검한다. 작업트리가 clean 할 때만 `pull --ff-only`.
4. 다른 세션의 dirty·미추적·staged 파일은 불가침(수정·삭제·stash·restore·reset 금지). 본 작업 경로만 path-specific stage/commit.
5. 현재 `main` 코드를 기준으로 조사한다. 과거 문서와 코드가 다르면 현재 코드를 우선하고 차이를 보고한다.
6. 관련 정본을 먼저 읽는다: `CLAUDE.md`(진입점) · [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) · 공통 자동화 Core CHECK([`CHECK-...-INTEGRATION-AND-CLOSURE-V1`](../checks/) 계열).

---

## 1. 목표와 배경

병원약국(Hospital Pharmacy)을 **O4O 공통 Automation Core 를 소비하는 독립 전문 서비스**의 Foundation 으로 세운다. 방향 확정(2026-09-22, 사용자):

> **O4O Main = 범용 자동화 환경 / Hospital Pharmacy = 그 환경을 소비하는 전문 서비스.**

핵심 경계(오염 방지의 정본):

* **Generic File Understanding** = 파일 구조(sheet/section/header/column) 이해까지만. product_name/ingredient/strength 같은 **병원 필드 의미를 몰라야 한다.**
* **Hospital Pharmacy Domain** = 그 구조에서 무엇이 원내 약품명·성분·함량·제형·제조사·원내코드인지 **정의**한다.

배경(census 결과, 2026-09-22 · read-only):

* 현행 [hospital-drug-surface.ts](../../apps/api-server/src/services/ai-tools/hospital-drug-surface.ts) 는 **이미 공통 Core(`classifyTaskModality` → `runWebResearch` / Astra `performWorkAgentRun` / local / question)를 소비**한다. 진입은 [ai-proxy.routes.ts](../../apps/api-server/src/routes/ai-proxy.routes.ts) 의 `surface:'hospital-drug'` 인라인 분기.
* **서버 RDB 엔티티·migration 0건** — DDL 부채 없이 새 서비스로 이전 가능.
* 원내 Excel 파서는 프런트 [localDataset.ts](../../services/web-neture/src/lib/hospital-drug/localDataset.ts) 가 **자체 HEADER_ALIASES 로 독립 구현**(공통 Core 미사용). 이 별칭-추적 방식이 이번에 폐기 대상이다(§2·D2 참조).
* 약학정보원(health.kr) 자동화 스택 존재: [healthkr-adapter.ts](../../apps/api-server/src/services/local-agent/healthkr-adapter.ts) · [pharmacy-web-core.ts](../../apps/api-server/src/services/local-agent/pharmacy-web-core.ts) · [pharmacy-web-executor.ts](../../apps/api-server/src/services/ai-tools/pharmacy-web-executor.ts).
* 구세대 [hospital-drug-composite.ts](../../apps/api-server/src/services/ai-tools/hospital-drug-composite.ts) 는 SUPERSEDED·미배선(폐기 대상, 단 surface 가 재사용하는 `queryLocal`/`renderLocalBlock` 두 헬퍼만 이전).

### 확정 결정(D1~D3 — 실행 시 재논의 불필요)

* **D1. 원내 Excel 처리 = Generic File Understanding 전면 전환.** 기존 브라우저 HEADER_ALIASES 파서를 **신 서비스로 이식하지 않는다.** 원내 Excel → Generic File Understanding(구조 이해) → **Hospital Pharmacy TargetSchema** 매핑 → deterministic normalization → `HospitalDrugRecord[]`. 구조추론용 최소 sample 만 Gemini 로 가고, 전체 행 정규화는 로컬에서 결정론적으로.
* **D2. 원내 데이터 SSOT = 브라우저 localStorage (Local-first V1).** 병동 PC 브라우저가 파싱·저장·조회를 완결한다. 서버는 research 만. 서버 SQLite(`hospital_drug_list`) 경로는 신 서비스에서 **미사용**으로 정리. **환자정보는 V1 에 넣지 않는다.**
* **D3. 대표 업무 E2E = §5 예시 6종 그대로**(원내 보유확인 / 동일성분 원내약 / 대체약 / 성분·주의사항 조사 / 주문 가능 확인 / 병원 프로그램 재고).

---

## 2. 승인 범위

이 WO 로 승인되는 것:

1. **census 판정 확정** — §1 배경의 census(재사용/폐기/이동 초안)를 코드 재확인 후 최종 판정표로 확정.
2. **`packages/hospital-pharmacy-core` 신설** — 병원약국 도메인만 아는 얇은 Core. 최소 골격:
   * `domain/` — `HospitalDrugRecord`, `HospitalContext`, `HospitalDrugQuery` 등 타입.
   * `target-schema/` — Hospital Pharmacy TargetSchema(Generic File Understanding 이 소비할 필드 정의: product_name·ingredient·strength·dosage_form·manufacturer·원내코드·status).
   * `local-context/` — localStorage dataset 조회·동일성분 매칭(브라우저에서 동작하는 순수 로직).
   * `workflows/` — (골격만, 실제 사이트/프로그램 워크플로는 후속).
3. **`services/web-hospital-pharmacy` 신설** — 병동/약제부 UI 전용 web 서비스. Foundation 범위는 **병동 화면(자연어 입력·원내약 확인·외부 조회) + 약제부 최소(원내 Excel 연결/교체)**. 배포 파이프라인(`deploy-*.yml`) 등재 포함.
4. **공통 Core 소비 배선** — 신 서비스가 Generic File Understanding(D1) · `runWebResearch` · Astra · Task Modality Router · QUESTION/same-run resume 를 **소비**하도록 연결. 새 Router·새 provider·새 Recovery Engine 신설 금지.
5. **기존 자산 이전/폐기 집행** — surface 진입 로직·health.kr 스택·`HospitalDrugPage` UX 를 신 서비스 기준으로 선별 이식, composite 폐기(§1).
6. **대표 업무 6종 E2E(D3) + 배포 후 실브라우저 smoke.**

Core 소비는 additive 여야 한다. 공통 Core 파일 수정이 필요하면 **중지하고 보고**(별도 WO) — 이 WO 는 Core 를 확장하지 않는다.

---

## 3. 실행 순서

```text
census 재확인·판정 확정
  → hospital-pharmacy-core 골격(domain·target-schema·local-context)
  → web-hospital-pharmacy 골격 + 배포 등재
  → Generic File Understanding 연결(원내 Excel → TargetSchema → HospitalDrugRecord[])
  → Local Hospital Context(localStorage SSOT) 조회·동일성분 매칭
  → 자연어 질의 배선(surface 로직 이전 · runWebResearch · Astra · QUESTION/resume)
  → 대표 업무 6종 E2E
  → 배포 → 실브라우저 smoke
  → CHECK 작성 → path-specific commit → push
```

* 각 단계는 결정론 테스트를 동반한다(Core 소비 지점은 기존 테스트 패턴 재사용).
* 병원 프로그램/사이트(PC) 자동화의 **개별 어댑터 추가는 이 WO 범위 밖**(§4). Foundation 은 "재고 확인" 질의가 QUESTION→USER_HINT→resume 로 흐르는 **경로**까지만 세운다.
* Excel 구조가 별칭으로 안 잡히던 형식도 Generic File Understanding 으로 흡수되는지 최소 1개 실제-형 sample 로 확인한다(§1 "어떤 형식에도 안 막힌다").

---

## 4. 제외 범위

* **공통 Automation Core 수정**(Gemini/Astra/File Understanding/Router/Runtime 계약 변경). 필요 시 중지·보고·별도 WO.
* **병원별 개별 프로그램·사이트 어댑터 신규 작성**(health.kr 외 신규 사이트, 병원 재고 프로그램 등). 경로 골격만 세우고 실제 어댑터는 후속.
* **환자정보 처리**·중앙 서버 원내 데이터셋 저장(다중 PC 배포)·서버 RDB 원내약 테이블 신설.
* **로그인·OTP·승인 대행**([[feedback-no-external-genai-ui-automation-role-split]] · 로그인은 사용자 직접).
* 새 AI provider·새 Workflow Engine·새 Recovery Engine·WebMCP·공개 API·대규모 UI 리팩터.
* 기존 별칭 파서(localDataset.ts) **이식**(D1 로 폐기 확정 — 신 서비스로 옮기지 않는다).

---

## 5. 중지 조건 (아래는 진행 멈추고 사용자 판단 요청)

* 공통 Core 파일 수정이 불가피하다고 판단될 때.
* `package.json`·lockfile·dependency 변경, Docker/CI/배포 인프라 변경이 필요할 때(신 서비스 배포 등재는 승인 범위이나, 방식이 기존 패턴에서 벗어나면 보고).
* DB schema·migration·데이터 write 가 필요하다고 판단될 때(본 WO 는 DDL 0 전제).
* 권한·role·route contract·결제·정산·법률 판단이 얽힐 때.
* census 재확인 결과 §1 배경과 실제 코드가 크게 달라 재사용/폐기 판정이 뒤집힐 때.
* 실제 계정·자격정보·외부 서비스 승인이 필요할 때.

**대표 업무 6종 E2E — 확정 대상(D3):**

| # | 업무 | 실행 경로 |
|---|---|---|
| 1 | "타이레놀 500mg 원내에 있어?" | Local Hospital Context(localStorage) |
| 2 | "이 약과 같은 성분의 원내약 찾아줘" | runWebResearch(성분) + Local Context |
| 3 | "이 약 대신 원내에서 쓸 수 있는 약?" | runWebResearch + Local Context |
| 4 | "이 성분 효능·주의사항 조사해줘" | runWebResearch |
| 5 | "이 약 주문 가능한지 확인해줘" | Astra/QUESTION(절차 불명확 시 사용자 힌트) |
| 6 | "병원 프로그램에서 재고 확인" | Astra + QUESTION→resume(프로그램명/경로 힌트) |

각 업무에서 절차가 불명확하면 **QUESTION 은 실패가 아니라 정상 실행 상태**다(사용자 힌트→same-run resume→성공→Workflow Candidate 신호).

---

## 6. 검증과 Git

* 결정론 테스트: 신 core·surface 이전 로직·TargetSchema 매핑·Local Context 조회에 대해 신설/이전 테스트 통과. `apps/api-server` tsc 0, 신 web 서비스 build PASS.
* **실브라우저 smoke**([[feedback_browser_smoke_real_verification.md]]): 배포 후 병동 화면에서 원내 Excel 연결 → 6종 질의 흐름을 실제 브라우저로 확인. 빌드 성공만으로 UI 종결 금지. smoke 불가 시 구체적 사유 기록.
* Git: `git add .`/`-A`/`commit -am` 금지. path-specific stage only. 커밋 직전 `node scripts/git/check-staged-scope.mjs <경로...>` → `git commit -m "..." -- <경로...>`. `--force` push 금지. 다른 세션 파일 불가침.
* 완료 조건 = **이번 WO 범위 미커밋 0건 + HEAD == origin/main**.
* 공통 모듈 소비처 영향 시 `node scripts/quality/check-literal-consumers.mjs` 로 소비처 식별.

---

## 7. 완료 보고

한국어·존댓말. 다음을 포함한다:

1. 제목에 WO 명(`WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1`).
2. census 최종 판정표(재사용/폐기/이동 — 확정본, 초안 대비 변경점).
3. 신설물: `packages/hospital-pharmacy-core`(구성) · `services/web-hospital-pharmacy`(화면 범위) · 배포 등재.
4. Core 소비 배선 지점(어느 Core 를 어디서 소비하는지) — additive 확인, Core 수정 0 확인.
5. 이전/폐기 집행 결과(composite 처리 포함).
6. 검증: 테스트 결과(suite/개수) · tsc · web build · **실브라우저 smoke 6종 결과**(통과/미실행 사유 정직히).
7. CHECK 문서 경로 · commit hash · `HEAD == origin/main` 확인.
8. **문서 정합**: `발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건`(없으면 해당 없음).

후속(이 WO 범위 밖 · 별도 WO): 병원 프로그램/사이트 개별 어댑터, 약제부 관리 화면 심화, 중앙 원내 데이터셋(다중 PC), 병동 화면 다국어화.

---

*Source of Truth: 병원약국 트랙 방향(2026-09-22) · 공통 자동화 Core CHECK(READY_FOR_SURFACE_ADOPTION) · CLAUDE.md 실행 안전 규칙.*
