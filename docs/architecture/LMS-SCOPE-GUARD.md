# LMS Scope Guard 설계 문서

> **상위 문서**: `CLAUDE.md`
> **관련**: `docs/architecture/O4O-COMMONIZATION-STANDARD.md`, `docs/platform/lms/`, `docs/architecture/O4O-BOUNDARY-POLICY-V1.md`
> **버전**: V1
> **작성일**: 2026-05-02
> **상태**: Active
> **WO**: WO-O4O-LMS-SCOPE-GUARD-DOC-V1
>
> 이 문서는 `kpaLmsScopeGuard` 가 "왜 전체 `/api/v1/lms` 에 마운트되어 있지만 실제 영향은 좁은지" 를 한 곳에 정리한다. 향후 동일한 의문/재조사를 막기 위한 정전 문서이다.

---

## 1. 개요

- LMS 백엔드(`apps/api-server/src/modules/lms`)는 **모든 서비스가 공유하는 단일 모듈**이다.
- `kpaLmsScopeGuard` 는 `/api/v1/lms` **전체에 마운트**되어 있다.
- 하지만 가드의 **실제 검증 범위는 매우 좁다** — KPA 조직 코스의 쓰기 작업만 제한한다.
- 다른 서비스(GlycoPharm / K-Cosmetics / Neture)의 LMS 호출은 자연스럽게 통과한다.

---

## 2. 라우트 마운트 구조

