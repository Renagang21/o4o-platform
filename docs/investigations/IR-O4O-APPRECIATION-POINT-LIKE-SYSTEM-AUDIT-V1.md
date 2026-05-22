# IR-O4O-APPRECIATION-POINT-LIKE-SYSTEM-AUDIT-V1

> **조사 목적**: O4O 플랫폼에 **기여 감사 포인트(Appreciation Point)** 구조를 도입하기 위한 사전 조사.
> 좋아요(감정 표현)와 감사 포인트(가치 표현)를 어떻게 구조적으로 병존시킬 것인가.
>
> **상태**: 조사 완료 (2026-05-22)
> **코드 수정**: 없음

---

## 핵심 철학 정리

```
서비스 운영 보상   = 서비스 운영자 예산 (service_point_budgets)
기여 감사 포인트   = 사용자 → 제작자 자발적 가치 표현
```

| 구분 | 좋아요 | 감사 포인트 |
|------|--------|------------|
| 발화 | 감정 ("좋다") | 가치 ("도움됐다") |
| 비용 | 무료 | 사용자 보유 포인트 차감 |
| 수신자 | 없음 (집계만) | 제작자 계정 포인트 증가 |
| 재전송 | 토글 (취소 가능) | 단방향 (취소 불가) |
| 금액 | N/A | 사용자가 직접 결정, 0P 가능 |
| 예산 | N/A | service_point_budgets 사용 안 함 |

---

## 1. 기존 Like 구조 조사

### 1-1. Forum Post Like

| 항목 | 내용 |
|------|------|
| Entity | `packages/forum-core/src/backend/entities/ForumPostLike.ts` |
| 테이블 | `forum_post_like` |
| 필드 | `id`, `postId`, `userId`, `createdAt` |
| 중복 방지 | `UNIQUE (postId, userId)` — DB 제약 |
| likeCount | `forum_post.likeCount` (비정규화 INT) |
| Controller | `apps/api-server/src/controllers/forum/ForumPostController.ts:542-610` |
| API | `POST /forum/posts/:id/like` |
| 토글 방식 | 존재 → unlike(삭제), 미존재 → like(추가) |
| targetType 컬럼 | **없음** — Forum Post 전용 |

### 1-2. Content Recommendation (Like 패턴)

| 항목 | 내용 |
|------|------|
| Entity | `apps/api-server/src/entities/CmsContentRecommendation.entity.ts` |
| 테이블 | `cms_content_recommendations` |
| 필드 | `id`, `contentId`, `userId`, `createdAt` |
| 중복 방지 | `UNIQUE (contentId, userId)` |
| likeCount | `cms_contents.likeCount` (비정규화 INT) |
| KPA 전용 | `kpa_content_recommendations` 별도 테이블 존재 |

### 1-3. Like 구조 공통 패턴

```
domain_like 테이블
  └── {domainId}    ← 대상 ID
  └── userId        ← 누가 눌렀나
  └── createdAt
  └── UNIQUE (domainId, userId)

domain 테이블
  └── likeCount     ← 비정규화 INT (빠른 조회용)
```

### 1-4. Like 확장 가능성 평가

- **현재 구조**: 각 도메인마다 별도 테이블 (`forum_post_like`, `cms_content_recommendations`)
- **targetType 컬럼 없음** → 다중 대상 일반화 테이블은 현재 미구현
- **확장 방식 선택지**:
  - A) 도메인별 테이블 계속 추가 (현재 패턴 유지)
  - B) `appreciation_sends` 단일 테이블 신설 (`targetType` + `targetId`)
- **결론**: 감사 포인트는 포인트 이전이 핵심이므로 Like 테이블과 **별도 구조 권장**

---

## 2. 콘텐츠 제작자 식별 구조

### 2-1. 도메인별 제작자 필드

