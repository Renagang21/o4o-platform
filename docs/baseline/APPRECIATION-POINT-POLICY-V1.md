# APPRECIATION-POINT-POLICY-V1

> **목적**: O4O 플랫폼 기여 감사 포인트 시스템의 확정 정책.
> 이 문서는 구현 WO의 계약 기준이다.
>
> **상태**: 확정 (2026-05-22)
> **근거 조사**: `docs/archive/investigations/IR-O4O-APPRECIATION-POINT-LIKE-SYSTEM-AUDIT-V1.md`
> **정책 WO**: WO-O4O-APPRECIATION-POINT-POLICY-FINALIZATION-V1

---

## 1. 핵심 철학 (Frozen)

```
좋아요  = 감정 표현 ("이 내용이 좋다")  — 무료, 토글, 취소 가능
감사하기 = 가치 표현 ("실제로 도움됐다") — 포인트 소비, 단방향, 취소 불가
```

| 구분 | 좋아요 | 감사 포인트 |
|------|--------|------------|
| 발화 | 감정 | 가치 |
| 비용 | 없음 | 사용자 보유 포인트 차감 |
| 수신자 | 없음 (집계만) | 제작자 계정 포인트 증가 |
| 재전송 | 토글 (취소 가능) | 단방향 (취소 불가) |
| 예산 | N/A | `service_point_budgets` 사용 안 함 |

**포인트 생태계**: 플랫폼이 포인트를 새로 생성하지 않음. 사용자 → 제작자 재분배 구조.

---

## 2. 확정 정책 목록

### P1 — 동일 대상 반복 전송

**정책: 무제한 허용**

- 잔액이 자연 제한 역할 수행
- 자기 자신 차단(`fromUserId !== toUserId`)으로 1-hop 순환 방어
- 2-hop 순환은 실비용 2회 발생 → 경제적 유인 없음
- Phase 2에서 이상 거래 모니터링 추가 검토

### P2 — 1회 최대 전송 한도

**정책: 최소 1P, 최대 100P**

```typescript
const MIN_APPRECIATION_AMOUNT = 1;
const MAX_APPRECIATION_AMOUNT = 100;
```

- `AppreciationService` 내 상수로 관리 → 추후 정책 조정 시 상수만 수정
- 0P 전송 차단 (기존 `INVALID_AMOUNT` 로직 재사용)
- 실수 거액 전송 방지

### P3 — 목록에서 감사 총액 표시

**정책: 상세 페이지만 (Phase 1)**

- Phase 1: 상세 페이지에만 감사하기 버튼 + 수신 총액 표시
- Phase 2 검토: `forum_post.appreciation_total`, `lms_courses.appreciation_total` 비정규화 컬럼 추가 후 목록 표시

### P4 — LMS Lesson 지원

**정책: Phase 2 이관**

- Phase 1 targetType: `forum_post`, `lms_course`, `content`
- Lesson은 `courseId → instructorId` 2-hop 조회 복잡도로 Phase 2

### P5 — `appreciation_sends` 테이블 구조

**정책: 별도 테이블 신설 필수**

```sql
CREATE TABLE appreciation_sends (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id  uuid NOT NULL REFERENCES users(id),
  to_user_id    uuid NOT NULL REFERENCES users(id),
  target_type   varchar(50) NOT NULL,   -- 'forum_post' | 'lms_course' | 'content'
  target_id     uuid NOT NULL,
  amount        int NOT NULL,
  created_at    timestamp NOT NULL DEFAULT now()
);
```

- `credit_transactions`는 잔액 변동 기록 전용 (역할 고정)
- `appreciation_sends`는 감사 이벤트 이력 전용 (from/to/target 명시)
- `credit_transactions.sourceId = appreciation_sends.id` (역참조)

### P6 — fromUserId 추적

**정책: `appreciation_sends.from_user_id` 명시 컬럼**

- `credit_transactions` 구조 변경 불필요 (기존 Freeze 정책 준수)
- referenceKey 파싱 의존 제거
- `appreciation_sends`에서 직접 쿼리: "내가 보낸 감사 이력", "이 콘텐츠의 발신자 목록"

---

## 3. Phase 1 확정 범위

### 3-1. 대상 targetType

