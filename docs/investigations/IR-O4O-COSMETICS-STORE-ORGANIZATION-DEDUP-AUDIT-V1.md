# IR-O4O-COSMETICS-STORE-ORGANIZATION-DEDUP-AUDIT-V1

> **조사 유형:** 정정 IR (Corrective Investigation Report)  
> **조사 일자:** 2026-05-26  
> **조사 대상:** K-Cosmetics 매장/사업자 구조에서 `business_number` 중복 문제의 정확한 성격 규명  
> **코드 수정:** 없음 (조사 전용)  
> **선행 참조:** IR-O4O-BUSINESS-INFO-CANONICAL-PLATFORM-INTEGRATION-V1 (P1 정정)

---

## 1. 조사 배경 및 목적

IR-O4O-BUSINESS-INFO-CANONICAL-PLATFORM-INTEGRATION-V1에서 다음 P1 이슈를 제기했다:

> "K-Cosmetics: business_number duplicated — organizations 테이블에 중복 가능"

그러나 이 진단은 **다중 서비스 이용 구조**를 고려하지 않은 것일 수 있다. 본 IR은:

1. 현재 K-Cosmetics 구조가 실제로 어떻게 동작하는지 확인
2. `business_number` 중복의 **허용 범위와 문제 범위**를 재정의
3. O4O 사업 철학(한 사업자 = 여러 서비스 이용 가능)과의 정합성 검토
4. 후속 WO 방향 확정

---

## 2. 현재 구조 상세

### 2-1. 테이블별 business_number 저장 현황

| 테이블 | 컬럼 | UNIQUE | 비고 |
|--------|------|--------|------|
| `cosmetics.cosmetics_stores` | `business_number VARCHAR(100)` | **YES** ✅ | 서비스 내 UNIQUE. 같은 사업자번호로 두 개의 K-Cosmetics 매장 불가 |
| `cosmetics.cosmetics_store_applications` | `business_number VARCHAR(100)` | NO | 신청 단계 임시 저장 (draft/pending 상태) |
| `organizations` | `business_number VARCHAR(20)` | **NO** ✅ | 인덱스만 존재. 의도적 — 다중 서비스 구조 허용 |
| `physical_stores` | `business_number VARCHAR(20)` | **YES** | 실물 매장 Cross-service 브리지. 전역 UNIQUE |

### 2-2. K-Cosmetics 승인 흐름 (cosmetics-store.service.ts)

```
Application 승인 시:
  1. 중복 검증: cosmetics_stores.business_number 확인 → BUSINESS_NUMBER_ALREADY_REGISTERED 에러
  2. 트랜잭션 시작
  3. cosmetics_store_applications.status → APPROVED
  4. organizations 새 행 INSERT (organization_id 생성)
     - name, code, type='store', business_number, metadata.serviceKey='cosmetics'
  5. cosmetics_stores INSERT
     - organization_id: 위에서 생성한 ID
     - business_number: 동일하게 저장
  6. platform_store_slugs INSERT
  7. cosmetics_store_members INSERT (owner)
  8. organization_members INSERT (owner)
  9. 트랜잭션 커밋
 10. 'cosmetics:store_owner' 역할 부여 (트랜잭션 외부)
```

**핵심 관찰:** Step 4에서 기존 `organizations` 조회 없이 항상 새 organizations 행을 생성한다.

### 2-3. organization_service_enrollments 연결

K-Cosmetics 승인 흐름에서 `organizationOpsService.enrollService()`를 **호출하지 않는다** — GlycoPharm과 달리, 서비스 enrollment가 생략되어 있다. 대신 `organizations.metadata.serviceKey = 'cosmetics'`로 처리한다.

### 2-4. 다른 서비스와의 비교

| 항목 | K-Cosmetics | GlycoPharm | Neture |
|------|-------------|-----------|--------|
| Organization 재사용 검색 | **없음** (항상 신규) | created_by_user_id 기준 재사용 | **없음** (항상 신규) |
| business_number로 기존 org 조회 | **안 함** | 안 함 | 안 함 |
| 서비스 확장 테이블 | 없음 (cosmetics_stores 자체) | glycopharm_pharmacy_extensions | neture_suppliers |
| business_number UNIQUE (서비스 테이블) | cosmetics_stores ✅ | glycopharm_pharmacies (legacy) ✅ | neture_suppliers ❌ |
| organization_service_enrollments 등록 | **안 함** | enrollService() 호출 ✅ | 안 함 |

---

## 3. 중복의 성격 재정의

### 3-1. 허용되어야 하는 중복 (정상)