| 도메인 | Entity 파일 | 테이블 | 제작자 필드 | Nullable |
|--------|------------|--------|------------|---------|
| Forum Post | `packages/forum-core/src/backend/entities/ForumPost.ts` | `forum_post` | `authorId` | ✅ nullable |
| LMS Course | `packages/interactive-content-core/src/entities/Course.ts` | `lms_courses` | `instructorId` | ❌ not null |
| LMS Lesson | `packages/interactive-content-core/src/entities/Lesson.ts` | `lms_lessons` | *(직접 없음 — courseId → Course.instructorId)* | — |
| CMS Content | `packages/cms-core/src/entities/CmsContent.entity.ts` | `cms_contents` | `createdBy` | ✅ nullable |
| KPA Content | `apps/api-server/src/routes/kpa/entities/kpa-content.entity.ts` | `kpa_contents` | `created_by` | ✅ nullable |
| GlycoPharm Content | `apps/api-server/src/routes/glycopharm/entities/glycopharm-content.entity.ts` | `glycopharm_contents` | `created_by` | ✅ nullable |
| Forum Comment | `packages/forum-core/src/backend/entities/ForumComment.ts` | `forum_comment` | `authorId` | ✅ nullable |

### 2-2. 필드명 불일치 문제

```
authorId      ← Forum Post, Forum Comment
instructorId  ← LMS Course
createdBy     ← CMS Content, KPA Content
created_by    ← GlycoPharm Content (snake_case)
```

→ **감사 포인트 서비스 레이어에서 targetType별 제작자 ID 추출 로직 필요**

### 2-3. Nullable 위험

`authorId`가 null인 게시글에는 감사 포인트를 보낼 수 없음.
→ 제작자 식별 불가 케이스 차단 로직 필요.

---

## 3. credit_balances 재사용 가능성

### 3-1. 현재 구조

```
credit_balances
  └── id (uuid, PK)
  └── userId (uuid, UNIQUE)   ← 사용자당 1개 레코드
  └── balance (int, default 0)
  └── created_at / updated_at

credit_transactions
  └── id (uuid, PK)
  └── userId (uuid)            ← 수신자 또는 차감자
  └── amount (int)             ← 음수 가능 (SPEND 타입)
  └── transactionType (earn|spend|adjust)
  └── sourceType (varchar 50)
  └── sourceId (uuid, nullable)
  └── referenceKey (varchar 255, UNIQUE partial)
  └── description (varchar 500)
  └── created_at
  ⚠️ fromUserId 컬럼 없음
  ⚠️ toUserId 컬럼 없음
```

### 3-2. User-to-User 이전 구현 가능성

**현재 서비스 재조합으로 가능하나, 2단계 트랜잭션 필요:**

```typescript
// Step 1: A 잔액 차감
spendPoint({ userId: fromUserId, amount, referenceKey: `appreciation:...:spend`, ... })

// Step 2: B 잔액 증가 (serviceKey 없이 — 예산 무관)
grantPoint({ userId: toUserId, amount, serviceKey: undefined, referenceKey: `appreciation:...:grant`, ... })
```

**serviceKey 미전달 시 예산 체크 완전 스킵 확인:**
```typescript
// PointService.grantPoint() — serviceKey 없으면 예산 무관 직접 지급
if (params.serviceKey) {
  // 예산 체크 및 차감
}
return CreditService.getInstance().earnCredit(...);  // serviceKey 없으면 여기로 직행
```

→ **service_point_budgets 완전 격리 확인** ✅

### 3-3. 원자성 문제

- `spendPoint`와 `grantPoint` 각각 독립 DB 트랜잭션
- 중간 실패 시 A 잔액만 차감되고 B는 미지급 가능성
- **별도 AppDataSource.transaction() 래핑 필수**

---

## 4. transaction 구조 분석

### 4-1. 기존 sourceType 목록

```typescript
CreditSourceType:
  'lesson_complete'
  'quiz_pass'
  'course_complete'

PointSourceType 추가:
  'admin_grant'
  'admin_spend'
  'admin_adjust'
  'survey_complete'
  'reward_payout_offline' | 'reward_payout_voucher' | 'reward_payout_survey' | 'reward_payout_course' | 'reward_payout_other'
```

### 4-2. appreciation_point 신규 sourceType 후보

```typescript
'appreciation_send'    // 보내는 쪽 (SPEND 트랜잭션)
'appreciation_receive' // 받는 쪽 (EARN 트랜잭션)
```

