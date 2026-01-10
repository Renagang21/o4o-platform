# Market Trial 정비안 v1 - 공식 기준 문서

> **Authoritative Reference Document**
> 본 문서는 Market Trial 기능의 구조·운영 기준 문서이며, 이후 설계·개발·운영 판단의 기준으로 사용된다.

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 ID | SPEC-MARKET-TRIAL-V1 |
| 버전 | 1.0 |
| 상태 | **Active (Authoritative)** |
| 작성일 | 2026-01-10 |
| 근거 | Work Order WO-MARKET-TRIAL-STANDARDS-V1 |

---

## 1. Market Trial 정의

### 1.1 목적

Market Trial은 **공급자(Supplier)가 파트너/셀러에게 신제품이나 서비스를 체험하게 하고, 그 대가로 보상을 제공하는 마케팅 채널**이다.

### 1.2 핵심 가치

| 관점 | 가치 |
|------|------|
| 공급자 | 시장 반응 테스트, 잠재 판매자 확보 |
| 참여자 | 신제품 조기 접근, 보상 획득 |
| 플랫폼 | 공급-수요 연결, 거래 활성화 |

---

## 2. 데이터 구조 기준

### 2.1 MarketTrial Entity

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | UUID | O | 고유 식별자 |
| title | string | O | Trial 제목 |
| description | string | O | 상세 설명 |
| supplierId | UUID | O | 공급자 ID |
| supplierName | string | - | 공급자 표시명 |
| eligibleRoles | enum[] | O | 참여 가능 역할 |
| rewardOptions | enum[] | O | 제공 가능 보상 유형 |
| cashRewardAmount | number | - | 현금 보상 금액 |
| productRewardDescription | string | - | 제품 보상 설명 |
| status | enum | O | Trial 상태 |
| maxParticipants | number | - | 최대 참여 인원 |
| currentParticipants | number | O | 현재 참여 인원 |
| deadline | datetime | - | 참여 마감일 |
| createdAt | datetime | O | 생성 일시 |

### 2.2 TrialParticipation Entity

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | UUID | O | 고유 식별자 |
| trialId | UUID | O | Trial 참조 |
| participantId | UUID | O | 참여자 ID |
| participantName | string | - | 참여자 표시명 |
| role | enum | O | 참여 시점 역할 |
| rewardType | enum | O | 선택한 보상 유형 |
| rewardStatus | enum | O | 보상 처리 상태 |
| joinedAt | datetime | O | 참여 일시 |

### 2.3 Enum 정의

```typescript
// 참여 가능 역할
type TrialEligibleRole = 'partner' | 'seller';

// 보상 유형
type RewardType = 'cash' | 'product';

// Trial 상태
type TrialStatus = 'open' | 'closed';

// 보상 처리 상태
type RewardStatus = 'pending' | 'fulfilled';
```

---

## 3. 비즈니스 흐름 기준

### 3.1 Trial 생명주기

```
[생성] → [공개(open)] → [참여 접수] → [마감(closed)] → [보상 처리]
```

### 3.2 참여자 흐름

```
[Trial 발견] → [상세 확인] → [참여 신청 + 보상 선택] → [보상 대기] → [보상 수령]
```

### 3.3 보상 유형별 처리

| 보상 유형 | 처리 방식 |
|-----------|-----------|
| cash | 현금/포인트 지급 |
| product | 배송 주소 수집 → 제품 발송 |

---

## 4. API 엔드포인트 기준

### 4.1 필수 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/market-trial | Trial 목록 조회 |
| GET | /api/market-trial/:id | Trial 상세 조회 |
| POST | /api/market-trial/:id/join | Trial 참여 (보상 선택 포함) |
| GET | /api/market-trial/:id/participation | 내 참여 정보 조회 |

### 4.2 API 응답 형식

```json
{
  "success": true,
  "data": { ... },
  "message": "optional message"
}
```

### 4.3 오류 응답 형식

```json
{
  "success": false,
  "message": "error description"
}
```

---

