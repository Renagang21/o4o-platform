# IR-O4O-MARKET-TRIAL-SPO-OPL-CONVERSION-USAGE-AUDIT-V1

> **유형**: Investigation (read-only) — 유통참여형 펀딩(Market Trial) `SPO→OPL 전환`의 **실사용/배선/데이터 현황** 감사.
> **성격**: 코드/DB/migration/UI **무변경**. 조사 문서만.
> **목적**: A(전환 중단) / B(Neture 운영 org 한정) / C(Store read 격리) 결정을 위한 **근거 확보**. 데이터 영향 전 read-only 확인.
> **선행**: `IR-O4O-MARKET-TRIAL-BACKEND-NETURE-BOUNDARY-V1`(Phase 4 = B) · `WO-O4O-MARKET-TRIAL-KPA-MEMBERSHIP-GATE-REMOVAL-V1`(gateway 제거 완료).
> **작성일**: 2026-06-12

---

## 1. 목적
`createListingFromParticipant`(SPO→OPL 전환)이 **죽은 코드인지, 운영 배선된 활성 기능인지, 실제 데이터가 있는지**를 확인한다. 그 결과로 전환 경계 보정(A/B/C)과 기존 데이터 처리 정책을 정한다.

## 2. 핵심 결론(요약)
**전환은 죽은 코드가 아니라, operator·supplier UI 와 checkout 주문 파이프라인까지 완전히 배선된 활성 "유통참여 퍼널"이다.** 전환의 본질은 **참여자(약국)가 트라이얼 상품을 자기 매장에 도입(매장 진열)하고, 그 매장에서 주문이 발생하면 플랫폼이 "첫 주문"으로 추적**하는 것 — 즉 **설계상 Store 통합 그 자체**다. 따라서 Neture-only 정책("내 매장 주문 가능 상품·참여 이력과 연결하지 않는다")과의 충돌은 **단순 잔재가 아니라 기능 방향성 충돌**이며, A/B/C 결정은 제품 의사결정이다. **DB 실측은 본 환경에서 직접 수행 실패(§7) → 사용자 실행 필요(ready SQL 첨부).**

---

## 3. 전환 퍼널 — 코드 배선 전수 (Q1·Q5)

