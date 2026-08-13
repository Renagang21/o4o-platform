# CHECK — WO-O4O-STORE-HUB-API-CLIENT-AND-SERVICE-SCOPE-ALIGNMENT-V1

- **작업일**: 2026-08-13
- **branch**: `work/commonization-store-hub` (worktree `C:\tmp\o4o-common-store-hub`)
- **시작 상태**: clean · `HEAD` 12 ahead / **0 behind** `origin/main` → main 반영 불필요(선행 WO 에서 재기준 완료)
- **성격**: 구현(데이터 계층 factory 화) + 전수 census
- **핵심 결론**: Store Hub API client **기능군 19** 전수 확인. 실제 **문자 단위 사본**이던 2 기능군
  (`eventOffer` · `hubContent`)을 공통 factory 로 통합했다. 서비스 화면 코드 **−176L / +93L**,
  공통 factory **+2 파일**. **정리 가능한 중복 client 사본 잔존 0.** backend · DB · migration 변경 **0**.

---

## 1. 조사 방법 — "9종 × 3서비스"를 믿지 않고 재도출 (§1)

선행 CHECK 의 수치를 출발점으로 쓰지 않고, **Store Hub 축 화면이 실제로 import 하는 client** 를 역추적해
모집단을 다시 만들었다. 파일명 기반 추정이 아니라 소비 관계 기반이다.

```
KPA  : pages/pharmacy/Hub*.tsx · pages/event-offer/* · pages/store-cart/* ·
       pages/pharmacy/StoreOrdersPage.tsx · components/pharmacy/PharmacyHubLayout.tsx
KCos : pages/hub/* · pages/store-cart/* · pages/library/* · components/layouts/KCosmeticsHubLayout.tsx
GP   : pages/hub/* · pages/store-cart/* · pages/store-management/PharmacyOrders.tsx ·
       components/layouts/GlycoPharmHubLayout.tsx
PH   : pages/store-owner/* · pages/store-hub/*
Neture: lib/api/* 중 store/hub/event-offer 계약 (§8 대조용)
```

이 방식으로 **선행 census 에 없던 client 를 추가로 발견**했다(§6 · §7 · §8 표의 ★ 표시).

---

## 2. backend canonical 계약 대조 매트릭스 (§2)

| 기능군 | backend | 판정 |
|---|---|---|
| Store Hub overview/channels | `createStoreHubController(serviceKey)` factory 1벌 | **SAME_CONTRACT_DIFFERENT_PREFIX** |
| 공급 상품 카탈로그 | 공용 controller + `service_key` | **SAME_CONTRACT_DIFFERENT_PREFIX** |
| Store Cart | `/store/cart/{serviceKey}` 단일 controller | **SAME_CONTRACT** |
| **Event Offer (KCos·GP)** | 동일 `EventOfferService` 를 serviceKey 만 바꿔 호출하는 thin controller 2개 | **SAME_CORE_WITH_SERVICE_POLICY** † |
| **HUB Content** | `/hub/contents` **공용 네임스페이스** (prefix 조차 없음) | **SAME_CONTRACT** |
| Event Offer (KPA) | legacy `/groupbuy*` (stats · my-participations 별도 집합) | **DIFFERENT_CONTRACT** |
| HUB Content (KPA) | 같은 `/hub` 축이나 **비인증 raw `fetch`** + `producer` 필터 | **DIFFERENT_CONTRACT** |
| buyer 주문 원장 | `/checkout/orders` (서비스 네임스페이스 하위) | **SAME_CONTRACT_DIFFERENT_PREFIX** |
| PharmacyHub store-owner | 전용 `/pharmacy-hub/store-owner/*` controller 군 | **DIFFERENT_CONTRACT** |

† 두 controller 의 **mount endpoint 집합**은 다르다(KCos 는 operator 승인·생성 surface 를 더 가진다).
그러나 **client 가 소비하는 2 endpoint**(`/enriched` · `/:id/participate`)의 request/response 계약은 동일하다.
`/enriched` 의 auth 가 KCos `optionalAuth` · GP `authenticate` 로 다르지만 **client 가 보내는 요청은 동일**하므로
client factory 화에 영향이 없다(서비스 정책 차이는 backend 에 그대로 남는다).

