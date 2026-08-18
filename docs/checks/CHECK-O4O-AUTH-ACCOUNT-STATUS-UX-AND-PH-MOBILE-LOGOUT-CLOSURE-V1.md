# CHECK — 계정 상태 안내 UX 정합 + PharmacyHub 모바일 로그아웃 마감

- **WO**: `WO-O4O-AUTH-ACCOUNT-STATUS-UX-AND-PH-MOBILE-LOGOUT-CLOSURE-V1`
- **일자**: 2026-08-18
- **선행**: `CHECK-O4O-CROSSSERVICE-AUTH-PRODUCTION-E2E-FINAL-CLOSURE-V1` (구현 `4e62945ad` · CHECK `ea38d2eb3`)
- **커밋**: `70697c11f` (구현) · `2b04e424d` (계약 회귀 테스트)
- **판정**: **PASS** — 코드·계약·배포·5서비스 회귀·PH 모바일 로그아웃 + `rejected` / `suspended`
  **실계정 production 실증**까지 전부 PASS (2026-08-18 보완 검증, §8).

---

## 1. 계정 상태 원천 (조사)

| 축 | 위치 | 사실 |
|---|---|---|
| 원천 | `users.status` (`active`/`inactive`/`pending`/`approved`/`suspended`/`rejected` + legacy `deleted`) | 단일 SSOT. 충돌 테이블 없음 |
| 정책 | `apps/api-server/src/common/auth/account-access.policy.ts` `resolveAccountAccess()` | normal / restricted / blocked 3분기 · fail-closed |
| 게이트 | `auth-login.service.ts` — 사용자 조회 → serviceKey membership → credential → lock → **비밀번호 검증** → **상태 게이트** → 이메일 인증 | 상태 게이트가 비밀번호 검증 **뒤**라서 상태 노출은 계정 열거 벡터가 아니다 |
| 쓰기 | `platform:super_admin` 전용 (`/admin/users`, `/users/:id/reject`, `/admin/platform-accounts`) | operator 의 membership reject/suspend 는 `users.status` 를 **건드리지 않는다** (`MembershipConsoleController.updateMemberStatus`) |

**결함 원인**: `pending` 은 제한 로그인(WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1)으로 **성공**하므로
`ACCOUNT_NOT_ACTIVE` 는 더 이상 "승인 대기" 를 뜻하지 않는데, 프런트가 이 코드에 "가입 승인 대기 중" 문구를 고정 매핑하고 있었다.
서버는 `AccountInactiveError(status)` 로 상태를 들고 있었으나 `BaseController.forbidden` 이 이를 버렸다.

## 2. API 계약 변경 (최소)

- `code` 는 **`ACCOUNT_NOT_ACTIVE` 그대로** (기존 소비처·보안 스펙 무변경).
- 403 body 에 화이트리스트 상태 라벨 `accountStatus` 만 추가: `rejected` / `suspended` / `inactive`.
  `deleted`·미상·값 없음·`ACCOUNT_LOCKED` 는 **미노출** (내부 상태 추가 노출 금지).
- 문구 선택은 `@o4o/auth-utils` **공통 계층 1곳** (`ACCOUNT_STATUS_MESSAGES`). 서비스별 문자열 분기 없음.
- 제품에 반려 재신청 경로가 없으므로 **없는 버튼·링크를 만들지 않고 운영자 문의만 안내**한다.

변경 파일(구현 `70697c11f`, 10 files): `base.controller.ts` · `account-access.policy.ts` · `auth-login.controller.ts` ·
`auth-utils/errorMessages.ts`(+index) · `auth-react/types.ts`+`useServiceAuth.ts` · `error-handling/error-messages.ts` ·
`web-kpa-society/LoginModal.tsx` (하드코딩 "승인 대기" 제거) · auth-utils 단위 테스트.

## 3. 공통 UX 결과 (배포본 실측)

