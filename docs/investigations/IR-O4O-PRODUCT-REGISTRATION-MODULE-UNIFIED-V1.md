# IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1

> **목적**: "상품 등록"을 **하나의 등록 모듈**로 본다. 진입 주체(공급자/매장경영자/서비스운영자/관리자/개발중 제작)는 여러 곳이지만, **등록되는 자산(ProductMaster + 설명서 3종 + 이미지)과 저장 계층은 하나**다. 진입점별로 다른 것은 **승인 흐름**뿐이다.
>
> **성격**: 설계 IR (역사·방향 기록). 코드 변경은 별도 스코프(§5 즉시 구현: 관리자 직접 등록).
>
> **날짜**: 2026-07-10 · 진입: [general-food README](../guides/products/general-food/README.md) · [IR-...-IMAGE-TO-DESCRIPTION-START-POINT-AUDIT-V1](IR-O4O-PRODUCT-IMAGE-TO-DESCRIPTION-START-POINT-AUDIT-V1.md)

---

## 1. 등록 모듈이 다루는 것 (공통 자산)

"상품 등록"은 아래를 하나로 묶는다:

1. **ProductMaster (정체성)** — 바코드 유무 무관(없으면 내부코드 자동생성, [WO-...-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1](../work-orders/WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1.md)).
2. **상세설명서 3종** = `shared_product_descriptions.description_type`:
   - **B2B** · **B2C** · **STORE(매장에서 사용하는 상세설명서)**
   - canonical key = `(master_id, description_type)`, `status='canonical'`.
   - **매장 화면(`/store/handled-products` → b2c-descriptions API)은 STORE canonical만 읽는다.** 지금 우리가 만드는 매장용 콘텐츠는 전부 **STORE**로 저장되어야 한다.
3. **이미지 / 식별자 / 태그** 등 부가 자산.

> 핵심: 진입점이 달라도 **저장 대상 테이블·계층은 동일**(ProductMaster + SPD). 진입점마다 별도 저장소를 만들지 않는다.

---

## 2. 등록 진입점 5종 (주체 → 승인 흐름)

| # | 진입 주체 | 승인 흐름 | 현재 상태 |
|---|-----------|-----------|-----------|
| 1 | **공급자(Supplier)** | 공급자 등록 → **네뚜레 운영자 승인** | ✅ 구현됨 (`createSupplierOffer`, 내부코드 자동생성) |
| 2 | **내 매장 경영자(Store Owner)** | 매장경영자 등록 → **관리자 승인** | ⚠️ 있었으나 **삭제됨** → 재구축 대상 |
| 3 | **서비스 운영자(Service Operator)** | 서비스운영자 등록 → **관리자 승인** | ❌ 미구현 → 신설 대상 |
| 4 | **관리자(Admin)** | **직접 등록, 승인 없음** | 🔶 master 생성은 가능(`masters/resolve`·`masters/new`), **설명서 저작은 제거되어 불가** |
| 5 | **개발 중 제작(코드 없이)** | **관리자 상품 등록 이용** (별도 경로 아님) | 4번을 그대로 사용 |

**설명서 저작 현황(중요)**: SPD 저작 워크플로우는 `WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1`로 **컨트롤러/라우트가 제거**되었다(검토·큐레이션 화면 제거). **서비스 메서드(`createCandidate`/`setCanonical`/`softDelete`)와 테이블은 유지**된다. 즉 저작 기능은 "구조가 없어진 게 아니라 진입 경로가 없어진" 상태다.

> 조율 주의: 본 모듈은 제거된 **검토·큐레이션 워크플로우를 되살리는 것이 아니다**. 등록 모듈의 일부로 **최소 저작(STORE 설명서 upsert) 경로**만 재수립한다. 큐레이션/리뷰 재도입은 별도 판단.

---

## 3. 왜 하나의 모듈인가