### 3.1 backend 엔드포인트 (operator, `/api/v1/neture/operator/market-trial`)
| 단계 | route | controller | 의미 |
|------|-------|------------|------|
| 상품 링크 | `POST /:id/convert` | convertToProduct | `trial.convertedProductId = SPO.id` 설정(line 1512, "neture 도메인 기준") |
| 고객 전환 상태 | `PATCH /:id/participants/:pid/conversion` | updateParticipantConversionStatus | `customerConversionStatus` = interested/considering/**adopted** 설정 |
| **매장 진열(전환)** | `POST /:id/participants/:pid/listing` | **createListingFromParticipant** | 참여자 매장 org 에 OPL 생성(`source_type='market_trial'`). 전제: status ∈ {adopted, first_order}(line 1135 `LISTING_ELIGIBLE`) |
| 퍼널 조회 | `GET /:id/funnel`, `GET /:id/kpi` | getFunnel/getTrialKpi | 전환 단계별 집계(convAdopted/convFirstOrder/listingCount) |

### 3.2 checkout 파이프라인 종결 (Q8·Q9 — 가장 중요)
`services/checkout.service.ts:192` — **주문 저장 직후** `tryConnectOrderToTrial(savedOrder)` 호출(fire-and-forget). 로직(line 544~):
```
order.sellerOrganizationId 의 OPL 중 source_type='market_trial' && offer_id=주문상품 매칭 →
해당 participant(customerConversionStatus='adopted')를 'first_order' 로 승격 + 공급자 알림.
```
→ **전환 OPL 은 Store 주문으로 실제 판매되는 것을 전제**로 하며, 주문 발생 시 퍼널 끝단(first_order)을 자동 추적한다. **Store 주문 원장과 직접 연동**(이전 IR Phase 5 의 "직접 cart/checkout 생성 없음"과 별개 — 여기서는 **기존 Store 주문을 trial 로 역연결**).

### 3.3 frontend UI 배선 (실 운영 노출)
| 위치 | 내용 |
|------|------|
| `services/web-neture/src/api/trial.ts:647` | 전환 listing 엔드포인트 API 클라이언트 |
| `pages/operator/MarketTrialApprovalDetailPage.tsx` | 전환 필터 "매장 도입(adopted)"·"첫 주문(first_order)", "매장 진열" 액션(line 1539), `trialConverted` 플래그 |
| `pages/supplier/SupplierDashboardPage.tsx:145` | 공급자 KPI **"매장 진열"**(storeListings) |
| `pages/supplier/SupplierTrialDetailPage.tsx:409,460` | "매장 진열 현황" / `listingCount`개 매장 진열 |

→ operator + supplier 양쪽 대시보드에 **1급 개념으로 노출**. 죽은 코드 아님.

---

## 4. OPL writer 전수 (Q6·Q7)
`source_type='market_trial'` OPL 을 **쓰는** 유일 지점 = `createListingFromParticipant`(INSERT line 1184). 나머지는 모두 **read**:
- `marketTrialController.ts:462`, `marketTrialOperatorController.ts:477`(listingCount 집계)
- `checkout.service.ts:572`(주문 역연결)
- `organization-product-listing.entity.ts:108,115`(엔티티 주석 — first-class)

생성 값: `organization_id`=참여자 owner/admin/manager org(약국), `service_key='neture'`, `offer_id`=convertedProductId(SPO.id), `source_type='market_trial'`, `source_id`=trialId. (Q6 = SPO.id 확정.)

## 5. Store 노출 경로 (Q8 — 이전 IR 재확인)
Store-facing OPL read 는 `opl.service_key` 가 아니라 **organization_id + org service enrollment** 기준(`product-access.utils.ts:50`, `StoreConsoleController.ts:179`, `product-ai-recommendation.service.ts:92`). → 전환 OPL(약국 org, service_key='neture')이 그 약국의 Store 상품뷰/AI 추천/콘솔에 **노출 가능**. `service_key='neture'` 는 일부 read 만 걸러 **완전 격리 아님**.

## 6. customerConversionStatus 상태머신
`none → interested → considering → adopted → first_order` (`VALID_CUSTOMER_CONVERSION_STATUSES`, operatorController:73). 전환(listing) 가능 = adopted/first_order. first_order 승격 = checkout hook(§3.2). KPI 집계는 operator/participant 양쪽 노출.

---

## 7. DB 실측 — 시도 및 상태 (PENDING)

**시도**: `gcloud sql connect o4o-platform-db --user=o4o_api --database=o4o_platform` 로 read-only SELECT 2회 시도 → **모두 timeout(exit 143)**. allowlisting 후에도 public IP(34.64.96.252) TCP 연결 미성립(egress IP/NAT 불일치 추정). **본 환경에서 직접 실측 불가.**

**대체 실행 경로**(택1):
- Google Cloud Console → Cloud SQL → o4o-platform-db → SQL editor 에서 아래 SQL 실행
- 또는 operator KPI 엔드포인트(`GET /api/v1/neture/operator/market-trial/kpi`, `/:id/funnel`)로 집계 확인(인증 필요)

**실행할 read-only SQL** (코드/데이터 무변경, SELECT 전용):
```sql
-- 1. trial 현황 + 전환 상품 링크 수
SELECT COUNT(*) AS total_trials,
       COUNT(*) FILTER (WHERE "convertedProductId" IS NOT NULL) AS with_converted
FROM market_trials;
SELECT status, COUNT(*) FROM market_trials GROUP BY status ORDER BY 2 DESC;

-- 2. participant 전환 단계 분포 + listing 연결 수
SELECT COALESCE("customerConversionStatus",'none') AS conv, COUNT(*)
FROM market_trial_participants GROUP BY 1 ORDER BY 2 DESC;
SELECT COUNT(*) FILTER (WHERE "listingId" IS NOT NULL) AS with_listing FROM market_trial_participants;

-- 3. 전환 OPL 실측 (존재/활성)
SELECT COUNT(*) AS mt_listings,
       COUNT(*) FILTER (WHERE is_active) AS active
FROM organization_product_listings WHERE source_type='market_trial';

-- 4. 전환 OPL 의 org 유형 + 서비스 enrollment (Store 노출 실위험 — KPA/GP/KCos 약국인지)
SELECT o.type AS org_type,
       COALESCE(string_agg(DISTINCT ose.service_code, ','), '(none)') AS services,
       COUNT(DISTINCT opl.id) AS cnt
FROM organization_product_listings opl
JOIN organizations o ON o.id = opl.organization_id
LEFT JOIN organization_service_enrollments ose ON ose.organization_id = o.id
WHERE opl.source_type='market_trial' GROUP BY o.type ORDER BY 3 DESC;

-- 5. 퍼널 끝단 실적
SELECT COUNT(*) AS first_order FROM market_trial_participants WHERE "customerConversionStatus"='first_order';
```

**판정 해석 기준**:
- 3·4 가 모두 0 → 전환 미사용(실데이터 없음). **A(전환 중단/비활성)** 안전.
- 4 의 services 가 neture-only/Neture 운영 org → Store 노출 위험 낮음, 기능 유지 검토.
- 4 에 kpa-society/glycopharm/k-cosmetics 약국 org 포함 → **Store 노출 실위험 확정**, 기존 데이터 정리 WO 필요.

---

## 8. 정책 충돌 분석 (A/B/C)

전환은 **유통참여형의 핵심 산출**(참여 약국의 매장 도입 + 첫 주문 추적)이다. Neture-only 정책("내 매장 주문 가능 상품·참여 이력과 연결하지 않는다")과 **정면 충돌** — 단순 잔재 제거가 아니라 **기능 방향성 결정**이다.

| 안 | 내용 | 평가 |
|----|------|------|
| **A 전환 중단** | `createListingFromParticipant` 비활성 + checkout hook 비활성 + UI "매장 진열" 숨김 | Neture-only 와 가장 정합. 단 **운영 배선된 퍼널(operator/supplier KPI 포함) 제거** → 제품 결정 필요. 데이터 있으면 정리 동반 |
| **B Neture 운영 org 한정** | OPL organizationId 를 참여자 약국 대신 Neture 운영 org 로 | **의미 모순** — 전환의 목적은 "참여 약국 매장 도입". Neture org 로 바꾸면 매장 도입/첫 주문 추적이 무의미. 사실상 기능 변형 |
| **C Store read 격리** | Store OPL read 에 `service_key`/`source_type` 필터 추가 | Store read 전수 영향(범위 큼·회귀 위험). 게다가 checkout hook·supplier KPI 는 여전히 Store 주문에 의존 → 격리 불완전 |

> **권고**: 데이터(§7) 확인 후, **정책 단호 유지 시 A** 가 일관적(전환 퍼널 자체가 Store 통합이므로 부분 격리로는 정책 충족 불가). 단 A 는 **운영 기능 제거**이므로 제품 오너 승인 필수. B 는 의미상 부적합, C 는 범위·불완전성으로 비권장. **단, "유통참여형 펀딩이 참여 매장의 도입·판매를 포함하는가"라는 상위 정의 재확인이 선행**되어야 한다(이 funnel 이 곧 "유통참여"의 구현이므로, 정책이 이를 정말 배제하는지 재확인).

---

## 9. 후속
1. **DB 실측(§7 SQL)** — Console SQL editor 또는 operator KPI 로 사용자 실행. 결과를 본 IR 에 추기.
2. 실측 후 결정:
   - 데이터 0 / 미사용 → `WO-O4O-MARKET-TRIAL-CONVERSION-DISABLE-V1`(A, 저위험).
   - 데이터 존재(약국 org) → `WO-O4O-MARKET-TRIAL-CONVERTED-LISTING-DATA-CLEANUP-V1`(기존 OPL 처리, **승인 필요**) + 전환 비활성.
3. **상위 정의 재확인** — "유통참여형 펀딩 = Neture 전용"이 **참여 매장 도입/첫 주문 추적까지 배제**하는지 제품 차원 확정(이 funnel 이 그 구현이므로). 배제가 맞으면 A, 포함이면 정책 자체를 정정.
4. 선행 IR supersede note → Neture 외부명 정렬(후순위).

## 10. 결론
- **전환은 활성·운영 배선 기능**(operator/supplier UI + checkout hook). 죽은 코드 아님.
- **본질은 Store 통합**(참여 약국 매장 도입 + 첫 주문 추적) → Neture-only 와 **기능 방향성 충돌**.
- Store 노출 경로 실재(org-scoped read). `service_key='neture'` 부분 격리뿐.
- **DB 실측은 본 환경 직접 불가(gcloud sql connect TCP 차단) → §7 SQL 사용자 실행 필요.**
- 결정 권고: 정책 단호 유지 시 **A(전환 중단)** + 데이터 정리. **단 상위 정의 재확인 선행** — 이 funnel 이 "유통참여" 구현이므로, 정책이 이를 정말 배제하는지 제품 차원 확인 후 진행.

---

*Date: 2026-06-12 · read-only IR · 코드 무변경 · 전환 = 활성 Store 통합 퍼널(operator/supplier UI + checkout hook). DB 실측 PENDING(gcloud TCP 차단 — §7 SQL 사용자 실행). 권고: 정책 유지 시 A + 데이터 정리, 단 상위 정의 재확인 선행.*
