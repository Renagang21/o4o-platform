# CHECK-O4O-KPA-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1

> WO: `WO-O4O-KPA-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1`
> 일자: 2026-07-29
> 대상: **KPA-Society 내 매장 전용**
> 불변: **GlycoPharm 변경 0 · K-Cosmetics 변경 0 · 공용 모듈 변경 0**

---

## 0. 범위 축소와 forward revert (중요 기록)

본 작업은 최초에 `WO-O4O-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1`(3 서비스 대상)로 착수했다.
작업 도중 사용자 지시로 범위가 **KPA 단독**으로 축소되었고, 축소 지시 시점에는 이미 3개 커밋이 push 된 상태였다.

| 단계 | commit | 내용 |
|---|---|---|
| 축소 전 | `1f0278cab` | 범위 A/D/F — cosmetics repo, 공용 owner guard, 외국인 QR 공용 backend |
| 축소 전 | `f57c4240b` | 범위 B/C — KPA dead code(범위 내) + GP/KCos 용어(범위 밖) |
| 축소 전 | `29ff133c7` | 범위 E/G — 공용 태블릿 handler·공용 kiosk package + 3서비스 dead file |
| **원복** | `cba87a635` | **forward revert** — 범위 밖 전부 `b95804c40` 상태로 복구 (history 재작성 없음) |
| 축소 후 | `7ddec3506` | 범위 2 — KPA 메뉴·내비게이션 정합 |

**원복한 범위 밖 변경**

