# IR-KPA-SERVICE-KEY-NORMALIZATION-FIX-V1

**작업일**: 2026-04-11
**검증 도구**: Node.js fetch API (라이브 API 호출)
**배포 방식**: main push → GitHub Actions CI/CD → Cloud Run Job (마이그레이션)

---

## 1. 전체 판정

```
전체 판정: ✅ PASS
표준 service key: kpa-society
코드 정규화: ✅ 7개 파일 수정
데이터 정리: ✅ migration 배포 완료
라이브 검증: ✅ ALL PASS
빌드: ✅ TypeScript 에러 0건
```

---

## 2. 표준 service key 최종 결정

### 결정: `kpa-society`

| 근거 | 설명 |
|------|------|
| SSOT | `organization_service_enrollments.service_code = 'kpa-society'` |
| Auto-expansion | `autoExpandServiceProduct()` — enrollment의 `service_code`를 직접 사용 |
| Bridge 생성 | KPA 2차 심사 bridge → `service_key = 'kpa-society'` |
| 서비스 카탈로그 | `service-catalog.ts` → `key: 'kpa-society'` |
| 프론트엔드 | `web-kpa-society` → `SERVICE_KEY = 'kpa-society'` |

### 이중 키 구조 (설계 의도)

| 키 | 용도 | 테이블 |
|----|------|--------|
| `kpa` | RBAC role prefix, 일부 CMS 콘텐츠 | `roles`, `role_assignments`, `cms_contents` |
| `kpa-society` | 서비스 등록, 상품 승인/리스팅, 멤버십, 포럼 | `organization_service_enrollments`, `service_memberships`, `product_approvals`, `organization_product_listings` |

`kpa`는 역할 체계(RBAC)에서 prefix로 유지. 상품/승인/리스팅 흐름은 `kpa-society`로 통일.

---

## 3. 조사된 사용처 요약

### 수정 전 불일치 지점

| 위치 | 수정 전 | 용도 | 영향 |
|------|--------|------|------|
| `pharmacy-products.controller.ts` 기본값 | `'kpa'` | `/applications`, `/approved` 필터 | 승인 데이터 미노출 |
| `kpa-checkout.controller.ts` L399 | `'kpa'` | 체크아웃 listing 확인 | 주문 가능 상품 누락 가능 |
| `kpa-checkout.controller.ts` L495 | `'kpa'` | 주문 metadata | 주문 조회 불일치 가능 |
| `store.controller.ts` (glycopharm) 3곳 | `'kpa'` | 약국 매장 상품 조회 | 상품 미노출 |
| `checkout.controller.ts` (glycopharm) 2곳 | `'kpa'` | 체크아웃 validation | 주문 차단 가능 |
| `seller.service.ts` fallback | `'kpa'` | 판매자 서비스키 조회 | 잘못된 키로 승인 생성 |
| `product-policy-v2.internal.routes.ts` 2곳 | `'kpa'` | 내부 테스트 | 테스트 데이터 불일치 |

### RBAC 매핑 레이어 (변경 없음 — 정상 설계)

| 파일 | 매핑 | 용도 |
|------|------|------|
| `serviceScope.ts` | `'kpa' → 'kpa-society'` | Role prefix → 서비스키 |
| `membership-guard.middleware.ts` | `'kpa' → 'kpa-society'` | Scope guard |
| `operator-forum.routes.ts` | `'kpa-society' → 'kpa'` | Forum DB→RBAC 역매핑 |

---

## 4. 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `pharmacy-products.controller.ts` | `resolveServiceKeyFromQuery/Body` 기본값 `KPA` → `KPA_SOCIETY` |
| `kpa-checkout.controller.ts` | listing 조회 `'kpa'` → `'kpa-society'`, 주문 metadata `'kpa-society'`, 주문 목록 조회 하위호환 `IN ('kpa-society', 'kpa')` |
| `store.controller.ts` (glycopharm) | 3개 WHERE `'kpa'` → `'kpa-society'` + 주석 업데이트 |
| `checkout.controller.ts` (glycopharm) | 2개 WHERE `'kpa'` → `'kpa-society'` |
| `seller.service.ts` | `resolveServiceKey()` fallback `'kpa'` → `'kpa-society'` |
| `product-policy-v2.internal.routes.ts` | 2개 내부 테스트 기본값 `'kpa'` → `'kpa-society'` |
| `blog.controller.ts` | 주석 업데이트 |
| `20260411300000-NormalizeKpaServiceKeys.ts` | **신규** — 데이터 정규화 마이그레이션 |

---

## 5. Migration 상세

### `20260411300000-NormalizeKpaServiceKeys.ts`

