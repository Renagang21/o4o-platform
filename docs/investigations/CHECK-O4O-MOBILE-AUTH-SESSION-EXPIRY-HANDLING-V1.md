# CHECK-O4O-MOBILE-AUTH-SESSION-EXPIRY-HANDLING-V1

> 모바일 앱 accessToken 만료(401) 처리 구현 검증 보고.
>
> WO: `WO-O4O-MOBILE-AUTH-SESSION-EXPIRY-HANDLING-V1`
> 선행: [`CHECK-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1`](CHECK-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1.md) · [`CHECK-...-SHELL-UI-SMOKE-V1`](CHECK-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-UI-SMOKE-V1.md) R1
> 작성일: 2026-06-21
> 상태: 구현 완료 · mobile type-check PASS · 로직/API 검증 PASS · 디바이스 smoke 보류(환경 제약)

---

## 1. Summary

모바일 앱이 accessToken(~15분 만료) 이후 **"로그인된 듯 보이나 모든 API 가 401" 상태에 갇히지 않도록** 처리했다. `services/mobile-app` 인증 흐름만 수정 — auth backend / endpoint / Product Core **무변경**, native package·`pnpm-lock.yaml` **무변경**.

처리 방식(2계층):
1. **401 인터셉터 → 세션 만료 로그아웃** — apiClient response 인터셉터가 401(로그인/리프레시 호출 제외) 감지 → 토큰 삭제 → 로그인 화면 이동 → 안내. 루프 가드 포함.
2. **복원 시 만료 토큰 선폐기** — 앱 시작 시 저장 토큰의 JWT `exp` 를 best-effort 파싱해 만료면 복원하지 않고 즉시 삭제(콜드스타트 401 방지).

**refresh 자동 갱신은 이번 WO 에서 구현하지 않음** (계약은 확인됨 — §2). 디바이스 검증을 동반하는 별도 WO 로 분리.

검증: `pnpm -C services/mobile-app type-check` → **0 errors**. `isAccessTokenExpired` 로직 4-케이스 검증 PASS. 프로덕션 API: 만료/위조 Bearer → 401 확인.

---

## 2. Refresh 가능 여부 조사 결과

| 항목 | 결과 |
|---|---|
| login 응답에 refreshToken | ✅ `data.tokens.refreshToken` 포함(`includeLegacyTokens:true` 시, body, len~395) |
| backend refresh endpoint | ✅ `POST /api/v1/auth/refresh` 존재 (`auth.routes.ts`, Core Freeze) |
| body refreshToken 수용 | ✅ `auth-session.controller.ts:69` — `req.cookies?.refreshToken \|\| req.body.refreshToken` → **모바일(body) 사용 가능** |
| body 토큰 반환 | ✅ `includeLegacyTokens===true` 또는 cross-origin 시 `data.tokens.{accessToken,refreshToken,expiresIn}` 반환 |
| 토큰 회전(rotation) | ⚠️ refresh 시 **새 refreshToken 발급**. `TOKEN_FAMILY_MISMATCH`(재사용 탐지) → 강제 로그아웃 |
| 실패 응답 | 401 + `code`(NO_REFRESH_TOKEN/REFRESH_TOKEN_EXPIRED/…) + `retryable:false` |

> **결론: refresh 는 모바일에서 계약상 사용 가능.** 그러나 안전 구현에는 (a) refreshToken 을 SecureStore 에 저장, (b) 회전 토큰을 매 갱신마다 교체 저장, (c) 동시 401 시 single-flight 갱신 가드(회전 충돌 방지), (d) 원요청 재시도 큐 가 필요하다. 이 인증 재시도 로직은 **디바이스 검증 없이 무검증 추가하면 logout 루프/무한 재시도 위험**이 커서, WO 방침("계약 확인 없이 구현 금지", "401 interceptor 중심")에 따라 **이번 WO 미구현**. → F1 별도 WO.

---

## 3. 최종 처리 방식

### 3.1 401 인터셉터 (`src/api/client.ts`)

```text
- setUnauthorizedHandler(handler): AuthContext 가 핸들러 주입
- apiClient.interceptors.response: 에러 status===401 && url 이 /auth/login·/auth/refresh 아님 → onUnauthorized() 1회 호출 후 reject 전파
- 로그인/리프레시 요청 자체의 401 은 세션 만료로 처리하지 않음(일반 로그인 실패)
```

### 3.2 만료 선폐기 (`isAccessTokenExpired`)

```text
- JWT payload(2번째 세그먼트) base64url → atob → JSON.parse → exp(초) 확인
- exp*1000 <= now + 10s(skew) 이면 만료
- 파싱 불안정/atob 부재/exp 없음 → false(만료 아님) 반환 → 실제 만료는 401 인터셉터가 처리 (best-effort, 비치명적)
```

### 3.3 AuthContext

```text
- restoreToken: stored 있고 !isAccessTokenExpired → 복원; 만료/손상이면 SecureStore 삭제 후 미복원
- handleSessionExpired: clearSession(토큰삭제+상태 null) → router.replace('/(auth)/login') → Alert "로그인 시간이 만료되었습니다. 다시 로그인해 주세요."
- 마운트 시 setUnauthorizedHandler 등록, 언마운트 시 해제
- login 성공 시 hasSessionRef=true, expiringRef=false(가드 해제)
- logout: clearSession + 로그인 이동(공통 경로)
```

