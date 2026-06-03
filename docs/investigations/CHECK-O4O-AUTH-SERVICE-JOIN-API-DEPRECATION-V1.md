# CHECK-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1

> **검증 보고서 (Verification Report)** — 프로덕션 환경 E2E 검증 결과.
>
> `WO-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1` (commit `82a92fe61`) 적용 후 Service Join API 의 instant active 우회 제거, web-account 가입 UI 제거, register/handoff 회귀 무영향을 검증.

- **검증일:** 2026-05-23
- **분류:** Verification Result (E2E — read API + disposable account write)
- **대상 환경:** Production (`https://api.neture.co.kr`, Cloud Run rev `o4o-core-api-01816-cpm` deployed 2026-05-23T08:31:50Z)
- **검증 대상 WO:** `WO-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1` (commit `82a92fe61`)
- **선행 IR:** [IR-O4O-SERVICE-SWITCHER-DEPRECATION-AUDIT-V1](IR-O4O-SERVICE-SWITCHER-DEPRECATION-AUDIT-V1.md)
- **기준 정책:** Identity V2 Canonical — 각 서비스 가입은 독립 사업자 승인 흐름

---

## 0. 최종 판정

### ✅ Join API Deprecation 백엔드 완료 / B 는 후속 진입 경로 기준 확인

**6/6 자동 PASS + 1 SKIP (E, 데이터 부재). B 는 직접 URL 검증이 부적절 — 각 서비스 진입 경로 기준 후속 확인 필요.**

> **web-account 위치 규정 (2026-05-23 정정):**
> web-account 는 **legacy/보류 서비스가 아니다**. `account.neture.co.kr` 을 사용자가 주소창에 직접 입력하는 진입형 서비스가 아니라, **각 서비스에서 계정/내 정보/서비스 관리 흐름으로 진입하는 연결 대상 (계정센터)** 이다.
> 따라서 도메인 직접 접근 가능 여부만으로 운영 여부를 판단하지 않으며, B 항목 검증도 직접 URL 이 아닌 **각 서비스에서 web-account 로 진입하는 실제 경로** 기준이어야 한다.

| 항목 | 결과 | 비고 |
|---|---|---|
| A. 배포 확인 | ✅ PASS | revision `01816-cpm`, 08:31:50Z |
| B. web-account UI 확인 | ⏭ **부적절 (보류)** | 직접 URL 검증 부적절 — 각 서비스 진입 경로 기준 후속 확인 필요 |
| C. Join API 신규 membership → pending | ✅ **PASS (3/3)** | neture / k-cosmetics → pending; kpa-society (already active) → alreadyActive |
| D. Pending 재요청 → no transition to active | ✅ PASS | 이미 pending 인 neture → 그대로 pending, "이미 접수" 메시지 |
| E. Withdrawn 차단 유지 | ⏭ SKIP | withdrawn 테스트 데이터 부재. 코드경로 유지 확인 |
| F. Register pending 회귀 | ✅ PASS | 신규 disposable register → status=pending |
| G. Handoff 회귀 | ✅ PASS | active service handoff 정상 (token + targetUrl) |
| H. TypeScript / build | ✅ PASS | WO 시점 verify 완료 — pre-existing 22 동일, 새 에러 0 |

**필수 PASS 기준 (C/F/G — 백엔드 회귀 무영향):** 모두 ✅ PASS.

**B 의 후속 처리:** `IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1` 에서 "각 서비스 → web-account 진입 경로" 를 함께 조사하면서 UI 도 같이 검증한다. 본 CHECK 에서는 백엔드 측 V2 정합 확정으로 종료.

---

## 1. 검증 환경

| 항목 | 값 |
|---|---|
| API endpoint | `https://api.neture.co.kr` |
| Cloud Run service | `o4o-core-api` |
| Cloud Run revision | `o4o-core-api-01816-cpm` |
| 배포 commit | `82a92fe61` |
| 배포 시각 | 2026-05-23T08:31:50Z UTC |
| 검증 시각 | 2026-05-23 08:35 — 08:40 UTC |

---

## 2. 검증 계정