> **backend 가 같다는 이유만으로 client 를 합치지 않았다**(WO §2). 아래 §6 의 buyer 주문 원장이 그 사례다 —
> backend 계약은 같지만 client 는 사본이 아니어서 합치지 않았다.

---

## 3. factory 화 결과 (§3)

### 3-1. `createEventOfferApi` (신규)

`packages/store-ui-core/src/api/createEventOfferApi.ts` · 소비 **2** (KCos · GP)

리팩터 전 두 파일은 **주석 · `export const` 이름 · URL prefix 한 조각을 빼면 완전히 동일**했다.
`diff` 결과 실질 차이가 그 3가지뿐임을 실측했다.

| 서비스 | before | after | 서비스 잔여 소유 |
|---|---:|---:|---|
| K-Cosmetics `api/eventOffer.ts` | 83L | **38L** | axios 전송 · `/cosmetics/event-offers` basePath · export 이름 |
| GlycoPharm `api/eventOffer.ts` | 76L | **37L** | axios 전송 · `/glycopharm/event-offers` basePath · export 이름 |

**전송 래퍼를 의도적으로 언랩하지 않았다.** 기존 두 client 가 `api.get<T>(url)`(= `AxiosResponse<T>`)를
그대로 반환하고 공통 `EventOffersHubList` 가 `res.data?.data` 로 읽는다. 여기서 `.data` 를 벗기면
소비처 계약이 바뀌므로 factory 전송 타입을 `Promise<{ data: T }>` 로 두어 **호출부 무변경**을 유지했다.

### 3-2. `createHubContentApi` (신규)

`packages/store-ui-core/src/api/createHubContentApi.ts` · 소비 **2** (KCos · GP)

세 사본(KCos · GP · Neture)이 **완전히 같은 endpoint** `/hub/contents` 를 호출했고 차이는
주석 · apiClient import 경로 · `SERVICE_KEY` 상수뿐이었다. serviceKey 는 **값(config)**이지 사본의 근거가 아니다.

| 서비스 | before | after |
|---|---:|---:|
| K-Cosmetics `lib/api/hubContent.ts` | 37L | **25L** |
| GlycoPharm `api/hubContent.ts` | 37L | **27L** |

**패키지 경계 보존**: 응답 타입 `HubContentListResponse` 는 `@o4o/types/hub-content` 소유이고
`store-ui-core` 는 `@o4o/types` 에 **의도적으로 의존하지 않는다**(package.json 의존성에 없음 — 실측 확인).
그래서 factory 를 **제네릭 `createHubContentApi<TListResponse>`** 로 만들어 타입을 서비스가 주입하게 했다.
Core 는 URL 조립만 소유하고 타입 계약은 원 소유처(`@o4o/types`)에 그대로 남는다.

### 3-3. 공통 factory 안 서비스명 하드코딩 (§3 요구)

신규 2 파일에서 `'kpa'` / `'cosmetics'` / `'glycopharm'` / `'neture'` **리터럴 0건**.
서비스 식별은 전부 `config.basePath` · `config.serviceKey` 값으로만 들어온다.

---

## 4. 구조적 타입 공통화 (§4)

`createEventOfferApi` 로 옮긴 타입 4종(`EnrichedEventOffer` · `EnrichedEventOffersResponse` ·
`EventOfferOrderResult` · `EventOfferOrderResponse`)은 **KCos 사본과 문자 단위로 동일**함을 실측했다:

```
git show HEAD:services/web-k-cosmetics/src/api/eventOffer.ts | (타입 블록 추출)  → 33L
packages/store-ui-core/src/api/createEventOfferApi.ts (타입 블록 추출)          → 33L
diff → 0 (IDENTICAL)
```

