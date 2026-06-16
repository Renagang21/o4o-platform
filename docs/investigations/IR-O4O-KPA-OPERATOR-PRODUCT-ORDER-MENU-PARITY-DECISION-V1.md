# IR-O4O-KPA-OPERATOR-PRODUCT-ORDER-MENU-PARITY-DECISION-V1

> 조사 전용 · 정책 결정 IR. 코드/메뉴/capability/route/DB **무변경**.
> 기준: `docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md`, `docs/baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md`, `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md`, `docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md`, `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md`
> 선행: `IR-O4O-CROSSSERVICE-OPERATOR-MENU-AND-SUPPLY-APPROVAL-FLOW-AUDIT-V1`, `WO-O4O-CROSSSERVICE-OPERATOR-APPROVAL-GROUP-LABEL-ALIGN-V1`(완료, 커밋 `221dbdd00`)
> 작성일: 2026-06-16
>
> **판정 요지:** 선행 IR의 "KPA는 메뉴만 숨김(route/API/DB 유지)" 전제는 **상품/주문 operator 화면에 대해선 부정확**하다. **KPA에는 operator `/operator/products`·`/operator/orders` 페이지·route 자체가 존재하지 않는다.** 따라서 parity는 "메뉴 숨김 해제"가 아니라 **operator 상품/주문 조회 화면 신설(또는 GP/KCos 공통 추출 후 KPA wiring)** 을 동반해야 성립한다. → **권장: D안(3서비스 노출 + view-only 라벨 명확화)을 목표로 하되, KPA는 페이지 신설을 동반하는 별도 WO로 sequencing.**

---

## 1. 조사한 파일 목록

- `services/web-kpa-society/src/config/operatorMenuGroups.ts` (products/orders 그룹 **미정의**; hide 주석 33/134/145는 다른 메뉴 대상)
- `services/web-kpa-society/src/config/operatorCapabilities.ts` (STORE_MANAGEMENT 상태)
- `services/web-kpa-society/src/App.tsx` (operator route 블록 — products/orders operator route **부재**, store측 redirect 973/976)
- `services/web-kpa-society/src/pages/operator/` (ProductApplicationManagementPage.tsx만; ProductsPage/OrdersPage **없음**)
- `services/web-kpa-society/src/pages/pharmacy/` (StoreOrdersPage / StoreLocalProductsPage / PharmacyB2BPage = **store scope**)
- `services/web-glycopharm/src/config/operatorMenuGroups.ts` (products 45, orders 59)
- `services/web-glycopharm/src/App.tsx` (operator products 812 / orders 816; lazy ProductsPage 168 / OrdersPage 172)
- `services/web-glycopharm/src/pages/operator/ProductsPage.tsx`(336L), `OrdersPage.tsx`(370L) — view-only
- `services/web-k-cosmetics/src/config/operatorMenuGroups.ts` (products 34, orders 45)
- `services/web-k-cosmetics/src/App.tsx` (operator products 678 / orders 685; lazy 188/190)
- `services/web-k-cosmetics/src/pages/operator/ProductsPage.tsx`(334L), `OrdersPage.tsx`(382L) — view-only
- 문서: 선행 IR, NON-APPROVAL-UX §3-4, OPERATOR-DASHBOARD-STANDARD §4-2, STORE-MENU-CANONICAL-TREE §1.3/§3, 3-ROLE-FLOW §3

---

## 2. KPA 상품 관리 / 주문 관리 현재 상태

**KPA operator 메뉴에 `products`/`orders` 그룹은 애초에 정의되지 않았다.** (`operatorMenuGroups.ts` UNIFIED_MENU에 두 키 자체가 없음.)

- 선행 IR이 인용한 hide 주석은 **다른 메뉴**를 가리킨다:
  - 라인 33/134: `WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1: 약국 서비스 신청 메뉴 제거 (라우트/API/DB 유지)` → `users` 그룹의 "약국 서비스 신청" 항목 대상.
  - 라인 145: `WO-KPA-OPERATOR-STORES-MENU-HIDE-V1: stores 메뉴 노출 제거` → (현 UNIFIED_MENU엔 stores 복원됨, legacy 잔재 주석).
