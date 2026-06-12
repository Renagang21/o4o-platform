# IR-O4O-MARKET-TRIAL-BACKEND-NETURE-BOUNDARY-V1

> **유형**: Investigation (read-only) — 유통참여형 펀딩(Market Trial) backend 의 Neture-only 경계 조사.
> **성격**: 코드/DB/migration/UI **무변경**. 조사 문서만.
> **정책 기준**: 유통참여형 펀딩 = **Neture 전용**. KPA/GP/KCos 운영자·매장 허브·내 매장·주문 가능 상품·참여 이력과 연결하지 않는다.
> **선행**: `IR-O4O-MARKET-TRIAL-NETURE-ONLY-BOUNDARY-CORRECTION-V1`(경계 확정) · `WO-O4O-MARKET-TRIAL-STORE-REDIRECT-AND-CARD-REMOVAL-V1`(frontend 흔적 제거 완료).
> **작성일**: 2026-06-11

---

## 1. 목적
Store frontend 흔적 제거 후 backend 에 남은 Store 서비스 연결 가능성을 조사한다. 핵심 2지점: ① `marketTrialController.ts` KPA membership gate ② `convertedProductId(SPO)→OPL` 전환의 Store 노출 경계.

## 2. 정책 기준
유통참여형 펀딩은 Neture 내부 기능. backend 에서도 KPA membership 필수, serviceKey/organization 기반 참여 게이트, Store Hub 노출, 내 매장 참여 이력, Store OPL 자동 노출, Store checkout/cart 직접 생성이 없어야 한다.

## 3. 조사 범위
`controllers/market-trial/{marketTrialController,marketTrialOperatorController}.ts` · `routes/market-trial{,-operator}.routes.ts` · `extensions/trial-{fulfillment,shipping,forum-monitor}` · `jobs/market-trial-lifecycle.job.ts` · `packages/market-trial/src/entities/*` · `bootstrap/register-routes.ts` · 연결 후보 entity(OPL/SPO/checkout_orders/store_cart_items/organization_members).

---

## 4. Phase 1 — backend route/API 매핑

엔티티: `@o4o/market-trial`(MarketTrial / MarketTrialParticipant / MarketTrialForum / MarketTrialDecision). 라우트 등록: `register-routes.ts:372,377`.

| route/API | method | 인증/권한 | 기능 | Store 연결 | 판정 |
|-----------|--------|-----------|------|:---:|:---:|
| `/api/market-trial/` POST | createTrial | `authenticate` | 공급자 Trial 생성(DRAFT) | 없음 | A |
| `/api/market-trial/my` GET | getMyTrials | `authenticate` | 공급자 내 Trial | 없음 | A |
| `/api/market-trial/my-participations` GET | getMyParticipations | `authenticate` | 내 참여 목록 | userId 기준 | A |
| **`/api/market-trial/gateway` GET** | gateway | `optionalAuth` | **서비스 유입 창구 — KPA membership + 약국 org 게이트** | **KPA 결합** | **B** |
| `/api/market-trial/` GET, `/:id` GET | getTrials / getTrialById | `optionalAuth` | 공개 목록/상세 | 없음 | A |
| `/api/market-trial/:id` PATCH | updateTrial | `authenticate` | 공급자 수정 | 없음 | A |
| `/api/market-trial/:id/join` POST | joinTrial | `authenticate` | 참여(직접, 승인 없음) | userId 기준 | A |
| `/api/market-trial/:id/{participation,results,submit,my-settlement,settlement-choice}` | 각 | `authenticate` | 참여 상세/결과/정산선택 | userId 기준 | A |
| **`/api/v1/neture/operator/market-trial/*`** | operator | operatorOnly (**Neture operator 경로**) | 검수/전환/KPI/정산 | §7 참조 | — |
| `trial-fulfillment .../create-order` POST | createOrder | `authenticate`+`operatorOnly` | 보상 풀필먼트 주문(NetureService) | §8 참조 | A |
| `trial-shipping` / `trial-forum-monitor` | 각 | 내부 | 배송지/포럼 동기화 | 없음 | A |

> 라우트 레벨에는 serviceKey/KPA 게이트가 없다(공개·참여는 `authenticate`/`optionalAuth`만). KPA 결합은 **gateway 엔드포인트 코드 내부**에만 존재. operator 라우트는 경로 자체가 `/api/v1/neture/operator/...` 로 **Neture operator 스코프**.

---

## 5. Phase 2 — KPA membership gate 조사

**위치**: `marketTrialController.ts` `gateway()` (GET `/api/market-trial/gateway`), 단일 지점. 도입 WO: `WO-MARKET-TRIAL-SERVICE-ENTRY-BANNER-AND-GATEWAY-V1`("서비스별 유입 창구용").

**로직** (line 81-127):
```
1. 로그인 없으면 not_logged_in
2. service_memberships WHERE service_key IN ('kpa','kpa-society')  → 없으면 no_kpa_membership
3. organization_members JOIN organizations (isActive, left_at IS NULL) → 없으면 not_pharmacy_member
4. RECRUITING trial 목록 반환
```

