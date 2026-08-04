# CHECK-O4O-PHARMACY-HUB-STORE-GUARD-DEPLOY-AND-PRODUCTION-SMOKE-V1

> WO: `WO-O4O-PHARMACY-HUB-STORE-GUARD-DEPLOY-AND-PRODUCTION-SMOKE-V1`
> 선행: [CHECK-O4O-STORE-OWNER-GUARD-PHARMACY-HUB-REGISTRATION-V1](CHECK-O4O-STORE-OWNER-GUARD-PHARMACY-HUB-REGISTRATION-V1.md) (W2) ·
> [CHECK-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1](CHECK-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1.md) (W1)
> 일자: 2026-08-04 · 범위: **배포 + 운영 리비전 smoke (코드 변경 0 · DB write 0)**

---

## 0. 결과 요약

| # | 완료 기준 | 판정 | 근거 |
|:-:|---|:-:|---|
| 1 | `o4o-core-api` 배포 | **PASS** | §1 — run `30886493201` success |
| 2 | 배포 리비전에 `0f9cd9822` 포함 확인 | **PASS** | §2 — image tag = commit SHA 일치 |
| 3 | Pharmacy-Hub E2E 테스트 계정 로그인 | **PARTIAL** | §3 — 전용 E2E 계정 비밀번호 미기록 → 서버 측 실측으로 대체 (사용자 승인) |
| 4 | `resolveStoreAccess()` 기반 API 실제 호출 | **PASS** | §4 — 운영 리비전 HTTP 3계정 × 5 endpoint |
| 5 | 공통 매장 API 5개 200 | **PASS** | §4 |
| 6 | 비매장 사용자 403 | **PASS(서버측)** | §5 — HTTP 401×5 + 미들웨어 실측 403 |
| 7 | KPA·GlycoPharm·K-Cosmetics 회귀 0 | **PASS** | §6 |
| 8 | `renagang21` HOLD · 무변경 확인 | **PASS** | §7 — 프로덕션 DB read-only 재확인 |
| 9 | 실제 브라우저 smoke | **PASS** | §4 · §8 |

**종합 판정: PASS (3번 항목만 사용자 승인 하 서버측 실증으로 대체)**

부수 확인: **`pharmacyhub.co.kr` 매장 화면은 아직 셸** — "약국 경영자 / 매장 운영·공급 상품 확인 (준비 중)". 브라우저로 진입할 PH 매장 페이지가 존재하지 않으므로, PH 측 브라우저 검증 범위는 로그인·권한·API 레벨로 한정된다. 이는 다음 트랙 `WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1` (W3) 의 필요성을 독립적으로 확인한 것이다.

---

## 1. 배포 (완료기준 1)

`.github/workflows/deploy-api.yml` 은 main push 중 `apps/api-server/**` 변경 시 자동 트리거된다. W2 커밋 `0f9cd9822` push 로 실행됐다.

```
workflow run  30886493201   deploy-api   conclusion=success
migrations    실행 완료 (신규 migration 없음 — W2 는 코드 전용 변경)
verify step   통과
```

배포 후 서비스 상태:

```
gcloud run services describe o4o-core-api --region asia-northeast3
  revision  o4o-core-api-03147-59t
  traffic   100%
  status    Ready
```

---

## 2. 리비전 ↔ 커밋 대조 (완료기준 2)

리비전이 "최신"이라는 추정이 아니라, **이미지 digest 를 Artifact Registry 태그로 역추적**하여 커밋 SHA 를 확인했다.

```
revision o4o-core-api-03147-59t
  image digest  sha256:506cd1c3…
  ↓ Artifact Registry tag 조회
  tag           0f9cd9822213e2eb652f4ee01719821a4db4a575
  = git commit  0f9cd9822  (WO-O4O-STORE-OWNER-GUARD-PHARMACY-HUB-REGISTRATION-V1)
```

→ **운영 트래픽 100% 를 받는 리비전이 W2 가드 코드를 포함한다.**

---

