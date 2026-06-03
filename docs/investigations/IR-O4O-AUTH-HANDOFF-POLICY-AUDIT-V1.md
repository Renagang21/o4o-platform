# IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI 변경 없음.**
>
> Identity V2 Canonical 기준에서 `POST /api/v1/auth/handoff` / `POST /api/v1/auth/handoff/exchange` 및 5개 service 의 `HandoffPage` 의 보존/축소/삭제 정책을 판단한다.

- **작성일:** 2026-05-23
- **분류:** Investigation (read-only)
- **선행 문서:**
  - [O4O-IDENTITY-ARCHITECTURE-V2](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md) (Canonical, 2026-05-23 Adopted)
  - [DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1](../decisions/DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1.md)
  - [IR-O4O-SERVICE-SWITCHER-DEPRECATION-AUDIT-V1](IR-O4O-SERVICE-SWITCHER-DEPRECATION-AUDIT-V1.md)
  - [CHECK-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1](CHECK-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1.md)
  - [CHECK-O4O-WEB-ACCOUNT-ENTRY-FLOW-REGRESSION-V1](CHECK-O4O-WEB-ACCOUNT-ENTRY-FLOW-REGRESSION-V1.md)
- **선행 동기화:** origin/main 과 일치 (0 commits 차이) 확인. 기존 modified docs 는 평행 작업, 본 IR 과 무관.

---

## 0. 결론 요약 (TL;DR)

### 권장 판정: **축소 보존 (Option B)**

**핵심 발견 3 가지:**

1. ❌ **Handoff 의 generateHandoff / exchangeHandoff 는 "target service active membership" 을 검증하지 않는다.** Identity V2 §7.2 해석 A 의 전제 "단, 대상 서비스의 active membership 이 확인되어야 한다 (이미 그렇게 동작)" 는 **사실과 다름** — 코드는 그렇게 동작하지 않는다.
2. ⚠️ **Handoff 의 outbound 발급 호출처는 web-account/DashboardPage 1 곳뿐.** 4 user-facing service (KPA / GP / K-Cosmetics / Neture) 어느 곳에서도 outbound `/auth/handoff` 발급 호출 없음. 그러나 **inbound `/handoff` 페이지 (HandoffPage)** 는 5 service 모두 구현·라우트 등재.
3. ✅ **Handoff 자체가 V2 와 본질적으로 충돌하지는 않는다.** V2 §7.3 의 잠정 입장 (해석 A — Identity reuse, credential reuse 아님) 은 유효 — 단, 위 ① 의 갭만 채우면 정합.

→ **즉, 삭제 대상이 아니라 "정책 보존 + 안전판 추가" 가 정답.** Service Join API 가 instant active 우회를 pending 정책으로 정렬한 것과 동일한 V2 정합 작업이 Handoff 에도 필요.

| Option | 판단 |
|---|---|
| A. 보존 (현 상태) | ❌ V2 위반 (active membership 미검증) — 비추천 |
| **B. 축소 보존** | ✅ **추천** — V2 §7.2 해석 A 채택 + active membership 검증 추가 |
| C. 삭제 | ❌ 과잉 — V2 가 요구하지 않음. UX 손실 + 향후 web-account 활성화와 충돌 |
| D. 보류 | ⚪ 부분 채택 — Phase 6+ 의 "credential 재확인" 결정은 web-account 배포 결정 (별도 IR) 과 묶어 보류 |

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-23 |
| Repo 시점 | origin/main 와 일치 |
| 조사 범위 | apps/api-server + services/web-{account,kpa-society,glycopharm,k-cosmetics,neture} + packages |
| 도구 | Grep / Read (정적 분석) + Identity V2 doc 교차참조 |
| **수정 행위** | **없음** (조사 전용) |

---

## 2. 산출물 1 — Handoff API 구조 요약

### 2.1 라우트 등재 (`apps/api-server/src/modules/auth/routes/auth.routes.ts`)

```
POST /api/v1/auth/handoff          → HandoffController.generateHandoff   (requireAuth)
POST /api/v1/auth/handoff/exchange → HandoffController.exchangeHandoff   (public)
```

