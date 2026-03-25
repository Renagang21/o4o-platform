# IR-O4O-USER-DASHBOARD-FORUM-ROLE-REDEFINITION-V1

> 사용자 대시보드 Forum 메뉴의 역할 재정의 조사 보고서

- **작성일**: 2026-03-23
- **상태**: 조사 완료
- **조사 대상**: 전 서비스 (Neture / GlycoPharm / KPA Society / K-Cosmetics / GlucoseView)

---

## 1. 조사 요약 (Executive Summary)

사용자 대시보드의 Forum 메뉴는 **GlycoPharm의 pharmacy 역할 사이드바에만 존재**하며, 이 메뉴는 공개 포럼 허브(`ForumHubPage`)로 연결된다. 커뮤니티 Forum과 **완전 중복**이다.

한편 "내 포럼 관리" 기반은 **부분적으로 이미 존재**한다:
- Backend: `forum_category_requests` API 완비 (생성/조회/수정/상태추적)
- Frontend: GlycoPharm에 `/forum/my-requests`, `/forum/request-category` 페이지 존재
- Data Model: `ForumCategory.createdBy` 필드 존재

**결론: 대시보드 Forum은 "내 포럼 관리" 중심으로 재정의가 적절하다 (Option C).**

---

## 2. 조사 대상 파일 목록

### 대시보드 Forum 관련
| 파일 | 역할 |
|------|------|
| `services/web-glycopharm/src/components/layouts/DashboardLayout.tsx:87` | pharmacy 사이드바 → `/forum` 메뉴 정의 |
| `services/web-glycopharm/src/pages/forum/ForumHubPage.tsx` | 대시보드 Forum이 가리키는 실제 페이지 (공개 허브) |
| `services/web-glycopharm/src/pages/forum/MyRequestsPage.tsx` | 내 포럼 신청 내역 (이미 존재) |
| `services/web-glycopharm/src/pages/forum/RequestCategoryPage.tsx` | 포럼 생성 신청 폼 (이미 존재) |
| `services/web-kpa-society/src/components/branch-operator/BranchOperatorLayout.tsx` | 분회 운영자 `게시판`+`포럼 관리` 메뉴 |

### 커뮤니티 Forum 관련
| 파일 | 역할 |
|------|------|
| `services/web-*/src/pages/forum/ForumHubPage.tsx` | 각 서비스 공개 포럼 허브 |
| `services/web-*/src/pages/forum/ForumPage.tsx` | 게시글 목록 (테이블) |
| `services/web-*/src/pages/forum/ForumWritePage.tsx` | 글쓰기 |
| `services/web-kpa-society/src/pages/forum/ForumHomePage.tsx` | KPA 포럼 홈 (허브+섹션 복합) |

### Backend API
| 파일 | 역할 |
|------|------|
| `apps/api-server/src/routes/forum/forum-category-request.routes.ts` | 포럼 카테고리 신청 API |
| `apps/api-server/src/services/forum/ForumCategoryRequestService.ts` | 신청 비즈니스 로직 |
| `packages/forum-core/src/backend/entities/ForumCategory.ts` | 포럼 카테고리 엔티티 (`createdBy` 포함) |
| `packages/forum-core/src/backend/entities/ForumCategoryRequest.ts` | 포럼 신청 엔티티 |

---

## 3. 현재 대시보드 Forum 구조

### 3.1 서비스별 대시보드 Forum 메뉴 현황

| 서비스 | 대시보드 Forum 메뉴 | 라우트 | 실제 화면 |
|--------|:---:|--------|--------|
| **GlycoPharm** (pharmacy) | ✅ 있음 | `/forum` | ForumHubPage (공개 허브) |
| **GlycoPharm** (operator) | ✅ 있음 | `/operator/forum-management` | Operator 전용 관리 |
| **Neture** (supplier) | ❌ 없음 | — | — |
| **K-Cosmetics** (partner) | ❌ 없음 | — | — |
| **KPA Society** (branch op) | ✅ 있음 | `/branch-services/:id/operator/forum` | Branch 운영자 포럼 관리 |
| **GlucoseView** | ❌ 없음 | — | 포럼 미구현 |

### 3.2 GlycoPharm pharmacy 대시보드 Forum 분석

