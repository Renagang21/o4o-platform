# WO-O4O-PRODUCT-POLICY-V2-INTERNAL-SECRET-SEPARATION-V1 — CHECK

**일자:** 2026-08-08
**선행:** `4971381fb` (seed route 제거) 의 보류 4 — `ADMIN_INTERNAL_SECRET || JWT_SECRET` fallback 잔존 1건
**결론:** **secret 을 분리하지 않고 router 를 제거했다.** 생명주기 판정 결과 휴면이었고, `ADMIN_INTERNAL_SECRET` 신규 발급도 불필요해졌다.

---

## 1. 기능의 실제 소비처와 운영 필요성

### 1-1. 대상 — `/api/internal/v2/product-policy/*` (9 endpoint)

| endpoint | 상태 | 대체 경로 |
|----------|------|-----------|
| `POST /public-listing` | **이미 410 DEPRECATED** (`WO-NETURE-TIER1-AUTO-EXPANSION-BETA-V1`) | 승인 시 자동 생성 |
| `POST /service-approval` | 승인 생성 | `seller.controller.ts:147` → `createServiceApproval()` |
| `POST /service-approval/:id/approve` | 승인 처리 | **3서비스 정식 operator route** (§1-3) |
| `POST /private-approval` | 승인 생성 | `pharmacy-products.controller.ts:456` → `createPrivateApproval()` |
| `POST /private-approval/:id/approve` | 승인 처리 | 없음 — 단, 승인 대상 0건 (§1-4) |
| `GET /listings` · `GET /products` · `GET /approvals` | 진단 조회 | Cloud SQL Auth Proxy + psql |
| `PATCH /products/:id` | **테스트용** offer `distributionType`/`allowedSellerIds` 변경 | 없음 (운영 기능 아님) |

파일 헤더 자체가 `Product Policy v2 — Internal Test Endpoints`, `Admin 전용 테스트 엔드포인트` 다.

### 1-2. 소비처 0

프런트(`services/**`) `internal/v2` · `x-admin-secret` 참조 **0건**. 스크립트·CI·백엔드 호출 **0건**. 유일한 참조는 `register-routes.ts` 등록과 문서였다.

### 1-3. SERVICE 승인은 정식 route 로 대체 완료

`IR-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-AUDIT-V1`(2026-06-13)은 "GP/K-Cos 의 PENDING 승인 **유일 경로**가 이 internal router" 라고 기록했다. 그러나 **바로 다음날** `WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1`(2026-06-14 · `677a9e61c` → `71f280860`)로 대체됐다.

| 서비스 | 정식 route | 가드 |
|--------|-----------|------|
| KPA | `/api/v1/kpa/operator/product-applications` | `requireAuth` + `kpa:operator` + ActionLog |
| GlycoPharm | `/api/v1/glycopharm/operator/product-applications` | `requireAuth` + `glycopharm:operator` + ActionLog |
| K-Cosmetics | `/api/v1/cosmetics/operator/product-applications` | `requireAuth` + `cosmetics:operator` + ActionLog |

셋 다 동일한 `ProductApprovalV2Service.approveServiceProduct()` 를 호출한다. **IR 은 stale 이며 본 커밋에서 SUPERSEDED 주석을 달았다.**

### 1-4. 프로덕션 실측 — 승인할 대상이 존재하지 않았다

Cloud SQL Auth Proxy 경유 **read-only** 실측 (2026-08-08):

| 측정 | 값 |
|------|-----|
| `product_approvals` 전체 row | **0** |
| `supplier_product_offers` by `distribution_type` | `SERVICE` 1 (active) · `PRIVATE` 1 (**inactive**) |
| PRIVATE offer 의 `allowed_seller_ids` 범위 | **0개** (어떤 매장도 신청 불가) |
| `organization_product_listings` | 20 (전부 타 경로 생성) |

`product_approvals` 가 0 row 라는 것은 **v2 승인 흐름이 프로덕션에서 단 한 건도 생성된 적이 없다**는 뜻이다. 따라서 `/private-approval/:id/approve` 에 대체 경로가 없다는 사실은 실질적 위험이 아니다 — 승인할 PENDING 이 0건이고, 유일한 PRIVATE offer 는 비활성 + 판매자 범위 0 이라 `findApplicableOffer` 게이트를 통과할 수 없어 신규 생성도 불가하다.

**운영 필요성: 없음.** 휴면 확정.

---

## 2. 기존 인증 구조와 위험

```
X-Admin-Secret  ===  ADMIN_INTERNAL_SECRET || JWT_SECRET
```