### 2.2 generateHandoff (`apps/api-server/src/modules/auth/controllers/handoff.controller.ts:32-82`)

| 단계 | 동작 | 검증 |
|---|---|:---:|
| 입력 | `targetServiceKey` (body), 인증된 user (req) | requireAuth 통과 필수 |
| 1 | user 존재 확인 | ✅ |
| 2 | targetServiceKey 존재 확인 | ✅ |
| 3 | `getService(targetServiceKey)` 카탈로그 조회 | ✅ (4 service 외 거부) |
| 4 | Origin header 로 sourceServiceKey 자동탐지 | ⚪ 정보용 (검증 아님) |
| 5 | `handoffTokenService.generateToken(userId, source, target)` | — |
| 6 | `targetUrl = https://{targetService.domain}/handoff?token={token}` | — |
| 7 | 응답 (handoffToken, targetUrl, targetService) | — |
| **❌ 누락** | **target service 의 active membership 검증** | **❌** |

### 2.3 exchangeHandoff (`apps/api-server/src/modules/auth/controllers/handoff.controller.ts:92-156`)

| 단계 | 동작 | 검증 |
|---|---|:---:|
| 입력 | `token` (body), 공개 — 토큰 자체가 인증 | 토큰 검증으로 대체 |
| 1 | Redis 에서 token payload 조회 + 단일 사용 (즉시 삭제) | ✅ |
| 2 | payload.userId 로 user 로드 | ✅ |
| 3 | **user.isActive** 확인 (계정 레벨) | ✅ |
| 4 | role_assignments 에서 roles 로드 | ✅ |
| 5 | service_memberships **전수** 로드 (status 무관) | ⚪ 필터 없음 |
| 6 | `generateTokens(user, roles, 'neture.co.kr', memberships)` | — |
| 7 | `setAuthCookies(req, res, tokens)` (Origin 으로 도메인 결정) | — |
| 8 | 응답 (user, tokens body 포함) | — |
| **❌ 누락** | **target service membership.status === 'active' 확인** | **❌** |

### 2.4 handoff-token.service.ts

| 항목 | 값 |
|---|---|
| Token 형식 | UUID v4 |
| 저장소 | **Redis** (`handoff:{tokenId}` key) |
| TTL | **60 초** |
| 단일 사용 | ✅ exchange 시 `redisService.del()` |
| Payload | `{ userId, sourceServiceKey, targetServiceKey, createdAt }` |
| 검증 | targetService 카탈로그 존재 확인 (generate 시) |

→ **token 자체는 안전** (single-use + 60s TTL + UUID). **문제는 token 발급/소비 전 membership 상태 검증의 부재.**

---

## 3. 산출물 2 — Handoff 호출처 목록

### 3.1 Outbound (POST /auth/handoff 발급)

**전 monorepo grep 결과 — 1 곳만 발견:**

| 위치 | 동작 |
|---|---|
| `services/web-account/src/pages/DashboardPage.tsx:65` | `fetch('/api/v1/auth/handoff', { method: 'POST', body: { targetServiceKey }})` — "열기" 버튼 |

→ **4 user-facing service (KPA / GP / K-Cosmetics / Neture) 어느 곳에서도 outbound handoff 발급 호출 없음.**

### 3.2 Inbound (POST /auth/handoff/exchange)

**5 service 모두 구현. 모두 HandoffPage 가 URL token query 를 받아 exchange 호출:**

| 서비스 | HandoffPage | exchange 후 저장 |
|---|---|---|
| web-account | `services/web-account/src/pages/HandoffPage.tsx:33` | cookie (credentials: include) |
| web-kpa-society | `services/web-kpa-society/src/pages/HandoffPage.tsx:37` | **localStorage** (`o4o_accessToken/refreshToken`) |
| web-glycopharm | `services/web-glycopharm/src/pages/HandoffPage.tsx:35` | **localStorage** (`glycopharm_access_token` / `glycopharm_refresh_token`) |
| web-k-cosmetics | `services/web-k-cosmetics/src/pages/HandoffPage.tsx:32` | **localStorage** (`o4o_accessToken/refreshToken`) |
| web-neture | `services/web-neture/src/pages/HandoffPage.tsx:32` | cookie (api client default) |

