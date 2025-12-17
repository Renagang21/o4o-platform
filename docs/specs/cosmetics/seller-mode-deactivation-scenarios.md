# Seller Mode - 비활성화 테스트 시나리오 정의서

> **Work Order**: WO-04-SELLER-MODE-DEACTIVATION-SCENARIOS
> **Status**: FINAL
> **Date**: 2025-12-17
> **목적**: 앱 비활성화 시 Seller Dashboard 영향 분석

---

## 1. 문서 목적

일부 앱 비활성화 상태에서도 **Seller Mode 운영 화면이 깨지지 않는지** 확인하고,
**"운영 불가" vs "기능 제한"** 기준을 명확화한다.

---

## 2. Cosmetics 서비스 앱 구조

### 2.1 핵심 앱 (Core/Extension)

```
dropshipping-core (Core)
    └── dropshipping-cosmetics (Extension)
            ├── cosmetics-seller-extension (Extension) ← Seller Dashboard
            ├── cosmetics-sample-display-extension (Extension) ← Sample/Display
            ├── cosmetics-partner-extension (Extension)
            ├── cosmetics-supplier-extension (Extension)
            └── groupbuy-cosmetics (Extension)
```

### 2.2 의존성 관계

| 앱 | 의존 대상 | 의존성 유형 |
|----|----------|------------|
| cosmetics-seller-extension | dropshipping-cosmetics | 필수 |
| cosmetics-seller-extension | cosmetics-sample-display-extension | 데이터 연동 |
| cosmetics-sample-display-extension | dropshipping-cosmetics | 필수 |
| groupbuy-cosmetics | dropshipping-cosmetics | 필수 |

---

## 3. 비활성화 시나리오

### 시나리오 1: cosmetics-sample-display-extension 비활성화

**상황**: 샘플/진열 관리 기능을 일시 중단

**영향 분석**:

| 영역 | 영향 | 판정 |
|------|------|------|
| 주요 KPI 섹션 | 영향 없음 | ✅ 운영 가능 |
| 샘플 성과 섹션 | 데이터 조회 불가 | ⚠️ 기능 제한 |
| 진열 건강도 섹션 | 데이터 조회 불가 | ⚠️ 기능 제한 |
| 진열 현황 섹션 | 영향 없음 (seller-extension 자체 데이터) | ✅ 운영 가능 |
| 최근 상담 섹션 | 영향 없음 | ✅ 운영 가능 |

**판정**: ⚠️ **기능 제한 (운영 가능)**

**대응**:
- 샘플 성과 섹션: "데이터 없음" 표시
- 진열 건강도 섹션: "데이터 없음" 표시
- 에러 메시지 노출 ❌ (사용자 혼란 방지)

**프론트엔드 처리 코드**:
```tsx
// API 실패 시 기본값 사용
const sampleStats = apiResponse?.data || {
  totalQuantity: 0,
  totalItems: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
};

// 또는 섹션 전체 숨김
{sampleApiAvailable && (
  <AGSection title="샘플 성과">...</AGSection>
)}
```

---

### 시나리오 2: groupbuy-cosmetics 비활성화

**상황**: 공동구매 기능을 일시 중단

**영향 분석**:

| 영역 | 영향 | 판정 |
|------|------|------|
| 주요 KPI 섹션 | 영향 없음 | ✅ 운영 가능 |
| 샘플 성과 섹션 | 영향 없음 | ✅ 운영 가능 |
| 진열 건강도 섹션 | 영향 없음 | ✅ 운영 가능 |
| 공동구매 관련 | 해당 기능 없음 (Seller Dashboard 범위 외) | - |

**판정**: ✅ **영향 없음 (완전 운영 가능)**

---

### 시나리오 3: cosmetics-supplier-extension 비활성화

**상황**: 공급사 관리 기능을 일시 중단

**영향 분석**:

| 영역 | 영향 | 판정 |
|------|------|------|
| 주요 KPI 섹션 | 영향 없음 | ✅ 운영 가능 |
| 샘플 성과 섹션 | 영향 없음 | ✅ 운영 가능 |
| 진열 건강도 섹션 | 영향 없음 | ✅ 운영 가능 |
| 샘플 입고 (supplier 체크) | 입고 시 정책 체크 불가 | ⚠️ 기능 제한 |

**판정**: ⚠️ **기능 제한 (운영 가능)**

**대응**:
- 샘플 입고 시 supplier 체크 스킵 가능하도록 처리
- Dashboard 조회에는 영향 없음

---

### 시나리오 4: cosmetics-partner-extension 비활성화

**상황**: 파트너 관리 기능을 일시 중단

**영향 분석**:

| 영역 | 영향 | 판정 |
|------|------|------|
| Seller Dashboard 전체 | 영향 없음 | ✅ 운영 가능 |

**판정**: ✅ **영향 없음 (완전 운영 가능)**

