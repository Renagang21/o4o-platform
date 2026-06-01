# IR-O4O-AUTH-CLIENT-STRATEGY-AUDIT-V1

## 플랫폼 인증 클라이언트 전략 조사 보고서

**작성일:** 2026-03-13
**분류:** Investigation Report (IR)
**트리거:** WO-O4O-SERVICE-SWITCHER-GLOBAL-V1 검증 중 GlycoPharm handoff 인증 불일치 발견

---

## 1. Executive Summary

O4O 플랫폼 6개 서비스에서 **두 가지 인증 전략이 공존**하고 있으며,
서비스 카탈로그-CORS-쿠키 도메인 설정 간 **도메인 불일치**가 존재한다.
이로 인해 Service Switcher를 통한 cross-service handoff가 일부 서비스에서 실패한다.

| 인증 전략 | 서비스 | 비율 |
|-----------|--------|------|
| **httpOnly Cookie** | neture, glucoseview, k-cosmetics, account | 4/6 (67%) |
| **localStorage + Bearer** | glycopharm, kpa-society | 2/6 (33%) |

---

## 2. 서비스별 인증 매트릭스

| 항목 | neture | glycopharm | glucoseview | k-cosmetics | kpa-society | account |
|------|--------|------------|-------------|-------------|-------------|---------|
| **토큰 저장** | cookie | localStorage | cookie | cookie | localStorage | cookie |
| **localStorage 키** | — | `glycopharm_*` | — | — | `o4o_*` (@o4o/auth-client) | — |
| **로그인 토큰 처리** | 서버 쿠키 설정 | 응답에서 추출 → LS 저장 | 서버 쿠키 설정 | 서버 쿠키 설정 | authClient.login() → LS 저장 | 서버 쿠키 설정 |
| **초기 인증 확인** | /auth/me (cookie) | LS 확인 → /auth/me (Bearer) | /auth/me (cookie) | **Lazy** checkSession() | LS 확인 → /auth/me (Bearer) | /auth/me (cookie) |
| **API 인증 방식** | credentials:include | Bearer + credentials:include | credentials:include | credentials:include | Bearer only | credentials:include |
| **토큰 갱신** | 서버 쿠키 refresh | 자체 refresh 로직 | 서버 쿠키 refresh | 서버 쿠키 refresh | @o4o/auth-client 인터셉터 | 서버 쿠키 refresh |
| **로그아웃** | POST + 상태 초기화 | POST + LS clear + 상태 초기화 | POST + 상태 초기화 | POST + 상태 초기화 | authClient.logout() + LS clear | POST + 상태 초기화 |

---

## 3. Handoff 구현 매트릭스

### 3.1 서버 (handoff.controller.ts)

```
POST /auth/handoff          → Redis 토큰 생성 (60초 TTL, single-use)
POST /auth/handoff/exchange → 토큰 교환 → 쿠키 설정 + 응답 body 토큰 반환 (dual)
```

서버는 **쿠키 설정과 body 토큰 반환을 동시에 수행**하여 두 전략 모두 지원한다.

### 3.2 클라이언트 HandoffPage 비교

| 항목 | neture | glycopharm | glucoseview | k-cosmetics | kpa-society | account |
|------|--------|------------|-------------|-------------|-------------|---------|
| **토큰 추출** | ?token= | ?token= | ?token= | ?token= | ?token= | ?token= |
| **credentials:include** | YES | **NO** | YES | YES | **NO** | YES |
| **토큰 저장 방식** | 쿠키 (서버 설정) | LS `glycopharm_*` | 쿠키 (서버 설정) | 쿠키 (서버 설정) | LS `o4o_*` | 쿠키 (서버 설정) |
| **성공 조건** | response.ok + success | response.ok + success + **tokens** | response.ok + success | response.ok + success | response.ok + success + **tokens** | response.ok + success |
| **후속 동작** | location.href = '/' | location.href = '/' | location.href = '/' | location.href = '/' | location.href = '/' | location.href = '/' |