- 즉 **"products/orders operator 메뉴를 숨긴" 주석은 존재하지 않는다.** KPA operator는 이 메뉴를 **가진 적이 없다**.

> **선행 IR 교정:** "route/API/DB 유지 + 메뉴만 숨김"은 KPA의 *약국 서비스 신청 메뉴*에 해당하는 서술이며, **operator 상품/주문 조회 화면에는 적용되지 않는다.**

---

## 3. route / page / API 존재 여부

| 항목 | KPA | GlycoPharm | K-Cosmetics |
|---|---|---|---|
| operator `/operator/products` route | **없음** | `App.tsx:812` ✓ | `App.tsx:678` ✓ |
| operator `/operator/orders` route | **없음** (store redirect 976) | `App.tsx:816` ✓ | `App.tsx:685` ✓ |
| operator ProductsPage 컴포넌트 | **없음** | `pages/operator/ProductsPage.tsx`(336L) | `pages/operator/ProductsPage.tsx`(334L) |
| operator OrdersPage 컴포넌트 | **없음** | `pages/operator/OrdersPage.tsx`(370L) | `pages/operator/OrdersPage.tsx`(382L) |
| operator 상품 승인(별개) | `ProductApplicationManagementPage` ✓ (Approvals) | ✓ | ✓ |
| **store측** 상품/주문 | `commerce/products`=PharmacyB2BPage, `commerce/orders`=StoreOrdersPage (store scope) | 유사 | 유사 |

- KPA `App.tsx:973/976`: `<Route path="products" → Navigate to="/store/commerce/products">`, `<Route path="orders" → Navigate to="/store/commerce/orders">` — **operator products/orders는 store 페이지로 리다이렉트**일 뿐, operator 화면이 아니다.
- **결론:** KPA는 operator 상품/주문 조회 화면이 **실재하지 않는다**(폐기가 아니라 미존재). GP/KCos만 보유.

### Backend API
- operator 상품 콘솔: GP/KCos ProductsPage → `product_masters` 기반 `/api/v1/operator/products`(Extension Layer, 플랫폼 상품). 
- operator 주문: GP/KCos OrdersPage → `checkout_orders` 기반 `/{service}/operator/orders`(view-only, `WO-O4O-OPERATOR-ORDER-VIEW-API-V1`).
- KPA에도 해당 백엔드 자체는 service-generic 가능성이 높으나(공통 Extension), **프론트 화면·route 부재**가 핵심 격차.

---

## 4. capability 상태

- KPA `operatorCapabilities.ts` `ENABLED_CAPABILITIES`에 `STORE_MANAGEMENT` **포함**(선행 IR 확인). 
- 즉 capability 게이트는 열려 있으나, **메뉴 항목·route·page가 없어** 노출되지 않는다. → capability 누락 문제 **아님**.

---

## 5. KPA 숨김 주석과 과거 WO 근거

| 주석/WO | 실제 대상 | products/orders와 관계 |
|---|---|---|
| `WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1` (33/134) | users 그룹 "약국 서비스 신청" | **무관** (상품/주문 아님) |
| `WO-KPA-OPERATOR-STORES-MENU-HIDE-V1` (145) | stores 그룹 노출 (현재 복원됨) | **무관** |

→ **products/orders operator 메뉴를 "의도적으로 숨겼다"는 직접 근거는 없다.** 그 화면이 KPA에 구현된 적이 없을 뿐이다. (선행 IR의 "의도적 숨김" 판정은 인접 주석의 over-reading.)

---

## 6. GlycoPharm / K-Cosmetics 대응 화면과 비교

