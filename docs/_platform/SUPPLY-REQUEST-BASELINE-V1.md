# WO-O4O-SERVICE-OPERATOR-SUPPLY-REQUEST-BASELINE-V1

## 서비스 운영자 기반 공급요청 흐름 기준선

> **본 문서는 기준선 문서이다. 코드 변경 / API 변경 / DB 마이그레이션은 범위 밖이다.**
> 현재 존재하는 테이블·API·이벤트 구조를 하나의 의미 체계로 고정한다.

---

## 1. 목적

각 서비스 운영자가 **Neture에 접속하지 않고**,
자신의 **서비스 운영자 대시보드**에서 공급 가능 제품을 확인하고
공급자에게 **공급요청을 보낼 수 있는 구조**를
플랫폼 공식 기준선으로 선언한다.

---

## 2. 현재 존재하는 인프라 (Fact Inventory)

| 구성요소 | 상태 | 비고 |
|---------|------|------|
| `neture_supplier_requests` | 존재 | 상태: `pending / approved / rejected` |
| 공급요청 API | 존재 | `POST /api/v1/neture/supplier/requests` |
| 승인/거절 API | 존재 | `/approve`, `/reject` |
| 이벤트 감사 추적 | 존재 | `neture_supplier_request_events` |
| 중복 요청 방지 | 존재 | supplier + requester + product |
| 서비스 운영자 UI | 없음 | 본 기준선 이후 설계 대상 |
| 제품 × 서비스 상태 모델 | 부분적 | `serviceId` 필드 존재 |

---

## 3. 핵심 개념 재정의 (Baseline Fix)

### 3-1. 공급요청(Supply Request)의 의미 확장

기존:
- **판매자(Seller) → 공급자(Supplier)**: "해당 제품을 취급하고 싶다"

확장 후 (공식):
- **요청 주체(Requester)** 는 다음 중 하나가 될 수 있다.
  1. 판매자(Seller)
  2. **서비스 운영자(Service Operator)**

`neture_supplier_requests`는
**"공급자에게 특정 주체가 공급을 요청한 이벤트"**를 의미한다.

---

## 4. 제품 × 서비스 공급 상태 기준선

### 4-1. 상태 정의 (제품 × 서비스 단위)

| 상태 | 정의 |
|------|------|
| 공급 가능 | 공급자가 해당 서비스를 선택했으나, 아직 공급 확정 아님 |
| 요청됨 | 서비스 운영자가 공급요청을 보냄 |
| 공급중 | 공급자가 요청을 승인함 |
| 거절됨 | 공급자가 요청을 거절함 |

> `approved` 상태는 **"공급 승인 = 해당 서비스로의 실제 공급 시작"**을 의미한다.

### 4-2. 상태 전이 규칙

```
공급 가능
   ↓ (서비스 운영자 요청)
요청됨
   ↓ (공급자 승인)       ↓ (공급자 거절)
공급중                  거절됨
```

- `공급중` 상태가 되기 전까지: 서비스 B2B 구매 화면 노출 안 됨
- `공급중` 상태부터: 해당 서비스 구매 가능

---

## 5. 역할별 책임 경계

### 공급자(Supplier)

- 제품 등록
- 제품 단위로 **공급 가능 서비스(복수)** 지정
- 공급요청 승인 / 거절

### 서비스 운영자(Service Operator)

- 자신의 서비스 대시보드에서:
  - 공급 가능 리스트 조회
  - 제품 단위 공급요청 실행
- Neture UI 접근 불필요

### Neture (중앙 허브)

- 공급요청 이벤트 저장
- 상태 관리
- 승인 트래픽 처리
- 감사 로그 보존

### 판매자(Seller)

- 공급요청 주체 아님 (본 구조에서는)
- 서비스 화면에서만 구매

---

## 6. 비범위 선언 (Out of Scope)

- 서비스 운영자 대시보드 UI 구현
- 공급요청 버튼/화면 디자인
- API 파라미터 확장
- 상태 필드 추가/분리
- 권한 모델 변경

---

## 7. 활용 방식

이후 모든 관련 작업은 본 문서를 기준선으로 참조한다.

다음 WO는 반드시 이 문구를 포함:
> "본 작업은 WO-O4O-SERVICE-OPERATOR-SUPPLY-REQUEST-BASELINE-V1 기준을 따른다."

---

## 8. 다음 단계 (참고)

- **WO-O4O-SERVICE-OPERATOR-SUPPLY-DASHBOARD-UI-V1** (운영자 대시보드 UI 설계)
- **WO-O4O-SUPPLIER-SUPPLY-APPROVAL-UX-V1** (공급자 승인 UX 최소 설계)

---

*Created: 2026-02-01*
*Status: Completed (Baseline Fixed)*