---

## 4. 도메인 설정 불일치 (CRITICAL)

### 4.1 3개 설정 소스 비교

| 서비스 | service-catalog domain | CORS allowedOrigins | cookie SERVICE_DOMAINS |
|--------|----------------------|---------------------|----------------------|
| neture | `neture.co.kr` | `neture.co.kr` | `.neture.co.kr` |
| glycopharm | `glycopharm.co.kr` | `glycopharm.co.kr` | `.glycopharm.co.kr` |
| glucoseview | `glucoseview.co.kr` | `glucoseview.co.kr` | `.glucoseview.co.kr` |
| **kpa-society** | **`yaksa.site`** | **`kpa-society.co.kr`** | **`.kpa-society.co.kr`** |
| **k-cosmetics** | **`cosmetics.neture.co.kr`** | **`k-cosmetics.site`** | **`.k-cosmetics.site`** |

### 4.2 KPA Society — HANDOFF 완전 실패

**문제:**
- Handoff 생성 시 targetUrl = `https://yaksa.site/handoff?token=...`
- 브라우저가 `yaksa.site`로 이동
- HandoffPage에서 `POST /api/v1/auth/handoff/exchange` 호출
- Origin: `https://yaksa.site` → CORS 목록에 없음 → **요청 차단**

**근본 원인:** service-catalog의 domain (`yaksa.site`)과 CORS/쿠키 설정 (`kpa-society.co.kr`)이 불일치

**해결 방향:** 실제 운영 도메인을 확인하여 3개 설정을 통일

### 4.3 K-Cosmetics — 잠재적 도메인 불일치

**문제:**
- service-catalog: `cosmetics.neture.co.kr`
- CORS + Cookie: `k-cosmetics.site`

**영향:**
- Handoff targetUrl = `https://cosmetics.neture.co.kr/handoff?token=...`
- 실제 서비스가 `k-cosmetics.site`에서 운영되면 → 404 또는 다른 사이트 도달
- 실제 서비스가 `cosmetics.neture.co.kr`에서 운영되면 → CORS에 누락되어 API 호출 실패

**해결 방향:** 실제 운영 도메인 확인 후 통일

---

## 5. 발견된 문제 목록

### CRITICAL (handoff 실패)

| # | 문제 | 영향 | 위치 |
|---|------|------|------|
| C1 | KPA Society 도메인 불일치 (yaksa.site vs kpa-society.co.kr) | Handoff TO kpa-society 완전 실패 | service-catalog.ts:53, main.ts:162, cookie.utils.ts:25 |
| C2 | K-Cosmetics 도메인 불일치 (cosmetics.neture.co.kr vs k-cosmetics.site) | Handoff TO k-cosmetics 실패 가능 | service-catalog.ts:60, main.ts:163, cookie.utils.ts:27 |

### HIGH (기능 저하)

| # | 문제 | 영향 | 위치 |
|---|------|------|------|
| H1 | GlycoPharm 인증 이원화 (localStorage) | Handoff 후 인증 누락 가능성* | web-glycopharm AuthContext.tsx |
| H2 | KPA Society 인증 이원화 (localStorage) | Handoff 후 인증 누락 가능성* | web-kpa-society AuthContext.tsx |
| H3 | generateTokens 도메인 하드코딩 'neture.co.kr' | JWT audience 불일치 (보안 영향은 낮음) | handoff.controller.ts:130 |

*GlycoPharm/KPA HandoffPage가 응답 body에서 토큰을 올바르게 추출하여 LS에 저장하므로, CORS가 통과하면 handoff 자체는 동작함. 다만 쿠키 기반 서비스 FROM localStorage 서비스로의 handoff origin 인식에 문제 가능성.

### MEDIUM (UX/유지보수)

