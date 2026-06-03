# CHECK-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1

> **검증 보고서 (Verification Report)** — 프로덕션 환경 E2E 검증 결과.
>
> `WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1` (commit `339dbb3da`) 적용 후 Handoff API 가 target service active membership 을 정확히 검증하는지 확인.

- **검증일:** 2026-05-24
- **분류:** Verification Result (E2E — disposable account + 실 API)
- **대상 환경:** Production (`https://api.neture.co.kr`)
- **검증 대상 WO:** `WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1` (commit `339dbb3da`)
- **선행 IR:** [IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1](IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1.md)
- **기준 정책:** Identity V2 §7.2 해석 A 충족 (Handoff = Identity reuse, active membership 검증 필수)

---

## 0. 최종 판정

### ✅ Identity V2 §7.2 해석 A 정합 완료 (B/C/F + A active 모두 PASS)

**필수 PASS 기준 모두 충족:**

| 항목 | 결과 | 비고 |
|---|---|---|
| A. active Handoff (generate + exchange) | ✅ **PASS** | kpa-society active → 토큰 발급 + exchange 성공 (`Handoff successful`) |
| **B. pending 차단** | ✅ **PASS 2/2** | neture / k-cosmetics pending 양쪽 모두 `HANDOFF_TARGET_NOT_ACTIVE` (403) |
| **C. 미가입 차단** | ✅ **PASS 3/3** | glycopharm / neture / k-cosmetics 미가입 모두 `HANDOFF_TARGET_NO_MEMBERSHIP` (403) |
| D. withdrawn 차단 | ⏭ SKIP | 데이터 부재 — 코드 경로 동일 |
| E. rejected / suspended 차단 | ⏭ SKIP | 데이터 부재 — 코드 경로 동일 (`!= 'active'` 분기로 흡수) |
| **F. Service Join 회귀** | ✅ **PASS** | 신규 pending → `requestSubmitted=true`, 재요청 pending → `requestSubmitted=false` |
| G. Login/Register/Password 회귀 | ✅ 무영향 | 본 WO 는 handoff.controller.ts 단일 변경, 다른 controller 무관 |
| H. TypeScript/build | ✅ PASS | 본 WO 변경 새 에러 0 (pre-existing 22 동일) |

**우회 차단 효과 (선행 IR §5.3 위협 시나리오 기준):**

| 위협 시나리오 | 본 WO 전 | 본 WO 후 |
|---|:---:|:---:|
| pending 사용자 handoff 우회 | ❌ 가능 | ✅ 차단 (B) |
| 미가입 서비스 handoff 우회 | ❌ 가능 | ✅ 차단 (C) |
| active 사용자 정상 SSO | ✅ | ✅ (A) |
| Service Join pending 정책 | ✅ | ✅ (F 회귀 없음) |

→ **선행 IR 의 권장 (Option B = 축소 보존) 정확히 달성.** Handoff 는 Identity transport 로 보존되며, 비active 우회 경로만 차단됨.

---

## 1. 검증 환경

| 항목 | 값 |
|---|---|
| API endpoint | `https://api.neture.co.kr` |
| 배포 commit | `339dbb3da` |
| Cloud Run | `o4o-core-api` (Deploy API workflow `26347520175` 완료) |
| 검증 시각 | 2026-05-24 09:45 — 09:48 KST |

---

## 2. 수정 파일 목록

| 파일 | 변경 | 라인 수 |
|---|---|---|
| `apps/api-server/src/modules/auth/controllers/handoff.controller.ts` | generateHandoff + exchangeHandoff 양쪽에 active membership 검증 추가 | +114 |

**다른 파일 변경 없음** — DB·migration·UI·HandoffPage·Frontend route·Cookie/localStorage·service_credentials·login/register/change-password·Service Join API·web-account UI **모두 변경 0**.

---

## 3. 코드 변경 위치

