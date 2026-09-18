# WO-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1

> **성격**: `/hospital-drug` 전용 AI 입력창의 **재정렬 작업**.
>
> 기존 병동용 화면·원내 약품 Excel Context는 유지하되,
> `health.kr/HIRA/특정 API`처럼 특정 정보원을 하드코딩한 경로를 제거하고
> **O4O 공통 Goal-driven 자동화 Core**를 사용하도록 바꾼다.
>
> 별도 hospital-drug AI 엔진을 만들지 않는다.

---

## 1. 목적

`/hospital-drug`의 AI 입력창을 다음 원칙으로 전환한다.

현재 잘못된 방향:

```text
사용자 질문
→ hospital-drug 특수 intent
→ health.kr / 특정 API
→ Local Data
→ 고정된 결과
```

목표:

```text
사용자 질문
→ Goal 이해
→ 필요한 조사/행동 판단
→ Gemini 또는 Astra 선택
→ 필요한 Source를 자유롭게 조사
→ hospital-drug Local Context와 결합
→ 답변/작업
```

핵심:

> **hospital-drug에서 고정되는 것은 Source가 아니라 Context다.**

---

## 2. `/hospital-drug`가 고정해도 되는 것

이 화면은 특화 업무 화면이므로 아래 Context는 고정한다.

```text
- 이 화면은 원내 약품 관련 업무용
- 연결된 Excel/브라우저 Local Data는 원내 약품 자료
- 원내 약품 자료는 사용자 질문에 필요할 때 활용
- 사용자는 원내약 보유/성분/효능/대체 가능성 등 다양한 질문을 할 수 있음
```

하지만 아래는 고정하지 않는다.

```text
- 동일성분 = health.kr
- 효능효과 = HIRA
- 약품검색 = 식약처 API
- 약품질문 = 특정 공공 API
- 원내약 질문 = 특정 composite 함수
```

---

## 3. 메인 O4O 자동화와의 관계

`/hospital-drug`는 별도 서비스 화면이지만
**AI 실행 엔진은 공통 O4O 자동화 Core를 사용**한다.

구조:

```text
O4O Goal-driven Automation Core
├─ Goal 이해
├─ Gemini
├─ Astra
├─ 사용자 질문 / same-run resume
├─ Browser/Web 조사
├─ Workflow Candidate
└─ deterministic replay

             ↓

/hospital-drug
+ 원내 약품 Local Context
```

따라서 hospital-drug 전용 AI Planner/Agent를 신설하지 않는다.

---

## 4. 모델 선택 원칙

### Gemini 기본

다음은 Gemini를 기본으로 한다.

```text
- 일반 검색
- 웹 조사
- 여러 자료 비교
- 문서 해석
- 텍스트 분석
- 제품/약품 정보 조사
- 사용 가능한 Source 탐색
- 결과 정리
```

예:

```text
"이 약의 효능을 조사해줘."
"이 두 약의 차이를 알려줘."
"같은 효능의 다른 성분 약을 찾아줘."
"최근 안전성 정보가 있는지 알아봐."
```

기본은 Gemini + 일반 웹 조사다. 특정 사이트/API를 강제하지 않는다.

### Astra

다음처럼 **실제 화면을 보고 이해·판단·조작해야 할 때만** Astra를 사용한다.

```text
- 사이트 화면을 실제로 조작해야 함
- 검색창/버튼/메뉴 등 현재 UI를 읽어야 함
- DOM만으로 부족해 화면 시각 이해가 필요함
- 기존 Workflow가 깨져 현재 화면에서 복구해야 함
```

즉:

```text
검색/조사 = Gemini
화면 이해/조작 = Astra
```

---

## 5. Source 선택 원칙

정보 Source는 고정하지 않는다. 가능한 Source 예:

```text
- 일반 웹 검색
- 전문 사이트
- 제조사 자료
- 공식기관 페이지
- O4O 내부 데이터
- 사용자 Local Excel
- 사용자가 알려준 사이트
```

AI가 현재 Goal에 따라 적절한 Source를 찾는다. 사용자가 특정 사이트를 알려준 경우
("이 사이트가 현업에서 유용하다")는 **선호 Source 정보**로 사용할 수 있으나, 그 사이트를 정본으로 고정하지 않는다.

---

## 6. 사용자에게 물어야 하는 경우

사용자가 이미 알고 있을 가능성이 높은 정보를 AI가 오래 탐색하지 않는다.

