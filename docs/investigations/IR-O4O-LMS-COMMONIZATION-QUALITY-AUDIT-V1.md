# IR-O4O-LMS-COMMONIZATION-QUALITY-AUDIT-V1

> **유형**: Investigation (read-only) — LMS 공통화가 의도대로 닫혔는지 품질 점검.
> **성격**: 코드/backend/DB/migration/package/lock/Dockerfile **무변경**. 문서 1개만 생성.
> **결론(요약)**: **PASS with Follow-up** — 사용자 허브·운영자 관리·강사 목록/폼/레슨 관리의 **공통 컴포넌트 추출 + thin wrapper 정렬은 구조적으로 완료**(KPA/GP/KCos, Neture 제외 깨끗). KPA-only(quiz/assignment/grading/CourseStructureAi) 격리·AI/reward/payment 트랙 경계도 정합. **단, Cycle 1 closure 는 GP 빌드 1건(reusablePolicy `'organization'` 타입 드리프트, in-flight Phase 2)이 남아 있어 그 수정 전까지 보류.** 강의 상세/레슨 플레이어는 서비스별 thick(의도적 차이 + 일부 잔여 중복).
> **작성일**: 2026-06-15 · HEAD `cabc04dc0`

---

## 1. 목적
O4O 강의/LMS 공통화(사용자/운영자/강사 화면 + KPA-only 판단 + Neture 제외 + reward/payment/AI 경계)가 실제 repository 상태에서 의도대로 완료됐는지 read-only 로 점검한다. 새 공통화가 아니라 "이미 한 공통화가 잘 닫혔는지" 확인.

## 2. 선행 LMS 공통화 요약 (실측 위치)
명세상 컴포넌트들이 실제로 **세 패키지에 분산**되어 있다(명세의 "lms-ui" 단일 가정과 다름 — 실측 기준 기록):

| 컴포넌트 | 실측 위치(패키지) | 성격 |
|----------|------------------|------|
| `LmsHubTemplate`, `AppreciationPanel` | **@o4o/shared-space-ui** | 허브 템플릿 / 감사 포인트 패널 |
| `CourseCard`·`CourseList`·`LessonList`·`LessonItemView`·`CourseProgressBar`·`CourseStatusBadge`·`CourseVisibilityBadge`·`EnrollmentButton`·`LessonPlayerShell`·`NoPaymentNotice` | **@o4o/lms-ui** | pure presentational primitive (fetch/reward/payment/AI 없음 — header 선언 검증됨) |
| `OperatorLmsCoursesManager`·`InstructorCoursesManager`·`InstructorCourseFormShell`·`InstructorLessonListManager` | **@o4o/operator-core-ui** (`src/modules/*`) | config-driven manager/shell (route/serviceKey 미하드코딩) |
| `QuizBuilder`·`AssignmentEditor`·`CourseStructureAiModal`·`LessonSubmissionsPage`(grading) | **services/web-kpa-society** only | KPA-only 고급 기능 |
| `CourseReusablePolicy`(enum) | **@o4o/interactive-content-core** (entity) → lms-core 재export | 도메인 계약 |
| `CourseFormReusablePolicy`(`restricted\|platform\|organization`) | **@o4o/operator-core-ui** form 타입 | 폼 레벨 어댑터 타입 |

> `LessonModal` 은 별도 공통 컴포넌트가 아니라 `InstructorLessonListManager` 의 `renderEditor` **render-prop** 으로 서비스가 소유(편집 UI=서비스 책임) — 의도된 경계.

## 3. 서비스 × 계층 적용 매트릭스