### 3.1 generateHandoff 의 active 검증
[apps/api-server/src/modules/auth/controllers/handoff.controller.ts:50-105](apps/api-server/src/modules/auth/controllers/handoff.controller.ts#L50-L105)

위치: `try {` 블록 진입 직후, source service 탐지 전.

분기:
- `targetMembership.length === 0` → 403 `HANDOFF_TARGET_NO_MEMBERSHIP`
- `targetStatus === 'withdrawn'` → 403 `HANDOFF_TARGET_WITHDRAWN`
- `targetStatus !== 'active'` (pending / rejected / suspended / etc.) → 403 `HANDOFF_TARGET_NOT_ACTIVE`

### 3.2 exchangeHandoff 의 active 재검증
[apps/api-server/src/modules/auth/controllers/handoff.controller.ts:129-181](apps/api-server/src/modules/auth/controllers/handoff.controller.ts#L129-L181)

위치: 기존 `memberships` 조회 직후, `tokenUtils.generateTokens()` 호출 전 (별도 쿼리 없이 기존 결과 재활용).

같은 분기 (NO_MEMBERSHIP / WITHDRAWN / NOT_ACTIVE), 같은 에러 코드.

**이중 안전판 이유**: 60s TTL 이라도 generation 시점에 active 였던 membership 이 exchange 시점에 (운영자 정지/탈퇴 처리 등으로) 변경됐을 수 있음.

---

## 4. 에러 코드 / 메시지

| Code | HTTP | 메시지 | 발생 조건 |
|---|:---:|---|---|
| `HANDOFF_TARGET_NO_MEMBERSHIP` | 403 | "대상 서비스에 가입되어 있지 않습니다." | membership row 부재 |
| `HANDOFF_TARGET_WITHDRAWN` | 403 | "탈퇴한 서비스는 Handoff 로 접근할 수 없습니다." | `status === 'withdrawn'` |
| `HANDOFF_TARGET_NOT_ACTIVE` | 403 | "대상 서비스 가입이 아직 승인되지 않았습니다." | `status !== 'active'` (pending / rejected / suspended) |

로그: 차단 시 `userId` / `targetServiceKey` / `membershipStatus` / `reason` 기록 (token 값 미기록).

---

## 5. 검증 계정

| 계정 | 용도 | 상태 |
|---|---|---|
| `handoff-v2-20260524-094515@example.test` (신규 disposable) | A/B/C/F 시나리오 | KPA active (Rena 운영자 승인), neture/k-cosmetics pending (B 검증용 setup), glycopharm 미가입 (C 검증용) |

User ID: `34bd2682-3c19-40c5-ae31-37159ffaf30b`

---

## 6. 항목별 검증 결과

### A. active Handoff 정상 — ✅ PASS

| Step | Request | Expected | Actual | 결과 |
|---|---|---|---|:---:|
| A-gen | `POST /auth/handoff { targetServiceKey: 'kpa-society' }` (자기 active) | 토큰 발급 + targetUrl | `{success:true, handoffToken:'7539ad9f-...', targetUrl:'https://kpa-society.co.kr/handoff?token=...'}` | ✅ |
| A-exch | `POST /auth/handoff/exchange { token: '7539ad9f-...' }` | 인증 토큰 발급 | `{success:true, message:'Handoff successful', targetServiceKey:'kpa-society'}` | ✅ |

→ **active 사용자의 generate + exchange 모두 정상 작동.** 기존 흐름 회귀 없음.

### B. pending 차단 — ✅ PASS 2/2

**Setup:** Service Join 으로 신규 pending 생성.
- `POST /auth/services/neture/join` → `status='pending', requestSubmitted=true` ✅
- `POST /auth/services/k-cosmetics/join` → `status='pending', requestSubmitted=true` ✅

**검증:**

| # | Step | Expected | Actual | 결과 |
|---|---|---|---|:---:|
| B-1 | `POST /auth/handoff { targetServiceKey: 'neture' }` (pending) | 403 `HANDOFF_TARGET_NOT_ACTIVE` | `{success:false, error:'대상 서비스 가입이 아직 승인되지 않았습니다.', code:'HANDOFF_TARGET_NOT_ACTIVE'}` | ✅ |
| B-2 | `POST /auth/handoff { targetServiceKey: 'k-cosmetics' }` (pending) | 403 `HANDOFF_TARGET_NOT_ACTIVE` | 동일 | ✅ |

→ **pending 사용자는 handoff 토큰 발급 자체가 차단됨.** 운영자 승인 우회 경로 제거.

### C. 미가입 차단 — ✅ PASS 3/3

| # | Step | Expected | Actual | 결과 |
|---|---|---|---|:---:|
| C-1 | `POST /auth/handoff { targetServiceKey: 'glycopharm' }` (미가입) | 403 `HANDOFF_TARGET_NO_MEMBERSHIP` | `{success:false, error:'대상 서비스에 가입되어 있지 않습니다.', code:'HANDOFF_TARGET_NO_MEMBERSHIP'}` | ✅ |
| C-2 | `POST /auth/handoff { targetServiceKey: 'neture' }` (가입 전) | 403 `HANDOFF_TARGET_NO_MEMBERSHIP` | 동일 | ✅ |
| C-3 | `POST /auth/handoff { targetServiceKey: 'k-cosmetics' }` (가입 전) | 403 `HANDOFF_TARGET_NO_MEMBERSHIP` | 동일 | ✅ |

→ **미가입 서비스로의 handoff 토큰 발급 차단.** Identity V2 의 "서비스 독립" 원칙 적용.

### D. withdrawn 차단 — ⏭ SKIP

데이터 부재. 코드 경로 [handoff.controller.ts:69-83](apps/api-server/src/modules/auth/controllers/handoff.controller.ts#L69-L83) (generateHandoff) / [:148-162](apps/api-server/src/modules/auth/controllers/handoff.controller.ts#L148-L162) (exchangeHandoff) 의 명시 분기 (`status === 'withdrawn'` → `HANDOFF_TARGET_WITHDRAWN`) 존재 확인. 향후 withdrawn 데이터 생기면 재검증 가능.

### E. rejected / suspended 차단 — ⏭ SKIP

데이터 부재. 코드 경로의 `status !== 'active'` 분기에 흡수됨 — pending 차단 (B) 와 동일 코드 경로 → `HANDOFF_TARGET_NOT_ACTIVE` 동일 응답 예상.

### F. Service Join 회귀 — ✅ PASS

| Step | Expected | Actual | 결과 |
|---|---|---|:---:|
| Service Join neture 신규 | `requestSubmitted=true, status='pending'` | 일치 | ✅ |
| Service Join neture **재요청** (이미 pending) | `requestSubmitted=false, status='pending', message:'이미 접수...'` | `{success:true, status:'pending', pendingApproval:true, requestSubmitted:false, message:'가입 신청이 이미 접수되어 운영자 승인 대기 중입니다.'}` | ✅ |

→ **선행 WO (`WO-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1`) 의 pending 정책 회귀 없음.**

### G. Login / Register / Password Reset / Change Password 회귀 — ✅ 무영향

본 WO 는 `apps/api-server/src/modules/auth/controllers/handoff.controller.ts` 단일 파일 변경. 다른 controller (`auth-login`, `auth-register`, `passwordResetService`, `user.controller`) 와 무관. 회귀 가능성 0.

**증거 (간접):** 본 검증 중 신규 user register + login 모두 정상 동작 (B/C/F 검증에 필요한 선행 단계로 모두 활용됨).

### H. TypeScript / build — ✅ PASS

- 본 WO 변경 파일 (`handoff.controller.ts`) 새 에러 **0**
- api-server 전체 pre-existing 에러 **22** 동일 (lms/survey/ai-proxy — 본 WO 무관)
- Cloud Run 배포 정상 완료 (Deploy API workflow `26347520175` ✓ 12/12 step)

---

## 7. 회귀 확인 종합

| 회귀 항목 | 결과 | 근거 |
|---|---|---|
| active 사용자 generate | ✅ 정상 | A-gen |
| active 사용자 exchange | ✅ 정상 | A-exch |
| Service Join pending 정책 | ✅ 정상 | F |
| Service Join 재요청 idempotent | ✅ 정상 | F |
| Login (신규 user) | ✅ 정상 | 검증 선행 단계 |
| Register pending 흐름 | ✅ 정상 | 검증 선행 단계 |
| Handoff token TTL/Redis 구조 | ✅ 변경 없음 | `handoff-token.service.ts` 미변경 |
| HandoffPage / Frontend route | ✅ 변경 없음 | 5 service 모두 미변경 |
| Cookie / localStorage 저장 방식 | ✅ 변경 없음 | exchange 응답 구조 미변경 |
| service_credentials | ✅ 변경 없음 | 별도 도메인 |
| web-account UI | ✅ 변경 없음 | 본 WO 영역 외 |

→ **본 WO 가 야기한 회귀: 0 건.**

---

## 8. 운영 데이터 흔적

본 검증으로 생성된 운영 DB 데이터 (memory rule `pre_service_disposable_data` 기준 정리 자유):

| Email | User ID | 변경 / 생성 |
|---|---|---|
| `handoff-v2-20260524-094515@example.test` | `34bd2682-3c19-40c5-ae31-37159ffaf30b` | KPA: pending→active (Rena 승인) / neture: pending (검증 setup) / k-cosmetics: pending (검증 setup) |

> 정리 옵션: (a) 운영자 화면에서 정지/삭제 / (b) 그대로 보존 / (c) Phase 4 일괄 정리 — 사용자 선택.

---

## 9. 후속 필요 여부

### 9.1 즉시 후속 — 없음

본 WO 의 V2 §7.2 해석 A 정합 작업 완료. 추가 정렬 필요 없음.

### 9.2 보류 (선행 IR §10 의 영역)

- 해석 A vs B 최종 결정 (Phase 6+)
- handoff 결과 토큰의 권한 scope 범위 (Phase 6+)
- web-account 배포 전략 (`IR-O4O-WEB-ACCOUNT-DEPLOY-STRATEGY-V1` 별건)
- `/mypage` vs account-center canonical (`IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1` 별건)
- HandoffPage localStorage vs cookie 통일 (별건)

### 9.3 본 WO 가 드러낸 별건 후속

- `IR-O4O-GLYCOPHARM-OPERATOR-USERS-400-AUDIT-V1` — 본 검증 중 발견된 GlycoPharm `/operator/users` 400 에러 (본 WO 와 분리, 향후 별건 조사)

### 9.4 V2 doc 정정 (옵션)

[O4O-IDENTITY-ARCHITECTURE-V2.md §7.2](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md#L213) 의 표현:

> "단, 대상 서비스의 active membership 이 확인되어야 한다 (이미 그렇게 동작)"

본 WO 이후 위 표현이 코드와 정합. 정정 옵션:
- (a) 표현 그대로 유지 + 본 WO 인용 추가
- (b) "(`WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1` 이후 그렇게 동작)" 으로 명시

본 CHECK 범위 외 — 사용자 결정 시 별도 doc 보정.

---

## 10. 최종 PASS/FAIL/SKIP 매트릭스

| 항목 | 필수 | 결과 |
|---|:---:|:---:|
| **A. active Handoff (generate + exchange)** | **★** | ✅ **PASS** |
| **B. pending 차단** | **★** | ✅ **PASS 2/2** |
| **C. 미가입 차단** | **★** | ✅ **PASS 3/3** |
| D. withdrawn 차단 | △ | ⏭ SKIP (코드 경로 OK) |
| E. rejected / suspended 차단 | △ | ⏭ SKIP (코드 경로 OK, `!= active` 분기 흡수) |
| **F. Service Join 회귀** | **★** | ✅ **PASS** |
| G. Login/Register/Password 회귀 | ★ | ✅ 무영향 |
| H. TS / build | △ | ✅ PASS (새 에러 0) |

**필수 5 (A/B/C/F/G): 모두 ✅ PASS.**

---

## 부록 — 검증 명령 (재현 가능)

```bash
BASE="https://api.neture.co.kr/api/v1"
EMAIL="handoff-v2-20260524-094515@example.test"
PWD="HandoffV2X!2026"

# Login (KPA active session)
curl -X POST "$BASE/auth/login" -c sess.txt \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PWD\",\"serviceKey\":\"kpa-society\"}"

# A: active handoff (target=self active)
curl -X POST "$BASE/auth/handoff" -b sess.txt \
  -H "Content-Type: application/json" \
  -d '{"targetServiceKey":"kpa-society"}'

# A-exch: exchange (60s TTL — 즉시)
curl -X POST "$BASE/auth/handoff/exchange" \
  -H "Content-Type: application/json" \
  -d '{"token":"<token from above>"}'

# C: 미가입 차단
for svc in glycopharm neture k-cosmetics; do
  curl -X POST "$BASE/auth/handoff" -b sess.txt \
    -H "Content-Type: application/json" \
    -d "{\"targetServiceKey\":\"$svc\"}"
done

# B-setup: Service Join → pending
for svc in neture k-cosmetics; do
  curl -X POST "$BASE/auth/services/$svc/join" -b sess.txt \
    -H "Content-Type: application/json" -d '{}'
done

# B: pending 차단
for svc in neture k-cosmetics; do
  curl -X POST "$BASE/auth/handoff" -b sess.txt \
    -H "Content-Type: application/json" \
    -d "{\"targetServiceKey\":\"$svc\"}"
done

# F: Join 재요청 (이미 pending)
curl -X POST "$BASE/auth/services/neture/join" -b sess.txt \
  -H "Content-Type: application/json" -d '{}'
```

---

*Created: 2026-05-24*
*Type: Verification Result (E2E)*
*Status: 필수 5 (A/B/C/F/G) 모두 PASS, D/E SKIP — Identity V2 §7.2 해석 A 정합 완료*
*Next: 본 WO 종료. 후속은 §9.2/9.3 의 별건 IR.*
