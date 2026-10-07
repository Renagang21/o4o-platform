# CHECK-O4O-PRODUCTION-PROMOTE-0E283BA10-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-07
> **근거**: 사용자 승인(2026-10-07) — `promote.yml` `sha=0e283ba102a86b2e6ce07d88926d3b39a0ea6fe9` · `dry_run=false`
> **관련 CHECK**: [`CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1`](CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1.md) §9-5 · §9-7 (#308 + #323 promote 범위 · 운영 smoke 목록)
> **갱신**: 2026-10-07 §8 (테스트 결제 env 반영 확인)
> **결과**: **PROMOTE PASS** — API(migration 1건 포함) + 웹 7 + Admin 1 새 revision · traffic 100%. HTTP 수준 smoke PASS. 실브라우저 · 로그인 후 화면 · production write 를 동반하는 흐름은 **미검증**(§6).

production promote run `37548237819` 의 배포 기록이다. 이 run 을 시작한 세션이 작성한다.

---

## 1. Target

| 항목 | 값 |
|---|---|
| Workflow | `promote.yml` (`dry_run=false`) |
| Run | `37548237819` — conclusion `success` |
| SHA | `0e283ba10` (실행 직전 `origin/main` HEAD 와 일치 확인) |
| 선행 dry-run | `37481237168` (이 dry-run 이후 실제 promote 없음) |
| 포함 변경 | #308 Neture 약국 store commerce · #323 서비스 로그인 membership gate(`SERVICE_NOT_MEMBER`) 외 HEAD 까지의 main |
| 배포 대상 | API · admin · neture · kpa-society · pharmacy-hub · lecture · store · kpa-branch · hospital-pharmacy |
| 제외 | k-cosmetics (운영 종료 — Phase 1A) |
| environment 승인 대기 | 발생하지 않음 |

## 2. 실행 타임라인 (UTC, 2026-10-06)

| 시각 | 단계 |
|---|---|
| 23:44:50 | run 시작 |
| 23:50:21 – 23:50:22 | migration Cloud Run Job `o4o-api-migrations` 실행 |
| 23:50:33 | API 새 revision 생성 |
| ~23:53 | Web 7 · Admin 새 revision 생성 |
| — | run `success` 종료 |

## 3. API 결과

| 항목 | 결과 |
|---|---|
| Image | `api-server:0e283ba10…` |
| 이전 revision | `o4o-core-api-03834-fuh` |
| 새 revision | `o4o-core-api-03837-caw` |
| `o4o-commit-sha` label | `0e283ba10…` 일치 |
| traffic | 새 revision 100% |
| `/health/ready` | 200 (`status: ready`) |
| rollback | 불필요 |

### 3-1. Migration

| 로그 키 | 값 |
|---|---|
| `PRE_MIGRATION_SCHEMA_ASSERTION` | PASS |
| `INCREMENTAL_PENDING` | 1 — `CreateNeturePharmacyCommerce1791200000000` |
| `INCREMENTAL_EXECUTED` | 1 |
| `POST_MIGRATION_SCHEMA_ASSERTION` | PASS |
| `MIGRATION_JOB` | SUCCESS |

- 실행 전 `typeorm_migrations` 699 행 → 이 migration 1건 추가.
- migration 은 CI/CD 자동 실행만 사용했다. 수동 DB write 없음.

## 4. Web · Admin 결과

전부 이 run 에서 생성(~23:53Z), `o4o-commit-sha=0e283ba10`, traffic 100%. 각 서비스의 deploy-* job 은 success, 다른 matrix cell 은 설계대로 skipped.

| Cloud Run 서비스 | 새 revision |
|---|---|
| o4o-admin-dashboard | `01352-lij` |
| neture-web | `01692-pir` |
| kpa-society-web | `02029-paf` |
| pharmacy-hub-web | `00284-fop` |
| lecture-web | `00043-boy` |
| store-web | `00059-qew` |
| kpa-branch-web | `00202-cen` |
| hospital-pharmacy-web | `00029-per` |

> 판정 주의: 전환 직후 traffic 조회가 이전 revision 을 보여줄 수 있다. revision 의 `creationTimestamp` 와 `o4o-commit-sha` label 로 판정했다.

## 5. Smoke (HTTP 수준)

계정은 [Canonical Demo 계정](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md)(Store Owner Demo `kpa:store_owner` · Supplier Demo `neture:supplier`)만 사용했다. 아래에는 status · code 만 적는다.

### 5-1. 로그인 membership gate (#323) — `POST /api/v1/auth/email/login`

| # | 계정 · origin | 기대 | 결과 |
|---|---|---|---|
| A | Supplier Demo → `pharmacy.neture.co.kr` | 403 `SERVICE_NOT_MEMBER` | 403 `SERVICE_NOT_MEMBER`, `serviceAccess.next=apply_pharmacy` — PASS |
| B | Supplier Demo → `retail.neture.co.kr` | 403 `SERVICE_NOT_MEMBER` | 403 `SERVICE_NOT_MEMBER` — PASS |
| C | Store Owner Demo → `pharmacy.neture.co.kr` | 200 | 200 — PASS |
| D | 틀린 비밀번호 → `pharmacy.neture.co.kr` | 401 | 401 `INVALID_CREDENTIALS` — PASS (gate 가 인증 실패를 가리지 않음) |
| E | Supplier Demo → `neture.co.kr` | 200 (gate 대상 아님) | 200 — PASS |

### 5-2. Neture 약국 API (#308) — 조회만

| 요청 | 결과 |
|---|---|
| `GET /api/v1/neture/pharmacy/membership` (로그인) | 200 (`data: null` — 미가입) |
| `GET /api/v1/neture/pharmacy/service-access/kpa-society` (로그인) | 200 |
| `GET /api/v1/auth/me` (로그인) | 200 |
| `GET /api/v1/neture/pharmacy/membership` (비로그인) | 401 |

### 5-3. 기본 진입 · 공개 화면 (로그인 전)

모두 HTTP 200:

- `neture.co.kr` · `neture.co.kr/service-entry/lecture`
- `pharmacy.neture.co.kr` · `pharmacyhub.co.kr` · `kpa-society.co.kr`
- `study.neture.co.kr` · `study.neture.co.kr/courses`
- `store.neture.co.kr` · `admin.neture.co.kr`
- hospital-pharmacy-web · kpa-branch-web (Cloud Run 기본 URL)

## 6. 확인하지 않은 것

- **실브라우저 화면** — 위 smoke 는 HTTP status 수준이다. 렌더링 · 안내 문구 · 버튼 동작은 보지 않았다.
- **Neture 약국 기본 가입 `POST`** — production write 라 실행하지 않았다.
- **로그인 후 흐름** — 내 매장 · 장바구니 · 주문 · 공급자 처리 · 운영자 승인.
- [`CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1` §9-5](CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1.md) 1~13 중 실행한 것은 11(미가입 계정의 pharmacy 호스트 로그인 → 403)과 13 일부(로그인 · 기본 진입 회귀)의 **API 수준**뿐이다. 1~10 · 12 와 Google 신규 가입 · cross-service handoff 실행은 미검증 — 신규 Google 계정 · 운영자 승인 · production write 가 필요하다.
- production DB 직접 write: 없음 (migration 은 CI/CD job).

## 7. 판정

| 항목 | 판정 |
|---|---|
| API promote + migration | PASS |
| Web 7 + Admin promote | PASS |
| #323 `SERVICE_NOT_MEMBER` gate production 적용 | PASS (API smoke) |
| #308 Neture 약국 API production 적용 | PASS (조회 smoke) |
| 실브라우저 · 로그인 후 · write 흐름 | 미검증 — §6 |

## 8. 후속 — 테스트 결제 env 반영 확인 (2026-10-07)

`NETURE_PHARMACY_PAYMENT_MODE=test` 는 이 promote 의 API revision 에는 들어가지 않았다. 이후 API 자동 배포로 반영된 것을 확인했다(조회만).

| 항목 | 결과 |
|---|---|
| `03837-caw` (이 promote) | `NETURE_PHARMACY_PAYMENT_MODE` 없음 |
| 이후 배포 | main `5e97815c7`(#325 merge) push → Delivery run `37552776731` 이 API 자동 배포(CI gate · build-and-deploy success) |
| 새 revision | `o4o-core-api-03840-mos` (2026-10-07 00:40:39Z), label `5e97815c7`, traffic 100% |
| env | `NETURE_PHARMACY_PAYMENT_MODE=test` 확인 |
| `/health/ready` | 200 |

- `deploy-api.yml` 수동 실행은 필요하지 않았다 — 실행하지 않았다.
- 테스트 결제 실제 흐름(장바구니 → 주문 → 결제)은 미검증 — Google 인증 약국 · 공급자 테스트 계정과 pharmacy 담당 운영자가 필요하다(§6).