---

## 4. 401 루프 방지 방식

| 가드 | 역할 |
|---|---|
| `expiringRef` | 세션 만료 처리 진행 중이면 추가 401 무시 — 동시 다발 401 에도 **1회만 로그아웃/Alert** |
| `hasSessionRef` | 세션이 없으면(이미 로그아웃/미로그인) 401 핸들러 no-op — 로그인 화면에서의 잔여 401 로 인한 재진입 방지 |
| auth-entry 제외 | `/auth/login`·`/auth/refresh` 401 은 인터셉터가 세션 만료로 보지 않음 — 로그인 실패가 강제 로그아웃·루프로 번지지 않음 |
| login 시 `expiringRef=false` | 재로그인 후 다음 만료를 정상적으로 다시 처리 |

---

## 5. Files Changed

| 파일 | 변경 | 성격 |
|---|---|---|
| `services/mobile-app/src/api/client.ts` | 수정 | 401 response 인터셉터 + `setUnauthorizedHandler` + `isAccessTokenExpired` |
| `services/mobile-app/src/contexts/AuthContext.tsx` | 수정 | 핸들러 등록 + 만료 선폐기 복원 + 세션만료 로그아웃(루프 가드) + clearSession 공통화 |
| `docs/investigations/CHECK-O4O-MOBILE-AUTH-SESSION-EXPIRY-HANDLING-V1.md` | 신규 | 본 문서 |

> backend / DB / migration / 엔티티 / native package / `pnpm-lock.yaml` **무변경**.

---

## 6. Verification Results

| 항목 | 결과 |
|---|---|
| `pnpm -C services/mobile-app type-check` | ✅ **0 errors** |
| `isAccessTokenExpired` — 실토큰(exp~900s) | ✅ false (만료 아님) |
| `isAccessTokenExpired` — exp=1(장기만료) | ✅ true |
| `isAccessTokenExpired` — exp=+1h | ✅ false |
| `isAccessTokenExpired` — garbage / exp 없음 | ✅ false (skip → 인터셉터 처리) |
| 프로덕션: 위조 Bearer `GET /mobile/product-drafts` | ✅ HTTP 401 |
| 프로덕션: well-formed 만료형 Bearer | ✅ HTTP 401 |
| 정상 로그인 → Bearer 정상 호출 | ✅ HTTP 200 (Shell WO 에서 확인, 변경 무영향) |

> `isAccessTokenExpired` 는 구현과 동일 로직을 Node 로 재현해 4케이스 검증. atob 가용(Hermes/RN 0.79·Node 확인). 토큰 payload ASCII-only 확인 → `atob`+`JSON.parse` 안전.

---

## 7. 디바이스 smoke 수행 여부

> ⛔ **에뮬레이터/디바이스 런타임 검증 보류 — 환경 제약** (Android SDK/emulator/adb/java 부재, `CHECK-...-SHELL-UI-SMOKE-V1 §1` 동일).

코드 경로 + API 계약 + 로직 단위검증으로 갈음. 사람 육안 시 추가 확인:

```text
1. 로그인 → 15분 경과(또는 SecureStore 토큰을 만료 JWT 로 교체) 후 앱 재시작 → 로그인 화면으로 이동(콜드스타트 선폐기)
2. 로그인 후 앱 열어둔 채 15분 경과 → 임의 API 동작 → "세션 만료" Alert 1회 + 로그인 화면
3. 다발 호출 동시 401 → Alert 가 1회만(루프 없음)
4. 잘못된 비번 로그인 → 세션만료 Alert 가 아니라 일반 로그인 실패 처리
5. 재로그인 → 정상 동작, 이후 만료도 다시 정상 처리
```

---

## 8. What Was Not Changed / Follow-ups

- ✅ auth backend / refresh endpoint / Product Core 무변경 · cookie 인증 전환 없음 · 웹 authClient 이식 없음
- ✅ 이미지/카메라/OCR/convert-to-candidate 미작업

| # | Follow-up | 비고 |
|---|---|---|
| F1 | `WO-O4O-MOBILE-AUTH-TOKEN-REFRESH-V1` | refreshToken 저장 + single-flight 회전 + 재시도 큐(디바이스 검증 동반). 계약은 §2 에서 확인됨 |
| F2 | 로그인 401 메시지 개선(선택) | 현재 인터셉터가 login 401 을 제외 → 로그인 화면이 axios 일반 메시지 표시. 서버 `error`/`code` 표면화는 소폭 개선 여지 |
| F3 | 사람 육안 smoke(§7) + Shell UI smoke(F1 of UI-SMOKE) | 디바이스 환경에서 일괄 |

---

**작성:** O4O Platform Team · 2026-06-21
**상태:** 구현 완료(401 logout + 만료 선폐기) · type-check/로직/API 검증 PASS · 디바이스 smoke 보류. refresh 자동갱신은 F1 별도 WO.