| 화면 | 성격 | 스코프 | 데이터 | 라벨 | view-only 근거 |
|---|---|---|---|---|---|
| GP/KCos ProductsPage | 플랫폼 상품 콘솔 | **서비스 전역**(operator) | `product_masters` | "상품 관리" | 목록+검색+새로고침, 생성/수정 없음(헤더 주석) |
| GP/KCos OrdersPage | 주문 현황 | **서비스 전역**(operator) | `checkout_orders` | "주문 관리" | "조회 전용 — 상태변경/배송/취소/환불/송장/정산/bulk action/selectable 없음" |

- **스코프 차이 주의:** GP/KCos operator ProductsPage/OrdersPage = **서비스 전역 조회**(운영자가 서비스 내 전체 상품/주문 모니터링). KPA의 store측 `commerce/orders`(StoreOrdersPage)는 **단일 매장(약국) 주문**으로 스코프가 다르다. → KPA store 화면이 operator 화면을 대체하지 못한다.
- GP·KCos 두 페이지는 라인 수(335/376 내외)·구조가 거의 동일 → **공통 추출(operator-core-ui) 친화적**.

---

## 7. view-only 성격 확인

- ProductsPage: `product_masters` 조회 콘솔. 운영자 직접 등록/수정 **없음**(상품 의사결정은 Approvals).
- OrdersPage: `checkout_orders` 조회 전용. 상태변경/배송/취소/환불/정산/bulk **없음**(헤더 명시).
- → 두 화면 모두 **모니터링(현황 조회)** 성격. 승인(Approvals)과 분리된 "운영 현황" 영역.
- 라벨 "상품 관리/주문 관리"는 실제 기능(조회 전용) 대비 **과장**. (선행 IR §17과 동일 관찰.)

---

## 8. 노출 시 장단점 (KPA에 operator products/orders 도입)

**장점**
- KPA↔GP↔KCos parity 회복 (운영자 업무 위치 일관성).
- 운영자가 서비스 전역 상품/주문 현황을 KPA에서도 모니터링 가능 → OPERATOR-DASHBOARD-STANDARD의 모니터링 책임 충족.
- "실기능 메뉴 은폐 0" 긴장 해소(노출 측).

**단점/비용**
- **단순 메뉴 추가로 불가** — KPA엔 operator ProductsPage/OrdersPage가 없어 **페이지 신설(또는 GP/KCos 공통 추출 후 wiring)** 필요 = 코드 WO.
- 공통 추출 시 GP/KCos 소비처 영향 재검증 필요(Shared Module Protocol).
- KPA 운영자에게 조회 화면 증가 → 단순성 일부 저하(단, 모니터링 가치와 trade-off).

---

## 9. 숨김 유지 시 장단점 (KPA 현행 유지)

**장점**
- KPA operator 메뉴 단순성 유지. 추가 개발 0.
- KPA 운영자 핵심 업무(승인 Approvals + 콘텐츠/매장 HUB)에 집중.

**단점**
- cross-service parity 비대칭 **지속** (동일 플랫폼인데 KPA만 운영 현황 조회 부재).
- "은폐"라기보다 "미구현"이나, 외형상 KPA 운영자가 상품/주문 현황을 못 본다는 일관성 결손.
- 향후 KPA operator 모니터링 요구 발생 시 재작업.

---

## 10. 라벨 명확화 필요 여부

- 현 GP/KCos 라벨 "상품 관리/주문 관리"는 **view-only 현황 조회**를 "관리"로 표기 → 운영자 혼선 소지(등록/상태변경 가능으로 오인).
- 권장: **"상품 조회"/"주문 조회"** 또는 **"상품 현황"/"주문 현황"** 으로 명확화. 승인(Approvals)과 시각적으로 분리되어 "보는 화면"임이 드러남.
- KPA 노출 시 동일 라벨 적용 → 3서비스 일괄 명확화가 일관적.

---

## 11. 정책 선택지 A/B/C/D/E 비교