```
동일 사업자번호 → 여러 서비스 등록

예시:
  business_number = "1234567890"
  → organizations row 1: K-Cosmetics 매장 (type='store')
  → organizations row 2: GlycoPharm 약국 (type='pharmacy')
  → organizations row 3: Neture 공급자 (via neture_suppliers)

이 경우 organizations.business_number 중복 = O4O 다중 서비스 이용 = 정상
```

### 3-2. 막아야 하는 중복 (문제)

```
동일 사업자번호 → 동일 서비스에서 두 개의 매장 생성

예시:
  business_number = "1234567890"
  → K-Cosmetics 매장 A (cosmetics_stores)  ← 현재 UNIQUE으로 차단 ✅
  → K-Cosmetics 매장 B (cosmetics_stores)  ← UNIQUE 위반으로 차단됨
```

### 3-3. 현재 상태 판정

**K-Cosmetics 서비스 내 중복**: 이미 차단되어 있다.
- `cosmetics_stores.business_number UNIQUE` → 같은 서비스 내 두 번째 매장 신청 시 승인 단계에서 `BUSINESS_NUMBER_ALREADY_REGISTERED` 에러 발생
- `normalizeBusinessNumber()` 적용 후 검사 → 하이픈/공백 표기 차이 무력화

**이전 IR의 P1 진단 정정:**
> "K-Cosmetics business_number duplicated"는 오진이다.
> `organizations`에 같은 business_number가 여러 행으로 존재할 수 있는 것은
> 다중 서비스 이용 모델의 의도된 설계이지 버그가 아니다.

---

## 4. 실제 구조적 Gap 확인

조사 결과, 원래 P1로 지정했던 "business_number 중복" 문제는 재정의가 필요하다. 실제 Gap은 다음 세 가지다.

### Gap 1: K-Cosmetics 승인 시 organization 재사용 없음 [P1]

**현상:** 동일 사업자가 GlycoPharm + K-Cosmetics 두 서비스를 이용할 때, 각 승인 시마다 별도의 `organizations` 행이 생성된다.

```
사업자 A (business_number = "1234567890")
  → GlycoPharm 승인 → organizations.id = UUID-A
  → K-Cosmetics 승인 → organizations.id = UUID-B  ← 별도 생성
```

**O4O 철학과의 충돌:** `organizations`는 사업자 Canonical SSOT이다. 같은 사업자가 두 개의 organizations 행을 가지면 사업자 단위의 통합 조회(매출, 채널, 자료)가 불가능해진다.

**권장 구조:**
```
사업자 A (business_number = "1234567890")
  → organizations.id = UUID-A (1개, SSOT)
  → organization_service_enrollments: UUID-A + 'glycopharm' (active)
  → organization_service_enrollments: UUID-A + 'k-cosmetics' (active)
  → glycopharm_pharmacy_extensions: organization_id = UUID-A
  → cosmetics_stores: organization_id = UUID-A
```

### Gap 2: K-Cosmetics에서 organization_service_enrollments 미등록 [P1]

**현상:** GlycoPharm은 `organizationOpsService.enrollService('glycopharm')`를 호출하지만, K-Cosmetics 승인 flow는 `organization_service_enrollments`에 등록하지 않는다.

**결과:** K-Cosmetics 매장이 플랫폼 서비스 enrollment 조회에서 누락된다. `organizations` 조회 시 cosmetics enrollment 여부를 확인하는 로직이 동작하지 않는다.

### Gap 3: cosmetics_stores에 organizationOpsService 일부 기능 누락 [P2]

**현상:** 현재 K-Cosmetics 승인 flow의 organization 생성은 raw SQL INSERT로 직접 처리한다. GlycoPharm은 `organizationOpsService`의 중앙화된 서비스를 사용한다. 패턴 불일치.

---

## 5. Option 비교

### Option A: cosmetics_stores.business_number UNIQUE 유지 + 현 구조 유지

```
판정: 부분적으로 이미 구현됨
장점: 서비스 내 중복 차단 완료
문제:
  - 다중 서비스 이용 시 organizations 분산 (Gap 1)
  - organization_service_enrollments 누락 (Gap 2)
  - 사업자 단위 통합 조회 불가
```

### Option B: organization 재사용 + service enrollment 기반 중복 방지 [권장]

```
구현:
  1. K-Cosmetics 승인 시 business_number로 기존 organizations 조회
  2. 존재하면 재사용, 없으면 신규 생성
  3. organization_service_enrollments.enrollService('k-cosmetics') 호출
     → UNIQUE(organization_id, service_code) 제약이 동일 서비스 중복 방지

중복 방지 경계:
  organizations.business_number → 사업자 식별 (전역 unique 아님, 서비스 간 재사용)
  organization_service_enrollments (organization_id, service_code) → 서비스별 중복 방지
  cosmetics_stores.organization_id → 서비스 확장, 1:1로 유지

장점:
  - 사업자 단위 통합 조회 가능
  - 플랫폼 Canonical SSOT 준수
  - organization_service_enrollments 활용 → 서비스 enrollment 전체 현황 추적 가능
```