**의미**: 이 엔드포인트는 방금 제거한 **KPA 진입 배너("유통참여형 펀딩 참여")의 backend** 다. KPA 회원 + 약국 org 를 가진 사용자에게만 "유입 창구"를 열어준다 — 즉 **Market Trial 접근을 KPA Store 개념(약사회 멤버십·약국 조직)으로 게이트**한다.

**호출자**: frontend 전수 grep 결과 **0건**(WO-...-REDIRECT-AND-CARD-REMOVAL-V1 으로 KPA 배너/게이트웨이 호출 제거됨). → **고아 엔드포인트**.

| 파일/라인 | endpoint | 조건 | 호출자 | 위험 | 판정 |
|-----------|----------|------|:---:|------|:---:|
| `marketTrialController.ts:81-127` | GET /gateway | KPA membership + 약국 org | **0(고아)** | 비파괴(빈 상태 반환)이나 Market Trial 을 KPA Store 개념으로 결합 | **B** |

> **판정 B** — 과거 KPA Store 연결 흔적. Neture-only 정책과 충돌(유통참여형 펀딩을 KPA 멤버십/약국 org 로 게이트). 현재 호출자 없음 → 제거 안전. (참고: gateway 는 read-only·빈 상태 반환이라 즉시 장애는 없음 → 긴급 E 아님.)

---

## 6. Phase 3 — participant 모델 조사

**엔티티** `MarketTrialParticipant` (`packages/market-trial/src/entities/MarketTrialParticipant.entity.ts`):
```
id (PK uuid) · trialId (uuid) · participantId (uuid = USER id) · price ·
status · fulfillmentStatus · listingId(uuid, nullable) · settlement/choice/offline-payment 필드 ·
NO organizationId · NO storeId · NO serviceKey
```
주석: "No approval/status fields - participation is direct."

| entity | 연결 컬럼 | Store 조직 연결 | Neture 내부성 | 판정 |
|--------|-----------|:---:|:---:|:---:|
| `market_trial_participants` | `participantId`=userId, `trialId` | **없음**(org/store/serviceKey 컬럼 부재) | userId 기준 | **A** |

> participant 는 **Neture 사용자(userId) 기준**. Store organization/serviceKey 에 바인딩되지 않는다. organization 결합은 오직 **전환 시점**(§7)에 `organization_members` 조회로 파생. 구조적으로 안전.

---

## 7. Phase 4 — convertedProductId(SPO)→OPL 전환 경계

**전환 함수**: `marketTrialOperatorController.ts:1100 createListingFromParticipant` (operator, `/api/v1/neture/operator/...`). 전제(line 1094): `trial.convertedProductId = supplier_product_offers.id` (Q6 = **yes**, line 1482 "neture 도메인 기준").

**생성 로직** (line 1150-1208):
```
organizationId = 참여자(participantId)의 organization_members(owner/admin/manager) 조회  ← 참여자의 매장 org
INSERT organization_product_listings
  (organization_id=<참여자 매장 org>, service_key='neture'(하드코딩), master_id, offer_id=convertedProductId,
   source_type='market_trial', source_id=trialId)
응답 메시지: "매장 진열이 등록되었습니다."
```

**Store 노출 경로 검증** — Store-facing OPL 조회는 **`opl.service_key` 가 아니라 organization_id + org 의 service enrollment** 기준:
- `store-ai/utils/product-access.utils.ts:50` — `WHERE opl.organization_id = $1 AND opl.is_active = true` (service_key 필터 **없음**)
- `operator/StoreConsoleController.ts:179` — `INNER JOIN organization_service_enrollments ose ... service_code = ANY($1)` + `WHERE o.type IN ('pharmacy','store','branch') AND opl.is_active=true` (org enrollment 기준, opl.service_key **미검사**)
- `store-ai/services/product-ai-recommendation.service.ts:92` — org 기준

→ 전환 OPL(`service_key='neture'`, org=참여자 약국)이 그 **약국의 Store 상품뷰(store-ai/operator console 등)에 노출될 수 있다.** 엔티티 주석(`organization-product-listing.entity.ts:108` "source_type='market_trial' when created via Trial listing flow")도 이 결합이 **설계상 의도**임을 보여준다.

| 단계 | 데이터 | org/service 기준 | Store 노출 | 판정 |
|------|--------|------------------|:---:|:---:|
| convertedProductId | = SPO.id (neture 도메인) | — | — | A |
| OPL 생성 organizationId | 참여자 **매장 org**(약국) | organization_members | — | — |
| OPL service_key | `'neture'` 하드코딩 | — | 부분 격리(일부 read만 사용) | C |
| Store OPL read | **org 기준**(service_key 미필터) | org enrollment + organization_id | **노출 가능** | **B** |

> **판정 B** — 전환이 **참여자 매장 org 에 OPL 을 생성**(설계상 "매장 진열")하고, 지배적 Store OPL read 가 org 기준이라 노출 가능. Neture-only("내 매장 주문 가능 상품과 연결하지 않는다")와 정면 충돌. `service_key='neture'` 가 부분 차단은 하지만 org-scoped read 가 우회. **가장 강한 backend 경계 위반.**