| 안 | 내용 | KPA 작업량 | parity | 라벨 | 평가 |
|---|---|---|---|---|---|
| **A** | KPA도 "상품 관리/주문 관리" 노출(라벨 그대로) | 페이지 신설 필요 | 회복 | 과장 유지 | 라벨 혼선 잔존 → 비권장 |
| **B** | KPA 계속 미노출 | 0 | 비대칭 지속 | — | 저비용이나 결손 지속 |
| **C** | KPA만 노출 + "상품 조회/주문 조회" 명확화 | 페이지 신설 | 회복(KPA측) | KPA만 명확 | 3서비스 라벨 불일치 발생 |
| **D** | **3서비스 모두 "조회" 라벨 명확화 + KPA 노출** | 페이지 신설 + GP/KCos 라벨 변경 | 완전 회복 | 3서비스 일치 | **권장** (단 KPA 페이지 신설 동반) |
| **E** | 3서비스 모두 view-only를 별도 domain/하위 그룹("운영 현황")으로 재정렬 + KPA 노출 | 페이지 신설 + IA 재정렬 | 완전 회복 | 일치 + 구조 명확 | 이상적이나 범위 큼(후속 단계) |

> **핵심 제약:** A/C/D/E 모두 **KPA operator ProductsPage/OrdersPage 신설**을 전제한다(현재 부재). B만 무개발. 따라서 "라벨만 바꾸는 저위험 작업"으로 끝나지 않으며, KPA측은 코드 WO가 필요하다.

---

## 12. 권장안

**D안(목표) — 단, 2-step sequencing.**

1. **Step 1 (저위험, 라벨 선정합):** GP/KCos operator 상품/주문 라벨을 "상품 관리/주문 관리" → **"상품 조회"/"주문 조회"**(또는 "상품 현황"/"주문 현황")로 명확화. *config 2파일 라벨만* — 직전 라벨 정합 WO와 동형, 저위험.
2. **Step 2 (중위험, KPA parity):** GP/KCos operator ProductsPage/OrdersPage를 **공통 컴포넌트로 추출**(operator-core-ui) → KPA route+menu wiring + capability 연결. Shared Module Protocol에 따라 GP/KCos/(KPA) 소비처 재검증.

- 이유: 승인 업무는 Approvals에 그대로 두고, **상품/주문은 "운영자가 현황을 보는 조회 화면"으로 명확히 분리**(사용자 의도와 합치). view-only 라벨로 혼선 제거.
- B안은 KPA 모니터링 요구가 낮을 경우의 **합리적 interim**(개발 0). 단 parity 결손은 명시적으로 수용해야 함.
- E안은 D안 완료 후 IA 성숙 단계에서 검토(범위 분리).

> 사용자 예상(D안)과 일치하되, **"KPA는 메뉴만 켜면 된다"가 아니라 페이지 신설을 동반**한다는 점이 본 IR의 추가 발견이다. Step 1(라벨)만 먼저 진행하고 Step 2(KPA 페이지)는 별도 결정도 가능.

---

## 13. 후속 WO 후보

| 순위 | WO | 목적 | 위험도 | 선행 |
|---|---|---|---|---|
| 1 | `WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-LABEL-CLARIFY-GP-KCOS-V1` | GP/KCos operator 상품/주문 라벨 "관리"→"조회/현황" 명확화 (config only) | 하 | 본 IR |
| 2 | `WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1` | GP/KCos operator ProductsPage/OrdersPage 공통 추출(operator-core-ui) | 중 | WO1, Shared Module Protocol |
| 3 | `WO-O4O-KPA-OPERATOR-PRODUCT-ORDER-VIEW-INTRODUCE-V1` | KPA에 공통 컴포넌트 wiring(route+menu+capability) — parity 완성 | 중 | WO2 |
| 4 | (선택) `WO-O4O-OPERATOR-MONITORING-DOMAIN-REGROUP-V1` | 3서비스 view-only 현황을 "운영 현황" 도메인/하위 그룹으로 재정렬(E안) | 중 | WO3 |

