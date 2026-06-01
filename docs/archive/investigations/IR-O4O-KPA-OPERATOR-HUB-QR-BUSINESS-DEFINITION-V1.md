---
id: IR-O4O-KPA-OPERATOR-HUB-QR-BUSINESS-DEFINITION-V1
title: KPA 운영자 HUB QR-code 사업 정의 — 템플릿 vs 실제 QR 결정
status: completed
date: 2026-05-24
domain: kpa / store-hub / qr-code / business-definition
related:
  - IR-O4O-KPA-QR-STRUCTURE-AND-MENU-AUDIT-V1
  - IR-O4O-KPA-POP-STRUCTURE-AND-MENU-AUDIT-V1
  - WO-O4O-QR-LANDING-PAGE-V1
  - WO-O4O-STORE-HUB-BLOG-CONTENT-IMPORT-V1
  - WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1
constitution:
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
  - docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md (Item #3 QR-code, W5 우선순위)
  - docs/baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md
---

# IR-O4O-KPA-OPERATOR-HUB-QR-BUSINESS-DEFINITION-V1

> 직전 [IR-O4O-KPA-QR-STRUCTURE-AND-MENU-AUDIT-V1] 에서 확인된 entity 제약 + 5 시나리오 환원 불가 문제를 받아, **운영자 HUB QR 의 사업적 정체성** 을 단일 결론으로 고정한다. 코드는 변경하지 않으며, 다음 WO 의 entity 형태·import semantics·scan 통계 범위를 미리 닫는다.

---

## 1. 결정해야 하는 핵심 질문 1개

```text
운영자가 매장 HUB 에 제공하는 QR-code 는
  ㄱ. 실제 QR (slug + landing URL 발급된 운영물) 인가
  ㄴ. QR 템플릿 (매장이 가져가 자기 매장 QR 로 변환하는 발행 청사진) 인가
```

본 IR 의 모든 §2~§7 결정은 이 질문에 어떻게 답하느냐에 종속된다.

**결론 (§3 에서 도출): ㄴ. QR 템플릿.**

---

## 2. 전제 (직전 QR 구조 IR 인용)

| 사실 | 출처 |
|------|------|
| `StoreQrCode.organization_id NOT NULL + FK organizations(id) CASCADE` — 운영자 원본을 `store_id NULL` 로 표현 불가 | [IR-QR-STRUCTURE §3.4](IR-O4O-KPA-QR-STRUCTURE-AND-MENU-AUDIT-V1.md) |
| `slug` global unique — 매장 사본 slug 충돌 위험 | 동 §3.1, §3.4 |
| `service_key` / `author_role` / `status` 컬럼 부재 | 동 §3.4 |
| 매장 owner CRUD 9 endpoint + scan tracking 완비 | 동 §4.1 |
| 운영자/HUB 측 entity / API / page / route / menu **0개** | 동 §5 |
| QR landingTargetId 가 매장 컨텍스트에 강결합 (시나리오 C 공급자 상품 QR 실패) | 동 §6.2-3, §6.3 |

→ 본 IR 은 위 사실 위에서 사업 정의만 다룬다. 구조 결정 (§3) 은 §6 의 시나리오 선택에 따라 결정된다.

---

## 3. 작업 1 — QR-code 1차 시나리오 분류

### 3.1 후보 8종 정리

| # | 시나리오 | 운영자 게시 의미 | 매장 활용 의미 | landing 매장 컨텍스트 의존성 |
|:-:|---------|----------------|---------------|:---------------------------:|
| A | 일반 URL 안내 QR | 약사회 공식 페이지 / 정책 안내 URL | 매장 PDF / 인쇄물에 부착 | **약함** (URL 동일) |
| B | 내부 콘텐츠 / 블로그 연결 QR | 운영자 게시 블로그·CMS 콘텐츠 ID 안내 | 매장 컨텐츠 진열물에 부착 | **약함** |
| C | 상품 안내 페이지 연결 QR | 표준 상품 안내 페이지 | 매장 POP / 진열대 부착 | **중간** (page key 공유 가능) |
| D | 캠페인 / 이벤트 안내 QR | 약사회 캠페인 페이지 / 이벤트 landing | 매장 행사 인쇄물 부착 | **약함** |
| E | 태블릿 연결 QR | (잘 정의 안 됨) | 매장 태블릿 환경 진입 | **강함** (storeSlug 필수) |
| F | 소비자 설문 QR | 약사회 표준 설문 캠페인 | 매장 PDF / 안내문 부착 | **강함** (설문 응답 매장 단위 집계) + entity 부재 |
| G | 공급자 상품 직접 연결 QR | (Producer 재도입 모호) | 매장 supplier listing 부착 | **강함** (`spo.id` 또는 `opl.id` 매장 식별) |
| H | 기타 매장 전용 랜딩 QR | (정의 무의미 — 매장이 직접) | 기존 StoreQRPage 흐름 | (운영자 게시 대상 아님) |

### 3.2 1차 / 후속 / 제외 분류

| 분류 | 항목 | 근거 |
|------|------|------|
| **1차 구현 대상** | A, B, C, D | landing 매장 컨텍스트 의존성 약~중간. URL/콘텐츠 ID 만 공유해도 의미 성립. POP/Blog 와 같은 "콘텐츠 가치 공유" 모델 적용 가능. |
| **후속 검토 대상** | E (태블릿) | landing `'tablet'` 이 기존 frontend 에 부분 구현되어 있으나 운영자 게시 의미 모호. 매장 태블릿 환경 설계 후 별도 IR. |
| **후속 검토 대상** | F (설문) | survey entity 자체 부재. `IR-O4O-SURVEY-STRUCTURE-DESIGN-V1` 선행 필요. |
| **명시적 제외** | G (공급자 직접) | "공급자 → O4O 내부 Producer" 재도입으로 오해될 위험. [`O4O-BUSINESS-PHILOSOPHY-V1 §3`](docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) 의 "공급자 ≠ Producer" 원칙과 충돌. 운영자 템플릿이 supplier listing 을 직접 가리키는 시나리오는 cancel. |
| **명시적 제외** | H (매장 전용) | 운영자 게시 대상 아님. 기존 `StoreQRPage` 그대로 보존. |

### 3.3 1차 범위 정의 (Net)

운영자 HUB QR 의 1차 대상 landing 종류: **`url` (외부 URL) + `content` (내부 콘텐츠 ID — blog/cms/pop)** 2 종.

기존 `StoreQrCode.landingType` 4 종 (`product`, `promotion`, `page`, `link`) 과의 매핑:

| 운영자 template landing 종류 | 매장 사본 `landing_type` 변환 | 비고 |
|---|---|---|
| `url` | `link` | `landingTargetId = templates.target_url` 그대로 |
| `content` (blog) | `page` | `landingTargetId = "/content/blog/{slug}"` 또는 ID |
| `content` (cms) | `page` | `landingTargetId = cms_contents.id` |
| `content` (pop) | `page` | `landingTargetId = store_pops 가져온 사본 slug` (가져온 후) |

`product` / `promotion` 은 1차 매핑 대상 외. `tablet` 은 §3.2 의 E 후속.

---

## 4. 작업 2 — 운영자 QR 원본의 성격 정의

### 4.1 모델 A (실제 QR) vs 모델 B (QR 템플릿)

| 비교 항목 | 모델 A — 실제 QR | 모델 B — QR 템플릿 |
|----------|------------------|--------------------|
| slug 발급 위치 | 운영자 게시 시점 | 매장 가져가기 시점 |
| QR PNG 인쇄 단위 | 1개 (전국 매장 공유) | 매장별 (slug 별로 1개) |
| `store_qr_codes` row 생성 시점 | 운영자 게시 시점 (변형 entity 필요) | 매장 가져가기 시점 (현 entity 그대로) |
| scan event 집계 | `store_qr_scan_events` 가 single qr 단위 → 매장별 분리 어려움 | scan event 는 매장 사본별 → 매장별 분리 자연스러움 |
| 매장 landing 문구 수정 | ❌ (전국 동일) | ✅ (매장 사본 PUT) |
| 매장 PNG 다운로드 / 재인쇄 | 모든 매장이 동일 PNG → 분실 시 동일 URL 재발급 어려움 | 매장이 자기 slug PNG 재인쇄 자유 |
| organization_id NOT NULL FK 회피 | ❌ (nullable 변경 필요) | ✅ (운영자 템플릿은 별도 entity, store_qr_codes 구조 보존) |
| Store Menu Canonical [§5.3 W5](docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md) "HUB 진열 신설" 정합성 | △ (운영자 단일 QR 게시는 "콘텐츠" 보다 "URL" 에 가까움) | ✅ (운영자 = 진열 콘텐츠 발행, 매장 = 실행 QR 생성) |
| Blog/POP 패턴 일관성 | ❌ (다른 모델) | ✅ (운영자 발행 = 콘텐츠, 매장 사본 = 실행 자산) |

### 4.2 결정

**모델 B — QR 템플릿** 채택.

근거 (핵심 3):

1. **scan 통계 분리 자연스러움** — 매장 사업 가치의 핵심은 자기 매장 QR 의 scan 통계. 모델 A 는 매장별 분리에 별도 layer 필요 (운영자 통합 통계는 §6 후속).
2. **Blog/POP 패턴 일관성** — 운영자 발행 = "콘텐츠 / 청사진", 매장 사본 = "실행 자산". 운영자 HUB Publishing Standard 의 정신과 정합.
3. **기존 `store_qr_codes` 구조 보존** — `organization_id NOT NULL + FK + global unique slug` 제약 변경 없음. 매장 측 9 endpoint 그대로 활용. 마이그레이션 위험 0.

---

## 5. 작업 3 — 기존 StoreQrCode 확장 vs 신규 entity

### 5.1 Option A — `store_qr_codes` 확장

| 항목 | 필요 변경 | 위험 |
|------|-----------|------|
| `organization_id` NULLABLE | NOT NULL → NULL 허용 + FK 옵션화 | 기존 9 endpoint `WHERE organization_id=$1` 가드 무력화 가능. Boundary Policy 위배 위험. |
| `service_key` 추가 | 컬럼 + 인덱스 | 기존 row 백필 필요 (organization 조인 → service 추출) |
| `author_role` 추가 | 컬럼 + CHECK 제약 | 기존 row 전부 `'store'` 백필 |
| `status` 추가 | 컬럼 + 기본값 | 기존 `is_active` 와 의미 충돌 정리 필요 |
| `(store_id, slug)` 복합 unique | global unique 제거 + 복합 unique 신설 | global slug 보장하는 `/qr/public/:slug` 경로의 lookup 깨짐 → URL 충돌 시 매장 식별 추가 필요 (대규모 리팩토링) |

→ **모델 A 채택 시 강제. 모델 B 에서는 불필요.**

### 5.2 Option B — `operator_qr_templates` 신규 entity

```text
operator_qr_templates (Phase 1 청사진)
  id: uuid PK
  service_key: varchar  ← cross-service 격리
  author_role: 'operator' (CHECK)
  status: 'draft' | 'published' | 'archived'
  title: varchar
  description: text?
  target_type: 'url' | 'content' (1차 2종)
  target_url: text?           ← target_type='url' 시 사용
  target_content_kind: varchar? ← 'blog' | 'cms' | 'pop' (target_type='content' 시)
  target_content_ref: varchar?  ← slug 또는 id (kind 별 의미 다름)
  published_at: timestamptz?
  created_at / updated_at

  (slug 컬럼 없음 — 운영자 단계에서 slug 발급 안 함)
  (organization_id 없음 — 운영자 원본은 매장 무귀속)
  (scan tracking 없음 — scan 은 매장 사본 layer)
```

`store_qr_codes` 는 **매장 실행 layer** 로 그대로 보존. 변경 없음.

매장 가져가기 시 변환 (§6 상세):
```text
operator_qr_templates row
  ↓ POST /api/v1/kpa/stores/:slug/qr/staff/import { sourceId }
store_qr_codes INSERT (author_role/storeId/serviceKey 직접 없이도 organization_id 로 격리 유지)
```

### 5.3 결정

**Option B — `operator_qr_templates` 신규 entity** 채택.

근거:

1. **기존 9 endpoint 영향 0** — store_qr_codes 구조 변경 없음. 매장 측 CRUD / scan / print / analytics 그대로.
2. **`/qr/public/:slug` global URL 정합 보존** — slug 모델 변경 없음. URL 인덱스 그대로.
3. **POP `store_pops` 신설 패턴과 동질** — POP IR 의 Option C 신규 entity 선택 근거와 동일 ("기존 entity 의 4 개 제약 모두에서 충돌").
4. **마이그레이션 위험 최소** — 신규 CREATE TABLE 만. ALTER 없음. 백필 없음.

---

## 6. 작업 4 — 매장 가져가기 모델 정의

### 6.1 변환 흐름

```
operator_qr_templates (운영자 발행)
  author_role = 'operator' (개념상)
  service_key = 'kpa'
  status = 'published'
  target_type / target_url / target_content_kind / target_content_ref 보유

  ↓ POST /api/v1/kpa/stores/:slug/qr/staff/import { sourceId }
  ↓ backend 변환:
  ↓   - slug 발급 (template.title 기반 + 매장별 충돌 fallback)
  ↓   - landing_type / landing_target_id 변환 (§3.3 매핑 표)
  ↓   - title / description 복사
  ↓   - description 앞에 "[운영자 자료 가져옴] " 접두어 (Blog/POP 패턴)

store_qr_codes INSERT (매장 사본 — 기존 구조 그대로)
  organization_id = pharmacy.id
  slug = 매장 고유 발급
  landing_type / landing_target_id = 변환 결과
  is_active = true
  (origin_template_id 추적 컬럼은 1차 범위 외 — §6.3)
```

### 6.2 Snapshot semantics (운영자 변경 미반영)

운영자 템플릿이 매장 가져가기 후 수정·삭제·archive 되어도:
- **매장 사본은 영향 없음** — `store_qr_codes` row 가 독립 보존
- **landing 동작 영향 없음** — `landing_target_id` 가 직접 박힘 (FK 없음)
- **재가져오기 시점에만 새 사본 생성** — slug 충돌 fallback 으로 별도 row

근거: Blog/POP import 의 [`importOperatorPop`](apps/api-server/src/routes/o4o-store/controllers/pop.controller.ts) / [`importOperatorBlog`](apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts) 가 이미 채택한 패턴. 동질성 유지.

### 6.3 slug 충돌 처리

- 1차: `template.title` slugify
- 2차: 기존 `store_qr_codes` 글로벌 unique 검사 → 충돌 시 `${slug}-${Date.now().toString(36)}` 접미
- 3차: 매장 owner 가 PUT 으로 자유 변경 가능 (기존 controller 그대로)

### 6.4 origin tracking (1차 범위 결정)

| 옵션 | 평가 |
|------|------|
| `store_qr_codes.origin_template_id` 컬럼 추가 | ❌ 1차 범위 외 — store_qr_codes 구조 변경. ALTER + 인덱스 부담. |
| import 응답에만 `importSource` metadata 포함 | ✅ Blog/POP 1차 패턴 동일. frontend 토스트/일회성 표시. |
| description 접두어 "[운영자 자료 가져옴] " | ✅ Blog/POP 1차 패턴 동일. 자료실 origin badge 의 1차 표현. |

**결정**: description 접두어 + import 응답 metadata. `origin_template_id` 추적은 Phase 2 후속.

### 6.5 가져가기 흐름 규칙 (요약)

| 규칙 | 결정 |
|------|------|
| 매장 사본 생성 단위 | 1 import = 1 row INSERT |
| 기존 매장 QR 목록 추가 위치 | `GET /pharmacy/qr` 결과에 자동 포함 (기존 query 그대로) |
| slug 충돌 | timestamp suffix fallback |
| 운영자 템플릿 수정 → 매장 사본 반영 | **반영 안 함** (snapshot semantics) |
| 매장 사본 삭제 → 운영자 템플릿 영향 | 없음 |
| 같은 운영자 템플릿 재import 허용 | ✅ — slug 만 다르게 새 row |

---

## 7. 작업 5 — scan 통계 범위 정의

### 7.1 1차 결정

| 대상 | scan 통계 | 비고 |
|------|:---------:|------|
| `operator_qr_templates` (운영자 원본) | **없음** | scan event 자체가 매장 사본 단위에서만 발생. 운영자 단위 scan 무의미 (운영자 template 자체는 URL 발급 안 함) |
| `store_qr_codes` (매장 사본) | ✅ 기존 `store_qr_scan_events` 그대로 | 기존 매장 owner `/pharmacy/qr/:id/analytics` 그대로 |
| 운영자 화면 "가져간 매장 수" | **후속 가능** | `SELECT COUNT(*) FROM store_qr_codes WHERE origin_template_id=$1` 형태 — 단 §6.4 의 origin_template_id 가 Phase 2 도입 후. 1차 범위 외. |
| 통합 scan 통계 (운영자가 전국 scan 보기) | **1차 범위 제외** | origin_template_id + scan 조인 layer 필요. 사업 needs 확인 후 별도 IR. |

### 7.2 결과

1차 범위에서 scan 통계 변경 0. 기존 `store_qr_scan_events` 흐름 그대로.

---

## 8. 작업 6 — 설문 / 태블릿 / 공급자 상품 QR 경계

### 8.1 명시적 분리

| 항목 | 본 IR 처리 | 별도 IR / WO |
|------|-----------|----------------|
| 소비자 설문 QR | **제외** | `IR-O4O-SURVEY-STRUCTURE-DESIGN-V1` 선행 (survey entity 자체 부재) |
| 태블릿 QR (`landingType='tablet'`) | **제외** | 매장 태블릿 실행 환경 설계 후 별도 IR. landing 처리는 기존 `QrLandingPage` 가 이미 일부 cover. |
| 공급자 상품 직접 QR | **명시적 제외** | "공급자 = Producer" 재도입 오해 차단. 매장 직접 흐름 (`/pharmacy/qr` POST `landingType='product'`) 은 기존대로 매장 owner 가 자기 선택 — 운영자 템플릿 대상 아님. |
| 통합 scan analytics | **1차 제외** | §7 의 후속 IR 대상 |

### 8.2 정리 문구 (다음 WO 작성 시 인용)

```text
설문 QR 은 survey 도메인 entity 설계가 선행되어야 한다.
태블릿 QR 은 매장 태블릿 실행 환경 정의가 선행되어야 한다.
공급자 상품 QR 은 매장 owner 가 자기 매장 product 를 선택해 만드는 기존 흐름으로 한정한다 —
운영자 템플릿이 supplier listing 을 가리키는 시나리오는 본 트랙에 포함하지 않는다.
```

---

## 9. 작업 7 — 후속 WO 권장 범위

### 9.1 단계화 (3 단계 + 후속)

| 순번 | WO | 범위 | 패턴 mirror |
|:----:|----|------|-------------|
| 1 | **WO-O4O-KPA-OPERATOR-HUB-QR-TEMPLATE-FOUNDATION-V1** | `operator_qr_templates` entity + migration + `connection.ts` 등록 + `HubSourceDomain='qr'` 추가 + `queryQr` placeholder + asset-snapshot `'qr'` allowedAssetType 등록 검토 + `resolveQr` placeholder | POP Phase 1 [WO-O4O-KPA-POP-OPERATOR-PUBLISHING-V1] |
| 2 | **WO-O4O-KPA-OPERATOR-QR-PUBLISHING-PHASE2-BACKEND-V1** | operator-qr.controller.ts (write API) + 3 서비스 mount (KPA only 가능) + queryQr 실 구현 + resolveQr 실 구현 + connection.ts entities 등록 보강 | POP Phase 2 [WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1] |
| 3 | **WO-O4O-KPA-OPERATOR-QR-WRITE-PAGE-V1** | operatorQr API client + OperatorQrListPage + OperatorQrWritePage + `/operator/qr` 라우트 + sidebar 메뉴 | POP Phase 3-A [WO-O4O-KPA-OPERATOR-POP-WRITE-PAGE-V1] |
| 4 | **WO-O4O-KPA-STORE-HUB-QR-CONTENT-IMPORT-V1** | qrStaff API client + HubQrLibraryPage (`/store-hub/qr`) + PharmacyHubLayout 메뉴 + backend `/stores/:slug/qr/staff/import` (변환 흐름) | POP Phase 3-B [WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1] |

매장 사본 관리 화면: **별도 추가 없음** — 가져간 사본은 기존 `StoreQRPage` (`/store/marketing/qr`) 가 그대로 표시. description 접두어 + import 응답 toast 로 origin 표현.

### 9.2 1차 범위 외 (후속 별도)

- POST `/stores/:slug/qr/staff/...` 매장 직접 QR 흐름 — 기존 `POST /pharmacy/qr` 가 이미 cover (별도 신설 불필요)
- origin_template_id 추적 + 통합 scan 통계 — Phase 5 후속
- GlycoPharm / K-Cosmetics 이식 — KPA 검증 후 별도 WO

---

## 10. 결론

| 질문 | 결정 |
|------|------|
| 운영자 QR 원본은 실제 QR 인가? | **아니오 — QR 템플릿이다** |
| 매장이 가져가면 무엇이 생성되는가? | **기존 `store_qr_codes` 의 매장 소유 row 1개** (기존 9 endpoint 그대로 다룸) |
| 기존 `store_qr_codes` 구조 변경? | **없음** — 마이그레이션 위험 0 |
| 신규 entity 필요? | **`operator_qr_templates` 신설** — POP `store_pops` 신설과 동질 |
| 1차 landing 종류? | **`url` + `content` 2종** — product/promotion/tablet 제외 |
| Snapshot semantics? | **운영자 변경 → 매장 사본 자동 반영 안 함** (Blog/POP import 패턴 동일) |
| scan 통계 변경? | **0** — 매장 사본 layer 의 기존 통계 그대로 |
| 1차 제외 항목? | **공급자 상품 / 태블릿 / 설문 / 통합 통계** |

### 핵심 결론 (사용자 사전 예측과 100% 일치)

```text
운영자 QR 원본 = 실제 QR-code 가 아니라 QR 템플릿
매장이 가져가면 기존 store_qr_codes 에 매장 소유 QR-code 생성
운영자 템플릿과 매장 실행 QR 은 분리
snapshot semantics — 운영자 변경 → 매장 사본 자동 미반영
1차 landing: url + content 만
1차 제외: 공급자 상품 + 태블릿 + 설문 + 통합 통계
```

---

## 11. 산출물 요약

| 항목 | 결과 |
|------|------|
| 1차 QR 시나리오 | A (URL 안내) / B (콘텐츠·블로그 연결) / C (상품 안내 페이지) / D (캠페인 안내) — landing 종류 `url` + `content` 2종 |
| 보류 시나리오 | E (태블릿 — 매장 태블릿 환경 설계 후) / F (설문 — survey entity 설계 후) |
| 명시적 제외 | G (공급자 직접 QR — Producer 재도입 오해 차단) / H (매장 전용 — 기존 StoreQRPage 보존) |
| 운영자 QR 원본 성격 | QR 템플릿 (모델 B) |
| StoreQrCode 확장 여부 | **확장 안 함** (Option B 신규 entity 채택) |
| operator_qr_templates 필요 여부 | **필요** (Phase 1 foundation 대상) |
| 매장 가져가기 모델 | 직접 import endpoint + snapshot semantics + slug timestamp fallback + description 접두어 + import 응답 metadata |
| scan 통계 범위 | **1차 변경 0** — 매장 사본의 기존 store_qr_scan_events 그대로 |
| 설문 / 태블릿 / 공급자 / 통합 통계 | 모두 본 IR 범위 외 — 별도 IR/WO 분리 명문화 |
| 후속 WO | 4단계 (Foundation → Backend → Operator Page → Store Hub Import) — POP 와 동일 라이프사이클 |
| 코드 변경 | **없음** (조사 + 사업 정의 전용 IR) |

---

*Author: Claude (Business definition only — no code change executed)*
*Investigation date: 2026-05-24*
*Status: completed — ready for WO-O4O-KPA-OPERATOR-HUB-QR-TEMPLATE-FOUNDATION-V1*
