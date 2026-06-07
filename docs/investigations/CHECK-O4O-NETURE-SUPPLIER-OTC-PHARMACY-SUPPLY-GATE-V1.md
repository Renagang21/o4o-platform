# CHECK-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1

> 비처방 의약품(OTC)을 **약국 매장 유형 대상의 제한적 공급 후보**로 표시 세분화. Rx/미분류는 보수적 차단 유지. OTC를 일반 상품처럼 열지 않음.
>
> WO: `WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1`
> 선행: drugCategory 노출(목록·후보·bulk) 라인 완료
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료.

---

## 1. §3 현재 상태 확인 결과

| 질문 | 결과 |
|---|---|
| OTC 제품 목록 표시 | DRUG 전체가 `getAllowedOfferActions` restricted → "운영자 검토 대상" **단일 라벨**(OTC/Rx 구분 없음) |
| OTC 후속 액션 | DRUG 전부 차단(actions=[]) |
| 운영자 후보 검토 OTC 표시 | classification 박스에 productTypeClass 표시(otc_drug 등). OTC 전용 안내는 없음 |
| OTC→약국 listing gate | **없음** — `link-to-listing`은 store type 미구분 |
| organizations store type | `organizations.type = 'division'\|'branch'` — **약국/매장 store-type 플래그 없음** |

**판정:** OTC를 "약국 대상 검토 후보"로 **표시 세분화**(목록+후보 상세)가 핵심. OTC 비약국 listing guard는 **store-type 조회 수단이 없어 V1에서 안전 구현 불가** → V2로 defer(문서화). 단 **Rx link-to-listing 차단**은 store-type 무관·안전하므로 V1에 포함.

> ⚠️ **OTC listing guard requires organization store type lookup** — `organizations` 엔티티에 약국/매장 유형 컬럼이 없어 "OTC→비약국 차단"은 V1 범위 밖. 후속 `WO-O4O-NETURE-SUPPLIER-OTC-LISTING-GUARD-V2`에서 store-type 모델과 함께 다룬다.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/lib/supplierProductTypes.ts` | `getDrugSupplyGate()` 헬퍼 — OTC/Rx/drug_unspecified/의약외품/비의약품 gate(라벨·안내) |
| `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | 목록 "후속 작업" 칸 OTC/Rx/미분류 라벨 세분화(액션은 계속 차단) |
| `services/web-neture/src/pages/operator/ProductCandidateReviewPage.tsx` | 후보 상세 OTC/Rx/미분류 공급 gate 안내 + Rx link 차단 에러 메시지 |
| `apps/api-server/src/modules/neture/services/product-candidate.service.ts` | `linkCandidateToOrganizationListing`: Rx 후보 listing 연결 차단(`RX_LISTING_BLOCKED`) |
| `apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts` | `RX_LISTING_BLOCKED` → 409 매핑 |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1.md` | 본 문서 |

---

## 3. 정책 gate (V1 적용)

| 제품 유형 | 후속 공급 액션 | 목록 표시 | 운영자 후보 안내 | listing 연결 |
|---|---|---|---|---|
| 비의약품 | 허용(기존) | 활용 선택 | — | 허용 |
| 의약외품 | 허용(기존) | 활용 선택 | — | 허용 |
| **OTC** | **차단(표시만 세분화)** | "약국 대상 공급 후보 (검토 후)" | "약국 매장 유형 대상으로만 검토" 안내 | 허용(비약국 guard는 V2) |
| **Rx** | **차단** | "운영자 검토 전용 · 공급 차단" | "일반 판매·이벤트·펀딩 연결 안 함" 안내 | **차단(RX_LISTING_BLOCKED)** |
| **drug_unspecified** | **차단** | "의약품 분류 필요" | "분류 확정 전 공급 활동 금지" 안내 | (분류 후 진행) |

- OTC: 이벤트 오퍼/유통참여형 펀딩/일반매장/고객노출/온라인판매 **열지 않음**(§4 그대로).
- V1은 **표시·안내 + Rx listing 차단**까지. OTC 일반공급 action·OTC 비약국 listing guard는 후속.

---

## 4. Verification Results

| 항목 | 결과 |
|---|---|
| web-neture `tsc --noEmit` | ✅ 0 errors (exit 0) |
| api-server `tsc --noEmit` | ✅ 0 errors (exit 0) |
| 목록 OTC/Rx/미분류 구분 표시 | ✅ |
| OTC → "약국 대상 공급 후보" 안내 | ✅ |
| Rx → 공급 차단 안내 | ✅ |
| OTC/Rx 이벤트·펀딩 action 미오픈 | ✅ (getAllowedOfferActions DRUG=[] 유지) |
| 운영자 후보 상세 OTC/Rx/미분류 안내 | ✅ |
| Rx 후보 listing 연결 차단(409) | ✅ RX_LISTING_BLOCKED |
| 비의약품/의약외품 기존 흐름 | ✅ 무변경 |

---

## 5. What Was Not Changed (§6)

- ✅ OTC 온라인 판매/고객 노출/이벤트 오퍼/유통참여형 펀딩 허용 없음
- ✅ OTC 자동 승인/자동 ProductMaster 생성 없음
- ✅ OTC 일반 공급 action 오픈 없음(표시만 세분화)
- ✅ Rx 공급 action 오픈 없음 · Rx 재고/유효기간/일련번호/lot 관리 없음
- ✅ ProductMaster / ProductDrugExtension / ProductCandidate **구조 변경 없음** · migration 없음
- ✅ 주문/배송/정산/이벤트/펀딩 구조 무변경 · 외부 의약품 DB 매칭 없음
- ✅ getAllowedOfferActions 동작(액션 차단) 유지 — 표시 헬퍼만 추가

---

## 6. Follow-ups (§9)

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-SUPPLIER-OTC-LISTING-GUARD-V2 | organizations **store-type 모델** + OTC→비약국 listing 차단/경고 (V1 defer 항목) |
| WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1 | 배송 설정 기반 |
| WO-O4O-NETURE-SUPPLIER-BULK-CANDIDATE-FILTER-V5 | source 서버 필터/페이지네이션 |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** OTC 약국 대상 공급 후보 표시 세분화 + Rx listing 차단 완료. OTC 비약국 guard는 store-type 부재로 V2 defer.