```
사이드바 메뉴: "포럼" (MessageSquare 아이콘)
  → path: /forum
  → 렌더링: ForumHubPage.tsx
  → 내용:
    - 전체 포럼 카테고리 카드 (다음 카페 스타일)
    - 인기글/최신글 섹션
    - 글쓰기 CTA
    - 검색/필터
```

**판정: 100% "일반 포럼 이용" 화면. 관리 기능 없음.**

이 화면은 커뮤니티에서 `/forum`으로 진입해도 동일하게 표시된다. 대시보드 안에서 같은 페이지를 보여주는 것이므로 **역할 중복**.

---

## 4. 현재 커뮤니티 Forum 구조

### 4.1 서비스별 커뮤니티 Forum 라우트

| 서비스 | 커뮤니티 진입 | 포럼 라우트 |
|--------|-------------|-----------|
| Neture | `/community` | `/community/forum` → Hub, `/community/forum/posts` → 목록 |
| GlycoPharm | `/community` | `/forum` → Hub, `/forum/posts` → 목록 |
| K-Cosmetics | `/community` | `/forum` → Hub, `/forum/posts` → 목록 |
| KPA Society | `/community` | `/forum` → Home, `/forum/all` → 전체 목록 |

### 4.2 커뮤니티 Forum이 제공하는 기능

- ✅ 포럼 허브 (카테고리 카드 탐색)
- ✅ 게시글 목록 (검색, 필터, 정렬, 페이지네이션)
- ✅ 게시글 상세 (내용, 댓글, 좋아요)
- ✅ 글쓰기 (카테고리 선택, 리치텍스트 에디터)
- ✅ 댓글 작성/수정/삭제
- ✅ 좋아요/좋아요 취소
- ✅ 고정글(Pinned) 표시

**판정: 커뮤니티가 이미 "일반 포럼 이용 공간" 역할을 충분히 수행하고 있다.**

---

## 5. 역할 중복/혼선 분석

```
┌─────────────────────────────────────────────────────────┐
│  현재 구조                                                │
│                                                           │
│  대시보드 Forum ──┐                                        │
│                    ├─→ ForumHubPage (동일 컴포넌트)        │
│  커뮤니티 Forum ──┘                                        │
│                                                           │
│  결과: 두 진입점이 같은 화면을 보여줌 → 역할 중복           │
└─────────────────────────────────────────────────────────┘
```

| 비교 항목 | 대시보드 Forum | 커뮤니티 Forum |
|-----------|:---:|:---:|
| 전체 포럼 카테고리 표시 | ✅ | ✅ |
| 게시글 목록/검색 | ✅ (링크 이동) | ✅ |
| 글쓰기 | ✅ (링크 이동) | ✅ |
| 내 포럼 관리 | ❌ | ❌ |
| 포럼 신청 현황 | ❌ | ❌ (별도 `/forum/my-requests`) |
| 포럼 수정/삭제 | ❌ | ❌ |

**핵심 문제: 대시보드는 "관리" 공간인데, Forum 메뉴가 "이용" 화면을 보여준다.**

---

## 6. 사용자 관리 포럼 기능 존재 여부

### 6.1 이미 존재하는 기반

| 기능 | Backend | Frontend | 상태 |
|------|:---:|:---:|------|
| 포럼 생성 신청 | ✅ `POST /api/v1/forum/category-requests` | ✅ `RequestCategoryPage` (GlycoPharm) | 완성 |
| 내 신청 목록 조회 | ✅ `GET /api/v1/forum/category-requests/my` | ✅ `MyRequestsPage` (GlycoPharm) | 완성 |
| 신청 상세 조회 | ✅ `GET /api/v1/forum/category-requests/:id` | ✅ (MyRequestsPage 내 확장) | 완성 |
| 대기 중 신청 수정 | ✅ `PATCH /api/v1/forum/category-requests/:id` | ❌ | API만 존재 |
| 내가 만든 포럼 목록 | ❌ (createdBy 필드 존재, 전용 API 없음) | ❌ | 미구현 |
| 포럼 수정/삭제 요청 | ❌ | ❌ | 미구현 |
| 내 포럼 통계 | ❌ | ❌ | 미구현 |

### 6.2 데이터 모델 기반

