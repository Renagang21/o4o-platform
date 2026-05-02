# APP-LMS Baseline

> **상위 문서**: `CLAUDE.md` §13-A · `docs/architecture/APP-STANDARD-LIST-AND-MATRIX.md`
> **관련**: `docs/architecture/LMS-SCOPE-GUARD.md`, `docs/architecture/O4O-COMMONIZATION-STANDARD.md`, `docs/platform/lms/`
> **버전**: V1
> **작성일**: 2026-05-02
> **상태**: Active — Phase 1 (Baseline Defined). Frontend 공통화는 후속 작업.
> **WO**: WO-O4O-APP-LMS-BASELINE-V1
>
> 본 문서는 O4O 플랫폼의 LMS(학습 앱)가 어떤 구조로 정의되고 어디까지 공통화 대상인지를 고정한다. 이후 LMS 관련 모든 WO/IR/구현/리뷰의 판정 기준이다.

---

## 1. 개요

- **LMS = 교육·강좌 실행 APP** — APP-CONTENT/APP-FORUM/APP-SIGNAGE와 동급의 표준 단위.
- **백엔드는 단일 모듈** — `apps/api-server/src/modules/lms`. 모든 서비스가 동일 엔진을 사용한다.
- **프론트엔드는 분산 상태** — 각 서비스가 자체 페이지/API 클라이언트를 갖는다. 공통 Template/Client 패키지는 아직 없다.
- 본 문서는 **반(半)공통 상태**를 사실로 인정하고, 어디까지가 표준이고 어디부터가 후속 작업인지 선을 긋는다.

---

## 2. 구성 요소

LMS는 두 영역으로 구성된다.

| 영역 | 경로 | 대상 사용자 |
|---|---|---|
| **Learner** | `/lms` | 모든 인증 사용자 |
| **Instructor** | `/instructor` | `lms:instructor` 또는 서비스 admin |

각 영역은 별개의 라우트 트리를 가지며, Header 진입점도 분리된다 (Learner = 메인 네비, Instructor = 프로필 드롭다운).

---

## 3. Learner 표준 (`/lms`)

### 필수 라우트

| 경로 | 역할 |
|---|---|
| `/lms` | Hub — 강좌 카탈로그/추천/검색 |
| `/lms/courses` | 전체 강좌 목록 |
| `/lms/courses/:id` (또는 `/lms/course/:id`) | 강좌 상세 + 수강 신청 |
| `/lms/lessons/:id` (또는 `/lms/course/:courseId/lesson/:lessonId`) | 레슨 뷰어 |
| `/lms/certificates/:id` | 수료증 (해당 서비스만) |

### UI 기본형

- **Hub**: 카드 그리드 (APP-STANDARD-LIST-AND-MATRIX.md §2 기준)
- **Course list**: 카드 / 필터 / 정렬
- **Course detail**: 헤더 + 커리큘럼 + CTA (수강 신청)
- **Lesson viewer**: 콘텐츠 영역 + 진도 + 다음/이전

### Template 정책

- **목표**: `LmsHubTemplate`(`@o4o/shared-space-ui` 후속 추가)으로 통합.
- **현재**: 각 서비스 자체 구현. 신규 페이지 작성 시 가급적 KPA-Society 구조를 참조한다.

---

## 4. Instructor 표준 (`/instructor`)

KPA-Society를 reference implementation으로 한다.

### 필수 라우트

| 경로 | 역할 |
|---|---|
| `/instructor` | 강사 대시보드 (요약/공지) |
| `/instructor/courses` | 내 강의 목록 |
| `/instructor/courses/new` | 신규 강의 작성 |
| `/instructor/courses/:id` (또는 `/edit`) | 강의 편집 |
| `/instructor/dashboard` | 강의 운영 대시보드 (수강생/통계) |
| `/instructor/contents/:courseId/participants` | 수강생 관리 |

### 핵심 기능

- 강의 생성 / 수정 / 삭제 / 발행 / 보관 (publish/unpublish/archive)
- 레슨 / 퀴즈 / 과제 / 라이브 세션 CRUD
- 수강생 승인 / 진도 / 통계 조회
- 강의 상태 머신: `draft` → `pending_review` → `published` → `archived`

### 진입 권한

- 백엔드 가드: `requireInstructor` (`lms:instructor` 또는 `kpa:admin` bypass — `apps/api-server/src/modules/lms/middleware/requireInstructor.ts`)
- 프론트 진입점: 프로필 드롭다운 "강의 대시보드" 항목 (`isInstructor || isAdmin` 조건, 서비스별 Header에서 분기)

---

## 5. 서비스별 적용 범위

| 서비스 | Learner | Instructor | 비고 |
|---|---|---|---|
| **KPA-Society** | Full (6+ 페이지) | Full (5+ 페이지) | reference implementation |
| **GlycoPharm** | Partial (`/education` 위주) | Partial — Dashboard 1페이지만 | 강사 풀세트는 후속 |
| **K-Cosmetics** | Partial (3페이지) | **None** | §11 보류 결정 참조 |
| **Neture** | None | None | LMS 미사용 |

> 매트릭스 표기는 `APP-STANDARD-LIST-AND-MATRIX.md` 의 O/W/X/P와는 별도로, 본 문서에서 Learner/Instructor를 분리해 더 정확히 기록한다. 두 문서가 충돌할 경우 본 문서가 우선한다.

---

## 6. 공통화 원칙

