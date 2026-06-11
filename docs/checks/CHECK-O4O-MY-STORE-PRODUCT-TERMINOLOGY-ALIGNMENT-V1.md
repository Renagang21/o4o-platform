# CHECK-O4O-MY-STORE-PRODUCT-TERMINOLOGY-ALIGNMENT-V1

> 내 매장 공통화 Phase 5 전 소형 용어 정렬. KPA-local 페이지 문구를 "매장 취급 상품 / O4O 주문 가능 상품" 기준으로 정리.
> **결과: PASS** — KPA tsc 0 / 페이지 문구 정렬 / 메뉴 config·공유 페이지 무변경(범위 축소).
> 상위: `IR-O4O-STORE-ORDERABLE-VS-CARRIED-PRODUCT-MODEL-V1` (#4) — 2026-06-11

---

## 1. 목적
"매장 취급 상품"(비-O4O, StoreLocalProduct) vs "O4O 주문 가능 상품"(OrganizationProductListing)이 DB 구조상 이미 분리되어 있으나, KPA 화면 문구에서 "자체 상품" 등으로 혼선 → 페이지 문구 정렬로 혼선 제거.

## 2. 수정 범위 (사용자 결정에 따른 축소)
작업 중 `storeMenuConfig.ts` 가 **3서비스 canonical 정렬 축**(`WO-KCOS-KPA-CANONICAL-MENU-ALIGN-V1`)이며, `my-products`("내 약국 제품")가 의도된 **"제품=제작 기준 데이터" 활성화 앵커**(3서비스 공통)임을 확인. WO 의 "KPA-only 메뉴 라벨 변경"이 canonical 정렬을 깨거나 KPA-only 범위를 위반하는 딜레마 → 사용자 결정:
- **메뉴 config 유지**(canonical 3서비스 라벨 미변경)
- **my-products 라벨 현행 유지**("내 약국 제품", 제작 기준 앵커)
- **KPA-local 페이지 문구만 정렬**

→ 실제 수정 = `StoreLocalProductsPage.tsx`(KPA-local) **1파일**.

## 3. 용어 정렬 기준
| 용어 | DB 기준 | 의미 |
|------|---------|------|
| 매장 취급 상품 | `StoreLocalProduct` | O4O 무관 자체 취급/진열, 주문 불가 |
| O4O 주문 가능 상품 | `OrganizationProductListing` | 승인·활성 O4O 공급 상품 |

## 4. 수정 파일 목록
| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx` | heading "자체 상품 관리"→"매장 취급 상품", 설명/empty 문구를 O4O 무관 매장 취급 상품으로 정리 |

## 5. 변경 전/후 용어 매트릭스
| 위치 | 전 | 후 |
|------|-----|-----|
| 페이지 heading | "자체 상품 관리" | "매장 취급 상품" |
| 설명 | "매장에서 직접 등록하는 상품입니다. Display Domain 전용 — 결제/주문 시스템과 연결되지 않습니다." | "O4O 주문과 무관하게 매장에서 자체적으로 취급·진열하는 상품입니다. 결제/주문 시스템과 연결되지 않습니다." |
| empty 제목 | "등록된 자체 상품이 없습니다" | "등록된 매장 취급 상품이 없습니다" |
| empty 설명 | "매장에서 직접 판매하는 상품을 등록해 보세요." | "매장에서 자체적으로 취급하는 상품을 등록해 보세요." |

## 6. 화면별 확인 결과
- `/store/commerce/local-products`(StoreLocalProductsPage): **매장 취급 상품**으로 정리 ✅. 주문 버튼 없음(기존 유지), Display Domain 명시.
- `/store/my-products`(공유 StoreProductsManagerPage): 기본 heading "내 매장 상품" 은 **공유 패키지 내부 하드코딩**(title prop 없음, headerSlot 만 override 가능) → KPA-only 변경 불가. **Phase 5(전 서비스 정렬)로 deferral.**
- `/store/commerce/products`(PharmacyB2BPage): 도메인 탭(B2B/이벤트) empty 문구는 기능적으로 정확("내 매장에 추가된 상품") → 무변경.

## 7. 제외/무변경 항목
- `storeMenuConfig.ts` 3서비스 canonical 라벨("내 약국 제품"/"자체 상품") — **무변경**(canonical 정렬 보존, 사용자 결정).
- 공유 `StoreProductsManagerPage`(`packages/store-products-ui`) 기본 heading — **무변경**(GP/KCos 영향 방지, Phase 5 이관).
- DB schema / migration / API / 주문 로직 / ProductApproval / OrganizationProductListing / StoreLocalProduct entity — **무변경**.

## 8. 검증 결과
- **web-kpa-society tsc 0** ✅
- 페이지 내 "자체 상품"/"내 매장 상품" 잔존 0 (grep) ✅
- route/메뉴 구조 무변경(문구만) ✅
- browser smoke: NOT TESTED(미배포 — 문구 변경, tsc로 대체). 배포 후 `/store/commerce/local-products` heading "매장 취급 상품" 렌더 확인 권장.

## 9. 후속 내 매장 공통화 반영 기준
- **Phase 5 에서 처리**: 공유 `StoreProductsManagerPage` 기본 heading("내 매장 상품")을 전 서비스 정렬로 "O4O 주문 가능 상품" 계열로 변경(3서비스 동시).
- **메뉴 canonical 정렬**: "내 OO 제품"(제작 기준 앵커) vs "O4O 주문 가능 상품" 라벨 재정의는 3서비스 canonical 변경 WO 로(본 WO 범위 외, 사용자 결정).
- 기준 모델: `IR-O4O-STORE-ORDERABLE-VS-CARRIED-PRODUCT-MODEL-V1 §10`.
- 후속: `WO-O4O-MY-STORE-COMMONIZATION-PHASE5-KPA-BASELINE-V1`.

---

*Date: 2026-06-11 · Status: PASS (KPA-local 매장 취급 상품 문구 정렬. 메뉴 canonical·공유 페이지는 Phase 5 이관 — 사용자 결정).*