## 3. E2E 계정 로그인 (완료기준 3) — PARTIAL

W1 이 생성한 Pharmacy-Hub 전용 단일 조직 E2E 주체:

```
user          5ee37566-2a51-4929-8b3d-ccc58ce9e014
email         e2e.test.pharmacyhub.owner.active@example.com
organization  ph-pharm-5ee375662a51
```

**HTTP 로그인 미수행.** 사유: 해당 계정 비밀번호는 정책상 저장소·문서·채팅 어디에도 기록되지 않았다 ([CHECK-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §258](CHECK-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1.md) — "비밀번호는 저장소 · 본 문서 · 채팅 어디에도 기록하지 않았다"). 비밀번호 재설정은 DB write 이므로 본 WO 범위 밖이다.

**대체 근거 (사용자 명시 승인).** 이 계정의 **단일 조직 실증은 W2 에서 이미 확보된 서버 측 검증**으로 기록한다 — 실제 `AppDataSource` + 실제 프로덕션 DB + 실제 `requireAuth` + 실제 `createRequireStoreOwner` 로 라우터를 마운트하여 5개 endpoint 를 호출한 결과:

| 주체 | 결과 |
|---|---|
| PH active owner (`5ee37566…`) | 5개 endpoint 전부 진입 · `organizationId = ph-pharm-5ee375662a51` 해석 |
| PH rejected (`0d028c2e…`) | `MEMBERSHIP_NOT_ACTIVE` 403 |

상세는 [CHECK-O4O-STORE-OWNER-GUARD-PHARMACY-HUB-REGISTRATION-V1 §3](CHECK-O4O-STORE-OWNER-GUARD-PHARMACY-HUB-REGISTRATION-V1.md) 참조. 이 검증은 배포 전 코드로 수행됐으나, §2 에서 배포 리비전이 **동일 커밋**임을 확인했으므로 코드 동일성이 보장된다.

> **잔여 부채 (후속).** 전용 E2E 계정의 운영 HTTP 레벨 실증은 미수행이다.
> `WO-PHARMACY-HUB-PROVISIONING-SAFE-E2E-V1` (신규 승인 프로비저닝 안전 E2E) 에서
> 계정 생성 시점에 자격증명을 세션 내에서만 확보하는 방식으로 해소한다.

---

## 4. 운영 리비전 공통 매장 API 실측 (완료기준 4·5·9)

**대상 API 5개** — 전부 `resolveStoreAccess()` / `createRequireStoreOwner()` 기반:

```
GET /api/v1/store/local-products
GET /api/v1/store/handled-products
GET /api/v1/store/tablets
GET /api/v1/store/product-pool
GET /api/v1/store/library
```

**External base = `https://api.neture.co.kr`** (`run.app` 직접 URL 은 ingress 차단 — `WO-O4O-CLOUD-RUN-INGRESS-LOAD-BALANCER-ONLY-V1`).

### 4-1. 기본 상태

```
GET https://api.neture.co.kr/health                200
무인증 5 endpoint                                  401 × 5
```

### 4-2. 실제 브라우저 로그인 후 실측

실제 Chromium 세션에서 각 서비스 도메인으로 로그인 → 페이지 컨텍스트의 JWT 로 5개 endpoint 호출.

**(a) KPA — `kpa-society.co.kr` / renagang21**

`/store` 실데이터 렌더 확인 (자료실 7 · QR 27 · 진열 20행).

| endpoint | 결과 |
|---|---|
| `/api/v1/store/local-products` | `200 success items(8)` |
| `/api/v1/store/handled-products` | `200 success items(20)` |
| `/api/v1/store/tablets` | `200 success array(4)` |
| `/api/v1/store/product-pool` | `200 success object` |
| `/api/v1/store/library` | `200 success array(23)` |

**(b) GlycoPharm — `www.glycopharm.co.kr` / renagang21**

`/store` 진입 확인 · 동일 **5/5 200**.

**(c) Pharmacy-Hub — `pharmacyhub.co.kr` / renagang21**