---

### 시나리오 5: dropshipping-cosmetics 비활성화

**상황**: Cosmetics 서비스 전체 중단

**영향 분석**:

| 영역 | 영향 | 판정 |
|------|------|------|
| cosmetics-seller-extension | 비활성화됨 | ❌ 운영 불가 |
| Seller Dashboard | 접근 불가 | ❌ 운영 불가 |

**판정**: ❌ **운영 불가**

**대응**:
- Seller Dashboard 메뉴 자동 숨김
- 접근 시 "서비스 준비 중" 안내

---

## 4. 판정 기준 정리

### 4.1 운영 상태 분류

| 상태 | 정의 | 대응 |
|------|------|------|
| ✅ **완전 운영 가능** | 모든 기능 정상 | 변경 없음 |
| ⚠️ **기능 제한** | 일부 데이터/기능 불가 | 해당 섹션 숨김 또는 "데이터 없음" |
| ❌ **운영 불가** | 핵심 기능 불가 | 화면 접근 차단 |

### 4.2 앱별 최종 판정

| 비활성화 앱 | Seller Dashboard 판정 |
|------------|----------------------|
| cosmetics-sample-display-extension | ⚠️ 기능 제한 |
| groupbuy-cosmetics | ✅ 영향 없음 |
| cosmetics-supplier-extension | ⚠️ 기능 제한 |
| cosmetics-partner-extension | ✅ 영향 없음 |
| dropshipping-cosmetics | ❌ 운영 불가 |

---

## 5. 프론트엔드 대응 가이드

### 5.1 API 실패 시 처리

```tsx
// 권장: try-catch + 기본값
const fetchExtendedKPIData = async () => {
  try {
    const [inventoryRes, usageRes, displayRes] = await Promise.all([
      fetch(`${sampleApiBaseUrl}/inventory/${storeId}/stats`).catch(() => null),
      fetch(`${sampleApiBaseUrl}/usage/${storeId}/daily`).catch(() => null),
      fetch(`${sampleApiBaseUrl}/display/${storeId}/summary`).catch(() => null),
    ]);

    // 각 응답 개별 처리 - 하나 실패해도 나머지는 표시
    if (inventoryRes?.ok) {
      setSampleInventoryStats(await inventoryRes.json());
    }
    // ...
  } catch (error) {
    console.warn('Extended KPI fetch error:', error);
    // 전체 실패 시에도 UI 깨짐 방지
  }
};
```

### 5.2 섹션별 조건부 렌더링

```tsx
// 데이터 없으면 섹션 숨김 (선택적)
{sampleInventoryStats && (
  <AGSection title="샘플 성과">
    ...
  </AGSection>
)}

// 또는 "데이터 없음" 표시 (권장)
<AGSection title="샘플 성과">
  {sampleInventoryStats ? (
    <AGKPIGrid>...</AGKPIGrid>
  ) : (
    <EmptyState message="샘플 데이터를 불러올 수 없습니다" />
  )}
</AGSection>
```

---

## 6. 테스트 체크리스트

비활성화 테스트 시 확인 항목:

### 6.1 cosmetics-sample-display-extension 비활성화

- [ ] Seller Dashboard 접근 가능
- [ ] 주요 KPI 섹션 정상 표시
- [ ] 샘플 성과 섹션: "데이터 없음" 또는 숨김
- [ ] 진열 건강도 섹션: "데이터 없음" 또는 숨김
- [ ] 에러 팝업/토스트 없음
- [ ] 콘솔 에러 없음 (경고만 허용)

### 6.2 dropshipping-cosmetics 비활성화

- [ ] Seller Dashboard 메뉴 숨김
- [ ] 직접 URL 접근 시 리다이렉트 또는 안내
- [ ] 다른 서비스 영향 없음

---

## 7. 운영 권고사항

### 7.1 비활성화 전 고려

| 앱 | 비활성화 전 확인 |
|----|-----------------|
| cosmetics-sample-display-extension | 진행 중인 샘플 입고/사용 기록 완료 여부 |
| cosmetics-supplier-extension | 승인 대기 중인 공급사 처리 |
| groupbuy-cosmetics | 진행 중인 공동구매 캠페인 종료 여부 |

### 7.2 비활성화 시 운영자 안내

```
[안내] 샘플/진열 관리 기능이 일시 중단되었습니다.
- 주요 KPI(상담, 전환율)는 정상 확인 가능합니다.
- 샘플 성과 및 진열 건강도는 표시되지 않습니다.
- 문의: 관리자에게 연락
```

---

## 8. 관련 문서

- [Seller Dashboard 화면 정의서](./frontend/seller-dashboard.screen.md)
- [API As-Is 점검](./frontend/seller-dashboard-api-audit.md)
- [운영 시나리오 정의서](./seller-operation-scenarios.md)

---

*비활성화 테스트 시나리오 정의 완료*