| 위험 | 내용 |
|------|------|
| **서명키 재사용** | `ADMIN_INTERNAL_SECRET` 미설정 시 `JWT_SECRET` 으로 폴백. 토큰 서명키가 곧 관리 API 키가 되어, 이 헤더가 유출되면 임의 토큰 위조까지 가능 |
| **프로덕션 활성** | `.github/workflows/deploy-api.yml:319` 이 `ENABLE_INTERNAL_V2=true` 를 설정 → **프로덕션에 실제 등록돼 있었다**. (선행 CHECK 의 "기본 미등록" 은 오기이며 본 커밋에서 정정) |
| **RBAC 우회** | 사용자·역할·스코프 개념이 없다. 시크릿 보유자 = 전권 |
| **감사 부재** | ActionLog 없음. 누가 승인했는지 남지 않음 (정식 operator route 는 남긴다) |
| **운영 데이터 변경** | `PATCH /products/:id` 가 offer 의 `distributionType`·`allowedSellerIds` 를 무제한 변경 — 유통 정책 자체를 바꾸는 쓰기 |

secret 비교는 타이밍 비교 취약점(`===`)이 있으나, 값 자체를 로그에 남기지는 않았다.

---

## 3. router 유지 / 제거 판정

**제거.** WO 기본 판정의 "기능 자체가 소비처 없는 휴면 코드라면 secret 만 고치지 말고 router 생명주기 제거 여부를 먼저 판정한다" 를 적용했다.

`ADMIN_INTERNAL_SECRET` 을 신설했다면 새 비밀정보를 발급·배포·회전 관리해야 했고, 이는 WO 중지 조건(「별도의 비밀정보 발급·외부 조정이 필요함」)에 걸린다. **제거는 그 조건 자체를 소멸시킨다.**

**유지한 것:** `ProductApprovalV2Service`(590줄) — `admin.controller` · `seller.controller` · KPA/GP/KCos operator controller · `pharmacy-products.controller` 가 실사용한다. **서비스 레이어는 손대지 않았다.**

---

## 4. secret 계약과 설정 실패 동작

| 항목 | 변경 후 |
|------|---------|
| `ADMIN_INTERNAL_SECRET` | **불필요** — 저장소 내 참조 0 |
| `JWT_SECRET` | 토큰 서명·검증 **전용**으로 환원. 내부 API 인증 용도 사용처 0 |
| `ENABLE_INTERNAL_V2` | **불필요** — 코드·배포 워크플로에서 모두 제거 |
| 설정 실패 동작 | 해당 없음 (등록 경로 자체가 없음 = fail-closed 보다 강한 상태) |

---

## 5. 배포 환경 영향

`.github/workflows/deploy-api.yml` 에서 `--set-env-vars="ENABLE_INTERNAL_V2=true"` 1줄 제거. gcloud 는 반복된 `--set-env-vars` 를 최종 집합으로 치환하므로, 다음 배포부터 Cloud Run 에 해당 변수가 설정되지 않는다. 다른 변수·줄 연결·플래그는 무변경.

**운영 영향 없음** — 제거된 경로의 프로덕션 호출 실적이 0 이고 승인 대상도 0 이었다.

---

## 6. 검증 결과

| 항목 | 결과 |
|------|------|
| `pnpm install --frozen-lockfile` | ✅ exit 0 |
| `JWT_SECRET` fallback 잔존 | ✅ **0** |
| `ADMIN_INTERNAL_SECRET` 참조 잔존 | ✅ **0** |
| `ENABLE_INTERNAL_V2` 참조 잔존 (코드·워크플로) | ✅ **0** |
| `internal/v2` route 참조 잔존 | ✅ 0 (설명 주석 제외) |
| `x-admin-secret` 인증 route 잔존 | ✅ **0** (저장소 전체) |
| deploy-api.yml 줄 연결 무결성 | ✅ 정상 |
| `npx tsc --noEmit` (api-server) | ✅ exit 0 |
| `pnpm run type-check` (전 서비스) | ✅ OK |
| `pnpm run check:unsafe-routes` | ✅ 위반 0 |
| guard spec 2종 | ✅ PASS |
| `git diff --check` | ✅ exit 0 |

---

## 7. 후속 (범위 외로 남긴 것)

| # | 항목 | 비고 |
|---|------|------|
| 1 | `ProductApprovalV2Service.approvePrivateProduct()` · `rejectPrivateApproval()` | router 제거로 호출처 0 이 됐다. **PRIVATE 승인 operator surface 부재**는 기존 갭 그대로다. 도메인 리팩터링이므로 본 WO 범위 외 |
| 2 | PRIVATE 승인 흐름 설계 | 매장이 PRIVATE offer 를 신청할 수는 있으나(`pharmacy-products` `/apply`) 승인할 operator UI 가 없다. 실사용이 생기면 SERVICE 와 동일하게 정식 operator route 로 설계할 것 |
| 3 | `__test__/tier1/*` | 생명주기 미확정 (소비처 `Tier1TestPage.tsx` 실재) |
| 4 | 과거 seed fixture | 운영 DB `e0000000%` / `f0000000%` 잔존 조사 미착수 |
