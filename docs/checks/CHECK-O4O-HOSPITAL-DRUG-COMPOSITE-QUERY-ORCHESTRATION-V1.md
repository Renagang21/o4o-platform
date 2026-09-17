# CHECK-O4O-HOSPITAL-DRUG-COMPOSITE-QUERY-ORCHESTRATION-V1

> **WO**: `WO-O4O-HOSPITAL-DRUG-COMPOSITE-QUERY-ORCHESTRATION-V1` (파일럿 `WO-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1` §9 후속)
> **상태**: 코드 · 단위검증 완료 — **실 병동 PC 종단 smoke(§14) = PENDING_USER_VERIFICATION**. 결합 오케스트레이션은 「요청당 tool 1」 계약을 지키며 성립.
> **작성일**: 2026-09-17
> **선행(reuse 기반, 재작성 없음)**: `WO-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0`(약학정보원 워크플로) · `WO-O4O-LOCAL-DATA-SQLITE-V0`(로컬 SQLite 왕복 · `local.data.query`) · `WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1`(Unified Composer 라우터) · `WO-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1`(무로그인 병동 진입)
> **commit**: `10fdf33e1`(Layer 1 agent `local.data.query`) · `4f8dd3b90`(Layer 2 서버 `local.data.query` 계약) · Layer 3(결합 오케스트레이션) · Layer 4(병동 페이지 렌더) · 본 문서

---

## 0. 한 줄 요약 (A)

병동에서 **한 문장**("우루사정 200mg과 같은 성분의 원내약 있어?")을 넣으면, 서버가 이를 내부에서
**약학정보원(health.kr)로 성분 식별 → 원내 SQLite 성분 조회**로 이어 실행하고 그 결과를 **하나의 한국어 답**으로
합쳐 돌려준다(§9). 파일럿 CHECK 가 "요청당 tool 1 계약 때문에 자동 결합 불가"로 후속 분리했던 지점을,
**엔진을 확장하지 않고** cloud 쪽 결정론 오케스트레이터로 푼다 — 각 단계는 여전히 tool 1개씩, 기존
`executeAiTool`(권한·인자 게이트)을 그대로 지난다. 신규 Cloud 테이블·contract 완화·LLM 호출·약품별 하드코딩
workflow 는 없다. 실 병동 PC·실 health.kr·실 Excel·실 확장 종단 왕복은 하드웨어가 필요해 **PENDING_USER_VERIFICATION**.

---

## 1. 단일 요청 → 다중 소스 → 하나의 답 (B·§9)

`apps/api-server/src/services/ai-tools/hospital-drug-composite.ts`(신규) — 의존성 주입형 결정론 오케스트레이터.

- **엔진 밖에서 성립**: 파일럿 CHECK §6 이 못박은 「요청당 tool 1」(Local Agent 계약, frozen)은 그대로다.
  결합은 Local Agent 안이 아니라 **cloud 오케스트레이터가 단계마다 tool 1개짜리 호출을 순차로** 낸다 —
  ① health.kr 동일성분(1 tool) → ② `local.data.query`(1 tool). 엔진 확장 0.
- **§9 금지 패턴 회피**: "health.kr 답 → 사용자에게 다시 되묻기 → 두 번째로 로컬" 이 아니다. 한 요청 안에서
  내부 분해·실행·병합해 **한 번의 답**을 만든다(`runHospitalDrugComposite`).
- **게이트 유지**: 주입되는 `exec` 는 실사용에서 `executeAiTool(AppDataSource, name, args, toolCtx)` 를 감싼다 →
  `assertToolAllowed` → `validateToolArguments` → executor 가 **단계마다 다시** 걸린다. 오케스트레이터는 권한을 넓히지 않는다.
- **저장 경계(§4)**: health.kr 결과·원내 raw row 를 cloud 에 저장하지 않는다 — 응답 렌더링에만 쓰고 버린다.
  로그는 plan·단계 결과(`source:outcome`)만, 제품명·성분·값 원문·raw row 는 남기지 않는다(`ai-proxy.routes.ts`).

## 2. 실행 경로 판정 — 사용자는 경로를 고르지 않는다 (C·§2)

`unified-request-router.ts` — `classifyUnifiedRequest` 가 runId 재개 다음, 대상 등재 판정(`resolveWorkTarget`) **앞**에서
결합 요청을 가로챈다.

