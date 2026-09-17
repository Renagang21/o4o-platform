# CHECK-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1

> **WO**: `WO-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1`
> **상태**: 코드 · 단위검증 완료 — **실 병동 PC smoke(§14 3~16) = PENDING_USER_VERIFICATION**. §9 단일응답 결합 = 후속(설계 결정 + 실 하드웨어 검증 필요).
> **작성일**: 2026-09-17
> **선행(reuse 기반, 재작성 없음)**: `WO-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0`(약학정보원 워크플로) · `WO-O4O-LOCAL-DATA-SQLITE-V0`(로컬 SQLite 왕복) · `WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0` · `WO-O4O-LOCAL-WORK-AGENT-*`(옵션 C pairing/trust boundary) · `WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1`(Unified Composer)
> **commit**: `5ed603aed`(PHASE 0 결정) · `31e62159c`(게이트2 로컬 바인딩) · `aa106a7df`(게이트1 무로그인 페이지) · `c8fb4e9f7`(§11 바탕화면 진입) · 본 문서

---

## 0. 한 줄 요약

병동 PC 앞의 누구나 **로그인 없이** 원내 약품 조회·약학정보원 안내를 쓰는 파일럿 진입점(`neture.co.kr/hospital-drug`)을,
**기존 O4O 자동화 코어를 재사용**해 세웠다. 약학정보원 워크플로(healthkr)와 로컬 SQLite 왕복은 이미 CHECK 통과한 코어라
새 엔진을 만들지 않았고, 이 파일럿이 더한 것은 (1) 무로그인 병동 진입 페이지(게이트1 옵션 C) (2) 로컬 파일 바인딩·변경감지·재import
기반(게이트2, Agent 로컬 전용) (3) 화면 전용 PWA/바탕화면 진입(§11) 셋이다. **trust boundary·계약은 불변**이며, 신규 Cloud
테이블·contract 완화는 없다. 실제 병동 PC·실 Excel·실 health.kr·실 Chrome 확장을 통한 종단 smoke 는 하드웨어가 필요해
**PENDING_USER_VERIFICATION** 으로 남긴다.

---

## 1. PHASE 0 — 무로그인 Local Agent 조사 결과 (A)

실제 코드 대조로 확정(WO §4-A):

- **게이트1 = 옵션 C.** 설치 시 1회 관리자 로그인 + Local Agent pairing → 이후 병동 사용자는 저장된 세션 토큰(`o4o_accessToken`)을
  그대로 타고 요청. `local_agent_devices.user_id NOT NULL` · `local.data.*`/`/api/ai/*` 의 `authenticate`+`ctx.userId` 요구 **전부 불변**.
  loopback(127.0.0.1:47821)은 `GET /health` + `POST /pair` 만 노출 — `probeLocalAgent()`(무인증 /health)로 상태만 읽는다.
- **게이트2 = Agent 로컬 바인딩.** 파일 선택·경로 저장·import·변경감지·재import 전부 Local Agent 로컬. 웹은 `local.data.*` 로 상태·결과만 읽는다.
  파일 내용·경로는 **cloud 로 가지 않는다**. `handlers.mjs` 무-fs 불변 유지. V1 은 기존 CSV 파이프라인 재사용, XLSX 후속.
- 세션 만료/PC 초기화 시 재로그인·재pairing 은 **설치자** 몫(Pilot limitation) — 계약 완화 아님.

## 2. `/hospital-drug` 구조 (B) — 게이트1 옵션 C

- 공개 라우트: `services/web-neture/src/App.tsx` — `/cafe24` idiom 계승. `NetureLayout` 밖·guard 없음·`WorkScopeProvider` 안(바 `<Route>`).
- `resolveWorkspaceFromPath('/hospital-drug')` → 매핑 없음 → `home`(공개 축). 미인증에서도 `resolveWorkScope` 가 `status:'resolved'`(`['navigate','read']`) 반환 → `sendUnifiedRequest` 에 넣을 유효 scope 확보.
- 페이지: `services/web-neture/src/pages/HospitalDrugPage.tsx`(신규, 슬림 독립 — O4OHomePage composer 를 추출하지 않고 재구성).
  - AI 입력 = `sendUnifiedRequest`(`lib/ai/unified-request.ts`) 재사용.
  - 연결 상태 = `probeLocalAgent`(`api/localAgent.ts`) 재사용 — pairing 은 이 화면에서 실행하지 않음(설치 시 관리자 1회).
  - **옵션 C 핵심 차이(O4OHomePage 와 갈라지는 지점)**: 401(세션 만료)에서 `openLoginModal()`·이동 대신 **「재연결 필요」** 안내.
  - confirm 응답 → [진행] 버튼이 `routeHint:'work'` 로 재전송(기존 계약 그대로).
