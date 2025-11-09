# Phase B — API & RBAC 최종 실행 지시서 (코드 미포함)

## 0) 사전 동기화(필수)

* 브랜치 최신화 및 CI 확인 → `schema_tag_user_refactor_v2_p0`와 환경 일치 검증.
* 테스트 데이터: PENDING `role_enrollments` 3건 유지.
* **연계 파일 실재 확인**: `connection.ts`/`data-source.ts`는 **없음**(URL 제공대로). Phase A에서 등록한 엔티티들이 `src/main.ts`의 DataSource 초기화 경로에 확실히 포함되는지 **반드시 재확인**(엔티티 미등록 시 런타임 500 위험).

---

## 1) 근거 파일(고정 참조)

* Routes
  * `routes/auth.ts`
  * `routes/unified-auth.routes.ts`
  * `routes/auth-v2.ts`
  * `routes/social-auth.ts`
* Middleware
  * `middleware/auth.middleware.ts`
  * `middleware/securityMiddleware.ts`
  * `middleware/rateLimit.middleware.ts`
* Bootstrap
  * `src/main.ts`
* Types / Entities
  * `types/auth.ts`, `types/user.ts`
  * `entities/User.ts`, `Role.ts`, `AuditLog.ts`, `ApprovalLog.ts`
  * `entities/RoleEnrollment.ts`, `RoleAssignment.ts`
  * `entities/SupplierProfile.ts`, `SellerProfile.ts`, `PartnerProfile.ts`, `KycDocument.ts`

---

## 2) 구현 범위 요약(이번 Phase B)

* **RBAC 미들웨어(MVP)**: `RoleAssignment(active=true)` 기반 서버 판정.
* **Enrollment API(사용자)**: 신청 생성/내 신청 조회.
* **Admin Review API(운영자)**: 목록(필터)/승인·반려·보류(전이 + 로그).
* **/me 확장**: `assignments[]`(role, active, activated_at …) 포함.
* **보안·레이트리밋**: 로그인·신청 생성·전이 패치에 최소 한도 적용.

---

## 3) 상세 작업 지시

### B-1. RBAC 미들웨어(서버 중심)

**목표**: 라우트별 접근을 **서버에서 일관 판정**(프론트 가드는 UX 보조).

1. **판정 규칙**
   * 인증 식별(쿠키 기반 세션/JWT) → 사용자 ID 확보.
   * DB에서 `(user_id, role, active=true)`가 존재하면 해당 역할 권한 부여.
   * 운영자/관리자 권한은 `User`·`Role`·(또는 기존 상수)로 확인.
   * 미인증: **401** / 무권한: **403** 고정.

2. **바인딩 매트릭스(예시)**
   * `/admin/**` → **operator|administrator** 전용.
   * `POST /enrollments`, `GET /enrollments/my` → **로그인 사용자**.
   * (후속 Phase C 대비) `/dashboard/supplier|seller|partner` 관련 API → 해당 역할 **active=true** 필수.

3. **에러/로그**
   * 403 발생 시 구조화 로그: `{userId, path, wantedRole, hasActiveAssignment, ts}`
   * 필요 시 단기 캐시(수 초) 허용.

> 적용 위치: `middleware/auth.middleware.ts`에 **requireRole(role)**, **requireAdmin()**, **requireAuth()** 등 **구체 가드 함수**를 확정해 라우트에 바인딩.

---

### B-2. Enrollment API(사용자)

**엔드포인트(텍스트 계약)**

1. `POST /enrollments`
   * Body: `{ role: 'supplier'|'seller'|'partner', fields: {...}, agree?: {...} }`
   * 응답: `201 { id, user_id, role, status: "pending", submitted_at, ... }`
   * 검증:
     * 동일 `(user, role)`에 **pending/on_hold**가 이미 있으면 **409**
     * 필수 필드 누락 → **422**
   * 보안: **requireAuth()**, 레이트리밋(예: 분당 3회).

2. `GET /enrollments/my`
   * 응답: `200 { enrollments: [ {id, role, status, submitted_at, decided_at? ...}, ... ] }`
   * 보안: **requireAuth()**.

3. 상태 머신(요지)
   * `pending` → `approved` | `rejected` | `on_hold`
   * `on_hold` ↔ `pending` (보완 제출 시) — 구체 정책은 문서로만 명시, 구현은 P0 범위에서 최소.

4. 감사 기록
   * 생성 시 `AuditLog`에 action=`enrollment.create`, payload 스냅샷 저장.

---

### B-3. Admin Review API(운영자)

**엔드포인트(텍스트 계약)**

1. `GET /admin/enrollments?role=&status=&q=&date_from=&date_to=`
   * 응답: `200 { items: [...], pagination: {...} }`
   * 보안: **requireAdmin()**
   * 필터: role(단일/다중), status, 기간, q(이메일/이름).

2. `PATCH /admin/enrollments/:id/approve`
   * Body: `{ reason?: string }` (선택)
   * 처리:
     * 트랜잭션으로 `RoleEnrollment.status='approved'`, `decided_*` 필드 세팅
     * `RoleAssignment(user,role,active=true)` **upsert**(중복 생성 금지)
     * `ApprovalLog` + `AuditLog` 기록(행위자/사유/시각)
   * 응답: `200 { ok: true, enrollment: {...}, assignment: {...} }`
   * 보안: **requireAdmin()**
   * 레이트리밋: 경미(운영자 보호 차원).

3. `PATCH /admin/enrollments/:id/reject`
   * Body: `{ reason: string }` (필수)
   * 처리: 상태 전이 + 로그, 재신청 가능 정책은 문서로 고지.
   * 응답: `200 { ok: true }` / 보안: **requireAdmin()**

