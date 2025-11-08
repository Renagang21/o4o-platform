# Phase B 기능 검증 체크리스트

> 생성일: 2025-11-09
> 배포 버전: `c52566f9` (Phase B - API & RBAC)
> 서버: api.neture.co.kr (43.202.242.215:4000)

---

## 스모크 테스트 (완료 ✅)

| 항목 | 엔드포인트 | 예상 | 결과 | 상태 |
|------|-----------|------|------|------|
| 헬스체크 | `/health` | 200 OK | 200 OK | ✅ |
| 인증 베이스라인 | `/api/v1/auth/cookie/me` (비인증) | 401 | 401 TOKEN_REQUIRED | ✅ |
| 신청 API | `/api/v1/enrollments` (비인증) | 401 | 401 AUTH_REQUIRED | ✅ |
| Nginx 프록시 | HTTPS 경로 | 401 | 401 TOKEN_REQUIRED | ✅ |

---

## 1) 사용자 플로우

### 1-1. 로그인 → 세션 확인

- [ ] 로그인 성공 (200 OK, 쿠키 설정)
- [ ] `/me` 호출 → `assignments[]` 포함 (빈 배열 또는 기존 역할)
- [ ] 응답 구조: `{ success: true, user: {...}, assignments: [...] }`

**명령**:
```bash
# 로그인
curl -i -X POST https://api.neture.co.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c user.cookies \
  -d '{"email":"user@test.com","password":"<PW>"}'

# /me 확인
curl -i -X GET https://api.neture.co.kr/api/v1/auth/cookie/me \
  -b user.cookies
```

**결과**:
- HTTP Status:
- assignments 구조:

---

### 1-2. 역할 신청 생성 → 중복 방지 확인

- [ ] 신청 생성 성공 (201 Created)
- [ ] `/enrollments/my` → 방금 신청 건 표시 (status: "pending")
- [ ] 동일 역할 재신청 → 409 Conflict
- [ ] 레이트리밋 확인 (3회/분 초과 시 429)

**명령**:
```bash
# 신청 생성
curl -i -X POST https://api.neture.co.kr/api/v1/enrollments \
  -H "Content-Type: application/json" \
  -b user.cookies \
  -d '{"role":"supplier","metadata":{"agreeTerms":true}}'

# 내 신청 목록
curl -i -X GET https://api.neture.co.kr/api/v1/enrollments/my \
  -b user.cookies

# 중복 신청 시도
curl -i -X POST https://api.neture.co.kr/api/v1/enrollments \
  -H "Content-Type: application/json" \
  -b user.cookies \
  -d '{"role":"supplier","metadata":{"agreeTerms":true}}'
```

**결과**:
- 첫 신청 HTTP Status:
- enrollment ID:
- 중복 신청 HTTP Status:
- 에러 코드:

---

## 2) 운영자(관리자) 플로우

### 2-1. 운영자 로그인 → 목록 조회(필터)

- [ ] 운영자 로그인 성공 (200 OK)
- [ ] `/admin/enrollments?role=supplier&status=pending` → 목록 반환
- [ ] 방금 생성한 신청 건이 목록에 존재

**명령**:
```bash
# 운영자 로그인
curl -i -X POST https://api.neture.co.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c admin.cookies \
  -d '{"email":"admin@neture.co.kr","password":"<PW>"}'

# 목록 조회
curl -i -X GET "https://api.neture.co.kr/api/v1/admin/enrollments?role=supplier&status=pending" \
  -b admin.cookies
```

**결과**:
- HTTP Status:
- 신청 건 개수:
- 목록에서 enrollment ID 확인:

---

### 2-2. 승인 → 멱등성 확인

- [ ] 승인 성공 (200 OK 또는 201)
- [ ] RoleAssignment 생성 확인
- [ ] 멱등 재호출 → 일관된 응답 (200 또는 409)
- [ ] ApprovalLog + AuditLog 이중 기록 확인 (선택)

