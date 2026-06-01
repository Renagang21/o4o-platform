# CHECK-O4O-MY-STORE-EXECUTION-CROSSSERVICE-COMMONIZATION-V2

> **목적:** WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1 완료 이후,  
> KPA-Society / GlycoPharm / K-Cosmetics 내 매장·내 약국 실행 영역 cross-service 정렬 최종 확인.

---

## 메타

| 항목 | 내용 |
|------|------|
| 일자 | 2026-06-01 |
| 선행 WO | WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1 (commit: a664ebabb) |
| 선행 CHECK | CHECK-O4O-MY-STORE-EXECUTION-CROSSSERVICE-COMMONIZATION-V1 |
| 기준 | KPA-Society canonical |
| 범위 | frontend read-only 검증 |

---

## 1. 전체 판정

**⚠️ PARTIAL — 내 매장 / 내 약국 실행 영역 cross-service 공통화 1차 완료 (미세 drift 잔존)**

V1의 가장 큰 gap인 product-description MISSING(GlycoPharm, K-Cosmetics)이 해소되었다.  
핵심 실행 영역(POP / QR / Blog / Signage / Production Materials / Product Description / Local Products / Tablet Displays)이  
3개 서비스 모두에서 기능 단위로 정렬 확인되었다.

**PARTIAL 이유:** K-Cosmetics 내 자료함 라벨 소폭 차이 / TV재생 메뉴 미노출 / 주문·정산 Placeholder 잔존.  
product-description 자체는 완료. 사이드바 미노출은 아래 §4-A에서 설명하는 의도적 설계.

---

## 2. V1 대비 개선 사항

| 항목 | V1 | V2 |
|------|----|----|
| GlycoPharm product-description | ❌ MISSING | ✅ FUNCTIONAL |
| K-Cosmetics product-description | ❌ MISSING | ✅ FUNCTIONAL |
| GlycoPharm productionTemplates product-description | ❌ 없음 | ✅ 2개 추가 (당뇨 관련 / 일반 약국) |
| K-Cosmetics productionTemplates product-description | ❌ 없음 | ✅ 2개 추가 (스킨케어 / 일반 화장품) |
| GlycoPharm Core API client | ❌ 없음 | ✅ productAiContent.ts 추가 |
| K-Cosmetics Core API client | ❌ 없음 | ✅ productAiContent.ts 추가 |
| GlycoPharm route | ❌ 없음 | ✅ /store/library/product-descriptions |
| K-Cosmetics route | ❌ 없음 | ✅ /store/library/product-descriptions |

---

## 3. Cross-Service Matrix (V2)

### 범례
- **FULL**: KPA canonical 구조와 동일 수준 구현
- **FUNCTIONAL**: 핵심 기능 동작, KPA 대비 일부 세부 차이 허용
- **PARTIAL**: 기본 진입 가능하나 일부 기능 미완성
- **WRAPPER**: 공통 컴포넌트 wrapping만으로 구현
- **PLACEHOLDER**: 진입점만 있고 내용 없음
- **MISSING**: route/page 없음
- **INTENTIONAL_DIFF**: 의도적 서비스 차별화

| 영역 | KPA | GlycoPharm | K-Cosmetics | 비고 |
|------|-----|------------|-------------|------|
| **대시보드** | FULL | FULL (StoreMainPage) | FULL (StoreDashboardLayout) | |
| **내 자료함 / 콘텐츠** | FULL | FULL | FULL | |
| **내 자료함 / 자료실** | FULL | FULL | FULL | |
| **제작 자료 / Production Materials** | FULL | FULL | FULL | |
| **POP** | FULL | FULL | FULL | |
| **QR** | FULL | FULL | FULL | |
| **블로그** | FULL | FUNCTIONAL | FULL | GlycoPharm `content/blog` 경로 차이 |
| **상품 설명 / product-description** | FULL | **FUNCTIONAL** ✅ NEW | **FUNCTIONAL** ✅ NEW | route 경로 소폭 차이 (아래 주석) |
| **디지털 사이니지** | FULL | FULL | FULL | |
| **내 매장 상품 (Local Products)** | FULL | FULL | FULL | |
| **태블릿 디스플레이** | FULL | FULL | FULL | |
| **주문 관리** | FULL | FULL | PARTIAL (Placeholder) | K-Cosmetics 주문 미완성 |
| **설정** | FULL | FULL | FULL | |

### product-description FUNCTIONAL 판정 근거

GlycoPharm / K-Cosmetics 모두:
- page 존재 ✅
- route 등록 ✅
- Core API client (`/api/v1/products/:productId/ai-contents`) ✅
- productionTemplates target 등록 ✅
- RichTextEditor + AiContentModal 연결 ✅
- StartProductionModal → template 연계 흐름 ✅
- 생성/편집/저장 흐름 완비 ✅