| 원칙 | 적용 |
|---|---|
| 구조 동일 | 라우트 / 페이지 구성은 모든 도입 서비스가 동일하게 가져간다 |
| UI Template 기반 | 향후 `LmsHubTemplate`/`InstructorDashboardTemplate` 도입으로 통일 |
| 서비스 차이 = config | 코드에 `if (service === 'X')` 분기 금지. config/capability로 처리 |
| 데이터 격리 | §8 참조 |

> **현재 LMS UI는 공통화 대상이지만 아직 공통 Template이 없다.** 신규 서비스 도입 시 KPA 구조를 참조 복사하는 것이 임시 표준이다.

---

## 7. 백엔드 구조

- 단일 LMS 모듈: `apps/api-server/src/modules/lms`
- 모든 서비스가 `/api/v1/lms/*` 동일 엔드포인트 호출.
- 강사 권한 미들웨어: `requireInstructor` (service-neutral, `lms:instructor` 검증).
- KPA 보호 가드: `kpaLmsScopeGuard` — `/api/v1/lms` 전체에 마운트되지만 실제 검증 범위는 **KPA 조직의 코스 쓰기**로 좁다. 다른 서비스는 자연 통과한다.

상세는 [`LMS-SCOPE-GUARD.md`](LMS-SCOPE-GUARD.md) 참조.

---

## 8. 데이터 격리

| 항목 | 현재 | 향후 |
|---|---|---|
| 격리 키 | `organizationId` 기반 (KPA 중심) | `serviceKey` 기반 고려 필요 |
| 가드 의존 | `kpa_members.organization_id` 매핑 | service-neutral 자격 시스템 |
| 도메인 정책 | `O4O-BOUNDARY-POLICY-V1.md`는 broadcast 도메인은 `serviceKey` 격리를 요구 | 미충족 |

> **주의**: 현재는 완전한 service-neutral 구조가 아니다. KPA 외 서비스가 확대될 때 격리 정책 재정비가 필요하다. 즉흥 변경 금지 — `WO-O4O-LMS-SERVICEKEY-MIGRATION-V*` 별도 진행.

---

## 9. 공통 패키지 상태

| 패키지 | 상태 |
|---|---|
| `@o4o/lms-client` (frontend) | **없음** |
| `@o4o/lms-types` (frontend) | **없음** |
| `@o4o/shared-space-ui` 의 LMS Template | **없음** |
| `@o4o/lms-core` (backend, packages/) | 존재 (단, frontend 영향 없음) |

각 서비스 `src/api/lms.ts` 가 KPA 구현을 복사한 형태로 중복. **공통화 필요 (후속 작업).**

---

## 10. 향후 작업 로드맵

| Phase | 내용 | 산출물 |
|---|---|---|
| **Phase 1** | APP-LMS 기준 확정 | **본 문서** (완료) |
| Phase 2 | Frontend 공통 client / types 추출 | `@o4o/lms-client`, `@o4o/lms-types` + 3개 서비스 마이그레이션 |
| Phase 3 | LmsHubTemplate 도입 | `@o4o/shared-space-ui` 확장 + Learner UI 통일 |
| Phase 4 (선택) | Instructor UI 공통화 | InstructorDashboardTemplate / CourseEditorTemplate |
| Phase 5 (필요 시) | serviceKey 기반 격리 정비 | 가드 service-neutral 전환 + 자격 시스템 일반화 |

각 Phase는 독립 WO로 분리되며, 이전 Phase 완료 후 발행한다.

---

## 11. 제외 / 보류

| 항목 | 결정 | 사유 |
|---|---|---|
| K-Cosmetics Instructor | **보류** | 비즈니스 판단 필요 (B2C 화장품 도메인에서 강사·강의 등록 양면 시장이 의미 있는지) |
| Neture LMS | **미사용** | 도입 계획 없음. 본 문서 적용 대상 아님 |

K-Cos Instructor 도입 여부는 `WO-KCOS-LMS-INSTRUCTOR-DECISION-V1` 같은 별도 의사결정 WO로 처리한다. 본 문서는 결정을 강제하지 않는다.

---

## 12. 결론

> **LMS는 공통 백엔드를 사용하는 반공통 APP이며, 구조는 공통화 대상이지만 UI/클라이언트는 아직 분산 상태이다.**

- 백엔드: 공통 ✅
- 라우트/페이지 구조: 표준 정의 ✅ (본 문서)
- Frontend client / types: 미공통 ⚠ (Phase 2)
- UI Template: 미공통 ⚠ (Phase 3)
- 데이터 격리: KPA 중심 ⚠ (Phase 5, 필요 시)

이후 모든 LMS 작업은 이 baseline을 기준으로 판단한다.

---

## 13. 참고 자료

- [APP-STANDARD-LIST-AND-MATRIX.md](APP-STANDARD-LIST-AND-MATRIX.md) — APP 단위 표준 정의
- [LMS-SCOPE-GUARD.md](LMS-SCOPE-GUARD.md) — kpaLmsScopeGuard 동작 분석
- [O4O-COMMONIZATION-STANDARD.md](O4O-COMMONIZATION-STANDARD.md) — 공통화 판단 기준
- [O4O-BOUNDARY-POLICY-V1.md](O4O-BOUNDARY-POLICY-V1.md) — 도메인 격리 키 정책
- [docs/platform/lms/](../platform/lms/) — KPA LMS 자격/계약 관련 freeze 문서들
- [apps/api-server/src/modules/lms/](../../apps/api-server/src/modules/lms/) — 백엔드 단일 모듈
