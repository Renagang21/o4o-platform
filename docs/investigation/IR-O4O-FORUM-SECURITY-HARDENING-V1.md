# IR-O4O-FORUM-SECURITY-HARDENING-V1

> Investigation & Hardening Report: Forum Security Hardening
> WO-O4O-FORUM-SECURITY-HARDENING-V1
> 2026-02-24

---

## 1. Phase 1: F-3 SQL Injection 차단 (최우선)

**파일**: `apps/api-server/src/modules/forum/forum-query.service.ts`
**메서드**: `getForumAnalytics()` (line 341)

### 문제

`organizationId`를 JavaScript 템플릿 리터럴로 SQL에 직접 삽입:

```typescript
// BEFORE (취약)
const scopeFilter = this.config.scope === 'community'
  ? 'p.organization_id IS NULL'
  : `p.organization_id = '${this.config.organizationId}'`;  // SQL Injection
```

이 패턴이 3개 scope filter 변수(`scopeFilter`, `catScopeFilter`, `commentScopeFilter`)에 동일하게 적용되어, 3개 병렬 쿼리 모두 취약.

### 수정

parameterized query로 전환. PostgreSQL `$1` 바인딩 사용:

```typescript
// AFTER (안전)
const isCommunity = this.config.scope === 'community';
const params = isCommunity ? [] : [this.config.organizationId];
const scopeFilter = isCommunity
  ? 'p.organization_id IS NULL'
  : 'p.organization_id = $1';

// 각 쿼리에 params 전달
this.dataSource.query(`...${scopeFilter}...`, params);
```

**효과**: `organizationId`가 SQL 파서가 아닌 PostgreSQL 바인딩을 통해 전달됨. SQL Injection 불가.

### 참고: 기존 안전 메서드

동일 파일의 다른 메서드(`listRecentPosts`, `listForumHub`, `listForumActivity`, `listPinnedPosts`)는 이미 `$1`, `$2` parameterized 패턴 사용 — 정상.

`orderBy` 변수(`listForumHub`, `listForumActivity`)는 switch/case 화이트리스트 패턴 — Injection 아님.

---

## 2. Phase 2: F-1 ForumController.getPost() Context Filter

**파일**: `apps/api-server/src/controllers/forum/ForumController.ts`
**메서드**: `getPost()` (line 171)

### 문제

UUID/slug 조건만으로 `findOne()` 실행. `applyContextFilter()` 미호출.
타 조직 게시글을 UUID만으로 직접 접근 가능.

```typescript
// BEFORE (취약)
const post = await this.postRepository.findOne({
  where: isUuid ? { id } : { slug: id },
  relations: ['category', 'author'],
});
```

### 수정

`findOne()` → QueryBuilder 전환 + `applyContextFilter()` 적용:

```typescript
// AFTER (안전)
const ctx = this.getForumContext(req);
const qb = this.postRepository
  .createQueryBuilder('post')
  .leftJoinAndSelect('post.category', 'category')
  .leftJoinAndSelect('post.author', 'author');

if (isUuid) {
  qb.where('post.id = :id', { id });
} else {
  qb.where('post.slug = :slug', { slug: id });
}

this.applyContextFilter(qb, 'post', ctx);
const post = await qb.getOne();
```

**효과**: scope 필터가 적용되어 타 조직/커뮤니티 경계 넘어서 게시글 접근 불가.

| Scope | 동작 |
|-------|------|
| community | `organizationId IS NULL` 조건 추가 — 조직 게시글 접근 차단 |
| organization | `organizationId = :ctxOrgId` 조건 추가 — 타 조직 게시글 접근 차단 |
| demo | `1 = 0` — 모든 게시글 접근 차단 |
| admin (no ctx) | 필터 없음 — 전체 접근 유지 |

---

## 3. Phase 3: F-2 ForumController.listComments() Parent Scope 검증

**파일**: `apps/api-server/src/controllers/forum/ForumController.ts`
**메서드**: `listComments()` (line 797)

### 문제

`postId`로 댓글을 직접 조회하되, 부모 게시글이 현재 scope에 속하는지 검증하지 않음.
타 조직 게시글의 `postId`를 알면 댓글 목록을 열람 가능.

```typescript
// BEFORE (취약)
const [comments, totalCount] = await this.commentRepository.findAndCount({
  where: { postId, status: CommentStatus.PUBLISHED },
  ...
});
```

### 수정

댓글 조회 전 부모 게시글 scope 검증 추가:

```typescript
// AFTER (안전)
const ctx = this.getForumContext(req);

// 부모 게시글이 현재 scope 내 존재하는지 확인
const postQb = this.postRepository
  .createQueryBuilder('post')
  .where('post.id = :postId', { postId });
this.applyContextFilter(postQb, 'post', ctx);
const parentPost = await postQb.getOne();

if (!parentPost) {
  res.status(404).json({ success: false, error: 'Post not found' });
  return;
}

// 이후 기존 댓글 조회 진행
```

**효과**: 부모 게시글이 scope 밖이면 404 반환. 댓글 정보 유출 차단.

---

## 4. 변경 파일 목록

| 파일 | 이슈 | 변경 내용 |
|------|------|----------|
| `apps/api-server/src/modules/forum/forum-query.service.ts` | F-3 | string interpolation → parameterized query ($1 바인딩) |
| `apps/api-server/src/controllers/forum/ForumController.ts` | F-1 | `getPost()`: findOne → QueryBuilder + applyContextFilter |
| `apps/api-server/src/controllers/forum/ForumController.ts` | F-2 | `listComments()`: 부모 게시글 scope 검증 추가 |

---

## 5. DoD 검증

| # | 기준 | 상태 |
|---|------|------|
| 1 | F-3: getForumAnalytics SQL Injection 차단 | **PASS** — parameterized query 전환 |
| 2 | F-1: getPost() scope 필터 적용 | **PASS** — applyContextFilter 추가 |
| 3 | F-2: listComments() 부모 게시글 scope 검증 | **PASS** — 부모 확인 후 댓글 조회 |
| 4 | Forum 구조 변경 없음 | **PASS** — 테이블/Entity 미변경 |
| 5 | 기능 추가 없음 | **PASS** — 보안 강화만 수행 |
| 6 | tsc --noEmit PASS | **PASS** — 신규 에러 없음 |

---

## 6. Build 결과

```
api-server: tsc --noEmit PASS (기존 에러만, 신규 에러 0건)
```

---

*Generated: 2026-02-24*
*WO: WO-O4O-FORUM-SECURITY-HARDENING-V1*
*Status: Phase 1-4 Complete*