KPA 대비 FULL이 아닌 FUNCTIONAL 이유:
- KPA: `marketing/product-descriptions` 경로 / GlycoPharm·K-Cosmetics: `library/product-descriptions` 경로 (소폭 drift)
- KPA `PharmacyQrPage` 등 전용 QR-per-product 연계가 GlycoPharm product-description에는 없음 (범위 외)
### §4-A. product-description 사이드바 미노출 — 의도적 설계 확인

storeMenuConfig.ts 조사 결과, KPA / GlycoPharm / K-Cosmetics **3개 서비스 모두** 사이드바 menuSections에
product-descriptions 메뉴 항목이 없음. 이는 gap이 아니라 **의도적 설계**임이 확인되었다.

**Canonical 진입 흐름:**
`
내 자료함 → 제작 자료(library/production-materials) → StartProductionModal → product-description 선택
→ /store/library/product-descriptions (결과물 관리 페이지)
`

- KPA는 과거 사이드바 직접 노출 후 WO-O4O-KPA-STORE-SIDEBAR-PRODUCTION-MENU-REMOVE-V1로 제거.
- 제거 이유: 제작 진입은 "내 자료함 > 매장 제작 자료 통합 모달"로 일원화 의도.
- GlycoPharm / K-Cosmetics도 동일 설계를 따름.
- **결론: product-description 사이드바 진입점 추가 WO 불필요.**

---

## 4. Product-Description 최종 상태

### GlycoPharm

| 항목 | 결과 |
|------|------|
| route | `/store/library/product-descriptions` ✅ |
| page | `pages/store-management/StoreProductDescriptionsPage.tsx` ✅ |
| API client | `api/productAiContent.ts` ✅ |
| Core API | `/api/v1/products/:productId/ai-contents` (prefix 없음) ✅ |
| templates | `glyco-product-desc-diabetes` / `glyco-product-desc-general` ✅ |
| AI 생성/편집 | AiContentModal 연결 ✅ |
| 저장 흐름 | saveProductAiContent → Core API PUT ✅ |
| 사용자-facing 문구 | "내 약국 상품 설명", "약국 상품 설명 관리" ✅ |

### K-Cosmetics

| 항목 | 결과 |
|------|------|
| route | `/store/library/product-descriptions` ✅ |
| page | `pages/store/StoreProductDescriptionsPage.tsx` ✅ |
| API client | `api/productAiContent.ts` ✅ |
| Core API | `/api/v1/products/:productId/ai-contents` (prefix 없음) ✅ |
| templates | `kcos-product-desc-skincare` / `kcos-product-desc-general` ✅ |
| AI 생성/편집 | AiContentModal 연결 ✅ |
| 저장 흐름 | saveProductAiContent → Core API PUT ✅ |
| 사용자-facing 문구 | "내 매장 상품 설명", "매장 상품 설명 관리" ✅ |

---

## 5. 사용자-facing 문구 검증

| 서비스 | 검증 항목 | 결과 |
|--------|----------|------|
| GlycoPharm | "내 약국" 사용 | ✅ 확인 |
| GlycoPharm | "약국 상품 설명" 사용 | ✅ 확인 |
| GlycoPharm | "내 매장" 노출 없음 | ✅ CLEAN |
| K-Cosmetics | "내 매장" 사용 | ✅ 확인 |
| K-Cosmetics | "매장 상품 설명" 사용 | ✅ 확인 |
| K-Cosmetics | "내 약국" 노출 없음 | ✅ CLEAN |

---

## 6. API/Client 검증

| 항목 | 결과 |
|------|------|
| GlycoPharm Core API endpoint | `/products/${productId}/ai-contents` (prefix 없음) ✅ |
| K-Cosmetics Core API endpoint | `/products/${productId}/ai-contents` (prefix 없음) ✅ |
| KPA Core API endpoint | `/products/${productId}/ai-contents` (prefix 없음) ✅ |
| 3개 서비스 API 계약 일치 | ✅ |
| backend 서비스별 prefix 신규 도입 | ❌ 없음 |
| dashboardCopyApi 재도입 | ❌ 없음 (신규 파일 모두 CLEAN) |
| authClient 패턴 | `api.get/put/post` (서비스 기존 패턴 동일) ✅ |

---

## 7. Route/Layout 회귀 없음

GlycoPharm 기존 route 모두 유지 확인:
- `marketing/pop` ✅ / `marketing/qr` ✅ / `content/blog` ✅
- `library/contents` ✅ / `library/resources` ✅
- `library/production-materials` ✅ / `library/production-materials/new` ✅
- `marketing/signage/*` ✅
- `commerce/local-products` ✅ / `commerce/tablet-displays` ✅

