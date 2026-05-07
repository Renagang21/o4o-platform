# WO-O4O-NETURE-LOGIN-REDIRECT-ENV-VERIFY-V1

Neture Admin 로그인 Redirect 문제 — 배포 / 캐시 / returnUrl 환경 검증 결과

- 작성일: 2026-03-15
- 대상 서비스: **Neture (neture.co.kr)**
- 상태: **검증 완료**

---

## 검증 결과 요약

| 항목 | 결과 | 판정 |
|------|------|------|
| Cloud Run 배포 | `a0e119703` + `1419033f1` 모두 배포 성공 | **정상** |
| JS bundle | 프로덕션 번들에 수정 코드 포함 확인 | **정상** |
| returnUrl Case A (직접 접근) | 코드상 returnUrl 우선 → 역할 무시 | **원인 확인** |
| returnUrl Case B (홈에서 로그인) | returnUrl 없음 → 역할 기반 정상 작동 | **정상** |

---

## 1단계: Cloud Run 배포 상태

### GitHub Actions 실행 내역

| Run ID | 커밋 | neture 배포 | 시간 |
|--------|------|------------|------|
| `23087402137` | `a0e119703` (redirect fix) | **deploy-neture 성공** | 14시간 전 |
| `23088031873` | `1419033f1` (회원가입 역할) | **deploy-neture 성공** | 13시간 전 |
| `23088874289` | `96c656f27` (capability) | SKIP (neture 변경 없음) | 12시간 전 |

**결론**: Fix 커밋(`a0e119703`)과 그 이후 neture 관련 커밋(`1419033f1`)이 모두 **성공적으로 배포**되었다.

---

## 2단계: 프로덕션 JS 번들 확인

### 배포된 번들 파일

```
/assets/index-DVDBJB1z.js
```

### 번들 내 핵심 코드 확인

| 코드 | 번들 내 변수 | 포함 여부 |
|------|------------|----------|
| `ROLE_PRIORITY` | `is` | **포함** — `["admin","operator","supplier","partner","seller","pharmacy","consumer","user"]` |
| `mapApiRoles` | `Ut` | **포함** — `indexOf(":")` prefix stripping + ROLE_PRIORITY sort |
| `getPrimaryDashboardRoute` | `Lt` | **포함** — ROLE_PRIORITY 순회 + overrides |
| `ROUTE_OVERRIDES` | `zt` | **포함** — `{admin:"/workspace/admin",operator:"/workspace/operator",...}` |
| `ROLE_MAP` | `Vt` | **포함** — `{admin:"admin",super_admin:"admin",operator:"operator",...}` |
| `handleLoginSuccess` | `X` | **포함** — returnUrl 우선 → 없으면 Lt(roles, zt) |

### 번들 내 handleLoginSuccess 코드 (minified)

```javascript
const X = (D, G) => {
  if (b ? localStorage.setItem(Gt, p) : localStorage.removeItem(Gt), s(), r)
    l(r);   // ← returnUrl 있으면 무조건 이동
  else {
    const de = G && G.length > 0 ? Lt(G, zt) : D ? Lt([D], zt) : "/";
    l(de);  // ← returnUrl 없으면 역할 기반 계산
  }
};
```

**결론**: 프로덕션 번들에 모든 수정 코드가 포함되어 있다. 캐시 문제 아님.

---

## 3단계: returnUrl 시나리오 분석 (Root Cause)

### 전체 흐름

```
1. 미인증 사용자가 /workspace/operator 직접 접근
2. RoleGuard: !isAuthenticated
   → Navigate to="/login" state={{ from: "/workspace/operator" }}
3. LoginRedirect:
   returnUrl = location.state.from = "/workspace/operator"
4. openLoginModal("/workspace/operator")
   → loginReturnUrl = "/workspace/operator"
5. ModalRenderer → LoginModal returnUrl="/workspace/operator"
6. 사용자가 admin-neture@o4o.com으로 로그인
7. handleLoginSuccess(role="admin", roles=["admin"])
8. if (returnUrl) navigate(returnUrl)
   → navigate("/workspace/operator")
9. /workspace/operator Guard: allowedRoles=['admin','operator']
   → admin은 접근 허용 → 페이지 렌더링
10. ❌ admin이 /workspace/operator에 도착
```

### 문제의 핵심

| 항목 | 내용 |
|------|------|
| **코드** | handleLoginSuccess에서 `returnUrl`이 있으면 역할 기반 계산을 건너뛴다 |
| **의도** | 사용자가 이전에 접근하려던 페이지로 돌아가는 UX 패턴 (return-to-origin) |
| **부작용** | admin이 /workspace/operator를 통해 접근하면, 로그인 후 /workspace/operator로 이동 |
| **심각도** | Low — admin은 operator 페이지 접근 권한이 있으므로 기능적 문제 없음 |