| 상태 | 결과 |
|---|---|
| 미가입 | `401 SERVICE_NOT_MEMBER` — "이 계정은 {service} 서비스에 가입되어 있지 않습니다." (production 실측) |
| pending | **로그인 성공(제한 JWT)** — 로그인 오류 축에서 제거됨. 승인 대기 안내는 서비스 MembershipGate 담당 |
| rejected | "가입 신청이 반려된 계정입니다. 사유 확인과 재신청 가능 여부는 운영자에게 문의해 주세요." |
| suspended | "이용이 정지된 계정입니다. 운영자에게 문의해 주세요." |
| 상태 미상 | "현재 로그인할 수 없는 계정 상태입니다. 운영자에게 문의해 주세요." (중립 fallback) |
| 자격 오류 | `401 INVALID_CREDENTIALS` — "비밀번호가 일치하지 않습니다." (production 실측) |

`rejected` / `suspended` / 미상 3분기는 **배포된 5개 서비스 프런트 번들**에서 실제 렌더를 확인했다
(로그인 응답만 스텁, DB·계정 무변경). 5/5 서비스 × 3케이스 모두 정확한 문구 — "가입 승인 대기" 문구 0건.

## 4. PharmacyHub 모바일 로그아웃 (§2B) — ✅ PASS

390×844 · 실제 사용자 경로 (production `pharmacyhub.co.kr`, 계정 = PH 매장 fixture):

1. `/login` 실입력 로그인 → `/` 진입
2. `/store-owner` 셸 렌더 (약국 경영자)
3. 상단 햄버거 클릭 → 드로어 오픈 (스크린샷: 하단에 `로그아웃` 노출)
4. 드로어의 `로그아웃` **실제 클릭** → `/` 이동
5. `o4o_accessToken` · `o4o_refreshToken` **삭제 확인**, auth 쿠키 0건
6. **새 탭** `/store-owner` → `/login` (인증 재수화 없음)
7. JS 예외 0건

`localStorage` 직접 삭제 · API 직접 호출 등 우회 조작은 사용하지 않았다. 제품 결함 없음 → **UI 수정 없음**.

## 5. 5서비스 회귀 (desktop 1440×900 / mobile 390×844)

| 서비스 | 보호 route 차단 | 로그인 | 복귀 | 새로고침 복구 | 실 UI 로그아웃 | 로그아웃 후 새 탭 | JS 오류 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| KPA-Society | ✅ `/login` | ✅ | ✅ `/mypage` 복원 | ✅ | ✅ 토큰 삭제 | ✅ `/login` | 0 |
| Neture | ✅ 로그인 화면 | ✅ | ⚠️ `/` 랜딩(기존 동작) | ✅ | ✅ | ✅ | 0 |
| GlycoPharm | ✅ 로그인 화면 | ✅ | ⚠️ `/` 랜딩(기존 동작 · §6 제외 범위) | ✅ | ✅ | ✅ | 0 |
| K-Cosmetics | ✅ `/login` | ✅ | ✅ `/operator` | ✅ | ✅ | ✅ `/login` | 0 |
| Pharmacy-Hub | ✅ `/login` | ✅ | ✅ `/store-owner` | ✅ | ✅ | ✅ `/login` | 0 |

- 10/10 조합에서 **로그인·세션 복구·실 UI 로그아웃·로그아웃 후 차단** 전부 PASS.
- 흰 화면 · 무한 리다이렉트 · 데드링크 · JS 예외 **0건**.
- 교차 서비스 자격 독립: 4서비스 공용 비밀번호가 `pharmacy-hub` 에서는 `INVALID_CREDENTIALS` (L2 credential 분리 유지).
- ⚠️ 표기는 **이번 WO 이전부터의 기존 동작**이며 회귀가 아니다(§6 제외 범위).

## 6. 검증 · 배포

| 항목 | 결과 |
|---|---|
| `@o4o/api-server` type-check | ✅ |
| web 5종 build | ✅ (kpa-society · neture · k-cosmetics · glycopharm · pharmacy-hub) |
| auth-utils 단위 테스트 | ✅ 4/4 |
| api-server security 스위트 | ✅ **400/400** (17 suites) — 신규 `login-account-status-exposure.spec.ts` 9건 포함 |
| Deploy API Server / Web Services / Admin | ✅ success (`70697c11f`) |
| 배포 리비전 | `o4o-core-api-03334-g27` (2026-08-18T00:15:42Z) |

