# Dropshipping State Model Architecture (DS-4.3)

> **이 문서는 Dropshipping의 모든 상태 모델에 대한 단일 진실 원본(Single Source of Truth)이다.**
> 모든 상태 전이는 이 문서에 정의된 규칙만 따른다.
> 정의되지 않은 상태 전이는 버그로 간주된다.

**Version:** 1.0.0
**Status:** Active
**Authority:** DS-1 (Dropshipping Domain Rules)
**Last Updated:** 2025-12-31

---

## 1. 상태 모델 설계 원칙

### 1.1 명시적 상태 전이만 허용

상태 변경은 **명시적으로 정의된 전이만** 허용된다.

| 원칙 | 설명 |
|------|------|
| **화이트리스트** | 허용된 전이만 가능 (블랙리스트 아님) |
| **암묵적 변경 금지** | 부수 효과로 상태 변경 불가 |
| **직접 전이만** | A→B 허용 시 A→C→B 우회 불가 |
| **트리거 명시** | 누가/무엇이 전이를 발생시키는지 정의 |

### 1.2 터미널 상태

터미널 상태는 **더 이상 전이가 불가능**한 최종 상태이다.

| 특성 | 설명 |
|------|------|
| **탈출 불가** | 터미널 상태에서 다른 상태로 전이 금지 |
| **불변** | 핵심 데이터 변경 금지 |
| **영구 보존** | 삭제 불가, 감사 목적 유지 |

### 1.3 상태 간 제약

서로 다른 엔티티의 상태 간에는 **제약 조건**이 존재한다.

```
OrderRelay 상태 ← 제약 → Settlement 상태
```

---

## 2. OrderRelay 상태 모델

### 2.1 상태 정의

OrderRelay는 다음 상태를 가진다.

| 상태 | 코드 | 설명 |
|------|------|------|
| **PENDING** | `pending` | 주문 접수됨, 공급자 전달 전 |
| **RELAYED** | `relayed` | 공급자에게 전달 완료 |
| **CONFIRMED** | `confirmed` | 공급자가 주문 확인 |
| **SHIPPED** | `shipped` | 출고/배송 시작 |
| **DELIVERED** | `delivered` | 배송 완료 |
| **CANCELLED** | `cancelled` | 주문 취소 (터미널) |
| **REFUNDED** | `refunded` | 환불 완료 (터미널) |

### 2.2 허용된 상태 전이

다음 전이만 허용된다.

```
pending ──────────────────────────────→ cancelled
    │
    ↓
relayed ──────────────────────────────→ cancelled
    │
    ↓
confirmed ────────────────────────────→ cancelled
    │
    ↓
shipped
    │
    ↓
delivered ────────────────────────────→ refunded
```

| From | To | 트리거 | 트리거 주체 |
|------|-----|--------|------------|
| pending | relayed | 공급자 전달 완료 | System/Admin |
| pending | cancelled | 취소 요청 | Admin/Seller |
| relayed | confirmed | 공급자 확인 | Supplier/Admin |
| relayed | cancelled | 공급자 거부/취소 | Supplier/Admin |
| confirmed | shipped | 출고 처리 | Supplier/Admin |
| confirmed | cancelled | 이행 불가 취소 | Admin |
| shipped | delivered | 배송 완료 확인 | System/Admin |
| delivered | refunded | 환불 처리 완료 | Admin |

### 2.3 금지된 상태 전이

다음 전이는 **명시적으로 금지**된다.

| From | To | 금지 이유 |
|------|-----|----------|
| cancelled | (any) | 터미널 상태 |
| refunded | (any) | 터미널 상태 |
| shipped | cancelled | 배송 시작 후 취소 불가 (환불만 가능) |
| delivered | cancelled | 배송 완료 후 취소 불가 (환불만 가능) |
| confirmed | pending | 역방향 전이 금지 |
| shipped | confirmed | 역방향 전이 금지 |
| (any) | pending | pending은 초기 상태만 |

### 2.4 상태별 불변 필드

각 상태에서 특정 필드는 **변경 불가**가 된다.

| 상태 | 불변이 되는 필드 |
|------|----------------|
| relayed | listingId |
| confirmed | listingId, quantity, unitPrice, totalPrice, ecommerceOrderId |
| shipped | 위 + shippingInfo.carrier, shippingInfo.trackingNumber |
| delivered | 모든 핵심 필드 |
| cancelled | 모든 필드 (metadata 제외) |
| refunded | 모든 필드 (metadata 제외) |

---

## 3. SettlementBatch 상태 모델

### 3.1 상태 정의

SettlementBatch는 다음 상태를 가진다.

| 상태 | 코드 | 설명 |
|------|------|------|
| **OPEN** | `open` | 진행 중, 거래 추가 가능 |
| **CLOSED** | `closed` | 마감됨, 거래 추가 불가, 정산 대기 |
| **PROCESSING** | `processing` | 지급 처리 중 |
| **PAID** | `paid` | 지급 완료 (터미널) |
| **FAILED** | `failed` | 지급 실패 |

