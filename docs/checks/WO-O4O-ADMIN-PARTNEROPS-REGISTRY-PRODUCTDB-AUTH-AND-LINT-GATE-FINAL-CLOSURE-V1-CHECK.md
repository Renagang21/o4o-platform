# CHECK — WO-O4O-ADMIN-PARTNEROPS-REGISTRY-PRODUCTDB-AUTH-AND-LINT-GATE-FINAL-CLOSURE-V1

- 작업 브랜치: `work/admin-authorization-registry-and-dead-surface-final-closure-v1`
- 커밋: `c5147876d` (main)
- 선행 커밋: `428349dab`, `9fbfc590c`
- 작성일: 2026-09-10

> 본 문서에는 자격정보·접속 문자열·토큰·DB URL·비밀번호를 기록하지 않는다.

---

## 1. 세 축 요약

| 축 | 대상 | 전 | 후 |
|---|---|---|---|
| A | 운영 `app_registry` 의 `partnerops` | `status='active'` (실체 없는 앱) | migration 으로 `status='inactive'` |
| B | `/api/v1/admin/o4o-product-db/*` 권한 | 컨트롤러마다 7-role `ADMIN_ROLES` 배열 (read 개방) | router floor = 정본 `requireAdmin` (`platform:super_admin` 단독) |
| C | admin-dashboard lint gate | 실패를 삼키는 우회 존재 | 우회 제거 + warning ratchet `--max-warnings 500` + CI 차단 단계 |

---

## 2. A축 — PartnerOps 운영 registry 정렬

### 2.1 migration

`apps/api-server/src/database/migrations/20270404000000-DeactivateRetiredPartnerOpsAppRegistry.ts`

| 계약 | 구현 |
|---|---|
| 대상 | `appId = 'partnerops'` **단 1행** |
| 방식 | **비활성화**(`status='inactive'`) — 삭제 아님 (§5.2) |
| 신규 값 신설 | 없음. 기존 enum 값 `inactive` 사용 (`'retired'` 를 만들지 않는다) |
| 멱등성 | 테이블 부재 / 행 부재 / 이미 inactive → no-op |
| 트랜잭션 | TypeORM 기본 트랜잭션. 예외 시 rollback |
| 변경 행 수 | `UPDATE ... RETURNING "appId"` 의 `rows.length` 로 계수 |
| 중지 가드 | 대상 2행 이상 / 의존 앱 존재 / 변경≠1행 / 다른 앱 active 수 변동 → `throw` |
| `down` | 의도적 no-op (복원 = 결함 재발). docblock 에 근거 기록 |

> **드라이버 주의**: TypeORM pg 드라이버의 `queryRunner.query` 는 `result.rows` 를 돌려주므로
> 평범한 UPDATE 는 빈 배열이다. `RETURNING` 없이 `updateResult[1]` 로 세면 항상 0 이 되어
> 가드가 거짓 ABORT 한다. 저장소 선례(`20270302000000-NormalizeNetureOperatorMembershipRole`)와
> 동일하게 `RETURNING` 을 쓴다.

### 2.2 timestamp 충돌 처리 (실제 발생)

rebase 로 들어온 POP V2 커밋이 `20270403000000-CreateStorePopDocuments.ts` 를 추가해
본 migration 과 timestamp 가 겹쳤다. TypeORM 은 동일 timestamp 의 실행 순서를 보장하지 않으므로
**본 migration 을 `20270404000000` 으로 재번호**했다(push 전 amend). 두 migration 은 서로 다른
테이블을 다뤄 기능적 간섭은 없지만 순차 카운터 규약을 지켰다.

### 2.3 보존 확인 (일괄 삭제하지 않은 것)

| 대상 | 상태 |
|---|---|
| `packages/partner-core` | 보존 (AppStore Guard 12/12 통과로 재확인) |
| `SERVICE_GROUPS` 의 `partnerops` 그룹 id | 보존 (`id: 'partnerops'`) |
| `partner-core` 의 `serviceGroups: ['platform-core', 'partnerops']` | 보존 |
| Neture 파트너 모집 · 공급자/파트너 B2B | 미변경 |
| `partner_*` 운영 테이블 | 미변경 |
| 실행 완료된 `2026012200002-SeedDefaultApps.ts` | **미수정** |

