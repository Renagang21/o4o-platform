# Forum 상태 모델 (Status Model)

> Phase 19-C: Forum 상태 모델 & 워크플로우 정합 리팩토링
> Updated: 2026-01-28

---

## 1. 개요

Forum Core는 **게시글(Post) 단위의 생명주기 상태**만 정의한다.
"포럼(Forum) 단위 운영 상태"는 Core에 존재하지 않으며, App이 자체 관리한다.

### 책임 경계

| 레이어 | 책임 | 예시 |
|--------|------|------|
| **Forum Core** | 게시글 상태(PostStatus), 게시글 유형(PostType), 댓글 상태(CommentStatus) | `draft`, `publish`, `discussion` |
| **App / Extension** | 포럼 운영 상태, App 고유 유형 | GlycoPharm `ForumStatus`, `PostType: 'normal'\|'notice'` |

---

## 2. Core 상태 정의

### 2-1. PostStatus — 게시글 생명주기 상태

| 값 | 의미 |
|----|------|
| `draft` | 작성 중 — 비공개, 작성자만 조회 가능 |
| `publish` | 공개 — 정상 노출 |
| `pending` | 승인 대기 — `requireApproval` 카테고리에서 사용 |
| `rejected` | 반려 — 운영자가 거부 |
| `archived` | 보관 — 공개 목록에서 숨김, 직접 링크로 조회 가능 |

**정의 위치:**
- Backend enum: `packages/forum-core/src/backend/entities/ForumPost.ts` → `PostStatus`
- Frontend type: `packages/types/src/forum.ts` → `ForumPostStatus`

### 2-2. PostType — 게시글 콘텐츠 성격 분류

| 값 | 의미 |
|----|------|
| `discussion` | 일반 토론 (기본값) |
| `question` | 질문 |
| `announcement` | 공지사항 |
| `poll` | 투표 |
| `guide` | 가이드/안내 |

**정의 위치:**
- Backend enum: `packages/forum-core/src/backend/entities/ForumPost.ts` → `PostType`
- Frontend type: `packages/types/src/forum.ts` → `ForumPostType`

### 2-3. CommentStatus — 댓글 상태

| 값 | 의미 |
|----|------|
| `publish` | 공개 — 정상 노출 |
| `pending` | 승인 대기 |
| `deleted` | 삭제됨 — soft delete |

**정의 위치:**
- Backend enum: `packages/forum-core/src/backend/entities/ForumComment.ts` → `CommentStatus`
- Frontend type: `packages/types/src/forum.ts` → `ForumCommentStatus`

### 2-4. CategoryAccessLevel — 카테고리 접근 수준

| 값 | 의미 |
|----|------|
| `all` | 모든 사용자 |
| `member` | 회원만 |
| `business` | 비즈니스 회원만 |
| `admin` | 관리자만 |

**정의 위치:**
- Backend: `packages/forum-core/src/backend/entities/ForumCategory.ts` → inline enum column
- Frontend type: `packages/types/src/forum.ts` → `ForumCategoryAccessLevel`

---

## 3. Core에 **없는** 개념 (의도적 제외)

### 3-1. "포럼 단위 운영 상태" (ForumStatus)

Core는 개별 게시글/댓글의 상태만 관리한다.
"포럼 전체를 읽기전용으로 전환" 같은 운영 상태는 Core의 범위가 아니다.

**이유:** 운영 상태는 서비스 정책에 종속되므로, 각 App이 자체 정의해야 한다.

현재 사용 중인 App:
- **GlycoPharm**: `ForumStatus = 'open' | 'readonly' | 'closed'`
  - 정의: `services/web-glycopharm/src/types/forum.ts`
  - 포럼 신청 → 승인 → 운영 워크플로우에서 사용

### 3-2. App 고유 PostType

Core의 `PostType`은 5개 유형으로 고정되어 있다.
App에서 다른 유형 체계가 필요한 경우, Core를 확장하지 않고 App-level 매핑을 사용한다.

현재 사용 중인 App:
- **GlycoPharm**: `PostType = 'normal' | 'notice'`
  - 정의: `services/web-glycopharm/src/types/forum.ts`
  - Core의 `ForumPostType`과 별개 체계

---

## 4. 타입 참조 규칙

### Frontend에서 Core 타입 사용

```typescript
// ✅ 올바른 사용: @o4o/types/forum에서 import
import type { ForumPostType, ForumPostStatus } from '@o4o/types/forum';

// ✅ Alias 허용 (기존 코드 호환)
export type PostType = ForumPostType;

// ❌ 금지: 동일한 값을 로컬에서 재정의
type PostType = 'discussion' | 'question' | 'announcement' | 'poll' | 'guide';
```

### App-level 타입 정의

```typescript
// ✅ App 고유 타입은 Core와 이름이 겹치지 않게 정의
// services/web-glycopharm/src/types/forum.ts
export type ForumStatus = 'open' | 'readonly' | 'closed';  // Core에 없는 개념

// ✅ App 고유 PostType은 명시적으로 "Core와 별개"임을 문서화
export type PostType = 'normal' | 'notice';  // JSDoc에 Core 대비 설명 포함
```

---

## 5. 변경 규칙

- Core의 PostStatus / PostType / CommentStatus 값을 **추가·삭제하려면 Phase 승인**이 필요하다.
- Backend enum과 Frontend string union은 **반드시 동시에** 수정한다.
- App-level 상태는 각 App 내에서 자유롭게 변경 가능하나, Core 타입 이름과 충돌하면 안 된다.

---

## 6. 관련 파일

| 파일 | 역할 |
|------|------|
| `packages/types/src/forum.ts` | Frontend-safe 타입 (SSOT) |
| `packages/forum-core/src/backend/entities/ForumPost.ts` | Backend PostStatus, PostType enum |
| `packages/forum-core/src/backend/entities/ForumComment.ts` | Backend CommentStatus enum |
| `packages/forum-core/src/backend/entities/ForumCategory.ts` | Backend accessLevel column |
| `packages/forum-core/src/backend/types/api-response.ts` | Re-export aggregator |
| `services/web-glycopharm/src/types/forum.ts` | GlycoPharm App-level 타입 |