K-Cosmetics 기존 route 모두 유지 확인:
- `marketing/pop` ✅ / `marketing/qr` ✅ / `content/blog` ✅
- `library/contents` ✅ / `library/resources` ✅
- `library/production-materials` ✅ / `library/production-materials/new` ✅
- `marketing/signage/*` ✅
- `commerce/local-products` ✅ / `commerce/tablet-displays` ✅

---

## 8. TypeScript 검증

| 서비스 | 결과 |
|--------|------|
| services/web-glycopharm | ✅ PASS (오류 없음) |
| services/web-k-cosmetics | ✅ PASS (오류 없음) |

---

## 9. 브라우저 Smoke

**BLOCKED** — 배포 전 로컬 환경 상태로 직접 smoke 불가.

코드/route/API 검증 결과를 근거로 판정:
- GlycoPharm `/store/library/product-descriptions`: lazy import + route 정상, 상품 목록 API + AI editor 연결 완비 → 기능적 동작 예상
- K-Cosmetics `/store/library/product-descriptions`: 동일 구조 → 기능적 동작 예상
- 배포 후 테스트 계정으로 smoke 권장

---

## 10. 남은 Drift 목록

| # | 항목 | KPA canonical | GlycoPharm | K-Cosmetics | 영향도 | 후속 WO |
|---|------|--------------|------------|-------------|--------|---------|
| D1 | product-description route 경로 | marketing/product-descriptions | library/product-descriptions | library/product-descriptions | 낮음 | 불필요 (기능 동일) |
| D2 | 내 자료함 제작 자료 라벨 | 매장 제작 자료 | 제작 자료 | 제작 자료 | 낮음 | WO-O4O-KCOSMETICS-STORE-MENU-PRODUCTION-MATERIALS-LABEL-V1 |
| D3 | 사이니지 TV재생 메뉴 | 있음 | 있음 | 없음 (route 있음) | 낮음 | WO-O4O-KCOSMETICS-SIGNAGE-TV-PLAY-MENU-V1 (보류 가능) |
| D4 | K-Cosmetics 주문 관리 | FULL | FULL | PARTIAL (Placeholder) | 중간 | WO-O4O-KCOSMETICS-STORE-ORDER-BILLING-V1 (별도 큰 작업) |
| D5 | K-Cosmetics 정산/인보이스 | FULL | FULL | Placeholder | 중간 | D4와 동일 WO |
| D6 | 분석 섹션 (마케팅 분석) | 있음 | 없음 | 없음 | 낮음 | 별도 WO 후보 |

---

## 11. 후속 WO 후보

| 우선순위 | WO 후보 | 규모 | 비고 |
|---------|---------|------|------|
| **1순위** | *(현재 문서 commit)* | — | — |
| **2순위** | WO-O4O-KCOSMETICS-STORE-MENU-PRODUCTION-MATERIALS-LABEL-V1 | 낮음 (1줄) | 내 자료함 제작 자료 라벨 통일 |
| **3순위 (보류 가능)** | WO-O4O-KCOSMETICS-SIGNAGE-TV-PLAY-MENU-V1 | 낮음 | TV재생 메뉴 추가 |
| **4순위 (별도 큰 작업)** | WO-O4O-KCOSMETICS-STORE-ORDER-BILLING-V1 | 큼 | 주문/정산 placeholder 실구현 |

**product-description 관련 추가 WO 없음** — 사이드바 미노출은 의도적 설계 (§4-A 참조).

---

## 12. 최종 결론

**내 매장 / 내 약국 실행 영역 cross-service 공통화 1차 완료 (미세 drift 잔존)**

V1에서 확인된 가장 큰 gap(product-description MISSING)이 해소되었으며,
3개 서비스의 핵심 실행 영역이 기능 단위에서 정렬되었다.
product-descriptions 사이드바 미노출은 3개 서비스 공통 의도적 설계임이 확인되었다.

```text
판정: PARTIAL

product-description:
  KPA          FULL
  GlycoPharm   FUNCTIONAL (V1: MISSING → V2: FUNCTIONAL)
  K-Cosmetics  FUNCTIONAL (V1: MISSING → V2: FUNCTIONAL)

product-description 사이드바 미노출: 의도적 설계 (3개 서비스 공통)
  → "내 자료함 / 제작 시작 modal → product-description route" 흐름이 canonical
  → 추가 WO 불필요

남은 drift (낮음~중간):
  D2: 내 자료함 제작 자료 라벨 ("제작 자료" vs "매장 제작 자료")
  D3: K-Cosmetics 사이니지 TV재생 메뉴 미노출
  D4/D5: K-Cosmetics 주문/정산 Placeholder (별도 큰 작업)

TypeScript: 양 서비스 PASS
문구 drift: 없음
API 계약: 3개 서비스 동일 Core API 사용
회귀: 없음
```