- `isCompositeHospitalDrugRequest` = `extractProduct(제품 토큰)` 있음 **AND** (`원내` 지시 **OR** `동일성분` 지시).
- 대상 등재 여부와 무관하게 판정 — "원내에 우루사정 200mg 있어?"(§13-B)는 등재 사이트/앱 이름이 없어(target=null)
  기존엔 chat 으로 샜다. 이제 composite 로 간다.
- `planForMessage`: 동일성분→`web_and_local` · 원내→`local_only` · 그 외 웹 의도(DRUG_SEARCH/DETAIL)→`web_only` ·
  제품은 있으나 소스 불명확→`local_only`(병동 기본 관심) · 제품 없음→`unsupported`.

## 3. 약학정보원 결합 (D·HEALTHKR) — 기존 코어 재사용

- `web_and_local` 은 `healthkr.same_ingredient` EntryPoint 1회로 성분 확정. 성공(`outcome:'list'`, `ingredient` 확정)이면
  그 성분으로 원내 조회 단계로 이어간다. `resolvePharmacyWebIntent`·EntryPoint 4종은 코어 그대로(재작성 없음).
- `web_only`(§13-C "성분이 뭐야")는 `healthkr.drug_search` 1회로 성분만 안내(원내 조회 없음).

## 4. 원내 결합 (E·LOCAL_DATA) — `local.data.query` 재사용

- `local_only`/`web_and_local` 의 원내 단계는 Layer 1/2 에서 노출한 `DATA_LOCAL_QUERY`
  (`dataset:hospital_drug_list`, `match:'contains'`, `limit:50`) 로 조회 — 좁은 필드 조회, raw 테이블 덤프 아님.
- `local_only` 은 `product_name` 축, `web_and_local` 은 확정 성분으로 `ingredient` 축.
- 반환 row 는 서버 `pickSafeDataQueryInfo` 가 canonical 7필드(snake_case)로 이미 화이트리스트.

## 5. 결과 매칭 (F·RESULT_MATCHING·§7)

- 매칭 축 **성분 → 함량 → 제형 → 제조사/상품명**. `renderRow` 는 canonical 필드만, 없는 값은 비운다(지어내지 않음).
- 함량이 문장에 있으면(`extractStrength`) `orderRows` 가 그 함량 일치 행을 앞으로 정렬(§7 함량 축). 정확 일치가
  없으면 "요청 함량과 정확히 일치하는 항목은 확인되지 않았습니다" 를 문장으로 밝힌다(확신 낮음 명시).

## 6. 같은-run 복구 / 오류 처리 (G·SAME_RUN_RECOVERY·§10)

- **health.kr 실패(§13-F)**: 지어내지 않는다. 실패 사유를 밝히고(`healthkrFailureLine`), 대신 원내에 그 제품(상품명)이
  있는지만 확인해 함께 답한다. 없는 성분·동일성분 건수를 답에 넣지 않는다.
- **Local Data 미연결(§13-D)**: `LOCAL_UNAVAILABLE_CODES`(NO_DEVICE/OFFLINE/DB_NOT_AVAILABLE/DB_NOT_READY)면
  "원내 약품 파일이 연결되어 있지 않습니다. **[원내 약품 파일 연결]**이 필요합니다." 안내.
- **상품명 모호(§13-E)**: health.kr `outcome:'multiple'` 이면 성분을 **확정하지 않고** 후보를 보여 주고 정확한
  상품명 재입력을 요청 — **원내 조회로 넘어가지 않는다**.
- **파일럿 편차(기록)**: 파일럿 §10 은 모호 시 PHASE 1 same-run QUESTION/resume 재사용을 권했으나, 결합 응답은
  이미 하나의 답이라 **답 안에서 되묻는(in-answer clarification)** 방식으로 처리한다(Work-Agent resume 아님).
  결정론·한 요청 한 답 원칙을 지키기 위한 의도적 선택.

## 7. 병동 페이지 렌더 (Layer 4)

- `services/web-neture/src/lib/ai/unified-request.ts`: `UnifiedRequestResult` 에 `kind:'composite'` 추가(`CompositeResult`).
- `HospitalDrugPage.tsx`·`O4OHomePage.tsx`: composite 응답이면 서버가 이미 합친 `composite.message` 를 그대로
  `answer` 로 렌더(추가 LLM·재조립 없음). O4O 홈 composer 도 같은 엔드포인트라 동일 처리.

## 8. 검증 결과 (H·I·J)

**단위·타입 검증 (완료):**

