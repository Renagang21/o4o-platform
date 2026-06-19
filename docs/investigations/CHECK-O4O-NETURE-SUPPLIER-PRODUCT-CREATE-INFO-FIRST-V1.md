# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-CREATE-INFO-FIRST-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-PRODUCT-CREATE-INFO-FIRST-V1 (후보 B)
> **유형:** frontend-only 등록 UX 정비 — 상품 등록을 정보-우선으로 정리. 등록 시 공급 방식 미강제(내부/미노출), 공급 방식은 등록 후 별도 설정. **backend/API/DB/migration 0.**
> **결과: PASS(코드/타입) — 등록 위저드에서 공급 방식 UI 제거(hideDistribution) + 정보-우선 안내 + 완료 후 공급 방식 설정 경로 안내. createProduct API 무변경, 정보+기본공급가만으로 내부 상품 생성. web-neture tsc 0. 라이브 smoke 배포 후.**
> 선행: WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1 · IR-O4O-NETURE-SUPPLIER-PRODUCT-INFO-AND-DISTRIBUTION-UX-AUDIT-V1 — 2026-06-19

---

## 0. 중단 기준 점검 (§6.3) — 비해당

- `createProduct` 클라이언트: 모든 필드 optional. backend `createSupplierOffer` 기본값 isActive=false / approval PENDING / distributionType=PRIVATE / price 기본 0. → **정보-only(+기본 공급가) 저장이 backend 필수 필드로 막히지 않음.** API/schema 변경 불필요 → 중단 기준(priceGeneral 강제·isPublic/serviceKeys 강제·schema 변경) **모두 비해당.**
- 단, **FE validateStep(step2)는 priceGeneral>0 요구**(backend 아님). WO §6.2 caveat("필수면 기존 입력 유지·문구만 정리")대로 **공급가 입력은 유지**, 라벨만 '기본 공급가'로 정리.

## 1. 변경 파일 (frontend 1 + CHECK)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` | STEPS[1] '가격/유통'→'기본 공급가' · Step2 ProductForm `hideDistribution`(전체공개/서비스공급 UI 제거)+heading/안내 정정 · Step1 정보-우선 안내 배너 · 완료 화면 내부/미노출+공급방식 설정 경로 안내 |

> ProductForm `hideDistribution` prop은 선행 D에서 도입(drawer 편집용). 등록에도 재사용 — **create/edit 모두 정보↔공급방식 분리 일관.** ProductForm 자체 무변경.

## 2. 정보-우선 UX (구현)

- **Step1 상단 안내**: "먼저 상품 정보를 등록 / 공급 방식은 저장 후 별도 설정 / 설정 전까지 HUB 미노출".
- **Step2 = 기본 공급가**: 공급 방식(전체공개/서비스공급) 입력 **제거**(hideDistribution). 안내 "공급 방식은 등록 후 [공급 방식 변경]에서 설정, 지금 저장 시 내부 상품(미노출)". 공급가/서비스가/소비자가/재고/활성/추천은 유지(ProductForm 비-distribution 영역).
- **완료 화면**: 기존 "제품 등록 완료 + 다음 작업"(목록/다른 제품/공급오퍼/이벤트/펀딩) 유지 + **내부/미노출 상태 안내 + "제품 목록 → 상품 상세 [공급 방식 변경]에서 공급 방식 설정" 경로**(비-검토형).

## 3. 생성 결과 (정보-only)

- 수동 등록: form 기본 distributionType=PRIVATE / serviceKeys=[] → hideDistribution 으로 변경 안 됨 → createProduct 가 **내부/미노출**(isActive=false, approval PENDING, PRIVATE) 생성. HTML import draft의 distribution 값은 form 에 retain(데이터 손실 없음, UI만 숨김).
- handleSubmit 의 'PUBLIC 시 간이설명 필수' 체크는 수동(PRIVATE)에선 미발동 → **설명/이미지(Step3) 선택**(정보-우선).

## 4. 검증

- **web-neture `tsc --noEmit`: EXIT 0.**
- 정적: createProduct/handleSubmit/validateStep 로직 무변경(price 검증 유지). ProductForm hideDistribution 재사용. 완료 화면 reviewOnly 분기 보존.