```
1. product_approvals: service_key='kpa' → 'kpa-society' (UPDATE)
   - UNIQUE (offer_id, organization_id, approval_type) — service_key 미포함 → 충돌 없음

2. organization_product_listings: 2단계 처리
   a. 중복 삭제: 같은 org+offer에 'kpa'와 'kpa-society' 모두 존재 시 'kpa' row 삭제
   b. 나머지 UPDATE: service_key='kpa' → 'kpa-society'
   - UNIQUE (organization_id, service_key, offer_id) — 중복 사전 제거 필수
```

---

## 6. 수정 전 / 후 흐름 비교

### 수정 전

```
phamacy1 → GET /kpa/pharmacy/products/applications
  → resolveServiceKeyFromQuery() → default 'kpa'
  → SELECT ... WHERE service_key = 'kpa'
  → ❌ 0건 (실제 데이터는 'kpa-society')

phamacy1 → GET /kpa/pharmacy/products/approved
  → default 'kpa' → ❌ 0건

카탈로그 → isApplied/isApproved/isListed
  → 카탈로그 자체는 service_key 필터 없음 → ✅ 노출됨
  → 하지만 탭 뷰에서 신청/승인 목록이 비어 있는 불일치
```

### 수정 후

```
phamacy1 → GET /kpa/pharmacy/products/applications
  → resolveServiceKeyFromQuery() → default 'kpa-society'
  → SELECT ... WHERE service_key = 'kpa-society'
  → ✅ 3건

phamacy1 → GET /kpa/pharmacy/products/approved
  → default 'kpa-society' → ✅ 3건

listings → service_key = 'kpa-society' → ✅ 3건
checkout → service_key = 'kpa-society' → ✅ 일치
```

---

## 7. 검증 결과

### 시나리오 1: 기존 데이터 정합성

| 검증 항목 | 결과 |
|----------|------|
| migration 실행 | ✅ `o4o-api-migrations-fq4j9` SUCCESS |
| `product_approvals.service_key` | `kpa-society` 통일 |
| `organization_product_listings.service_key` | `kpa-society` 통일 |

### 시나리오 2: 약국 상품 흐름 재검증

| 엔드포인트 | 수정 전 | 수정 후 |
|-----------|--------|--------|
| `/applications` | 0건 | **3건** ✅ |
| `/approved` | 0건 | **3건** ✅ |
| `/listings` | 3건 | **3건** ✅ |
| `/catalog` (isListed) | 3건 | **3건** ✅ |
| `/catalog` (isApplied) | ? | **3건** ✅ |
| `/catalog` (isApproved) | ? | **3건** ✅ |

### 시나리오 3: Glycopharm 경로

| 엔드포인트 | 결과 |
|-----------|------|
| `/glycopharm/pharmacy/products/listings` | **3건** ✅ (service_key=kpa-society) |

### 시나리오 4: 주문 하위호환

| 항목 | 처리 |
|------|------|
| 기존 주문 (serviceKey='kpa') | `IN ('kpa-society', 'kpa')` 조건으로 조회 가능 |
| 신규 주문 | `serviceKey: 'kpa-society'`로 생성 |

---

## 8. 빌드 결과

```
TypeScript build: ✅ 에러 0건
CI Pipeline: ✅ SUCCESS
Deploy API Server: ✅ SUCCESS
Migration: ✅ SUCCESS (o4o-api-migrations-fq4j9)
Deploy Web Services: ✅ SUCCESS
```

---

## 9. 미수정 영역 (별도 WO 후보)

| # | 영역 | 현재 상태 | 권장 |
|---|------|----------|------|
| 1 | `o4o_asset_snapshots.source_service` | `'kpa'` 하드코딩 | 중 — 스냅샷 origin 추적 |
| 2 | `cms_contents.serviceKey` | `'kpa'` 시딩 | 하 — 읽기 쿼리에서 양쪽 수용 중 |
| 3 | `community_hub.service_code` | `'kpa'` | 하 — 커뮤니티 독립 도메인 |
| 4 | `platform_store_slugs.service_key` | `'kpa'` | 하 — 슬러그 시스템 별도 |
| 5 | RBAC role prefix `'kpa'` | 의도적 설계 | 변경 불필요 |

---

## 10. 후속 작업

| # | 항목 | 우선순위 |
|---|------|:---:|
| 1 | KPA 운영자 승인 화면 서비스 가격 표시 | 중 |
| 2 | HUB 카탈로그 가격 노출 기준 정리 | 중 |
| 3 | active enrollment 의존 auto-expansion 정책 점검 | 중 |
| 4 | 주문 흐름 end-to-end 검증 | 높 |
| 5 | asset snapshot source_service 정규화 | 중 |

---

*작업자: Claude Code*
*커밋: `629bc43e4` (main)*
*CI/CD: GitHub Actions → Cloud Run Job `o4o-api-migrations-fq4j9` → SUCCESS*
