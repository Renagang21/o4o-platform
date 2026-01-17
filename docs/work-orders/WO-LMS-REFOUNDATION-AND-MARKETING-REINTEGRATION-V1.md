# WO-LMS-REFOUNDATION-AND-MARKETING-REINTEGRATION-V1

## LMS 구조 재정비 및 Marketing Extension 재통합 작업 요청서

> **작성일**: 2026-01-17
> **작업 유형**: 구조 재정비 (Refoundation)
> **우선순위**: High
> **예상 범위**: lms-core, lms-yaksa, lms-marketing, Frontend 연동

---

## 0. 작업 성격 선언

본 Work Order는 **기능 추가 작업이 아니다**.

**목적**:
- LMS 계열의 **개념 혼선, 중복 구조, orphan 코드** 제거
- "학습 시스템"이 아닌 **시장반응 수집 기반 콘텐츠 시스템**으로 정식 재정의
- 이후 어떤 확장앱도 **Core 구조를 다시 흔들지 못하도록 고정**

⚠️ **부분 수정 / 임시 유지 / 최소 변경은 허용하지 않는다**

---

## 1. 기본 원칙 (모든 작업에 절대 적용)

### 1️⃣ Core 불가침 원칙

- `lms-core`는 **엔진 계층**이다
- Extension은 **정의(Definition)** 를 만들지 못한다
- Campaign / Marketing / Yaksa 는 **실행 컨텍스트만 제공**

### 2️⃣ 중복 구조 전면 제거

- 같은 개념을 **두 개 이상 저장하는 구조는 금지**
- JSONB 기반 임시 구조는 **엔진 대체 불가**

### 3️⃣ ORPHAN 금지

- Backend 없는 Frontend API
- 사용되지 않는 Controller / Route
- manifest에 선언되지 않은 기능
  → **모두 제거 또는 정식 복원**

### 4️⃣ LMS의 정식 정의 (고정)

> **LMS**는
> **콘텐츠를 전달하고, 참여를 유도하며, 반응 데이터를 누적시키는 시스템**이다.
> 분석·해석·판단은 LMS의 책임이 아니다.

---

## 2. 정비 대상 범위

### 포함 (필수)

| 패키지 | 작업 |
|--------|------|
| `packages/lms-core` | Quiz/Survey 라우팅 복권, 구조 명확화 |
| `packages/lms-yaksa` | 현행 유지 (정상 운영 중) |
| `packages/lms-marketing` | Clean Rebuild (재생성) |
| `apps/admin-dashboard` | LMS 관련 API 클라이언트 정합성 |
| `apps/main-site` | ContentBundle Viewer 연동 |

### 제외

- AI 분석 서비스
- 외부 마케팅 자동화
- 통계 시각화 고도화

---

## 3. 결정 사항 요약 (논쟁 종료)

### ✅ 결정 1: Lesson.quizData는 **폐기 대상**

| 항목 | 내용 |
|------|------|
| 역할 | 임시 구현 (Course 내 퀴즈) |
| 문제점 | 재사용 불가, 캠페인화 불가, 집계 불가 |
| 조치 | 신규 사용 금지 → 단계적 제거 → Quiz Core만 사용 |

### ✅ 결정 2: Quiz / Survey는 **Core 엔진으로 복권**

| 항목 | 내용 |
|------|------|
| 현재 상태 | 코드만 존재 (DEAD CODE) |
| 조치 | 라우팅 정식 등록, Progress/Attempt 역할 분리 |
| Frontend | API 경로 정합성 복원 |

### ✅ 결정 3: ContentBundle은 "유일한 독립 콘텐츠 단위"

| 개념 | 역할 | 범위 |
|------|------|------|
| Lesson.content | Course 내부 블록 (JSONB) | Course 종속 |
| ContentBundle | 배포 가능한 독립 콘텐츠 | 독립 배포 |

- Product / Marketing 콘텐츠는 **ContentBundle 기반으로만 존재**

### ✅ 결정 4: lms-marketing 재정의

> **lms-marketing** =
> 공급자·운영자가 "콘텐츠 + 퀴즈 + 설문"을 묶어
> **시장 반응을 수집하도록 돕는 실행 계층**

