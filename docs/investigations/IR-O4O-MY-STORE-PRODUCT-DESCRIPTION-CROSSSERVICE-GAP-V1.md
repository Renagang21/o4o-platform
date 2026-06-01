# IR-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-GAP-V1

**날짜:** 2026-06-01  
**유형:** cross-service gap 조사  
**목적:** KPA 상품 설명 기능을 GlycoPharm / K-Cosmetics에 이식 가능한지 확인  
**코드 수정:** 없음

---

## 전체 판정: PASS ✅

**즉시 WO 가능.** Frontend-only 구현. Backend/DB 변경 불필요.

**근거:**
1. Backend `productAiContent` API(`/api/v1/products/:productId/ai-contents`)는 Core API — 서비스 prefix 없음, 3개 서비스 모두 접근 가능
2. `ProductionTarget` 타입에 `'product-description'`이 이미 정의됨
3. GlycoPharm/K-Cosmetics `productionTemplates.ts`에 product-description이 **명시적으로 Phase 2-J 제외**로 기록됨 — 의도된 deferred 구현
4. `StartProductionModal` 공통 컴포넌트, `RichTextEditor`, `AiContentModal` 모두 shared package
5. Local products API도 `/api/v1/store/local-products` (Core API, 3개 서비스 공통)

---

## 1. KPA Canonical 구조

| 항목 | 내용 |
|------|------|
| route | `/store/marketing/product-descriptions` |
| component | `StoreProductDescriptionsPage.tsx` (742줄) |
| backend API | `/api/v1/products/:productId/ai-contents` (Core API, no KPA prefix) |
| API client | `productAiContent.ts` — `getProductAiContents`, `saveProductAiContent`, `generateProductAiContent` |
| 저장 위치 | `ProductAiContent` entity, `contentType='product_description'` |
| local products 연결 | `fetchLocalProducts()` → `/api/v1/store/local-products` (Core API) |
| Editor | `RichTextEditor` + `AiContentModal` from `@o4o/content-editor` |
| Template 지원 | `findTemplate(templateId)` from `./productionTemplates` |
| Template 진입 | `StoreLibraryContentsPage → StartProductionModal → product-description target` |
| AI 생성 | `generateProductAiContent(productId, 'product_description')` 비동기 polling |
| Store Product 연결 | `LocalProduct.id` 기반 (StoreLocalProducts에서 선택) |

**진입 흐름:**
```
/store/library/contents
  → 콘텐츠 선택 → StartProductionModal
  → product-description target 선택
  → /store/marketing/product-descriptions (결과물 관리 + AI 편집)
```

**신규 단독 생성 불가** (WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1):  
`/store/library/contents → 제작 시작 → 상품 상세설명` 진입만 허용.

---

## 2. GlycoPharm Gap 분석

### 존재하는 것
| 항목 | 상태 |
|------|------|
| `productionTemplates.ts` | ✅ 존재 — POP/QR 템플릿 정의. product-description **명시적 Phase 2-J 제외** |
| `StartProductionModal` | ✅ `StoreLibraryContentsPage`에서 사용 중 |
| Local products API | ✅ `/store/local-products` (Core API) |
| `StoreLibraryContentsPage` | ✅ 존재 — `StartProductionModal` 연결됨 |
| `GLYCOPHARM_PRODUCTION_TARGETS` | ✅ POP + QR만 — product-description 없음 |

### 없는 것
| 항목 | 상태 |
|------|------|
| `productAiContent` API client | ❌ 없음 |
| `StoreProductDescriptionsPage` (또는 상당) | ❌ 없음 |
| `/store/marketing/product-descriptions` route | ❌ 없음 |
| product-description template (service-specific) | ❌ 없음 (Phase 2-J 대기) |
| `GLYCOPHARM_PRODUCTION_TARGETS`에 product-description | ❌ 없음 |

### 이식 가능성
**HIGH.** 5가지 작업만 필요:
1. `productAiContent.ts` API client 추가 (KPA와 동일 엔드포인트 `/products/:id/ai-contents`)
2. `productionTemplates.ts`에 약국 맥락 product-description 템플릿 추가
3. `StoreProductDescriptionsPage` (또는 약국 버전) 추가 — KPA 패턴 이식, 문구 조정
4. App.tsx에 route 추가
5. `StoreLibraryContentsPage`의 `GLYCOPHARM_PRODUCTION_TARGETS`에 product-description 추가

### 문구 기준
- **"내 약국"** 표현 유지
- "약국 상품 안내문" 또는 "상품 상세설명" (약국 맥락)
- GlycoPharm 전용 system prompt: 당뇨/혈당관리 약국 상품 맥락

---

## 3. K-Cosmetics Gap 분석

### 존재하는 것
| 항목 | 상태 |
|------|------|
| `productionTemplates.ts` | ✅ 존재 — POP/QR 템플릿 정의. product-description **명시적 Phase 2-J 제외** |
| `StartProductionModal` | ✅ `StoreLibraryContentsPage`에서 사용 중 |
| Local products API | ✅ `/store/local-products` (Core API, `services/localProductApi.ts`) |
| `StoreLibraryContentsPage` | ✅ 존재 |
| `COSMETICS_PRODUCTION_TARGETS` | ✅ POP + QR만 |

### 없는 것
GlycoPharm과 동일한 5가지 항목 없음.

### 이식 가능성
**HIGH.** GlycoPharm과 동일한 5가지 작업 필요.

