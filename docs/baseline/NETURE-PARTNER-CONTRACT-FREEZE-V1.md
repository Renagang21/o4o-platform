# Neture Partner Contract Freeze v1.0

> **WO-NETURE-SELLER-PARTNER-CONTRACT-V1 + ATOMICITY-PATCH-V1 완료 후 기준선 고정**
> **Freeze Date: 2026-02-24**

---

## 1. Freeze 범위

### 1-1. 계약 테이블

**`neture_seller_partner_contracts`**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| seller_id | varchar | 판매자 |
| partner_id | varchar | 파트너 |
| recruitment_id | uuid | 모집 참조 |
| application_id | uuid | 신청 참조 |
| commission_rate | decimal(5,2) | 수수료 스냅샷 |
| contract_status | enum | active / terminated / expired |
| started_at | timestamp | 계약 시작 |
| expires_at | timestamp? | 만료 예정 |
| ended_at | timestamp? | 실제 종료 |
| terminated_by | enum? | seller / partner |
| created_at | timestamp | |
| updated_at | timestamp | |

### 1-2. 제약 조건

| 제약 | 정의 |
|------|------|
| Partial Unique | `(seller_id, partner_id) WHERE contract_status = 'active'` |
| FK | 없음 (기존 Neture 패턴 — 독립 유지) |

### 1-3. ENUM 타입

- `neture_contract_status_enum`: active, terminated, expired
- `neture_contract_terminated_by_enum`: seller, partner

---

## 2. 상태 체계

### Application 상태

```
pending → approved | rejected
```

### Contract 상태

```
active → terminated  (seller 또는 partner 해지)
active → expired     (기한 만료 — 자동화 미구현, 필드만 존재)
terminated → (전이 불가)
expired → (전이 불가)
```

### 승인 → 계약 흐름

```
Application(pending) → approve → Transaction {
  1. Active 계약 중복 체크
  2. Application → APPROVED
  3. Contract 생성 (commission_rate snapshot)
  4. Dashboard 자동 등록
}
```

실패 시 전체 rollback. 고아 APPROVED 상태 불가.

---

## 3. API 엔드포인트

| Method | Path | Auth | 용도 |
|--------|------|------|------|
| GET | `/seller/contracts` | requireAuth | Seller 계약 목록 |
| POST | `/seller/contracts/:id/terminate` | requireAuth | Seller 해지 |
| POST | `/seller/contracts/:id/commission` | requireAuth | 수수료 변경 |
| GET | `/partner/contracts` | requireAuth | Partner 계약 목록 |
| POST | `/partner/contracts/:id/terminate` | requireAuth | Partner 해지 |

**Query**: `?status=active|terminated|expired`

---

## 4. 수수료 불변 원칙

- commission_rate는 계약 생성 시 Recruitment에서 스냅샷
- 변경 시: 기존 계약 terminated → 신규 계약 생성 (새 rate)
- 기존 계약의 commission_rate는 절대 수정되지 않음

---

## 5. 정산 상태

| 항목 | 상태 |
|------|------|
| commission_rate 저장 | 존재 |
| settlement 테이블 | 없음 |
| payout 로직 | 없음 |
| earnings 집계 | 없음 |

**의도적 비구현 상태로 Freeze.** 정산 도입 시 별도 WO 필요.

---

## 6. 원자성 보장

`approvePartnerApplication()` — `AppDataSource.transaction()` 적용:

1. Active 계약 중복 체크 (선행)
2. Application APPROVED 저장
3. Contract 생성
4. Dashboard 등록

4개 작업이 단일 트랜잭션. 어느 하나라도 실패 시 전체 rollback.

---

## 7. 권한 모델

| 행위 | 권한 |
|------|------|
| 계약 생성 | Seller (승인 시 자동) |
| Seller terminate | 해당 seller만 (sellerId 검증) |
| Partner terminate | 해당 partner만 (partnerId 검증) |
| Commission 변경 | Seller만 |
| 계약 조회 | 각자 본인 것만 |

---

## 8. 금지 사항 (Freeze 이후)

- 계약 테이블 컬럼 구조 변경 금지
- contract_status ENUM 값 추가/변경 금지
- terminated_by ENUM 값 추가/변경 금지
- 승인 → 계약 트랜잭션 흐름 변경 금지
- commission_rate 직접 UPDATE 금지

### 허용 사항

- 버그 수정
- 성능 개선 (인덱스 추가 등)
- expires_at 자동 만료 batch 구현 (별도 WO)
- 정산 시스템 연결 (별도 WO)
- 문서, 테스트 추가

### 변경 절차

금지 항목 변경 시: **WO-NETURE-CONTRACT-V2** 설계 단계부터 시작

---

## 9. 관련 문서

| 문서 | 경로 |
|------|------|
| 계약 아키텍처 설계 | `docs/architecture/SELLER-PARTNER-CONTRACT-ARCHITECTURE-V1.md` |
| 파트너 구조 조사 | `docs/investigation/IR-NETURE-PARTNER-STRUCTURE-INVESTIGATION-V1.md` |
| 계약 검증 리포트 | `docs/investigation/IR-NETURE-SELLER-PARTNER-CONTRACT-VALIDATION-V1.md` |

---

## 10. 검증 결과 요약

**IR-NETURE-SELLER-PARTNER-CONTRACT-VALIDATION-V1 판정**: A- → A (원자성 패치 완료)

**구조 안전성**: 10 / 10

| 영역 | 점수 |
|------|------|
| 데이터 무결성 | 10/10 |
| 승인-계약 원자성 | 10/10 |
| 상태 전이 | 10/10 |
| 권한 검증 | 10/10 |
| Edge Case | 10/10 |

---

*Frozen: 2026-02-24*
*Status: Stable Baseline*