| 계층 / 화면 | 공통 컴포넌트 | KPA | GlycoPharm | K-Cosmetics | Neture | 판정 |
|------|------|------|------|------|------|------|
| 사용자 허브/목록 | `LmsHubTemplate` | ✅ thin(211L) | ✅ thin(56L) | ✅ thin(76L) | — 없음 | **A** |
| 사용자 강의 상세 | (primitive 일부) | thick 622L | thick 727L | thin 314L | — | **B/C** |
| 사용자 레슨 플레이어 | `LessonList`·`CourseProgressBar` | thick 1219L | thick 761L | thick 841L | — | **B/C** |
| 운영자 강의 관리 | `OperatorLmsCoursesManager` | ✅ thin(27L) | ✅ thin(27L) | ✅ thin(27L) | — | **A** |
| 강사 강의 목록 | `InstructorCoursesManager` | ✅ thin(44L) | ✅ thin(45L) | ✅ thin(38L, read-only) | — | **A** |
| 강사 강의 생성/편집 폼 | `InstructorCourseFormShell` | ✅ (CourseNew/EditPage) | ✅ (InstructorCourseEditPage) | ❌ 없음(Phase 1-B) | — | **A / C(KCos)** |
| 강사 레슨 목록 관리 | `InstructorLessonListManager` | ✅ (renderEditor) | ✅ (renderEditor) | ❌ 없음 | — | **A / C(KCos)** |
| quiz/assignment/grading | (공통화 대상 아님) | ✅ KPA-only | 학습자측 일부 | 학습자측 일부 | — | **C** |
| CourseStructureAi | (공통화 대상 아님) | ✅ KPA-only | ❌ | ❌ | — | **C** |
| LMS 자체 | — | ✅ | ✅ | ✅ | **❌ 미사용(깨끗)** | **C** |

## 4. 핵심 질문 12개 답변

| # | 질문 | 답 |
|---|------|----|
| 1 | 사용자 강의 화면 공통 컴포넌트 동일? | 허브=✅ 동일(`LmsHubTemplate`). 상세/플레이어=primitive(`LessonList`/`CourseProgressBar`)는 공유하나 본문은 서비스별 thick(비공유). |
| 2 | 운영자 관리 공통 manager? | ✅ 3서비스 모두 `OperatorLmsCoursesManager` thin(27L). |
| 3 | 강사 목록 공통 manager? | ✅ 3서비스 모두 `InstructorCoursesManager`(KCos read-only rowActions=[]). |
| 4 | 강사 폼 공통 shell? | ✅ KPA/GP `InstructorCourseFormShell`. KCos 미구현(Phase 1-B). |
| 5 | 레슨 목록/드래그/삭제/편집 공통 manager? | ✅ KPA/GP `InstructorLessonListManager`(reorder + renderEditor). KCos 없음. |
| 6 | LessonModal 적절히 제외? | ✅ render-prop(`renderEditor`)으로 서비스 소유 — 공통화 대상서 의도적 제외. |
| 7 | KPA-only quiz/assignment/grading 유지 판단 맞나? | ✅ 맞음. KPA 단독 존재(GP/KCos 파일 부재 확인). 공통 패키지 미export. |
| 8 | CourseStructureAiModal KEEP 맞나? | ✅ 맞음. 2단계 구조 생성 + AI editing 트랙(course-structure=Gemini-locked, EditingSurface 밖). KPA-only. |
| 9 | GP/KCos 기능 격차 = 제품요구 vs 공통화 미비? | 혼합: KCos 강사 편집 부재=**의도(Phase 1-B 명시)**. GP/KCos 상세·플레이어 thick 병렬=**일부 잔여 중복(공통화 여지)**. |
| 10 | Neture LMS 흔적? | ❌ 없음. `@o4o/lms-ui`/lms/course/lesson grep 0건 — 깨끗. |
| 11 | reward/payment/AI provider 가 LMS 공통화와 섞였나? | 섞이지 않음. lms-ui purity(reward/payment/AI import 0) 검증. reusablePolicy=interactive-content-core entity. course-structure=Gemini 고정. |
| 12 | 현 상태로 Cycle 1 closure 유효? | **부분.** 구조는 유효하나 **GP 빌드 1건(§6) 미해소** → closure V2 는 그 수정 후. |

## 5. 계층별 공통화 상태