```text
- 어느 주문 사이트를 쓰는지
- 특정 프로그램에서 어느 메뉴로 들어가는지
- 사업장마다 다른 업무 절차
```

이런 경우 "어느 사이트에서 주문하시나요?" / "이 작업은 어느 메뉴에서 시작하나요?" 처럼 구체적으로 질문한다.
same-run QUESTION/resume 구조를 재사용한다.

---

## 7. Local Context 사용

`/hospital-drug`가 가진 원내 약품 Local Data는 하나의 Context/Source다.

```text
사용자: "이 약과 같은 성분의 원내약 있어?"
Gemini:
1. 필요한 약품정보 조사
2. 성분/함량/제형 등의 비교 기준 확보
3. hospital-drug Local Context 조회
4. 원내 약품과 비교
5. 하나의 답변
```

Local Data를 반드시 먼저/나중에 조회하도록 하드코딩하지 않는다. 질문이 원내 자료를 필요로 할 때 사용한다.

---

## 8. 기존 hospital-drug composite 재정렬

현재 main의 실제 코드를 조사한다. 특히:

```text
unified-request-router.ts
hospital-drug-composite.ts
HospitalDrugPage.tsx
Unified request endpoint
Work Agent runtime
```

현재 알려진 문제:

```text
Unified Router → hospital_drug_composite 특별 분기
hospital-drug-composite → health.kr + Local SQLite 고정
```

이 구조를 그대로 유지하지 않는다.

### 목표

`/hospital-drug` 페이지의 요청은 범용 Goal-driven 실행 경로를 사용하고, 페이지 Context로 `hospital_drug_list`를 제공한다.
기존 `hospital-drug-composite`가 전용 deterministic shortcut으로 남아야 할 이유가 없다면 active runtime에서 제거/격리한다.
단, 역사적 CHECK/WO 기록을 사실과 다르게 삭제하지 않는다.

---

## 9. 메인 Unified Router 오염 제거

메인 O4O Composer의 `Unified Request Router`에서는 hospital-drug 전용 intent를 판별하지 않는다. 제거/격리 대상 예:

```text
extractProduct
mentionsHospital
mentionsSameIngredient
isCompositeHospitalDrugRequest
route = composite
reason = hospital_drug_composite
```

단 `/hospital-drug` 화면의 기능을 삭제하는 것은 아니다.

```text
메인 O4O 자동화: 범용 Goal-driven
hospital-drug:        공통 Goal-driven Core + hospital-drug Context
```

로 분리한다.

---

## 10. 화면 UX

현재 `/hospital-drug`의 심플한 화면 구조는 유지한다.

```text
원내 약품 안내

원내 약품 자료
● 연결됨 · 2,418개 품목

무엇을 확인할까요?
[                               ↑ ]

[약품파일 변경]
```

입력 예시는 너무 특정 Source에 묶지 않는다. 기존
"리피토정 동일성분 의약품 약학정보원에서 찾아줘" 같은 문구는 제거한다. 대신:

```text
"이 약의 효능을 알려줘."
"이 약과 같은 성분의 원내약 있어?"
"비슷한 효능의 다른 약도 찾아줘."
```

---

## 11. 공공 API

이번 자동화 V1에서는 공공 API를 자동화 기본 경로에서 제외한다. 이번 약품 파일럿 과정에서 조사한
식약처 / HIRA / `PUBLIC_DRUG_API_SERVICE_KEY` 관련 내용은 자동화 Core의 runtime 의존으로 만들지 않는다.
이미 조사한 자료는 다른 목적(상품 DB/콘텐츠 등)에서 가치가 있을 수 있으므로 무조건 삭제하지 않는다.

```text
자동화 정보 조사 기본 = Gemini + 일반 웹
```

공공 API는 향후 실제 필요성이 확인될 때 별도 판단한다.

---

## 12. health.kr

health.kr도 삭제 대상이 아니다. 사용자가 실제로 유용한 전문 사이트라고 알려준 사실은 유지한다. 단
"약품질문 = health.kr" / "동일성분 = health.kr" 처럼 강제하지 않는다. AI가 필요할 때 선택할 수 있는 하나의 Source로만 둔다.

---

## 13. PC 프로그램은 이번 WO 범위 밖

이번 작업은 `/hospital-drug`와 메인 자동화 경계 정리만 수행한다. 다만 상위 원칙은 문서에 참고로 남긴다.

