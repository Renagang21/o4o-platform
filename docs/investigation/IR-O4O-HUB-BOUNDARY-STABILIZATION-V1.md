# IR-O4O-HUB-BOUNDARY-STABILIZATION-V1

> Investigation & Hardening Report: HUB Boundary Stabilization
> WO-O4O-HUB-BOUNDARY-STABILIZATION-V1
> 2026-02-24

---

## 1. Phase 1 결과: HUB Domain Access Matrix

### HubContentQueryService — CLEAN

| 검사 항목 | 결과 |
|----------|------|
| Forum 테이블 참조 | **없음** |
| Store Ops 테이블 참조 | **없음** |
| Commerce 테이블 참조 | **없음** |
| serviceKey 필터 | **모든 쿼리에 존재** |
| visibility/public 조건 | **CMS: `visibilityScope IN ('platform','service')` + `status='published'`** |
| scope='global' 조건 | **Signage: `scope='global'` + `status='active'`** |
| source 필터 | **Signage: `source IN ('hq','supplier','community')`** |

**판정**: HubContentQueryService는 Broadcast Domain(Content + Signage)만 소비하며, 모든 경계 조건이 정상 적용됨.

### KPA Home Routes — SAFE

| 엔드포인트 | QueryService | 경계 필터 | 상태 |
|-----------|-------------|----------|------|
| `/home/notices` | ContentQueryService | `serviceKey IN ['kpa','kpa-society']`, `status='published'` | SAFE |
| `/home/community` | ForumQueryService | `organization_id IS NULL`, `status='publish'` | SAFE |
| `/home/signage` | SignageQueryService | `serviceKey`, `source IN [...]`, `status='active'` | SAFE |
| `/home/forum-hub` | ForumQueryService | `organizationId IS NULL`, `accessLevel='all'` | SAFE |
| `/home/forum-activity` | ForumQueryService | `organizationId IS NULL`, `status='publish'` | SAFE |

### SignageQueryService — SAFE (이전 WO에서 보강 완료)

- `serviceKey` 필터: 존재
- `status='active'` 필터: 존재
- `deletedAt IS NULL` 필터: **WO-SIGNAGE-CONSISTENCY-HARDENING-V1에서 추가 완료**
- scope 필터: 미적용 (source 필터로 대체)

---

## 2. Phase 2 결과: HUB Guard 강화

HubContentQueryService가 이미 모든 경계 조건을 충족하므로 **추가 Guard 불필요**.

### HUB 경계 선언 확인

| Domain | 조건 | HubContentQueryService 적용 |
|--------|------|---------------------------|
| Content | `visibilityScope IN ('platform','service')` + `status='published'` | **적용됨** |
| Signage | `scope='global'` + `status='active'` + `source IN (hq,supplier,community)` | **적용됨** |
| Forum | HUB 비대상 | **접근 없음 (CLEAN)** |
| Store Ops | HUB 비대상 | **접근 없음 (CLEAN)** |
| Commerce | HUB 비대상 | **접근 없음 (CLEAN)** |

---

## 3. Phase 3 결과: RISK 항목 차단

### R-3: signage extractScope 헤더 스푸핑 — FIXED

**파일**: `apps/api-server/src/routes/signage/controllers/signage.controller.ts:61-73`

**변경 전**:
```typescript
const serviceKey = req.params.serviceKey || req.headers['x-service-key'] as string;
```

**변경 후**:
```typescript
const serviceKey = req.params.serviceKey;
```

**효과**: `x-service-key` 헤더를 통한 서비스 경계 우회 불가. serviceKey는 URL 경로 파라미터에서만 추출.

---

### R-4: signage repository UUID-only mutation — FIXED

**파일**: `apps/api-server/src/routes/signage/repositories/signage.repository.ts`

#### incrementPlaylistDownloadCount (line 1020)

**변경 전**: `playlistId` 단독으로 UPDATE
**변경 후**: `playlistId + serviceKey` 복합 조건으로 UPDATE

```typescript
async incrementPlaylistDownloadCount(playlistId: string, serviceKey: string): Promise<void> {
  // WHERE id = :id AND "serviceKey" = :serviceKey
}
```

#### incrementPlaylistLikeCount (line 1032)

동일 패턴 적용. `serviceKey` 파라미터 추가.

#### reorderPlaylistItems (line 184)

**변경 전**: `manager.update(SignagePlaylistItem, item.id, { sortOrder })` — UUID 단독
**변경 후**: `WHERE id = :id AND playlistId = :playlistId` — playlist 소유 확인