또는 단일:
```typescript
'appreciation_point'   // 양쪽 모두 (sourceType으로 구분)
```

### 4-3. referenceKey 후보

```
appreciation:{fromUserId}:{targetType}:{targetId}
```

예시:
```
appreciation:52a4c1e6:forum_post:f63cf424
appreciation:52a4c1e6:lms_course:9ab1234f
appreciation:52a4c1e6:content:7cd8910e
```

**특징:**
- `fromUserId` + `targetType` + `targetId` 조합으로 대상별 1회 전송 강제 가능
- 또는 무제한 허용 시 timestamp 추가: `appreciation:{fromUserId}:{targetType}:{targetId}:{ts}`

### 4-4. fromUserId 컬럼 부재 문제

현재 `credit_transactions`에 `fromUserId`가 없어 이전 추적이 어려움.
- **단기 해결**: `sourceId`에 `fromUserId`를 저장, `description`에 명시
- **장기 해결**: `credit_transactions`에 `fromUserId` 컬럼 추가 (migration 필요)
- **Phase 1 권장**: sourceId = targetId(대상 콘텐츠 ID), referenceKey 패턴으로 from 추적

---

## 5. 감사 대상 후보

### 5-1. Phase 1 포함 대상

| 대상 | targetType | 제작자 필드 | 비고 |
|------|-----------|------------|------|
| Forum Post | `forum_post` | `authorId` | Nullable 주의 |
| LMS Course | `lms_course` | `instructorId` | Not null — 안전 |
| CMS/KPA Content | `content` | `createdBy` / `created_by` | Nullable 주의 |

### 5-2. Phase 1 제외 대상

| 대상 | 제외 이유 |
|------|---------|
| Survey | 운영 예산 구조 — 별개 시스템 |
| Forum Comment | 댓글은 가치 표현보다 대화 — Phase 2 검토 |
| LMS Lesson | instructor가 Course 통해 간접 참조 — 복잡도 높음 |
| Document/Resource | 구조 불명확 — Phase 2 검토 |

### 5-3. LMS Lesson → Course 제작자 조회 경로

```
lms_lessons.courseId → lms_courses.instructorId
```
Lesson에 감사 시 Course의 instructorId에게 지급 가능.
Phase 2에서 별도 처리.

---

## 6. UI 구조 분석

### 6-1. 기존 좋아요 UI 컴포넌트

| 컴포넌트 | 파일 | 현재 좋아요 UI |
|---------|------|--------------|
| PostList | `packages/forum-core/src/templates/PostList.tsx:173-178` | ❤️ + likeCount (클릭 불가, 표시만) |
| PostSingle | `packages/forum-core/src/templates/PostSingle.tsx` | onLike 콜백 + isLiked 토글 |
| ContentMetaBar | `packages/ui/src/content-discovery/ContentMetaBar.tsx:200-224` | 👍 + likeCount 버튼형 |
| CommentSection | `packages/forum-core/src/public-ui/components/CommentSection.tsx:324-342` | ❤️ SVG 버튼 토글 |

### 6-2. 감사 포인트 UI 병존 방안

**방안 A: 나란히 배치 (추천)**
```
[❤️ 좋아요 123]  [🎁 감사하기]
```
- 좋아요: 즉시 토글, 비용 없음
- 감사하기: 모달 → 금액 입력 → 전송

**방안 B: 통합 버튼**
```
[❤️ 123]  [감사 340P]
```

**방안 C: 상세 페이지 전용**
- 목록에서는 좋아요만 표시
- 상세 진입 후 감사 포인트 버튼 노출

### 6-3. 카드/목록 UI 영향 범위

| 컴포넌트 | 영향 범위 |
|---------|---------|
| PostList.tsx | 목록 카드 하단 — 좋아요 표시 옆에 감사 집계 추가 가능 |
| PostSingle.tsx | 상세 페이지 — 감사 버튼 주요 위치 |
| ContentMetaBar.tsx | 콘텐츠 카드 메타 — 감사 집계 추가 가능 |
| ResourcesHubTemplate.tsx | 자료실 카드 — `like_count` 옆 추가 가능 |