```text
PC 프로그램
→ 매뉴얼 우선
→ 매뉴얼 없으면 사용자에게 업무 순서 질문
→ Astra가 실제 화면에 적용
→ 반복되면 Workflow
```

실제 PC 자동화 구현은 별도 작업이다.

---

## 14. 반복 업무와 Workflow

이번 재정렬에서도 기존 원칙을 유지한다.

```text
첫 실행 → Gemini / Astra
반복    → 성공 trajectory 활용 → Gemini로 변형/예외 보정
안정    → Workflow Candidate → deterministic replay
실패    → Gemini → 화면 판단 필요 시 Astra → 필요하면 사용자 질문
```

이번 WO에서 새로운 Workflow Engine을 만들지 않는다.

---

## 15. 구현 전 조사

최신 origin/main 기준으로 먼저 census한다. 확인 대상:

1. `unified-request-router.ts`
2. `hospital-drug-composite.ts`
3. `/api/ai/request`
4. `HospitalDrugPage.tsx`
5. Work Agent planner
6. Gemini provider/runtime
7. Astra/OpenAI provider/runtime
8. Local Context 전달 방식
9. `healthkr` registry/adapter
10. hospital-drug 관련 tests/CHECK/WO

판정: `KEEP` / `ISOLATE` / `REMOVE_FROM_GLOBAL_ROUTING` / `SUPERSEDE` / `FOLLOW-UP` 로 분류한다.

---

## 16. 성공 기준

### 메인 O4O

"동일성분이 무엇인지 설명해줘" 같은 요청이 hospital-drug composite로 가지 않는다.
메인 자동화가 hospital-drug module을 import하지 않는다.

### hospital-drug

- "이 약의 효능을 조사해줘" → Gemini 기반 일반 조사 가능.
- "이 약과 같은 성분의 원내약 있어?" → 필요한 정보 조사 → Local Context 결합 → 답변.
- "이 사이트에서 직접 확인해줘" → 화면 조작이 필요하면 Astra/Work Agent로 진행.

### Source

특정 질문이 health.kr/HIRA/MFDS로 강제되지 않는다.

### Safety

기존 Safety/Risk/QUESTION/TAKEOVER 불변.

---

## 17. 이번 WO에서 하지 않을 것

WebMCP · 공공 API 신규 구현 · HIRA 색인 · MFDS client · PC 프로그램 자동화 · 새 Workflow Engine ·
업종별 공통화 · 추천 업무 · Local Agent 전체 재설계 · O4O 메인 UI 전면 개편 · 콘텐츠 제작 개편.

---

## 18. Git

최신 origin/main · 다른 세션 WIP 불가침 · dedicated worktree 권장 · path-specific stage ·
`git add .` 금지 · force push 금지 · 관련 파일만 commit/push.

조사 결과 구조적 차단이 없으면: 조사 → 최소 코드 수정 → test → CHECK → commit → push 까지 진행한다.

---

## 19. 완료 보고

```text
A. 기존 global hospital-drug 결합 상태
B. 메인 Unified Router 분리
C. hospital-drug Context 전달 구조
D. Gemini 조사 경로
E. Astra 화면 실행 경로
F. health.kr 위치 재정의
G. 공공 API runtime 제거/비사용 확인
H. Local Context 결합
I. Workflow/Recovery 회귀
J. UI 변경
K. 테스트
L. PENDING
M. commit/CHECK
```

마지막:

```text
GLOBAL_HOSPITAL_DRUG_SPECIAL_ROUTING =
HOSPITAL_DRUG_CONTEXTUAL_AI =
GEMINI_RESEARCH_PATH =
ASTRA_SCREEN_PATH =
HEALTHKR_HARDCODE =
PUBLIC_API_AUTOMATION =
LOCAL_CONTEXT =
WORKFLOW_REGRESSION =
PRODUCTION_SMOKE =
```

---

## 최종 제품 원칙

`/hospital-drug`는 특정 검색 시스템이 아니다.

> **원내 약품 Context를 가진 O4O AI 업무 화면이다.**

사용자는 원하는 일을 자연어로 말한다. O4O는:

```text
조사/검색            → Gemini
실제 화면 이해·조작  → Astra
사용자 고유 정보 필요 → 사용자에게 질문
반복 패턴 안정        → Workflow
```

특정 사이트·API는 실행 수단일 뿐, 사용자 Goal보다 앞에 오지 않는다.