| 파일 | 왜 범위 밖인가 |
|------|----------------|
| `routes/cosmetics/repositories/{cosmetics-store,cosmetics}.repository.ts` | K-Cosmetics `/insights` 500 수정 → K-Cos 정비 범위 |
| `modules/foreign-visitor-partner/foreign-visitor-partner-qr-code.{service,routes}.ts` | glycopharm/cosmetics serviceKey 동작 변경 → KPA 단독 불가 |
| `utils/store-owner.utils.ts` | 3 서비스 공용 owner guard |
| `routes/platform/store-public/store-public-tablet.handler.ts` | 3 서비스 공용 태블릿 공개 API |
| `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | 3 서비스 공용 kiosk package |
| `services/web-glycopharm/**` · `services/web-k-cosmetics/**` | 타 서비스 |

원복 후 3 서비스 build PASS 로 GP/K-Cos 가 baseline 상태임을 확인했다.
`git diff b95804c40..HEAD` 기준 순 변경은 **KPA 파일 + 문서** 뿐이다.

---

## 1. 범위별 결과

### 범위 1 — 외국인 파트너 QR landing

**KPA landing 정합: 정상. 코드 변경 0.**

| 항목 | 확인 결과 |
|------|-----------|
| QR URL | `buildAffiliateLandingUrl('kpa', shortCode)` → `https://kpa-society.co.kr/foreign-visitor/affiliate/{shortCode}` |
| landing route | `App.tsx:1121` `/foreign-visitor/affiliate/:shortCode` → `ForeignVisitorAffiliatePublicLandingPage` (등록됨) |
| 로그인 필요 | 없음 (인증 없는 공개 landing) — 설계 의도대로 |
| 식별자 노출 | `shortCode` 만 사용. `partnerId`/내부 id **미노출** |
| 비활성·만료·미존재 | resolve 404 → "안내를 찾을 수 없습니다" (scan event 미기록) |
| 결제 | 없음 (유입 식별 전용) |
| 의약품 B2C 노출 | 없음 — landing 은 매장명 + 기존 공개 매장 안내 링크만 표시 |
| 중복 landing | 없음 — canonical 1개 |

**발견(공용 backend — 미수정, 후속 WO)**

1. `PUBLIC_WEB_ORIGIN_BY_SERVICE` 가 도메인을 하드코딩하며 `cosmetics: 'https://cosmetics.neture.co.kr'` 로
   **service-catalog SSOT(`k-cosmetics.site`)와 불일치**. `landing_url` 은 생성 후 불변이라 잘못된 도메인이 QR 에 영구 각인된다.
   (POP QR 은 `HOTFIX-O4O-STORE-POP-PUBLIC-DOMAIN-CANONICAL-FIX-V1` 로 이미 SSOT 정렬됨 — 같은 결함 클래스가 여기 남아 있다.)
2. landing route 는 **KPA 에만 등록**되어 있는데 발급 API 는 `serviceKey` 를 client 로 받아
   `glycopharm`/`cosmetics` 로도 발급 가능 → 해당 QR 은 404 로 죽은 URL 이 된다.
   (파트너·QR 관리 화면 자체가 KPA 전용이라 현재 UI 진입점은 없음.)

→ **`WO-O4O-SHARED-FOREIGN-VISITOR-QR-LANDING-SERVICE-CATALOG-ALIGNMENT-V1`** 로 분리.

---

### 범위 2 — 메뉴·내비게이션·CTA·breadcrumb (**이번에 완료**)

#### 사이드바 감사 (read-only — 공용 package)

`KPA_SOCIETY_STORE_CONFIG` 는 `packages/store-ui-core/src/config/storeMenuConfig.ts` 에 있어 **수정하지 않고 감사만** 수행.

| 검사 | 결과 |
|------|------|
| 메뉴 항목 수 | 25 |
| 데드링크(존재하지 않는 route) | **0** |
| legacy redirect 를 가리키는 메뉴 | **0** |
| 중복 `subPath` | **0** |
| 중복 `key` | **0** |
| 빈 그룹 | **0** |

→ 사이드바 자체는 결함 없음. 공용 package 수정 불필요.

#### legacy redirect 경유 링크 → canonical 직접 연결 (8곳)

| 파일 | 변경 |
|------|------|
| `HubB2BCatalogPage.tsx` ×2 · `sections/ChannelLayerSection.tsx` | `/store/channels` → `/store/online-sales/settings` |
| `PharmacyB2BPage.tsx` ×2 · `PharmacySellPage.tsx` · `sections/StoreManagementSection.tsx` | `/store/products`, `/store/products/b2c` → `/store/commerce/products(/b2c)` |
| `HubSignageLibraryPage.tsx` | `/store/marketing/signage` → `/store/marketing/signage/playlist` |
| `EventOfferDetailPage.tsx` ×2 | `/event-offers` → `/store-hub/event-offers` |

#### 실제 데드링크 수정 (1곳)

`ServiceBanner.tsx` "이벤트 보기" → `/hub/event-offers`.
`/hub/*` redirect 는 **하위 경로를 버리고** `/store-hub` 로만 보내므로 이벤트 목록에 도달하지 못했다.
→ `/store-hub/event-offers` 직접 연결.

#### breadcrumb ↔ 실제 사이드바 계층 일치 (6곳)

| 화면 | 변경 전 | 변경 후 (실제 사이드바) |
|------|---------|------------------------|
| `StorePopPage` | 매장 실행 / POP | **약국 경영지원** / POP |
| `StoreQRPage` | 매장 실행 / QR 코드 | **약국 경영지원** / **QR-code** |
| `StoreProductDescriptionsPage` | 매장 실행 / 상품 상세설명 | **약국 경영지원** / **상품 설명** |
| `MarketingAnalyticsPage` | 매장 실행 / 마케팅 분석 | **분석** / 마케팅 분석 |
| `StoreLibraryContentsPage` | 내 자료함 / 콘텐츠 | **약국 자료함** / 콘텐츠 |
| `StoreLibraryResourcesPage` | 내 자료함 / 자료 | **약국 자료함** / 자료 |

`매장 실행`·`내 자료함` 은 **KPA 사이드바에 존재하지 않는 그룹명**이었다.

#### 용어 정렬

`HubB2BCatalogPage` 안내문의 `채널 관리` → `판매 설정`.
('채널 관리' 메뉴는 온라인 판매 1급 메뉴로 개편되며 사라진 명칭.)

canonical 용어(`매장 취급 상품` / `O4O 주문 가능 상품` / `매장 경영활용 제품`)는 유지.
금지 표현 `매장 경영활동 제품` 은 KPA 코드베이스에 **0건**.
`내 매장 상품` 은 KPA 에 UI 문구로 없음(그룹 영역명 `내 매장 상품·거래` 는 GP/KCos 파일 — 범위 밖).

#### 전수 검증 (스크립트)

```
KPA 사이드바 25개 항목        → 데드링크 0 · redirect 경유 0 · 중복 0
KPA 내부 /store 링크 122개    → 데드링크 0
legacy redirect 경유 UI 링크  → 0 (전부 canonical 직접 연결)
```

---

### 범위 3 — legacy route·주석 정리 (완료)

#### KPA dead code 삭제 (활성 참조 0 확인 후)

| 파일 | 판정 근거 |
|------|-----------|
| `StoreProductionMaterialsPage.tsx` | list route 가 `/store/library/contents` 로 통합되어 lazy import·링크 0 |
| `SelectContentsForProductionModal.tsx` | 유일 소비처가 위 페이지 |
| `ProductionTypeSelectorModal.tsx` | 소비처 0 |

**유지**: `StartProductionModal`(StoreLibraryContentsPage 활성), `ProductionMaterialEditorPage`
(`StoreContentsSelector` 의 `/store/library/production-materials/:id/edit` 딥링크 활성).

GlycoPharm·K-Cosmetics 는 list route 가 살아 있어 각 서비스 자체 파일을 그대로 사용한다 — **일괄 삭제하지 않았다**.

#### redirect 전수 점검

3 서비스 79개 redirect 스캔 → **2홉 체인 0 · loop 0**. KPA 39개 전부 1홉.

#### 주석 정리

삭제 파일을 canonical 로 설명하던 주석 3곳(`App.tsx`, `StartProductionModal`, `productionTargets`)을 현재 계약으로 갱신.
현재 계약을 정확히 설명하는 주석은 유지했다(무차별 삭제 안 함).

---

### 범위 4 — 공용 owner guard 경계 감사 (감사만)

**KPA 소비 경계: 정상.** KPA 매장 라우트는 `createRequireStoreOwner(dataSource, 'kpa')` 경로로
`kpa:store_owner` role + `kpa-society` active membership 이중 검증을 받는다.

**공용 가드 자체의 발견 (미수정)**

- **D-1** `organization_members` 조회가 `ORDER BY` 없는 `LIMIT 1` → 복수 조직 사용자의 `organizationId` 가 **비결정적**.
  매장 데이터 경계가 이 값으로 결정되므로 경계 불안정.
- **D-2** `organizations` 에 `service_key` 가 없어 **조직 선택에 서비스 경계가 없다**(스키마 축 부재).

→ 상세: [`IR-O4O-SHARED-OWNER-GUARD-BOUNDARY-AUDIT-V1`](../investigations/IR-O4O-SHARED-OWNER-GUARD-BOUNDARY-AUDIT-V1.md)
→ **`WO-O4O-SHARED-OWNER-GUARD-DETERMINISTIC-ORG-BOUNDARY-V1`** 로 분리.

---

### 범위 5 — 태블릿 ↔ `store_local_products.detail_html` 정책

**정책 확정: C (직접 참조 — fallback 슬롯 한정). 구현은 공용 코드 필요로 중지.**

확정 근거(조사 결과):

1. 태블릿 상세 렌더 우선순위는 이미 3단계다:
   선택콘텐츠 번역 → `selectedContentHtml`(`kpa_store_contents` 연결) → 기본 상품 설명.
2. 진열 패널 UI 가 운영자에게 **"선택 안 함 = 기본 상품 설명이 표시됩니다"** 라고 안내한다.
3. 그런데 local 상품의 "기본 상품 설명" 은 짧은 `description` 만 내려가고,
   매장이 *약국 경영지원 > 상품 설명* 화면에서 저장한 canonical 본문 `detail_html` 은
   **공개 태블릿 경로 어디에도 내려가지 않는다** → UI 안내와 실제 동작 불일치.
4. 태블릿 콘텐츠 흐름은 기존 콘텐츠를 **선택·연결만** 하고 상품 설명으로부터 새 콘텐츠를 만드는 진입점이 없다
   → 권고안 **B(초기값 복사)는 자연스럽게 지원되지 않는다**.

**확정 정책**

```
연결된 설명 콘텐츠 있음 → 그 콘텐츠 (기존 동작 불변)
연결 없음              → detail_html → description → summary
```

복사·동기화·이중 canonical·양방향 반영 **전부 없음**. 렌더 시점 단방향 읽기만.

**중지 사유**: 구현 지점이 `store-public-tablet.handler.ts`(3 서비스 공용 공개 API)와
`packages/tablet-kiosk-core`(3 서비스 공용 kiosk)라 KPA 단독 변경이 불가능하다.

→ **`WO-O4O-SHARED-TABLET-LOCAL-PRODUCT-DETAIL-FALLBACK-V1`** 로 분리.

---

### 범위 6 — K-Cosmetics `/insights` 500

**범위 제외.** K-Cosmetics 정비 시 별도 처리.

조사 결과는 보존한다(후속 WO 착수 비용 절감):

- **1차 원인(확정)**: TypeORM `orderBy` 에 entity property path 가 아닌 **DB 컬럼명(snake_case)** 을 넘김.
  join + `skip/take` 조합에서 `getManyAndCount` 가 distinct-id 서브쿼리 경로를 타면
  `createOrderByCombinedWithSelectExpression` → `findColumnWithPropertyPath('sort_order')` 가 `undefined` →
  `.databaseName` 접근에서 `TypeError`.
  프로덕션 스택으로 확정: `CosmeticsStoreRepository.findListingsByStoreId`.
  `getStoreDetail` 경유라 **insights/summary/listings/playlists 4개가 동반 실패**.
  해당 조건 보유: `findListingsByStoreId`, `findAllProducts`, `searchProducts`.
- **2차 원인(확정)**: 프로덕션 스키마 드리프트.
  `CosmeticsProduct` 엔티티·DTO 가 선언한 10개 컬럼이 실제 `cosmetics.cosmetics_products` 에 **없음**
  (`subtitle`, `short_description`, `manufacturer`, `origin_country`, `legal_category`,
  `certification_ids`, `usage_info`, `caution_info`, `sku`, `barcodes`).
  프로덕션 실측 컬럼은 16개뿐이며 해당 마이그레이션이 리포지토리에 존재하지 않는다.
  → 1차만 고치면 `column product.subtitle does not exist` 로 500 이 이어진다(실측 확인).
  → 해결 방향(마이그레이션 추가 vs 엔티티·DTO 정리)은 **사용자 결정 필요**.

---

### 범위 7 — KPA `productAiContent.ts` dead-code (완료)

`services/web-kpa-society/src/api/productAiContent.ts` **삭제**.

확인: 정적 import 0 · 동적 import 0 · lazy route 0 · 테스트 0 · re-export 0.
직전 WO 에서 유일 소비처 `ProductPopBuilderPage` 가 은퇴하며 고아가 된 파일이고,
전역 `product_ai_contents` 는 ProductMaster 소유라 매장 write 가 금지된 경로다.

GlycoPharm·K-Cosmetics 의 동일 파일은 **범위 밖이라 복구**했다(각 서비스 정비 시 처리).

---

## 2. 삭제한 코드

| 파일 | 사유 |
|------|------|
| `pages/pharmacy/StoreProductionMaterialsPage.tsx` | 활성 참조 0 |
| `pages/pharmacy/SelectContentsForProductionModal.tsx` | 유일 소비처가 위 페이지 |
| `pages/pharmacy/ProductionTypeSelectorModal.tsx` | 소비처 0 |
| `api/productAiContent.ts` | 소비처 0 + 금지 경로 |

**삭제한 테스트 데이터: 없음.** (POP 테스트 자료는 WO 지시대로 미접촉 — 사용자가 직접 삭제)

## 3. 유지한 legacy

| 대상 | 사유 |
|------|------|
| KPA `/store/**` legacy redirect 39개 | 전부 1홉·loop 0. 북마크 보호 목적이며 UI 링크는 canonical 직접 연결로 정리 완료 |
| `commerce/products/:productId/pop` | 직전 WO 의 canonical POP 수렴용 1홉 wrapper |
| `library/production-materials/:id/edit` | `StoreContentsSelector` 딥링크가 활성 — 실기능 route |

---

## 4. 서비스별 영향

| 서비스 | 결과 |
|--------|------|
| **KPA-Society** | 위 범위 2/3/7 반영. build PASS |
| **GlycoPharm** | **변경 0** (원복 완료). build PASS |
| **K-Cosmetics** | **변경 0** (원복 완료). build PASS |
| **Neture** | 변경 0 (본 WO 무관) |
| 공용 package·backend | **변경 0** |

## 5. typecheck / build / test

| 명령 | 결과 |
|------|------|
| `pnpm --filter @o4o/web-kpa-society build` (`tsc && vite build`) | ✅ PASS |
| `pnpm --filter glycopharm-web build` | ✅ PASS (baseline 확인) |
| `pnpm --filter @o4o/web-k-cosmetics build` | ✅ PASS (baseline 확인) |
| `pnpm --filter @o4o/web-neture build` | ✅ PASS |
| `pnpm --filter @o4o/api-server type-check` | 기존 `src/scripts/*` baseline 실패 유지 — 본 WO 무관·미수정 (최종 상태에서 api-server 변경 0) |

## 6. 프로덕션 smoke

범위 축소 **이전** 상태(3서비스 커밋 반영본)에서 1회 수행했고, KPA 내 매장 주요 메뉴 6개 이동·
legacy `/store/commerce/products/{id}/pop` 1홉 수렴을 확인했다.

축소 후 최종본(`7ddec3506`)은 **프런트 링크 문자열 변경만** 포함하며(라우트·API·백엔드 변경 0),
build PASS + 전수 링크 스크립트(데드링크 0 / legacy 경유 0)로 검증했다.
배포 후 브라우저 재확인은 아래 잔여 항목에 기록한다.

---

## 7. KPA 마감 판정

```text
범위 1 외국인 QR       → KPA landing 정상 · 공용 발급/도메인 문제는 후속 WO
범위 2 메뉴·내비게이션  → 완료
범위 3 legacy route·주석 → 완료
범위 4 owner guard     → KPA 소비 경계 정상 · 공용 비결정성은 후속 WO
범위 5 태블릿-detail_html → 정책 C 확정 · 공용 구현 필요로 후속 WO
범위 6 K-Cos /insights  → 범위 제외 (조사 결과만 보존)
범위 7 KPA productAiContent.ts → 삭제 완료
```

## 8. 후속 공용 WO (고정)

1. **`WO-O4O-SHARED-OWNER-GUARD-DETERMINISTIC-ORG-BOUNDARY-V1`**
   공용 owner guard 조직 선택 결정성(D-1) + 서비스↔조직 축 설계(D-2).
   IR 및 사전 검증 결과(security 8 suites/185 tests PASS) 보유.

2. **`WO-O4O-SHARED-FOREIGN-VISITOR-QR-LANDING-SERVICE-CATALOG-ALIGNMENT-V1`**
   landing origin 을 service-catalog SSOT 로 단일화 + landing 미보유 서비스 발급 정책 확정.

3. **`WO-O4O-SHARED-TABLET-LOCAL-PRODUCT-DETAIL-FALLBACK-V1`**
   정책 C 구현 — 공개 태블릿 응답에 `detail_html` 포함 + kiosk fallback 우선순위 반영.

> K-Cosmetics `/insights` 500 은 K-Cosmetics 정비 WO 에서 처리 (§범위 6 조사 결과 활용).

## 8-A. 배포 후 브라우저 smoke (2026-07-30 · read-only)

배포 대상 리비전 `kpa-society-web-01745-g6f` (`4d474418b` 반영, `2026-07-29T14:21Z`).
계정 = 약국 경영자(`C 테스트 약국`). **DB write 0 · 저장 버튼 클릭 0.**

### 8-A.1 breadcrumb 6곳 — **6/6 PASS**

| 경로 | 최종 URL | redirect | 기대 그룹명 | 결과 |
|---|---|:---:|---|:---:|
| `/store/marketing/pop` | 동일 | 없음 | 약국 경영지원 | FOUND |
| `/store/marketing/qr` | 동일 | 없음 | 약국 경영지원 | FOUND |
| `/store/marketing/product-descriptions` | 동일 | 없음 | 약국 경영지원 | FOUND |
| `/store/analytics/marketing` | 동일 | 없음 | 분석 | FOUND |
| `/store/library/contents` | 동일 | 없음 | 약국 자료함 | FOUND |
| `/store/library/resources` | 동일 | 없음 | 약국 자료함 | FOUND |

사이드바 실측 계층(`매장 홈 · 약국 상품·거래 · 약국 경영지원 · 약국 자료함 · 디지털 사이니지 · 온라인 판매 · 분석 · 설정`)과 일치.

### 8-A.2 canonical 링크 직접 진입 — **5/5 PASS (redirect 0)**

| 경로 | 최종 URL | redirect | 렌더 |
|---|---|:---:|---|
| `/store/online-sales/settings` | 동일 | 없음 | OK |
| `/store/commerce/products` | 동일 | 없음 | OK |
| `/store/commerce/products/b2c` | 동일 | 없음 | OK |
| `/store/marketing/signage/playlist` | 동일 | 없음 | OK |
| `/store-hub/event-offers` | 동일 | 없음 | OK |

`/store/commerce/products/b2c` 렌더 후 anchor 전수 검사에서 legacy 경로
(`/store/channels`, `/store/products`, `/hub/event-offers`, `/event-offers`, `/store/marketing/signage`) **0건**.

### 8-A.3 삭제한 4파일 관련 route — **PASS**

방문한 11개 화면 전부 정상 렌더. `pageerror` 0건. JS 콘솔 error 는 아래 §8-A.5 의 API 403 3건뿐이며 모듈 로드 실패·`undefined` 참조는 없음.

### 8-A.4 ServiceBanner '이벤트 보기' — **브라우저 검증 불가 (신규 발견)**

`ServiceBanner.tsx` 의 `ExternalServiceSection` 은 **앱 전체에서 소비처 0** 이다
(`ServiceBanner` 문자열이 `components/ServiceBanner.tsx` 와 `components/index.ts` 두 파일에만 존재).
따라서 `/` 및 대시보드에 '이벤트 보기' 버튼이 렌더되지 않아 클릭 경로가 존재하지 않는다.

- 코드 수정 자체는 정확하다 — `linkUrl="/store-hub/event-offers"`, 그리고 §8-A.2 에서 해당 canonical 경로가 redirect 없이 이벤트 목록으로 진입함을 확인했다.
- 다만 이 배너는 **mount 되지 않는 dead component** 이므로 "화면에서 클릭해 확인"은 성립하지 않는다.
- 판정: 링크 정합은 PASS(경로 검증으로 대체), 컴포넌트 자체의 은퇴/재연결은 이번 WO 범위 밖 → 후속 IA 항목으로 이관.

### 8-A.5 부수 관찰 — 이번 WO 범위 밖

`/store/marketing/signage/playlist` 에서 3건 403:

```text
403 GET /api/signage/kpa-society/schedules
403 GET /api/signage/kpa-society/media?limit=200
403 GET /api/signage/kpa-society/playlists?limit=100
```

- 원인은 해당 계정의 signage scope 부재(`requireSignageOperatorOrStore`)이며 **경로 변경과 무관**하다 (legacy 경로도 동일 화면·동일 endpoint).
- 화면은 403 을 `플레이리스트가 없습니다` / `현재 적용된 스케줄이 없습니다` 로 표시 — **실패를 0건으로 위장**하는 load-error 계약 위반 패턴. Neture Load-Error 계약화 트랙과 동일 유형이므로 그 트랙 또는 signage 정비 WO 로 이관한다.

### 8-A.6 판정

```text
breadcrumb 6곳            PASS
canonical 링크 직접 진입   PASS (redirect 0 · legacy anchor 0)
삭제 파일 route 런타임     PASS (pageerror 0)
ServiceBanner 이벤트 보기  PASS(경로 검증) / 클릭 경로 부재 → 후속 IA
=> KPA '내 매장' 정비 CLOSED
```

---

## 9. 잔여 항목

1. ~~최종본(`7ddec3506`) 배포 후 KPA 브라우저 재확인~~ → **§8-A 완료 (2026-07-30)**.
2. 후속 공용 WO 3건(§8).
3. K-Cosmetics `/insights` 500 (범위 외).
4. api-server `type-check` 의 `src/scripts/*` baseline 실패 — 해당 트랙에서 정리 필요.

## 10. commit

| SHA | 내용 |
|-----|------|
| `cba87a635` | 범위 축소 forward revert (범위 밖 전부 원복) |
| `7ddec3506` | 범위 2 — KPA 메뉴·내비게이션 canonical 정합 |
| `4d474418b` | CHECK 작성 |
| (본 커밋) | §8-A 배포 후 브라우저 smoke 기록 — KPA 정비 CLOSED |