| 역할 | 포함 여부 |
|------|----------|
| 데이터 분석 | ❌ |
| 콘텐츠 품질 판단 | ❌ |
| 반응 "발생 구조" 제공 | ⭕️ |

---

## 4. Phase 구성

### Phase 1: LMS Core Refoundation

**목표**: Quiz/Survey Core 정상화

**작업 항목**:

| 작업 | 파일 | 상세 |
|------|------|------|
| Quiz 라우팅 등록 | `lms.routes.ts` | `createQuizRoutes(dataSource)` 호출 추가 |
| Survey 라우팅 등록 | `lms.routes.ts` | `createSurveyRoutes(dataSource)` 호출 추가 |
| QuizAttempt vs Progress 명확화 | 문서 | 역할 구분 문서화 |
| EngagementLog 정리 | 필요시 | 이벤트 타입 정리 |
| Lesson.quizData 차단 | 문서/코드 | 신규 사용 금지 표시 |

**산출물**:
- 동작하는 Quiz / Survey Core API
- Frontend API 불일치 제거
- 구조 설명 문서 1종

**예상 작업량**: 1-2일

---

### Phase 2: lms-marketing 재생성 (Clean Rebuild)

**목표**: Backend 완전 연결된 Marketing Extension

**작업 항목**:

| 작업 | 상세 |
|------|------|
| 패키지 재생성 | src/, package.json, manifest, lifecycle 복구 |
| Entity 재작성 | 기존 dist 참고, Core 의존으로 재작성 |
| Controller/Service | ProductContent, QuizCampaign, SurveyCampaign |
| api-server 등록 | dependencies, DataSource, routes 추가 |

**포함 모듈**:
- ProductContent (ContentBundle wrapper)
- QuizCampaign (Quiz 실행 컨텍스트)
- SurveyCampaign (Survey 실행 컨텍스트)
- SupplierOnboarding
- CampaignAutomation (hook 기반)

**금지 사항**:
- ❌ Core Entity 복사
- ❌ Core Service 직접 접근
- ❌ 독자적 데이터 정의

**예상 작업량**: 3-5일

---

### Phase 3: Orphan 정리 & Frontend 정합성

**목표**: ORPHAN 코드 0개

**작업 항목**:

| 작업 | 파일 | 상세 |
|------|------|------|
| 사용 불가 API 클라이언트 제거 | admin-dashboard, main-site | 미연결 API 정리 |
| Frontend 경로 정렬 | API 클라이언트 | Backend 실제 경로 기준 |
| Viewer 통합 | ContentBundleViewer | Admin/Main 공통화 |
| dist/node_modules 정리 | lms-marketing | gitignore 잔재 제거 |

**예상 작업량**: 1-2일

---

## 5. 성공 기준 (Definition of Done)

| 기준 | 검증 방법 |
|------|----------|
| Quiz / Survey / EngagementLog가 실제 API로 동작 | API 호출 테스트 |
| ContentBundle 하나로 콘텐츠 계열 정리 | 코드 리뷰 |
| lms-marketing이 Backend + Frontend 완전 연결 | E2E 테스트 |
| ORPHAN 코드 0개 | grep 검증 |
| "이게 뭐랑 겹치지?" 질문 없음 | 문서 리뷰 |

---

## 6. 후속 작업 (이번 WO 범위 아님)

- Supplier Engagement Dashboard (R12)
- AI 기반 반응 해석
- 고급 통계 / 파이프라인

---

## 7. 참조 문서

- [LMS-RAW-FACTS-INVESTIGATION-2026-01-17.md](../reports/LMS-RAW-FACTS-INVESTIGATION-2026-01-17.md)
- [LMS-AS-IS-AUDIT-2026-01-17.md](../reports/LMS-AS-IS-AUDIT-2026-01-17.md)
- [ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md](../reports/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md)

---

## 8. 최종 선언

이 Work Order 이후:

- LMS는 **흔들리지 않는 근간**
- Marketing / Yaksa / 기타 확장은 **이 구조 위에서만 가능**
- 다시 "정리해야 하나?"라는 논의는 하지 않는다

---

*Work Order Created: 2026-01-17*
*Status: PENDING APPROVAL*