### 3.3 false-positive 제외

| 매칭 파일 | 사유 |
|---|---|
| `services/web-neture/src/lib/api/supplier.ts` | `targetServiceKey` 매칭 — 공급자 Event Offer 의 대상 서비스 식별용. handoff 무관. |
| `services/web-neture/src/pages/supplier/SupplierEventOfferPage.tsx` | 동일 — Event Offer 도메인. |

---

## 4. 산출물 3 — HandoffPage / route 등재 목록

| App.tsx | line | 등재 형태 |
|---|:---:|---|
| `services/web-account/src/App.tsx` | 10, 17 | direct import → `<Route path="/handoff" element={<HandoffPage />} />` |
| `services/web-kpa-society/src/App.tsx` | 24, 652 | **lazy** import → `<Route path="/handoff" element={<HandoffPage />} />` |
| `services/web-glycopharm/src/App.tsx` | 32, 406 | direct import → `<Route path="handoff" element={<HandoffPage />} />` (nested) |
| `services/web-k-cosmetics/src/App.tsx` | 36, 269 | direct import → `<Route path="handoff" element={<HandoffPage />} />` (nested) |
| `services/web-neture/src/App.tsx` | 50, 609 | direct import → `<Route path="/handoff" element={<HandoffPage />} />` |

→ **5 service 모두 `/handoff` 라우트 정상 등재.** SPA 진입 경로 측면에서 완비 상태.

---

## 5. 산출물 4 — 상태별 접근 가능성 표 (회원/Auth V2 정합성의 핵심)

> 본 표는 **현재 코드** 기준의 가능성이다. 표에서 ❌ 는 보안/정합 관점에서 차단되어야 할 케이스가 현재 차단되지 않음을 의미.

### 5.1 Handoff 발급 (POST /auth/handoff)

| 사용자 상태 (target service 기준) | 현재 동작 | V2 §7.2 해석 A 가 요구하는 동작 | Gap |
|---|---|---|:---:|
| target membership **active** | 발급 ✅ | 발급 ✅ | OK |
| target membership **pending** | 발급 ✅ | **차단** | ❌ |
| target membership **rejected** | 발급 ✅ | **차단** | ❌ |
| target membership **suspended** | 발급 ✅ | **차단** | ❌ |
| target membership **withdrawn** | 발급 ✅ | **차단 (보안)** | ❌ |
| target membership **부재** | 발급 ✅ | **차단** (가입 자체 없음) | ❌ |
| source service != active | 발급 ✅ | (별도 사안) | — |

### 5.2 Handoff 교환 (POST /auth/handoff/exchange)

| 사용자 상태 (target service 기준) | 현재 동작 | V2 가 요구하는 동작 | Gap |
|---|---|---|:---:|
| user.isActive=false (계정 잠금) | 차단 ✅ | 차단 ✅ | OK |
| target membership active | 교환 → 인증 토큰 발급 ✅ | 교환 ✅ | OK |
| target membership pending | 교환 → 인증 토큰 발급 ⚠️ | **차단** | ❌ |
| target membership withdrawn | 교환 → 인증 토큰 발급 ⚠️ | **차단** | ❌ |
| target membership 부재 | 교환 → 인증 토큰 발급 ⚠️ | **차단** | ❌ |
| token 만료/소비됨 | 차단 ✅ | 차단 ✅ | OK |

### 5.3 위협 시나리오 (현재 코드 기준)

1. **운영자 승인 대기 우회**: Service Join 으로 `pending` 인 사용자가 어떤 source service (예: KPA active) 에서 target=neture 로 handoff 요청 → 토큰 발급됨 → exchange → neture 의 인증 쿠키/토큰 획득. **Service Join API 의 instant active 우회를 pending 정렬로 차단한 동일 위협이 handoff 경로로 우회 가능.**
2. **탈퇴 사용자 재진입**: target membership=withdrawn 인 사용자가 다른 active source 에서 handoff 요청 → 차단되지 않음. (Join 경로에서는 명시적으로 차단되는 동일 케이스.)
3. **미가입 서비스 접근**: target membership 자체가 없는 사용자가 handoff 요청 → 토큰 발급 → exchange → 미가입 서비스의 인증 토큰 획득. (이론상 service-catalog 에 등록된 모든 서비스에서 발생 가능.)