### 배포 후 실브라우저 smoke — 2026-06-19 **PASS** (renagang21, 비파괴·미제출)
1. `/supplier/products/register` → 비의약품 → 하나씩 → Step 표시 **"2 기본 공급가"** + **Step1 정보-우선 안내 배너**("먼저 상품 정보 / 공급 방식은 저장 후 / 설정 전까지 HUB 미노출"). **PASS**
2. Step2 = **"기본 공급가"** 헤딩 + 안내("공급 방식은 등록 후 [공급 방식 변경]에서 설정 / 지금 저장 시 내부 상품(미노출)") + **전체공개/서비스공급 UI 완전 미표시**(공급가/서비스가/소비자가/재고/추천만). **PASS**
3. **완료 화면 내부/미노출 안내 + 데이터(is_public=false 등) 검증 = 미수행(운영 테스트 상품 생성 회피).** 완료 화면 안내는 정적 조건부(`!reviewOnly`)로 코드 확정. 생성 결과는 createProduct 로직(form 기본 PRIVATE/[] 유지)으로 보증.
4. 기존 위저드 진입/Step1 필드/카테고리 정상, 회귀 없음.

> 참고: 등록 진입 페이지 BlockGuide 의 "Step 2: 공급가, 유통 정책, 서비스 노출" 안내 문구는 **CMS guide block**(코드 STEPS 아님)이라 본 WO 미접촉 — 후속 guide 콘텐츠 정정 대상.

## 5. 비범위 / 준수

- ✅ backend/API/DB/migration/distribution API/cancelled/catalog gate/이벤트오퍼/서비스별가격 **무변경**.
- ✅ price 검증·createProduct 의미 보존(§9.2: 기존 backend 동작 존중).
- ✅ path-specific(create page 1 + CHECK). **다른 세션 WIP(Market Trial: register-routes/connection/checkout/trial.ts/migration)·검증 png 미staging.**

## 6. 후속
- `WO-O4O-NETURE-SUPPLIER-PRODUCT-TO-EVENT-OFFER-ENTRY-V1` (이벤트 오퍼 진입) · `IR-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-V1` (서비스별 공급가).
- (선택) 완료 화면 "공급 방식 설정" 버튼을 해당 상품 drawer+모달로 직접 deep-link(현재는 목록 경유 안내) — route/state 전달 복잡도로 V1 보류(§6.4).

## 7. GuideBlock 라이브 문구 확인 (2026-06-19) — PASS

> §4 에서 "후속 guide 콘텐츠 정정 대상"으로 남긴 CMS guide block(코드 STEPS 아님)의 **라이브 실측**.

- 등록 흐름 GuideBlock = `SupplierProductCreatePage` 의 `GuideBlock`(serviceKey=`neture`, pageKey=`supplier.product.editor`). 다른 supplier 등록/목록/진입 페이지엔 GuideBlock 없음(RegisterEntryPage/ProductsPage 무 GuideBlock).
- **라이브 API 실측**(read-only): `GET /guide/contents?serviceKey=neture&pageKey=supplier.product.editor` → **`{"sections": {}}`**(DB 콘텐츠 없음). event-offer/library pageKey 도 `{}`.
- → DB override 없음 → **코드 fallback(정보-우선) 문구가 라이브 렌더**:
  - title "상품 정보를 먼저 등록합니다."
  - desc "기본 정보·기본 공급가 저장. 공급 방식(전체 공개/서비스 공급)은 **저장 후 [공급 방식 변경]에서 설정**, 설정 전 HUB 미노출."
  - steps 정보 → 기본 공급가(공급 방식 별도) → 이미지/설명
- **판정: PASS** — "유통 정책 / 서비스 노출 중심" guide 문구 없음, 정보-우선 흐름 정합. (종전 우려 "Step 2: 공급가, 유통 정책, 서비스 노출" CMS 콘텐츠는 현재 DB 부재.)
- 잔여(경미·비차단): `SupplierProductsPage:1262` **목록 헤더 부제**(하드코딩, GuideBlock 아님) "…가격 및 유통 정책을 설정합니다" 에 '유통 정책' 어휘 잔존 → 정적 문구 마이크로 후속(선택).

→ **공급자 상품 UX 축(A 표시분리 / B 정보-우선 / C 진입 / D 변경 API·cancelled / E 이벤트 진입 + GuideBlock 문구) 종료 조건 충족.**

---

*Date: 2026-06-19 · 후보 B frontend-only · 등록 정보-우선(Step2 hideDistribution=공급방식 제거, 가격 유지) + 정보/완료 안내 · createProduct/backend 무변경 · 내부/미노출 생성 · web-neture tsc 0 · GuideBlock 라이브 문구 PASS(supplier.product.editor=빈DB→fallback 정보-우선) · 공급자 상품 UX 축 종료 · 다른 세션 WIP 미커밋.*