---

## 3. B축 — 공통 Product DB 정본 권한

### 3.1 판정

```
공통 Product DB 정본 조회·수정·승격·삭제·복원·정비 → platform:super_admin
서비스 운영자의 상품 제안·등록 요청·설명서 초안        → 각 서비스 operator/supplier API + service scope
서비스 운영자의 공통 정본 직접 변경                     → 금지
```

### 3.2 소비처 조사 (중지 조건 해소 근거)

`apps/**` · `services/**` · `packages/**` 전역에서 `o4o-product-db` 소비처를 조사한 결과
**admin-dashboard 단독**(+ 자신의 `dist/` 산출물)이다. 서비스 프런트가 공통 Product DB API 를
사용하는 사례가 없으므로 §11 의 "서비스 프런트가 Product DB API 를 실제 사용" 중지 조건에
해당하지 않는다.

### 3.3 구현

- 13개 컨트롤러가 각자 선언하던 **동일한 7-role 배열을 전부 제거**했다.
- router floor 를 저장소 **정본 미들웨어 `requireAdmin`** 으로 통일했다.
  새 권한 상수를 만들지 않았다 → `PRODUCT_DB_ROLE_DECLARATION_DUPLICATION = ZERO`.
- `requireProductDbWrite` 는 `requireAdmin` 의 별칭으로 남겨 write route 의 의도를 코드에 남긴다.
- 프런트 판정 집합 `@o4o/auth-context` 의 `PRODUCT_DB_WRITE_ROLES` 도 `['platform:super_admin']` 로 정렬.

대상 13개 컨트롤러: `operator-supplier-store-description-review` · `product-content-browse` ·
`product-db-maintenance` · `product-description-qr-summary` · `product-image-quality` ·
`product-landing` · `product-master-audit-log` · `product-master-create` ·
`product-master-description` · `product-master-image` · `product-master-note` ·
`product-master-status` · `product-usage-links`

### 3.4 좁히지 않은 서비스 운영자 경로 (§6.3)

- `/api/v1/operator/product-candidates/*` — `requireRole(OPERATOR_ROLES)` floor 유지
- `/api/v1/operator/store-product-requests/*` — 유지
- 공급자 설명서 초안 제출 — 유지
- `store-product-request-admin.controller.ts` 의 `POST /:id/link` — 의도적으로 guard 미부착 유지

세 경로 모두 `/api/v1/admin/o4o-product-db` **밖에** mount 되어 있음을 회귀 테스트로 고정했다.

### 3.5 요청 수준 권한 실측 (§6.4)

`product-db-write-authority.test.ts` 가 실제 Express 라우터에 HTTP 요청을 보내 검증한다.

| 페르소나 | 대표 read (GET) | 대표 write (POST) |
|---|---|---|
| `platform:super_admin` | 통과 | 통과 |
| `neture:admin` | **403** | **403** |
| `neture:operator` | **403** | **403** |
| `cosmetics:admin` | **403** | **403** |
| `cosmetics:operator` | **403** | **403** |
| `kpa-society:admin` | **403** | **403** |
| legacy `admin` | **403** | **403** |
| legacy `super_admin` | **403** | **403** |
| legacy `operator` | **403** | **403** |
| 역할 없음 | 403 | 403 |
| 비인증 | 401 | 401 |

### 3.6 선행 WO 테스트 정합

`bootstrap/__tests__/admin-route-auth-boundary.test.ts` 는
`WO-O4O-ADMIN-PRODUCT-DESCRIPTION-ROUTE-AUTH-BOUNDARY-ALIGNMENT-V1` 이 고정한
**"하위는 `requireRole(ADMIN_ROLES)` 로 서비스 역할을 허용한다"** 계약을 담고 있었다.
본 WO §6 이 그 계약을 의도적으로 대체하므로 해당 단언을 새 계약으로 갱신했다
(blanket guard 가 자기 prefix 만 갖는다는 **원래의 핵심 계약은 그대로 유지**).