4. `PATCH /admin/enrollments/:id/hold`
   * Body: `{ reason: string, required_fields?: string[] }`
   * 처리: 상태 전이 + 로그
   * 응답: `200 { ok: true }` / 보안: **requireAdmin()**

5. **중복/재시도 안전성**
   * 같은 전이 반복 요청 시 **멱등성** 보장:
     * 이미 approved면 200 + 현재 상태 반환(또는 409 정책 중 택1, 일관 유지).
     * 전이는 항상 트랜잭션으로 처리.

---

### B-4. `/me` 응답 확장

* 응답 예시(요지):
  ```json
  {
    "user": { "id": "...", "email": "...", "status": "active" },
    "assignments": [
      { "role": "supplier", "active": true,  "activated_at": "..." },
      { "role": "seller",   "active": false, "activated_at": null, "deactivated_at": "..." }
    ]
  }
  ```
* 레거시 `role/roles/activeRole`는 **응답에서 제외**(또는 `deprecated: true` 주석 문서만).
* 보안: httpOnly 쿠키 기반 인증 전제(`/auth.ts`·`unified-auth.routes.ts`·`auth-v2.ts`의 쿠키 발급·회수 정책과 정합).

---

### B-5. 보안/품질 공통

* **httpOnly 쿠키** + CORS `credentials:true` + SameSite 정책(`main.ts` 기준) 재점검.
* 레이트리밋 바인딩:
  * `/auth/login`, `POST /enrollments`, `PATCH /admin/enrollments/:id/*`
* 입력 검증(422), 인증(401)/권한(403)/중복(409)/없음(404) **에러 포맷 표준화**: `{ code, message, details? }`.
* 모든 전이는 **ApprovalLog + AuditLog** 두 축으로 기록.
* 로그 민감정보 마스킹.

---

## 4) 라우트 보호 매트릭스(요약표)

| Route                                  | Auth | Role Check     | Notes                  |
| -------------------------------------- | ---- | -------------- | ---------------------- |
| `POST /auth/login`                     | -    | -              | 레이트리밋                  |
| `GET /me`                              | ✅    | -              | assignments[] 포함       |
| `POST /enrollments`                    | ✅    | -              | 분당 3회 등 제한             |
| `GET /enrollments/my`                  | ✅    | -              |                        |
| `GET /admin/enrollments`               | ✅    | admin/operator | 필터 support             |
| `PATCH /admin/enrollments/:id/approve` | ✅    | admin/operator | 트랜잭션·로그                |
| `PATCH /admin/enrollments/:id/reject`  | ✅    | admin/operator | reason 필수              |
| `PATCH /admin/enrollments/:id/hold`    | ✅    | admin/operator | 필요시 required_fields 포함 |

(Phase C에서 `/dashboard/{role}` 관련 API 라우트가 추가되면 동일 원칙으로 보호)

---

## 5) 테스트 시나리오(DoD 체크리스트)

### 기능
* [ ] **POST /enrollments**(supplier) → 201, `pending` / 중복 시 409
* [ ] **GET /enrollments/my**에 방금 신청 건 노출
* [ ] **GET /admin/enrollments?role=supplier&status=pending**에서 조회
* [ ] **PATCH approve** → `RoleAssignment(active=true)` 생성·업데이트 확인
* [ ] **/me**에 해당 역할이 `assignments[]`로 반영
* [ ] **PATCH reject/hold**도 정상 전이 및 로그 기록

### 보안/정합
* [ ] 미인증 요청 401 / 무권한 403 일관 동작
* [ ] 전이 멱등성: approve 반복 호출 시 정책대로(200 재응답 또는 409)
* [ ] AuditLog/ApprovalLog에 모든 이벤트 기록(행위자/사유/시각)

### 회귀
* [ ] 응답에서 레거시 `role/roles/activeRole` 노출 없음
* [ ] 로그인/쿠키/CORS 정상 왕복, 콘솔 접근 불가(httpOnly)

---

## 6) 산출물(로컬 에이전트 제출 형식)

* **변경 요약 1p**(라우트 추가/미들웨어 바인딩/에러 맵)
* **엔드투엔드 테스트 결과표**(상기 DoD 항목 Pass/Fail)
* **로그 샘플**(전이 시 Audit/Approval 로그 예시)
* **운영 Runbook(요약)**: 전이 실패/중복/403 다발 시 조치 절차
* **롤백 방안**: 라우트 비활성/배포 리버트(데이터 전이 발생 시 되돌림 정책 명시)

---

## 7) 주의·결정 포인트

* **DataSource/엔티티 등록 누락 금지**: `main.ts` 기준으로 신규 6개 엔티티가 반드시 로딩되는지 확인.
* **상태 전이 트랜잭션 경계 명확화**: Enrollment→Assignment→Logs 원자성 보장.
* **레이트리밋 값**은 운영자 UX 해치지 않도록 완만하게 시작(필요 시 상향).
* **응답 필드 최소화**: P0에서는 필요한 필드만, P1에서 확장.

---

## 8) 권장 진행 순서(실행)

1. **RBAC 미들웨어** 함수 확정 및 라우트 바인딩(관리/사용자)
2. **Enrollment API** 구현(POST/GET) → DoD 부분 테스트
3. **Admin Review API**(목록/전이) → 트랜잭션/로그 검증
4. **/me** 응답 확장 → FE 연동을 위한 계약 고정
5. **레이트리밋/보안 재점검** → 문서 업데이트 → 커밋/PR

---

**작성일**: 2025-01-08
**Phase**: B - API & RBAC
**브랜치**: feat/user-refactor-p0-zerodata
**전제 조건**: Phase A 완료 (마이그레이션 적용 완료)
