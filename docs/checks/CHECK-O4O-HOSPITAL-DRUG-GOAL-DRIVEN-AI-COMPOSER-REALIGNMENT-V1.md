# CHECK-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1

> **대상 WO**: `WO-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1`
> **표기일**: 2026-09-18
> **판정**: 증분 1 = COMPLETE (전역 Router 오염 제거 · surface 격리 · 예시문구 일반화).
> 증분 2 = FOLLOW-UP (Gemini 조사 · Astra 화면 · Local Context surface 주입 · goal별 모델 선택 재구축 — 미착수).

이 CHECK는 본 WO를 **두 증분**으로 나눠 그 중 **증분 1(전역 Router 병원 특수 규칙 격리)** 를 기록한다.
핵심 원칙("고정되는 것은 Source가 아니라 Context다")에서, 이번 증분은 **전역 Router에서 병원 특수 규칙을
빼고 그 결정을 hospital-drug 화면(surface)으로 격리**하는 데까지다. Composite 오케스트레이션 **내부 구현은
바꾸지 않았다** — health.kr 웹 + Local SQLite 결합 로직은 그대로다(§17 not-doing 준수: 새 Workflow Engine·
공공 API 신규·MFDS client·HIRA 색인·Local Agent 재설계 없음).

---

## 15. 구현 전 조사 (census 판정)

| # | 대상 | 판정 | 근거 |
|---|---|---|---|
| 1 | `unified-request-router.ts` | REMOVE_FROM_GLOBAL_ROUTING | `hospital-drug-composite` import·`composite` route·`isCompositeHospitalDrugRequest`·전역 가로채기 |
| 2 | `hospital-drug-composite.ts` | KEEP (술어만 이관) | 결합 오케스트레이터 내부 불변. composite 경계 술어(`isCompositeHospitalDrugRequest`)를 이 모듈로 이관 |
| 3 | `/api/ai/request` | ISOLATE | composite 결정을 HTTP 계층에서 `surface==='hospital-drug'` 로만 게이트 |
| 4 | `HospitalDrugPage.tsx` | ISOLATE | `surface:'hospital-drug'` 전송 · 예시문구에서 하드코딩 Source(약학정보원) 제거 |
| 5 | Work Agent planner | KEEP (FOLLOW-UP) | goal별 모델 선택 미존재 — 증분 2에서 구축 |
| 6 | Gemini provider/runtime | KEEP (FOLLOW-UP) | 조사 경로 재배선은 증분 2 |
| 7 | Astra/OpenAI provider/runtime | KEEP (FOLLOW-UP) | `gpt-6-astra`는 provider 아님(OpenAI 모델 id). 화면 실행 재배선은 증분 2 |
| 8 | Local Context 전달 | KEEP (FOLLOW-UP) | 현재 Local SQLite 조회는 composite 내부 경로. surface Context 주입은 증분 2 |
| 9 | `healthkr` registry/adapter | KEEP | 범용 재사용 자산 — composite의 하드코딩 entryPoint 문자열만 SUPERSEDE 후보(증분 2) |
| 10 | tests/CHECK/WO | ISOLATE | 3개 spec 갱신 · 본 CHECK 신설 |

**PUBLIC_DRUG_API_SERVICE_KEY** 는 이번 증분에서 손대지 않았다 — runtime 미배선 상태 그대로(스크립트·문서 외
소비처 0). 인증키는 코드·문서·테스트·로그 어디에도 기록하지 않는다.

---

## 변경 요약 (증분 1)

**전역 Router 오염 제거** — `apps/api-server/src/services/ai-tools/unified-request-router.ts`
- `hospital-drug-composite` import 삭제.
- `UnifiedRoute` 에서 `'composite'` · `UnifiedRouteReason` 에서 `'hospital_drug_composite'` 삭제.
- `isCompositeHospitalDrugRequest` 함수 삭제 + `classifyUnifiedRequest` 의 composite 가로채기 삭제.
- 이제 이 pure Router 는 hospital-drug module 을 import 하지 않는다.

**Composite 경계 = 화면(surface)** — `apps/api-server/src/routes/ai-proxy.routes.ts`
- `isCompositeHospitalDrugRequest` 를 `hospital-drug-composite.js` 에서 import.
- `POST /api/ai/request` 에서 classify **이전에** `!runId && body.surface === 'hospital-drug' &&
  isCompositeHospitalDrugRequest(text)` 일 때만 composite 로 분해. runId 재개가 우선.

**경계 술어 이관** — `apps/api-server/src/services/ai-tools/hospital-drug-composite.ts`
- `isCompositeHospitalDrugRequest` 를 이 모듈로 이관(내부 `extractProduct/mentionsHospital/mentionsSameIngredient` 재사용).

**클라이언트 surface 전송** — `services/web-neture/src/lib/ai/unified-request.ts`
- `UnifiedRequestInput.surface?: 'hospital-drug'` 추가 · POST 본문에 additive 전송.