| # | 문제 | 영향 | 위치 |
|---|------|------|------|
| M1 | ServiceSwitcher stale closure (join 후 목록 미갱신) | 드롭다운 닫고 다시 열어야 갱신 | ServiceSwitcher.tsx handleJoin |
| M2 | GlycoPharm 독자 토큰 키 (`glycopharm_*`) | 표준화 미비, 유지보수 부담 | web-glycopharm AuthContext.tsx:12-17 |
| M3 | 2개 인증 전략 유지 부담 | 모든 인증 관련 변경 시 2가지 패턴 고려 필요 | 플랫폼 전체 |

### LOW (경미)

| # | 문제 | 영향 | 위치 |
|---|------|------|------|
| L1 | HandoffPage @keyframes spin 미정의 | 로딩 스피너 애니메이션 안됨 | 대부분 HandoffPage |
| L2 | account 서비스 카탈로그 미등록 | handoff 타겟 불가 (의도된 것일 수 있음) | service-catalog.ts |

---

## 6. 인증 전략 분석 및 권고

### 6.1 Cookie 전략의 장점

| 장점 | 설명 |
|------|------|
| 보안 | httpOnly → XSS 공격으로 토큰 탈취 불가 |
| 자동 전송 | 브라우저가 자동으로 쿠키 포함 → 별도 인터셉터 불필요 |
| SSO 자연 지원 | 같은 도메인 서브도메인 간 쿠키 공유 |
| Handoff 호환 | 서버가 Set-Cookie로 바로 인증 설정, 클라이언트 코드 불필요 |
| 코드 단순 | AuthContext ~80줄 vs localStorage 전략 ~200줄+ |

### 6.2 Cookie 전략의 제약

| 제약 | 설명 | O4O 영향 |
|------|------|----------|
| Cross-domain | 다른 도메인 간 쿠키 공유 불가 | glycopharm.co.kr ↔ neture.co.kr → 공유 불가 |
| SameSite=None | 프로덕션에서 필수 (HTTPS only) | 이미 설정됨 |
| 서드파티 쿠키 | 브라우저 제한 강화 추세 | API 서버 도메인 ≠ 서비스 도메인이면 영향 |

### 6.3 왜 localStorage가 도입되었는가

GlycoPharm과 KPA Society가 localStorage를 사용하는 이유 추정:
1. **Cross-origin API 호출**: `glycopharm.co.kr` → `api.neture.co.kr` 에서 서드파티 쿠키 제한
2. **기존 모바일/SPA 패턴 답습**: Bearer 토큰 방식이 SPA에서 더 일반적
3. **API 서버 공유**: 모든 서비스가 같은 `api.neture.co.kr`을 사용하므로, 쿠키 도메인 관리가 복잡

### 6.4 권고: 쿠키 우선 전략 + localStorage 하위 호환

**단기 (WO-1):** 도메인 설정 통일
- service-catalog, CORS, cookie SERVICE_DOMAINS 3곳의 도메인을 실제 운영 도메인으로 통일
- KPA Society: `yaksa.site` 또는 `kpa-society.co.kr` 중 실제 도메인 확인 후 3곳 모두 반영
- K-Cosmetics: `cosmetics.neture.co.kr` 또는 `k-cosmetics.site` 중 실제 도메인 확인 후 반영

**중기 (WO-2):** GlycoPharm/KPA 인증 쿠키 전환
- HandoffPage에서 이미 서버가 쿠키를 설정하므로, AuthContext만 쿠키 기반으로 전환
- `@o4o/auth-client`의 strategy를 `'cookie'`로 변경
- 기존 localStorage 토큰은 마이그레이션 기간 동안 fallback으로 유지

**장기 (WO-3):** 플랫폼 인증 표준화
- 모든 서비스 AuthContext를 동일 패턴으로 통일
- `@o4o/auth-client` 패키지를 쿠키 전략 기본으로 재설계
- ServiceSwitcher를 `@o4o/ui` 패키지로 추출

