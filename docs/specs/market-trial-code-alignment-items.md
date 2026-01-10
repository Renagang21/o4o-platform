# Market Trial 코드 정비 항목 목록

> **Phase B: 식별만, 코드 수정 없음**
> 본 문서는 Market Trial 정비안 v1 기준 대비 코드 불일치 항목을 식별한다.

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 ID | SPEC-MARKET-TRIAL-ALIGNMENT-V1 |
| 기준 문서 | market-trial-standards-v1.md |
| 작성일 | 2026-01-10 |
| 상태 | 식별 완료 (수정 미착수) |

---

## 1. 구조적 불일치 (Structural)

### 1.1 이중 구현 존재

| 항목 | 구현 A (Legacy) | 구현 B (Extension) |
|------|----------------|-------------------|
| 위치 | `apps/api-server/src/controllers/market-trial/` | `packages/market-trial/` |
| 저장소 | In-Memory Map | TypeORM Entity (DB) |
| 상태 | 현재 동작 | 실험적 |

**불일치 내용**:
- 두 구현이 동시에 존재하며 데이터 구조가 상이함
- Legacy: rewardOptions = ['cash', 'product']
- Extension: 펀딩 기반 (trialUnitPrice, targetAmount, currentAmount)

**기준 판정**: Legacy가 기준 문서와 더 일치함

---

### 1.2 데이터 모델 차이

#### Legacy (marketTrialController.ts)

```typescript
// 기준 문서와 일치
interface MarketTrial {
  eligibleRoles: TrialEligibleRole[];  // ✅ 일치
  rewardOptions: RewardType[];         // ✅ 일치
  status: 'open' | 'closed';           // ✅ 일치
}

interface TrialParticipation {
  rewardType: RewardType;              // ✅ 일치
  rewardStatus: 'pending' | 'fulfilled'; // ✅ 일치
}
```

#### Extension (MarketTrial.entity.ts)

```typescript
// 기준 문서와 불일치
interface MarketTrial {
  // ❌ eligibleRoles 없음
  // ❌ rewardOptions 없음
  trialUnitPrice: number;              // ❌ 기준에 없음
  targetAmount: number;                // ❌ 기준에 없음
  currentAmount: number;               // ❌ 기준에 없음
  status: 'open' | 'trial_active' | 'failed'; // ❌ 불일치
}
```

---

## 2. Enum 불일치

### 2.1 TrialStatus

| 구현 | 값 | 기준 일치 |
|------|-----|----------|
| 기준 문서 | `open`, `closed` | - |
| Legacy | `open`, `closed` | ✅ |
| Extension | `open`, `trial_active`, `failed` | ❌ |

### 2.2 RewardStatus

| 구현 | 값 | 기준 일치 |
|------|-----|----------|
| 기준 문서 | `pending`, `fulfilled` | - |
| Legacy | `pending`, `fulfilled` | ✅ |
| Extension | 없음 | ❌ |

---

## 3. API 불일치

### 3.1 경로 불일치

| 기준 경로 | 현재 구현 | 상태 |
|-----------|-----------|------|
| `/api/market-trial` | `/api/market-trial` | ✅ 일치 |
| `/api/market-trial/:id` | `/api/market-trial/:id` | ✅ 일치 |
| `/api/market-trial/:id/join` | `/api/market-trial/:id/join` | ✅ 일치 |
| `/api/market-trial/:id/participation` | `/api/market-trial/:id/participation` | ✅ 일치 |

### 3.2 응답 형식 불일치

| 항목 | 기준 | 현재 | 상태 |
|------|------|------|------|
| success 필드 | 필수 | 있음 | ✅ |
| data 필드 | 필수 | 있음 | ✅ |
| message 필드 | 선택 | 있음 | ✅ |

---

## 4. Frontend 불일치

### 4.1 Type 정의 불일치

**파일**: `services/web-neture/src/api/trial.ts`

| 필드 | 기준 | 현재 | 상태 |
|------|------|------|------|
| status | `open`, `closed` | `draft`, `active`, `closed` | ❌ 불일치 |
| rewardOptions | RewardType[] | RewardOption[] (객체 배열) | ⚠️ 구조 차이 |

**기준 정의**:
```typescript
rewardOptions: ('cash' | 'product')[]
```

**현재 정의**:
```typescript
rewardOptions: { type: 'cash' | 'product'; value: number | string; description?: string; }[]
```

### 4.2 경로 불일치

| 화면 | 기준 경로 | 현재 경로 | 상태 |
|------|-----------|-----------|------|
| Trial 목록 | `/trials` | `/trials` | ✅ 일치 |
| Trial 상세 | `/trials/:id` | `/trial/:id` (단수) | ❌ 불일치 |