`hubContent` 는 반대 판단을 했다 — 타입이 이미 `@o4o/types/hub-content` 라는 **단일 출처**에 있었으므로
Core 로 복제하지 않고 제네릭 주입으로 남겼다. **같은 타입을 여러 벌 만들지도, 억지로 optional 필드를 늘리지도 않았다.**

---

## 5. serviceKey / prefix / scope 매트릭스 (§5)

| 서비스 | frontend serviceKey | API prefix | cart scope | event offer scope | content hub scope | supply catalog scope |
|---|---|---|---|---|---|---|
| KPA | `kpa-society` | `/api/v1/kpa` (apiClient base) | `/store/cart/kpa-society` | legacy `/groupbuy*` | `/hub` (비인증 fetch) + `/kpa/contents` | 경로 기반(미전송) |
| K-Cosmetics | `k-cosmetics` | `/cosmetics` | `/store/cart/k-cosmetics` | `/cosmetics/event-offers` | `/hub/contents?serviceKey=k-cosmetics` | `service_key=k-cosmetics` 명시 |
| GlycoPharm | `glycopharm` | `/glycopharm` | `/store/cart/glycopharm` | `/glycopharm/event-offers` | `/hub/contents?serviceKey=glycopharm` | `service_key=glycopharm` 명시 |
| PharmacyHub | `pharmacy-hub` | `/pharmacy-hub/store-owner` | `/pharmacy-hub/store-owner/cart` | 없음 | `/pharmacy-hub/store-owner/content` | 전용 |
| Neture | `neture` | `/neture` | `/store/cart/neture` | `/neture/event-offers` | `/hub/contents?serviceKey=neture` | 공급자 축 |

- **새 serviceKey 체계를 만들지 않았다.** factory 는 기존 문자열을 config 값으로 받기만 한다.
- 알려진 비대칭 1건(기존 문서화 사항, 이번 범위 밖): KPA 는 `service_key='kpa'` 와 ServiceScope `kpa-society` 가
  이원화돼 있다. 이번 WO 는 전송 문자열을 **무변경**으로 유지했으므로 이 비대칭을 건드리지 않았다.

---

## 6. GlycoPharm 정식 편입 (§6)

GlycoPharm 을 회귀 확인용 참조가 아니라 **KPA/KCos 와 동등한 정식 소비자**로 취급했다.

| 계약 | GP 상태 |
|---|---|
| `createStoreHubApi` | 기존 소비 (선행 WO) |
| `createSupplyCatalogApi` | 기존 소비 (선행 WO) |
| `createStoreCartApi` | 기존 소비 (선행 WO) |
| **`createEventOfferApi`** | **이번 편입** — 로컬 사본 제거 |
| **`createHubContentApi`** | **이번 편입** — 로컬 사본 제거 |

**GP 에 남은 로컬 client 사본 중 "실제 업무 차이가 없는 것" 은 0 이다.** 남은 것은 아래 §9 의
근거 있는 항목뿐이다.

---

## 7. PharmacyHub 판정 (§7)

PH client 14 파일 전수 확인. 결론 **DIFFERENT_CONTRACT — 현재 adapter 유지**(WO §7 "계약이 다르면 유지").

| 축 | 공통 계약 | PharmacyHub | 판정 |
|---|---|---|---|
| cart | `/store/cart/{serviceKey}`, **product 기반** | `/pharmacy-hub/store-owner/cart`, **offerId 기반** | 다름 |
| 주문 생성 | `checkout-confirm` 단일 | 공급자별 N건 분할 + `paymentGroupId` | 다름 |
| 결제 | 없음(장바구니=주문 준비) | `payments/prepare` → Toss → `confirm` **결제 우선** | 다름 |
| 공급 상품 | 신청(ProductApproval) 경유 | 신청 없이 바로 구매 | 다름 |
| supplier content | HUB 탐색→복사 | `/store-owner/content` 전용 | 다름 |