### 3.2 허용된 상태 전이

다음 전이만 허용된다.

```
open
    │
    ↓
closed
    │
    ↓
processing ←──────────────── failed
    │                           ↑
    ↓                           │
paid ─────────────────────────(재시도)
```

| From | To | 트리거 | 트리거 주체 |
|------|-----|--------|------------|
| open | closed | 정산 기간 종료/수동 마감 | System/Admin |
| closed | processing | 지급 처리 시작 | Finance/Admin |
| processing | paid | 지급 완료 확인 | Finance/System |
| processing | failed | 지급 실패 | Finance/System |
| failed | processing | 재시도 | Admin |

### 3.3 금지된 상태 전이

| From | To | 금지 이유 |
|------|-----|----------|
| paid | (any) | 터미널 상태 |
| closed | open | 마감 후 재오픈 불가 |
| processing | open | 처리 중 재오픈 불가 |
| processing | closed | 역방향 전이 금지 |

### 3.4 상태별 제약

| 상태 | 제약 사항 |
|------|----------|
| open | 거래 추가/제거 가능, 금액 재계산 가능 |
| closed | 거래 추가/제거 불가, 금액 변경 불가 |
| processing | 모든 데이터 불변 |
| paid | 모든 데이터 불변, 영구 보존 |
| failed | 금액 불변, 메타데이터에 실패 사유 기록 |

---

## 4. CommissionTransaction 상태 모델

### 4.1 상태 정의

CommissionTransaction은 암묵적 상태를 가진다 (명시적 상태 필드 없음).

| 상태 | 결정 기준 | 설명 |
|------|----------|------|
| **PROVISIONAL** | settlementBatchId = NULL | 임시 계산, 배치 미할당 |
| **BATCHED** | settlementBatchId != NULL, batch.status = OPEN | 배치에 할당됨, 수정 가능 |
| **FINALIZED** | batch.status >= CLOSED | 확정됨, 수정 불가 |

### 4.2 상태 결정 로직

CommissionTransaction의 상태는 연결된 SettlementBatch 상태에 의해 결정된다.

```
CommissionTransaction.settlementBatchId가 NULL
    → PROVISIONAL

CommissionTransaction.settlementBatch.status = OPEN
    → BATCHED

CommissionTransaction.settlementBatch.status in [CLOSED, PROCESSING, PAID, FAILED]
    → FINALIZED
```

### 4.3 상태별 허용 작업

| 상태 | 수정 | 삭제 | 배치 변경 |
|------|------|------|----------|
| PROVISIONAL | ✅ | ✅ | ✅ (할당 가능) |
| BATCHED | ✅ | ✅ | ✅ (재할당 가능) |
| FINALIZED | ❌ | ❌ | ❌ |

---

## 5. 교차 상태 제약 (Cross-State Constraints)

### 5.1 OrderRelay ↔ Settlement 제약

OrderRelay와 Settlement 간에는 다음 제약이 존재한다.

| 제약 | 설명 |
|------|------|
| **정산 조건** | OrderRelay.status = delivered 이후에만 정산 확정 가능 |
| **취소 시 정산** | OrderRelay.status = cancelled → 해당 CommissionTransaction 무효화 |
| **환불 시 정산** | OrderRelay.status = refunded → 역정산 거래 생성 |

### 5.2 SettlementBatch 진행 조건

SettlementBatch가 특정 상태로 전이하려면 조건을 만족해야 한다.

| 전이 | 조건 |
|------|------|
| open → closed | 정산 기간 종료 또는 수동 마감 요청 |
| closed → processing | 모든 거래의 원본 OrderRelay가 delivered/cancelled/refunded |
| processing → paid | 외부 지급 시스템에서 완료 확인 |

### 5.3 불완전 이행과 정산

OrderRelay가 터미널 상태에 도달하지 않으면 정산이 **블로킹**된다.

```
SettlementBatch에 포함된 OrderRelay 중
shipped 상태인 주문이 있으면
→ closed → processing 전이 불가
→ 해당 주문이 delivered/cancelled/refunded 될 때까지 대기
```

---

## 6. 상태 전이 규칙

### 6.1 전이 트리거 주체

각 상태 전이는 특정 주체만 트리거할 수 있다.

| 주체 | 허용 전이 |
|------|----------|
| **System** | 자동화된 상태 변경 (배송 완료 알림, 정산 주기 마감) |
| **Admin** | 모든 전이 (권한 내) |
| **Seller** | pending → cancelled (자기 주문만) |
| **Supplier** | relayed → confirmed, confirmed → shipped |
| **Finance** | closed → processing, processing → paid/failed |

### 6.2 전이 시 필수 기록

모든 상태 전이는 다음을 **반드시 기록**해야 한다.