---

## 4. C축 — admin-dashboard lint gate

### 4.1 변경

- 이전: `eslint ... src/**/*.{ts,tsx} --report-unused-disable-directives --max-warnings 200` 뒤에
  실패를 삼키는 우회가 붙어 있어 lint 결과가 CI 판정에 영향을 주지 못했다.
- 이후: `eslint --config ../../eslint.config.js src --report-unused-disable-directives --max-warnings 500`
  (우회 제거).

CI Pipeline 에 저장소 전역 ratchet 직후 **차단 단계**를 추가했다:
`pnpm --filter @o4o/admin-dashboard run lint`

### 4.2 대상 인자를 `src` 로 바꾼 이유 (환경 편차 실측)

`src/**/*.{ts,tsx}` 는 쉘에 따라 결과가 갈린다.

| 실행 방식 | 대상 파일 | warning |
|---|---:|---:|
| bash 가 globstar 없이 확장 | 100 | 34 |
| ESLint 가 직접 glob (`src` 인자) | **545** | **500** |

즉 기존 형태로는 **warning 기준선이 환경마다 달라진다**. §11 의
"warning 기준선이 환경마다 다르다" 중지 조건에 해당할 수 있으나, **원인을 특정하고 제거**했으므로
(디렉터리 인자로 교정) 중지가 아니라 수정으로 처리했다. 회귀 테스트로 `src/**/*` 형태의
재도입을 차단한다.

### 4.3 기준선

- 545 파일 / **0 error** / **500 warning**
- 구성: `@typescript-eslint/no-unused-vars` 447 · `react-hooks/exhaustive-deps` 53
- `pnpm install --frozen-lockfile` 후 재측정, rebase 로 POP V2 코드가 들어온 뒤 **재재측정** —
  세 번 모두 0 error / 500 warning 으로 동일

### 4.4 게이트 동작 증명 (§7.4)

임시 fixture `src/__lint_gate_probe__.ts` 로 4가지를 실측했다.

| 경우 | 기대 | 실측 |
|---|---|---|
| 현재 코드 | PASS | PASS (exit 0) |
| 신규 error 1건 | FAIL | FAIL |
| warning 이 기준선 초과 | FAIL | FAIL |
| 임시 변경 제거 후 | PASS | PASS |

임시 파일은 삭제했고 부재를 확인했다. lockfile 은 변경하지 않았다.

### 4.5 하지 않은 것

- 실패를 삼키는 우회를 다른 형태로 되살리지 않았다
- eslint config 완화 · 파일 전역 disable · 무제한 임계치 상향 없음
- **저장소 전역 ratchet(`scripts/lint-ratchet.mjs`, `ERROR_BASELINE=51`) 은 건드리지 않았다.**
  현재 실측은 45 error 로 기준선보다 낮고 스크립트가 하향을 권고하지만, 이는 저장소 전역 게이트라
  본 WO(admin-dashboard) 범위 밖이며 무관한 워크스페이스 CI 를 막을 수 있어 **후속 WO 로 분리**한다.

---

## 5. 로컬 검증 (§10.1)

| 항목 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | PASS · lockfile 미변경 |
| `pnpm run build:packages` | PASS |
| `@o4o/api-server` type-check | PASS |
| api-server Jest 전체 | **245 suites / 4051 tests PASS** |
| `@o4o/admin-dashboard` type-check | PASS |
| `@o4o/admin-dashboard` lint (ratchet) | PASS (0 error / 500 warning / exit 0) |
| `@o4o/admin-dashboard` vitest | **308 PASS** |
| `@o4o/admin-dashboard` production build | PASS |
| `@o4o/auth-context` type-check | PASS |
| AppStore Guard (로컬 실행) | **PASS** (12/12 패키지 · 카탈로그 정합 · FROZEN Core 무결) |
| migration compile · class load | PASS (`up`/`down` 함수 · timestamp 정합) |
| 저장소 전역 lint ratchet | PASS (45 error ≤ baseline 51) |