**"serviceKey 만 추가하면 되는가?" → 아니다.** 장바구니 item 의 정체성이 `offerId` 인 점과
주문이 `paymentGroupId` 단위로 분할되는 점은 prefix 차이가 아니라 **업무 계약 차이**다.
공통 factory 에 편입하면 결제 우선 분기가 factory 안으로 들어온다(WO §3 위반) + §11 의
`PharmacyHub paymentGroup 흐름 변경 금지` 에 저촉된다.

**backend mount 만 빠진 경우가 아니므로 가짜 endpoint 를 만들지 않았다.** 대형 backend 변경 필요 → 미구현(WO §7).

---

## 8. Neture 계약 확인 (§8)

WO §8 은 "Neture 화면을 Store Hub client factory 에 **억지로 편입하지 않는다**. 다만 canonical 계약의
원천이면 CHECK 에 명확히 남긴다" 고 지정했다. 그대로 따랐다 — **Neture 파일 수정 0건.**

기록해야 할 계약 사실 3건:

| # | 사실 | 의미 |
|---|---|---|
| ★1 | Neture `lib/api/hubContent.ts` 가 **KCos·GP 와 동일한 `/hub/contents` 계약**을 쓴다(차이=주석·SERVICE_KEY·`search` 파라미터 유무) | `/hub/contents` 는 Store Hub 전용이 아니라 **플랫폼 공용 canonical**이다. 4 서비스가 같은 계약을 소비한다. |
| ★2 | Neture `lib/api/storeCart.ts` 가 **canonical `/store/cart/{serviceKey}` base 를 손으로 다시 구현**한다. 7 메서드 중 6개(addItem·groups·수량·삭제·비우기)가 공통 factory 와 동일 경로. 차이는 checkout 뿐(`checkout-confirm-b2b` = B2B 결제 우선) | 공통 `createStoreCartApi` 의 **잠재 4번째 소비자**. 단 checkout 계약이 달라 `SAME_CORE_WITH_SERVICE_POLICY`. |
| ★3 | Neture `lib/api/eventOffer.ts` 가 `/neture/event-offers/enriched` · `/:id/participate` 로 **KCos·GP 와 동일 형상** | `createEventOfferApi` 의 잠재 3번째 소비자(공급자 축 화면이 소비). |

→ ★2 · ★3 은 **후속 WO 제안**(§13). 이번에 편입하지 않은 이유는 WO §8 의 명시적 지침 + Neture 공급자 영역이
별도 트랙(CLOSED_READY)이기 때문이다. **공급자→매장 원천 계약(SupplierProductOffer · ProductApproval ·
OrganizationProductListing · EventOffer)의 의미는 건드리지 않았다.**

---

## 9. 잔존 client 판정 — 근거 (§10 · §14)

### 9-1. 합치지 않은 것과 그 근거