- 진입점마다 등록/저작을 따로 만들면 **4중 중복 + 규칙 드리프트**(sanitize·canonical 유일성·grounding·설명 3종 계약).
- 공통 코어(등록 서비스: master resolve + SPD upsert + 이미지)를 **1개**로 두고, 진입점은 **승인 정책 + 노출 권한만** 다르게 감싼다.
- 저장 계층은 이미 하나(ProductMaster + SPD). 남은 일은 **저작 진입 경로**를 진입점별로 얇게 붙이는 것.

---

## 4. 설명서 저작 코어 (재사용 대상)

- `shared-product-description.service.ts`:
  - `createCandidate({masterId, content, sourceType, descriptionType, language, summary})` — sanitize(jsdom+DOMPurify) 후 저장.
  - `setCanonical(id)` — 같은 `(master_id, description_type)`의 기존 canonical을 강등하고 승격(트랜잭션).
  - `softDelete(id)`.
- **STORE 설명서 upsert** = createCandidate(descriptionType='STORE') → setCanonical. 이 조합이 진입점 1~4 공통 코어다.

---

## 5. 즉시 구현 스코프 — **관리자 직접 등록만** (이번 작업) ✅ 구현·검증 완료 (2026-07-10)

> **완료**: 백엔드 엔드포인트(`POST/GET /admin/o4o-product-db/masters/:id/store-descriptions`) + 프런트 저작 패널 구현·배포(커밋 `d1b297d8b`, 서빙 리비전 02506). 콜라겐(master `ff8d26c1`) STORE 설명서 canonical 저장(2,231자) → **매장 경영활용 화면 "매장용 상세설명서"에서 정상 노출 확인**(사용자 검증). 나머지 제품·다국어 등록은 §5-C 계속.

> 지금은 진입점 **4(관리자 직접 등록)**만 만든다. 나머지(2 매장경영자 재구축, 3 서비스운영자 신설, 승인 흐름)는 후속 WO.

### 5-A. 백엔드 (최소 admin 엔드포인트)
- 신규: `POST /api/v1/admin/o4o-product-db/masters/:masterId/descriptions` (또는 store-description 전용)
  - Body: `{ content, summary?, language?='ko', descriptionType?='STORE' }`
  - 동작: `createCandidate(sourceType='manual', descriptionType)` → `setCanonical`. 반환: 저장된 SPD.
  - Guard: `requireAuth` + admin scope. sanitize는 서비스가 이미 수행.
- **검토 워크플로우(목록/큐/대시보드) 재도입 없음.** 등록 모듈용 단건 저작만.

### 5-B. 프런트 (관리자 master 상세)
- `ProductMasterDetailPage`의 "공식 소비자 설명 / 설명 후보" 영역에 **"매장용 상세설명서 작성·저장"** 액션 추가(모달: 언어 선택 + 본문 HTML 입력/붙여넣기 + 저장 → STORE canonical).
- 저장 후 매장 화면(`/store/handled-products`)에서 즉시 조회됨.

### 5-C. 이번 등록 대상
- 개발 중 제작분(콜라겐·맨파워포텐·흑염소·콸콸포맨 등)의 **STORE 설명서**를, 관리자 직접 등록으로 각 master에 저장.
- content 형식: 매장 모달/QR 렌더에 맞는 **본문 조각 HTML**(전체 `<!doctype>` 문서 아님).

---

## 6. 후속 (별도 WO)

- 진입점 **2 매장경영자 재구축**(→ 관리자 승인) · **3 서비스운영자 신설**(→ 관리자 승인).
- **승인 흐름 공통화**: 등록 → pending → 승인자별(운영자/관리자) 승인 → canonical 노출.
- B2B/B2C 저작 UI(STORE와 동일 코어, descriptionType만 다름).
- 큐레이션/검토 재도입 여부 판단(제거한 세션 의도와 조율).
- 저장 content 표준(모달·QR·storefront 공통 렌더 계약).

---

*설계 IR. §5(관리자 직접 등록)만 즉시 구현. 나머지는 방향 기록.*