## 7. 테스트 계정 상태 (production read-only 재조회)

| 계정 | status |
|---|---|
| `o4o-e2e-auth-main@neture.co.kr` | **suspended** |
| `o4o-e2e-auth-notmember@neture.co.kr` | **suspended** |
| `o4o-e2e-auth-pending@neture.co.kr` | **suspended** |
| `o4o-e2e-auth-rejected@neture.co.kr` | **suspended** |

보완 검증(§8)에서 `o4o-e2e-auth-rejected` 1개만 `rejected` → `suspended` 로 전환했고, **최종 상태는 4개 전부 `suspended` 로 복원**했다. 위는 종료 시점 재조회 결과다. 실사용자 계정 변경 0건.

## 8. 보완 검증 — `rejected` / `suspended` 실계정 production 실증 (2026-08-18)

`platform:super_admin` 자격이 로컬 자격 파일에 등록되어, 미검증으로 남았던 1건을 **동일 WO 의 최종 보완 검증**으로 마감했다.
대상은 전용 fixture **`o4o-e2e-auth-rejected@neture.co.kr` 1개로 한정**했고 실사용자·다른 테스트 계정은 접촉하지 않았다.

### 8-1. 절차 (정본 관리자 API 경로만 사용)

| 단계 | 경로 | 결과 |
|---|---|---|
| 서비스 L2 비밀번호 설정 | `PUT /api/v1/operator/members/:userId { password, serviceKey: 'neture' }` | 200 |
| `rejected` 전환 | `PATCH /api/v1/admin/users/:id/status { status: 'rejected' }` | 200 · 재조회 `rejected` |
| `suspended` 전환 | `PATCH /api/v1/admin/users/:id/status { status: 'suspended' }` | 200 · 재조회 `suspended` |

임시 비밀번호는 gitignore 된 로컬 자격 파일에만 저장했고 출력·로그·CHECK·커밋 메시지에 남기지 않았다.
다른 서비스의 L2 credential 은 변경하지 않았다.

### 8-2. API 계약 실측 (`POST /api/v1/auth/login`, serviceKey `neture`)

| users.status | HTTP | code | accountStatus | 토큰·쿠키 |
|---|:---:|---|---|---|
| `rejected` | **403** | `ACCOUNT_NOT_ACTIVE` | **`rejected`** | 발급 0 |
| `suspended` | **403** | `ACCOUNT_NOT_ACTIVE` | **`suspended`** | 발급 0 (`set-cookie` 0건) |
| `deleted`(별도 계정) | 403 | `ACCOUNT_NOT_ACTIVE` | **없음** | 발급 0 — 화이트리스트 밖 상태는 노출하지 않는다 |

### 8-3. 실 UI 실증 (`https://neture.co.kr/login`, 실제 사용자 경로)

우회 조작(응답 스텁 · `localStorage` 조작 · API 직접 호출 대체) 없이 브라우저에서 입력·제출했다.

| 상태 | viewport | 노출 문구 | "가입 승인 대기" | 토큰/쿠키 | JS 오류 |
|---|---|---|:---:|:---:|:---:|
| `rejected` | 1440×900 | "가입 신청이 반려된 계정입니다. 사유 확인과 재신청 가능 여부는 운영자에게 문의해 주세요." | 0건 | 0 | 0 |
| `rejected` | 390×844 | 동일 | 0건 | 0 | 0 |
| `suspended` | 1440×900 | "이용이 정지된 계정입니다. 운영자에게 문의해 주세요." | 0건 | 0 | 0 |
| `suspended` | 390×844 | 동일 | 0건 | 0 | 0 |

§2A 목표(반려 계정에 "가입 승인 대기 중" 표기 금지)가 production 실계정에서 충족됨을 확인했다.
존재하지 않는 재신청 버튼·링크는 노출되지 않고 운영자 문의 안내만 제공된다.

### 8-4. 원상 복구

최종 상태를 `suspended` 로 복원하고 재조회했다 (§7 표 갱신). canonical credential 제거 경로가 없어
계정은 `suspended` 로 유지하고 그 외 직접 DB 조작은 하지 않았다.

**잔여 미검증: 0건.**

## 9. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