---

## 7. End-to-End Handoff 흐름도

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Source       │     │ API Server      │     │ Target           │
│ Service      │     │ (api.neture)    │     │ Service          │
│              │     │                 │     │                  │
│ ServiceSwtch │     │                 │     │                  │
│ ────────────→│     │                 │     │                  │
│ POST /handoff│─────│→ Redis store    │     │                  │
│              │←────│  {token,userId} │     │                  │
│              │     │  TTL=60s        │     │                  │
│              │     │                 │     │                  │
│ location.href│═════│═════════════════│═════│→ /handoff?token= │
│              │     │                 │     │                  │
│              │     │                 │     │ HandoffPage      │
│              │     │ POST /exchange  │←────│ ────────────→    │
│              │     │ Redis consume   │     │                  │
│              │     │ Load user+roles │     │                  │
│              │     │ Set-Cookie ─────│─────│→ (cookie svc)    │
│              │     │ Body {tokens} ──│─────│→ localStorage    │
│              │     │                 │     │                  │
│              │     │                 │     │ location.href='/'│
│              │     │                 │     │ AuthContext init  │
└─────────────┘     └─────────────────┘     └──────────────────┘
```

---

## 8. 후속 WO 제안

| 우선순위 | WO 이름 | 범위 | 예상 규모 |
|----------|---------|------|----------|
| **P0** | WO-O4O-DOMAIN-CONFIG-UNIFICATION-V1 | service-catalog + CORS + cookie 도메인 통일 | 3 files, ~30분 |
| **P1** | WO-O4O-GLYCOPHARM-AUTH-COOKIE-MIGRATION-V1 | GlycoPharm AuthContext 쿠키 전환 | 3-5 files |
| **P1** | WO-O4O-KPA-AUTH-COOKIE-MIGRATION-V1 | KPA Society AuthContext 쿠키 전환 | 3-5 files |
| **P2** | WO-O4O-SERVICE-SWITCHER-BUGFIX-V1 | Stale closure fix + UX 개선 | 6 files (동일 컴포넌트) |
| **P3** | WO-O4O-AUTH-CLIENT-STANDARDIZATION-V1 | @o4o/auth-client 쿠키 기본 + 전 서비스 통일 | 패키지 + 6 서비스 |

---

## Appendix A: 파일 위치 참조

| 설정 | 파일 |
|------|------|
| Service Catalog | `apps/api-server/src/config/service-catalog.ts` |
| CORS Origins | `apps/api-server/src/main.ts:143-168` |
| Cookie Domains | `apps/api-server/src/utils/cookie.utils.ts:22-28` |
| Handoff Controller | `apps/api-server/src/modules/auth/controllers/handoff.controller.ts` |
| Token Utils (generateTokens) | `apps/api-server/src/utils/token.utils.ts` |

| 서비스 | AuthContext | HandoffPage | Header/Layout |
|--------|-------------|-------------|---------------|
| web-neture | `contexts/AuthContext.tsx` | `pages/HandoffPage.tsx` | `components/layouts/NetureLayout.tsx` |
| web-glycopharm | `contexts/AuthContext.tsx` | `pages/HandoffPage.tsx` | `components/common/Header.tsx` |
| web-glucoseview | `contexts/AuthContext.tsx` | `pages/HandoffPage.tsx` | `components/Layout.tsx` |
| web-k-cosmetics | `contexts/AuthContext.tsx` | `pages/HandoffPage.tsx` | `components/common/Header.tsx` |
| web-kpa-society | `contexts/AuthContext.tsx` | `pages/HandoffPage.tsx` | `components/Header.tsx` |
| web-account | `contexts/AuthContext.tsx` | `pages/HandoffPage.tsx` | `components/AccountLayout.tsx` |

---

*IR-O4O-AUTH-CLIENT-STRATEGY-AUDIT-V1 — Complete*