### 5.1 사용자 화면
- **허브/목록(A)**: KPA/GP/KCos 모두 `LmsHubTemplate`(@o4o/shared-space-ui) thin wrapper — accent/hero/courseDetailPath + api 어댑터만 차이. 정합.
- **강의 상세(B/C)**: 서비스별 thick(KPA 622L / GP 727L / KCos 314L). 공유는 `CourseVisibilityBadge`·`NoPaymentNotice`·`LessonList`·`CourseProgressBar`·`AppreciationPanel` 일부. enrollment 버튼은 공통 `EnrollmentButton` 미사용·인라인(서비스별). progress=정책 분리 준수(고정 크레딧 문구 제거, `WO-O4O-LMS-COMPLETION-REWARD-POLICY-SEPARATION-V1`).
- **레슨 플레이어(B/C)**: `LessonList`·`CourseProgressBar` 공유, 그러나 video/article/quiz/assignment 렌더는 서비스별 thick(KPA 1219L / GP 761L / KCos 841L). 공통 `LessonPlayerShell` 은 export 됐으나 **3서비스 모두 미소비(dormant)**.
- **공개범위/진행률**: `CourseVisibilityBadge`·`CourseProgressBar` 공유 ✅.
- **dormant primitive**: `CourseCard`·`CourseList`·`EnrollmentButton`·`LessonPlayerShell` 는 export 되나 실제 소비 미미(허브는 LmsHubTemplate 자체 그리드 사용) — 공통화 여지(B) 또는 의도적 보존.

### 5.2 운영자 화면 (A — 완료)
- 3서비스 `OperatorLmsCoursesPage` 27L thin wrapper → `OperatorLmsCoursesManager`(목록/필터/승인·반려·미게시·아카이브·하드삭제/상세 drawer). 차이는 api 어댑터 + `detailLinkLabel`(GP '편집 페이지 이동' vs KCos '강의 페이지 이동')뿐. **결제/유료 문구는 manager 가 강제하지 않음**(외부 결제 정책과 비충돌). KPA=reference.

### 5.3 강사 화면
- **목록(A)**: 3서비스 `InstructorCoursesManager` thin(44/45/38L). KCos rowActions=[](read-only, Phase 1-B 명시).
- **생성/편집 폼(A, KCos C)**: KPA(`CourseNewPage` 92L + `CourseEditPage` 937L) / GP(`InstructorCourseEditPage` 563L) 가 `InstructorCourseFormShell` + `InstructorLessonListManager` 소비. KCos 는 편집 페이지 자체 부재(의도 — Phase 1-B).
- **레슨 관리(A)**: `InstructorLessonListManager`(reorder + `renderEditor`). KPA 는 renderEditor 안에서 QuizBuilder/AssignmentEditor/CourseStructureAiModal 결합(KPA-only). GP 는 기본 lesson modal(quiz/assignment "editor 보류" 안내).
- **강사 운영 대시보드(KPA bespoke)**: `OperationsCourseListPage`(202L)·`OperationsCourseDetailPage`(716L) 는 공통 manager 미사용 — KPA-only 운영 허브(현 단계 제품 차이).

## 6. 빌드/타입 상태 (직접 실측, HEAD `cabc04dc0`)

| 대상 | 결과 | 비고 |
|------|------|------|
| GP `tsc -b` | ❌ **1 err** | `instructor/InstructorCourseEditPage.tsx:375` **TS2322** — `CourseFormReusablePolicy`(`…\|'organization'`) → GP `CourseReusablePolicy`(`restricted\|platform`) 미할당 |
| KCos `tsc -b` | ✅ 0 | — |
| KPA `tsc -b` | ✅ 0 | — |
| lms-ui standalone | ✅ 0 | pure presentational, reward/payment/AI import 0 |
| `@o4o/lms-ui` TS2307(소비측) | **0** | **직전 IR(IR-O4O-WORKSPACE-INTERRUPTED-BUILD-STATE-AUDIT-V1)의 L1(lms-ui 와이어링)·P1(product-applications @o4o/types phantom) 해소됨** |