→ **WO1(라벨 명확화)** 부터 착수 권장(저위험·즉시). WO2/3은 KPA parity 채택 결정 후.

---

## 14. Current Structure vs O4O Philosophy Conflict Check

| 항목 | 현 구조 | 철학/표준 | 판정 |
|---|---|---|---|
| KPA operator 상품/주문 부재 | 화면·route 미존재 | parity·모니터링 책임(DASHBOARD-STANDARD) | ⚠️ 결손(은폐 아님). 도입 시 페이지 신설 필요 |
| "관리" 라벨 vs view-only | GP/KCos 조회 전용을 "관리"로 표기 | 3-ROLE §3(운영자 상품 직접 제작 제한적) | ⚠️ 라벨 과장 — 명확화 권장 |
| 승인/조회 분리 | 승인=Approvals, 조회=상품/주문 | NON-APPROVAL-UX(운영자=심사관 아님, 모니터링 포함) | ✅ 분리 방향 합치 |
| store scope vs operator scope | KPA store 화면(단일 매장) ≠ operator 전역 조회 | 스코프 일관성 | ⚠️ store 화면이 operator 모니터링을 대체 못함 |
| 은폐 0 원칙 | KPA "미구현"(route 부재) | CLAUDE.md "실기능 메뉴 은폐 0" | ✅ route 없는 메뉴 미노출=원칙 준수(은폐 아님) |
| Neture 제외 | 본 IR 범위 외 | STORE-MENU-CANONICAL §1.3 | ✅ |

**철학 충돌 요약:** 치명적 충돌 없음. 핵심은 ① KPA parity 결손(=미구현, 도입은 페이지 신설 비용), ② view-only 라벨 과장. 둘 다 "도입/명확화" 결정 사항이며, **저위험 라벨 명확화(WO1) 선행 → KPA 페이지 도입(WO2/3) 정책 채택 후** 순서가 안전하다.

---

## Out of Scope / 무변경 확인

- 코드/메뉴/capability/route/page/sidebar/layout/DB/backend **변경 0**. 조사 문서 1개만 생성(path-specific). 동시 세션 WIP(SupplyCatalogHub/storeMenuConfig/KCos App 등) **미접촉**. `git add .` 미사용.
- 본 IR은 정책 근거 정리까지만 수행하며, 노출/숨김 최종 채택과 페이지 신설은 §13 후속 WO로 분리한다.

## Evidence (대표)

- KPA products/orders 그룹 미정의: `services/web-kpa-society/src/config/operatorMenuGroups.ts` (UNIFIED_MENU 29-101에 두 키 없음)
- KPA operator route 부재 + store redirect: `services/web-kpa-society/src/App.tsx:973,976` (`Navigate to /store/commerce/...`)
- KPA hide 주석은 다른 메뉴 대상: 같은 config `:33,134(약국 서비스 신청) :145(stores)`
- KPA operator 페이지 목록: `services/web-kpa-society/src/pages/operator/` = ProductApplicationManagementPage.tsx (ProductsPage/OrdersPage 부재)
- GP operator 화면: `App.tsx:168,172,812,816` + `pages/operator/ProductsPage.tsx`(336L), `OrdersPage.tsx`(370L, "조회 전용" 주석)
- KCos operator 화면: `App.tsx:188,190,678,685` + `pages/operator/ProductsPage.tsx`(334L), `OrdersPage.tsx`(382L)
- 라벨 정합 완료: `WO-O4O-CROSSSERVICE-OPERATOR-APPROVAL-GROUP-LABEL-ALIGN-V1` 커밋 `221dbdd00`
- 문서: `O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1 §3-4`, `OPERATOR-DASHBOARD-STANDARD-V1 §4-2`, `O4O-3-ROLE-FLOW-BASELINE-V1 §3`, `O4O-STORE-MENU-CANONICAL-TREE-V1 §1.3`
