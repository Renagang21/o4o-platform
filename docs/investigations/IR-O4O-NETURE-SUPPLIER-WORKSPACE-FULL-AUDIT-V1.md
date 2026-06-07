# IR-O4O-NETURE-SUPPLIER-WORKSPACE-FULL-AUDIT-V1

> Neture 공급자 workspace 전면 read-only 재점검 — 메뉴/라우트/등록흐름/중복/정책 일관성/우선순위.
> 작성일: 2026-06-07 · 성격: **read-only 조사** (코드/메뉴/라우트/API/DB 변경 없음).
> 선행 누적: REGISTRATION-IA-V1 / WIZARD-V2 / OFFER-MODE-SELECTION-V1 / WORKSPACE-PREFILL-V1 / DRUGCATEGORY-EXPOSURE-V1 / EVENT-BINDING-V2 / MARKET-TRIAL-PRODUCT-REFERENCE-V1 / BULK-UPLOAD-TEMPLATE-V1.

---

## 1. 요약 판정

공급자 제품 라인의 1차 업무 흐름은 동작하나, **기존 기능(상품 등록 도우미·CSV Import·B2B 콘텐츠)과 새 IA(유형-우선 등록·대량 등록)의 관계가 정리되지 않아 중복/우회/정책 우회 위험**이 있다.

- **다음 단계 판정: `BULK-UPLOAD-PARSE-V2` 보다 `MENU/ASSISTANT IA CLEANUP` 이 먼저.**
  CSV Import(실제 저장)가 유형 분리·혼합 방지 없이 동작하고, 등록 도우미가 유형-우선 진입을 우회하므로, 그 위에 PARSE-V2 를 더 쌓으면 구조 문제가 커진다.
- 가장 큰 GAP/RISK: ① 등록 도우미가 유형-우선 진입·의약품 경고를 우회 ② CSV Import 가 유형 무관 실제 저장(혼합·Rx 무방비) ③ 대량 등록 ↔ CSV Import 역할 중첩 ④ 펀딩 productId 저장됐으나 표시 없음.
- 메뉴/라우트 자체는 **데드링크 0**(17개 항목 전부 실제 라우트 존재).

---

## 2. 현재 supplier menu map (`SupplierSpaceLayout.tsx`)

| 그룹 | 항목 → 라우트 |
|---|---|
| Overview | Dashboard `/supplier/dashboard` |
| 제품 관리 | 제품 목록 `/supplier/products` · **제품 등록** `/supplier/products/register` · **대량 등록** `/supplier/products/bulk` · 상품 등록 도우미 `/supplier/products/import-assistant` · CSV Import `/supplier/csv-import` · B2B 콘텐츠 `/supplier/b2b-content` |
| 공급 오퍼 | 공급 오퍼 `/supplier/supply-offers` |
| 유통참여형 펀딩 | 펀딩 목록 `/supplier/market-trial` · 새 펀딩 개설 `/supplier/market-trial/new` |
| 이벤트 오퍼 | 이벤트 오퍼 `/supplier/event-offers` |
| 주문·배송 | 주문 현황 `/supplier/orders` |
| Finance | Partner Commissions `/supplier/partner-commissions` |
| 설정 | 공급자 정보 `/mypage/business-profile` |
| Community | Forum `/supplier/forum` · 내 포럼 `/supplier/my-forum` |

→ 17개 항목 전부 App.tsx 실제 라우트 존재. **데드링크 0.**

---

## 3. 현재 supplier route map (요지)

- 제품: `/supplier/products`(목록), `/products/register`(유형 선택 진입, 신규), `/products/new`(단일 wizard), `/products/bulk`(대량 landing, 신규), `/products/import-assistant`(도우미), `/csv-import`(CSV), `/b2b-content`.
- 공급/활용: `/supply-offers`(허브), `/event-offers`(이벤트 제안 허브), `/market-trial`·`/market-trial/new`·`/:id`·`/:id/edit`(펀딩).
- 운영: `/orders`(주문 집계 허브), `/partner-commissions`, `/mypage/business-profile`(설정), `/forum`·`/my-forum`.

---

## 4. 제품 등록 IA 현황 — CONDITIONAL PASS