→ **위 3 종 모두 Service Join API 의 V2 정합 작업과 정확히 짝을 이룬다.** Join 에서 pending 으로 정렬한 것과 동일한 검증을 Handoff 에 적용해야 정합.

---

## 6. 산출물 5 — web-account 와 Handoff 의 관계 판단

선행 CHECK 의 입력:
- web-account 는 현재 프로덕션 **미배포** (account-center-web revision 1 건, 2026-03-13 placeholder)
- 4 service 어디서도 web-account 로 가는 진입 링크 0 건
- outbound `/auth/handoff` 발급 호출은 web-account/DashboardPage **1 곳**

이로부터:

| 질문 | 답 | 근거 |
|---|---|---|
| Handoff 가 web-account 활성화에 필수인가? | ⚪ 부분적 필수 | web-account 의 "열기" 기능은 outbound handoff 발급에 의존. 다만 web-account 가 활성화돼야 그 호출이 실제 사용자에게 도달. |
| web-account 없이도 Handoff API 가 의미가 있는가? | ✅ 의미 있음 | inbound exchange 만으로도 의미가 있음 — 향후 OperatorDashboard / Admin / 기타 surface 에서 outbound 를 호출할 수 있고, 이 IR 시점에는 cross-service handoff 가 가능한 인프라가 존재한다는 의미 자체가 자산. |
| 각 서비스 `/mypage` 체계가 유지된다면 Handoff 필요성이 낮아지는가? | △ 부분적 | "다른 서비스로 점프하는 1-click UX" 가치만 줄어듦. 인프라 가치 (cross-service SSO) 는 유지. |
| 향후 web-account 배포 전략 IR 과 연결해야 하는가? | ✅ 연결 필수 | web-account 가 정식 배포되어야 outbound handoff 의 사용자 가치가 실현. 다만 본 IR 의 축소 보존 결정은 web-account 배포 결정과 독립적. |

→ **Handoff API 의 보존/축소 결정과 web-account 의 배포 결정은 분리 판단 가능.** Handoff 의 V2 정합화 (축소 보존) 는 web-account 가 미배포여도 즉시 의미가 있다 (인프라 정합 + 향후 활성화 시 안전).

---

## 7. 산출물 6 — Option A/B/C 비교표

### Option A — 보존 (현 상태 유지)

| 항목 | 평가 |
|---|---|
| 정의 | generateHandoff / exchangeHandoff 의 코드 변경 없이 그대로 둔다. |
| UX 장점 | 없음 (현 상태 유지) |
| 보안 위험 | ❌ **§5.3 의 3 종 위협 (운영자 승인 우회 / withdrawn 재진입 / 미가입 서비스 접근) 모두 차단되지 않음** |
| V2 정합성 | ❌ §7.2 해석 A 의 전제 충족 못함 |
| 구현 변경 | 0 |
| 권고 | ❌ **비추천** |

### Option B — 축소 보존 (V2 정합 + 안전판) ★ 권장

| 항목 | 평가 |
|---|---|
| 정의 | generateHandoff / exchangeHandoff 양쪽에 **"target service 의 service_memberships.status = 'active' 검증"** 을 추가. withdrawn / pending / rejected / suspended / 미가입 모두 차단. |
| UX 장점 | 정상 활용 (active membership 보유 서비스 간 SSO) 그대로 유지. 비정상 우회만 차단. |
| 보안 위험 | ✅ 3 종 위협 모두 차단 |
| V2 정합성 | ✅ §7.2 해석 A 채택 충족 |
| 구현 변경 | 최소 — handoff.controller.ts 2 함수 내 분기 추가 + (선택) 응답 코드/메시지 표준화. 마이그레이션/DB 변경 0. UI 변경 0. |
| 영향 파일 | `apps/api-server/src/modules/auth/controllers/handoff.controller.ts` (단일) |
| 회귀 위험 | 매우 낮음 — 기존 active 사용자에게는 동작 변경 없음 |
| 부가 권고 | (a) `getService(target).joinEnabled` 추가 검증 / (b) source 측 active membership 검증 (옵션) / (c) error code 표준화 (`HANDOFF_TARGET_NOT_ACTIVE`, `HANDOFF_TARGET_WITHDRAWN` 등) |
| 권고 | ✅ **추천 (즉시 WO 후보)** |

