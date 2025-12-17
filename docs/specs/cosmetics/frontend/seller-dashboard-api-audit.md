# Seller Dashboard - API As-Is 점검 보고서

> **Work Order**: WO-03-SELLER-DASHBOARD-API-AUDIT
> **Status**: AUDIT COMPLETE
> **Date**: 2025-12-17
> **결론**: 대부분 OK, 일부 프론트엔드 계산 필요

---

## 1. 점검 목적

Seller Dashboard 화면 구현에 **필요한 데이터가 실제로 API에서 제공되는지** 확인한다.

- 기능 추가 ❌
- 데이터 정합성 확인만 수행

---

## 2. KPI별 API 점검 결과

### 2.1 주요 KPI 섹션

| KPI | API Endpoint | 응답 필드 | 상태 |
|-----|--------------|-----------|------|
| 총 상담 | `GET /api/v1/cosmetics-seller/consultation/seller/{sellerId}/stats` | `totalConsultations` | ✅ OK |
| 전환율 | 동일 | `conversionRate` | ✅ OK |
| 진열 수 | `GET /api/v1/cosmetics-seller/display/seller/{sellerId}/stats` | `totalDisplays` | ✅ OK |
| 재고 부족 | `GET /api/v1/cosmetics-seller/inventory/seller/{sellerId}/stats` | `lowStockCount` | ✅ OK |

**서비스 파일 위치:**
- `packages/cosmetics-seller-extension/src/backend/services/consultation-log.service.ts:143` - `getStats()`
- `packages/cosmetics-seller-extension/src/backend/services/display.service.ts:114` - `getDisplayStats()`

---

### 2.2 샘플 성과 섹션

| KPI | API Endpoint | 응답 필드 | 상태 | 비고 |
|-----|--------------|-----------|------|------|
| 총 재고 (수량) | `GET /api/v1/cosmetics-sample/inventory/{storeId}/stats` | - | ⚠️ 보완 필요 | `totalQuantity` 필드 없음 |
| 총 재고 (종) | 동일 | `totalProducts` | ✅ OK | |
| 샘플 사용 | `GET /api/v1/cosmetics-sample/usage/{storeId}/daily?days={N}` | 배열 집계 필요 | ⚠️ 프론트 계산 | 배열 합산 필요 |
| 샘플→구매 전환 | `GET /api/v1/cosmetics-sample/usage/{storeId}/aggregate` | `conversionRate` | ✅ OK | |
| 재고 부족 | `GET /api/v1/cosmetics-sample/inventory/{storeId}/stats` | `lowStock` | ✅ OK | |
| 품절 | 동일 | `outOfStock` | ✅ OK | |

**서비스 파일 위치:**
- `packages/cosmetics-sample-display-extension/src/backend/services/sample-inventory.service.ts:214` - `getStoreStats()`
- `packages/cosmetics-sample-display-extension/src/backend/services/sample-usage.service.ts:126` - `aggregateUsage()`
- `packages/cosmetics-sample-display-extension/src/backend/services/sample-usage.service.ts:235` - `getDailyUsage()`

---

### 2.3 진열 건강도 섹션

| KPI | API Endpoint | 응답 필드 | 상태 | 비고 |
|-----|--------------|-----------|------|------|
| 건강 점수 | `GET /api/v1/cosmetics-sample/display/{storeId}/summary` | - | ⚠️ 프론트 계산 | `verifiedDisplays / totalDisplays * 100` |
| 총 진열 | 동일 | `totalDisplays` | ✅ OK | |
| 활성 진열 | 동일 | `activeDisplays` | ✅ OK | |
| 인증 완료 | 동일 | `verifiedDisplays` | ✅ OK | |
| 미인증 | 동일 | 계산 필요 | ⚠️ 프론트 계산 | `totalDisplays - verifiedDisplays` |

**서비스 파일 위치:**
- `packages/cosmetics-sample-display-extension/src/backend/services/display.service.ts:206` - `getStoreSummary()`

