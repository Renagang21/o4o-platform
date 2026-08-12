# CHECK-O4O-NETURE-SUPPLIER-TEST-ACCOUNT-CREDENTIAL-CLOSEOUT-V1

- **WO**: `WO-O4O-NETURE-SUPPLIER-TEST-ACCOUNT-CREDENTIAL-CLOSEOUT-V1`
- **작성일**: 2026-08-12
- **판정**: **PASS** — 비밀번호 갱신 불필요. 원인은 자격증명이 아니라 **로그인 호출 방식(`serviceKey` 누락)** 이었다.

> 비밀번호 원문은 이 문서에 기록하지 않는다. SSOT 는 `docs/local/TEST-ACCOUNTS.local.md` (git 미추적).

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 HEAD | `47f82a141176e336bb6c8dd8218947c4ec6bbccf` |
| 작업 트리 | clean (§2 통과) |
| 선행 정리 | cloud-sql-proxy PID 27100(5442) · 18228(5452) 종료, 포트 해제 확인. 잔여 Playwright chrome 1건 종료. 사용자 Chrome 미접촉 |

---

## 2. 계정 후보 조사 결과

### 2-1. 근본 원인 — `serviceKey` 없는 로그인은 다른 해시를 본다

`apps/api-server/src/services/auth/auth-login.service.ts` (188-216):

| 요청 | 검증 대상 해시 |
|---|---|
| `serviceKey` 있음 + `service_credentials` row 있음 | **`service_credentials.password_hash`** |
| `serviceKey` 있음 + row 없음 | `users.password` (V1 fallback) |
| **`serviceKey` 없음** | `users.password` (V1 fallback) |

`docs/local/TEST-ACCOUNTS.local.md` 의 비밀번호는 **서비스별 credential** 값이다.
직전 WO 에서 `serviceKey` 없이 `POST /api/v1/auth/login` 을 호출했기 때문에 `users.password` 와
대조되어 401 `INVALID_CREDENTIALS` 가 났다. **계정·비밀번호 문제가 아니었다.**

### 2-2. 실측

| 계정 | serviceKey 없음 | `serviceKey:"neture"` | users.status | 비고 |
|---|:---:|:---:|:---:|---|
| `renagang21@gmail.com` | 401 | **200 OK** | active | Neture 공급자 `supplier-6967ebe0` ACTIVE |
| `sohae21@naver.com` | 401 `ACCOUNT_NOT_ACTIVE` | 동일 | **deleted** | 공급자 `supplier-52a4c1e6` 는 ACTIVE 이나 유저가 삭제됨 |
| `yyoon1103@naver.com` | 미실행 | 미실행 | — | 공급자 status `PENDING` |

프로덕션 Neture 공급자 3건 중 **실사용 가능한 공급자 계정은 1개**다.

### 2-3. 웹 UI 는 영향 없음

`packages/auth-react/src/useServiceAuth.ts:95` — `authClient.login({ email, password, serviceKey })`.
UI 로그인은 항상 serviceKey 를 보내므로 정상 동작했다. 실패는 API 직접 호출에서만 발생한다.

---

## 3. 선택한 테스트 계정

**`renagang21@gmail.com`** — Neture 공급자 "(주)네뚜레 공급자 테스트" (`supplier-6967ebe0`, status ACTIVE).

---

## 4. 비밀번호 갱신 방식

**갱신하지 않았다 (불필요).** WO §5 우선순위 1("기존 문서 비밀번호 재확인")에서 종결됐다.
DB 직접 update · 비밀번호 재설정 · 관리 스크립트 실행 모두 수행하지 않았다.

---

## 5. serviceKey 로그인 결과

| 항목 | 결과 |
|---|---|
| `POST /api/v1/auth/login` + `serviceKey:"neture"` | **200 OK** |
| 실브라우저 UI 로그인 (neture.co.kr 로그인 모달) | **성공** — 로그인 직후 `/supplier/dashboard` 자동 진입 |
| 대시보드 표기 | "(주)네뚜레 공급자 테스트님" · 공급자 상태 **활성** |

> 참고: 프로필 배너("담당자명·담당자 연락처 미입력")는 승인과 무관한 안내이며 공급 업무 이용을 막지 않는다.

---

## 6. supplier route smoke

| # | 경로 | 결과 |
|---|---|---|
| 1 | UI 로그인 | PASS |
| 2 | `/supplier/dashboard` | PASS — KPI · 업무 바로가기 · 공급자 계정 상태 렌더 |
| 3 | `/supplier/products` | PASS — 내 제품 관리 · 카운터(전체 0 / 승인요청 전 0 / 승인 요청 중 0 / 승인완료 0 / 거절 0) |
| 4 | `/supplier/store-descriptions` | PASS — "등록된 상품이 없습니다" (상품 0건에 대한 정상 안내) |
| 5 | `/supplier/store-materials-status` | PASS — 검수·게시 현황 4카운터 + 자료 목록 렌더 |

### console / network

- **console error 0**
- 화면이 호출한 API 전량 **200**:
  `auth/me` · `notifications/unread-count?serviceKey=neture` · `neture/supplier/products` ·
  `neture/supplier/store-descriptions` · `kpa/supplier/screen-sets` · `kpa/supplier/signage/media`
- 401 / 403 **0건**
- 404 2건은 **내가 임의로 찍어본 비존재 경로**(`neture/supplier/me`, `neture/supplier/store-materials-status`)이며
  UI 실사용 경로가 아니다. 검수·게시 현황 화면은 위 3개 엔드포인트를 조합해 구성한다.

---

## 7. 로컬 문서 갱신 여부

`docs/local/TEST-ACCOUNTS.local.md` (git 미추적) 갱신:

- 직전 WO 가 남긴 "비밀번호 불일치" 메모를 **오해로 정정**
- `serviceKey` 필수 규칙과 검증 대상 해시 표, curl 예시(❌/✅) 추가
- Neture 공급자 write smoke 표준 계정 = `renagang21@gmail.com` 명시
- 비밀번호 원문은 기존 표에만 유지 (본 CHECK 및 추적 파일에는 없음)

---

## 8. HOLD 항목

**없음.** 이 WO 의 목표(공급자 로그인 재현 가능 상태 확보)는 달성됐다.

부수 관찰 (이번 WO 범위 밖, 조치하지 않음):

| # | 내용 |
|---|---|
| 1 | `sohae21@naver.com` — 유저 `deleted` 인데 공급자 `supplier-52a4c1e6` 는 ACTIVE 이고 `[E2E_TEST]` offer 2건을 보유. 공급자 계정 lifecycle 정합 이슈로 보이며 별도 WO 후보 |
| 2 | `yyoon1103@naver.com` 공급자 `PENDING` 상태 장기 방치 |

---

## 9. commit SHA

`5c4501f177a4a92b61979eceac42f19267a21b71`

## 10. push 결과

`47f82a141..5c4501f17  main -> main` — push 완료, `HEAD == origin/main` 확인.

## 11. 문서 정합

- 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§8 부수 관찰)