- 로그인/회원가입 UI 없음.

## 3. Excel Local Data Source (C) — 게이트2 기반

- `tools/o4o-local-agent/src/local-db.mjs`: v4 마이그레이션 `source_bindings_v1`(`local_source_bindings`) + `LocalSourceBindingRepository`(upsert/recordImport/get/list). `file_path` **로컬 전용** — `localDbHealth`·`local.data.*` 로 노출 안 함.
- `tools/o4o-local-agent/src/local-data-cli.mjs`(유일한 사용자 파일 접근 지점): `bind`·`sync`·`bindings` 케이스 + `statFile`/`isChanged`/`reimportBinding`. 모든 fs 는 CLI 안에만.
- 저장 = **additive local-db migration only**. 신규 Cloud 테이블 0 · contract 완화 0.

## 4. Excel 변경 감지·reimport (D) — 게이트2

- WO §7 계승: file size + mtime 만 비교. unchanged→skip · changed→재읽기→검증→replace · import 실패→기존 SQLite 유지. 행 단위 diff 없이 전량 재import(V1).
- 단위검증: `local-data-runtime.test.mjs` 신규 케이스 — bad source name 거부(exit 1)·bind 3행·sync unchanged·파일 증가 후 재import 4행·실패 시 기존 4행 유지(exit 3)·bindings 목록.

## 5. 약학정보원 Workflow (E) — **기존 코어 재사용**

- `siteId:'healthkr'` · `displayName:'약학정보원'` 워크플로는 이미 등재·구현·**실 Chrome+실 health.kr smoke 13/13** 완료
  (`CHECK-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0`). WO §8 의 사용자 경로
  `상품명 검색 → 제품 선택 → 의약품 정보 → 동일성분` 이 EntryPoint 4종(`DRUG_SEARCH`·`DRUG_DETAIL`·`SAME_INGREDIENT`·`PILL_IDENTIFICATION`)으로 존재.
- 병동 페이지의 `sendUnifiedRequest` → `/api/ai/request` → `classifyUnifiedRequest` 가 "약학정보원…동일성분" 류를 이미 `work`(healthkr)로 라우팅
  (`unified-request-router.spec.ts` 검증). **재작성 없이 그대로 도달**한다.
- 동일성분: native `result_sunb.asp` 이 robots-Disallow 라 성분명 추출 후 성분 재검색으로 **대체**(코어 기존 동작).

## 6. Local Data 결합 (F) — 부분: 재사용 도달 O / 단일응답 자동결합 = 후속

- 두 반쪽 모두 존재·병동 페이지에서 도달 가능: (a) 약학정보원 워크플로(work) (b) `local.data.*` 조회(tool-router). `resolveAvailableTools` 는 둘 다 노출 가능.
- 그러나 엔진은 **요청당 tool 1**(Local Agent 계약, frozen). 따라서 "약학정보원 성분 확인 + 원내 SQLite 검색 + 결과 결합" 을 **한 응답으로 자동 결합**하는 것은
  현재 엔진으로 성립하지 않는다 — 신규 오케스트레이션(composite flow)이 필요하고, 이는 WO 가 "재사용, 엔진 확장 금지" 로 못박은 영역이며
  실 병동 PC·실 확장·실 health.kr·실 Excel 없이는 종단 검증 불가.
- **최소 대안(현재 동작)**: 병동 사용자가 2단계 순차 질의(약학정보원 조회 → 원내 약 조회)로 수행 — 현 병동 페이지가 이미 지원.
- **후속(별도 WO 후보)**: 단일응답 결합 = composite flow 설계 결정 + 실 하드웨어 smoke.

## 7. AI 화면 (G)

병동용 단일 입력창 + 실행 버튼 + 예시 질의 3종 + Agent 연결 배지(읽기 전용) + 결과(chat/work/confirm/재연결/error) 렌더. 첨부 UI 는 V1 슬림 범위에서 제외(텍스트 질의 우선).

## 8. Desktop shortcut·PWA (H) — §11