| # | client | 판정 | 근거 |
|---|---|---|---|
| 1 | KPA `eventOffer.ts` (90L) | **DIFFERENT_CONTRACT** | legacy `/groupbuy*` 네임스페이스. endpoint 집합 자체가 다르다(stats · my-participations). 공통 factory 에 넣으면 서비스 분기가 factory 안으로 들어온다. |
| 2 | KPA `hubContent.ts` (48L) | **DIFFERENT_CONTRACT** | **비인증 raw `fetch`** + `producer` 필터. 인증 자세가 다르다 — 전송 계층을 공유할 수 없다. |
| 3 | buyer 주문 원장 (KPA `checkout.ts` / GP `pharmacy.ts`) | **SAME_CONTRACT_DIFFERENT_PREFIX · 사본 아님** | endpoint(`/checkout/orders`)는 같지만 **client 가 사본이 아니다**: KPA=독립 함수+`apiClient`(body 반환), GP=class 메서드+자체 `request` 래퍼+`StoreApiResponse` 타입. 공유 코드 0. 게다가 GP 는 `limit` 기본값 100 을 항상 전송하고 KPA 는 전송하지 않는다 → 합치면 **둘 중 하나의 전송이 바뀐다**(계약 변경 = §12 위반). GP 쪽은 597L class client 로 Store Hub 밖 화면이 다수 소비한다. **중복 "사본" 이 아니므로 §14 의 잔존 사본 집계에 넣지 않는다.** |
| 4 | `assetSnapshot.ts` (KPA 485 / KCos 103 / GP 105) | **SAME_CORE_WITH_SERVICE_POLICY · 범위 밖** | 실제 drift 존재(GP `list` 는 `type` 파라미터 지원, KCos 는 미지원). 소비처가 `/store*` 자산 복사(Agent C) 축이고 asset-copy-core Freeze(F3) 인접. §11 `Agent C /store* 관리 기능 변경` 금지. |
| 5 | `blogStaff` · `popStaff` · `qrStaff` | **OUT_OF_SCOPE-BY-WO-§11** | 주 소비처가 Agent C `/store*` 실행 자산 관리 화면. Store Hub hub-import 화면은 "가져오기 대상 조회"로만 부수 소비한다. §11 명시 금지. |
| 6 | `storeExecutionAssets` · `storeLibrary` | **OUT_OF_SCOPE-BY-WO-§11** | 동일 사유. |
| 7 | `appreciation.ts` (KPA 74 / KCos 78 / GP 78) | **SAME_CONTRACT · 축 밖** | KCos↔GP 는 **주석 1줄 차이**의 완전 사본이고 prefix 조차 없다(`/appreciation/*`). 그러나 소비처가 forum · LMS · mypage · content 상세로 **Store Hub 축을 크게 벗어난다**(13 소비 파일 중 hub 는 2). Store Hub client factory 에 넣을 대상이 아니다 → **커뮤니티 축 후속 WO** 제안. |
| 8 | KPA 단독 4종 (`videoStaff` 123 · `storeScreenSetHub` 212 · `multilingualProductContentStore` 321 · `contentHub` 78) | **SERVICE_SPECIFIC** | 다른 서비스에 **대응 파일 0건**(실측). 사본이 아니므로 공통화 대상 자체가 없다. 가짜 소비처를 만들지 않는다. |
| 9 | PharmacyHub 14 파일 | **SERVICE_SPECIFIC (DIFFERENT_CONTRACT)** | §7. |
| 10 | Neture `storeCart` · `eventOffer` · `hubContent` | **SERVICE_SPECIFIC-BY-WO-§8** | §8. 계약 동일성은 기록했고 편입은 WO 지침에 따라 보류. |

### 9-2. 제거한 중복 (§10)

| 제거 대상 | 위치 | 규모 |
|---|---|---|
| eventOffer 타입 4종 사본 | KCos · GP 각 1벌 | 33L × 2 |
| eventOffer endpoint/메서드 사본 | KCos · GP | 2 메서드 × 2 |
| hubContent query 조립 사본 | KCos · GP | 10L × 2 |
| `SERVICE_KEY` 상수 사본 | KCos · GP hubContent | 2 |
| dead re-export / 미사용 helper | — | 0 (발견 없음) |

서비스 wrapper 는 WO §10 이 정상이라고 한 **25~38L** 범위로 남았다.

---

## 10. 검증 (§12)

### 10-1. typecheck — **실제 build 와 같은 방식**, 종료코드 실측

> WO §12 가 요구한 대로 project reference 서비스는 `tsc -b` 로 검증했다.
> 선행 세션이 `tsc -p --noEmit` 만으로 PASS 처리했다가 PharmacyHub 타입 오류를 놓친 전례가 있어
> **각 서비스의 build script 와 동일한 명령**을 쓰고 `$?` 를 직접 확인했다.

| 대상 | 명령(build script 와 동일) | rc | error TS |
|---|---|---:|---:|
| `packages/store-ui-core` | `tsc --noEmit -p tsconfig.json` | **0** | 0 |
| `web-kpa-society` | `tsc` | **0** | 0 |
| `web-k-cosmetics` | `tsc` | **0** | 0 |
| `web-glycopharm` | **`tsc -b`** | **0** | 0 |
| `web-pharmacy-hub` | **`tsc -b`** | **0** | 0 |
| `web-neture` | `tsc -b` | **0** | 0 |

