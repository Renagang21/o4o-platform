# IR-O4O-LECTURE-INDEPENDENT-SERVICE-PRODUCTION-DATA-CENSUS-V1

> **종류**: 조사 전용 IR (코드 변경 0 · DB write 0 · migration 0 · schema 0 · role 0 · membership 0 · 배포 0)
> **실행일**: 2026-09-18 (UTC 01:27) · **대상**: production `o4o_platform` (Cloud SQL Auth Proxy · `default_transaction_read_only=on`)
> **기준 HEAD**: `09d322654` (= `origin/main` · 작업트리 clean)
> **목적**: 독립 강의 서비스 분리 WO 작성 전, 운영 LMS 실데이터를 read-only 로 최종 확정한다.
> **개인정보**: email · name · phone · 면허번호 · 사용자 UUID · 조직명/UUID · 인증서 번호/URL 전문 기록 0. count · distinct count · 상태 분포만 기록. DB host · password 기록 0.
> **판정 요약**: `PRODUCTION_LMS_CENSUS = PASS` · `SAFE_TO_DRAFT_LECTURE_SEPARATION_WO = YES` (조건부 — §16 참조)

---

## 0. 가장 중요한 발견 — 과거 census 와의 차이 원인

2026-09-14 census(`IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1` §row count) 와 오늘 값이 다르다. 원인은 **오늘 커밋된 WO-2C 계정 영역 reset** ([`CHECK-O4O-LEGACY-TEST-USER-ACCOUNT-DOMAIN-RESET-V1`](../checks/CHECK-O4O-LEGACY-TEST-USER-ACCOUNT-DOMAIN-RESET-V1.md) · `09d322654`) 이다. 그 CHECK §4-3 에 `lms_enrollments 8 · lms_progress 6 · lms_certificates 1` DELETE 가 명시되어 있고, 강의 11건은 cleanup user 로 REASSIGN(보존) 되었다.

| 테이블 | 2026-09-14 | 2026-09-18 (오늘) | 차이 원인 |
|---|---:|---:|---|
| lms_courses | 11 (published 6) | **11** (published 5 · pending_review 1 · archived 5) | 행 수 동일. published 6→5 는 status 분류 차이(9/14 는 `isPublished=true` 기준 6 = published 5 + pending_review 1) |
| lms_lessons | 10 | **10** | 동일 |
| lms_enrollments | 11 | **3** | WO-2C DELETE 8 |
| lms_progress | 6 | **0** | WO-2C DELETE 6 (enrollment CASCADE) |
| lms_certificates | 1 | **0** | WO-2C DELETE 1 |
| lms_events / attendance / content_bundles | 0 | **0** | 동일 |

따라서 이전 대화에서 "수료증 1건 존재" 로 본 것은 9/14 시점에는 맞았으나 **오늘 기준 0건** 이다. 현재값을 정본으로 한다.

---

## A. 안전성

| 항목 | 값 |
|---|---|
| `SHOW transaction_read_only` | `on` (세션 시작 즉시 확인) |
| write 차단 실증 | `CREATE TEMP TABLE` → `ERROR: cannot execute CREATE TABLE in a read-only transaction` (실데이터 무영향) |
| DB | `o4o_platform` · `current_user = o4o_api` · `now() = 2026-09-18 01:27 UTC` |
| 기준 HEAD | `09d322654` = `origin/main` |
| DB write / schema change / migration / role / membership / 배포 | **0** |
| 실행 SQL | 전부 `SELECT` (`\echo` 제외) · 스크래치패드 보관, 저장소 미포함 |

## §3 테이블 존재 · 전체 규모

`to_regclass` 14/14 존재. `kpa_instructor_qualifications` 는 **존재하지 않음**(legacy 테이블 없음).

| 테이블 | count |
|---|---:|
| lms_courses | 11 |
| lms_lessons | 10 |
| lms_enrollments | 3 |
| lms_progress | 0 |
| lms_certificates | 0 |
| lms_quizzes | 6 |
| lms_quiz_attempts | 0 |
| lms_assignments | 1 |
| lms_submissions | 0 |
| course_completions | 0 |
| lms_instructor_applications | 0 |
| lms_events · lms_attendance · lms_content_bundles | 0 · 0 · 0 |

## B. Course (§4 · §12 · §13 · §14)

| serviceKey | contentKind | total | published | pending_review | archived | draft/rejected | rewardPolicy | paid | orgScoped | no_instructor | requiresApproval |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kpa-society | lecture | 8 | 5 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 1 |
| pharmacy-hub | lecture | 3 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| k-cosmetics | — | 0 | | | | | | | | | |
| `<NULL>` | — | **0** | | | | | | | | | |

4차원 분포(service_key × content_kind × status × visibility):