| 검증 | 결과 |
|---|---|
| `tsc --noEmit` (api-server) | error 0 |
| `tsc --noEmit` (web-neture) | error 0 |
| `hospital-drug-composite.spec.ts` (신규) | **13/13 pass** (§13 A~F + 파싱·분류·미검출 되묻기) |
| `unified-request-router.spec.ts` (갱신) | pass — §9 동일성분→composite · 일반 검색 업무→work 경계 고정 |
| `unified-request-http.spec.ts` (갱신) | pass — ②-b 결합 요청→`kind:composite`(Work/chat 미호출) 신규 |
| api-server ai-tools 관련 20 스위트 | **388/388 pass** (회귀 없음) |
| web-neture vitest 전체 | **93/93 pass** (HospitalDrugPage composite 렌더 신규 포함) |

**§13 필수 문장 매핑:**

- A `web+local` "우루사정 200mg과 같은 성분의 원내약 있어?" → 성분 확정 → 원내 성분 조회 → 하나의 답(200mg 우선 정렬).
- B `local_only` "원내에 우루사정 200mg 있어?" → web 단계 없이 원내 상품명 조회만.
- C `web_only` "우루사정 200mg 성분이 뭐야?" → 원내 조회 없이 health.kr 성분만. (프로덕션 분류기는 C 를 chat 으로
  두어 홈 composer 회귀를 막고, 오케스트레이터 web_only 분기는 `runHospitalDrugComposite` 직접호출로 단위검증.)
- D local 미연결 → [원내 약품 파일 연결] 안내. E 상품명 모호 → 후보 제시·원내 조회 중단. F health.kr 실패 → 지어내지 않음 + 원내 상품명 fallback.

**실 병동 PC 종단 smoke — PENDING_USER_VERIFICATION** (§14, 하드웨어 필요 · 대상앱 조작은 Agent 가 수행):
실제 병동 PC·실 Excel(원내 목록)·실 health.kr·실 Chrome 확장을 통한 한 문장 결합 왕복은 **미수행**. 미검증을 PASS 로 보고하지 않는다.

## 9. 금지 준수 (WO §4)

약품별 하드코딩 workflow · 범용 workflow engine · 병동 전용 AI 에이전트 · 별도 브라우저 엔진 · health.kr 결과/원내 raw row
Cloud 저장 · 신규 큐/스케줄러 · 병동 계정/tenant · 환자 데이터 — **전부 없음**. 이 모듈은 "제품식별 → 원내조회" 라는
한 가지 결합만 결정론으로 수행한다.

## 10. Git (L)

- path-specific staging · `git add .`/`--force`/`stash` 미사용 · 커밋마다 `check-staged-scope.mjs` 통과.
- 다른 세션 미추적 파일(`docs/investigations/IR-O4O-PRIVACY-POLICY-...`) 불가침 — pathspec 커밋으로 미접촉.
- 완료 조건: 이번 WO 범위 미커밋 0 · `HEAD == origin/main`.

---

## 상태 키 (WO §17)

```text
HOSPITAL_DRUG_COMPOSITE    = DONE_CODE / PENDING_SMOKE (한 문장 → 두 소스 → 하나의 답, 단위검증)
SINGLE_REQUEST_MULTI_SOURCE= DONE (요청당 tool 1 유지 · cloud 순차 오케스트레이션 · §9 금지패턴 회피)
HEALTHKR                   = REUSED (same_ingredient/drug_search EntryPoint 코어 재사용 · 재작성 0)
LOCAL_DATA                 = REUSED (local.data.query Layer 1/2 재사용 · canonical 7필드 화이트리스트)
RESULT_MATCHING            = DONE (성분→함량→제형→제조사 · canonical 필드만 · 저확신 명시, 단위검증)
SAME_RUN_RECOVERY          = DONE (in-answer clarification · 미연결/모호/실패 §10 분기, 단위검증)
PRODUCTION_SMOKE           = PENDING_USER_VERIFICATION (실 병동 PC 종단 §14 · 대상앱 조작은 Agent 가)
```

## 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
발견: `CHECK-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1.md` §6·§11·상태 키가 "§9 단일응답 자동결합=후속(별도 WO)"
로 남아 있음 — 본 CHECK 로 그 후속이 구현·단위검증됨(실 smoke 만 PENDING). 파일럿 WO §16 실행결과 노트에 후속 링크
1줄만 보강(기록물, §16-4 대상 아님). 파일럿 CHECK 본문은 과거 시점 기록이라 변경하지 않음.
