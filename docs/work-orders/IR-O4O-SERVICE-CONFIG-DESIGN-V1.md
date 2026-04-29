# IR-O4O-SERVICE-CONFIG-DESIGN-V1

## 목적

O4O 플랫폼에서 **서비스별 차이를 코드 분기 없이 관리하기 위한 최소 config 구조 정의**

---

## 1. 전제 (확정)

```
UI 구조 → 완전 공통화 (Table / Form / Hub 동일)

차이는 다음만 허용:
- 색상
- 텍스트
- 데이터
```

config는 "구조 제어"가 아니라 **"표현 제어"만 담당**

---

## 2. 절대 하지 않는 것

```
❌ 메뉴 동적 구성
❌ 기능 ON/OFF (v1에서 아님)
❌ 권한 로직 분기
❌ 컴포넌트 교체
```

---

## 3. config가 필요한 실제 지점

| 항목 | KPA | K-Cosmetics | GlycoPharm |
|------|-----|-------------|------------|
| storeLabel | 약국 | 매장 | 약국 (컨텍스트 다름) |
| primaryColor | #2563eb (blue) | #db2777 (pink) | green 계열 |
| homeCTA | 약국 운영 시작하기 | 매장 운영 시작하기 | - |

---

## 4. ServiceConfig v1 구조

```ts
export interface ServiceConfig {
  key: string

  branding: {
    primaryColor: string
  }

  terminology: {
    storeLabel: string     // 매장 / 약국
  }

  uiText: {
    homeCTA: string
  }
}
```

### 예시

```ts
export const kpaConfig: ServiceConfig = {
  key: 'kpa-society',
  branding: { primaryColor: '#2563eb' },
  terminology: { storeLabel: '약국' },
  uiText: { homeCTA: '약국 운영 시작하기' },
}

export const kcosmeticsConfig: ServiceConfig = {
  key: 'k-cosmetics',
  branding: { primaryColor: '#db2777' },
  terminology: { storeLabel: '매장' },
  uiText: { homeCTA: '매장 운영 시작하기' },
}
```

---

## 5. 적용 방식

```tsx
const { terminology } = useServiceConfig()
<h1>{terminology.storeLabel} 관리</h1>
```

**금지:**
```
❌ if (service === 'kpa') ...
❌ 하드코딩 텍스트
```

---

## 6. config 제어 범위 제한

```
Form 구조
Table 구조
Hub 구조
→ config로 제어 금지
```

---

## 7. v1 범위

```
✔ color
✔ terminology
✔ 일부 텍스트
```

**v2 고려 (지금 하지 않음):**
```
menu / feature flag / role
```

---

## 결론

> ServiceConfig = "표현만 제어하는 얇은 레이어"
> 같은 구조를 "다르게 보이게 하는 최소 레이어"

---

## 다음 단계

**IR-O4O-SERVICE-CONFIG-APPLICATION-POINTS-V1**
→ 실제 적용 포인트 먼저 확인 후 WO 작성