**hospital-drug 화면** — `services/web-neture/src/pages/HospitalDrugPage.tsx`
- `sendUnifiedRequest({ ..., surface: 'hospital-drug' })`.
- 예시문구 `'리피토정 동일성분 의약품 약학정보원에서 찾아줘'` → `'리피토정과 동일성분 의약품 찾아줘'`
  (Source(약학정보원) 하드코딩 제거 · Context 는 유지).

---

## 검증

- `apps/api-server` `tsc --noEmit` PASS.
- `services/web-neture` `tsc --noEmit` PASS.
- jest: `unified-request-router.spec` · `unified-request-http.spec` · `hospital-drug-composite.spec` — **50/50 PASS**.
  - router: 전역 Router 가 composite 를 내지 않음(등재 사이트 업무어→work · 등재 없음 원내문장→chat).
  - http: `surface='hospital-drug'` 결합요청→composite(1회) · **surface 없으면 composite 로 라우팅되지 않음**(오염 제거 직접 확인).
- vitest: `HospitalDrugPage.test.tsx` — **7/7 PASS**(composite 응답 렌더 포함).
- 배포 간극: 클라이언트가 web 먼저 배포되어 `surface` 를 보내도 구 API 는 무시(additive) → 잠깐 chat 로 강등될 뿐 파손 없음. 반대로 API 먼저 배포되면 surface 없는 요청은 기존대로 동작.

---

## 19. 완료 보고 (형식)

```text
A. 기존 global hospital-drug 결합 상태 = 제거됨 (pure Router 에서 composite route·reason·술어·import 삭제)
B. 메인 Unified Router 분리 = 완료 (홈 Composer 는 surface 미전송 → composite 불가 · hospital-drug module import 0)
C. hospital-drug Context 전달 구조 = 부분 (surface='hospital-drug' 로 화면 경계 전달 · Context 주입 재구축은 FOLLOW-UP)
D. Gemini 조사 경로 = FOLLOW-UP (증분 2 · 현재 composite 내부 health.kr 경로 유지)
E. Astra 화면 실행 경로 = FOLLOW-UP (증분 2 · Work Agent 경로는 기존대로 동작)
F. health.kr 위치 재정의 = 부분 (전역 Router 에서 제거 · adapter/registry 는 범용 자산 KEEP · composite 내부 문자열 SUPERSEDE 는 증분 2)
G. 공공 API runtime 제거/비사용 확인 = 확인 (PUBLIC_DRUG_API_SERVICE_KEY runtime 미배선 · 본 증분 무접촉)
H. Local Context 결합 = 유지 (composite 내부 Local SQLite 경로 불변 · surface 주입은 FOLLOW-UP)
I. Workflow/Recovery 회귀 = 없음 (work/confirm/resume 경로·테스트 불변)
J. UI 변경 = 예시문구 1건 일반화 (Source 하드코딩 제거) · 그 외 화면 불변
K. 테스트 = jest 50/50 · vitest 7/7 · tsc(api·web) PASS
L. PENDING = 프로덕션 실 PC smoke(무접촉) · 증분 2(goal-driven 재구축)
M. commit/CHECK = 본 CHECK + path-specific commit
```

```text
GLOBAL_HOSPITAL_DRUG_SPECIAL_ROUTING = REMOVED
HOSPITAL_DRUG_CONTEXTUAL_AI          = PARTIAL (surface 경계만 · 재구축 FOLLOW-UP)
GEMINI_RESEARCH_PATH                 = FOLLOW-UP
ASTRA_SCREEN_PATH                    = FOLLOW-UP
HEALTHKR_HARDCODE                    = REMOVED_FROM_GLOBAL_ROUTER (composite 내부 문자열은 증분 2)
PUBLIC_API_AUTOMATION                = NOT_WIRED (무접촉)
LOCAL_CONTEXT                        = UNCHANGED (composite 내부 유지)
WORKFLOW_REGRESSION                  = NONE
PRODUCTION_SMOKE                     = PENDING
```

---

## FOLLOW-UP (증분 2 — 미착수)

`/hospital-drug` 를 공통 Goal-driven Core 위에 재구축:
- 조사/검색 → Gemini · 화면 이해/조작 → Astra(`gpt-6-astra`) 로 **goal별 per-task 모델 선택 신설**(현재 미존재).
- 원내 약품 Excel = **Local Context surface 주입**으로 재배선(현 composite 내부 하드코딩 2-source 경로 대체).
- composite 의 하드코딩 entryPoint 문자열(`healthkr.same_ingredient` 등) SUPERSEDE 여부 재판정.

이는 신규 capability(모델 선택 런타임) 구축 = 구조적 증분이라 최소 수정 범위를 넘는다. 별도 착수 지시로 진행한다.

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 (증분 2는 본 WO 내 FOLLOW-UP 으로 관리).
