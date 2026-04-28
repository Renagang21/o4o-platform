# DOC-O4O-EVENT-OFFER-STORE-INTEGRATION-V1

> Event Offer → Store 통합 설계 기준
>
> Status: Active
> Version: 1.0
> Created: 2026-04-28
> 선행 문서: `docs/baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md`

---

## 1. 목적

Event Offer 기능을
독립 기능이 아니라
"매장(Store) 중심 운영 흐름"에 통합한다.

---

## 2. O4O 기준 핵심 원칙

O4O는 기능 중심이 아니라 매장 중심이다.

따라서:
- Event Offer → 별도 메뉴 ❌
- Event Offer → 매장 상품 흐름 내부 ✔

---

## 3. 전체 구조

### 3.1 공급자 측

```
[Supplier]
Products
  ├─ 일반 상품
  ├─ Event Offer (탭)
```

Event Offer는 "상품의 확장 상태"로 취급. 별도 기능이 아니라 상품 기반 기능.

### 3.2 운영자 측

```
[Operator]
Products 관리
  ├─ 일반 상품 승인
  ├─ Event Offer 승인 (조건 기반)
```

### 3.3 매장 경영자 (핵심)

```
[Store HUB]

내 매장 상품 관리
  ├─ 일반 공급 상품
  ├─ Event Offer 상품 (탭)
```

---

## 4. 매장 흐름 (핵심 UX)

### 4.1 기존 구조 (문제)

```
/groupbuy 페이지 → 참여
```

문제: 상품 흐름과 분리됨, O4O 철학 위배

### 4.2 변경 구조 (목표)

```
[내 매장 → 상품 관리]

탭 구조:
[공급 상품] | [Event Offer]
```

### 4.3 Event Offer 탭 표시 내용

- 진행 중 이벤트
- 가격
- 남은 수량
- 참여 버튼

### 4.4 참여 후

Event Offer → 내 매장 상품으로 편입

즉: **Event Offer = "특가 공급 상품 진입 경로"**

---

## 5. 핵심 개념 변화

| 항목 | 기존 개념 | O4O 개념 |
|------|---------|---------|
| Event Offer | 참여형 이벤트 | 상품 확보 기회 |
| 참여 결과 | 주문 완료 | 내 매장 상품 등록 |
| UI 위치 | 별도 페이지 | Store 내부 탭 |
| 구조 | 독립 기능 | Store 통합 |

---

## 6. 데이터 흐름

### Before
```
Event Offer → 참여 → 주문
```

### After
```
Event Offer
→ 참여 (구매)
→ 내 매장 상품 등록
→ 매장 판매
```

---

## 7. API 흐름

### 기존 (유지)
```
GET  /api/v1/kpa/groupbuy
POST /api/v1/kpa/groupbuy/:id/participate
```

### 내부 구조 목표
```
GET  /store/products?type=event-offer
POST /store/products/from-event-offer
```

기존 API는 유지, 내부 연결만 변경

---

## 8. UI 구조

### Store Products Page
```
Tabs: [전체] [공급 상품] [Event Offer]
```

### Event Offer 카드
```
- 상품명
- 이벤트 가격
- 남은 수량 / 기간
- 상태 배지: "진행중"(green) / "곧 시작"(amber)
- [내 매장에 추가] 버튼
```

---

## 9. 역할별 책임

| 역할 | 책임 |
|------|------|
| 공급자 | 상품 기반 Event Offer 생성 |
| 운영자 | 노출 승인 |
| 매장 | 상품 확보 (Event Offer 활용) |

---

## 10. 중요 정책

- **노출 기준**: Event Offer 탭 → `active` 상태만 노출
- **참여 결과**: 참여 = 내 매장 상품 생성 (Phase 2)
- **수정 정책**: 수정 없음, 재참여 또는 신규 생성

---

## 11. 금지 사항

- Event Offer 전용 메뉴 유지 ❌
- /groupbuy 중심 UX 유지 ❌
- 이벤트를 별도 서비스처럼 분리 ❌
- 상품 흐름과 분리된 참여 구조 ❌

---

## 12. 단계적 적용 전략

### Phase 1 (WO-O4O-EVENT-OFFER-STORE-INTEGRATION-V1)
- Store 상품 페이지에 Event Offer 탭 추가
- 기존 groupbuy API 연결
- 참여 흐름 Store 내부에서 완료

### Phase 2
- 참여 시 자동 매장 상품 등록 연결

### Phase 3
- 공급자 Products 탭과 연결

---

## 한 줄 결론

**Event Offer는 이벤트가 아니라 "매장 상품 확보 채널"이다**