**명령**:
```bash
# 승인
ENROLL_ID="<PENDING_ID>"
curl -i -X PATCH "https://api.neture.co.kr/api/v1/admin/enrollments/${ENROLL_ID}/approve" \
  -H "Content-Type: application/json" \
  -b admin.cookies \
  -d '{"notes":"Approved for testing"}'

# 멱등 재호출
curl -i -X PATCH "https://api.neture.co.kr/api/v1/admin/enrollments/${ENROLL_ID}/approve" \
  -H "Content-Type: application/json" \
  -b admin.cookies \
  -d '{"notes":"Duplicate approval attempt"}'
```

**결과**:
- 첫 승인 HTTP Status:
- 멱등 재호출 HTTP Status:
- 멱등 재호출 응답:

---

### 2-3. 사용자 재확인 (/me 반영)

- [ ] 승인 후 `/me` 재호출 → `assignments[]`에 supplier active=true 반영
- [ ] `activated_at` 타임스탬프 존재

**명령**:
```bash
# 사용자 계정으로 /me 재호출
curl -i -X GET https://api.neture.co.kr/api/v1/auth/cookie/me \
  -b user.cookies
```

**결과**:
- HTTP Status:
- assignments 내용:
- active role 확인:

---

## 3) RBAC 검증

### 3-1. 일반 사용자가 관리자 API 접근 시

- [ ] 403 Forbidden

**명령**:
```bash
curl -i -X GET "https://api.neture.co.kr/api/v1/admin/enrollments" \
  -b user.cookies
```

**결과**:
- HTTP Status:
- 에러 코드:

---

### 3-2. 승인 전·후 접근 차이

- [ ] 승인 전: 대시보드 API(있다면) → 403
- [ ] 승인 후: 대시보드 API → 200 (Phase C 대비)

**참고**: 대시보드 API가 Phase C에서 구현 예정

---

## 4) 오류 시나리오

### 4-1. 미인증

- [ ] `/auth/cookie/me` (쿠키 없음) → 401 TOKEN_REQUIRED

**명령**:
```bash
curl -i -X GET https://api.neture.co.kr/api/v1/auth/cookie/me
```

**결과**:

---

### 4-2. 무권한

- [ ] 일반 계정 `/admin/enrollments` → 403 FORBIDDEN

**결과** (위 3-1과 동일):

---

### 4-3. 중복 신청

- [ ] 동일 role 재신청 → 409 DUPLICATE_ENROLLMENT

**결과** (위 1-2와 동일):

---

### 4-4. 검증 실패

- [ ] 필수 필드 누락 → 422 VALIDATION_ERROR

**명령**:
```bash
# role 필드 누락
curl -i -X POST https://api.neture.co.kr/api/v1/enrollments \
  -H "Content-Type: application/json" \
  -b user.cookies \
  -d '{}'
```

**결과**:
- HTTP Status:
- 에러 코드:

---

### 4-5. 레이트리밋

- [ ] `/enrollments` 3회/분 초과 → 429 TOO_MANY_REQUESTS

**명령**: (1-2에서 확인)

**결과**:

---

## 5) 응답 포맷 일관성

- [ ] 모든 에러 응답: `{ code, message, details? }`
- [ ] 성공 응답: `{ success: true, ... }`

---

## DoD (Definition of Done)

- [ ] 사용자 핵심 흐름 전부 200/201로 성공
- [ ] `/me`에 `assignments[]` 정확히 반영
- [ ] 401/403/409/422/429가 정책대로 동작
- [ ] ApprovalLog + AuditLog 이중 기록 확인 (샘플 1건)
- [ ] 응답 포맷 일관성 확인

---

## 검증 결과 요약

**날짜**: 2025-11-09
**검증자**: Claude Code
**결과**: [ ] 통과 / [ ] 부분 통과 / [ ] 실패

**이슈**:
-

**다음 단계**:
- [ ] Phase C 착수 (프론트엔드)
- [ ] 모니터링 설정 (24~72h)

---

*최종 업데이트: 2025-11-09*