---

## 3. 기간 필터별 응답 가능 여부

| 기간 | API 파라미터 | 지원 여부 |
|------|-------------|----------|
| 오늘 | `days=1` | ✅ OK |
| 이번 주 | `days=7` | ✅ OK |
| 이번 달 | `days=30` | ✅ OK |

**대상 API:**
- `GET /api/v1/cosmetics-sample/usage/{storeId}/daily?days={N}`

---

## 4. 색상 판정 로직 위치

| 판정 항목 | 위치 | 상태 |
|----------|------|------|
| 전환율 색상 | 프론트엔드 | ✅ 명확 |
| 건강 점수 색상 | 프론트엔드 | ✅ 명확 |
| 재고 부족 색상 | 프론트엔드 | ✅ 명확 |
| 미인증 진열 색상 | 프론트엔드 | ✅ 명확 |

**결론**: 모든 색상 판정은 **프론트엔드에서 수행**한다. (API는 원시 데이터만 제공)

---

## 5. 보완 필요 항목

### 5.1 현재 없는 필드 (프론트 계산으로 해결)

| 항목 | 해결 방법 |
|------|----------|
| `totalQuantity` (총 재고 수량) | `inventory` 배열에서 `quantityRemaining` 합산 |
| `healthScore` (건강 점수) | `verifiedDisplays / totalDisplays * 100` |
| `unverifiedDisplays` (미인증) | `totalDisplays - verifiedDisplays` |
| 일별 사용량 합계 | `getDailyUsage()` 배열 합산 |

### 5.2 프론트엔드 계산 코드 예시

```typescript
// 건강 점수 계산
const healthScore = displaySummary.totalDisplays > 0
  ? Math.round((displaySummary.verifiedDisplays / displaySummary.totalDisplays) * 100)
  : 0;

// 미인증 진열 계산
const unverifiedDisplays = displaySummary.totalDisplays - displaySummary.verifiedDisplays;

// 일별 사용량 합계
const totalUsage = dailyUsageData.reduce((sum, d) => sum + d.usage, 0);
const totalPurchases = dailyUsageData.reduce((sum, d) => sum + d.purchases, 0);
```

---

## 6. API 미제공 시 대응 전략

API가 에러를 반환하거나 데이터가 없는 경우:

| 상황 | 대응 |
|------|------|
| API 에러 | 기본값 0 표시, UI 깨짐 방지 |
| 빈 응답 | 기본값 객체 사용 |
| 부분 데이터 | 있는 데이터만 표시, 없는 항목은 "-" 또는 0 |

**기본값 예시:**
```typescript
const defaultStats = {
  totalDisplays: 0,
  activeDisplays: 0,
  verifiedDisplays: 0,
  healthScore: 0,
};
```

---

## 7. 최종 판정

| 영역 | 상태 | 판정 |
|------|------|------|
| 주요 KPI | ✅ | **완전 지원** |
| 샘플 성과 | ⚠️ | **프론트 계산 필요** (API 변경 불필요) |
| 진열 건강도 | ⚠️ | **프론트 계산 필요** (API 변경 불필요) |
| 기간 필터 | ✅ | **완전 지원** |
| 색상 판정 | ✅ | **프론트엔드 구현** |

### 결론

> **API 변경 없이 프론트엔드 구현 가능**
>
> 일부 필드(healthScore, unverifiedDisplays, totalQuantity)는 프론트엔드에서 계산하면 되며,
> 이는 기존 API 응답 데이터로 충분히 계산 가능하다.
>
> **추가 API 개발 불필요**

---

## 8. 관련 문서

- [Seller Dashboard 화면 정의서](./seller-dashboard.screen.md)
- [Design Core KPI 규칙](./design-core-kpi-rules.md)
- [운영 시나리오 정의서](../seller-operation-scenarios.md)

---

*API As-Is 점검 완료 - 프론트엔드 구현 진행 가능*
