# Auth ↔ Infrastructure Responsibility Separation

> **Work Order ID**: WO-AUTH-INFRA-SEPARATION-V1
> **Phase**: Phase 5-B
> **Version**: 1.0
> **Status**: Implementation Complete
> **Date**: 2026-01-06
> **Precondition**:
> - Phase 4-A (WO-AUTH-SSOT-MIGRATION-V1) ✅
> - Phase 4-B (WO-AUTH-TOKEN-MIGRATION-V1) ✅

---

## 1. 목적 (Purpose)

본 문서는 다음을 공식 정의한다:

> **Auth 계층이 더 이상 인프라(DB) 상태를 직접 판단하지 않도록 하고,
> 서비스 가용성 판단 책임을 Infra/HealthCheck 계층으로 완전히 분리한다.**

---

## 2. 책임 분리 원칙 (확정)

| 영역 | 책임 | HTTP 응답 |
|------|------|-----------|
| **Auth** | 인증 판단 | 401 / 403 / 500 |
| **Infra** | DB / Network 가용성 | - |
| **HealthCheck** | DB 초기화 상태 판단 | 200 / 503 |
| **Platform (Cloud Run)** | 재시작 / 스케일링 | - |

### 핵심 원칙

> **Auth는 절대 503을 직접 반환하지 않는다.**

---

## 3. 최종 흐름

```
Cloud Run Instance Start
   ↓
Infra Init (DB)
   ↓
❌ 실패 (GRACEFUL_STARTUP=false) → Process Exit → Cloud Run 재시작
⭕ 성공 → Server Ready
   ↓
Auth Request
   ↓
AuthenticationService
   ↓
401 / 403 / 200 만 반환 (DB 실패 시 500)
```

---

## 4. 구현 완료 내역

### 4.1 Auth 계층의 DB 상태 검사 제거

**수정된 파일:**
- `modules/auth/controllers/auth.controller.ts`
- `routes/auth.ts`

**변경 내용:**
- `AppDataSource.isInitialized` 검사 코드 제거
- `503 SERVICE_UNAVAILABLE` 반환 코드 제거
- `ServiceUnavailableError` import 제거

### 4.2 Startup / Infra 로직

**파일:** `services/startup.service.ts`

**기존 동작 유지:**
- GRACEFUL_STARTUP=true: DB 실패 시 서버 계속 실행
- GRACEFUL_STARTUP=false: DB 실패 시 process.exit(1)

**추가된 문서:**
- Phase 5-B 책임 분리 원칙 주석 추가

### 4.3 Health Check 재정의

**파일:** `routes/health.ts`

**엔드포인트 역할:**
| 엔드포인트 | 역할 | 응답 |
|------------|------|------|
| `/health` | 서버 생존 확인 | 항상 200 |
| `/health/live` | Liveness probe | 항상 200 |
| `/health/ready` | Readiness probe (DB 포함) | 200 / 503 |
| `/health/detailed` | 상세 상태 | 200 / 503 |
| `/health/database` | DB 전용 | 200 / 503 |

### 4.4 Auth 응답 정합성

**Auth 계층 허용 응답:**
- `200 OK` - 인증 성공
- `201 Created` - 회원가입 성공
- `401 Unauthorized` - 인증 실패
- `403 Forbidden` - 권한 없음
- `429 Too Many Requests` - 요청 제한
- `500 Internal Server Error` - 서버 오류 (DB 포함)

**Auth 계층 금지 응답:**
- ❌ `503 Service Unavailable`

---

## 5. 운영 효과

| 항목 | Before | After |
|------|--------|-------|
| Cold Start | 간헐적 503 | 재시작으로 흡수 |
| Auth 책임 | 인증 + 인프라 | 인증만 |
| 장애 해석 | 혼란 | 명확 |
| 운영 대응 | 수동 | 자동 |

---

## 6. 관련 문서

- [Auth SSOT 선언](./auth-ssot-declaration.md)
- [CLAUDE.md Section 2.6](../../CLAUDE.md)

---

## 7. 최종 판정

> **Phase 5-B는 "503을 고치는 작업"이 아니라
> "503이 생길 수 없는 구조로 바꾸는 작업"이다.**

---

*Completed: 2026-01-06*
*Status: Implementation Complete*