- `register`(유형 선택→단일/대량 분기) + `new`(유형 prefill wizard, WIZARD-V2 유형별 안내/경고/완료액션) 동작.
- **GAP**: `import-assistant` 와 `new` 가 register(유형-우선)를 **거치지 않는 별도 진입**. 즉 "유형 우선" 원칙이 메뉴 레벨에선 강제되지 않음(도우미/직접 new 직링크 가능).

---

## 5. 상품 등록 도우미 현황 (`SupplierProductImportPage.tsx`) — GAP

- 동작: HTML 붙여넣기/URL → `parseProductHtml` → 추출 결과 편집(이미지 선택/썸네일 보정/RichText) → `saveDraft()`(localStorage) → `navigate('/supplier/products/new')` (단일 wizard 자동 채움). **자동 생성 아님(안전).**
- draft 에 O4O 설정(category/price/isPublic/serviceKeys/regulatoryType) 포함.
- **GAP/RISK**:
  - register(유형 선택) **우회** — 도우미가 곧장 single new 로. 유형-우선 IA 와 불일치.
  - **의약품 경고 부재** — regulatoryType 선택지는 있으나 DRUG/처방 가능성 경고 없음(정책 일관성 GAP).
- 재정의 방향(§8): 도우미 = "유형 선택 이후, 외부 HTML/텍스트에서 초안 추출 → 정식 wizard 로 넘기는 보조 경로". 독립 alt-진입에서 보조 CTA 로.

---

## 6. 대량 등록 / CSV Import 현황 — RISK (중첩)

| | 대량 등록 `/products/bulk` (신규) | CSV Import `/csv-import` (기존) |
|---|---|---|
| 성격 | 유형 선택 + **유형별 템플릿 다운로드(프론트 생성)** + 안내 | **실제 업로드→검증→applyBatch(저장)** |
| 저장 | 없음 (CSV Import 로 링크) | `POST …/csv-import/batches/:id/apply` → Supply offer + master + image **실제 생성** |
| 유형 분리 | 프론트 템플릿/안내만 | **유형 파라미터 없음, 혼합 방지 백엔드 없음** |
| Rx 컬럼 | 템플릿에서 lot/expiry/serial 제외 | 백엔드 파서는 유형 무관(처방 무방비 가능) |

- **RISK**: "혼합 금지/유형 분리"는 **현재 advisory(프론트 안내)뿐** — CSV Import 백엔드는 유형 무관 저장. Rx 가 일반 offer 로 들어갈 여지.
- **중첩**: 두 메뉴가 동일 "대량 등록" 개념. bulk 가 CSV Import 로 funnel → 사용자 혼란.
- 판정: CONDITIONAL PASS(동작) + 정비 필요(흡수/단일화 검토안 §15-B).

---

## 7. 제품 목록 / 후속 액션 현황 — PASS

- 유형 라벨(regulatoryType+drugCategory, DRUG=amber) + 후속 작업 컬럼.
- DRUG → "운영자 검토 대상"(후속 차단), 비의약품/의약외품 → 활용 드롭다운(공급오퍼/이벤트/펀딩 + 판매자모집 준비중 disabled).
- select onClick stopPropagation 으로 row click 충돌 회피. 데드링크 0.
- 한계(기록됨): drugCategory 없는 DRUG 는 일괄 검토중심(otc/rx 세분 게이트는 후속).

---

## 8. 이벤트 오퍼 연결 현황 — PASS

- 제품 목록 → `?supplierProductId/&masterId` → 제안 모달 자동 오픈 + 매칭 SPO 자동 선택(autoOpen/autoSelect 각 1회, 수동 선택 존중). 직접 진입 crash 없음.
- 이벤트가 ≤ 일반 공급가 검증, 원본 가격 불변. 대상 서비스에 Neture 미포함(kpa-society/glycopharm/k-cosmetics).

---

## 9. 유통참여형 펀딩 연결 현황 — CONDITIONAL PASS (표시 GAP)

- 생성 시 query `masterId` → payload.productId → controller → `CreateTrialDto` → `MarketTrial.productId` 저장(REFERENCE-V1, migration 0). 직접/수정 모드 미전달, 원본 불변.
- **GAP**: 저장된 `productId` 가 펀딩 목록/상세/운영자 화면에 **표시되지 않음** → `DISPLAY-V2` 필요.