### 5.1 숨기지 않는 사항 — 관측된 테스트 실패 2건과 그 원인

1. **`content-guard` 2개 suite 의 `ENOENT`** — `liquid-guard` · `numeric-consistency` 가
   `process.cwd()` 기준으로 fixture 를 찾는다. 저장소 루트에서 `--rootDir apps/api-server` 로
   실행한 **본인의 호출 방식** 때문에 경로가 어긋났다. `apps/api-server` 에서 실행하면
   **42/42 PASS**. 코드 결함 아님.
2. **`local-agent-oneclick-pairing.spec.ts` 8건 실패** — 자식 프로세스로 local server 를 띄우고
   15초 안에 `READY` 를 기다리는데, 전체 suite 병렬 실행의 CPU 경합에서 기동이 15초를 넘겨
   타임아웃했다. 원인 2가지를 실측으로 분리했다.
   - 직전 전체 실행이 남긴 자식 프로세스가 포트 47821 을 점유 (정리 후 해소)
   - `--maxWorkers=2` 로 경합을 낮추면 **245/245 · 4051/4051 PASS**

   본 WO 변경 파일과 교집합이 없고(local-agent 관련 파일 미변경), 단독 실행 시 24/24 PASS 다.
   **본 WO 가 유발한 실패가 아니며, 병렬 부하에 민감한 기존 flaky 테스트**로 기록한다.

---

## 6. CI · 배포 (§10.2)

`c5147876d` push 로 트리거된 워크플로만 기록한다.

| 워크플로 | 트리거 | 결과 |
|---|---|---|
| CI Pipeline | O | **cancelled** (직후 push 가 concurrency group 선점 — success 로 기록하지 않는다) |
| CodeQL Security Analysis | O | c5147876d **cancelled** → 교정 커밋 `f2fb1eed0` **success** |
| Deploy API Server (Cloud Run) | O | c5147876d **failure**(§6-A) → `f2fb1eed0` **success** |
| Deploy Admin Dashboard (Cloud Run) | O | success |
| Deploy Web Services (Cloud Run) | O | success |
| AppStore Guard | **X — 미트리거** | path filter(`packages/**/manifest.ts` · `packages/**/lifecycle/**` · `appsCatalog.ts`)에 본 WO 변경이 해당하지 않는다. **미트리거를 success 로 기록하지 않는다.** 대신 로컬에서 직접 실행해 PASS 를 확인했다(§5). |

---

## 6-A. 운영 migration 1차 실행 실패와 교정 (숨기지 않는다)

`c5147876d` 의 **Deploy API Server 는 실패**했다. 실패 지점은 `Run database migrations` 단계이며,
Cloud Run Job 실행 `o4o-api-migrations-tfl9t` 이 아래 메시지로 중단했다.

```
[DeactivateRetiredPartnerOpsAppRegistry] ABORT: 예상 변경 1행 / 실제 2 행.
영향 범위가 전제와 달라 중지한다.
```

### 판정 — 운영 데이터 문제가 아니라 코드 결함

- 선행 가드 `SELECT count(*) FROM app_registry WHERE appId='partnerops'` 는 통과했다.
  즉 **운영 `app_registry` 의 `partnerops` 는 정확히 1행**이다 (§11 의 "행 수 ≠ 1" 중지 조건 아님).
- 실제 원인: TypeORM pg 드라이버는 `UPDATE ... RETURNING` 을 **`[rows, affectedCount]` 튜플**로
  돌려준다. 튜플을 그대로 세면 길이가 **항상 2** 이므로, 정상적인 1행 변경도 거짓 ABORT 한다.
  이는 저장소에 이미 기록된 함정이다(`unique_active_role_per_user` 계열 WO 의 동일 사례).

### 안전 측면

- migration 은 트랜잭션 안에서 실행됐고 **`ROLLBACK` 되었다. 운영 DB 는 무변경**이다.
- 즉 **안전 가드가 설계대로 작동**해 전제와 다른 상황에서 쓰기를 하지 않았다.
- §9 에 따라 migration 성공 전에 운영 DB 를 직접 UPDATE 하지 않았다.

