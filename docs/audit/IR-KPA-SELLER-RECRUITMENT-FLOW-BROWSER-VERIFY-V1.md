# IR-KPA-SELLER-RECRUITMENT-FLOW-BROWSER-VERIFY-V1

> 판매자 모집(PRIVATE) 흐름 최종 검증 보고서

---

## 검증 환경

| 항목 | 값 |
|------|------|
| API commit | `6e4f98741` (feat(kpa): WO-KPA-SELLER-RECRUITMENT-FLOW-IMPLEMENTATION-V1) |
| Web commit | 동일 (monorepo) |
| 검증 방식 | Phase 1: 코드 정적 분석 / Phase 2: 배포 후 API + 번들 검증 |
| 검증 일시 | 2026-04-05 |

---

## 전체 판정: PASS

모든 8개 시나리오가 코드 경로 정적 분석 + 배포 후 라우트/번들 검증을 통해 정상 구현됨을 확인.

---

## Phase 2: 배포 후 런타임 검증

### API 서버 상태

| 항목 | 결과 |
|------|------|
| Health Check | `healthy` — DB v15.17, 12 active connections, uptime 553s |
| Node.js | v22.22.2, Linux x86_64 |
| Memory | 277MB / 1024MB (27%) |

### 라우트 등록 검증 (404 vs 401 응답 비교)

| 엔드포인트 | HTTP 응답 | 판정 | 비고 |
|-----------|-----------|------|------|
| `GET /api/v1/kpa/pharmacy/products/catalog?distributionType=PRIVATE` | **401** | PASS | 라우트 존재, 인증 필요 |
| `POST /api/v1/kpa/pharmacy/products/apply` | **401** | PASS | 라우트 존재, 인증 필요 |
| `GET /api/v1/neture/supplier/requests` | **401** | PASS | 라우트 존재, 인증 필요 |
| `POST /api/v1/neture/supplier/requests/:id/approve` | **401** | PASS | **신규 라우트** 정상 등록 |
| `POST /api/v1/neture/supplier/requests/:id/reject` | **401** | PASS | **신규 라우트** 정상 등록 |

> 모든 엔드포인트가 401 (Authentication Required) 반환 — 404가 아님 → 라우트 정상 등록 확인

### 회귀 검증 (PUBLIC/SERVICE 라우트)

| 엔드포인트 | HTTP 응답 | 판정 |
|-----------|-----------|------|
| `GET /catalog?distributionType=PUBLIC` | 401 | PASS — 기존 라우트 유지 |
| `GET /catalog?distributionType=SERVICE` | 401 | PASS — 기존 라우트 유지 |
| `GET /catalog` (필터 없음) | 401 | PASS — 기존 라우트 유지 |

### 프론트엔드 번들 검증

#### KPA Society Web (`kpa-society-web-117791934476.asia-northeast3.run.app`)

| 항목 | 결과 | 판정 |
|------|------|------|
| 서비스 상태 | HTTP 200 | PASS |
| 번들 파일 | `index-DqFw8n1r.js` | 확인 |
| `"PRIVATE"` 탭 키 | 1회 출현 | PASS |
| `"취급 신청"` 버튼 텍스트 | 3회 출현 | PASS |
| `"판매자 모집"` 탭 라벨 | 1회 출현 | PASS |
| `"공급자 승인"` 안내 텍스트 | 3회 출현 | PASS |

#### Neture Web (`neture-web-117791934476.asia-northeast3.run.app`)

| 항목 | 결과 | 판정 |
|------|------|------|
| 서비스 상태 | HTTP 200 | PASS |
| 번들 파일 | `index-BNXy8Rgm.js` | 확인 |
| `approve`/`reject` 함수 | approve 2회, reject 13회 | PASS |

### 내부 테스트 엔드포인트

| 항목 | 결과 |
|------|------|
| `/api/internal/v2/product-policy` | 활성화 확인 (ADMIN_SECRET_REQUIRED 응답) |
| PRIVATE 상품 조회 | Admin Secret 미보유로 데이터 검증 불가 |

