# Role Guard Integration Checklist

## Work Order: WO-SIGNAGE-PHASE3-DEV-INTEGRATION

### 목적

Phase 3 Extension의 Role Guard 시스템이 올바르게 구현되었는지 검증하는 체크리스트.

---

## 1. Role 정의 검증

### 1.1 Extension Roles (extension.guards.ts)

| Role | Value | Extension |
|------|-------|-----------|
| PHARMACY_OPERATOR | `signage:pharmacy:operator` | Pharmacy |
| PHARMACY_STORE | `signage:pharmacy:store` | Pharmacy |
| COSMETICS_OPERATOR | `signage:cosmetics:operator` | Cosmetics |
| COSMETICS_STORE | `signage:cosmetics:store` | Cosmetics |
| SELLER_PARTNER | `signage:seller:partner` | Seller |
| SELLER_ADMIN | `signage:seller:admin` | Seller |
| TOURIST_OPERATOR | `signage:tourist:operator` | Tourist |
| TOURIST_STORE | `signage:tourist:store` | Tourist |

**검증 상태:** ✅ 정의 완료

---

## 2. 권한 매트릭스 검증

### 2.1 Pharmacy Extension

| 엔드포인트 | Admin | Operator | Store | 구현 |
|-----------|-------|----------|-------|------|
| GET /categories | ✅ | ✅ | ❌ | guards.operator |
| POST /categories | ✅ | ✅ | ❌ | guards.operator |
| GET /campaigns | ✅ | ✅ | ❌ | guards.operator |
| POST /campaigns | ✅ | ✅ | ❌ | guards.operator |
| GET /presets | ✅ | ✅ | ❌ | guards.operator |
| GET /hq/contents | ✅ | ✅ | ❌ | guards.operator |
| POST /hq/contents | ✅ | ✅ | ❌ | guards.operator |
| GET /global/contents | ✅ | ✅ | ✅ | guards.storeRead |
| POST /global/contents/:id/clone | ✅ | ✅ | ✅ | guards.store |

**검증 상태:** ✅ pharmacy.routes.ts 검토 완료

### 2.2 Cosmetics Extension

| 엔드포인트 | Admin | Operator | Store | 구현 |
|-----------|-------|----------|-------|------|
| GET /brands | ✅ | ✅ | ❌ | guards.operator |
| POST /brands | ✅ | ✅ | ❌ | guards.operator |
| GET /presets | ✅ | ✅ | ❌ | guards.operator |
| POST /presets | ✅ | ✅ | ❌ | guards.operator |
| GET /contents | ✅ | ✅ | ❌ | guards.operator |
| POST /contents | ✅ | ✅ | ❌ | guards.operator |
| GET /trends | ✅ | ✅ | ❌ | guards.operator |
| POST /trends | ✅ | ✅ | ❌ | guards.operator |
| GET /global/contents | ✅ | ✅ | ✅ | guards.storeRead |
| POST /global/contents/:id/clone | ✅ | ✅ | ✅ | guards.store |
| GET /stats | ✅ | ✅ | ❌ | guards.operator |

**검증 상태:** ✅ cosmetics.routes.ts 검토 완료

---

## 3. Guard 로직 검증

### 3.1 Operator Guard (requireExtensionOperator)

```typescript
// 허용 조건:
// 1. Core Signage Operator (signage:operator 또는 admin)
// 2. Extension별 Operator Role
```

**체크리스트:**
- [x] 인증되지 않은 요청 → 401 Unauthorized
- [x] Core Operator는 모든 Extension 접근 가능
- [x] Extension Operator는 해당 Extension만 접근 가능
- [x] Store Role로 Operator 엔드포인트 접근 → 403 Forbidden

### 3.2 Store Guard (requireExtensionStore)

```typescript
// 허용 조건:
// 1. Operator (Core 또는 Extension)
// 2. Core Store (signage:store)
// 3. Extension Store Role
```

