# Design Core - KPI 컴포넌트 강제 규칙

> **Work Order**: WO-02-DESIGN-CORE-KPI-RULES
> **Status**: FINAL (운영 표준 강제 적용)
> **Date**: 2025-12-17
> **적용 대상**: Cosmetics Seller Mode (확장 가능)

---

## 1. 문서 목적

이 문서는 **운영 기준으로 확정된 KPI 규칙을 Design Core 레벨에서 강제**한다.

- 개발자가 임의로 색상/행동 규칙을 변경하는 것을 방지
- 운영 표준의 UI 일관성 보장
- **이 규칙을 위반한 구현은 비표준으로 간주**

---

## 2. KPI 색상 규칙 (강제)

### 2.1 허용되는 colorMode 값

```typescript
type KPIColorMode = 'positive' | 'neutral' | 'negative' | 'info';
```

| colorMode | 의미 | 색상 | 행동 유도 |
|-----------|------|------|----------|
| `positive` | 정상/양호 | 🟢 녹색 | 현재 상태 유지 |
| `neutral` | 관찰 필요 | ⚪ 회색 | 모니터링 강화 |
| `negative` | 즉시 조치 | 🔴 적색 | 당일 내 조치 필수 |
| `info` | 정보성 | 🔵 청색 | 판단 불필요 |

### 2.2 금지 사항

- 새로운 colorMode 추가 ❌
- 색상값 직접 지정 ❌ (반드시 colorMode 사용)
- 운영 기준과 다른 색상 매핑 ❌

---

## 3. KPI 임계값 기준 (강제)

### 3.1 전환율 (Conversion Rate)

```typescript
function getConversionRateColorMode(rate: number): KPIColorMode {
  if (rate >= 15) return 'positive';  // 정상
  if (rate >= 10) return 'neutral';   // 주의
  return 'negative';                   // 위험
}
```

| 범위 | colorMode | 운영 행동 |
|------|-----------|----------|
| ≥15% | positive | 유지 |
| 10~15% | neutral | 진열 점검 |
| <10% | negative | 위치/멘트 변경 |

### 3.2 건강 점수 (Health Score)

```typescript
function getHealthScoreColorMode(score: number): KPIColorMode {
  if (score >= 80) return 'positive';  // 정상
  if (score >= 50) return 'neutral';   // 주의
  return 'negative';                    // 위험
}
```

| 범위 | colorMode | 운영 행동 |
|------|-----------|----------|
| ≥80% | positive | 유지 |
| 50~80% | neutral | 미인증 확인 |
| <50% | negative | 즉시 인증 처리 |

### 3.3 재고 부족 (Low Stock Count)

```typescript
function getLowStockColorMode(count: number): KPIColorMode {
  if (count === 0) return 'neutral';   // 정상
  if (count <= 2) return 'neutral';    // 주의 (관찰)
  return 'negative';                    // 위험
}
```

| 범위 | colorMode | 운영 행동 |
|------|-----------|----------|
| 0개 | neutral | 유지 |
| 1~2개 | neutral | 보충 계획 |
| ≥3개 | negative | 즉시 보충 요청 |

### 3.4 미인증 진열 (Unverified Displays)

```typescript
function getUnverifiedDisplayColorMode(count: number): KPIColorMode {
  if (count === 0) return 'neutral';   // 정상
  if (count <= 2) return 'neutral';    // 주의 (관찰)
  return 'negative';                    // 위험
}
```

| 범위 | colorMode | 운영 행동 |
|------|-----------|----------|
| 0개 | neutral | 유지 |
| 1~2개 | neutral | 당일 처리 |
| ≥3개 | negative | 즉시 인증 |

---

## 4. 기간 필터 규칙 (강제)

### 4.1 허용되는 기간 옵션

```typescript
type PeriodType = 'daily' | 'weekly' | 'monthly';

const PERIOD_OPTIONS = [
  { value: 'daily', label: '오늘', days: 1 },
  { value: 'weekly', label: '이번 주', days: 7 },
  { value: 'monthly', label: '이번 달', days: 30 },
] as const;
```

### 4.2 금지 사항

- 새로운 기간 옵션 추가 ❌
- 사용자 정의 기간 선택 ❌
- 기간 레이블 변경 ❌

### 4.3 기간별 용도 (운영 기준)

| 기간 | 용도 |
|------|------|
| 오늘 | 현장 즉시 판단, 당일 문제 발견 |
| 이번 주 | 운영 패턴 확인, 추세 분석 |
| 이번 달 | 제품 유지/교체 판단, 전략적 의사결정 |

---

## 5. AGKPIBlock 컴포넌트 규칙

### 5.1 필수 Props

```typescript
interface AGKPIBlockProps {
  title: string;           // KPI 이름 (필수)
  value: string | number;  // KPI 값 (필수)
  colorMode: KPIColorMode; // 색상 모드 (필수)
  subtitle?: string;       // 보조 정보 (선택)
  loading?: boolean;       // 로딩 상태 (선택)
}
```

### 5.2 사용 규칙

```tsx
// ✅ 올바른 사용
<AGKPIBlock
  title="전환율"
  value={`${conversionRate}%`}
  colorMode={getConversionRateColorMode(conversionRate)}
/>

// ❌ 잘못된 사용 - 직접 색상 지정
<AGKPIBlock
  title="전환율"
  value={`${conversionRate}%`}
  style={{ backgroundColor: 'red' }}  // 금지
/>

// ❌ 잘못된 사용 - 임의 colorMode
<AGKPIBlock
  title="전환율"
  value={`${conversionRate}%`}
  colorMode="warning"  // 존재하지 않는 값
/>
```

---

## 6. 운영 액션 버튼 규칙

### 6.1 노출 조건

**액션 버튼은 `negative` 상태에서만 노출한다.**

```tsx
// ✅ 올바른 구현
{colorMode === 'negative' && (
  <Button onClick={handleAction}>즉시 조치</Button>
)}

// ❌ 잘못된 구현 - 항상 노출
<Button onClick={handleAction}>조치하기</Button>
```

### 6.2 액션 버튼 텍스트 규칙

| 상황 | 버튼 텍스트 |
|------|------------|
| 재고 부족 | "보충 요청" |
| 미인증 진열 | "인증 처리" |
| 전환율 하락 | "진열 점검" |

---

## 7. 구현 검증 체크리스트

개발자는 다음을 확인한다:

- [ ] colorMode는 4가지 값만 사용
- [ ] 임계값 판정 함수 정확히 구현
- [ ] 기간 필터는 3개 옵션만 존재
- [ ] 액션 버튼은 negative 상태에서만 노출
- [ ] 직접 색상/스타일 지정 없음

---

## 8. 위반 시 처리

이 규칙을 위반한 구현은:

1. **코드 리뷰에서 반려**
2. **운영 표준 위반으로 기록**
3. **즉시 수정 요청**

---

## 9. 규칙 변경 절차

이 규칙의 변경은:

1. 별도 Work Order 필요
2. 운영 데이터 기반 근거 필수
3. Design Core 담당자 승인 필요
4. **임의 변경 절대 금지**

---

## 10. 관련 문서

- [운영 시나리오 정의서](../seller-operation-scenarios.md)
- [KPI 빠른 해석 가이드](../seller-kpi-quick-guide.md)
- [Seller Dashboard 화면 정의서](./seller-dashboard.screen.md)
- [Design Core Governance](../../app-guidelines/design-core-governance.md)

---

*이 문서는 Design Core 레벨의 강제 규칙이며, 예외 없이 적용한다.*