| 기록 항목 | 설명 |
|-----------|------|
| 이전 상태 | 전이 전 상태 |
| 새 상태 | 전이 후 상태 |
| 전이 시각 | UTC 타임스탬프 |
| 트리거 주체 | 누가/무엇이 전이를 트리거했는지 |
| 사유 | 전이 사유 (취소/환불 시 필수) |

### 6.3 전이 실패 처리

상태 전이가 실패한 경우:

| 실패 유형 | 처리 |
|-----------|------|
| 금지된 전이 시도 | 예외 발생, 상태 유지 |
| 조건 미충족 | 예외 발생, 상태 유지, 사유 반환 |
| 시스템 오류 | 로그 기록, 상태 유지, 알림 |

**상태가 중간 상태로 남는 것은 금지**된다.
전이는 성공하거나 완전히 실패해야 한다 (원자성).

---

## 7. 암묵적 상태 변경 금지

### 7.1 금지되는 암묵적 변경

다음과 같은 암묵적 상태 변경은 **금지**된다.

| 금지 패턴 | 설명 |
|-----------|------|
| **부수 효과 전이** | 다른 작업 중 상태가 변경됨 |
| **배치 작업 전이** | 대량 업데이트 중 검증 없이 변경 |
| **타이머 전이** | 시간 경과만으로 자동 변경 (명시적 Job 없이) |
| **조건부 자동 전이** | "조건 만족 시 자동으로" |

### 7.2 올바른 상태 변경 패턴

| 올바른 패턴 | 설명 |
|------------|------|
| **명시적 API 호출** | `updateStatus(orderId, newStatus)` |
| **명시적 Job 실행** | `SettlementClosingJob.execute()` |
| **이벤트 기반 전이** | 외부 이벤트 수신 → 명시적 전이 호출 |
| **Admin 수동 전이** | 관리자가 UI에서 명시적으로 변경 |

### 7.3 "자동"의 올바른 의미

"자동 상태 변경"이라 하더라도 다음을 충족해야 한다.

| 요건 | 설명 |
|------|------|
| 명시적 트리거 | 스케줄러 Job, 웹훅, 이벤트 핸들러 |
| 검증 로직 | 전이 전 조건 확인 |
| 로깅 | 전이 기록 |
| 실패 처리 | 실패 시 상태 유지 |

---

## 8. 상태 모델 확장 규칙

### 8.1 새 상태 추가

새로운 상태 추가 시 다음 절차를 따른다.

| 단계 | 요건 |
|------|------|
| 1 | 이 문서(DS-4.3) 업데이트 |
| 2 | 허용된 전이 정의 |
| 3 | 트리거 주체 정의 |
| 4 | 불변 필드 정의 |
| 5 | 교차 제약 검토 |
| 6 | 아키텍처 승인 |

### 8.2 상태 삭제 금지

기존 상태는 **삭제할 수 없다**.

| 이유 | 설명 |
|------|------|
| 하위 호환성 | 기존 데이터가 해당 상태를 가질 수 있음 |
| API 계약 | 외부 시스템이 해당 상태를 참조할 수 있음 |
| 감사 로그 | 과거 전이 기록이 해당 상태를 참조 |

대신 **DEPRECATED** 마킹 후 새 상태로 마이그레이션한다.

### 8.3 상태 이름 변경 금지

상태 코드(enum value)는 **변경할 수 없다**.

```
❌ pending → waiting (코드 변경)
✅ pending 유지, 표시 레이블만 변경
```

---

## 9. 상태 모델 요약

### 9.1 OrderRelay 상태 다이어그램 (텍스트)

```
[pending]
    │
    ├──→ [relayed] ──→ [confirmed] ──→ [shipped] ──→ [delivered] ──→ [refunded]*
    │         │              │                              │
    └────────┴──────────────┴──────→ [cancelled]*

* = 터미널 상태
```

### 9.2 SettlementBatch 상태 다이어그램 (텍스트)

```
[open] ──→ [closed] ──→ [processing] ──→ [paid]*
                              │
                              ↓
                          [failed] ─→ (재시도) ─→ [processing]

* = 터미널 상태
```

### 9.3 터미널 상태 목록

| 엔티티 | 터미널 상태 |
|--------|------------|
| OrderRelay | cancelled, refunded |
| SettlementBatch | paid |

---

## 10. 준수 체크리스트

상태 관련 구현 시 다음을 **반드시 확인**한다.

| 항목 | 확인 |
|------|------|
| 허용된 전이만 구현되어 있는가? | ☐ |
| 터미널 상태에서 전이가 불가능한가? | ☐ |
| 전이 시 감사 로그가 기록되는가? | ☐ |
| 트리거 주체가 검증되는가? | ☐ |
| 불변 필드가 보호되는가? | ☐ |
| 암묵적 상태 변경이 없는가? | ☐ |
| 교차 상태 제약이 준수되는가? | ☐ |
| 전이 실패 시 상태가 유지되는가? | ☐ |

---

*Document Version: 1.0.0*
*Phase: DS-4 Architecture*
*Authority: DS-1 (Dropshipping Domain Rules)*
*Status: Awaiting Approval*
