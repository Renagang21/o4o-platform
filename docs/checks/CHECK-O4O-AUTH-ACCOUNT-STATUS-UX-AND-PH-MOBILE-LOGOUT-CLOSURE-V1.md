# CHECK — 계정 상태 안내 UX 정합 + PharmacyHub 모바일 로그아웃 마감

- **WO**: `WO-O4O-AUTH-ACCOUNT-STATUS-UX-AND-PH-MOBILE-LOGOUT-CLOSURE-V1`
- **일자**: 2026-08-18
- **선행**: `CHECK-O4O-CROSSSERVICE-AUTH-PRODUCTION-E2E-FINAL-CLOSURE-V1` (구현 `4e62945ad` · CHECK `ea38d2eb3`)
- **커밋**: `70697c11f` (구현) · `2b04e424d` (계약 회귀 테스트)
- **판정**: **PASS_WITH_UNVERIFIED** — 코드·계약·배포·5서비스 회귀·PH 모바일 로그아웃 전부 PASS.
  `rejected` / `suspended` **실계정 production 실증만 미검증** (§7 중지조건 5 — `platform:super_admin` 자격 부재).

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

이번 WO 에서 계정 상태를 **변경하지 않았다** (production DB write 0건). 위는 종료 시점 재조회 결과다.

## 8. 잔여 미검증 — §7 중지조건 5

**`rejected` / `suspended` 실계정 production 로그인 실증**만 수행하지 못했다.

- 사유: `users.status` 쓰기는 **`platform:super_admin` 전용**이고(`ADMIN_ROLES = ['platform:super_admin']`),
  작업 계정(`sohae2100`)은 이 role 이 없다(403 `ROLE_REQUIRED`). WO 는 임의 관리자 권한 부여를 금지한다.
- 전용 fixture 4개는 현재 `suspended` 지만 **비밀번호가 남아 있지 않다**(직전 WO 의 임시 자격 저장소 소멸,
  `AdminUserController` 는 `KEEP_EXISTING_CREDENTIAL` 로 기존 자격을 덮어쓰지 않아 복구 경로도 없다).
- 대체 확보한 증거: ① 컨트롤러 계약 회귀 테스트 9건(상태별 노출/미노출) ② 배포된 5서비스 프런트 번들의
  상태별 문구 실렌더 ③ production 실측 `SERVICE_NOT_MEMBER` · `INVALID_CREDENTIALS` · 교차 서비스 자격 독립.
- 권고: `platform:super_admin`(`renariver21@gmail.com` 또는 `super-admin@o4o.com`) 자격으로
  전용 fixture 1개의 비밀번호 재발급 + `rejected`→검증→`suspended` 복원 1회를 수행하면 즉시 마감 가능하다.

## 9. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
