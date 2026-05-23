# IR-O4O-KPA-SURVEY-MANUAL-CURRENT-STATE-AUDIT-V1

> **목적:** KPA-Society 설문(Survey/Participation) 기능 매뉴얼 작성 전,
> 현재 구현 상태를 종합 조사한다. 본 문서는 조사 결과만 정리하며 코드/UI 수정은 포함하지 않는다.
>
> **선행 작업:**
> - 콘텐츠 IR / WO (`IR-O4O-KPA-CONTENT-MANUAL-CURRENT-STATE-AUDIT-V1`, `WO-O4O-KPA-GUIDE-CONTENT-MANUAL-REFRESH-V1`)
> - 자료실 IR / WO (`IR-O4O-KPA-RESOURCES-MANUAL-CURRENT-STATE-AUDIT-V1`, `WO-O4O-KPA-GUIDE-RESOURCES-MANUAL-REFRESH-V1`)
>
> **후속 작업:** `WO-O4O-KPA-GUIDE-SURVEY-MANUAL-NEW-V1` (예정 — 신규 가이드 작성)

---

## 0. 결론 요약

### 핵심 발견

1. **설문은 콘텐츠 허브 안에 들어가 있지만 실제 구현은 독립 시스템** — `Participation` 도메인의 별도 API/Entity (`participationApi`, `ParticipationQuestion`, `ParticipationStatus`) 사용. 콘텐츠와 데이터 모델 분리.

2. **진입점이 3개**, 그러나 데이터는 **모두 같은 `/api/v1/surveys` 엔드포인트**에서 옴 (필터/관점만 다름). 각 라우트 관점이 다르므로 매뉴얼은 진입점별 명확화 필요.

3. **`/participation` 은 정적 "준비 중" 안내**만 표시 — 매뉴얼에서 안내하면 안 됨.

4. **`/guide/features/survey` 가이드 페이지가 존재하지 않음** — `kpaGuideFeaturesProps.groups` 카탈로그(7개)에도 설문 항목 부재. **신규 가이드 작성이 필요한 상태**.

5. **포인트 보상 시스템(WO-O4O-SURVEY-POINT-REWARD-PHASE1-V1)** 이 `SurveyListPage`/`SurveyDetailPage` 에 통합되어 있음. 응답 완료 즉시 포인트 지급. 현재 가이드 부재로 회원이 이를 인지하기 어려움.

6. **응답은 비로그인 허용** (익명 토큰 `survey:anon:{id}` localStorage). 결과 페이지 권한 가드 코드 상 미확인 — 공개로 추정.

7. **결과 페이지 통계 UI 일부 불완성** (`ParticipationResultPage` 코드 상 그래프 영역 미완 부분 존재) — 매뉴얼에 깊이 들어가지 말 것.

### 매뉴얼 신설 권장 여부

**예 — 독립 가이드 신설 권장.** 이유:

- 콘텐츠 가이드 §06 한 줄로는 회원이 포인트 보상·응답 흐름·결과 조회를 파악 불가
- 진입점 3개 분기 정리가 매뉴얼에서 정렬되어야 함 (`/surveys` = 회원 응답용, `/content/surveys` = 작성자용, `/participation` = 미사용)
- 권장 명칭: `설문조사` (또는 `참여`). KPA-Society 사용자 입장에서 가장 직관적인 단어는 "설문조사"
- 슬러그: `/guide/features/survey` 권장 (도메인이 Participation이지만 UX 단어는 설문)

---

## 1. 라우트 구조 (실제 등록)

[services/web-kpa-society/src/App.tsx](../../services/web-kpa-society/src/App.tsx) 기준.

### 1-1. 회원용 — Survey 계열 (App.tsx:830-832)

| Path | Component | 역할 |
|------|-----------|------|
| `/surveys` | `SurveyListPage` | **회원용 설문 목록** — 진행 중 + 포인트 보상 표시 |
| `/surveys/:id` | `SurveyDetailPage` | **설문 상세 진입** — 포인트 안내, 응답 페이지로 연결 |

근거: `WO-O4O-SURVEY-POINT-REWARD-PHASE1-V1`

### 1-2. Participation 계열 (App.tsx:834-838)

| Path | Component | 역할 |
|------|-----------|------|
| `/participation` | `ParticipationListPage` | **정적 "준비 중" 안내만** — 실제 미구현 |
| `/participation/create` | `ParticipationCreatePage` | 설문 생성 (full mode — scope 표시) |
| `/participation/:id/respond` | `ParticipationRespondPage` | 응답 제출 |
| `/participation/:id/results` | `ParticipationResultPage` | 결과 집계 표시 |