```
서비스 가입 상태: active
roles        kpa:store_owner, cosmetics:store_owner, lms:instructor, pharmacy,
             glycopharm:store_owner, supplier, pharmacy-hub:store_owner
memberships  platform / kpa-society / pharmacy-hub / glycopharm / neture / k-cosmetics = all active
```

동일 **5/5 200**.

> **한계 명시.** renagang21 은 **다중 조직 계정**(활성 3건)이므로, 이 계정의 5/5 200 은
> "`pharmacy-hub:store_owner` role 이 registry 에 등록되어 가드를 통과한다"는 것을 증명하지만
> **어떤 organizationId 가 선택되는지는 보장하지 않는다** — `isStoreOwner()` 의
> `organization_members … LIMIT 1` 이 `ORDER BY` 없이 실행되기 때문이다(기존 미해결 이슈, 본 WO 범위 밖).
> 단일 조직 organizationId 정합은 §3 의 E2E 주체 서버측 실측이 담당한다.

**(d) sohae2100 — `kpa-society.co.kr`**

`/admin/kpa-dashboard` 진입(활성 회원 5 · 승인 대기 0). 이 계정은 **비매장 사용자가 아니었다** — 토큰 claim 에 `kpa:store_owner` 가 포함되고 조직도 보유하여 **5/5 200**. 완료기준 6 의 근거로는 쓸 수 없으며(§5 참조), KPA 회귀 0 의 추가 표본으로만 기록한다.

| endpoint | 결과 |
|---|---|
| `/api/v1/store/local-products` | `200 success items(2)` |
| `/api/v1/store/handled-products` | `200 success items(2)` |
| `/api/v1/store/tablets` | `200 success array(0)` |
| `/api/v1/store/product-pool` | `200 success object` |
| `/api/v1/store/library` | `200 success array(6)` |

검증 종료 후 **로그아웃 수행** — `/admin/kpa-dashboard` 재진입 시 `접근 권한이 없습니다 / 로그인이 필요합니다`.

---

## 5. 비매장 사용자 차단 (완료기준 6)

**HTTP 레벨 (운영 리비전):**

```
무인증 5 endpoint  →  401 × 5
```

**미들웨어 레벨 (실제 프로덕션 DB · 동일 커밋 코드):** 보유 브라우저 자격증명이 전부 store_owner role 을 가지므로(§4-2(d) 포함), 순수 비매장 사용자의 HTTP 실측은 불가능했다. 대신 W2 에서 실제 `createRequireStoreOwner` 를 프로덕션 DB 에 붙여 측정한 결과를 근거로 한다:

| 주체 | back-compat | `pharmacy-hub` | `kpa` |
|---|:-:|:-:|:-:|
| PH active owner | 200 (+organizationId) | 200 (+organizationId) | 403 `STORE_OWNER_REQUIRED` |
| PH rejected | 403 | 403 `MEMBERSHIP_NOT_ACTIVE` | 403 |
| KPA store owner | 200 | 403 `MEMBERSHIP_NOT_FOUND` | 200 |
| **비매장 사용자** | **403 `STORE_OWNER_REQUIRED`** | **403** | **403** |

→ 비매장 사용자는 모든 가드 경로에서 차단된다. 추가로 W2 하드닝으로 **role 은 있으나 조직 미연결** 인 사용자도 통과하지 못한다(`!isOwner || !organizationId`).

---

## 6. 기존 서비스 회귀 (완료기준 7)

**코드 레벨.** W2 변경은 (a) registry 에 `pharmacy-hub` 키 **추가**, (b) POP/QR catalog map 2건 **추가**, (c) 가드에 `|| !organizationId` **추가**. (a)(b) 는 순수 additive 로 기존 서비스 분기에 닿지 않는다. (c) 만 동작을 바꿀 수 있다.

**데이터 레벨 (프로덕션 실측).** (c) 의 영향 범위 = "active store_owner 인데 조직 미보유" 인원:

| 서비스 | active store_owner | 조직 보유 | 조직 미보유(=영향) |
|---|:-:|:-:|:-:|
| kpa | 5 | 5 | **0** |
| glycopharm | 1 | 1 | **0** |
| cosmetics | 2 | 2 | **0** |
| pharmacy-hub | 3 | 2 | 1 (rejected E2E — 의도된 차단) |

→ 기존 3서비스 **동작 변화 0**.

**런타임 레벨.** §4-2 에서 KPA(2계정) · GlycoPharm 모두 5/5 200, KPA `/store` 는 실데이터 렌더(자료실 7 · QR 27 · 진열 20). K-Cosmetics 는 활성 store_owner 2명이 전원 조직을 보유하여 (c) 의 영향이 구조적으로 0이며, 코드 경로가 KPA·GlycoPharm 과 동일한 공통 가드이므로 별도 로그인 없이 위 표로 대체한다.

---

## 7. renagang21 HOLD · 무변경 (완료기준 8)

프로덕션 DB **read-only** 재확인 (`cloud-sql-proxy` 경유, write 0):

```
renagang21 활성 조직 (3)
  KCOSA3DDC841B946
  kpa-pharm-1088602873
  neture-supplier-6967ebe0
  → ph-pharm-* 없음                                   ✅ HOLD 유지

전체 ph-pharm-* 조직 (1건뿐)
  ph-pharm-5ee375662a51   createdAt 2026-08-03T21:14:45.252Z   (= W1 E2E 프로비저닝)

E2E 주체 W1 산출물 온전
  organization_members              c5e3a37a-4aac-4b89-ab51-1a88b960ed50 / owner / left_at NULL
  organization_service_enrollments  service_code=pharmacy-hub / status=active
  platform_store_slugs              e2e-test-pharmacy-hub-검증약국-a / pharmacy-hub / is_active=true
  users.status                      active

pharmacy-hub:store_owner active 총 3
```

→ **renagang21 조직 데이터 무변경 · W1 프로비저닝 산출물 무손상 · DB write 0.**

---

## 8. 브라우저 smoke 요약 (완료기준 9)

실제 Chromium 세션 · 4개 도메인:

| 도메인 | 진입 | 결과 |
|---|---|---|
| `kpa-society.co.kr` | `/store` (renagang21) | 실데이터 렌더 · 5/5 200 |
| `www.glycopharm.co.kr` | `/store` (renagang21) | 진입 · 5/5 200 |
| `pharmacyhub.co.kr` | 로그인 (renagang21) | `가입 상태 active` · `pharmacy-hub:store_owner` 확인 · 5/5 200 · **매장 화면은 셸("준비 중")** |
| `kpa-society.co.kr` | `/admin/kpa-dashboard` (sohae2100) | 진입 · 5/5 200 · 이후 **로그아웃 확인** |

자격증명은 브라우저 세션에서만 사용했고 CHECK · 로그 · 스크린샷 · 커밋 · 소스 · 환경 파일 어디에도 기록하지 않았다. 비밀번호 변경 · DB write 0.

---

## 9. 범위 밖 (후속 트랙)

| 항목 | 처리 |
|---|---|
| `isStoreOwner()` 의 `ORDER BY` 없는 `LIMIT 1` 비결정성 | 별도 WO — 다중 조직 계정의 organizationId 선택 안정화 |
| 전용 E2E 계정 운영 HTTP 실증 | `WO-PHARMACY-HUB-PROVISIONING-SAFE-E2E-V1` |
| Pharmacy-Hub 매장 셸 · 사이드바 · 메뉴 | **W3 — `WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1` (다음)** |
| Pharmacy-Hub 매장 대시보드 | W4 |
| foreign-visitor-partner / store-entitlement pharmacy-hub 확장 | 별도 |
| neture seller · store-playlist service-aware 전환 | 별도 |

---

## 10. 변경 파일

**코드 변경 0.** 본 CHECK 문서 1건만 추가.