### 10-2. build

| 대상 | rc | 결과 |
|---|---:|---|
| `web-kpa-society` | **0** | ✓ 24.1s |
| `web-k-cosmetics` | **0** | ✓ 32.5s |
| `glycopharm-web` | **0** | ✓ 30.1s |
| `pharmacy-hub-web` | **0** | ✓ 13.9s |

chunk size 경고는 기존과 동일한 사전 존재 경고다.

### 10-3. 계약 동일성 실측 (§12 추가 확인 항목)

| 항목 | 방법 | 결과 |
|---|---|---|
| 응답 타입 shape | `git show HEAD:` 로 리팩터 전 타입 블록 추출 → factory 타입 블록과 `diff` | **0 diff (33L ↔ 33L)** |
| hubContent query 조립 | 전/후 조립 코드 라인 대조 | `serviceKey`→`sourceDomain`→`type`→`search`→`page`→`limit` **순서·조건 동일** |
| endpoint path | before `/cosmetics/event-offers/enriched?page&limit&status` ↔ after `${basePath}/enriched?` 동일 파라미터 | **동일** |
| HTTP method | listActive=GET · participate=POST · hubContent.list=GET | **동일** |
| payload | participate `{ quantity }` (기본 1) | **동일** |
| 기본값 | `page=1` · `limit=20` · `status='active'` | **동일** |
| serviceKey | KCos `k-cosmetics` · GP `glycopharm` | **동일** |
| 전송 래퍼 | eventOffer 는 `{ data: T }` 유지(언랩 금지) · hubContent 는 `.data` 언랩 유지 | **소비처 무변경** |

### 10-4. 미실행 — 숨기지 않고 기록

- **browser smoke 미실행.** WO §12 "가능하면" 항목이나 수행하지 않았다. PASS 로 보고하지 않는다.
- **production write 미실행** — 신청 · cart · order (WO §12 지시).
- 검증 범위는 typecheck · build · 정적 계약 대조다.

---

## 11. 금지 범위 확인 (§11)