```typescript
await manager.createQueryBuilder()
  .update(SignagePlaylistItem)
  .set({ sortOrder: item.sortOrder })
  .where('id = :id AND playlistId = :playlistId', { id: item.id, playlistId })
  .execute();
```

**효과**: 타 서비스/타 playlist의 데이터를 UUID만으로 변조 불가.

---

### R-1: member-home-query forum 전체 노출 — FIXED

**파일**: `packages/member-yaksa/src/backend/home/member-home-query.service.ts:280`

**변경 전**:
```sql
WHERE p.status = 'publish'
  AND (p.metadata->'yaksa'->>'isAnnouncement')::boolean IS NOT TRUE
```

**변경 후**:
```sql
WHERE p.status = 'publish'
  AND p.organization_id IS NULL
  AND (p.metadata->'yaksa'->>'isAnnouncement')::boolean IS NOT TRUE
```

**효과**: Home 포럼 요약에 커뮤니티(전체 공개) 게시글만 표시. 조직 전용 게시글 교차 노출 차단.

---

## 4. 추가 발견 사항 (본 WO 범위 외)

Phase 1 조사 중 다음 항목이 추가 발견됨. 본 WO에서는 "Forum 구조 변경 금지" 원칙에 따라 수정하지 않음.

| # | 위치 | 문제 | 심각도 | 권고 |
|---|------|------|--------|------|
| F-1 | `ForumController.getPost()` (line 171-209) | `applyContextFilter()` 미호출 — UUID로 타 조직 게시글 접근 가능 | HIGH | 별도 WO |
| F-2 | `ForumController.listComments()` (line 786-821) | 부모 게시글 scope 검증 없이 댓글 목록 반환 | MEDIUM | 별도 WO |
| F-3 | `ForumQueryService.getForumAnalytics()` (line 341-350) | SQL string interpolation (`'${orgId}'`) — SQL injection 위험 | HIGH | 별도 WO |

---

## 5. 재검증 시나리오 결과

| # | 시나리오 | 예상 결과 | 검증 |
|---|---------|----------|------|
| 1 | CMS content (visibility='platform', status='published') | HUB 노출 | **PASS** — visibilityScope + status 필터 적용 |
| 2 | CMS content (visibility='private') | HUB 미노출 | **PASS** — visibilityScope 필터에 의해 제외 |
| 3 | Forum 게시글 등록 | HUB 미노출 | **PASS** — HubContentQueryService에 Forum 접근 없음 |
| 4 | Signage media (scope='store') | HUB 미노출 | **PASS** — scope='global' 필터에 의해 제외 |
| 5 | Signage media (scope='global', status='active') | HUB 노출 | **PASS** — 모든 조건 충족 |

---

## 6. 변경 파일 목록

| 파일 | RISK | 변경 내용 |
|------|------|----------|
| `apps/api-server/src/routes/signage/controllers/signage.controller.ts` | R-3 | `x-service-key` 헤더 fallback 제거 |
| `apps/api-server/src/routes/signage/repositories/signage.repository.ts` | R-4 | 3개 mutation 메서드에 scope 조건 추가 |
| `packages/member-yaksa/src/backend/home/member-home-query.service.ts` | R-1 | `organization_id IS NULL` 필터 추가 |

---

## 7. DoD 검증

| # | 기준 | 상태 |
|---|------|------|
| 1 | HUB는 Broadcast Domain만 소비 | **PASS** — Content + Signage만 |
| 2 | Forum은 HUB 경로에 존재하지 않음 | **PASS** — 참조 없음 확인 |
| 3 | serviceKey 스푸핑으로 타 서비스 접근 불가 | **PASS** — R-3 수정 완료 |
| 4 | UUID 단독으로 타 서비스 데이터 수정 불가 | **PASS** — R-4 수정 완료 |
| 5 | visibility/public 조건 강제 적용 | **PASS** — 이미 적용됨 |
| 6 | tsc --noEmit PASS | **PASS** — 신규 에러 없음 |

---

## 8. Build 결과

```
api-server:   tsc --noEmit PASS (기존 에러만, 신규 에러 0건)
member-yaksa: tsc --noEmit PASS (에러 없음)
```

---

*Generated: 2026-02-24*
*WO: WO-O4O-HUB-BOUNDARY-STABILIZATION-V1*
*Status: Phase 1-4 Complete*