**체크리스트:**
- [x] 인증되지 않은 요청 → 401 Unauthorized
- [x] Operator는 Store 기능도 접근 가능
- [x] Store Role은 Store 엔드포인트만 접근 가능

### 3.3 Store Read Guard (allowExtensionStoreRead)

```typescript
// 허용 조건:
// 모든 Signage 관련 Role (읽기 전용)
```

**체크리스트:**
- [x] 인증되지 않은 요청 → 401 Unauthorized
- [x] 모든 Signage Role이 Global Content 조회 가능

---

## 4. Extension 활성화 검증

### 4.1 Extension Enabled Guard (requireExtensionEnabled)

**체크리스트:**
- [x] 비활성화된 Extension → 503 Service Unavailable
- [x] 조직별 비활성화 시 해당 조직만 차단
- [x] Extension Type이 request에 저장됨

### 4.2 현재 Extension 상태

| Extension | Status | Version |
|-----------|--------|---------|
| pharmacy | enabled | 1.0.0 |
| cosmetics | enabled | 1.0.0 |
| seller | enabled | 1.0.0 |
| tourist | disabled | 1.0.0 |

---

## 5. 교차 접근 차단 검증

### 5.1 Multi-tenant 격리

**구현 위치:** Controller → Service → Repository

```typescript
// getScope()에서 organizationId 추출
private getScope(req: ExtensionRequest): { organizationId: string } {
  const organizationId = req.organizationId;
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }
  return { organizationId };
}
```

**체크리스트:**
- [x] 모든 쿼리에 organizationId 조건 포함
- [x] organizationId 없는 요청 차단
- [x] 다른 조직 데이터 접근 불가

### 5.2 Extension 간 격리

```
/ext/pharmacy/* → PharmacyController → PharmacyService → pharmacy_* tables
/ext/cosmetics/* → CosmeticsController → CosmeticsService → cosmetics_* tables
```

**체크리스트:**
- [x] Extension별 독립 스키마 (signage_pharmacy, signage_cosmetics)
- [x] Extension 간 직접 참조 없음
- [x] Service 간 호출 없음

---

## 6. 에러 응답 일관성

### 6.1 Extension Error Response

```typescript
{
  error: string;      // 에러 코드
  message: string;    // 사용자 메시지
  statusCode: number; // HTTP 상태 코드
  extension?: string; // Extension 타입
}
```

### 6.2 에러 코드 정의

| Code | HTTP | 설명 |
|------|------|------|
| UNAUTHORIZED | 401 | 인증 필요 |
| EXT_FORBIDDEN | 403 | 권한 없음 |
| EXT_DISABLED | 503 | Extension 비활성화 |
| EXT_NOT_FOUND | 404 | 리소스 없음 |

**검증 상태:** ✅ 일관된 에러 응답 구조

---

## 7. 보안 체크리스트

### 7.1 Guard 우회 가능성

- [x] 라우터에 Guard 미적용 엔드포인트 없음
- [x] Guard 순서 올바름 (enabled → role)
- [x] next() 호출 후 추가 코드 없음

### 7.2 권한 상승 방지

- [x] Store가 Operator 엔드포인트 접근 불가
- [x] Force 권한은 pharmacy-hq만 보유
- [x] Clone 시 원본 권한 상속 안 됨

---

## 8. 최종 검증 결과

| 항목 | 상태 |
|------|------|
| Role 정의 | ✅ Pass |
| Pharmacy Guards | ✅ Pass |
| Cosmetics Guards | ✅ Pass |
| Extension 활성화 | ✅ Pass |
| Multi-tenant 격리 | ✅ Pass |
| Extension 격리 | ✅ Pass |
| 에러 응답 | ✅ Pass |
| 보안 체크 | ✅ Pass |

---

*Document Version: 1.0.0*
*Created: 2026-01-20*
*Work Order: WO-SIGNAGE-PHASE3-DEV-INTEGRATION*