| serviceKey | status | visibility | count |
|---|---|---|---:|
| kpa-society | published | public | 3 |
| kpa-society | published | members | 2 |
| kpa-society | pending_review | members | 1 |
| kpa-society | archived | members | 2 |
| pharmacy-hub | archived | public | 1 |
| pharmacy-hub | archived | members | 2 |

보조 분포: visibility `members 7 · public 4` · reusable_policy `restricted 9 · platform 2` · `isPublished` = (published 5 → t · pending_review 1 → t · archived 5 → f). 생성일 kpa-society 2026-05-19~08-26 · pharmacy-hub 2026-08-21~08-26 · 마지막 갱신 2026-08-26(양쪽).

**중요 판정**
- `content_kind` 는 **전 11건 `lecture`** · `content_resource` = **0** → `CONTENT_RESOURCE_ROWS_PRESENT = NO` (STOP_FOR_CONTENT_KIND_DECISION 해당 없음).
- `service_key IS NULL` = **0** · 비표준 key 0 (kpa-society 8 · pharmacy-hub 3 만 존재 · k-cosmetics 0).
- `organizationId IS NOT NULL` = **0** (`isOrganizationExclusive` 0 · enrollment organizationId 0).
- `isPaid = true` = **0**.

## C. 하위 데이터 (§5)

| serviceKey/contentKind | lessons | enrollments | progress | completions | certificates | quizzes | attempts | assignments | submissions |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| kpa-society / lecture | 6 | 3 (approved 1 · in_progress 2) | 0 | 0 | 0 | 5 | 0 | 0 | 0 |
| pharmacy-hub / lecture | 4 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| 합계 | 10 | 3 | 0 | 0 | 0 | 6 | 0 | 1 | 0 |

- lesson type 분포: article 6 · quiz 2 · assignment 1 · video 1.
- quiz 귀속: `courseId`/`lessonId` 둘 다 NULL 0 · `bundleId` 0 → 6건 전부 course 로 귀속 가능.
- 부수 관찰(범위 외 · 수정 안 함): `lms_courses.currentEnrollments` 카운터 ≠ 실제 enrollment 수 인 course **7/11** (WO-2C 의 enrollment DELETE 후 카운터 미보정). 분리 migration 시 재계산 대상.

## G. 수료증 (§6)

| 항목 | 값 |
|---|---|
| certificate count | **0** |
| valid count | 0 |
| verificationUrl / certificateUrl host 분포 | 해당 없음 (row 0) |
| `CERTIFICATE_COMPATIBILITY_REQUIRED` | **NO** — 단, 9/14 시점 1건이 존재했고 WO-2C 로 삭제된 것이므로, **URL 체계는 코드에 남아 있다**. 신규 독립 서비스에서 발급 URL host 를 정하는 설계는 여전히 필요하나 *기존 URL redirect* 는 불필요 |

## D. 사용자 / 권한 (§7 · §8)

| 항목 | 값 |
|---|---:|
| distinct LMS users (instructor ∪ enrollment ∪ completion ∪ certificate ∪ attempt ∪ submission) | **1** |
| distinct course instructors | 1 |
| enrollment users | 1 |
| completion / certificate / attempt / submission users | 0 / 0 / 0 / 0 |
| LMS user 가 `users` 에 없음 | 0 |
| LMS user 가 membership 없음 | 0 |
| `role_assignments WHERE role='lms:instructor'` | **0** (`lms%` prefix 전체 0) |
| active lms:instructor | 0 |
| course-owner-without-role | **1** |
| role-without-course | 0 |

- 유일한 LMS 사용자 = WO-2C 의 cleanup user (`platform:super_admin` · 5 서비스 membership active: kpa-society · kpa-branch · k-cosmetics · neture · pharmacy-hub). 강의 11건 전부 · enrollment 3건 전부가 이 사용자 소유(`all_owned_by_sole_user = true`).
- 운영 `users` 총 1 · `role_assignments` 총 11(전부 active · admin/operator/store_owner/super_admin 계열) · `service_memberships` 총 5.
- **`lms:instructor` 실 모집단 = 0.** 9/14 census 의 73 role_assignments 는 WO-2C 로 정리됨. 독립 강의 서비스로 이관할 강사 role 보유자가 현재 없다.

## E. 강사 승인 데이터 (§9)

| 구조 | count |
|---|---:|
| lms_instructor_applications | 0 |
| qualification_requests (service_key × type × status) | 0 (lms_creator / instructor 모두 0) |
| member_qualifications | 0 |
| kpa_approval_requests (entity_type ILIKE instructor/lms) | 0 (테이블 전체 0) |
| kpa_instructor_qualifications (legacy) | 테이블 없음 |

→ 독립 서비스가 migration/reference 해야 할 승인 이력 **없음**.

## F. 포인트 (§10)

