# CHECK — WO-O4O-COMMON-AUTOMATION-CORE-USER-COLLABORATION-AND-QUESTION-FLOW-V1

> 대상: O4O Main 자동화의 **사용자 협업 규칙**(첫 사용 안내 · 새 작업 도움 요청 · 진행 중 막힘 · QUESTION/TAKEOVER 분리 · same-run resume)을 **하나의 공통 협업 체계**로 공통 Core 에 정착
> 결과: **PASS · CLOSED** — `AUTOMATION_USER_COLLABORATION_STATUS = READY`
> 일자: 2026-09-21
> 성격: 세 가지(A 첫 사용 안내 · B 새 작업 QUESTION 도움 · C 진행 중 막힘)를 **분할하지 않고 하나의 체계로** 판정한다(§0). 핵심 원칙: **사용자에게 질문함 ≠ 자동화 실패 — QUESTION 은 정상 실행 상태다.**

---

## 1. 한 줄 요약

협업 체계의 **기계(machinery)는 이미 대부분 존재**한다 — QUESTION↔TAKEOVER 분리(coordination `waiting_for_user`/`taken_over` + runtime `terminalKind` + `resumable`), same-run resume(version-checked optimistic claim · 관찰 미영속), 사용자 힌트 주입(안전 경계 유지), no-progress escalation(normal→strong→user_assistance). 이번 WO 는 이 조각들이 **하나의 협업 체계로 정합**함을 §12 기준으로 실증하고, 실제로 **빠져 있던 두 가지만 additive 로 채웠다**: (1) 첫 사용 가벼운 안내(front), (2) 파일 confidence → QUESTION 문구 생성 순수 헬퍼(Core). 계약 완화 · 새 엔진 · 새 저장소 없이 종결한다(§15).

## 2. 무엇을 새로 넣었나 (additive only)

| # | 산출물 | 위치 | 성격 |
|---|---|---|---|
| 1 | **FIRST_USE_GUIDANCE 배너** — 첫 사용 시 한 번·가볍게("목표를 한 문장으로 · 모르면 짧게 물어봄 · 질문은 정상") | `services/web-neture/src/pages/O4OHomePage.tsx` (안내문↔Composer 사이) | 신규 UI 1개. 튜토리얼·마법사 아님. 사이트/PC/파일 유형 선택 없음. 모델/도구/제공자 선택 UI 없음 |
| 2 | localStorage 게이트 `neture:automation:intro-seen:v1` | 동 파일 (`AUTOMATION_INTRO_SEEN_KEY`) | 백엔드 테이블·새 설정 없음. read/write 전부 try/catch. 저장소 불가 시 안내 강요 안 함(§11) |
| 3 | **`buildFileConfidenceQuestion(verdict, targetSchema?)`** — confidence gate 결과 → 사용자 QUESTION 문구(낮은 항목만·전부 되묻지 않음) | `apps/api-server/src/services/ai-tools/file-understanding/normalize.ts` | 순수 함수. 상태 전이·저장은 호출 측(runtime/surface). 새 파서 없음 |
| 4 | 위 헬퍼 단위 테스트 4건 | `apps/api-server/src/__tests__/file-understanding.spec.ts` | ok→null · 낮은 열만 라벨 확인 · required fallback · 전체 저신뢰 일반문구 |

**기존 파일 수정은 위 3파일뿐이며 전부 additive**(기존 export/시그니처·런타임 경로 무변경). Composer · resolveWorkTarget · work-agent-runtime · coordination · recovery contract **무수정**.

## 3. 협업 체계 정합표 (§12 — QUESTION / TAKEOVER / ERROR / waiting_for_user / resumable 이 뒤섞이지 않는가)