- 화면 전용 PWA manifest 를 `<link rel="manifest">` Blob 으로 **이 화면에 있는 동안만** head 에 주입, 언마운트 시 제거·revoke.
  표시명 `원내 약품 안내` · `start_url:/hospital-drug` · `display:standalone` → Chrome/Edge 「앱 설치」가 이 화면에만 뜨고 사이트 전역엔 영향 없음.
- 사이트 전역 manifest 신설하지 않음(index.html 무변경). 설치 강제 없음 — 어떤 브라우저든 URL 직접 사용 가능.
- 접이식 「이 화면을 바탕화면에 추가하기」 안내(설치 아이콘·즐겨찾기 대안).

## 9. Safety·Privacy (I)

- V1 은 환자 개인정보를 다루지 않는다. Excel·Local SQLite 원내 자료는 사용자 PC local-first — cloud 에 원본·raw rows·file path·환자정보 저장 안 함(상위 WO 옵션 B 계승).
- never-escalate(조제보고·마약류 전송·심평원/공단/정부 제출·청구·결제·승인확정·전자서명·외부 전송)는 자동 수행 없음 — 항상 사용자 직접(TAKEOVER). 기존 Safety/Risk 규칙 유지.

## 10. 검증 결과 (J·K)

**단위·타입 검증 (완료):**

| 검증 | 결과 |
|---|---|
| `tsc --noEmit` (web-neture) | EXIT=0 |
| web-neture vitest 전체 | **92/92 pass** (HospitalDrugPage 6 신규 포함) |
| local-agent `node --test` 전체 | **116/116 pass** (게이트2 바인딩 케이스 포함) |
| HospitalDrugPage 테스트 | 무로그인 입력창·로그인 UI 부재 / 정상응답 / 401→재연결(모달·이동 없음) / Agent 미연결 배지 / §11 안내 펼침 / manifest head 주입·언마운트 복구 |

**실 병동 PC smoke — PENDING_USER_VERIFICATION** (§14, 하드웨어 필요 · 대상앱 조작은 Agent 가 수행):

`3 Local Agent 연결 · 4 Excel 최초 선택 · 5 import · 6 SQLite 조회 · 7 변경 없음 · 8 새 Excel 덮어쓰기 · 9 변경 감지 · 10 정상 reimport ·
11 잘못된 Excel→기존 유지 · 12 약학정보원 검색 · 13 동일성분 · 14 Local Data 결합 · 15 병동 AI 입력창 실 질의 · 16 바탕화면/shortcut 진입`.

> 코드 경로별 단위검증은 통과했으나, 실제 병동 PC·실 Excel·실 health.kr·실 Chrome 확장 종단 왕복은 **미수행**이다. 미검증을 PASS 로 보고하지 않는다.

## 11. 범위 밖 관찰

- §9 단일응답 자동결합 = 별도 WO 후보(§6). 코어(엔진) 확장은 이 파일럿 범위 밖.
- XLSX 직접 import = WO 명시 후속(V1 CSV 우선).

## 12. Git (L)

- path-specific staging · `git add .`/`--force`/`stash` 미사용 · 커밋마다 `check-staged-scope.mjs` 통과.
- 완료 조건: 이번 작업 미커밋 0 · `HEAD == origin/main`(`c8fb4e9f7`).

---

## 상태 키 (WO §16)

```text
HOSPITAL_DRUG_ENTRY    = DONE (공개 라우트 + 슬림 페이지, 단위검증)
ANONYMOUS_WARD_USE     = DONE (옵션 C 무로그인 · 401→재연결 · trust boundary 불변, 단위검증)
LOCAL_AGENT_ACCESS     = DONE (probeLocalAgent 무인증 상태 표시 · pairing 은 설치 시 1회)
EXCEL_LOCAL_SOURCE     = DONE_CODE / PENDING_SMOKE (게이트2 bind·import 로컬 · 실 Excel smoke 미수행)
LOCAL_SQLITE_UPDATE    = DONE_CODE / PENDING_SMOKE (변경감지·재import·실패 시 기존 유지, 단위검증)
PHARMACY_INFO_WORKFLOW = REUSED (healthkr 기존 코어 · 실 smoke 13/13 완료 · 병동 페이지에서 도달)
DESKTOP_ENTRY          = DONE_CODE / PENDING_SMOKE (화면 전용 manifest·안내 · 실 설치 smoke 미수행)
PRODUCTION_SMOKE       = PENDING_USER_VERIFICATION (실 병동 PC 종단 §14 3~16)
```

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(§9 단일응답 자동결합 composite flow).