| 항목 | 값 |
|---|---|
| course/lesson/quiz `metadata ? 'rewardPolicy'` | 0 / 0 / 0 |
| credit_transactions sourceType ∈ (lesson_complete, quiz_pass, course_complete) | **0** |
| credit_transactions 전체 | `admin_grant` 2건 (earn · 합 150) |
| service_point_budgets | kpa-society allocated 10,000 · used 680 · remaining 9,320 (다른 서비스 row 없음) |
| `REWARD_POLICY_MIGRATION_DECISION_REQUIRED` | **NO** |

- 부수 관찰(범위 외): `used_amount 680` vs 현존 transaction 합 150 — WO-2C 에서 개인 credit 이력이 삭제되어 원장과 예산 카운터가 어긋난 상태. LMS 분리와 무관하나 포인트 원장 정합은 별도 확인 대상.

## H. 데이터 무결성 (§11)

17개 참조 경로 전부 **0**:
lesson→course · enrollment→course · progress→enrollment · progress→lesson · certificate→course · completion→course · completion→enrollment · quiz→course(nonnull) · quiz→lesson(nonnull) · quiz_attempt→quiz · assignment→lesson · submission→assignment · submission→lesson · enrollment.certificateId→certificate · course.instructorId→users · enrollment.userId→users · certificate.userId→users.

`ORPHAN_ROWS = 0` → STOP_FOR_DATA_INTEGRITY_REPAIR 해당 없음.

---

## §16 최종 판정

```text
PRODUCTION_LMS_CENSUS = PASS

LECTURE_ROWS_IDENTIFIED = YES            (11 · kpa-society 8 + pharmacy-hub 3 · k-cosmetics 0)
CONTENT_RESOURCE_ROWS_PRESENT = NO       (0)
NULL_SERVICE_KEY_ROWS = 0
ORPHAN_ROWS = 0

CERTIFICATE_COMPATIBILITY_REQUIRED = NO  (현존 0 · 9/14 의 1건은 WO-2C 로 삭제)
REWARD_POLICY_MIGRATION_DECISION_REQUIRED = NO
PAID_COURSE_DECISION_REQUIRED = NO
ORGANIZATION_SCOPE_DECISION_REQUIRED = NO

LMS_INSTRUCTOR_MIGRATION_POPULATION_IDENTIFIED = YES  (모집단 = 0명 · 강의 소유자 1명은 role 없이 super_admin 으로 소유)

SAFE_TO_DRAFT_LECTURE_SEPARATION_WO = YES
```

### WO 작성 시 반영해야 할 실데이터 조건

1. **migration 대상 = `lms_courses` 11건 전부 (`content_kind='lecture'`)** + lessons 10 · enrollments 3 · quizzes 6 · assignments 1. progress/certificate/completion/attempt/submission 은 0 이라 데이터 이관 코드가 필요 없으나 **테이블·경로 자체는 이관 대상**이다.
2. 강의 11건 · enrollment 3건의 소유자는 cleanup user 1명 뿐이다. 신규 serviceKey 로 옮길 때 `service_membership` 신설 대상 사용자 = 1명(임시 보관자). 실 강사·수강생 모집단이 없으므로 **"기존 사용자 role/membership 이관" 단계는 사실상 no-op** 이며, WO 는 이를 전제로 설계하되 **향후 사용자 유입 이후 실행될 경우를 대비해 멱등 절차로 작성**해야 한다.
3. `lms:instructor` role_assignments = 0 → 독립 서비스의 강사 role 을 새로 정의할 때 하위 호환 마이그레이션이 불필요하다. 다만 코드 상 `lms:instructor` 소비처(3 서비스 공통 · `kpaLmsScopeGuard`) 는 별도 코드 census 가 필요하다(이번 IR 범위 밖).
4. `currentEnrollments` 카운터 불일치 7건 — 이관 시 재계산(또는 이관 후 검증 항목)으로 포함.
5. 수료증 URL: 기존 redirect 불필요. 신규 발급 host 결정만 WO 에 포함.
6. K-Cosmetics 는 LMS 데이터 0 — Core 소비 코드 경로만 분리 대상.

### 조사 중 발견한 범위 외 항목 (수정하지 않음 · 보고만)

- `lms_courses.currentEnrollments` ≠ 실 enrollment (7/11).
- `service_point_budgets.used_amount(680)` ≠ 현존 `credit_transactions` 합(150) — WO-2C 개인 이력 삭제의 후속 정합 문제.

### 하지 않은 것 (§17 준수)

신규 serviceKey/role 생성 0 · `lms:instructor` 변경 0 · `course.service_key` UPDATE 0 · membership 변경 0 · certificate/point/budget 변경 0 · route 제거 0 · WO 구현 0.

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 (기준 문서 drift 해당 없음)*
