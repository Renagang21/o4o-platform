# WO-O4O-GOOGLE-IDENTITY-STORE-ORIGIN-AND-SMOKE-V1

> **상태**: ACTIVE — **Google Identity 트랙 담당 세션으로 인계** · **접수**: 2026-09-22 · **CHECK**: (실행 후 `docs/checks/CHECK-O4O-GOOGLE-IDENTITY-STORE-ORIGIN-AND-SMOKE-V1.md`)
> 통합 내 매장(Unified Store Workspace, [`WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1`](WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1.md)) 신규 운영 도메인 `https://store.neture.co.kr` 을 **기존 O4O Google 로그인 체계에 편입**한다.
> 선행 트랙: [`WO-O4O-GOOGLE-IDENTITY-PRODUCTION-ACTIVATION-AND-SMOKE-V1`](WO-O4O-GOOGLE-IDENTITY-PRODUCTION-ACTIVATION-AND-SMOKE-V1.md) · [`WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1`](WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1.md).
>
> **작업의 핵심은 새 인증 개발이 아니라, 기존 production Google Web Client 에 `https://store.neture.co.kr` origin 을 정확히 추가하고 실제 로그인을 검증하는 것이다.** 코드 변경이 필요 없으면 **코드 변경 0** 으로 종결한다.

## 1. 배경 · 현재 상태

신규 운영 도메인 개통:

```text
https://store.neture.co.kr
```

인프라는 정상(Unified Store 트랙 실측):

```text
DNS      store.neture.co.kr → 136.110.132.35        PASS
GCLB / HTTPS proxy / certificate map                PASS
cm-entry-store                                      ACTIVE
cm-cert-store-v1                                    ACTIVE
authorization                                       AUTHORIZED
store-web Cloud Run                                 배포 완료
https://store.neture.co.kr/login                    정상 렌더
```

본 WO 접수 시점 read-only 재확인(2026-09-22):

```text
GET  https://store.neture.co.kr/login                        200 · <title>내 매장 | Neture</title>
GET  https://api.neture.co.kr/api/v1/auth/google/config       enabled=true · clientId 반환(…googleusercontent.com)
services/web-store/src/pages/LoginPage.tsx                    공통 @o4o/auth-react GoogleContinue 사용 확인
```

증상: 로그인 화면에서 Google 버튼을 누르면 **Google 측에서 오류**. 요청 세부정보:

```text
origin=https://store.neture.co.kr
flowName=GeneralOAuthFlow
```

→ Store 코드·TLS 문제가 아니라 **Google OAuth Web Client 의 Authorized JavaScript origin 미등록**으로 판단.

## 2. 작업 1 — production Google Web Client ID 확인

브라우저에 실제로 내려가는 Client ID 를 **정본으로** 확인한다.

```powershell
(Invoke-RestMethod https://api.neture.co.kr/api/v1/auth/google/config).data
```

반환된 `enabled` · `clientId` 를 확인하고, **이 `clientId` 와 일치하는 Google Cloud Console 의 Web application OAuth Client** 를 수정한다. 새 OAuth Client 를 임의로 만들지 않는다.

> 보고 시 clientId 값 자체는 문서·로그에 남기지 않는다. **일치 여부만** 기록한다.

## 3. 작업 2 — Authorized JavaScript origins 추가

해당 Web OAuth Client 의 **Authorized JavaScript origins** 에 추가:

```text
https://store.neture.co.kr         ✅ origin 형식 그대로
https://store.neture.co.kr/login   ❌
https://store.neture.co.kr/        ❌
```

현재 Store 로그인은 **GIS JavaScript button → ID token → O4O backend** 방식이므로 이번 오류 해결을 위해 **새 redirect URI 를 임의로 추가하지 않는다.**

로컬 smoke 가 꼭 필요할 때만 `http://localhost:4210` 추가 여부를 **별도 판단**한다.

## 4. 현재 코드 구조 (변경 금지)

`services/web-store` 는 새 O4O 서비스가 아니라 **공통 Store Workspace** 다.

```text
serviceKey='store'   만들지 않음
store membership     만들지 않음
store role           만들지 않음
```

로그인 화면 `services/web-store/src/pages/LoginPage.tsx` 는 공통 구성요소를 그대로 사용한다:

```text
@o4o/auth-react GoogleContinue
authClient.getGoogleAuthConfig()
loginWithGoogle()
signupWithGoogle()
```

신규 인증방식 구현 · Store 전용 Google Client 생성은 하지 않는다.

## 5. 작업 3 — production smoke

Google Console 저장 후 `store.neture.co.kr/login` 에서 **실제 브라우저로** 확인한다.

```text
A. Google 버튼 오류 없이 계정 선택창 표시
B. 기존 Google-linked O4O 계정 로그인 성공
C. /login → / 정상 이동
D. access/refresh session 정상 성립
E. /api/v1/work-scope/accessible-stores 정상 호출
F. 접근 가능한 매장:
     0개 → 안내
     1개 → 자동 선택
     2개+ → Store Selector
G. 선택된 organization 의 서비스 목록 정상 표시
```

`store_owner` 역할·매장 연결이 준비되지 않은 계정이면 **Google 로그인 성공 여부까지만 분리해 판정**하고, role/membership 을 DB 에 직접 만들어 smoke 를 통과시키지 않는다(→ `STORE_OWNER_CONTEXT=PENDING`).

## 6. 하지 않을 것

```text
새 Google OAuth Client 생성
Store 전용 Client ID 생성
serviceKey='store' 추가
로그인 API 구조 변경
legacy password 계정 복구
lockout 수동 해제
DB 직접 role/membership INSERT
Google 로그인 실패를 Store 코드에서 우회
```

## 7. 완료 보고 항목

```text
PRODUCTION_GOOGLE_CLIENT_ID    = 일치 여부만 (값 비노출)
STORE_GOOGLE_AUTHORIZED_ORIGIN = PASS
GOOGLE_ACCOUNT_CHOOSER         = PASS
GOOGLE_LOGIN                   = PASS/FAIL
STORE_SESSION_ESTABLISHED      = PASS/FAIL
STORE_OWNER_CONTEXT            = PASS/PENDING
```

코드 변경이 필요하지 않았다면 **코드 변경 0** 으로 종결한다.

## 8. 후속 관계

본 WO 가 PASS 하면 Unified Store 트랙으로 복귀해 다음 순서로 진행한다:

```text
store.neture.co.kr 직접 로그인 E2E
→ KPA / K-Cosmetics / PharmacyHub → Store workspace handoff E2E
→ VITE_UNIFIED_STORE_HANDOFF=true
→ 3서비스 재배포
→ Unified Store Workspace CLOSED
```

`VITE_UNIFIED_STORE_HANDOFF` 는 현재 **OFF** 이며 Google 로그인 검증 전에는 켜지 않는다.

## 9. 다른 트랙과의 관계

- **내 매장 AI First 트랙**(WO1~4 완료 · WO5 [`E2E-CLOSURE`](WO-O4O-STORE-AI-FIRST-E2E-CLOSURE-V1.md) 접수)의 브라우저 smoke 는 store-owner 로그인 불가로 차단돼 있다. 본 WO 의 `GOOGLE_LOGIN=PASS` + `STORE_OWNER_CONTEXT=PASS` 가 그 차단을 푸는 경로 중 하나다.
- 단, **AI First 트랙에서는 인증 구조를 손대지 않는다.** 계정·권한·lockout 처리는 Google Identity 트랙 소관이다.