**Phase 1 권장**: 상세 페이지에만 감사하기 버튼 배치. 목록에는 누적 감사 포인트 총액만 표시.

---

## 7. 오남용 방어 분석

### 7-1. 기존 방어 패턴 (재사용 가능)

| 방어 | 위치 | 코드 |
|------|------|------|
| 잔액 부족 차단 | `PointService.spendPoint():207` | `if (!balance \|\| balance.balance < amount) throw 'INSUFFICIENT_BALANCE'` |
| 0 이하 금액 차단 | `PointService.spendPoint():177` | `if (amount <= 0) throw 'INVALID_AMOUNT'` |
| 중복 처리 방지 | `PointService.spendPoint():185` | `referenceKey` UNIQUE 체크 |
| 예산 격리 | `PointService.grantPoint():108` | `serviceKey` 없으면 예산 무관 |

### 7-2. 신규 방어 필요 항목

| 방어 | 설명 | 구현 방법 |
|------|------|---------|
| 자기 자신 차단 | `fromUserId === toUserId` 금지 | 서비스 레이어 체크 |
| 제작자 미식별 차단 | `authorId / instructorId === null` 금지 | 조회 후 null 체크 |
| 최소 단위 | 1P 이상 강제 | `amount >= 1` 검증 |
| 동일 대상 중복 전송 | 허용 or 일별 1회 제한 | **정책 결정 필요** |
| 최대 전송 한도 | 1회 최대 금액 제한 | **정책 결정 필요** |

### 7-3. 동일 대상 중복 전송 정책 (미결 사항)

**허용 (무제한)**: 팬심, 반복 감사 표현 — 남용 가능
**1일 1회 제한**: referenceKey에 날짜 포함 — `appreciation:{from}:{type}:{id}:{date}`
**횟수 무제한, 금액 일별 합산 제한**: 복잡도 높음

→ **Phase 1 권장: 횟수 무제한 허용** (금액은 잔액으로 자연 제한됨)

---

## 8. 운영 철학 정합성

### 8-1. O4O 커뮤니티 철학과의 정합성

| O4O 가치 | 감사 포인트 기여 |
|---------|--------------|
| 기여 문화 | 좋은 콘텐츠 제작자에게 경제적 피드백 → 제작 동기 강화 |
| 콘텐츠 공유 문화 | 공유 → 활용 → 감사 사이클 → 자발적 생태계 |
| 좋아요 문화 | 좋아요(감정) + 감사 포인트(가치) 2축 → 더 풍부한 표현 |
| 매장 실행 문화 | 강의·자료를 매장에서 활용 후 감사 → 제작자 동기 부여 |

### 8-2. 기존 좋아요와의 철학적 분리

```
좋아요  = "이 내용이 좋다" (즉각적 감정, 비용 없음, 취소 가능)
감사하기 = "이 내용이 실제로 도움됐다" (사후 가치 표현, 비용 있음, 취소 불가)
```

→ 두 개념은 **병존 가능**하며 서로를 대체하지 않음.

### 8-3. 주의: 포인트 생태계 순환

감사 포인트는 **사용자 → 제작자 재분배** 구조.
플랫폼이 포인트를 새로 생성하지 않음.
포인트가 없는 신규 사용자는 감사 표현 불가 → 좋아요로 대체 가능.

---

## 산출물 요약

### 1. 현재 구조

| 항목 | 상태 |
|------|------|
| Like 구조 | 도메인별 별도 테이블, targetType 없음 |
| credit_balances | user당 1개 레코드, 포인트 이전 기반 있음 |
| PointService | spendPoint + grantPoint 조합으로 이전 가능 |
| 제작자 식별 | 도메인별 다른 필드명 (authorId/instructorId/createdBy) |

### 2. 재사용 가능 구조

| 항목 | 재사용 여부 |
|------|-----------|
| `PointService.spendPoint()` | ✅ 그대로 재사용 |
| `PointService.grantPoint()` (serviceKey 없이) | ✅ 그대로 재사용 |
| referenceKey 패턴 | ✅ 패턴 확장 |
| INSUFFICIENT_BALANCE 에러 | ✅ 그대로 재사용 |
| INVALID_AMOUNT 에러 | ✅ 그대로 재사용 |