### 문구 기준
- **"내 매장"** 표현 사용
- "매장 상품 설명" 또는 "상품 상세설명"
- K-Cosmetics 전용 system prompt: 뷰티/화장품 매장 상품 맥락

---

## 4. Shared Package / 공통화 가능성

| 항목 | 상태 |
|------|------|
| `ProductionTarget = 'product-description'` | ✅ `@o4o/types/production` 공통 정의 |
| `ProductionTemplate` 타입 | ✅ `@o4o/types/production-template` 공통 |
| `StartProductionModal` | ✅ `@o4o/store-ui-core` 공통 |
| `RichTextEditor` | ✅ `@o4o/content-editor` 공통 |
| `AiContentModal` | ✅ `@o4o/content-editor` 공통 |
| `productAiContent` API client | ⚠️ KPA 전용 현재 — GlycoPharm/K-Cosmetics에 복사 필요 (동일 엔드포인트) |
| `StoreProductDescriptionsPage` | ⚠️ KPA 전용 — 서비스별로 생성 필요 (문구/template system prompt 차이) |
| Backend `productAiContent` endpoint | ✅ Core API (`/products/:id/ai-contents`) — 3개 서비스 공통 |
| KPA hardcoding | ✅ 없음 — `coreApiClient` 사용, serviceKey prefix 없음 |

**serviceKey 기반 확장:** backend API가 `organizationId` 기반으로 상품을 격리하므로 서비스 간 데이터 격리 자동 보장.

---

## 5. Backend / DB Gap

| 항목 | 상태 |
|------|------|
| `product_ai_contents` 테이블 | ✅ Core Layer 존재 |
| `/api/v1/products/:id/ai-contents` endpoint | ✅ Core API — KPA/GlycoPharm/K-Cosmetics 공통 접근 가능 |
| `contentType='product_description'` | ✅ 이미 지원 (`ProductAiContentType` union) |
| serviceKey scope | ✅ `organizationId` 기반 자동 격리 (product가 조직 소속) |
| migration 필요 여부 | ✅ **불필요** |
| endpoint 보강 필요 여부 | ✅ **불필요** |

---

## 6. Store Hub → 내 매장 실행 흐름

```
3개 서비스 공통 흐름 (구현 후):
/store-hub/content → HubContentPage
  → assetSnapshotApi.copy({ assetType:'cms' })
  → /store/library/contents
  → StartProductionModal → product-description target
  → /store/marketing/product-descriptions
  → 상품 선택 (LocalProduct) + AI 생성/편집 (RichTextEditor)
  → /products/:productId/ai-contents 저장
  → (향후) 상품 상세 / POP / QR 활용
```

**현재 끊기는 지점:** `StartProductionModal`에서 product-description target 없음 (GlycoPharm/K-Cosmetics). 이후 단계는 모두 인프라 준비됨.

---

## 7. 정책 판단

1. **O4O 공통 Store Execution capability인가?** — 예. 상품 설명은 공급자 자료를 매장 실행 자산으로 전환하는 핵심 축.
2. **KPA 기능을 그대로 이식해야 하는가?** — 대체로 예. 단 서비스별 system prompt 차이 필요.
3. **서비스별 차이?** — system prompt (약국/화장품 맥락), 사용자-facing 문구 정도.
4. **GlycoPharm 문구?** — "약국 상품 안내문" / "내 약국" 유지.
5. **K-Cosmetics 문구?** — "매장 상품 설명" / "내 매장" 사용.
6. **지금 즉시 구현 가치?** — 예. 모든 인프라가 준비됨. Phase 2-J 계획 예약 상태.
7. **한 번에 cross-service 공통화 vs 단계적?** — 한 번에 cross-service로 진행 권장. WO 1개로 처리 가능.

---

## 8. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현재 상태 | 충돌 여부 |
|------|---------|---------|
| Store Hub 콘텐츠 → 실행 자산 연결 | GlycoPharm/K-Cosmetics에서 product-description 단계 없음 | ⚠️ 부분 충돌 |
| 공통 Store capability API/데이터 정렬 | Backend Core API 이미 정렬됨 | ✅ |
| 정보 중심 다품종 소량 판매 지원 | GlycoPharm(혈당측정기 등), K-Cosmetics(화장품) 모두 해당 | 지원 필요 |
| GlycoPharm 약국 표현 | 이식 시 "내 약국" 유지 필요 | 설계 반영 필요 |

**결론:** 상품 설명 기능은 Phase 2-J에서 명시적으로 예약된 작업. 인프라 완비 상태. 즉시 WO 진행 권장.

---

## 9. 후속 WO 권장

### 권장 (단일 cross-service WO)

**WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1**

범위:
1. `services/web-glycopharm/src/api/productAiContent.ts` 추가 (KPA와 동일 엔드포인트)
2. `services/web-glycopharm/src/config/productionTemplates.ts`에 product-description 템플릿 추가 (약국 맥락)
3. `services/web-glycopharm/src/pages/store-management/StoreProductDescriptionsPage.tsx` 생성
4. GlycoPharm App.tsx route 추가
5. `StoreLibraryContentsPage`의 `GLYCOPHARM_PRODUCTION_TARGETS`에 product-description 추가
6. K-Cosmetics 동일 작업 (화장품 매장 맥락 system prompt)
7. 문구: GlycoPharm "내 약국", K-Cosmetics "내 매장"

난이도: LOW — Frontend-only, Backend 변경 없음, 공통 컴포넌트 재사용  
예상 범위: 파일 약 8~10개 (2개 서비스 × 5개 파일)

*검증 수행: Claude Code (2026-06-01)*
