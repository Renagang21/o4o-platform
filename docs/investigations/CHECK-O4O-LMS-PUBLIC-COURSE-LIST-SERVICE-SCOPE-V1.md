# CHECK-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1

- **WO**: `WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1`
- **선행**: `CHECK-O4O-COMMUNITY-COMMONIZATION-MAIN-INTEGRATION-AND-PRODUCTION-SMOKE-CLOSURE-V1`
- **작성일**: 2026-08-18
- **판정**: **PASS (with documented residual risk)**

> 본 CHECK 는 **LMS 공개 강의 목록의 service boundary 수정 완료** 기록이다.
> 커뮤니티 전체 공통화 완료를 의미하지 않는다.

---

## 1. 결함 요약

`GET /api/v1/lms/courses` 가 service boundary 없이 전 서비스 강의를 반환했다.
`CourseService.listCourses` 의 QueryBuilder 에 service 조건 자체가 없었고, generic route
(`/api/v1/lms/*`) 에는 서비스 컨텍스트를 주입하는 미들웨어가 없었다. 그 결과
KPA-Society 강의가 K-Cosmetics · GlycoPharm 사용자 화면에 그대로 노출됐다.

Forum 은 이미 `forumContextMiddleware → resolveCanonicalServiceKey → applyServiceScope`
계약을 갖고 있었으나 **LMS 에는 대응 계약이 없었다**. 즉 데이터 문제가 아니라 계약 누락이다.

---

## 2. 전수조사 (§2) — 코드 기준 모집단

문서가 아니라 코드 grep 으로 `/lms/courses` 소비처를 확정했다.

| 소비처 | route / basePath | serviceKey 전달 | 목록 소비 | 판정 |
|---|---|---|---|---|
| `services/web-kpa-society/src/api/lms.ts` | `apiClient` = `/api/v1/kpa` | (불필요) | O | **route context 로 해결** |
| `services/web-k-cosmetics/src/api/lms.ts` | `api` = `/api/v1` (generic) | ✗ → **추가** | O | **serviceKey 주입** |
| `services/web-glycopharm/src/api/lms.ts` | `api` = `/api/v1` (generic) | ✗ → **추가** | O | **serviceKey 주입** |
| `services/web-glycopharm/.../operator/LmsCoursesPage.tsx` | 직접 `api.get('/lms/courses?…')` | ✗ | O | **lmsApi 경유로 이관** |
| `apps/main-site/src/pages/lms/*` | `authClient` = `/api/v1` (generic) | ✗ | **X (상세/레슨만)** | 무경계 유지 (legacy) |
| `services/web-kpa-society/src/api/lms-instructor.ts` | generic | ✗ | 강사 본인 코스 | 범위 밖 (instructorId 로 이미 격리) |
| Neture · PharmacyHub · KPA-Branch | — | — | **소비처 0건** | 해당 없음 |

- 백엔드: `CourseController.listCourses/getCourse` → `CourseService.listCourses`,
  `LessonController.listLessonsByCourse`.
- 강의 원장 service 축: `packages/interactive-content-core/src/entities/Course.ts`
  → 테이블 `lms_courses`, 컬럼 `service_key` (**이미 존재** → migration 불필요, §13 중지 조건 미해당).
- 서비스 remount: `/api/v1/kpa/lms` 만 존재 (K-Cosmetics · GlycoPharm 은 generic 소비).

---

## 3. service-key SSOT (§3)

**새 LMS 전용 매핑을 만들지 않았다.** 기존 canonical SSOT 를 그대로 재사용한다.

- `resolveCanonicalServiceKey()` — `packages/security-core/src/service-configs.ts`
- `SERVICE_KEYS` — `apps/api-server/src/constants/service-keys.ts`
- 매핑: `kpa → kpa-society`, `cosmetics → k-cosmetics`, `glycopharm` · `neture` ·
  `pharmacy-hub` · `kpa-branch` 는 self-map.

회귀 테스트가 "자체 매핑 테이블 신설 없음" 을 소스 텍스트로 고정한다.

---

## 4. 적용한 scope 우선순위 (§4)

신규 `apps/api-server/src/modules/lms/utils/lms-service-scope.ts` 가 계약을 담는다.