---

## 10. 공급 오퍼 / 판매자 모집 현황 — CONDITIONAL PASS

- `/supply-offers` = **안내 허브**(일반 공급=제품 등록 유통정책으로 생성됨 안내 + 제품 목록 링크 / 서비스별 공급 상태 / 판매자 모집=준비중 disabled). 실제 "공급 오퍼 생성" 전용 화면 아님.
- 제품 목록의 "일반 공급 오퍼" 액션 → 이 허브로 이동(생성 폼 아님). 역할 혼동 소지(공급오퍼 vs 이벤트/펀딩) 있으나 안내로 구분됨.

---

## 11. B2B 콘텐츠 현황 (`SupplierB2BContentPage.tsx`) — CONDITIONAL PASS

- SPO 의 `businessShortDescription/businessDetailDescription`(B2B 설명) 관리 표 + drawer. 제품별 B2B 설명 작성/현황(B2B 설정됨/B2C 사용 중). 회사 홍보/매장 콘텐츠 아님.
- 정상 기능이나 **명칭/배치 모호**("B2B 콘텐츠" → "제품 콘텐츠 관리" 등 명료화 검토). 제품 관리 그룹 적합.

---

## 12. 주문·배송 / 설정 현황 — 주문=HUB, 배송설정=부재(DEFER)

- `/orders` = `getOrdersSummary` 기반 **서비스 집계 허브**(서비스별 주문/대기/판매자 수). **주문 처리·배송 준비/완료 UI 없음.**
- **배송비/무료배송/배송 설정 화면 전무**(공급자 영역). → SHIPPING-SETTING-FOUNDATION 은 greenfield(DEFER, 별도 설계).
- 설정 `/mypage/business-profile`(SupplierProfilePage): 사업자정보 + 담당자 + 공개연락처 + **B2B 주문조건(minOrderAmount 등)**. 배송/반품/알림 없음.
- 메뉴명 "주문·**배송**"이 배송 기능 부재 대비 다소 과표기(minor RISK).

---

## 13. 의약품/처방의약품 정책 일관성 — 부분 일관 (도우미·CSV 공백)

| 화면 | 정책 반영 |
|---|---|
| register 진입 | ✅ 유형 선택 + Rx 경고 |
| WIZARD-V2 | ✅ 유형 안내/경고 + 완료 액션 분기 |
| 제품 목록 | ✅ drugCategory 표시 + DRUG 후속 차단 |
| 대량 템플릿 | ✅ Rx lot/expiry/serial 제외 |
| 이벤트/펀딩 | ✅ DRUG 는 목록 차단으로 진입 불가 |
| **등록 도우미** | ❌ 의약품 경고 없음 + 유형-우선 우회 |
| **CSV Import(저장)** | ❌ 유형 분리/혼합 방지/처방 가드 백엔드 없음 |

→ 정책은 새 IA 계열엔 일관, **기존 도우미·CSV Import 계열에 공백**.

---

## 14. 중복·충돌·흐름 꼬임 목록

| # | 항목 | 등급 | 내용 |
|---|---|:--:|---|
| C1 | 대량 등록 ↔ CSV Import | RISK | 동일 "대량 등록" 개념 2메뉴. bulk(프론트 템플릿)→CSV(실제 저장) funnel, 유형 분리 백엔드 부재 |
| C2 | 등록 도우미 ↔ register 진입 | GAP | 도우미가 유형-우선 진입 우회, single new 직링크 |
| C3 | 등록 도우미 의약품 경고 부재 | GAP | regulatoryType 입력은 있으나 DRUG/처방 경고 없음 |
| C4 | 펀딩 productId 미표시 | GAP | 저장되나 목록/상세/운영자 노출 없음 → DISPLAY-V2 |
| C5 | B2B 콘텐츠 명칭/배치 | CONDITIONAL | 역할(제품 B2B 설명) 대비 명칭 모호 |
| C6 | 주문·배송 명칭 vs 기능 | minor | 배송 기능 부재인데 "배송" 표기 |
| C7 | 공급 오퍼 허브 vs 생성 | CONDITIONAL | "공급 오퍼"가 생성 폼 아닌 안내 허브 |