### Case A: 직접 접근 시나리오

```
URL 직접 접근: /workspace/operator → RoleGuard → /login?from=/workspace/operator
→ 로그인 → returnUrl="/workspace/operator" → /workspace/operator (역할 무시)
```

**결과**: admin이 /workspace/operator에 도착 (**returnUrl 때문**)

### Case B: 홈에서 로그인 시나리오

```
홈(/) → Login 버튼 → openLoginModal() (returnUrl 없음)
→ 로그인 → returnUrl=undefined → getPrimaryDashboardRoute(["admin"], ROUTE_OVERRIDES)
→ /workspace/admin
```

**결과**: admin이 /workspace/admin에 도착 (**정상**)

---

## 4단계: Root Cause 판정

### 판정: **returnUrl 엣지케이스** (Case 3)

코드 버그도 아니고, 배포 문제도 아니고, 캐시 문제도 아니다.

**사용자가 로그인 전에 `/workspace/operator`에 접근한 경우**, RoleGuard의 return-to-origin 패턴에 의해 로그인 후 `/workspace/operator`로 리다이렉트된다.

이것은 일반적인 "이전 페이지로 돌아가기" UX 패턴의 부작용이다.

### 재현 조건

1. 브라우저에서 `https://neture.co.kr/workspace/operator` 직접 입력
2. 미인증 → RoleGuard가 `/login`으로 리다이렉트 (state.from="/workspace/operator")
3. admin 계정으로 로그인
4. returnUrl="/workspace/operator"이므로 `/workspace/operator`로 이동

### 왜 발생하는가

- admin은 `/workspace/operator`의 allowedRoles `['admin', 'operator']`에 포함
- 따라서 RoleGuard가 접근을 허용하고, 페이지가 정상 렌더링됨
- 기능적으로는 문제가 없지만, UX적으로 admin 전용 대시보드가 아닌 operator 대시보드로 이동

---

## 5단계: 권장 조치

### 즉시 조치 (검증)

사용자에게 다음 테스트 요청:

1. **시크릿 모드**에서 `https://neture.co.kr` 접속
2. 홈에서 로그인 버튼 클릭
3. `admin-neture@o4o.com`으로 로그인
4. `/workspace/admin`으로 이동하는지 확인

→ 정상 이동하면 **returnUrl 시나리오 확정**

### 후속 WO (선택)

returnUrl이 역할과 충돌하는 경우 역할 기반 경로를 우선하도록 수정:

**WO-O4O-NETURE-LOGIN-RETURNURL-FIX-V1**

```
수정 대상: LoginModal.tsx handleLoginSuccess()
수정 내용: returnUrl이 /workspace/* 패턴인 경우,
           해당 workspace가 사용자의 primary role과 일치하지 않으면
           역할 기반 경로를 사용
```

예시 수정:

```typescript
const handleLoginSuccess = (role?: string, roles?: string[]) => {
  // ...remember email logic...
  onClose();

  // returnUrl이 있지만 workspace 경로인 경우 역할 검증
  if (returnUrl && !returnUrl.startsWith('/workspace/')) {
    navigate(returnUrl);
  } else {
    const dashboardPath = (roles && roles.length > 0)
      ? getPrimaryDashboardRoute(roles, ROUTE_OVERRIDES)
      : role
        ? getPrimaryDashboardRoute([role], ROUTE_OVERRIDES)
        : '/';
    navigate(dashboardPath);
  }
};
```

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `services/web-neture/src/components/LoginModal.tsx:73-89` | handleLoginSuccess — returnUrl 우선 로직 |
| `services/web-neture/src/components/auth/RoleGuard.tsx:30-31` | state.from 설정 |
| `services/web-neture/src/App.tsx:366-377` | LoginRedirect — returnUrl 전달 |
| `services/web-neture/src/contexts/LoginModalContext.tsx:28-31` | loginReturnUrl 상태 관리 |
| `packages/auth-utils/src/getPrimaryDashboardRoute.ts` | 역할 기반 대시보드 계산 |
| `packages/auth-utils/src/mapApiRoles.ts` | API 역할 → 프론트엔드 역할 매핑 |

---

## 이전 관련 문서

- `docs/audit/IR-O4O-NETURE-LOGIN-REDIRECT-TRACE-AUDIT-V1.md` — 전체 리다이렉트 흐름 감사
- WO-O4O-NETURE-AUTH-ROLE-REDIRECT-FIX-V1 (`a0e119703`) — 역할 정렬 수정
- WO-O4O-NETURE-LOGIN-ROLE-DATA-VERIFY-V1 — DB→API→Frontend 데이터 검증

---

*검증 완료: 2026-03-15*