| 개념 | 코드 근거 | 판정 |
|---|---|---|
| **QUESTION** (사용자가 답을 아는 정보, 세션 유지, 같은 logical run) | runtime `question()` → `terminalKind='question'` → `finish()` `kind='waiting_for_user'` · `resumable = waiting_for_user && !!runId` · coordination `WAITING_FOR_USER` | **정상 실행 상태 · 재개 가능** |
| **TAKEOVER** (사용자가 직접 해야 함: 로그인/OTP/결제/승인/삭제/권한) | runtime `takeover()` → `terminalKind='takeover'` → `kind='taken_over'` · `resumable=false` · coordination `TAKEN_OVER`(종료). 단 `user_judgment_required` 만 QUESTION 으로 재라우팅(`QUESTION_TAKEOVER_REASONS`) | **종료 · 자동 재개 대상 아님** |
| **ERROR / 대상 미준비** | pre-run `finishNoState()` → `progress==='needs_user' ? 'waiting_for_user' : 'stopped'` · `resumable:false`(runId 없음). ERROR 전용 상태는 없다 — `errorCode` + progress 로 표현 | **재개 불가**(logical run 미개설) |
| **`progress='needs_user'`** | QUESTION 과 일부 TAKEOVER(site_not_ready)가 공유 | **discriminator 아님** — 판별은 `goal.status`/`resumable`/`terminalKind` |
| **no-progress 소진의 끝** | `recover()` L586 `recoveryGiveupKind = decision.askUser && isEscalatable(cls) ? 'question' : 'takeover'`. non-escalatable(RISK_BLOCKED·USER_INTERFERENCE·UNSUPPORTED_UI·AMBIGUOUS_STATE)·provider 불가 → 항상 TAKEOVER | **막힘도 질문으로 끝날 수 있음** |

**결론(§12)**: 상태가 뒤섞이지 않는다. QUESTION↔TAKEOVER 는 coordination 층에서 clean 분리이고, `progress='needs_user'` 공유는 의도된 것으로 판별자가 아니다. 이 정합은 **기존 테스트 [work-agent.spec.ts:307-318]** 가 4개 reason(user_judgment_required / ambiguous_result / unsupported_control / commit_required) × `waiting_for_user`/`taken_over` × `resumable` 로 이미 강제한다.

## 4. §16 실행 흐름 — 단계별 결과

| 단계 | 결과 |
|---|---|
| 최신 main census | HEAD==origin `e69b571fb`. ai-tools/·O4OHomePage 무-dirty(다른 세션 dirty=modules/neture·web-store·supplier 페이지, 불가침) |
| QUESTION/TAKEOVER 상태 정합(§12) | **PASS** — §3 정합표. 코드 직접 확인 + work-agent.spec 강제 |
| first-use guidance(§2) | **DONE** — §2 산출물 #1·#2 |
| new-task assistance(§3·§4) | **PASS(기존)+DONE(파일)** — §5 |
| no-progress assistance(§5) | **PASS(기존)** — recover() 3 tier · NO_PROGRESS class · stuckEnd. 새 recovery engine 안 만듦(§15) |
| same-run resume 회귀(§6) | **PASS(기존)** — runId short-circuit · checkResumable · fresh 재관찰(관찰 미영속) · 힌트 안전경계. work-agent-recovery-runtime.spec |
| 대표 시나리오(§13 A-F) | **PASS** — §6 매핑 |
| CHECK · commit/push | 본 문서 · path-specific |

## 5. 새 작업 도움 요청(§3·§4) — 판정