---

## 8. Phase 5 — cart/checkout 연결 여부

| 기능 | store_cart_items | Store checkout_orders | payment | 판정 |
|------|:---:|:---:|:---:|:---:|
| 참여(join) | 생성 안 함 | 안 함 | 안 함 | A |
| settlement-choice / offline ledger | 안 함 | 안 함 | offline ledger(참여자 컬럼) | A |
| trial-fulfillment `create-order` | 안 함 | **NetureService.createOrder**(neture 도메인, operatorOnly, 보상 배송) | neture | A |

> Market Trial 은 **Store cart/checkout 을 직접 생성하지 않는다.** 유일한 주문은 `trial-fulfillment` 의 **NetureService 풀필먼트 주문**(보상 상품을 참여자에게 배송, metadata.source='trial-fulfillment') — Neture 내부 도메인. Store 주문 원장 결합 없음. (후속 점검 권장: `NetureService.createOrder` 의 OrderType 이 Neture 계약(DROPSHIPPING)에 정렬되는지 — 본 IR 범위 외.)

---

## 9. Phase 6 — backend boundary 판정

**제거 대상 (Store 연결 잔재)**
- `gateway()` KPA membership + 약국 org 게이트 — 고아·정책 충돌 (Phase 2, B).
- `createListingFromParticipant` 의 **참여자 매장 org 로의 OPL 생성** — 설계상 Store 결합, org-scoped read 로 노출 가능 (Phase 4, B).

**유지 (Neture 내부 기능)**
- participant 모델(userId 기준), 공개/공급자/참여 라우트, operator 라우트(`/api/v1/neture/operator/...`), trial-fulfillment(NetureService), 배송지/포럼 동기화, offline settlement ledger.
- `visibleServiceKeys` 는 이미 DROP(선행 IR) — 서비스 가시성 결합 없음.

**Neture-only backend canonical**
```
참여자 = Neture userId (org/serviceKey 비바인딩).
접근 게이트 = KPA membership/약국 org 로 게이트하지 않는다(gateway 제거 또는 KPA 조건 제거).
전환 OPL = 참여자 매장 org 로 생성하지 않는다(Neture-only 정책). 전환을 유지하려면 Neture 운영 org 로 한정하거나 전환 자체를 보류.
주문 = Neture 도메인(NetureService)만. Store cart/checkout 직접 생성 금지(현재 준수).
```

---

## 10. 후속 WO 후보

| WO 후보 | 조건 | 내용 |
|---------|------|------|
| `WO-O4O-MARKET-TRIAL-KPA-MEMBERSHIP-GATE-REMOVAL-V1` | Phase 2 = B 확정 | `gateway()` 엔드포인트 제거 또는 KPA membership/약국 org 게이트 제거(고아 — 라우트 `market-trial.routes.ts:24` 동반 정리). read-only 라 저위험 |
| `WO-O4O-MARKET-TRIAL-SPO-OPL-CONVERSION-BOUNDARY-FIX-V1` | Phase 4 = B 확정 | `createListingFromParticipant` 의 참여자 매장 org OPL 생성 정책 결정: (a) 전환 보류 (b) Neture 운영 org 한정 (c) Store read 격리 보장. **데이터 영향 → 별도 WO·승인 필요** |
| `WO-O4O-MARKET-TRIAL-SUPERSEDE-IR-NOTE-V1` | — | 선행 `IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1` 에 Neture-only supersede note |
| `WO-O4O-MARKET-TRIAL-NETURE-EXTERNAL-NAME-ALIGNMENT-V1` | 위 2건 완료 후 | Neture 내부 외부명 정렬 |

---

## 11. 결론
- **Phase 1**: 라우트 레벨 serviceKey 게이트 없음. operator 는 Neture 스코프 경로.
- **Phase 2 (B)**: KPA membership gate 는 `gateway()` 단일 지점·고아. 제거 대상.
- **Phase 3 (A)**: participant = userId 기준, Store org/serviceKey 비바인딩 — 구조 안전.
- **Phase 4 (B)**: SPO→OPL 전환이 **참여자 매장 org** 에 `service_key='neture'` OPL 생성. Store OPL read 는 org 기준(service_key 미필터)이라 **노출 가능** — 가장 강한 정책 충돌. boundary-fix WO + 데이터 영향 검토 필요.
- **Phase 5 (A)**: Store cart/checkout 직접 생성 없음. 주문은 Neture 풀필먼트만.
- **순서**: ① 본 IR(경계 확정) → ② gateway gate 제거 WO(저위험) → ③ SPO→OPL 전환 boundary-fix WO(데이터 영향·승인) → ④ 선행 IR supersede → ⑤ Neture 외부명 정렬.

---

*Date: 2026-06-11 · read-only IR · 코드 무변경 · backend Neture-only 경계: KPA gateway gate(B)·SPO→OPL 전환 store-org 주입(B) 제거 후보, participant(A)·cart/checkout(A) 안전.*
