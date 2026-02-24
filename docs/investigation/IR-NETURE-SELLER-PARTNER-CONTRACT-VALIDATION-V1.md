# IR-NETURE-SELLER-PARTNER-CONTRACT-VALIDATION-V1

> WO-NETURE-SELLER-PARTNER-CONTRACT-VALIDATION-V1 검증 리포트
> 검증일: 2026-02-24
> 대상: WO-NETURE-SELLER-PARTNER-CONTRACT-V1 구현 결과물

---

## Phase 1 — 데이터 무결성 검증

### 1-1. Partial Unique Index 동작 검증

| 테스트 | 결과 | 판정 |
|--------|------|------|
| Index 정의 `UQ_neture_contracts_active_pair` | `(seller_id, partner_id) WHERE contract_status = 'active'` | PASS |
| Application-level 사전 체크 | `existingContract` 조회 후 `ACTIVE_CONTRACT_EXISTS` throw | PASS |
| Route-level 에러 핸들링 | 409 CONFLICT 응답 | PASS |
| DB-level 최종 방어 | Partial unique index가 INSERT 차단 | PASS |

**이중 방어 구조**: Application 레벨 + DB 레벨. 안정.

---

### 1-2. 기존 approved 데이터 마이그레이션 검증

| 항목 | 결과 | 판정 |
|------|------|------|
| SELECT 소스 | `neture_partner_applications WHERE status='approved'` JOIN `neture_partner_recruitments` | PASS |
| commission_rate 소스 | `r.commission_rate` (Recruitment 기준) | PASS |
| started_at 소스 | `COALESCE(a.decided_at, a.created_at)` — decided_at 우선, fallback created_at | PASS |
| 충돌 정책 | `ON CONFLICT DO NOTHING` — 이미 존재하면 skip | PASS |
| contract_status 기본값 | `'active'` (ENUM default) | PASS |

**참고**: Partial unique index 때문에 동일 seller+partner의 approved application이 여러 건이면 첫 번째만 계약 생성, 나머지는 `ON CONFLICT DO NOTHING`으로 skip됨. 이는 "동일 쌍에 active 1개" 정책과 일치.

---

### 1-3. FK 정책 확인

| 항목 | 결과 |
|------|------|
| `application_id` FK | **없음** — 단순 uuid 컬럼 |
| `recruitment_id` FK | **없음** — 단순 uuid 컬럼 |
| Application 삭제 시 | Contract **독립 유지** |
| Recruitment 삭제 시 | Contract **독립 유지** |
| 패턴 일관성 | 기존 Neture 테이블과 동일 (FK 미사용 패턴) |

**판정**: PASS. FK 없음은 의도적 설계 (기존 패턴 준수).

---

## Phase 2 — 승인 → 계약 생성 흐름 검증

### 2-1. 신규 승인 시나리오

**코드 흐름** (`neture.service.ts:2683-2745`):

```
1. Application 조회 + PENDING 확인         ✅
2. Recruitment 조회 + 소유권 확인            ✅
3. application.status = APPROVED → save     ✅
4. 기존 active 계약 중복 체크                ✅
5. Contract 생성 (commission_rate snapshot)  ✅
6. Dashboard 자동 등록                      ✅
```

| 확인 항목 | 결과 | 판정 |
|-----------|------|------|
| application.status → APPROVED | line 2704 | PASS |
| decidedAt 기록 | line 2705 | PASS |
| decidedBy 기록 | line 2706 | PASS |
| contract 생성 | line 2717-2725 | PASS |
| commissionRate snapshot | `recruitment.commissionRate` 복사 | PASS |
| startedAt 기록 | `new Date()` | PASS |

---

### ⚠ NOTE-1: 승인-계약 원자성 부재 (심각도: MEDIUM)

**발견 사항**: `approvePartnerApplication()` 메서드에서 Application 승인과 Contract 생성이 **별도 save() 호출**로 처리됨. Transaction으로 묶여있지 않음.