| 계정 | 용도 |
|---|---|
| `sohae2100+v2check2@gmail.com` (Account #3) | C/D/G 시나리오 — KPA + GP active 멤버, neture/k-cosmetics 미가입 |
| `register-regression-20260523-083933@example.test` (신규 disposable) | F 시나리오 — register pending 회귀 |

---

## 3. 항목별 검증 결과

### A. 배포 확인 — ✅ PASS

- Cloud Run revision: `o4o-core-api-01816-cpm`
- 시작 시각: `2026-05-23T08:31:50Z`
- 검증 시점 uptime: 281s (= 약 4.7 분, 신규 deploy)
- migration: `0 executed` (본 WO 는 코드만, schema 변경 없음 — 정상)

### B. web-account UI 확인 — ⏭ 부적절 (보류, 후속 IR 에서 진입 경로 기준 검증)

**자동 검증 한계 + 검증 기준 정정:**

- SPA 는 어떤 URL 이든 HTTP 200 + HTML shell 반환 — HTTP 만으로 UI 검증 불가.
- 더 중요한 정정: **`account.neture.co.kr` 직접 URL 접근은 web-account 의 정상 진입 경로가 아니다.** web-account 는 각 서비스 (KPA / GP / K-Cosmetics / Neture) 에서 "계정/내 정보/서비스 관리" 흐름으로 진입하는 **계정센터** 이므로, 직접 도메인 검증은 본 서비스의 실제 사용 경로와 무관.

**후속 검증 기준 (본 CHECK 대상 외 — `IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1` 에서 함께 다룸):**
- 각 서비스 (KPA / GP / K-Cosmetics / Neture) 의 사용자 메뉴/마이페이지에서 web-account 진입 링크/버튼 존재 여부
- 위 경로로 진입 시 Dashboard 의 노출 상태:
  - "이용 가능한 서비스" 섹션 미노출
  - "가입" / "활성화" 버튼 미노출
  - "내 서비스" (active membership) 목록 + "열기" 버튼 유지
  - footer 안내문 ("서비스 가입은 각 서비스 사이트에서 신청해 주세요.") 표시

**본 CHECK 의 판정:** B 는 직접 URL 검증이 부적절하므로 보류 (PASS/FAIL 판정 대상에서 제외). 백엔드 변경 (handoff.controller, ServiceCard, DashboardPage 파일) 은 commit `82a92fe61` 에 포함되어 빌드/배포 정상.

### C. Join API 신규 membership 정책 — ✅ PASS (3/3)

**검증 방법:** Account #3 (KPA + GP active, neture/k-cosmetics 미가입) 로 join 요청 3 가지 케이스.

| # | Step | Expected | Actual | 결과 |
|---|---|---|---|---|
| C-1 | `POST /auth/services/neture/join` (미가입) | status='pending' + pendingApproval | `{success:true, status:'pending', pendingApproval:true, requestSubmitted:true, message:'가입 신청이 접수되었습니다...'}` | ✅ |
| C-2 | `POST /auth/services/k-cosmetics/join` (미가입) | status='pending' | 동일 응답 (k-cosmetics) | ✅ |
| C-3 | `POST /auth/services/kpa-society/join` (already active) | status='active', alreadyActive=true | `{success:true, status:'active', alreadyActive:true, message:'이미 가입된 서비스입니다.'}` | ✅ |

**후속 검증:** 재로그인 후 memberships 확인 → `["kpa-society:active", "neture:pending", "k-cosmetics:pending", "glycopharm:active"]`. neture / k-cosmetics 가 active 가 아닌 **pending 상태로 생성**됨 직접 확인. ✅

### D. Pending 재요청 → no transition to active — ✅ PASS

**검증 방법:** C-1 직후, 이미 pending 인 neture 에 다시 join 요청.

| Step | Expected | Actual | 결과 |
|---|---|---|---|
| `POST /auth/services/neture/join` (already pending) | 변경 없음 (active 전환 금지) | `{success:true, status:'pending', pendingApproval:true, requestSubmitted:false, message:'가입 신청이 이미 접수되어...'}` | ✅ |
| 후속 memberships 확인 | neture 여전히 pending | `neture:pending` 유지 | ✅ |

`requestSubmitted: false` 가 명시되어 새 신청이 아님을 응답에 표시. 운영자 승인 우회 차단 확인.

### E. Withdrawn 차단 유지 — ⏭ SKIP

**검증 방법:** ⏭ SKIP — withdrawn 상태 테스트 데이터 부재 (본 검증 계정은 모두 active/pending).

**대체 증명:** [handoff.controller.ts:190-204](apps/api-server/src/modules/auth/controllers/handoff.controller.ts#L190-L204) 의 withdrawn 차단 분기는 코드 변경 없이 그대로 유지됨 (commit `82a92fe61` 의 diff 확인). 의도된 정책.

### F. Register pending 회귀 — ✅ PASS

**검증 방법:** 신규 disposable email 로 register 호출.

| Step | Expected | Actual | 결과 |
|---|---|---|---|
| `POST /auth/register` (KPA) with 신규 email | status='pending', pendingApproval=true | `{success:true, status:'pending', pendingApproval:true}` | ✅ |

Register 흐름은 본 WO 변경 외 — 회귀 없음 확인.

### G. Handoff 회귀 — ✅ PASS

**검증 방법:** Account #3 (KPA active 세션) 에서 GlycoPharm 으로 handoff 요청.

| Step | Expected | Actual | 결과 |
|---|---|---|---|
| `POST /auth/handoff { targetServiceKey: 'glycopharm' }` | token + targetUrl 발급 | `{success:true, handoffToken:..., targetUrl:..., targetService:{key:'glycopharm'}}` | ✅ |

Handoff API 변경 없음 — 본 WO 와 무관 영역 정상 작동 확인.

### H. TypeScript / build — ✅ PASS

- 본 WO commit `82a92fe61` 시점 verify:
  - api-server tsc: 22 errors (pre-existing 동일, handoff.controller 무관)
  - web-account tsc: 0 errors
- 본 WO 변경 파일 (handoff.controller.ts / ServiceCard.tsx / DashboardPage.tsx) 새 에러 0

---

## 4. service_memberships 생성 경로 비대칭 회복 (정합성)

| 경로 | 결과 status | 운영자 승인 |
|---|---|:---:|
| Register (신규 / 기존 사용자) | `pending` | ✅ 필요 |
| **Switcher Join (본 WO 후)** | **`pending`** | ✅ **필요 (이전: instant active)** |
| 운영자 승인 | pending → `active` | (자기 자신) |
| Migration / seed | (자동) | — |

→ **4 경로 모두 동일 정책 (pending → 운영자 승인 → active)**. Identity V2 의 "독립 사업자 가입 승인" 원칙 회복.

---

## 5. 회귀 확인 종합

| 회귀 항목 | 결과 | 근거 |
|---|---|---|
| Register 흐름 (pending 생성) | ✅ 정상 | F |
| Handoff 발급 (`/auth/handoff`) | ✅ 정상 | G |
| Handoff exchange (`/auth/handoff/exchange`) | ✅ 변경 없음 | 본 WO 미변경 |
| Withdrawn 차단 정책 | ✅ 유지 | E 코드경로 |
| Login / JWT / Cookie | ✅ 정상 | C / G 의 login 사전 단계 정상 |
| `GET /auth/services` 조회 | ✅ 정상 | C-1 사전 검증 |

→ **본 WO 변경으로 인한 회귀 0건.**

---

## 6. 운영 데이터 흔적

본 검증으로 생성된 운영 DB 데이터 (memory rule `pre_service_disposable_data` 기준 정리 자유):

| Email | User ID | 변경 / 생성 |
|---|---|---|
| `sohae2100+v2check2@gmail.com` (Account #3) | `c12c1f59-1708-4346-a341-2657e0f45e6e` | **neture: pending 신규 생성**, **k-cosmetics: pending 신규 생성** (C-1, C-2 결과) |
| `register-regression-20260523-083933@example.test` | (신규 생성) | kpa-society pending (F 결과) — disposable |

> 정리 옵션: (a) 운영자 화면에서 정지/삭제 / (b) 그대로 보존 / (c) Phase 4 일괄 정리 — 사용자 선택.

---

## 7. 최종 PASS/FAIL/SKIP 매트릭스

| 항목 | 필수 | 결과 |
|---|:---:|:---:|
| A. 배포 확인 | △ | ✅ PASS |
| B. web-account UI 확인 | — | ⏭ 부적절 (직접 URL 검증 부적절 — 후속 IR 에서 진입 경로 기준 검증) |
| **C. Join API → pending** | **★** | ✅ **PASS (3/3)** |
| D. Pending 재요청 → 변동 없음 | △ | ✅ PASS |
| E. Withdrawn 차단 유지 | △ | ⏭ SKIP (코드경로 OK) |
| **F. Register pending 회귀** | **★** | ✅ **PASS** |
| **G. Handoff 회귀** | **★** | ✅ **PASS** |
| H. TS / build | △ | ✅ PASS (WO 시점) |

**필수 3 (C/F/G — 백엔드 회귀 무영향): 모두 ✅ PASS.**

B 는 직접 URL 검증이 web-account 의 실제 진입 경로와 무관하므로 본 CHECK 의 필수 매트릭스에서 제외하고, `IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1` 에서 각 서비스 → web-account 진입 경로를 함께 조사한다.

---

## 8. 후속 IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1 진행 가능 여부

| 차원 | 판단 |
|---|---|
| Join API instant active 우회 차단 | ✅ 완료 |
| web-account 가입 유도 UI 제거 (코드/배포) | ✅ commit `82a92fe61` 포함 / 빌드 정상 |
| web-account 진입 경로 기준 UI 검증 | ⏭ 후속 IR 에서 함께 다룸 (직접 URL 검증 부적절) |
| Handoff API (별도 IR 대상) | 본 WO 변경 없음, 무회귀 |
| 다음 IR 입력 자산 (Handoff 의 현 상태) | ✅ 변경 없음으로 IR 입력 명확 |

→ **본 CHECK 종료, 다음 단계 `IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1` 진행 가능.** Handoff IR 에서 "각 서비스 → web-account 진입 경로" 를 1 차 조사 대상으로 포함하여 본 CHECK 의 B 항목 검증을 흡수한다.

---

## 9. 본 CHECK 가 결정하지 않는 것

- web-account 자체 존속 여부 (별도 사안 — 단, **본 CHECK 는 web-account 가 legacy 가 아니라 계정센터로 위치한다는 정정을 명시**)
- 각 서비스 → web-account 진입 경로의 UI 검증 — `IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1` 의 영역
- Handoff API 의 보존/축소/삭제 — `IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1` 의 영역
- E (withdrawn) 의 실 데이터 검증 — 향후 데이터 생기면 재검증

---

## 부록 — 검증 명령 (재현 가능)

```bash
BASE="https://api.neture.co.kr/api/v1"

# C-1/C-2/C-3: Account #3 join 정책
curl -X POST "$BASE/auth/login" -c sess.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"sohae2100+v2check2@gmail.com","password":"V2Check2X!2026","serviceKey":"kpa-society"}' -o /dev/null

for svc in neture k-cosmetics kpa-society; do
  curl -X POST "$BASE/auth/services/$svc/join" -b sess.txt \
    -H "Content-Type: application/json" -d '{}'
  echo
done

# D: pending 재요청
curl -X POST "$BASE/auth/services/neture/join" -b sess.txt \
  -H "Content-Type: application/json" -d '{}'

# F: register regression
curl -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"...","name":"...","service":"kpa-society","membershipType":"pharmacist","tos":true,"privacyAccepted":true,"marketingAccepted":false}'

# G: handoff regression
curl -X POST "$BASE/auth/handoff" -b sess.txt \
  -H "Content-Type: application/json" -d '{"targetServiceKey":"glycopharm"}'
```

---

*Created: 2026-05-23*
*Type: Verification Result (E2E)*
*Status: 백엔드 필수 3 (C/F/G) PASS + 2 부수 PASS (A/D/H) + 2 SKIP/부적절 (E/B) — 종료*
*Next: `IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1` (B 의 진입 경로 기준 UI 검증 포함)*