> **해석**: 직전 IR(HEAD `07496aa5f`)의 GP/KCos 5-error in-flight 상태가 `cabc04dc0` 에서 **거의 닫힘** — 남은 건 직전 IR 이 예고한 **L2(reward/reusable-policy 타입)** 1건뿐. 원인: 공통 `InstructorCourseFormShell` 이 Phase 2 값 `'organization'` 을 노출하나 GP `lms.ts` API 계약 타입이 2값(`restricted\|platform`)만 — Phase 2 롤아웃 미완(in-flight). KCos/KPA 는 영향 없음.

## 7. KPA-only 영역 판단 (C — 유지 타당)
- `QuizBuilder`(334L)·`AssignmentEditor`(169L)·`CourseStructureAiModal`(423L)·`LessonSubmissionsPage`(grading, 358L) 모두 **KPA 단독**(GP/KCos 파일 부재 grep 확인). 공통 패키지 미export, KPA `CourseEditPage` 에서만 소비.
- 판단: **KPA-only reference 로 유지가 맞음.** GP/KCos 에 동일 제품 요구가 확정되기 전 공통화 시도는 과추출. CourseStructureAi 는 AI editing 트랙(Gemini course-structure)과 결합되어 별도 경계.

## 8. Neture 제외 확인 (C — 깨끗)
- `services/web-neture` 내 `@o4o/lms-ui`/lms/course/lesson import·route·menu **0건**. stray LMS 흔적 없음. lms-ui header 의 "Neture 는 LMS 대상 아님" 선언과 코드 일치.

## 9. reward / payment / AI 트랙 경계 (E — 분리 정합)
- **lms-ui purity**: reward-budget/checkout/payment/Qwen/Gemini import 0(주석만). presentational 전용.
- **reward 완료 정책**: 수료 시 고정 크레딧 문구 미노출(`WO-...-COMPLETION-REWARD-POLICY-SEPARATION-V1`), reward 는 강사/운영자 설정 시에만 동적 표시. `AppreciationPanel`(감사 포인트)은 결제 아닌 별도 흐름.
- **payment**: `NoPaymentNotice`(공통, "O4O 는 강의 결제 미제공") — copy 는 컴포넌트 내 **하드코딩**(정책 객체 주입 아님). 운영자 manager 가 유료 강제 안 함.
- **AI provider**: course-structure=Gemini 고정(EditingSurface 밖), Qwen 저위험 surface(pop/qr/blog)와 무관 — `CHECK-O4O-AI-QWEN-LOW-RISK-SURFACE-SMOKE-V1` 과 정합. LMS 공통화에 미혼입.

## 10. 남은 격차 (분류)
| 항목 | 분류 | 설명 |
|------|------|------|
| GP `reusablePolicy 'organization'` 타입 드리프트(빌드 1건) | **D(즉시)** | 공통 폼 shell Phase 2 값 ↔ GP API 2값 계약 불일치. in-flight LMS/reward-policy 세션 소관. closure 차단. |
| 강의 상세/레슨 플레이어 thick 병렬(KPA/GP/KCos 각 ~600–1200L) | **B/D** | primitive 만 공유, 본문 비공유. `LessonPlayerShell` dormant. 진짜 잔여 중복 — 단 lesson 타입 렌더가 서비스별 복잡(quiz/assignment/AI 유무)이라 부분 의도. |
| reward/감사 에러 copy 하드코딩·GP↔KCos 동일 문자열 | **B** | 정책/공통 상수 미추출(파생 아닌 복사). 경미. |
| KCos 강사 편집/레슨관리 부재 | **C(의도)** | Phase 1-B 명시(read-only). 제품 단계 차이 — 공통화 미비 아님. |
| dormant lms-ui primitive(CourseCard/CourseList/EnrollmentButton/LessonPlayerShell) | **B(선택)** | export 됐으나 미소비. 향후 상세/플레이어 정렬 시 활용 또는 정리. |
| KCos 상세(quiz 미리보기 없음) ↔ 플레이어(quiz/assignment 풀구현) | **B/C** | 상세는 미리보기 미노출, 플레이어에서 노출 — 현 흐름상 의도 가능(깨진 라우트 아님). 제품 결정 영역. |

