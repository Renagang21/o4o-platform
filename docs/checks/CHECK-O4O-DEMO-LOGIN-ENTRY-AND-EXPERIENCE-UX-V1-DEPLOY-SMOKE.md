# CHECK-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1 — 통제 배포 · 운영 smoke

> WO: `WO-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1`
> 정본: [`O4O-CANONICAL-DEMO-ACCOUNTS-V1`](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md)
> 2026-10-02 · 배포 2건 · **운영 DB write 0**

---

## 1. 배포 — target `5245da862` 고정

main HEAD 를 쓰지 않고 **CI 가 green 인 정확한 SHA** 를 annotated 태그로 고정해 배포했다.
HEAD(`42fa70b27`)에는 이번 범위 밖 변경(store-web nav fix)이 섞여 있어, 그것까지 함께 승인하지
않기 위해서다.

```text
tag       deploy/2026-10-02-demo-login-entry-ux → 5245da862 (annotated)
CI 근거   run 37012150561  completed/success  (API Jest 3 shard 포함)
```

| 서비스 | 배포 전 | 배포 후 | traffic |
|---|---|---|---|
| `o4o-core-api` | `21a413fde` (03792-ded) | **`5245da862`** (03795-don) | 100% 단일 |
| `neture-web` | `eab0474f0` (01671-xil) | **`5245da862`** (01674-zix) | 100% 단일 |

```text
run 37013476315  deploy-api            success  (freeze-notice skipped · CI gate success · verified rollout)
run 37014147221  deploy-web-services   success  (deploy-neture 만 실행 · 나머지 8개 skip)
health           /health/ready 200 · /health alive (version 0.5.0)
```

**store-web 은 건드리지 않았다** — `deploy-store` job 은 skip 됐다(`service=neture` dispatch).

### DEPLOY_FREEZE 창

```text
13:30:44  false  (해제)
13:41:04  true   (복구)      → 열려 있던 시간 약 10분, 두 배포에만 사용
```

---

## 2. 운영 smoke — 화면 11/11 · API 6/6

### 2-1. 실제 브라우저 (Playwright · Chromium · https://neture.co.kr)

배포 **전**에 같은 스크립트를 돌려 Demo 버튼이 **없음**을 먼저 확인했다. 그래서 아래 PASS 는
"원래 통과하는 테스트"가 아니라 이번 배포로 생긴 변화다.

```text
BEFORE (eab0474f0)   S3 FAIL · S5 FAIL  — 체험하기 섹션 자체가 없음
AFTER  (5245da862)   11/11 PASS
```

| ID | 항목 | 근거 |
|---|---|---|
| S0 | 로그인 모달이 열린다 | 이메일 입력칸 표시 |
| S1 | 일반 이메일 로그인 UI 유지 | 입력칸 · 로그인 버튼 그대로 |
| S2 | Google 로그인 버튼 유지 | "Google 계정으로 계속하기" 표시 |
| S3 | Store Demo 버튼 표시 | "매장 경영자 Demo 체험" |
| S5 | Supplier Demo 버튼 표시 | "공급자 Demo 체험" |
| S7 | Demo credential 화면 비노출 | 화면 텍스트에 비밀번호 · Demo 이메일 **없음** |
| S4 | Store Demo → 자동 로그인 → handoff | `https://pharmacy.neture.co.kr/store/workspace` 도달 |
| S8 | 매장 작업대 — 운영 주문 비노출 | **"테스트 약국 업무공간"** · 주문 목록 없음 (스크린샷) |
| S6 | Supplier Demo → 공급자 대시보드 | `https://neture.co.kr/supplier/dashboard` |
| S9 | Demo 배지 | 헤더 우상단 **"Demo 계정"** 배지 (스크린샷) |
| S10 | 로그인 후에도 credential 비노출 | 대시보드 텍스트에 없음 |

```text
console errors: 0
```

콘솔 0 만으로 PASS 로 적지 않았다 — 위 근거는 전부 URL · 화면 텍스트 · 스크린샷이다.

공급자 대시보드 실측: **"O4O 공급자 Demo"** 조직으로 진입하고 등록 상품 · 주문 · 정산이 모두
`0` 이다 — Demo 가 기존 공급자 조직 3개(실제 주문 22건)와 분리돼 있음이 화면으로 확인된다.

### 2-2. 운영 API 직접 호출

| ID | 항목 | 결과 |
|---|---|---|
| A1 | Store Demo 이메일 로그인 | `user.demo = {isDemo:true, demoType:"STORE_OWNER"}` |
| A2 | `GET /auth/me` | 같은 메타데이터 |
| A3 | `POST /auth/password` | **403 `DEMO_ACCOUNT_FORBIDDEN`** — "테스트 계정에서는 사용할 수 없는 기능입니다. 계정 정보·인증 수단은 고정되어 있습니다." |
| A4 | `POST /auth/password/forgot` | 200 + 일반 안내 문구 (Demo 여부 비노출) |
| A5 | Supplier Demo 로그인 | `{isDemo:true, demoType:"SUPPLIER"}` |
| A6 | 비-Demo 미존재 계정 | 401 `INVALID_CREDENTIALS` — 종전과 동일 |

### 2-3. 운영 DB 실측 (read-only · `BEGIN READ ONLY`)

```text
demo 계정 reset 토큰      0     ← A4 의 forgot 이 토큰을 만들지 않았다는 직접 증거
demo 활성 role            2     kpa:store_owner · neture:supplier  (allowlist 와 정확히 일치)
password credentials      2     전부 Demo (비-Demo 0)
users                     5
```

---

## 3. 검증하지 못한 2건 — **PASS 로 적지 않는다**

| 항목 | 왜 못 했나 |
|---|---|
| Google 로그인 실제 수행 | 실계정 조작이 필요하다. 버튼 존재(S2)만 확인했고 로그인 자체는 하지 않았다 |
| 일반 이메일 로그인 **성공** 경로 | **비-Demo 비밀번호 계정이 0개**다(위 2-3). 구조상 시험할 대상이 없다. UI 유지(S1)와 거절 경로(A6)만 확인했다 |

두 번째는 "안 했다"가 아니라 **대상이 존재하지 않는다**. 실제 이메일 가입 E2E 는 정본 §19 가
Demo 와 분리하라고 정한 영역이기도 하다.

---

## 4. 운영 영향

```text
운영 DB write        0
migration            0
store-web            미접촉 (deploy-store skip)
DEPLOY_FREEZE 최종   true
Demo role_assignments 2건 그대로 (생성·삭제 0)
```

---

## 5. 판정

```text
DEPLOY_TARGET        = 5245da862 (CI GREEN)
API_SERVING          = 5245da862 · 03795-don · traffic 100%
NETURE_WEB_SERVING   = 5245da862 · 01674-zix · traffic 100%
HEALTH_READY         = 200
BROWSER_SMOKE        = 11/11 PASS (BEFORE 대비 확인)
API_SMOKE            = 6/6 PASS
NOT_VERIFIED         = Google 로그인 실수행 · 일반 이메일 로그인 성공(대상 0)
PRODUCTION_DB_WRITE  = 0
DEPLOY_FREEZE_FINAL  = TRUE
```

§3 의 2건을 제외하면 WO 의 smoke 항목은 전부 실측 PASS 다. **CLOSED 판정은 사용자 몫**이다 —
그 2건을 "대상 없음 / 실계정 필요" 로 받아들일지가 판단 기준이다.