### Option C — 삭제

| 항목 | 평가 |
|---|---|
| 정의 | POST /auth/handoff / POST /auth/handoff/exchange / 5 service 의 HandoffPage / 라우트 모두 제거. web-account/DashboardPage 의 "열기" 버튼 제거 (혹은 redirect 로 대체). |
| UX 장점 | 없음 — UX 손실 |
| 보안 위험 | ✅ 위협 제거 (다만 Option B 가 같은 효과를 더 적은 변경으로 달성) |
| V2 정합성 | ✅ 충분 (해석 B 채택과 등가) — 그러나 V2 doc 은 해석 A 를 잠정 채택 |
| 구현 변경 | 큼 — 5 service Frontend + controller + routes + token service + Redis prefix 정리 |
| 회귀 위험 | 중간 (5 service 빌드/배포 영향) |
| 향후 영향 | web-account 가 활성화되어 cross-service 진입 UX 가 필요해질 때 다시 만들어야 함 |
| 권고 | ❌ 과잉. V2 doc 의 잠정 입장 (해석 A) 과 어긋남 |

### Option D — 보류 (Phase 6+ 까지)

| 항목 | 평가 |
|---|---|
| 정의 | Identity V2 Phase 6+ 의 "credential 검증 vs identity reuse 최종 결정" 까지 보류. 현 코드 그대로. |
| 보안 위험 | ❌ Option A 와 동일 |
| 권고 | ⚠️ **부분 채택 가능** — "최종 정책 (해석 A vs B)" 은 보류하되 **위협 차단 (active membership 검증)** 은 즉시 진행. 두 결정은 독립적. |

---

## 8. 산출물 7 — 권장 정책

### 8.1 즉시 정렬 (Option B = 축소 보존)

1. **generateHandoff 에 target service active membership 검증 추가**
   - `service_memberships WHERE user_id = $1 AND service_key = $targetServiceKey` 조회
   - status != 'active' 또는 row 부재 시 차단
   - withdrawn 은 별도 명시 차단 메시지 (보안 정책 유지)
2. **exchangeHandoff 에 동일 검증 추가**
   - payload.targetServiceKey 의 active membership 재확인
   - 이중 안전판 (generation 시점에 active 였다가 exchange 시점에 변경된 경우 차단)
3. **error code 표준화**
   - `HANDOFF_TARGET_NOT_ACTIVE` / `HANDOFF_TARGET_WITHDRAWN` / `HANDOFF_TARGET_NO_MEMBERSHIP`
4. **logger 보강** — 차단 사유를 audit log 로 명시 기록
5. **V2 doc 정정**
   - V2 §7.2 의 "(이미 그렇게 동작)" 표현을 "(본 정렬 WO 로 그렇게 동작하도록 보강)" 으로 정정. 또는 정렬 WO 가 종료된 후 표현 그대로 유지 + WO 인용.

### 8.2 보류 (Identity V2 Phase 6+ 까지)

- **해석 A vs B 의 최종 결정** — handoff 시 target service credential 재확인 여부.
- **handoff 결과 토큰의 권한 scope 정책** — 모든 service membership 을 항상 동봉할지, target 만 동봉할지.
- **web-account 활성화와의 연계** — outbound 발급 surface 가 web-account 외로 확대될지.

### 8.3 동시 보강 권고 (옵션)

- **outbound `/auth/handoff` 호출은 web-account/DashboardPage 1 곳만** 이라는 사실을 운영 가시성 차원에서 명시 (audit log 또는 metric).
- HandoffPage 의 localStorage strategy 가 service 별로 상이 (KPA/GP/KCos: localStorage / Neture/Account: cookie) — 본 IR 의 영역은 아니지만 별도 LOWER PRIORITY 정합 정리 항목.

---

## 9. 산출물 8 — 즉시 WO 후보