### 3. 신규 구조 필요 영역

| 항목 | 필요 이유 |
|------|---------|
| `AppreciationService` | 2단계 트랜잭션 + 자기 자신 차단 + 제작자 조회 |
| `appreciation_sends` 테이블 | 감사 이력 별도 관리 (송신자/수신자/대상 추적) |
| sourceType 추가 | `'appreciation_send'`, `'appreciation_receive'` |
| 제작자 resolver | targetType별 toUserId 추출 함수 |

### 4. DB 영향 범위

| 테이블 | 변경 내용 |
|--------|---------|
| `credit_transactions` | sourceType varchar(50) — 신규 값 추가만 (migration 불필요) |
| `appreciation_sends` | **신규 테이블** (migration 필요) |
| `lms_courses`, `forum_post` 등 | 감사 누적 집계 컬럼 추가 옵션 (선택) |

### 5. API 영향 범위

```
POST /api/v1/appreciation/send
  body: { targetType, targetId, amount }
  auth: required
  → 제작자 조회 → spendPoint(from) → grantPoint(to) → 이력 기록

GET  /api/v1/appreciation/my-sent?limit=&page=
GET  /api/v1/appreciation/{targetType}/{targetId}/summary
  → 대상 콘텐츠의 감사 총액 조회
```

### 6. UI 영향 범위

| 위치 | 변경 |
|------|------|
| PostSingle (상세) | 🎁 감사하기 버튼 추가 + 금액 입력 모달 |
| PostList (목록) | 감사 총액 표시 옵션 (선택) |
| ContentMetaBar | 감사 집계 표시 추가 |
| 마이페이지 포인트 내역 | appreciation_send / receive 항목 표시 |

### 7. 악용 가능성

| 위험 | 가능성 | 대응 |
|------|--------|------|
| 자기 자신에게 전송 | 계정 분리 후 포인트 순환 | fromUserId !== toUserId 강제 |
| 잔액 없는 전송 | — | INSUFFICIENT_BALANCE 기존 로직 |
| 0P 악의적 전송 | — | amount >= 1 강제 |
| 봇 다중 전송 | 낮음 (실제 포인트 소비) | Phase 1은 허용 |

### 8. 최소 Phase 1 구현안

```
[신규]
AppreciationService
  - sendAppreciation(fromUserId, targetType, targetId, amount)
  - getReceivedSummary(targetType, targetId)
  - getMySentHistory(userId, page, limit)

[신규 테이블]
appreciation_sends
  id, from_user_id, to_user_id, target_type, target_id, amount, created_at

[기존 재사용]
PointService.spendPoint()   — 송신자 차감
PointService.grantPoint()   — 수신자 지급 (serviceKey 없이)

[신규 sourceType]
'appreciation_send'    — credit_transactions (SPEND)
'appreciation_receive' — credit_transactions (EARN)

[API]
POST /api/v1/appreciation/send
GET  /api/v1/appreciation/my-sent
GET  /api/v1/appreciation/:targetType/:targetId/summary

[UI]
상세 페이지 감사하기 버튼 + 금액 입력 모달
마이페이지 포인트 내역 항목 표시
```

---

## 미결 사항 (WO 작성 전 결정 필요)

| 항목 | 선택지 |
|------|--------|
| 동일 대상 반복 전송 | 무제한 vs 일별 1회 |
| 최대 1회 전송 한도 | 없음 vs 일정 금액 상한 |
| 목록에서 감사 총액 표시 여부 | 표시 vs 상세에서만 |
| LMS Lesson 지원 | Phase 1 포함 vs Phase 2 |
| appreciation_sends 테이블 필요 여부 | 신설 vs credit_transactions만으로 |
| fromUserId 추적 방법 | referenceKey 파싱 vs 컬럼 추가 |

---

*작성: 2026-05-22*
*상태: 조사 완료 — WO 작성 대기*