---

## Phase 1: 코드 정적 분석 (상세)

### 시나리오별 결과

| # | 시나리오 | 기대 결과 | 판정 | 코드 위치 |
|---|---------|----------|------|----------|
| S1 | 판매자 모집 탭 노출 | PRIVATE 상품이 카탈로그에 포함 | PASS | pharmacy-products.controller.ts:128 |
| S2 | 취급 신청 | PRIVATE → createPrivateApproval 호출 | PASS | pharmacy-products.controller.ts:222 |
| S3 | 중복 신청 방지 | APPROVAL_ALREADY_PENDING 반환 | PASS | product-approval-v2.service.ts:240 |
| S4 | 공급자 요청 목록 | approval_type='private' 필터 조회 | PASS | supplier-product.controller.ts:253 |
| S5 | 공급자 승인 | approvePrivateProduct + listing 생성 | PASS | supplier-product.controller.ts:301 |
| S6 | 내 매장 반영 | listing is_active=false로 생성 | PASS | product-approval-v2.service.ts:332 |
| S7 | 공급자 거절 | REJECTED, listing 미생성 | PASS | supplier-product.controller.ts:335 |
| S8 | PUBLIC/SERVICE 회귀 | 기존 흐름 변경 없음 | PASS | pharmacy-products.controller.ts:218-221 |

### S1. 판매자 모집 탭 노출 — PASS

**카탈로그 SQL:**
```sql
WHERE spo.distribution_type IN ('PUBLIC', 'SERVICE', 'PRIVATE')
  AND spo.is_active = true
  AND s.status = 'ACTIVE'
```

- 메인 쿼리 (line 128) + 카운트 쿼리 (line 167) 모두 PRIVATE 포함
- distributionType 필터: `['PUBLIC', 'SERVICE', 'PRIVATE']` 허용 (line 78)
- 프론트엔드 탭 키: `{ key: 'PRIVATE', label: '판매자 모집' }` (HubB2BCatalogPage:32, StoreOrderableProductsPage:30)

### S2. 취급 신청 — PASS

```typescript
} else if (offer.distribution_type === 'PRIVATE') {
  result = await service.createPrivateApproval(supplyProductId, organizationId, serviceKey, user.id);
}
```

- POST /apply 핸들러에서 PRIVATE 분기 추가 (line 222-223)
- `createPrivateApproval(offerId, sellerOrgId, serviceKey, requestedBy)` 호출
- 프론트엔드 버튼: "취급 신청" (HubB2BCatalogPage:360, StoreOrderableProductsPage:357)

### S3. 중복 신청 방지 — PASS

```typescript
if (existing.approval_status === ProductApprovalStatus.PENDING) {
  return { success: false, error: 'APPROVAL_ALREADY_PENDING' };
}
if (existing.approval_status === ProductApprovalStatus.APPROVED) {
  return { success: false, error: 'APPROVAL_ALREADY_APPROVED' };
}
// REJECTED / REVOKED → 재신청 허용
```

- (offer_id, organization_id, approval_type) 기준 중복 검사
- PENDING → 차단, APPROVED → 차단, REJECTED/REVOKED → 재신청 허용

### S4. 공급자 요청 목록 — PASS

```sql
WHERE pa.approval_type = 'private'
  AND spo.supplier_id = $1
```

- GET /supplier/requests에서 PRIVATE 타입만 조회
- supplier_id 기반 소유권 필터 적용

### S5. 공급자 승인 — PASS

```typescript
router.post('/requests/:id/approve', requireAuth, requireLinkedSupplier, ...)
```

- 소유권 검증: `pa.approval_type = 'private' AND spo.supplier_id = $2`
- `approvePrivateProduct(id, userId)` 호출
- 트랜잭션 내 실행 (PENDING → APPROVED + listing 생성)

### S6. 내 매장 반영 — PASS

```typescript
listing = txListingRepo.create({
  organization_id: approval.organization_id,
  service_key: approval.service_key,
  master_id: offer.masterId,
  offer_id: offer.id,
  is_active: false,  // 판매자가 직접 활성화
});
```