```typescript
// ForumCategory Entity (forum-core)
createdBy?: string;         // ← 포럼 생성자 UUID (이미 존재)
organizationId?: string;
forumType!: string;         // 'open' | 'managed'
isOrganizationExclusive!: boolean;
```

```typescript
// ForumCategoryRequest Entity
status: 'pending' | 'revision_requested' | 'approved' | 'rejected'
requesterId: string;
createdCategoryId?: string;  // 승인 시 생성된 카테고리 ID
```

**판정: Backend 기반은 60% 존재. Frontend "내 포럼 관리" 통합 대시보드만 부재.**

---

## 7. 서비스별 패턴 비교

| 항목 | Neture | GlycoPharm | KPA Society | K-Cosmetics | GlucoseView |
|------|--------|-----------|-------------|-------------|-------------|
| 대시보드 Forum | 없음 | ✅ 공개 허브 (중복) | Branch 운영자 전용 | 없음 | 미구현 |
| 커뮤니티 Forum | ✅ 완성 | ✅ 완성 | ✅ 완성 | ✅ 완성 | 없음 |
| 포럼 신청 UI | 없음 | ✅ 있음 | API만 | 없음 | 없음 |
| Operator 관리 | ✅ 있음 | ✅ 있음 | ✅ 있음 | ✅ 있음 (기본) | 없음 |
| 대시보드 재정의 필요 | 해당 없음 | **필요** | Branch OP는 별도 | 해당 없음 | 해당 없음 |

**공통화 가능성**: GlycoPharm에서 먼저 구현 → 패턴 확립 → 다른 서비스 확산 가능

---

## 8. 필수 질문 답변

### Q1. 현재 사용자 대시보드의 Forum 메뉴는 실제로 어떤 화면을 보여주는가?

**GlycoPharm pharmacy 사이드바의 "포럼" 메뉴 → `/forum` → `ForumHubPage`**

전체 포럼 카테고리 카드를 다음 카페 스타일로 표시하는 공개 허브 화면이다. 사용자 관련 필터링/관리 기능은 전혀 없다.

### Q2. 그 화면은 "내 포럼 관리"보다 "일반 포럼 이용" 성격이 강한가?

**YES — 100% 일반 포럼 이용 화면이다.**

표시 데이터가 전체 포럼 카테고리이며, 사용자별 맥락(내 포럼, 내 신청, 내 활동)이 전혀 반영되지 않는다.

### Q3. 현재 커뮤니티가 이미 일반 포럼 이용 공간 역할을 충분히 하고 있는가?

**YES — 모든 서비스에서 커뮤니티 Forum이 완전한 이용 공간 역할을 수행한다.**

허브 → 목록 → 상세 → 글쓰기 → 댓글 → 좋아요 전 흐름이 구현되어 있다.

### Q4. 대시보드 Forum과 커뮤니티 Forum의 역할이 중복되고 있는가?

**YES — GlycoPharm에서 완전 중복이다.**

대시보드 `/forum`과 커뮤니티 `/forum`이 같은 `ForumHubPage` 컴포넌트를 렌더링한다.

### Q5. 사용자가 관리하는 포럼을 보여줄 기반이 이미 존재하는가?

**부분적으로 YES:**

| 기반 | 상태 |
|------|------|
| 포럼 신청 API | ✅ 완성 |
| 내 신청 목록 API | ✅ 완성 |
| 내 신청 목록 UI (GlycoPharm) | ✅ 완성 (`MyRequestsPage`) |
| 포럼 신청 폼 UI (GlycoPharm) | ✅ 완성 (`RequestCategoryPage`) |
| ForumCategory.createdBy | ✅ 존재 |
| 내가 만든 포럼 목록 API | ❌ 미구현 |
| 통합 "내 포럼" 대시보드 | ❌ 미구현 |

### Q6. 가입만 한 포럼/일반 참여 포럼은 커뮤니티에서 처리하는 것이 더 자연스러운가?

**YES.** 포럼 탐색/가입/참여/글쓰기는 커뮤니티 영역의 본래 역할이다. 대시보드는 "내가 관리하는 것"을 보여주는 공간이므로 일반 참여와는 성격이 다르다.

### Q7. 대시보드 Forum은 A/B/C 중 무엇이 적절한가?

**C. "내 포럼 관리" 중심으로 재정의가 적절하다.**