### 교정 — `f2fb1eed0`

```ts
const updatedRows =
  Array.isArray(updateResult) && Array.isArray(updateResult[0]) ? updateResult[0] : updateResult;
const affected = Array.isArray(updatedRows) ? updatedRows.length : 0;
```

rows 배열만 돌려주는 드라이버 형태도 함께 받는다. 가드·트랜잭션·멱등성·사후 검증은 그대로다.
회귀 테스트(`RETURNING 결과를 [rows, count] 튜플로 풀어서 센다`)로 재발을 차단했다.

### 부수 관측

`c5147876d` 의 **CI Pipeline · CodeQL 은 `cancelled`** 이다. 실패가 아니라, 직후 다른 세션의
push(`307b09329`)가 같은 concurrency group 을 선점해 취소된 것이다(저장소의 상시 패턴).
**cancelled 를 success 로 기록하지 않는다.** 본 WO 커밋은 후속 tip 커밋의 조상이므로 tip 실행이
동일 코드를 포함해 검증한다.

---

## 6-B. 운영 반영 결과 (교정 후)

교정 커밋 `f2fb1eed0` 배포에서 **API 서비스 revision `o4o-core-api-03591-npn`(생성 04:32:58Z)가
기동 시 migration 을 실행해 04:33:24Z 에 적용**했다. 이어진 workflow 의 migration Job
`o4o-api-migrations-kr6zx`(04:33:41Z)은 `No pending migrations` 로 정상 종료했다.
(이 저장소의 API 배포는 서비스 기동 시 migration 이 먼저 돌고, 전용 Job 이 뒤따르는 순서다.)

### 운영 DB 실측 (read-only SELECT · Cloud SQL Auth Proxy)

| 항목 | 실측 |
|---|---|
| `app_registry` 의 `partnerops` | `status = inactive` (`updatedAt = 2026-09-10 04:33:24Z`) |
| `partnerops` 행 수 | **1** — §11 의 "행 수 ≠ 1" 중지 조건 아님 |
| `partnerops` 를 의존으로 선언한 앱 | **0** |
| `typeorm_migrations` | `669 DeactivateRetiredPartnerOpsAppRegistry20270404000000` |

### 운영 API 실측

`GET /api/v1/apps/availability` → `{"appId":"partnerops","active":false}`
§5.4 의 "absent 또는 `active=false`" 를 만족한다(§12 해석은 아래 7절 참조).

### §10.3 두 페르소나 실측 (`https://api.neture.co.kr`)

자격정보는 로컬 SSOT 문서에서 스크립트가 직접 읽어 사용했고, **도구 인자·로그·본 문서 어디에도
기록하지 않는다.** 출력은 상태 코드만 수집했다.

| 페르소나 | 보유 역할 | 대표 read | 대표 write |
|---|---|---|---|
| 플랫폼 관리자 | `platform:super_admin` 포함 | `GET .../masters/:id/store-descriptions` → **200** | `POST` 동일 경로 → 404(대상 부재, **403 아님**) |
| 서비스 역할 | `kpa:store_owner` · `cosmetics:store_owner` · `pharmacy-hub:store_owner` · `supplier` · `lms:instructor` (플랫폼 역할 없음) | **403** (`store-descriptions`, `image-quality`) | **403** (`store-descriptions` POST, `masters` POST) |
| 비인증 | — | **401** | — |

서비스 운영자 제출 경로 비회귀:
`GET /api/v1/operator/store-product-requests` → **200**,
`GET /api/v1/operator/product-candidates` → **400**(파라미터 검증, 권한 차단 아님).

> 8개 역할 전수 403 은 요청 수준 Jest 스위트(`product-db-write-authority.test.ts`)가 고정한다.
> 운영에는 `cosmetics:admin` · `neture:operator` 등을 **플랫폼 역할 없이** 보유한 계정이 없어
> (유일 보유 계정이 `platform:super_admin` 을 함께 가진다) 운영 실측은 위 3 페르소나로 수행했다.