1. **service prefix 라우트 컨텍스트 최우선** — `lmsContextMiddleware({ serviceCode: 'kpa' })`
   가 `/api/v1/kpa/lms` 에 mount 된다. 컨텍스트가 있으면 client 가 보낸 `serviceKey` 는
   **무시**된다 (스푸핑 차단, Boundary Policy Guard Rule 4 와 동일 취지).
2. **명시 `serviceKey` canonical 계약** — 컨텍스트가 없을 때만 query 의 `serviceKey` 를
   canonical 로 해석한다. 미허용 값은 무경계 통과가 아니라 **400 `INVALID_SERVICE_KEY`**.
3. **client-side filtering 0** — 경계는 전부 SQL(`andWhere` + parameter binding)에서 걸린다.
   프런트는 응답을 걸러내지 않는다.

---

## 5. 하위 호환 선택 (§5) — **옵션 B (+ 옵션 A 의 KPA 부분)**

- KPA-Society: 이미 `/api/v1/kpa/lms/*` 를 쓰므로 **라우트 컨텍스트**로 경계 확보 (옵션 A 성격).
- K-Cosmetics · GlycoPharm: generic route 유지 + **canonical `serviceKey` 를 client 계층에서 주입**.
- generic + serviceKey 미전달: **무경계 유지** — `apps/main-site` (legacy) · admin · 플랫폼 카탈로그 호환.

> 서비스 전용 LMS remount 를 신설하는 방식(옵션 A 전면)은 §7 의 **부분 remount 위험**
> (KPA remount 에 quiz/assignment 라우트가 없는 문제)을 K-Cosmetics · GlycoPharm 에까지
> 복제하게 되어 채택하지 않았다. §13 "대규모 API 재설계" 중지 조건 회피이기도 하다.

**§5 완료 조건 — 서비스 사용자 화면에서 unscoped 목록 사용 = 0**

| 화면 | 경계 출처 |
|---|---|
| KPA `/lms` 목록 | 라우트 컨텍스트 (`kpa` → `kpa-society`) |
| K-Cosmetics `/lms` 목록 | `serviceKey='k-cosmetics'` |
| GlycoPharm `/lms` 목록 | `serviceKey='glycopharm'` |
| GlycoPharm 운영자 강의 관리 | `lmsApi.operatorGetCourses` → 동일 client 주입 |

`apps/main-site` 는 **목록 소비가 없고**(상세/레슨만) 서비스 사용자 화면이 아니라 legacy
플랫폼 화면이므로 무경계 대상에서 제외했다.

---

## 6. 파생 경로 (§6)

| 경로 | 조치 |
|---|---|
| 강의 상세 `GET /lms/courses/:id` | scope 불일치 시 **404** (403 아님 — 존재 노출 차단) |
| 레슨 목록 `GET /lms/courses/:id/lessons` | 동일 판정. scope 가 있을 때만 course 조회 1회 추가 (무경계 요청은 비용 0) |
| 레슨 상세 · 수료증 · 수강 · 진도 | **구조 미변경** — 잔여 리스크로 기록 (§9) |

`legacy null service_key` 는 KPA-Society 로 간주한다. 이는 신규 규칙이 아니라 기존
`course.serviceKey ?? 'kpa-society'` fallback(CourseService · AssignmentService ·
CertificateController)과 동일한 판단이며, 현재 해당 row 는 **0건**이다.

---

## 7. KPA remount 계약 (§7)

기존 알려진 리스크 2건을 **악화시키지 않았음**을 확인했다.

- `/api/v1/kpa/lms` 에 quiz/assignment 라우트 없음 → **이번 작업에서 라우트 추가·제거 없음**
  (`lmsRouter.use(...)` 1줄만 추가).
- 레슨 목록 guard 불일치(generic `requireAuth + requireEnrollment` vs KPA `optionalAuth`)
  → **guard 미변경**. scope 판정은 guard 통과 이후에만 동작한다.
- quiz/assignment 신규 구현: 범위 밖 (미착수).

---

## 8. 프로덕션 DB 검증 (§9, read-only)

접속: `cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db --port 15433` →
`psql -U o4o_api_v2 -d o4o_platform`. **SELECT 만 수행. write 0건.**