**문제 시나리오**:
1. Line 2707: `applicationRepo.save(application)` — Application **APPROVED로 저장됨**
2. Line 2713: `ACTIVE_CONTRACT_EXISTS` throw — Contract 생성 실패
3. **결과**: Application은 APPROVED 상태지만 Contract는 없음
4. **재시도 불가**: `application.status !== PENDING` → `INVALID_STATUS` 에러

**발생 조건**: 동일 seller+partner 조합이 2개 이상의 Application을 가지고, 첫 번째 승인 후 두 번째를 승인하려 할 때.

**영향 범위**: 극히 드문 케이스 (동일 쌍의 중복 Application 자체가 Recruitment unique 제약으로 제한됨). 다만 데이터 정합성 관점에서 기록.

**권장**: 계약 중복 체크를 Application save **이전**으로 이동하면 완전 해소.

---

## Phase 3 — 상태 전이 검증

### 3-1. Seller terminate

| 항목 | 코드 위치 | 결과 | 판정 |
|------|-----------|------|------|
| 소유권 검증 | `{ id: contractId, sellerId: actorId }` | 본인 계약만 조회 | PASS |
| 상태 검증 | `contractStatus !== ACTIVE → throw` | ACTIVE만 해지 가능 | PASS |
| status 전이 | `ACTIVE → TERMINATED` | 정확 | PASS |
| terminated_by | `ContractTerminatedBy.SELLER` | 정확 | PASS |
| ended_at | `new Date()` 기록 | 정확 | PASS |
| 에러 응답 | 404 NOT_FOUND, 400 INVALID_STATUS | 정확 | PASS |

### 3-2. Partner terminate

| 항목 | 코드 위치 | 결과 | 판정 |
|------|-----------|------|------|
| 소유권 검증 | `{ id: contractId, partnerId: actorId }` | 본인 계약만 조회 | PASS |
| 상태 검증 | `contractStatus !== ACTIVE → throw` | ACTIVE만 해지 가능 | PASS |
| status 전이 | `ACTIVE → TERMINATED` | 정확 | PASS |
| terminated_by | `ContractTerminatedBy.PARTNER` | 정확 | PASS |
| ended_at | `new Date()` 기록 | 정확 | PASS |
| 에러 응답 | 404 NOT_FOUND, 400 INVALID_STATUS | 정확 | PASS |

### 3-3. Commission 변경

| 항목 | 코드 위치 | 결과 | 판정 |
|------|-----------|------|------|
| 소유권 검증 | `{ id, sellerId, contractStatus: ACTIVE }` | Seller + ACTIVE 동시 확인 | PASS |
| 기존 계약 terminate | `TERMINATED + SELLER + endedAt` | 정확 | PASS |
| 신규 계약 생성 | 동일 seller/partner/recruitment/application | 연속성 유지 | PASS |
| 새 commissionRate | `newRate` 파라미터 적용 | 정확 | PASS |
| partial unique | 기존 terminated → 새 active → 충돌 없음 | PASS |
| 응답 구조 | `{ terminated: { id }, created: contract }` | 양쪽 기록 반환 | PASS |
| commissionRate 입력 검증 | `typeof !== 'number' → 400` | PASS |

**불변 원칙 준수**: 기존 계약의 `commissionRate`는 변경되지 않음. 새 계약에 새 rate. 완벽.

---

## Phase 4 — Edge Case 검증

### 4-1. Active 계약 존재 시 재승인

**실제 동작**: **A. 예외 발생**

```
approvePartnerApplication()
  → existingContract 조회
  → ACTIVE_CONTRACT_EXISTS throw
  → Route: 409 CONFLICT
```

**정책 일치 여부**: 설계 의도와 일치. 동일 seller+partner에 active 계약 존재 시 새 승인 차단.

단, NOTE-1 참조: Application이 먼저 APPROVED로 저장된 후 예외 발생하는 순서 문제 존재.

---