| 금지 항목 | 상태 |
|---|---|
| 신규 DB table · migration | **0** |
| 운영 데이터 변경 | **0** |
| backend 업무 의미 변경 | **0** — `apps/api-server/**` 수정 파일 0 |
| 결제 계약 변경 | **0** |
| ProductApproval · OPL 의미 변경 | **0** |
| PharmacyHub paymentGroup 흐름 변경 | **0** — PH 파일 수정 0 |
| Agent C `/store*` 관리 기능 변경 | **0** — 해당 client 미접촉(§9-1 #4~#6) |

---

## 12. API client census 최종 숫자 (§14)

**기능군 = "하나의 업무 계약 단위"** 로 센다(파일 수가 아니라).

```
전체 Store Hub API client 기능군: 19

공통 factory 소비:            5   (storeHub · supplyCatalog · storeCart · eventOffer★ · hubContent★)
서비스별 thin adapter:       13   (위 5 factory 의 서비스 wrapper 파일: 3+3+3+2+2)
SERVICE_SPECIFIC client:      9   (KPA legacy eventOffer · KPA hubContent · KPA 단독 4종 ·
                                   PH 14파일 1군 · Neture 3계약 1군 · buyer 주문 원장)
OUT_OF_SCOPE (WO §11 · 축 밖): 5   (blog/pop/qrStaff · storeExecutionAssets+storeLibrary ·
                                   assetSnapshot · appreciation)
중복 client 사본 잔존:         0
미조사:                       0
```

★ = 이번 WO 신규.

> **"중복 client 사본 잔존 0" 의 정의**: 업무 차이 없이 코드가 복제된 client. §9-1 의 잔존 항목은
> 전부 (a) 계약이 실제로 다르거나 (b) 사본이 아니거나 (c) Store Hub 축 밖이거나 (d) WO 가 명시적으로
> 금지·보류한 것이다. 각 항목에 근거를 달았다.

---

## 13. Store Hub 32기능 census 재판정 (§13)

이번 WO 는 **데이터 계층**만 다뤘고 화면 구성은 변경하지 않았다. 다만 WO §13 의 지시대로
**"데이터 계층 중복 때문에 FULLY_COMMON 판정이 잘못돼 있던 기능"** 을 다시 봤다.

| # | 기능 | 선행 판정 | 이번 재판정 | 사유 |
|---|---|---|---|---|
| C1 | 이벤트 오퍼 탐색 목록 | CORE_ONLY | **CORE_ONLY (유지)** | View 는 이미 Core. 이번에 **client 사본까지 제거**되어 데이터 계층 근거가 사라졌다. 잔여 546L 은 KPA 고유 업무. |
| E1 | 콘텐츠 탐색 | FULLY_COMMON | **FULLY_COMMON (유지)** | View 는 `ContentHubTemplate` 3/3. **client 사본 2벌이 남아 있었으나 이번에 제거** → 판정 근거가 오히려 강화됐다. |
| E2~E5 | 상세 · blog/pop/qr 진열 | FULLY_COMMON | **FULLY_COMMON (유지)** | hubContent client 공통화로 데이터 계층도 정합. |
| F1 | 매장허브 API client 군 | CORE_ONLY | **CORE_ONLY (유지)** | factory 5종으로 확대(3→5). 잔여는 §9-1 근거 있는 항목뿐. |
| 그 외 27 | — | 변경 없음 | 화면 구성 미변경 |

**판정이 잘못돼 있던 기능 발견: 0.** 단 E1 · E2~E5 는 "View 는 공통인데 client 는 사본"이라는
**데이터 계층 갭이 실재했고 이번에 해소**됐다. 판정 값 자체는 바뀌지 않지만 근거는 달라졌다.

### 최종 숫자 (변동 없음)

```
전체 모집단: 32

FULLY_COMMON:      15
CORE_ONLY:          4
VIEW_DUPLICATED:    0
SERVICE_SPECIFIC:  11
NOT_IMPLEMENTED:    0
OUT_OF_SCOPE:       2

미조사: 0
```

신규 기능 발견 0 · 삭제 0 → **N=32 유지.**

---

## 14. 변경 규모

| 축 | 값 |
|---|---|
| 수정 파일 | 5 (서비스 client 4 + `store-ui-core/index.ts`) |
| 신규 공통 파일 | 2 (`createEventOfferApi.ts` · `createHubContentApi.ts`) |
| 서비스 코드 | **−176L / +93L** |
| backend 변경 | **0** |
| DB · migration | **0** |
| Neture · PharmacyHub · KPA 파일 수정 | **0** |

---

## 15. 후속 제안 (이번 범위 밖)

| # | 제안 | 사유 |
|---|---|---|
| 1 | Neture `storeCart` 를 `createStoreCartApi` 4번째 소비자로 편입(+B2B checkout 은 서비스 소유 유지) | §8 ★2. 6/7 메서드가 동일 경로. WO §8 이 이번 편입을 보류시켰다. |
| 2 | Neture `eventOffer` 를 `createEventOfferApi` 3번째 소비자로 편입 | §8 ★3. 형상 동일. |
| 3 | `/store*` 실행 자산 client 5종 + `assetSnapshot` 공통화 | §9-1 #4~#6. Agent C 축 WO 필요(§11 금지). |
| 4 | `appreciation` 공통화 (커뮤니티 축) | §9-1 #7. KCos↔GP 주석 1줄 차이 완전 사본이나 소비처가 forum·LMS·mypage. |
| 5 | buyer 주문 원장 client 정렬 | §9-1 #3. 합치려면 GP `limit` 기본값 전송 정책 결정이 선행돼야 한다(계약 변경 판단 필요). |
| 6 | 실사용 write smoke | §10-4. 사용자 승인 필요. |

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 6건
