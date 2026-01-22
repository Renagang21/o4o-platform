# @o4o/corner-display-extension

매장 코너별 디스플레이 관리 Extension

## Phase 2 핵심 원칙

> **"태블릿은 코너의 일부(확장된 POP)이며, 화면 전환 주체가 아니다."**

### 구조

```
CornerDisplay 1 : N Device (단방향 귀속)

[Corner: premium_zone]
   ├─ Tablet A → CornerDisplay: premium
   ├─ Tablet B → CornerDisplay: premium
   └─ Tablet C → CornerDisplay: premium
```

- 태블릿 A/B/C는 **같은 코너, 같은 화면, 같은 컨텍스트**
- 물리적으로 여러 대가 있을 뿐
- 소비자는 "이 코너의 태블릿"으로 인식

### 금지 개념

- ❌ 디바이스 간 전환
- ❌ 우선순위/순서 필드
- ❌ 다중 코너 매핑
- ❌ 화면 선택 UI

## 엔티티

### CornerDisplay

"이 코너에서 항상 동일하게 보여질 화면 정의"

```typescript
{
  id: string;
  sellerId: string;
  cornerKey: string;       // 예: 'premium_zone'
  name: string;            // 표시 이름
  displayType: 'grid' | 'list' | 'featured' | 'carousel';
  status: 'active' | 'inactive' | 'draft';
  listingFilter?: object;  // Phase 1 Listing 필터
  layoutConfig?: object;   // 레이아웃 설정
}
```

### CornerDisplayDevice

"이 디바이스는 어떤 코너의 확장인가"

```typescript
{
  id: string;
  cornerDisplayId: string;  // 귀속된 코너
  deviceId: string;         // 고유 식별자 (UNIQUE)
  deviceType: 'tablet' | 'kiosk' | 'signage' | ...;
  isPrimary: boolean;       // 코너의 주 디바이스
}
```

## API 엔드포인트

```
GET /corner-displays           - 목록 조회
GET /corner-displays/:id       - 단건 조회
GET /corner-displays/by-device/:deviceId - 디바이스로 코너 조회
```

### 핵심 엔드포인트: by-device

```bash
GET /corner-displays/by-device/tablet_001
```

태블릿이 자신이 속한 코너를 알아내는 방법.
전환/선택 없이 **단일 결과 반환**.

## UI 컴포넌트

### CornerDisplayHost

디바이스 → 코너 화면 호스트

```tsx
<CornerDisplayHost
  deviceId="tablet_001"
  renderCornerDisplay={(context) => (
    <CornerDisplay
      products={products}
      layout={context.corner.layoutConfig}
      deviceType={context.device.deviceType}
    />
  )}
/>
```

## Phase 1 연동

- 제품은 직접 소유하지 않음
- `listingFilter`로 Phase 1 Listing API 호출
- `channelSpecificData.display.corner` 값과 매칭

```typescript
// listingFilter 예시
{
  corner: 'premium_zone',
  visibility: 'visible',
  deviceType: 'tablet'
}
```

## 설계 이유

1. **매장 현실**: 태블릿은 위치 고정형
2. **소비자 인지**: "이 태블릿은 이 코너 설명용"
3. **직원 운영**: "이 코너는 여기 태블릿 보세요"
4. **AI 컨텍스트**: 항상 어떤 코너/제품군인지 명확

---

*Phase 2 WO-6 구현 (구조 고정용)*