### 4-2. expires_at 경과 처리

| 항목 | 결과 |
|------|------|
| 자동 expired 전환 로직 | **없음** |
| Batch job / Cron | **없음** |
| 현재 상태 | 필드 저장만 수행 |

**판정**: 의도적 보류. 자동 만료는 별도 WO 범위.
현재 `expires_at`은 **조회 시 참고용 필드**로만 기능.

---

### 4-3. 권한 검증

| 시나리오 | 방어 메커니즘 | 결과 |
|----------|-------------|------|
| 다른 seller가 terminate | `sellerId: actorId` WHERE 절 → findOne null → 404 | PASS |
| 다른 partner가 terminate | `partnerId: actorId` WHERE 절 → findOne null → 404 | PASS |
| 인증 없이 접근 | `requireAuth` 미들웨어 → 401 | PASS |
| Seller가 partner route 호출 | partnerId 불일치 → 404 | PASS |
| Partner가 commission 변경 시도 | `/seller/contracts/:id/commission`은 seller only → sellerId 불일치 → 404 | PASS |

**Commission 변경 권한**: Seller만 가능 (설계 의도 일치). Partner는 해당 엔드포인트 자체가 `/seller/` 경로에 있어 소유권 불일치로 자연 차단.

---

### 4-4. 추가 Edge Case

| 시나리오 | 결과 | 판정 |
|----------|------|------|
| terminated 계약에 terminate 재호출 | `CONTRACT_NOT_ACTIVE` → 400 | PASS |
| expired 계약에 terminate 호출 | `CONTRACT_NOT_ACTIVE` → 400 | PASS |
| 존재하지 않는 contractId | `CONTRACT_NOT_FOUND` → 404 | PASS |
| commission에 문자열 전달 | `typeof !== 'number'` → 400 | PASS |
| status 쿼리에 잘못된 값 | `Object.values(ContractStatus).includes()` 검증 → 무시 (전체 조회) | PASS |

---

## 최종 제출

### 1. 종합 판정

## **A-** (거의 완전 안정)

A가 아닌 이유: NOTE-1 (승인-계약 원자성 부재)

---

### 2. 발견된 문제 목록

| 번호 | 문제 | 심각도 | 설명 |
|------|------|--------|------|
| NOTE-1 | 승인-계약 원자성 부재 | MEDIUM | Application APPROVED 후 Contract 생성 실패 시 APPROVED 상태만 남음. 계약 중복 체크를 save 이전으로 이동하면 해소 |

발견 문제: **1건** (MEDIUM)
CRITICAL/HIGH: **0건**

---

### 3. 구조 안전성 점수

## **9 / 10**

| 영역 | 점수 | 비고 |
|------|------|------|
| 데이터 무결성 | 10/10 | Partial unique + Application 이중 방어 |
| FK 정책 | 10/10 | 기존 패턴 일관성 |
| 데이터 마이그레이션 | 10/10 | ON CONFLICT 안전 처리 |
| 승인 → 계약 흐름 | 8/10 | NOTE-1: 원자성 부재 (-2) |
| 상태 전이 | 10/10 | terminate/commission 모두 정확 |
| 권한 검증 | 10/10 | seller/partner 소유권 분리 완벽 |
| Edge Case | 9/10 | expires_at 미구현 (의도적) |
| 에러 핸들링 | 10/10 | 모든 경로에 적절한 HTTP 코드 |

**감점 사유**: NOTE-1 원자성 이슈 (-1점)

---

### 4. NOTE-1 해소 방안 (참고)

현재:
```
save(application APPROVED)  ← 여기서 이미 DB 반영
check existingContract       ← 여기서 실패하면 application만 APPROVED 상태
```

권장:
```
check existingContract       ← 먼저 체크
save(application APPROVED)   ← 통과 후 승인
save(contract)               ← 계약 생성
```

순서 변경만으로 해소 가능. Transaction 불필요.

---

*검증 완료. 코드 수정 없음.*