| 항목 | 실측 |
|---|---|
| `lms_courses` 전체 | **7** |
| `service_key` 분포 | `kpa-society` = **7** (100%) |
| `service_key IS NULL` | **0** |
| 중복·legacy key (`kpa`, `cosmetics` 등 비-canonical) | **0** |
| `status='published' AND content_kind='lecture'` | **5** |
| `visibility='public' AND status='published' AND content_kind='lecture'` | **3** |
| 서비스별 published 강의 | kpa-society 5 / k-cosmetics 0 / glycopharm 0 / neture 0 / pharmacy-hub 0 |

**KPA 강의가 KCos·GP 에 보인 이유 확정**: 데이터 오염이 아니다. K-Cosmetics ·
GlycoPharm 자체 강의는 0건이고, 목록 쿼리에 service 조건이 없어 KPA 의 public+published
강의 **3건이 그대로 노출**된 것이다. 수정 후 두 서비스의 정상 결과는 **빈 목록**이다.

> 실측 결과 `service_key IS NULL` 이 0 이므로 legacy fallback 규칙은 현재 영향 row 0건이다.

---

## 9. 잔여 리스크 (미해결, 의도적 보류)

1. **cross-service 수강 신청** — `POST /lms/courses/:courseId/enroll` 은 generic route 라
   서비스 컨텍스트가 없다. K-Cosmetics · GlycoPharm 화면에서 courseId 를 직접 아는 경우
   타 서비스 강의 수강이 여전히 가능하다. 목록·상세·레슨에서 courseId 를 얻는 경로는
   이번 수정으로 막혔으나, write path 자체의 경계는 **수강/권한 정책 재설계(§12 제외 범위)**
   가 필요해 보류한다.
2. **§7 KPA remount 결손** — quiz/assignment 라우트 부재, 레슨 guard 불일치. 기존 상태 유지.
3. **레슨 상세 · 수료증 · 진도** — 단건 경계 미적용. 상위 진입점이 막혀 실질 노출 경로는
   좁아졌으나 구조적 경계는 없다.

---

## 10. 변경 파일

**백엔드**
- `apps/api-server/src/modules/lms/utils/lms-service-scope.ts` (**신규**) — 컨텍스트 미들웨어 + scope 해석 + 단건 판정
- `apps/api-server/src/modules/lms/services/CourseService.ts` — `CourseFilters.serviceKey` + SQL 경계
- `apps/api-server/src/modules/lms/controllers/CourseController.ts` — `listCourses` scope 주입(raw 값 덮어쓰기) · `getCourse` 404
- `apps/api-server/src/modules/lms/controllers/LessonController.ts` — 레슨 목록 scope 판정
- `apps/api-server/src/routes/kpa/kpa.routes.ts` — `lmsContextMiddleware({ serviceCode: 'kpa' })` mount

**프런트 (client 추상화 계층, §8)**
- `packages/lms-client/src/index.ts` — `createLmsLearnerClient(http, { serviceKey })` 옵션. 미전달 시 종전 동작 동일
- `services/web-glycopharm/src/api/lms.ts` · `services/web-k-cosmetics/src/api/lms.ts` — canonical key 주입
- `services/web-glycopharm/src/pages/operator/LmsCoursesPage.tsx` — 직접 URL → `lmsApi.operatorGetCourses`

**테스트**
- `apps/api-server/src/__tests__/lms-public-course-service-scope.spec.ts` (**신규**, 20 케이스)

---

## 11. 검증 결과 (§10)

| 항목 | 결과 |
|---|---|
| 신규 spec (20 케이스) | **PASS** — scope 우선순위 · 단건 경계 · SQL 조건 실측 · 정적 회귀 가드 |
| 서비스별 scope / cross-service 혼입 0 | PASS (SQL 조건 실측: 타 서비스 = 정확 일치 1건, KPA = null 포함) |
| serviceKey 미전달 계약 | PASS (무경계 유지 — generic/admin 호환) |
| 잘못된 serviceKey | PASS (400 `INVALID_SERVICE_KEY`) |
| status 필터 · 검색 · 페이지네이션 보존 | PASS |
| parameter binding (interpolation 금지) | PASS |
| api-server 전체 회귀 | **132 suites / 2114 tests PASS** |
| typecheck | api-server · glycopharm · k-cosmetics · kpa-society **PASS** |
| build | `@o4o/lms-client` · `glycopharm-web` · `@o4o/web-k-cosmetics` **PASS** |

---

## 12. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 → **해당 없음**