- **PC 프로그램**: 등재 앱이면 resolveWorkTarget 로 즉시 확정, 미확정이면 `SITE_UNRESOLVED` QUESTION("어느 사이트나 프로그램에서 할 일인지"). launch_not_allowed → `site_not_ready` TAKEOVER 로 "프로그램을 실행/로그인해 주세요"(work-target-discovery.spec 검증). **절차/시작 메뉴를 모르면** = 사용자 지식 필요 → QUESTION 우선(§4). ✅
- **사이트**: 등재→allowlist 재사용 / 쉬움→Gemini `runWebResearch` / 어려움→QUESTION. 사이트 하드코딩 없음(코드 상수 allowlist 만, DB 미의존). ✅
- **파일**: Target/Goal 만 받고 Generic File Understanding 재사용. **낮은 신뢰 항목만** `buildFileConfidenceQuestion` 으로 확인 요청(신규). 새 파서 없음. ✅
- **QUESTION 우선 vs AI 우선(§4)**: 사용자-특정 정보·프로그램 시작 메뉴·사용자의 사이트·복수 후보·사용자만 아는 규칙 = QUESTION. 공개 정보·웹 검색·파일 구조·화면 이해·UI 이동 = AI. 즉시 TAKEOVER = 로그인/OTP/결제/주문확정/게시/삭제/권한변경/보안. → 코드 배선(`QUESTION_TAKEOVER_REASONS` · never-escalate takeover · classifyFailure non-escalatable)이 이 우선순위와 일치. ✅

## 6. 대표 시나리오 §13 A-F — 근거 매핑

| 시나리오 | 판정 | 근거 |
|---|---|---|
| A. 첫 사용 안내 | **PASS** | O4OHomePage 배너(§2) · `data-testid="automation-intro"` · localStorage 게이트 |
| B. PC 프로그램 불명 → "어느 프로그램?" | **PASS** | work-target-discovery.spec "대상 미확정 → 되묻기 · target null"(SITE_UNRESOLVED) · windows_app launch_not_allowed → site_not_ready |
| C. 프로그램 절차 모름 → 매뉴얼/사용자 지식 요청 | **PASS(census)** | 매뉴얼(PDF/DOCX/MD/TXT)은 attachment-reader 로 **이미 일반 Context 로 유입** — `<<<첨부 자료…>>>` DATA 래핑·미영속. 절차 미상 = 사용자 지식 필요 → QUESTION. 대형 매뉴얼 관리 UI 미구축(§9 준수). WorkTarget 연결 배선은 surface 소유(DEFER_TO_SURFACE) |
| D. 사이트 불명 → "어느 거래처 사이트?" | **PASS** | resolveWorkTarget null(등재밖·URL·복수) → SITE_UNRESOLVED QUESTION. work-target-discovery.spec target resolution |
| E. 진행 중 막힘 → QUESTION → 답 → same-run resume | **PASS** | recover() → recoveryGiveupKind=question → waiting_for_user · 힌트 주입 후 같은 runId fresh 재관찰. work-agent-recovery-runtime.spec 힌트 배선 + work-agent.spec waiting_for_user/resumable |
| F. 로그인 = TAKEOVER(질문 아님) | **PASS** | commit_required/credential = never-escalate → `taken_over`·resumable=false. work-agent.spec:307-318 (commit_required → taken_over) |

## 7. §8 사용자 도움 저장·재사용 / 학습 신호

- **USER_HINT_REUSE**: 힌트는 이번 run 에만 쓰이고(관찰·답 원문 미영속 — coordination 은 enum 상태만), 성공하면 `recovered_by_user_hint` 로 **신호만** 남는다. ✅
- **WORKFLOW_LEARNING_SIGNAL**: `isImprovementCandidate`(automation-recovery-contract.ts) = escalatedToStrong·not_recovered·recovered_by_user_hint·recovered_by_user_action → usage event 의 whitelisted `improvementCandidate` 키로 방출(logger.info). ✅
- **금지 준수(§8)**: 단일 힌트를 **전역 canonical 로 자동 승격하지 않는다**(승격 코드 없음), **타 사용자로 자동 전파하지 않는다**(사용자 격리). "반복되면 Workflow 학습 후보"는 신호일 뿐 자동 실행 아님. ✅

## 8. 검증

### 8-A. 단위·통합 테스트 (기존 하네스 재사용 · 키 불요)

