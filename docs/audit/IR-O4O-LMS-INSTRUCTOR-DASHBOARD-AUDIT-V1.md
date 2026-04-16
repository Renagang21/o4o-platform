# IR-O4O-LMS-INSTRUCTOR-DASHBOARD-AUDIT-V1

---

## 1. 전체 판정

```
IR-O4O-LMS-INSTRUCTOR-DASHBOARD-AUDIT-V1 — PASS
현재 LMS 데이터 구조로 강사용 MVP 대시보드를 즉시 구현 가능.
추가 마이그레이션 불필요. 레슨별 이탈 분석 1건만 PARTIAL (JSONB 성능 리스크).
```

- 분석 방법: 코드 정적 분석
- 분석 일자: 2026-04-16
- 분석 기준: `packages/education-extension/`, `packages/interactive-content-core/`, `apps/api-server/src/modules/lms/`

---

## 2. 지표별 구현 가능성

| 지표 | 판정 | 방식 | 핵심 근거 |
|------|------|------|-----------|
| 수강자 수 (상태별) | **PASS** | `COUNT + GROUP BY status` | `lms_enrollments` 인덱스 `[courseId, status]` 존재 |
| 완료율 | **PASS** | `COMPLETED count / total` | `EnrollmentStatus.COMPLETED` enum 명확히 분리됨 |
| 평균 진도율 | **PASS** | `AVG(progressPercentage)` | `progressPercentage` decimal 컬럼 저장값 사용 |
| 레슨별 이탈 구간 | **PARTIAL** | JSONB `completedLessonIds` 쿼리 | 인덱스 없는 JSONB — 대량 데이터 시 성능 리스크 |
| 퀴즈 통과율 / 평균점수 | **PASS** | `AVG(score)`, `COUNT(passed=true)` | `Quiz.courseId` 직접 저장. 인덱스 `[quizId, createdAt]` 존재 |
| Credit 지급 현황 | **PASS** | `sourceType + sourceId` 기반 집계 | `CreditSourceType.COURSE_COMPLETE` enum + `sourceId` 컬럼 존재 |
| 인증서 발행 수 | **PASS** | `COUNT(lms_certificates)` | `@Unique([userId, courseId])` — 중복 없음 보장 |

---

## 3. 구조 분석

### 현재 인덱스 현황

| 테이블 | 인덱스 | 활용 지표 |
|--------|--------|-----------|
| `lms_enrollments` | `[courseId, status]` | 수강자 수, 완료율 |
| `lms_enrollments` | `[userId, status]` | 내 수강 목록 |
| `lms_quiz_attempts` | `[quizId, createdAt]`, `[userId, quizId]` | 퀴즈 통계 |
| `lms_courses` | `[instructorId]` | 강사 본인 강의 필터 |
| `credit_transactions` | `[userId, createdAt]` | 크레딧 집계 |
| `lms_certificates` | `[userId, courseId]` UNIQUE | 인증서 집계 |

### 핵심 쿼리 패턴 (구현 예고)

**수강자 수/완료율** — 단일 쿼리, 조인 없음
```sql
SELECT status, COUNT(*) FROM lms_enrollments
WHERE courseId = ? GROUP BY status
```

**퀴즈 통계** — Quiz.courseId 직접 저장되어 있어 조인 1단계
```sql
SELECT AVG(score), COUNT(CASE WHEN passed THEN 1 END) / COUNT(*)
FROM lms_quiz_attempts
WHERE quizId IN (SELECT id FROM lms_quizzes WHERE courseId = ?)
```

**레슨별 이탈** — JSONB 조회 필요 (현재 구조 기준)
```sql
-- metadata->'completedLessonIds' @> '["{lessonId}"]'::jsonb
-- 인덱스 없음 → 전체 스캔
```

---

## 4. 성능 및 리스크

| 항목 | 리스크 | 임계점 | 대책 |
|------|--------|--------|------|
| 수강자 수 / 완료율 / 진도율 | **없음** | — | 인덱스 충분 |
| 퀴즈 통계 | **낮음** | 10,000명 이상 | 기존 인덱스로 커버 |
| 레슨별 이탈 (JSONB) | **중간** | 수강자 500명 초과 시 저하 | 캐싱 또는 정규화 |
| 강사 동시 대시보드 접속 | **중간** | 100명 이상 동시 | 결과 캐싱(1h TTL) |

**추가 인덱스 필요 항목**

- `lms_enrollments(courseId, progressPercentage)` — 평균 진도율 대량 쿼리 시
- `credit_transactions(source_type, source_id)` — Credit 집계 쿼리 최적화용

현재 수강자 규모에서는 즉시 문제 없음. 수강자 1,000명 이상 강좌 운영 시 인덱스 추가 권장.

---

## 5. 추가 구조 필요 여부

| 항목 | 필요 여부 | 이유 |
|------|-----------|------|
| 마이그레이션 (신규 컬럼) | **불필요** | 모든 필수 컬럼 이미 존재 |
| 신규 Entity | **불필요** | MVP 기준 |
| 레슨별 이탈 정규화 테이블 | **선택** | 수강자 500명 이상 강좌 등장 시 도입 |
| Redis 캐싱 | **선택** | 동시 접속 증가 시 도입 |

---

## 6. MVP 대시보드 구성 제안

### 지표 구성 (5개 — 즉시 구현 가능)

| 카드 | 지표 | 데이터 소스 | 응답시간 |
|------|------|-------------|----------|
| 수강 현황 | IN_PROGRESS / COMPLETED / CANCELLED 별 수 | `lms_enrollments` | < 100ms |
| 완료율 | `COMPLETED / 전체 × 100` | `lms_enrollments` | < 100ms |
| 평균 진도율 | `AVG(progressPercentage)` | `lms_enrollments` | < 100ms |
| 퀴즈 성과 | 통과율 + 평균점수 | `lms_quiz_attempts` | < 200ms |
| 인증서 발행 수 | `COUNT(lms_certificates WHERE courseId = ?)` | `lms_certificates` | < 50ms |

### 권장 API 구조

```
GET /api/v1/lms/instructor/dashboard/stats/:courseId
  → { enrollments, completionRate, avgProgress, quizStats, certificateCount }

GET /api/v1/lms/instructor/dashboard/courses
  → 모든 강의 단축 통계 목록
```

두 엔드포인트 모두 기존 `InstructorController.ts` 확장으로 구현 가능.

---

## 7. 결론

| 항목 | 판정 |
|------|------|
| 현재 구조로 MVP 즉시 구현 가능 | ✅ |
| 추가 마이그레이션 필요 | ❌ 불필요 |
| 별도 집계 구조 필요 | ❌ MVP 기준 불필요 (레슨별 이탈만 선택 사항) |
| 다음 단계 WO | ✅ **WO-O4O-LMS-INSTRUCTOR-DASHBOARD-MVP-V1** 권장 |

MVP 기준 구현 예상 공수: **백엔드 1일 (API 2개) + 프론트엔드 1~2일**.

---

*Status: PASS — WO-O4O-LMS-INSTRUCTOR-DASHBOARD-MVP-V1 진행 가능*
*Date: 2026-04-16*