---

## 15. 메뉴 재배치 제안 (검토안)

- **A. 유지**: 현행. 장점 변경0 / 단점 C1·C2·C5 잔존.
- **B. CSV Import 흡수**: 제품 관리 = 목록·등록·대량 등록·등록 도우미·제품 콘텐츠 관리. CSV Import 를 **대량 등록 내부 단계**로. (C1 해소)
- **C. 도우미를 등록 방식으로 통합**: 제품 등록 내부 = 직접 입력 / 도우미로 초안 / 대량 등록. 도우미 독립 메뉴 제거(보조 CTA). (C2 해소)
- **D. 하이브리드(권장)**: 도우미 독립 메뉴는 유지하되 **유형 선택 → 도우미 분석 → 정식 wizard 초안** 순으로 내부 흐름 정렬 + CSV Import 를 대량 등록으로 흡수 + B2B 콘텐츠 → "제품 콘텐츠 관리" 명칭. (C1·C2·C3·C5 동시 완화, 진입 다양성 보존)

> 추천: **D**. 단, 도우미의 의약품 경고(C3)와 register-경유(C2)는 별도 작은 WO 로 분리 가능.

---

## 16. 다음 구현 우선순위

1. **MENU/ASSISTANT IA CLEANUP** (검토안 D) — C1·C2·C5 정비, 의약품 경고 정합. *(PARSE-V2 전제)*
2. **MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2** (C4) — 작고 가치 명확.
3. **BULK-UPLOAD-PARSE-V2** — CSV Import 를 **유형 분리·혼합 방지·처방 가드** 포함해 저장 정비(메뉴 정비 후).
4. **OTC-PHARMACY-SUPPLY-GATE-V1** — drugCategory 세분 게이트(목록 노출 완료 기반).
5. **SHIPPING-SETTING-FOUNDATION-V1** (DEFER, greenfield 설계 필요).

> **판정(중점질문 §7-10): 다음은 PARSE-V2 가 아니라 MENU/ASSISTANT IA CLEANUP.**

---

## 17. 이번 IR에서 수정하지 않은 것

- 메뉴/라우트/컴포넌트/도우미/CSV/펀딩/배송/주문 코드 변경 없음 (read-only).
- 다른 세션 WIP(`packages/shared-space-ui/src/guide/copy/neture.ts`) 미접촉, 커밋 push/reset 없음.
- 산출물 = 본 문서 1건.

---

## 중점 확인 질문 답 (§7)

1. 도우미 위치: 제품 관리 독립 메뉴(`import-assistant`), register 우회. 2. wizard 연결: ✅ draft→`/products/new`. 3. 재배치 필요: ✅(유형 선택 이후 보조 경로로). 4. 대량↔CSV 중복: ✅ 역할 중첩(bulk=안내, CSV=저장). 5. CSV 흡수: ✅ 권장(검토안 B/D). 6. B2B 위치: 제품 관리(제품 B2B 설명) — 명칭 정리. 7. 후속 액션 실가능만: ✅(준비중 disabled, DRUG 차단). 8. 이벤트/펀딩 원본 불변: ✅. 9. productId 표시 필요: ✅ DISPLAY-V2. 10. 다음=PARSE-V2? **아니오 — MENU/ASSISTANT IA CLEANUP 먼저.**

---

## 후속 WO 후보

`WO-O4O-NETURE-SUPPLIER-MENU-IA-CLEANUP-V1` · `…-REGISTRATION-ASSISTANT-IA-ALIGNMENT-V1` · `…-REGISTRATION-ASSISTANT-DRAFT-TO-WIZARD-V1` · `…-BULK-UPLOAD-PARSE-V2` · `…-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2` · `…-OTC-PHARMACY-SUPPLY-GATE-V1` · `…-SHIPPING-SETTING-FOUNDATION-V1`.

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 조사 완료 — 다음 = MENU/ASSISTANT IA CLEANUP(검토안 D) + DISPLAY-V2, 그 후 PARSE-V2. 데드링크 0, 정책 공백은 도우미·CSV 계열.