### §10.4 브라우저 검증

**수행하지 않았다.** 안전하게 재사용할 수 있는 기존 인증 세션이 없고, WO §10.4 는
"비밀번호를 자동화 인자에 전달하지 않는다 · 안전한 인증 세션이 없다면 API 두 페르소나 실측과
선행 로그인 smoke 를 근거로 삼고 로그인 브라우저 검증을 억지로 수행하지 않는다" 를 정하고 있다.
근거는 위 §10.3 실측으로 대체한다.

---

## 7. 완료 조건 (§12)

```text
PARTNEROPS_PRODUCTION_REGISTRY_ACTIVE      = ZERO
PARTNEROPS_AVAILABILITY                    = ACTIVE_FALSE   (아래 주석)
PARTNER_CORE                               = PRESERVED
PARTNEROPS_SERVICE_GROUP                   = PRESERVED
PRODUCT_DB_PLATFORM_ADMIN_ROLE             = platform:super_admin
PRODUCT_DB_SERVICE_ROLE_DIRECT_ACCESS      = DENIED
PRODUCT_DB_ROLE_DECLARATION_DUPLICATION    = ZERO
SERVICE_PRODUCT_SUBMISSION_REGRESSION      = PASS
MENU_ROUTE_API_AUTH_ALIGNMENT              = PASS
ADMIN_LINT_BYPASS                          = ZERO
ADMIN_LINT_WARNING_RATCHET                 = ACTIVE
NEW_LINT_ERROR_GATE                        = PASS
NEW_LINT_WARNING_GATE                      = PASS

CodeQL Security Analysis                   = SUCCESS   (f2fb1eed0)
Deploy API Server (Cloud Run)              = SUCCESS   (f2fb1eed0)
Deploy Admin Dashboard (Cloud Run)         = SUCCESS   (c5147876d)
Deploy Web Services (Cloud Run)            = SUCCESS   (c5147876d)
AppStore Guard                             = NOT_TRIGGERED (로컬 실행 PASS)
CI Pipeline                                = 아래 주석
Production migration                       = SUCCESS   (04:33:24Z 적용 · 1행)

ADMIN_PARTNEROPS_REGISTRY_PRODUCTDB_AUTH_AND_LINT_GATE_FINAL_CLOSURE = CLOSED
```

**`PARTNEROPS_AVAILABILITY` 해석** — §12 의 문자 그대로의 ZERO 는 달성하지 않았다.
`GET /api/v1/apps/availability` 는 `listInstalled()` 로 전 행을 돌려주므로 `status='inactive'` 인
`partnerops` 가 `active:false` 로 남는다. **비활성화를 삭제보다 우선한다**는 §5.2 를 따른 결과이며,
삭제 선례(`20270219000000-RemoveLegacyCosmeticsPartnerAppRegistry`)와의 차이를 migration docblock 과
본 문서에 남긴다. §5.4 의 판정 기준("absent 또는 `active=false`")은 충족한다.
문자 그대로의 ZERO 가 필요하면 availability 응답에서 inactive 를 제외하는 별도 판단이 필요하다.

**`CI Pipeline`** — 본 WO 의 두 커밋 모두 `cancelled` 이다. 실패가 아니라 직후 push 가 같은
concurrency group 을 선점한 결과이며, 이 저장소의 상시 패턴이다(`307b09329` · `4a6fd09cd` 도 동일).
**cancelled 를 success 로 기록하지 않는다.** 본 WO 코드를 포함한 이후 tip 커밋의 CI Pipeline 결과로
대체 확인한다.

**부수 영향 (숨기지 않는다)** — 교정 전 결함이 다른 세션 커밋 `307b09329` 의
Deploy API Server 도 실패시켰다(04:25~04:26). `f2fb1eed0` 배포로 해소되었고 그 세션의 코드 변경에는
영향이 없다.

---

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
(저장소 전역 `ERROR_BASELINE` 51 → 45 하향 — §4.5)