### Option C: 현 구조 유지 + 운영 수동 정리

```
판정: Drift 지속. organizations 분산 문제 해소 불가. 제외.
```

---

## 6. O4O 철학 정합성 검증

| 기준 | 현재 상태 | O4O 철학 |
|------|-----------|----------|
| 한 사업자 여러 서비스 이용 | organizations 분산 생성 → 사업자 단위 추적 불가 | 하나의 organizations + 다수의 enrollment |
| business_number unique 기준 | cosmetics_stores에서만 서비스 내 UNIQUE | organizations에서 재사용 → enrollment 기반 중복 방지 |
| 서비스별 확장 테이블 역할 | cosmetics_stores = 서비스 데이터 + organization 역할 혼재 | cosmetics_stores = organization_id 기반 서비스 확장 전용 |
| enrollment 추적 | organization_service_enrollments 미사용 | 서비스 현황 단일 소스 |
| 사업자 통합 조회 | 불가 (organization 분산) | 가능 (organization SSOT) |

**판정:** K-Cosmetics 구조는 O4O 다중 서비스 철학과 **부분적 충돌** 상태다.  
`cosmetics_stores.business_number UNIQUE`는 올바른 서비스 내 중복 방지지만,  
organization 재사용 없이 동작하는 점이 Gap이다.

---

## 7. 데이터 중복 현황 요약

### 실제 확인된 중복 구조

```
현재 가능한 상태:
  business_number "1234567890"
  → organizations row A: K-Cosmetics 매장 (metadata.serviceKey='cosmetics')
  → organizations row B: GlycoPharm 약국 (type='pharmacy')

이는 버그가 아님 — 다중 서비스 이용 = 의도된 구조
```

### 현재 차단된 중복

```
business_number "1234567890"
→ K-Cosmetics 매장 1: cosmetics_stores (approved) ✅
→ K-Cosmetics 매장 2: 승인 시 BUSINESS_NUMBER_ALREADY_REGISTERED → 차단 ✅
```

### Gap (아직 해결 안 된 구조)

```
business_number "1234567890"
사업자가 GlycoPharm + K-Cosmetics 동시 이용 시:
→ organizations row A (GlycoPharm, UUID-A) ← 별도 생성
→ organizations row B (K-Cosmetics, UUID-B) ← 별도 생성 = SSOT 분산
```

---

## 8. 결론 및 후속 WO 제안

### 이전 P1 정정

| 항목 | 이전 판단 | 정정 판단 |
|------|----------|----------|
| K-Cosmetics business_number 중복 | P1 버그 | **재정의 필요** |
| cosmetics_stores.business_number UNIQUE | 누락 | **이미 구현됨** ✅ |
| organizations.business_number 중복 | 문제 | **다중 서비스 이용 허용 → 의도된 설계** |
| 실제 Gap | — | **organization 재사용 없음 (P1)**, **enrollment 미등록 (P1)** |

### 후속 WO 제안

#### WO-O4O-COSMETICS-ORG-REUSE-AND-ENROLLMENT-V1 [P1]

**목표:** K-Cosmetics 승인 flow를 O4O Canonical 구조에 정렬

**범위:**
1. K-Cosmetics 승인 시 기존 organization 조회 (business_number 기준)
   - 존재하면: organization_id 재사용
   - 없으면: 신규 생성 (현재 로직 유지)
2. `organizationOpsService.enrollService('k-cosmetics')` 호출 추가
   - UNIQUE(organization_id, service_code) 제약이 동일 서비스 중복 방지를 담당
3. 기존 cosmetics_stores.business_number UNIQUE는 유지 (서비스 내 추가 방어선)
4. 기존 cosmetics_stores rows의 organization_id backfill 검토

**주의사항:**
- `organizations.business_number`에 UNIQUE 추가 금지 (다중 서비스 이용 차단됨)
- 기존 데이터 삭제 금지
- cosmetics_stores 서비스 내 UNIQUE 유지 (이중 방어)

---

**작성:** IR-O4O-COSMETICS-STORE-ORGANIZATION-DEDUP-AUDIT-V1  
**상태:** 조사 완료, 후속 WO 대기  
**다음 단계:** 사용자 확인 후 WO-O4O-COSMETICS-ORG-REUSE-AND-ENROLLMENT-V1 실행
