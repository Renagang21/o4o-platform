# CHECK-O4O-KPA-STORE-MENU-ACTIVATION-RELABEL-AND-MY-PRODUCTS-MOVE-V1

> 작업: **KPA 매장 사이드바 메뉴 정비 — "약국 활성화"→"약국 경영지원" 라벨 + "내 약국 제품" 이동**
> 작업일: 2026-06-25 / 상태: **코드 완료 · typecheck PASS · 운영 브라우저 smoke PASS** (커밋 `7ca8a391f`)

---

## 1. 변경 내역

KPA 매장 메뉴 SSOT [`packages/store-ui-core/src/config/storeMenuConfig.ts`](packages/store-ui-core/src/config/storeMenuConfig.ts) `KPA_SOCIETY_STORE_CONFIG`(serviceKey='kpa-society') **한정**:

| # | 변경 | 비고 |
|---|------|------|
| 1 | 그룹 라벨 `'약국 활성화'` → `'약국 경영지원'` | label만 |
| 2 | `{ key:'my-products', label:'내 약국 제품', subPath:'/my-products' }` 를 `'약국 활성화'`(현 경영지원) 그룹 → `'약국 상품·거래'` 그룹으로 이동 | 상품 다음 위치 |
| 3 | subPath `/my-products` 그대로 유지 | **route 무변경** |
| 4 | 나머지(상품 설명/블로그/POP/QR-code)는 `'약국 경영지원'`에 유지 | — |
| 5 | KPA 섹션만 수정 — GlycoPharm/K-Cosmetics 설정 무변경 | diff로 확인 |
| 6 | "활성화 앵커=내 약국 제품" 등 구조와 어긋난 KPA 주석 정합 | — |

- 신규 API/route/migration 없음. `store-ui-core` 는 `main/types=./src/index.ts`(src 직접 참조) → web 빌드에 즉시 반영.

> 참고: 상단 글로벌 헤더 주석(line 32, 3서비스 공통)에 `KPA="약국 활성화"` 표기가 남아 경미하게 stale 하나, 동 파일에 **동시 세션의 미커밋 변경**(온라인 판매 1급 메뉴 개편 WO)이 있어 혼입 방지를 위해 본 작업에서는 추가 수정하지 않음(후속 정합 대상).

---

## 2. 운영 브라우저 smoke (배포 후)

| 검증 | 결과 |
|------|------|
| 사이드바 그룹 라벨 `'약국 경영지원'` 노출 | ✅ |
| `'약국 상품·거래'` 그룹에 "내 약국 제품"(/store/my-products) 포함 | ✅ (상품 → 내 약국 제품 → 주문 관리 → 신청·승인 현황) |
| `'약국 경영지원'` 그룹 = 상품 설명/블로그/POP/QR-code (내 약국 제품 없음) | ✅ |
| 라우트 무변경 | ✅ "내 약국 제품" 링크 `/store/my-products` 유지 |
| GP/KCos 영향 | ✅ 무변경 (KPA 섹션 한정) |

---

## 3. 검증

| 검증 | 결과 |
|------|------|
| `services/web-kpa-society` `tsc --noEmit` | ✅ 오류 0 |
| diff KPA-only 확인 | ✅ GP/KCos 섹션 미변경 |
| 운영 브라우저 smoke | ✅ PASS |

---

## 4. 최종 판정

> KPA 매장 사이드바에서 "약국 활성화" 그룹이 "약국 경영지원"으로 표시되고, "내 약국 제품"이 "약국 상품·거래" 그룹에 위치하며, 라우트(/store/my-products)는 그대로 동작한다. GP/KCos 메뉴는 변경되지 않는다.

→ **충족.**