### 4.3 Status Badge 색상 불일치

**파일**: `services/web-neture/src/pages/TrialListPage.tsx:106-120`

| status 값 | 정의된 색상 | 기준 상태값과 매핑 |
|-----------|------------|-------------------|
| `active` | 녹색 | 기준에 없음 (should be `open`) |
| `closed` | 빨강 | ✅ 일치 |
| 기타 | 회색 | - |

---

## 5. Extension 구현 불일치 (packages/market-trial)

### 5.1 비즈니스 모델 차이

| 항목 | 기준 문서 | Extension 구현 |
|------|----------|----------------|
| 참여 방식 | 무료 참여 + 보상 선택 | 유료 펀딩 기여 |
| 보상 | cash/product 선택 | 펀딩 비례 보상 (미정의) |
| 목표 | Trial 체험 | 펀딩 목표 달성 |

### 5.2 Entity 필드 차이

**MarketTrial.entity.ts에 없는 기준 필드**:

| 필드 | 기준 | Extension |
|------|------|-----------|
| eligibleRoles | 필수 | ❌ 없음 |
| rewardOptions | 필수 | ❌ 없음 |
| cashRewardAmount | 선택 | ❌ 없음 |
| productRewardDescription | 선택 | ❌ 없음 |
| maxParticipants | 선택 | ❌ 없음 |
| currentParticipants | 필수 | ❌ 없음 |
| deadline | 선택 | ❌ 없음 |

**Extension에만 있는 필드** (기준에 없음):

| 필드 | 설명 |
|------|------|
| productId | 상품 ID 참조 |
| trialUnitPrice | 펀딩 단가 |
| targetAmount | 목표 펀딩액 |
| currentAmount | 현재 펀딩액 |
| fundingStartAt | 펀딩 시작일 |
| fundingEndAt | 펀딩 종료일 |
| trialPeriodDays | Trial 기간 |

### 5.3 Participant Entity 필드 차이

**MarketTrialParticipant.entity.ts**:

| 필드 | 기준 | Extension |
|------|------|-----------|
| participantName | 선택 | ❌ 없음 |
| role | 필수 | → participantType |
| rewardType | 필수 | ❌ 없음 |
| rewardStatus | 필수 | ❌ 없음 |
| joinedAt | 필수 | → createdAt |
| contributionAmount | 기준에 없음 | ❌ 추가됨 |

---

## 6. 정비 우선순위 제안

### 6.1 높음 (High)

| # | 항목 | 이유 |
|---|------|------|
| H1 | Frontend status enum 정리 | API 응답과 불일치 |
| H2 | Frontend 경로 `/trial/:id` → `/trials/:id` | 기준 문서 준수 |
| H3 | Extension Entity 재설계 검토 | 비즈니스 모델 상이 |

### 6.2 중간 (Medium)

| # | 항목 | 이유 |
|---|------|------|
| M1 | rewardOptions 타입 정리 | 배열 vs 객체 배열 |
| M2 | Status badge 색상 수정 | `open`에 대한 스타일 없음 |

### 6.3 낮음 (Low)

| # | 항목 | 이유 |
|---|------|------|
| L1 | Extension 구현 방향 결정 | Legacy 유지 vs Extension 전환 |
| L2 | DB 영속화 일정 | 현재 In-Memory로 동작 중 |

---

## 7. 권장 조치 (코드 수정 아님)

1. **이중 구현 정리 방향 결정 필요**
   - Legacy (In-Memory) 유지 + DB화
   - Extension (펀딩 기반) 폐기/보류
   - 또는 두 모델 병행

2. **Extension이 다른 비즈니스 모델을 구현 중**
   - 기준 문서: 무료 참여 → 보상
   - Extension: 유료 펀딩 → Trial
   - 별도 기능으로 분리 검토

3. **Frontend는 Legacy API에 맞춰져 있음**
   - Extension Entity 사용 시 Frontend 전면 수정 필요

---

## 참고 파일

| 파일 | 역할 |
|------|------|
| apps/api-server/src/controllers/market-trial/marketTrialController.ts | Legacy 구현 |
| packages/market-trial/src/entities/MarketTrial.entity.ts | Extension Entity |
| packages/market-trial/src/entities/MarketTrialParticipant.entity.ts | Extension Entity |
| services/web-neture/src/api/trial.ts | Frontend API 클라이언트 |
| services/web-neture/src/pages/TrialListPage.tsx | Frontend UI |

---

*Document Status: Identification Complete*
*Last Updated: 2026-01-10*