## 11. 후속 WO 필요 여부
- **즉시(D)**: GP `reusablePolicy` 타입 드리프트 1건 — in-flight LMS/reward-policy 세션이 마무리(§6). 본 read-only IR 범위 밖(코드 수정 금지). 이 1건 해소 전 Cycle 1 closure 보류.
- **선택(B)**: wrapper/문구/dormant primitive 정리 — 큰 구조 영향 없음. 제품 우선순위에 따라.
- **유지(C/E)**: KPA-only·Neture 제외·AI/reward 경계 — 추가 작업 불요.

## 12. 최종 판정

```
판정: PASS with Follow-up
( 단, Cycle 1 closure 는 §6 GP 빌드 1건 해소 전까지 보류 — 그 한 축은 HOLD 성격 )

- 공통화 구조(허브/운영자/강사 목록·폼·레슨 manager): A — 완료, thin wrapper, KPA reference 정합
- KPA-only 고급기능(quiz/assignment/grading/CourseStructureAi): C — 유지 타당(과추출 금지)
- Neture LMS 제외: C — 깨끗(흔적 0)
- reward/payment/AI 트랙 경계: E — 분리 정합(lms-ui purity, course-structure Gemini 고정)
- 강의 상세/레슨 플레이어: B/C — primitive 공유 + 서비스별 thick(일부 잔여 중복, 부분 의도)
- 빌드: KCos/KPA green, GP 1 err(reusablePolicy 'organization' in-flight Phase 2) — closure 차단 요인
- 새 공통화 WO: 불요. 남은 것은 (D)타입 드리프트 1건 + (B)경미 정리 + (C/E)유지
```

**요지**: "이미 한 공통화"는 구조적으로 잘 닫혔다(운영자·강사·허브 = 공통 manager/template thin wrapper, Neture 제외·KPA-only 격리·트랙 경계 모두 정합). 다만 **GP 강사 편집의 reusablePolicy 타입 1건**이 in-flight Phase 2 롤아웃 미완으로 빌드를 막고 있어, **Cycle 1 공식 closure(V2)는 이 1건 수정 후** 선언해야 한다. 강의 상세/레슨 플레이어의 thick 병렬은 제품 차이(quiz/assignment/AI 유무)와 잔여 중복이 섞여 있어, 실제 제품 요구가 모일 때만 추가 정렬을 연다.

## 13. 후속 작업 후보 (필요한 것만)
1. **(in-flight 세션 소관)** GP `InstructorCourseEditPage.tsx:375` reusablePolicy 타입 정합 — `CourseReusablePolicy` 에 `'organization'` 추가 또는 폼 shell 값을 서비스별 허용집합으로 제약. (코드 수정 — 본 IR 밖)
2. `CHECK-O4O-LMS-COMMONIZATION-CYCLE1-CLOSURE-V2` — 위 1 해소 후 GP green 재측정하여 closure 재확인.
3. `WO-O4O-LMS-COPY-AND-EMPTY-STATE-ALIGNMENT-V1`(선택) — reward/감사 에러 문구·NoPaymentNotice copy 공통 상수화(GP↔KCos 중복 제거).
4. `KEEP-O4O-LMS-KPA-ADVANCED-FEATURES-AS-REFERENCE-V1` — quiz/assignment/grading/CourseStructureAi 를 KPA-only reference 로 고정.
5. (보류) `IR-O4O-LMS-QUIZ-ASSIGNMENT-PRODUCT-SCOPE-V1` — GP/KCos 에 quiz/assignment 제품 요구가 확정되면 범위 재조사.

---

*Date: 2026-06-15 · read-only IR · 코드 무변경 · LMS 공통화 = 구조 PASS(허브/운영자/강사 manager thin wrapper, Neture 제외·KPA-only 격리·트랙 경계 정합). Cycle 1 closure 는 GP reusablePolicy 타입 1건(in-flight Phase 2) 해소 후. 강의 상세/레슨 플레이어 thick 병렬=부분 의도+잔여 중복. PASS with Follow-up.*
