# Auth Freeze Declaration (PHASE-8-AUTH-FREEZE)

> **Work Order ID**: WO-AUTH-FREEZE-V1
> **Version**: 1.0
> **Status**: FROZEN
> **Date**: 2026-01-06
> **Precondition**: WO-AUTH-FULL-VERIFICATION-V1 (ALL PASS)

---

## 1. 선언 (Declaration)

> **O4O Platform의 Auth 영역은 2026-01-06부로 FROZEN 상태에 진입한다.**
>
> 본 선언 이후, Auth 관련 코드·정책·구조의 변경은
> **명시적 승인 없이 불가**하다.

---

## 2. Freeze 범위 (Scope)

### 2.1 Frozen 대상

| 구분 | 대상 | 상태 |
|------|------|------|
| Backend | `AuthenticationService` | FROZEN |
| Backend | `apps/api-server/src/routes/auth.ts` | FROZEN |
| Backend | `apps/api-server/src/modules/auth/` | FROZEN |
| Package | `packages/auth-client/` | FROZEN |
| Package | `packages/auth-context/` | FROZEN |
| Policy | Token Storage SSOT (`o4o_accessToken`) | FROZEN |
| Policy | Cookie Primary / localStorage Legacy | FROZEN |
| Policy | Auth ↔ Infra 책임 분리 | FROZEN |

### 2.2 Freeze 예외 (허용)

| 허용 항목 | 조건 |
|-----------|------|
| 버그 수정 | 동작 변경 없음 |
| 보안 패치 | 긴급 대응 |
| 타입 개선 | 기존 동작 유지 |
| 문서 보완 | 정책 변경 없음 |

### 2.3 절대 금지

| 금지 항목 | 사유 |
|-----------|------|
| 새로운 Auth 서비스 생성 | SSOT 위반 |
| Token 저장 키 추가 | 정책 위반 |
| Cookie/localStorage 전략 변경 | 정책 위반 |
| Auth에서 503 반환 | 책임 분리 위반 |
| deprecated 서비스 부활 | 아키텍처 위반 |

---

## 3. Verification 결과 요약

### 3.1 Phase 4-A: Auth SSOT Migration
- ✅ deprecated AuthService imports 제거
- ✅ AuthServiceV2 exports 제거
- ✅ SocialAuthService 통합 완료

### 3.2 Phase 4-B: Token Storage Migration
- ✅ SSOT 유틸리티 생성 (`token-storage.ts`)
- ✅ 중복 토큰 저장 제거
- ✅ Legacy key 자동 마이그레이션

### 3.3 Phase 5-B: Auth-Infra Separation
- ✅ Auth 계층 503 반환 제거
- ✅ Health Check 책임 재정의

### 3.4 Phase 6-7: Cookie Auth Primary
- ✅ httpOnly Cookie 설정 구현
- ✅ AuthClient 기본 전략 'cookie'
- ✅ /auth/status API 연동
- ✅ includeLegacyTokens 옵션 구현

---

## 4. 아키텍처 확정 (Final Architecture)

### 4.1 Auth SSOT

```
[ Client ]
    |
    v
[ Auth Routes ]
    |
    v
[ AuthenticationService ]   <-- 유일한 Auth 판단자
    |
    v
[ DB / Token / Role ]
```

### 4.2 Token Storage Policy

```
Cookie Strategy (Primary - B2C):
  - 토큰: httpOnly Cookie
  - 인증 상태: /auth/status API

localStorage Strategy (Legacy - Admin):
  - 토큰: o4o_accessToken (SSOT key)
  - 인증 상태: localStorage 확인
```

### 4.3 Auth Response Pattern

```typescript
// Cookie Strategy (기본)
{
  success: true,
  user: { ... }
  // 토큰은 httpOnly Cookie로 전송
}

// localStorage Strategy (includeLegacyTokens: true)
{
  success: true,
  accessToken: "...",
  refreshToken: "...",
  user: { ... }
}
```

---

## 5. 변경 요청 절차

Freeze 상태에서 변경이 필요한 경우:

1. **Work Order 작성** - 변경 사유 명시
2. **영향 분석** - Freeze 범위 검토
3. **승인** - 아키텍처 리뷰
4. **구현** - 최소 변경 원칙
5. **검증** - Verification 재실행
6. **문서 갱신** - Freeze 문서 업데이트

---

## 6. 관련 문서

| 문서 | 역할 |
|------|------|
| [auth-ssot-declaration.md](./auth-ssot-declaration.md) | SSOT 정책 및 구현 기록 |
| [auth-infra-separation.md](./auth-infra-separation.md) | Auth-Infra 책임 분리 |
| [CLAUDE.md](../../CLAUDE.md) | 플랫폼 헌법 (§2.5 Core 동결) |

---

## 7. 최종 판정

> **Auth는 이제 "기준이 된 영역"이다.**
>
> - SSOT: AuthenticationService
> - Token: o4o_accessToken (SSOT key)
> - Strategy: Cookie Primary, localStorage Legacy
> - Responsibility: Auth ≠ Infra
>
> **이 기준을 변경하려면, 본 Freeze를 해제해야 한다.**

---

*Frozen: 2026-01-06*
*Status: Platform Infrastructure - FROZEN*
*Next Review: On-demand (변경 요청 시)*