[apps/api-server/src/bootstrap/register-routes.ts:137-138](../../apps/api-server/src/bootstrap/register-routes.ts#L137-L138)

```ts
app.use('/api/v1/lms', kpaLmsScopeGuard);
app.use('/api/v1/lms', lmsRoutes);
```

모든 LMS 요청이 가드를 거치지만, 가드 내부에서 **path/method 기반 빠른 우회**를 수행하여 대부분의 요청은 즉시 `next()` 로 넘어간다.

---

## 3. 실제 동작 요약

[apps/api-server/src/middleware/kpa-lms-scope-guard.ts:74-143](../../apps/api-server/src/middleware/kpa-lms-scope-guard.ts#L74-L143)

| 요청 유형 | 결과 | 근거 |
|---|---|---|
| GET 요청 (모든 path) | 통과 | line 76 — `if (req.method === 'GET') return next();` |
| `/courses*` 외 path 의 POST/PATCH/DELETE | 통과 | line 79 — `COURSE_WRITE_RE` 미매칭 시 `next()` |
| `kpa:admin` 보유 사용자 | 통과 | line 87 |
| `organizationId` 비어있음 / UUID 아님 | 통과 | line 113 |
| KPA 조직이 아닌 사용자 | 통과 | line 117 — `kpa_members` 테이블에 미등록 시 `next()` |
| **KPA 조직 + `/courses*` 쓰기 + 자격 미승인** | **차단 (403)** | line 121-134 — `KPA_QUALIFICATION_REQUIRED` |
| 가드 내부 에러 | 통과 (fail-open) | line 137-141 |

### 3.1 `COURSE_WRITE_RE` 패턴

```ts
// line 72
const COURSE_WRITE_RE = /^\/courses(\/[0-9a-f-]+)?(\/(?:publish|unpublish|archive))?$/i;
```

매칭 path:
- `/courses`
- `/courses/:uuid`
- `/courses/:uuid/publish`
- `/courses/:uuid/unpublish`
- `/courses/:uuid/archive`

**미매칭 path (가드 우회)**: `/quizzes`, `/assignments`, `/lessons/:id/live`, `/lessons`, `/instructor/*` 등 강사 영역 대부분.

---

## 4. 제한되는 유일한 케이스

| 항목 | 값 |
|---|---|
| HTTP Method | `POST` / `PATCH` / `DELETE` |
| Path | `/api/v1/lms/courses` 또는 `/api/v1/lms/courses/:id[/publish\|unpublish\|archive]` |
| 추가 조건 | 대상 코스의 `organizationId` 가 **KPA 조직**(`kpa_members.organization_id` 에 존재)일 것 |
| 사용자 요구 | `kpa_approval_requests`(entity_type=`instructor_qualification`, status=`approved`) 또는 `kpa_instructor_qualifications`(status=`approved`) 중 하나 보유 |
| 차단 응답 | `403 { code: 'KPA_QUALIFICATION_REQUIRED' }` |

→ 이 모든 조건이 **동시에** 만족될 때만 차단된다.

---

## 5. 설계 의도

### 보호하려는 것
- **KPA 조직은 약사 보수교육 시스템의 모체** — 무자격자가 KPA 조직 명의로 강의를 생성/수정/공개하는 것을 차단해야 한다.
- 코스 단위가 보수교육 인증의 단위이므로, 코스의 쓰기 경로(`/courses*`)만 막는 것으로 충분하다.

### 의도적으로 풀어둔 것
- **GET 전부 통과** — 강의 목록/상세 조회는 누구나 가능 (인증·권한은 하위 라우트에서 별도 처리).
- **다른 강사 자원(quiz/assignment/live)** — 이미 코스 ownership을 통해 간접 보호되므로 가드 검증 불필요. 각 컨트롤러에서 처리.
- **KPA 조직이 아닌 모든 호출** — 다른 서비스(Glyco/K-Cos/...)의 LMS 사용을 방해하지 않음. 공통 LMS 구조 유지.

---

## 6. 서비스별 영향

| 서비스 | 영향 | 비고 |
|---|---|---|
| **KPA-Society** | 코스 쓰기 시 `lms_creator` 자격 필요 | 정상 설계 동작 |
| **GlycoPharm** | 영향 없음 (현재 강사는 GET 1개만 호출) | 향후 코스 쓰기 도입 시 §7 참조 |
| **K-Cosmetics** | 영향 없음 (학습자 GET만 사용) | — |
| **Neture** | 영향 없음 (LMS 미사용) | — |

---

## 7. 향후 개발자 주의사항

### 7.1 GlycoPharm / 신규 서비스 강사 도입 시

- 가드는 **`serviceKey` 기반이 아니라 `organizationId` → `kpa_members` 매핑 기반**이다.
- 다른 서비스 사용자의 `organizationId` 는 `kpa_members` 에 매핑되지 않으므로 자연 통과한다.
- **테스트 계정 검증 포인트**: 새 서비스의 테스트 organization 이 실수로 `kpa_members` 에 들어가 있지 않은지 확인. 들어가 있으면 KPA 자격을 요구받게 된다.
- 운영 검증 명령어 예시:

  ```bash
  # 해당 organization 이 KPA 매핑인지 확인
  gcloud sql connect o4o-platform-db --user=postgres --database=o4o_platform \
    -c "SELECT 1 FROM kpa_members WHERE organization_id = '<ORG_UUID>'"

  # Cloud Run 가드 로그 추적
  gcloud logging read 'resource.type=cloud_run_revision
    AND resource.labels.service_name=o4o-core-api
    AND textPayload:"kpaLmsScopeGuard"' \
    --project=netureyoutube --limit=50 --freshness=1h
  ```

### 7.2 가드 자체를 변경하려는 경우 — 금지 사항

- ❌ **단순한 전체 가드 제거 금지** — KPA 조직 보호 회귀.
- ❌ **프론트 변경만으로 해결 시도 금지** — 가드는 백엔드 권한 보호이다. UI에서 우회 불가.
- ❌ **`service-neutral` 가드로 즉흥 변경 금지** — 변경하려면 KPA 자격 시스템(`kpa_approval_requests`, `kpa_instructor_qualifications`)을 어떻게 다른 서비스에 일반화할지 **전체 설계가 선행**되어야 한다. 이는 별도 WO(`WO-O4O-LMS-SCOPE-GUARD-SERVICE-NEUTRAL-V*`)와 보안 리뷰가 필요한 작업이다.
- ✅ **허용**: 로그/관측 추가, 테이블 조회 최적화, 에러 처리 개선.

---

## 8. 결론

> **kpaLmsScopeGuard 는 전체 LMS 를 막는 것이 아니라 KPA 조직의 코스 생성·수정·발행·아카이브만 제한하는 보호 장치이다.**

GlycoPharm / K-Cosmetics / Neture 의 LMS 호출은 가드와 무관하게 정상 통과한다. 공통 LMS 백엔드와 호환되도록 의도적으로 좁게 설계되어 있다.

---

## 9. 참고 자료

- 마운트: [apps/api-server/src/bootstrap/register-routes.ts:137-138](../../apps/api-server/src/bootstrap/register-routes.ts#L137-L138)
- 가드 본체: [apps/api-server/src/middleware/kpa-lms-scope-guard.ts](../../apps/api-server/src/middleware/kpa-lms-scope-guard.ts)
- 자격 테이블: `kpa_approval_requests` (unified), `kpa_instructor_qualifications` (legacy fallback)
- 조직 매핑: `kpa_members.organization_id`
- 원작 WO: WO-KPA-B-LMS-GUARD-BYPASS-AUDIT-AND-IMPLEMENTATION-V1
- 자격 디커플링: WO-KPA-AFFILIATION-TEXT-DECOUPLING-PHASE2-V1