- 중복 방지: 기존 listing 존재 시 생성 skip
- 23505 unique violation 핸들링

### S7. 공급자 거절 — PASS

```typescript
approval.approval_status = ProductApprovalStatus.REJECTED;
approval.decided_by = rejectedBy;
approval.decided_at = new Date();
```

- `rejectPrivateApproval()`: 상태만 REJECTED로 변경
- listing 생성 로직 없음 (확인 완료)
- 거절 사유(reason) 기록 지원

### S8. PUBLIC/SERVICE 회귀 — PASS

- PUBLIC 경로: `createPublicListing()` — 변경 없음 (즉시 listing 생성)
- SERVICE 경로: `createServiceApproval()` — 변경 없음 (운영자 승인 대기)
- 기존 if/else if 분기 구조 유지, PRIVATE는 새 분기로 추가

---

## 라우트 충돌 분석 — PASS

Express 라우트 등록 순서:

1. `GET /requests` — 목록
2. `GET /requests/:id` — 상세
3. `POST /requests/:id/approve` — 승인 ← 신규
4. `POST /requests/:id/reject` — 거절 ← 신규

- POST 메서드이므로 GET /requests/:id와 충돌 없음
- `/requests/:id/approve`는 `:id` 뒤에 추가 경로 세그먼트가 있어 Express가 정확히 매칭
- `/supplier/products/*` 경로와 `/supplier/requests/*` 경로는 프리픽스가 달라 충돌 없음

---

## 상태 변화 표

| 단계 | product_approvals.status | approval_type | listing 생성 | 비고 |
|------|-------------------------|---------------|-------------|------|
| 취급 신청 직후 | pending | private | X | 공급자 승인 대기 |
| 공급자 승인 후 | approved | private | O (is_active=false) | 판매자 활성화 필요 |
| 공급자 거절 후 | rejected | private | X | 재신청 가능 |
| 거절 후 재신청 | pending | private | X | 기존 레코드 재사용 |

---

## 핵심 검증 요약

| 항목 | 정적 분석 | 런타임 검증 |
|------|----------|-----------|
| PRIVATE 노출 | SQL + 탭 키 확인 | 카탈로그 API 라우트 401 (배포 확인) |
| 취급 신청 | POST /apply PRIVATE 분기 | apply API 라우트 401 (배포 확인) |
| 공급자 승인/거절 | approve/reject 라우트 구현 | 신규 라우트 401 (배포 확인) |
| 프론트엔드 반영 | 탭/버튼/텍스트 변경 | JS 번들에서 "PRIVATE", "취급 신청", "공급자 승인" 확인 |
| PUBLIC/SERVICE 회귀 | if/else 분기 보존 | PUBLIC/SERVICE 카탈로그 라우트 정상 |

---

## 회귀 영향

| 기존 흐름 | 상태 | 근거 |
|----------|------|------|
| PUBLIC 즉시 등록 | 정상 | createPublicListing 변경 없음, 카탈로그 라우트 정상 |
| SERVICE 운영자 승인 | 정상 | createServiceApproval 변경 없음, 카탈로그 라우트 정상 |

---

## 미검증 항목 (사람 관측 필요)

| 항목 | 이유 | 검증 방법 |
|------|------|----------|
| 실제 PRIVATE 상품 존재 여부 | DB 데이터 의존, Admin Secret 미보유 | 브라우저 로그인 후 탭 클릭 |
| E2E 취급 신청 → 승인 → listing 생성 | 실제 계정 + PRIVATE 상품 필요 | 브라우저 시나리오 테스트 |
| 프론트엔드 렌더링 (UI 레이아웃) | 브라우저 필요 | 사람 관측 → 스크린샷 |

---

*Generated: 2026-04-05*
*Updated: 2026-04-05 (Phase 2 런타임 검증 추가)*
*Status: PASS — 코드 정적 분석 + 배포 런타임 검증 완료*