## 5. 저장소 기준

### 5.1 현재 상태 (Phase L-1)

| 항목 | 구현 |
|------|------|
| 저장소 유형 | In-Memory (Map) |
| 영속성 | 없음 (서버 재시작 시 초기화) |
| 샘플 데이터 | 하드코딩된 4개 Trial |

### 5.2 향후 목표 (Phase L-2 이후)

| 항목 | 목표 |
|------|------|
| 저장소 유형 | PostgreSQL |
| 영속성 | 완전 영속 |
| 마이그레이션 | TypeORM 기반 |

---

## 6. 권한 및 접근 기준

### 6.1 역할별 접근 권한

| 역할 | Trial 조회 | Trial 참여 | Trial 생성 |
|------|------------|------------|------------|
| 일반 사용자 | O | X | X |
| Partner | O | O (role 조건) | X |
| Seller | O | O (role 조건) | X |
| Supplier | O | X | O (자기 Trial) |
| Admin | O | X | O |

### 6.2 참여 자격 검증

- `eligibleRoles`에 참여자의 role이 포함되어야 함
- Trial `status`가 'open'이어야 함
- `maxParticipants` 미도달 상태여야 함
- 중복 참여 불가

---

## 7. 연동 흐름 기준 (미구현 - 정의만)

### 7.1 Trial → Order 연동

| 단계 | 설명 | 현재 상태 |
|------|------|-----------|
| 1 | rewardType='product' 선택 시 | 구현됨 |
| 2 | 배송 주소 수집 | **미구현** |
| 3 | Order 생성 | **미구현** |
| 4 | 배송 상태 추적 | **미구현** |

### 7.2 단절 지점 (H8-0 조사 결과)

| 단절 | 위치 | 필요 작업 |
|------|------|-----------|
| 단절 1 | Trial → Fulfillment | Fulfillment 서비스 |
| 단절 2 | Participation → Address | 주소 수집 UI/API |
| 단절 3 | Trial → Order | 연결 로직 |
| 단절 4 | Order → Delivery | 배송 관리 |

---

## 8. UI 화면 기준

### 8.1 필수 화면 목록

| 화면 | 경로 | 설명 | 현재 상태 |
|------|------|------|-----------|
| Trial 목록 | /trials | 공개 Trial 목록 | neture-web 구현됨 |
| Trial 상세 | /trials/:id | Trial 정보 + 참여 버튼 | **미구현** |
| 참여 완료 | - | 참여 확인 메시지 | **미구현** |
| 내 참여 목록 | /my/trials | 참여한 Trial 목록 | **미구현** |

### 8.2 UI 표시 기준

| 요소 | 표시 기준 |
|------|-----------|
| 마감 표시 | status='closed' 또는 deadline 경과 |
| 정원 표시 | maxParticipants 존재 시 "N/M명" |
| 보상 표시 | rewardOptions에 따라 "현금/제품" |

---

## 9. 확장 규칙

### 9.1 허용되는 확장

| 확장 유형 | 조건 |
|-----------|------|
| 새 rewardType 추가 | 본 문서 개정 후 |
| 새 eligibleRole 추가 | 본 문서 개정 후 |
| 새 trialStatus 추가 | 본 문서 개정 후 |

### 9.2 금지되는 변경

| 금지 사항 | 이유 |
|-----------|------|
| 기존 enum 값 삭제 | 하위 호환성 |
| 필수 필드 제거 | 데이터 무결성 |
| API 경로 변경 | 클라이언트 호환성 |

---

## 10. 참고 문서

| 문서 | 경로 |
|------|------|
| H8-0 조사 보고서 | docs/plan/active/H8-0-neture-service-transition-phase1-report.md |
| 현재 구현 코드 | apps/api-server/src/controllers/market-trial/marketTrialController.ts |

---

## 변경 이력

| 버전 | 일자 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-01-10 | 최초 작성 (Phase A 기준 문서 고정) |

---

*Document Status: AUTHORITATIVE*
*Last Updated: 2026-01-10*