| 스위트 | 결과 |
|---|---|
| file-understanding.spec (**신규 buildFileConfidenceQuestion 4건 포함**) | **16 passed** |
| task-modality-router.spec | PASS |
| unified-request-router.spec | PASS |
| work-agent-recovery-runtime.spec | PASS |
| **소계(라우팅·복구·파일)** | **4 suites / 53 tests PASS** |
| work-agent.spec · work-target-discovery.spec (§12 QUESTION/TAKEOVER · §13 B/D/E/F) | (§9 기재) |

`npx tsc --noEmit` — api-server **0 에러** · web-neture **0 에러**.

### 8-B. 실 API 키 smoke

이번 WO 는 **협업 상태·문구·라우팅**을 다룬다(결정론 · AI 호출 경로 무변경). Gemini/Astra 실 grounding·vision smoke 는 이전 트랙에서 이미 PASS·기록됨(a5d56fd04 grounding · Astra $10 크레딧 · 1f4538d42 Generic File). §15(per-smoke 재승인 금지)에 따라 **재실행/재승인 요청하지 않고 기존 결과를 인용**한다. 신규 코드(배너·순수 문구 헬퍼)는 AI 를 호출하지 않아 실 키 smoke 대상이 아니다.

## 9. §18 완료 키

| 키 | 값 |
|---|---|
| FIRST_USE_GUIDANCE | PASS (배너 · localStorage · 마법사 아님 · 유형선택 없음) |
| QUESTION_NORMAL_EXECUTION_STATE | PASS (waiting_for_user · resumable · runId 유지 · 실패로 치지 않음) |
| QUESTION_RESUME | PASS (same-run · fresh 재관찰 · 관찰 미영속 · 힌트 안전경계) |
| QUESTION_TAKEOVER_SEPARATION | PASS (coordination clean 분리 · work-agent.spec:307-318) |
| PROGRAM_KNOWLEDGE_FLOW | PASS (등재→즉시 / 미상→QUESTION · 매뉴얼=기존 Context 유입 · 대형 UI 미구축) |
| SITE_DISCOVERY_FLOW | PASS (등재 재사용 / Gemini research / QUESTION · 하드코딩 없음) |
| NO_PROGRESS_ASSISTANCE | PASS (3 tier · NO_PROGRESS class · 새 engine 없음) |
| USER_HINT_REUSE | PASS (run scope · 원문 미영속 · 신호만) |
| WORKFLOW_LEARNING_SIGNAL | PASS (improvementCandidate 신호 · 자동승격/전파 없음) |
| SAFETY_REGRESSION | NONE (힌트가 Safety 우회 못함 · never-escalate 불변 · 계약 무완화) |
| E2E_SCENARIOS | PASS (§13 A-F 근거 매핑 · §6) |
| **AUTOMATION_USER_COLLABORATION_STATUS** | **READY** |

## 10. 경계 준수(§15 금지)

- 병원-약 업무·특정 PC 프로그램/사이트 adapter·새 Workflow Engine·새 Recovery Engine·새 AI provider·WebMCP·public API·대형 UI 개편 **안 함**. ✅
- Composer 크게 바꾸지 않음(안내문↔입력창 사이 배너 1개 · 입력 흐름 무변경). ✅
- 계약 완화 0 · 신규 저장소/packages 승격 0 · 권한·route·API contract 변경 0. ✅
- 다른 세션 dirty(modules/neture·web-store·supplier 페이지) 불가침. API 키는 env 로만. ✅

## 11. 후속(이번 범위 아님)

- 파일 매뉴얼·`buildFileConfidenceQuestion` → runtime/surface 배선(surface 소유 TargetSchema · DEFER_TO_SURFACE, 통합 CHECK #8 과 동일).
- 첫 사용 안내 문구의 다국어화(현재 ko 단일).
- REALIGN #15(pharmacy-web-core 결합)은 통합 CHECK 대로 surface 채택 단계 별도 WO — 이번 WO 무접촉.

---
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