### 9.1 `WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1` (Option B 실행)

| 항목 | 내용 |
|---|---|
| 범위 | `apps/api-server/src/modules/auth/controllers/handoff.controller.ts` 만 |
| 코드 변경 | generateHandoff 에 active membership 검증 분기 + exchangeHandoff 에 동일 검증 + error code 표준화 |
| DB 변경 | 0 |
| Migration | 0 |
| UI 변경 | 0 |
| Frontend 영향 | 5 service HandoffPage 의 error 메시지 분기 (옵션) — 본 WO 미포함 가능 |
| 테스트 | 활성/비활성/pending/withdrawn/부재 5 케이스 + 회귀 (active 정상 동작) — 모두 백엔드 curl |
| 회귀 위험 | 매우 낮음 |
| 정합 기준 | Identity V2 §7.2 해석 A 채택 충족 |

### 9.2 후속 IR 후보 (즉시 WO 아님)

- `IR-O4O-WEB-ACCOUNT-DEPLOY-STRATEGY-V1` (선행 CHECK §5 가 제안한 별건)
- `IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1` (선행 CHECK §5 가 제안한 별건)
- `IR-O4O-HANDOFF-TOKEN-SCOPE-AUDIT-V1` — handoff 결과 토큰이 동봉하는 service scope 의 적정 범위 (Phase 6+ 정책 결정용)

---

## 10. 산출물 9 — 보류해야 할 항목

| 항목 | 보류 사유 | 해소 시점 |
|---|---|---|
| 해석 A vs B 최종 결정 (credential 재확인 정책) | Identity V2 §7.3 의 명시 — Phase 6+ 책임. 본 IR 의 즉시 작업과 독립. | Phase 6+ |
| handoff 결과 토큰의 권한 scope 범위 | V2 §7.3 의 "재합의 필요 항목" 명시 | Phase 6+ |
| outbound handoff surface 확대 (web-account 외) | web-account 배포 전략 IR 결정 의존 | `IR-O4O-WEB-ACCOUNT-DEPLOY-STRATEGY-V1` 후 |
| HandoffPage 의 localStorage vs cookie 정합 | 본 IR 범위 외 — 별도 LOWER PRIORITY | 별도 IR |
| Service Switcher 전반의 향후 위치 | `IR-O4O-SERVICE-SWITCHER-DEPRECATION-AUDIT-V1` 의 영역 | 이미 부분 처리됨 (Join API pending 정렬 완료) |

---

## 11. 산출물 10 — 현재 구조 vs O4O 철학 충돌 체크 ★

### 11.1 5개 철학 원칙 vs Handoff 현 상태 매트릭스

| # | O4O 철학 원칙 | Handoff 현 코드 | V2 §7.2 해석 A 채택 시 |
|---|---|:---:|:---:|
| 1 | 1 Email = 1 Identity | ✅ 정합 | ✅ 정합 |
| 2 | 서비스는 독립 사업자 | ⚠️ **부분 충돌** — 미가입/비active 서비스 접근 허용 | ✅ 정합 (active membership 검증 추가) |
| 3 | 회원은 서비스 범위에서 독립 | ⚠️ **부분 충돌** — pending/withdrawn 우회 가능 | ✅ 정합 |
| 4 | Credential 은 서비스 범위에서 독립 | △ 해석 A 에서는 무관 (Identity reuse), 해석 B 에서는 충돌 | △ 해석 A 채택으로 양립 |
| 5 | Role · 권한은 서비스 범위에서 독립 | ✅ 정합 (role_assignments 그대로) | ✅ 정합 |

→ **현재 Handoff 코드는 원칙 2 와 3 에 부분 충돌.** 축소 보존 (Option B) 으로 두 충돌 해소 가능.

### 11.2 Service Join 정렬과의 대칭성

선행 CHECK (`CHECK-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1`) 의 결과:
- Service Join 의 instant active 우회 → pending 정렬 ✅
- Switcher Join 의 결과 비대칭 회복 ✅

본 IR 의 발견:
- Handoff 의 동일 위협 (비active/withdrawn/미가입 우회 가능) 미해소 ❌
- Service Join 만 정렬되고 Handoff 가 그대로 두면 **새로운 비대칭** 발생