### 1-3. 콘텐츠 허브 진입점 (App.tsx:697-713, 736)

| Path | Component | 역할 |
|------|-----------|------|
| `/content/surveys` | `ContentSurveysPage` | **작성자/관리자용 설문 목록** — 검색·상태 필터, 등록 진입 |
| `/content/surveys/new` | `ParticipationCreatePage` (제한 모드) | 설문 생성 — `allowedQuestionTypes=[SINGLE_CHOICE, MULTIPLE_CHOICE, FREE_TEXT]`, `hideScopeField=true` |

### 1-4. 가이드 라우트 — **부재**

- `/guide/features/survey` 또는 `/guide/features/participation` 라우트 **없음**
- [`kpaGuideFeaturesProps.groups`](../../packages/shared-space-ui/src/guide/copy/kpa.ts#L487-L570) 7개 그룹에 설문 항목 **없음**
- 설문 언급 위치는 [`kpaGuideFeatureContentProps`](../../packages/shared-space-ui/src/guide/copy/kpa.ts#L660-L749) §01, §06 각 1줄씩만

---

## 2. SurveyListPage — `/surveys` (회원용 메인 진입점)

[services/web-kpa-society/src/pages/survey/SurveyListPage.tsx](../../services/web-kpa-society/src/pages/survey/SurveyListPage.tsx)

### 2-1. 표시 내용

- 제목: "설문조사" / 부제목: "참여 가능한 설문에 응답하고 포인트를 받으세요."
- `surveyApi.list({ audience: 'for-me' })` — 진행 중 + 회원에게 보이는 것만
- 각 카드: 제목, 설명 (line-clamp-2), 응답 수, 마감일, **포인트 배지** (`rewardEnabled` 시)
- 클릭 시 `/surveys/:id` 로 이동

### 2-2. 부재 기능

- 검색 input, 필터, 정렬 모두 **없음** (단순 진행 중 목록)
- 페이지네이션 없음 (백엔드 list가 페이지화되어 오는 경우 처리 미확인)

---

## 3. SurveyDetailPage — `/surveys/:id`

[services/web-kpa-society/src/pages/survey/SurveyDetailPage.tsx](../../services/web-kpa-society/src/pages/survey/SurveyDetailPage.tsx)

### 3-1. 표시 내용

- 제목, 설명, 질문 수, 응답 수
- **포인트 보상 박스** (`rewardEnabled` 시): "{rewardAmount}P 획득" + "포인트는 응답 완료 즉시 지급됩니다"
- 기응답 여부 판단 (`participationApi.getMyResponse(id)`)

### 3-2. 분기 동작

[SurveyDetailPage.tsx:103-126](../../services/web-kpa-society/src/pages/survey/SurveyDetailPage.tsx#L103-L126):

| 상태 | 표시 |
|------|------|
| 기응답 | "이미 응답하셨습니다" + "{rewardAmount}P가 지급되었습니다" + **"결과 보기"** 버튼 → `/participation/:id/results` |
| 미응답 + status='active' | **"설문 참여하기"** 버튼 → `/participation/:id/respond` |
| 미응답 + status≠'active' | "현재 참여 불가" (비활성) |

---

## 4. ContentSurveysPage — `/content/surveys` (작성자 진입점)

[services/web-kpa-society/src/pages/contents/ContentSurveysPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentSurveysPage.tsx)

### 4-1. 표시 내용

- BaseTable 형식 목록, `participationApi.getParticipationSets()` (= 동일 백엔드 `/api/v1/surveys?serviceKey=kpa-society`)
- 상태 배지: `ACTIVE`(진행중) · `DRAFT`(초안) · `CLOSED`(종료)
- **검색** + **상태 필터** + **페이지네이션** 구현 ([ContentSurveysPage.tsx:163-247](../../services/web-kpa-society/src/pages/contents/ContentSurveysPage.tsx#L163-L247))
- 로그인 회원에게 "설문 등록" 버튼 표시 → `/content/surveys/new` 진입

### 4-2. Row 클릭 분기

[ContentSurveysPage.tsx:46-50](../../services/web-kpa-society/src/pages/contents/ContentSurveysPage.tsx#L46-L50):

- `status=ACTIVE` → `/participation/:id/respond`
- `status=DRAFT` 또는 `CLOSED` → `/participation/:id/results`

### 4-3. 회원용 `/surveys` 와의 관계

- 같은 API 같은 데이터지만 **관점 분리**: 회원은 응답 측, 콘텐츠 허브는 작성/관리 측
- 포인트 보상 배지는 ContentSurveysPage에 표시 안 됨 (작성자 관점에서는 부차적)

---

## 5. ParticipationListPage — `/participation` (정적 안내, **사용 안 함**)

[services/web-kpa-society/src/pages/participation/ParticipationListPage.tsx:1-26](../../services/web-kpa-society/src/pages/participation/ParticipationListPage.tsx#L1-L26)

```tsx
<EmptyState
  icon="📋"
  title="참여 기능 준비 중"
  description="설문/퀴즈 기능은 현재 준비 중입니다."
/>
```

- 실제 데이터 미로드 — 정적 placeholder
- **매뉴얼에 노출 금지** (라우트 자체는 살아 있으나 사용자에게 안내하지 말 것)

---

## 6. ParticipationCreatePage — 설문 생성 (`/participation/create` + `/content/surveys/new`)

[services/web-kpa-society/src/pages/participation/ParticipationCreatePage.tsx](../../services/web-kpa-society/src/pages/participation/ParticipationCreatePage.tsx)

### 6-1. 두 진입점의 차이

[App.tsx:697-713, 836](../../services/web-kpa-society/src/App.tsx#L697-L836):

| 진입점 | allowedQuestionTypes | hideScopeField | 권장 |
|--------|---------------------|----------------|------|
| `/content/surveys/new` | `[SINGLE_CHOICE, MULTIPLE_CHOICE, FREE_TEXT]` (QUIZ 제외) | `true` (PUBLIC 고정) | **회원 일반 사용** |
| `/participation/create` | 제한 없음 (QUIZ 포함) | `false` (scope 표시) | 고급/내부용 |

> 사용자 매뉴얼에는 **`/content/surveys/new` 진입을 우선 안내**가 자연스러움 (콘텐츠 허브에서 동선이 연속됨, 퀴즈는 별도 흐름).

### 6-2. 필드 (ParticipationCreatePage)

[ParticipationCreatePage.tsx:60-90, types.ts:14-100](../../services/web-kpa-society/src/pages/participation/ParticipationCreatePage.tsx#L60-L90):

- 제목 (title)
- 설명 (description)
- 질문 목록 (Question Builder):
  - 질문 제목
  - 질문 설명 (선택)
  - 질문 유형 (SINGLE_CHOICE / MULTIPLE_CHOICE / FREE_TEXT / QUIZ)
  - 응답 옵션 (선택형/퀴즈형)
  - 필수 여부
- 참여 범위 (hideScopeField=false 일 때만):
  - `ParticipationScopeType`: PUBLIC / PHARMACIST_ONLY / PHARMACY_UNIT / ORGANIZATION
  - `AnonymityType`: ANONYMOUS / IDENTIFIED
  - `allowModification` (응답 수정 허용)
  - 시작일/마감일

### 6-3. 핵심 원칙 (코드 주석)

[ParticipationCreatePage.tsx:5-8, types.ts:5-8](../../services/web-kpa-society/src/pages/participation/ParticipationCreatePage.tsx#L5-L8):

> - 사람을 평가하지 않는다
> - 단지 묻고, 모으고, 보여줄 뿐이다
> - 점수/등급/랭킹 개념 없음

→ QUIZ 유형도 정답 표시만 (`isCorrect` 플래그), 점수 계산 없음. **매뉴얼에서 강조할 가치 있는 정체성**.

### 6-4. 권한

- 로그인 필수 (페이지 진입 시 user 확인)
- 특정 역할 제한 **없음** — 모든 로그인 회원 생성 가능

---

## 7. ParticipationRespondPage — `/participation/:id/respond`

[services/web-kpa-society/src/pages/participation/ParticipationRespondPage.tsx](../../services/web-kpa-society/src/pages/participation/ParticipationRespondPage.tsx)

### 7-1. 응답 흐름

- 설문 상세 + 기응답 병렬 로드 (`getParticipationSet` + `getMyResponse`)
- 기응답 발견 시 해당 응답 내용 로드 (수정 가능 여부는 설문 설정의 `allowModification`)
- 제출 → `participationApi.submitResponse()` → 결과 페이지로 이동 (예상)

### 7-2. 비로그인 응답

[api/participation.ts:268-272](../../services/web-kpa-society/src/api/participation.ts#L268-L272):

- 익명 토큰 `survey:anon:{id}` 를 localStorage에 보관
- 같은 브라우저에서 중복 응답 방지

### 7-3. 매뉴얼 작성 시 유의

- "응답 수정 가능 여부는 설문마다 설정에 따라 다릅니다" 정도로 안내
- 익명 응답이 가능하다는 점은 회원이 놀랄 수 있는 동작 — 명시 권장

---

## 8. ParticipationResultPage — `/participation/:id/results`

[services/web-kpa-society/src/pages/participation/ParticipationResultPage.tsx](../../services/web-kpa-society/src/pages/participation/ParticipationResultPage.tsx)

### 8-1. 표시 내용

- 설문 제목, 설명
- 요약: 총 응답자 수, 질문 수, 응답 방식(익명/기명)
- 질문별 결과:
  - 선택형 → 막대 그래프
  - 자유 응답 → 텍스트 목록

### 8-2. 권한

- 명시적 가드 코드 미확인 — **공개로 추정**
- Phase 2에서 작성자/응답자 한정 권한 추가 가능성 있음 (매뉴얼은 현재 동작 기준으로 작성)

### 8-3. 매뉴얼 작성 시 유의

- 결과 페이지 통계 UI 코드 일부 불완성 (조사 보고 §10 언급) → 매뉴얼에서 **그래프 디테일 깊이 들어가지 말 것**. "응답이 모이는 화면" 정도로 추상화.

---

## 9. participationApi 메서드 정리

[services/web-kpa-society/src/api/participation.ts](../../services/web-kpa-society/src/api/participation.ts)

| 메서드 | 엔드포인트 | 용도 |
|--------|-----------|------|
| `getParticipationSets()` | `GET /surveys?serviceKey=kpa-society` | 목록 (ContentSurveysPage 사용) |
| `getParticipationSet(id)` | `GET /surveys/:id` | 상세 |
| `createParticipationSet()` | `POST /surveys` | 생성 (`ownerType='community_member'`, `visibility='members_only'` 고정) |
| `updateParticipationSet()` | `PATCH /surveys/:id` | 수정 |
| `deleteParticipationSet()` | `DELETE /surveys/:id` | 삭제 |
| `submitResponse()` | `POST /surveys/:id/responses` | 응답 제출 |
| `getMyResponse(id)` | `GET /surveys/:id/my-response` | 내 응답 |
| `getResults(id)` | `GET /surveys/:id/results` | 집계 |
| `updateStatus()` | `PATCH /surveys/:id/status` | DRAFT ↔ ACTIVE ↔ CLOSED |

`surveyApi` ([api/survey.ts](../../services/web-kpa-society/src/api/survey.ts)) 는 동일 백엔드의 회원용 어댑터 — `audience='for-me'` 파라미터로 응답자 관점 필터 + `rewardEnabled` / `rewardAmount` 필드 노출.

---

## 10. 권한 구조 정리

| 작업 | 권한 |
|------|------|
| 설문 목록 열람 (`/surveys`, `/content/surveys`) | 비로그인 가능 |
| 설문 응답 (`/participation/:id/respond`) | 비로그인 가능 (익명 토큰) |
| 결과 조회 (`/participation/:id/results`) | 공개 추정 (가드 코드 미확인) |
| 설문 생성 | 로그인 필수, 역할 제한 없음 |
| 설문 수정/삭제 | 작성자 권한 — 백엔드 처리 (코드 상 명시 가드 미확인) |
| 포인트 보상 지급 | 로그인 회원만 (응답 완료 시 자동) |

---

## 11. 미구현 / 매뉴얼 제외 권장 기능

| 기능 | 상태 | 매뉴얼 포함 여부 |
|------|------|------------------|
| `/participation` 목록 페이지 | **정적 placeholder** | 제외 (라우트 안내 금지) |
| 응답 수정 API | `getMyResponse`까지만, 실제 수정 엔드포인트 미확인 | 제외 또는 "설문 설정에 따라 다름" 수준으로만 |
| 통계 그래프 (질문별 차트) | 일부 불완성 | 깊이 들어가지 말 것 |
| QUIZ 유형 (퀴즈) | 작성 가능하나 `/content/surveys/new`에서는 노출 안 됨, 점수 계산 없음 | **제외** (현재 사용자 매뉴얼 단계에서 부차적) |
| 참여 범위 PHARMACIST_ONLY/PHARMACY_UNIT/ORGANIZATION | `hideScopeField`로 콘텐츠 허브에서 노출 안 됨 | 제외 |
| 결과 페이지 권한 가드 | 명시적 코드 부재 | 제외 (단순 "결과는 응답 후 볼 수 있습니다" 정도) |

---

## 12. 권장 매뉴얼 목차 (제안)

> 최종 WO에서 확정. 다른 기능 가이드(LMS/포럼/콘텐츠/자료실)와 동일한 6-step 패턴.

```text
/guide/features/survey

01 설문 둘러보기
   - /surveys — 회원용 설문 목록
   - 진행 중 설문 카드 (제목·응답 수·마감일·포인트 배지)
   - /surveys/:id 상세 진입

02 설문 참여하기
   - 설문 상세에서 "설문 참여하기" 버튼
   - 비로그인 응답도 가능 (같은 브라우저에서 중복 응답 방지)
   - 응답 수정 가능 여부는 설문마다 다름

03 포인트 보상
   - 보상이 설정된 설문은 포인트 배지로 표시
   - 응답 완료 즉시 포인트 지급
   - "이미 응답하셨습니다" 안내와 함께 지급 내역 표시

04 설문 만들기
   - 콘텐츠 허브의 "설문 등록" 진입 (/content/surveys/new)
   - 제목, 설명, 질문 추가 (단일 선택 / 복수 선택 / 자유 응답)
   - "사람을 평가하지 않는다" 원칙 — 점수/등급 없음
   - 초안(DRAFT) 저장 후 공개(ACTIVE)로 전환

05 결과 보기
   - 응답이 끝난 설문은 결과 페이지로 자동 이동
   - 응답자 수, 질문별 집계 확인
   - 종료된 설문도 같은 결과 화면

06 콘텐츠 허브에서 설문 관리
   - /content/surveys 에서 작성한 설문 목록 확인
   - 검색·상태(진행중/초안/종료) 필터
   - 진행중 설문은 응답 페이지로, 초안/종료는 결과 페이지로 이동
```

---

## 13. 부수 작업 (매뉴얼 신설과 함께 진행 권장)

매뉴얼 신설 시 함께 정리하면 사용자 동선이 깔끔해지는 작업:

### 13-1. `kpaGuideFeaturesProps.groups` 카탈로그에 설문 추가

[kpa.ts:487-570](../../packages/shared-space-ui/src/guide/copy/kpa.ts#L487-L570) — 7개 그룹에 8번째로 "설문조사" 추가:

```ts
{
  step: '08',
  title: '설문조사',
  primaryRoute: '/surveys',
  description: '...',
  items: [{ label: '설문조사 이용 방법', route: '/guide/features/survey' }],
  linkTo: '/guide/features/survey',
}
```

> `flowLabels`에도 '설문' 추가 — 단, 8개로 늘어나면 UI 가독성 확인 필요. 또는 콘텐츠 그룹 안에 자료 라벨 추가하는 식의 대안 검토.

### 13-2. KPA 라우트 파일 신설

[services/web-kpa-society/src/pages/guide/GuideFeatureSurveyPage.tsx](../../services/web-kpa-society/src/pages/guide/) — 기존 forum/content/resources 와 동일 패턴 래퍼:

```tsx
import { GuideFeatureManualPage as Shared, kpaGuideFeatureSurveyProps } from '@o4o/shared-space-ui';
// ...
```

### 13-3. App.tsx 라우트 등록

[App.tsx:582-594](../../services/web-kpa-society/src/App.tsx#L582-L594) 인근에 `/guide/features/survey` 라우트 추가.

### 13-4. 콘텐츠 가이드 §06 조정

[kpa.ts:743-747](../../packages/shared-space-ui/src/guide/copy/kpa.ts#L743-L747) — 설문조사 항목을 `/guide/features/survey` 위임 형태로 수정:

> 변경 전: `'/content/surveys 에서 진행 중 설문에 응답하거나, 종료된 설문의 결과를 확인합니다.'`
> 변경 후: `'설문 응답·작성·결과 확인은 /guide/features/survey 가이드를 참고합니다.'`

---

## 14. 후속 조사 권장 — Guide 범위 외 구조 이슈

본 매뉴얼 정비 WO 외에 별도 IR로 다룰 가치가 있는 항목 (참고):

1. **`/participation` 라우트 자체의 정리** — 정적 "준비 중" 페이지가 라이브에 남아 있음. 비활성화 또는 `/surveys` 리다이렉트 검토.
2. **결과 페이지 권한 가드** — 공개로 추정되나 명시적 가드 부재. 보안 정책 결정 후 코드 정리 필요.
3. **응답 수정 흐름** — `allowModification` 설정만 있고 실제 수정 엔드포인트 동작 확인 미완.
4. **QUIZ 유형의 미래 위치** — `/content/surveys/new`에서는 노출 안 되나 `/participation/create`에서는 가능 — 정책 통일 필요.

> 본 IR 범위 외 — 후속 IR 후보로 기록.

---

## 15. 후속 WO 정의 (예고)

### WO-O4O-KPA-GUIDE-SURVEY-MANUAL-NEW-V1

**목적:** 본 IR §12 권장 목차(6-step)로 `kpaGuideFeatureSurveyProps` **신규 작성** + 라우트/카탈로그 연결 + 콘텐츠 가이드 §06 위임 정리.

**범위:**
- [`packages/shared-space-ui/src/guide/copy/kpa.ts`](../../packages/shared-space-ui/src/guide/copy/kpa.ts) — `kpaGuideFeatureSurveyProps` 신규 export, `kpaGuideFeaturesProps.groups` 에 설문 그룹 추가, `kpaGuideFeatureContentProps.§06` 위임 수정
- [`services/web-kpa-society/src/pages/guide/GuideFeatureSurveyPage.tsx`](../../services/web-kpa-society/src/pages/guide/) — 신규 래퍼 페이지
- [`services/web-kpa-society/src/App.tsx`](../../services/web-kpa-society/src/App.tsx) — `/guide/features/survey` 라우트 + lazy import 추가
- (선택) `kpaGuideFeaturesProps.hero.flowLabels` 에 '설문' 추가 — 8라벨 UI 가독성 확인 필요

**범위 외:**
- `/participation` 정적 페이지 정리 (별도 WO)
- 결과 페이지 권한 가드 (보안 정책 결정 선행)
- 응답 수정 / QUIZ 흐름 정리 (백엔드 Phase 2 의존)
- 매장 가이드와 연계는 본 WO에서 안 함

**검증:**
- `tsc --noEmit` (shared-space-ui, web-kpa-society)
- 배포 후 브라우저 검증 (`/guide/features/survey` 신규 페이지, `/guide/features` 카탈로그에 설문 카드 표시)
- 모바일 레이아웃

---

## 16. 참고 파일

| 위치 | 역할 |
|------|------|
| [App.tsx:697-713, 736, 830-838](../../services/web-kpa-society/src/App.tsx#L697-L838) | 설문 관련 라우트 (8개) |
| [SurveyListPage.tsx](../../services/web-kpa-society/src/pages/survey/SurveyListPage.tsx) | 회원용 설문 목록 (포인트 배지) |
| [SurveyDetailPage.tsx](../../services/web-kpa-society/src/pages/survey/SurveyDetailPage.tsx) | 회원용 상세 + 포인트 안내 |
| [ContentSurveysPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentSurveysPage.tsx) | 작성자 목록 (검색/필터/등록) |
| [ParticipationListPage.tsx](../../services/web-kpa-society/src/pages/participation/ParticipationListPage.tsx) | 정적 placeholder (사용 안 함) |
| [ParticipationCreatePage.tsx](../../services/web-kpa-society/src/pages/participation/ParticipationCreatePage.tsx) | 설문 생성 (Question Builder) |
| [ParticipationRespondPage.tsx](../../services/web-kpa-society/src/pages/participation/ParticipationRespondPage.tsx) | 응답 제출 |
| [ParticipationResultPage.tsx](../../services/web-kpa-society/src/pages/participation/ParticipationResultPage.tsx) | 결과 집계 |
| [participation/types.ts](../../services/web-kpa-society/src/pages/participation/types.ts) | QuestionType, ParticipationScopeType, AnonymityType, ParticipationStatus 정의 |
| [api/survey.ts](../../services/web-kpa-society/src/api/survey.ts) | 회원용 어댑터 (audience='for-me', reward 필드) |
| [api/participation.ts](../../services/web-kpa-society/src/api/participation.ts) | 작성/응답/결과 API |
| [kpa.ts:487-570](../../packages/shared-space-ui/src/guide/copy/kpa.ts#L487-L570) | `kpaGuideFeaturesProps.groups` (설문 부재) |
| [kpa.ts:660-749](../../packages/shared-space-ui/src/guide/copy/kpa.ts#L660-L749) | 콘텐츠 가이드 (§01, §06 설문 언급만) |

---

*작성일: 2026-05-23*
*Status: Investigation Complete — 후속 WO 대기*