| targetType | 대상 | 제작자 필드 | 안전성 |
|-----------|------|-----------|--------|
| `forum_post` | Forum 게시글 | `authorId` | Nullable 주의 → null 시 차단 |
| `lms_course` | LMS 강의 | `instructorId` | NOT NULL — 안전 |
| `content` | CMS/KPA 콘텐츠 | `createdBy` / `created_by` | Nullable 주의 → null 시 차단 |

### 3-2. 방어 로직 (전체 필수)

| 방어 | 조건 | 에러 코드 |
|------|------|---------|
| 자기 자신 차단 | `fromUserId === toUserId` | `SELF_APPRECIATION_NOT_ALLOWED` |
| 제작자 미식별 차단 | `toUserId === null` | `CREATOR_NOT_IDENTIFIED` |
| 최소 금액 | `amount < 1` | `INVALID_AMOUNT` (기존 재사용) |
| 최대 금액 | `amount > 100` | `AMOUNT_EXCEEDS_LIMIT` |
| 잔액 부족 | `balance < amount` | `INSUFFICIENT_BALANCE` (기존 재사용) |

### 3-3. 트랜잭션 구조

```typescript
await AppDataSource.transaction(async (manager) => {
  // Step 1: appreciation_sends 이력 기록
  const send = await manager.save(AppreciationSend, { ... });

  // Step 2: 송신자 포인트 차감
  await spendPoint({ userId: fromUserId, amount,
    sourceType: 'appreciation_send', sourceId: send.id });

  // Step 3: 수신자 포인트 지급 (serviceKey 없이 — 예산 무관)
  await grantPoint({ userId: toUserId, amount,
    sourceType: 'appreciation_receive', sourceId: send.id });
});
```

원자성 보장: 중간 실패 시 전체 롤백.

### 3-4. API 계약

```
POST /api/v1/appreciation/send
  body: { targetType, targetId, amount }
  auth: required (로그인 필수)
  response: { success, data: { sendId, amount, toUserId } }

GET  /api/v1/appreciation/my-sent?page=&limit=
  auth: required
  response: { success, data: { items: AppreciationSend[], total } }

GET  /api/v1/appreciation/:targetType/:targetId/summary
  auth: optional
  response: { success, data: { totalAmount, sendCount } }
```

### 3-5. sourceType 신규 값

```typescript
// credit_transactions.sourceType에 추가 (varchar(50) — migration 불필요)
'appreciation_send'     // 송신자 SPEND 트랜잭션
'appreciation_receive'  // 수신자 EARN 트랜잭션
```

---

## 4. Phase 2 이관 항목

| 항목 | 이관 이유 | 재개 조건 |
|------|---------|---------|
| LMS Lesson 감사 | 제작자 2-hop 조회 복잡도 | Phase 1 안정화 후 |
| 목록 감사 총액 표시 | 비정규화 컬럼 추가 필요 | 활성 사용 데이터 확인 후 |
| 이상 거래 모니터링 | 운영 데이터 필요 | 실제 사용 패턴 관측 후 |
| 일별 전송 합산 한도 | 복잡도 높음 | Phase 1 남용 패턴 관측 후 |
| Forum Comment 감사 | 대화 vs 가치 표현 경계 불명확 | 커뮤니티 방향 확정 후 |

---

## 5. UI 배치 확정

### Phase 1 배치 원칙

```
상세 페이지:  [❤️ 좋아요 123]  [🎁 감사하기]
목록/카드:   [❤️ 123]           (감사 표시 없음)
마이페이지:  포인트 내역에 appreciation_send / receive 항목 표시
```

- 감사하기 버튼 → 금액 입력 모달 (1P ~ 100P 슬라이더 또는 직접 입력)
- 모달 확인 전 잔액 표시 필수

---

## 6. 후속 구현 WO 목록

| WO | 범위 | 선행 조건 |
|----|------|---------|
| WO-O4O-APPRECIATION-POINT-BACKEND-V1 | `AppreciationService`, `appreciation_sends` 테이블, API 3개, sourceType 추가 | 이 문서 확정 |
| WO-O4O-APPRECIATION-POINT-UI-V1 | 상세 페이지 감사하기 버튼, 금액 입력 모달, 마이페이지 내역 | Backend WO 완료 |
| WO-O4O-APPRECIATION-POINT-PHASE2-V1 | LMS Lesson, 목록 총액, 모니터링 | Phase 1 운영 후 |

---

*확정: 2026-05-22*
*Version: 1.0*
*Status: Active Policy — 구현 WO의 계약 기준*