→ **Service Join 의 pending 정렬과 Handoff 의 active membership 검증은 동일한 V2 정합 작업의 짝이다.** 둘 중 하나만 처리하면 비대칭이 그대로 다른 surface 로 옮겨갈 뿐.

### 11.3 현 구조 코드가 V1 잔재인지

- handoff 코드의 WO tag: `WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1` — V1 시대 작업
- V1 의 모델 (공통 password) 에서는 "user.isActive 만 확인하면 충분" 이라는 사고가 자연스러움
- V2 의 모델 (service-scoped credential + service-scoped membership) 에서는 같은 사고가 약함

→ **현 Handoff 코드는 V1 사고가 그대로 남아 있는 구조.** V2 정합 보강이 필요. 다만 V1 → V2 의 차이는 "Credential" 측면 (원칙 4) 이고 본 IR 이 다루는 "Membership" 측면 (원칙 2, 3) 은 V1 시점에서도 검증했어야 할 것이라는 점은 별개 — 즉 본 IR 의 정렬은 V2 가 아니더라도 V1 시점에서도 누락된 부분이었다.

---

## 12. 최종 판정

> **축소 보존 (Option B).**
>
> Handoff API 와 5 service HandoffPage 는 **삭제 대상이 아니다.** Identity V2 §7.3 의 잠정 입장 (해석 A — Handoff 는 Identity reuse) 을 채택하되, V2 §7.2 의 명시 전제 ("대상 서비스의 active membership 이 확인되어야 한다") 가 현재 코드에서 **실제로 충족되도록 보강**해야 한다.
>
> 즉시 WO 후보는 `WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1` 1 건. 영향 파일은 controller 단일, DB·migration·UI 변경 0.
>
> 해석 A vs B 의 최종 결정 (credential 재확인 정책) 은 Phase 6+ 의 책임으로 **보류**.

---

## 13. 본 IR 이 결정하지 않는 것

- Handoff WO 의 실제 실행 — 본 IR 은 조사만, 코드 변경은 후속 WO 의 책임.
- web-account 의 배포/위치 결정 — `IR-O4O-WEB-ACCOUNT-DEPLOY-STRATEGY-V1` (별건 제안) 의 영역.
- `/mypage` vs `account-center` 의 canonical 결정 — `IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1` (별건 제안) 의 영역.
- HandoffPage 의 localStorage vs cookie 통일 — 별도 LOWER PRIORITY.
- Phase 6+ 의 "credential 재확인 정책" 최종 결정.

---

## 부록 A — 조사 명령 (재현 가능)

```bash
# Handoff 호출처 전체 grep
grep -rn "/auth/handoff" services/

# HandoffPage 라우트 등재 확인
grep -rn "HandoffPage\|path=['\"]\\/handoff" services/*/src/App.tsx

# 백엔드 라우트
grep -n "handoff" apps/api-server/src/modules/auth/routes/auth.routes.ts

# membership status 검증 누락 확인
grep -n "withdrawn\|pending\|suspended\|active" \
  apps/api-server/src/modules/auth/controllers/handoff.controller.ts
# → 모든 매칭이 joinService 안에 있고 generateHandoff/exchangeHandoff 에는 없음 확인
```

## 부록 B — V2 §7.2 해석 A 의 전제 문장 원문 인용

> "**단, 대상 서비스의 active membership 이 확인되어야 한다 (이미 그렇게 동작)**"
>
> — [O4O-IDENTITY-ARCHITECTURE-V2.md §7.2](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md), 2026-05-23

본 IR §2.2, §2.3, §5 의 발견은 위 인용의 후반부 "(이미 그렇게 동작)" 이 현 코드 상 **실제로는 그렇게 동작하지 않음**을 보고한다. 본 IR 종료 후 정렬 WO 가 그 갭을 닫으면 인용은 정확해진다.

---

*Created: 2026-05-23*
*Type: Investigation Report (read-only)*
*Status: 조사 완료 — 권장 판정 "축소 보존 (Option B)" + 즉시 WO 후보 1 건 제시*
*Decision Required: Option B 실행 승인 → `WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1` 진입*