근거:
1. 현재 커뮤니티와 완전 중복 → 유지(A)는 의미 없음
2. 일부 조정(B)으로는 역할 분리가 안 됨
3. 대시보드는 "관리" 공간이므로 "내 포럼 관리"가 자연스러움
4. Backend 기반이 60% 이미 존재하여 구현 부담 적음

### Q8. 단순 화면 교체 수준인지, 백엔드/쿼리/API 보강이 필요한지?

**Frontend 중심 + 일부 API 보강 필요:**

| 영역 | 필요 작업 | 난이도 |
|------|----------|:---:|
| Frontend | 대시보드 Forum 페이지를 "내 포럼 관리" 화면으로 교체 | 중 |
| Frontend | 기존 `MyRequestsPage` + `RequestCategoryPage` 통합/리링크 | 하 |
| Backend | `GET /api/v1/forum/categories?createdBy=me` — 내가 만든 포럼 목록 | 하 |
| Backend | 포럼 수정/삭제 요청 API (선택) | 중 |
| Backend | 내 포럼 활동 통계 API (선택) | 중 |

---

## 9. 최종 판단

### 현재 상태

```
대시보드 Forum = 커뮤니티 Forum (중복)
→ 사용자에게 대시보드에서 Forum을 누를 이유가 없음
```

### 재정의 방향

```
대시보드 Forum = "내 포럼 관리" 허브
  ├─ 내가 신청한 포럼 (상태: 대기/보완요청/승인/거절)
  ├─ 내가 운영 중인 포럼 (게시글 수, 활동 통계)
  ├─ 새 포럼 신청하기
  └─ 포럼 관리 진입 (수정/설정)

커뮤니티 Forum = "포럼 이용" 공간 (현행 유지)
  ├─ 전체 포럼 탐색
  ├─ 글 읽기/쓰기
  ├─ 댓글/좋아요
  └─ 검색/필터
```

### 역할 분리 원칙

| 영역 | 역할 | 키워드 |
|------|------|--------|
| 대시보드 Forum | 관리 (Manage) | 내 포럼, 신청, 운영, 상태, 통계 |
| 커뮤니티 Forum | 이용 (Use) | 탐색, 참여, 글쓰기, 토론, 소통 |

---

## 10. 후속 조치 권고

### Phase 1: UI 정리 WO (우선)

**WO-O4O-USER-DASHBOARD-FORUM-MY-FORUM-V1**

- 대시보드 Forum 메뉴 → "내 포럼 관리" 페이지로 교체
- 기존 `MyRequestsPage` 내용을 대시보드 내 카드로 통합
- 기존 `RequestCategoryPage`로의 진입점을 대시보드에 배치
- 커뮤니티 Forum 바로가기 링크 유지 (공존)

### Phase 2: API 보강 WO (선택)

**WO-O4O-FORUM-MY-CATEGORIES-API-V1**

- `GET /api/v1/forum/categories?createdBy=me` — 내가 만든 포럼 목록
- 기존 `ForumCategory.createdBy` 필드 활용
- 내 포럼별 활동 통계 (게시글 수, 최근 활동일)

### Phase 3: 구조 확장 WO (장기)

**WO-O4O-FORUM-OWNER-MANAGEMENT-V1**

- 포럼 소유자가 직접 설명/아이콘/설정 수정
- 포럼 운영 모드 전환 (open ↔ managed)
- 포럼 삭제 요청 (operator 승인 필요)
- 다른 서비스(KPA, K-Cosmetics)로 패턴 확산

---

## 11. 적용 범위

| 서비스 | Phase 1 적용 | 비고 |
|--------|:---:|------|
| GlycoPharm | ✅ 우선 | 유일하게 대시보드 Forum 메뉴 존재 |
| KPA Society | ⏸️ 보류 | Branch OP Forum은 별도 맥락 (운영자 관리) |
| Neture | ⏸️ 보류 | 대시보드에 Forum 메뉴 없음 (필요 시 추가) |
| K-Cosmetics | ⏸️ 보류 | 대시보드에 Forum 메뉴 없음 |
| GlucoseView | ❌ 해당 없음 | 포럼 미구현 |

---

*IR-O4O-USER-DASHBOARD-FORUM-ROLE-REDEFINITION-V1 — 조사 완료*
*2026-03-23*
