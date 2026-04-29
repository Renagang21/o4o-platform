# IR-O4O-SERVICE-CONFIG-EXPANSION-POINTS-V1

## 목적

service.config v1 적용 이후, **다음으로 확장해도 안전한 UI 지점 식별**

---

## 1. 결론

```
"Store 흐름 + Home 진입 영역"까지만 확장 가능. 그 외 보류.
```

---

## 2. 판단 기준

1. 서비스별 텍스트 차이가 반복되는가
2. UI 구조가 완전히 동일한가
3. 도메인 로직이 섞이지 않았는가

→ 3개 모두 만족 시 확장 대상

---

## 3. 확장 가능 영역

### 3.1 StoreHomePage (최우선)

```
services/web-*/src/pages/*/StoreHomePage.tsx
```

- "내 약국 홈 / 내 매장 홈" 차이
- subtitle 문구 차이
- StoreHub와 동일 흐름
- 적용 대상: Page title, Subtitle, CTA 문구

### 3.2 AppEntrySection

- "매장 HUB / 약국 HUB" 반복
- 카드 구조 동일, label만 다름
- 적용 대상: 카드 title, 카드 description 일부

### 3.3 O4OHelpSection

- "매장 등록 / 약국 등록", "매장 운영 / 약국 운영"
- 완전히 동일 구조
- 적용 대상: usage 텍스트, step 설명

---

## 4. 보류 영역

```
❌ Operator 영역
❌ B2B 영역
❌ Table column label
❌ Form field label
❌ Signage 내부 텍스트
```

이유: 도메인 의미가 강하거나 구조가 동일하지 않음

---

## 5. 확장 순서

1. StoreHomePage
2. AppEntrySection
3. O4OHelpSection

→ 1개 영역씩 적용 후 검증 (일괄 적용 금지)

---

## 6. Phase 상태

```
Phase 1: 핵심 텍스트 치환 → 완료
Phase 2: Store 흐름 확장 → 지금 단계 (StoreHomePage)
Phase 3: Home 영역 확장 → 다음 단계
```

---

## 다음 작업

**WO-O4O-SERVICE-CONFIG-EXPANSION-STOREHOME-V1**
→ StoreHomePage 3개 서비스만 적용
