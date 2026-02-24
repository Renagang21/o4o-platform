# IR-O4O-DEBUG-PROTOCOL-V1-KPA-A-SIGNAGE

> Investigation Report: E2E Debug Protocol - KPA-a Signage Baseline
> WO-O4O-DEBUG-PROTOCOL-V1
> 2026-02-24

---

## 1. Trace Tree

### 1.1 Write Path (Registration)

```
POST /api/signage/:serviceKey/media (auth required)
  -> SignageController.createMedia()
       -> extractScope(req)
            serviceKey = req.params.serviceKey
            organizationId = req.query.organizationId || req.headers['x-organization-id']
       -> SignageService.createMedia(dto, scope, userId)
            -> SignageRepository.createMedia({
                 ...dto,
                 serviceKey: scope.serviceKey,
                 organizationId: scope.organizationId || null,
                 createdByUserId: userId || null,
                 status: 'active',            // <-- HARDCODED DEFAULT
               })
```

**Key fact**: Media is created with `status: 'active'` always. No approval workflow.

For **global content** (HQ/supplier/community):

```
POST /api/signage/:serviceKey/public/hq/media (auth required)
  -> SignageController.createHqMedia()
       -> dto.source = 'hq', dto.scope = 'global'   // <-- FORCED
       -> SignageService.createGlobalMedia(dto, scope, userId)
            -> SignageRepository.createMedia({
                 ...dto,
                 serviceKey: scope.serviceKey,
                 organizationId: null,          // <-- GLOBAL = no org
                 status: 'active',
                 source: dto.source,            // 'hq'
                 scope: dto.scope,              // 'global'
               })
```

**Registration defaults summary**:

| Field | Store Media | Global Media (HQ) |
|-------|------------|-------------------|
| status | `'active'` | `'active'` |
| source | (not set / entity default) | `'hq'` / `'supplier'` / `'community'` |
| scope | (not set / entity default) | `'global'` |
| organizationId | from scope (user's org) | `null` |
| deletedAt | `null` | `null` |

---

### 1.2 Read Path (List API)

```
GET /api/signage/:serviceKey/media (auth required)
  -> SignageController.getMediaList()
       -> extractScope(req) -> { serviceKey, organizationId? }
       -> SignageService.getMediaList(query, scope)
            -> SignageRepository.findMedia(query, scope)
                 WHERE serviceKey = $1
                 AND organizationId = $2        (IF scope.organizationId provided)
                 AND deletedAt IS NULL
                 AND status = $3                (IF query.status provided)
                 AND mediaType = $4             (IF query.mediaType provided)
                 AND sourceType = $5            (IF query.sourceType provided)
                 AND category = $6              (IF query.category provided)
                 ORDER BY createdAt DESC
```

**Source**: `signage.repository.ts:233-286`

For **global content list** (Hub browsing):

```
GET /api/signage/:serviceKey/public/media (auth required)
  -> SignageController.getGlobalMedia()
       -> SignageRepository.findGlobalMedia(query, scope)
            WHERE serviceKey = $1
            AND scope = 'global'
            AND deletedAt IS NULL
            AND status = 'active'
            AND source IN ('hq', 'supplier', 'community')  (default)
```

**Source**: `signage.repository.ts:920-984`

---

### 1.3 Aggregation Path (Operator Dashboard)

```
GET /api/v1/kpa/operator/summary (auth required)
  -> operator-summary.controller.ts
       -> 4 parallel SQL queries:

  [Active Media Count]
    SELECT COUNT(*) FROM signage_media
    WHERE "serviceKey" = 'kpa-society' AND status = 'active'

  [Active Playlists Count]
    SELECT COUNT(*) FROM signage_playlists
    WHERE "serviceKey" = 'kpa-society' AND status = 'active'

  [Pending Media Count]
    SELECT COUNT(*) FROM signage_media
    WHERE "serviceKey" = 'kpa-society' AND status IN ('processing', 'inactive')

  [Pending Playlists Count]
    SELECT COUNT(*) FROM signage_playlists
    WHERE "serviceKey" = 'kpa-society' AND status = 'draft'
```

**Source**: `operator-summary.controller.ts:75-99`

---

### 1.4 Hub Content Path

```
GET /api/v1/hub-content/:serviceKey/signage/media (auth required)
  -> hub-content.service.ts
       WHERE m."serviceKey" = $1
       AND m.status = 'active'
       AND m.scope = 'global'
       AND m.source IN ('hq', 'supplier', 'community')
```

**Source**: `hub-content.service.ts:219-220`

---

### 1.5 SignageQueryService (Frozen Baseline APP)

```
SignageQueryService.listForHome(mediaLimit, playlistLimit)
  -> Raw SQL:
       SELECT ... FROM signage_media
       WHERE "serviceKey" = $1
       AND source IN ($sources)       // default: ['hq', 'store']
       AND status = 'active'
       ORDER BY "createdAt" DESC
       LIMIT $limit
```

**Source**: `modules/signage/signage-query.service.ts:24-46`

---

### 1.6 Hub Signal Path (UI)

```
KpaOperatorDashboard.tsx
  -> fetch GET /api/v1/kpa/operator/summary
  -> signagePendingCount = pendingMedia + pendingPlaylists
  -> KPI Grid:
       label: '사이니지 검수 대기'
       value: signagePendingCount
       status: signagePendingCount > 0 ? 'warning' : 'neutral'
  -> AI Summary:
       if signagePendingCount > 0:
         message: '사이니지 ${count}건이 검수 대기 상태입니다.'
         level: 'info'
         link: '/operator/signage/content'
  -> Action Queue:
       if signagePendingCount > 0:
         label: '사이니지 검수 대기'
         link: '/operator/signage/content'
```

**Source**: `KpaOperatorDashboard.tsx:59, 81-86, 136-143, 188-195`

---

### 1.7 KPA-a UI Pages (Operator Consumer Flow)

| Page | Route | API | Role |
|------|-------|-----|------|
| Content Hub | `/signage` | `signageV2.publicContentApi` | Browse platform content |
| Store Signage | `/store/signage` | `assetSnapshot`, `storePlaylist` | Manage store assets/playlists |
| Hub Library | `/hub/signage` | `hubContent` | Browse hub content for import |
| Public Renderer | `/public/signage` | `signageV2.publicContentApi` | Full-screen kiosk display |

**Key finding**: No signage creation form exists in KPA-a frontend. Operators are consumers only. Content creation happens on admin/platform side.

---

## 2. Condition Diff Table

### 2.1 Media Conditions

| Layer | File | WHERE Conditions | Notes |
|-------|------|-----------------|-------|
| **L1: Registration** | `signage.service.ts:344` | `status = 'active'` (hardcoded) | No approval gate |
| **L2: List API** | `signage.repository.ts:241-252` | `serviceKey` + `organizationId?` + `deletedAt IS NULL` + optional filters | Most granular |
| **L2: Global List** | `signage.repository.ts:931-943` | `serviceKey` + `scope='global'` + `deletedAt IS NULL` + `status='active'` + `source IN (hq,supplier,community)` | Strictest |
| **L3: Operator Summary (active)** | `operator-summary.controller.ts:76-77` | `serviceKey='kpa-society'` + `status='active'` | No deletedAt, no scope, no source |
| **L3: Operator Summary (pending)** | `operator-summary.controller.ts:93-94` | `serviceKey='kpa-society'` + `status IN ('processing','inactive')` | No deletedAt, no scope, no source |
| **L3: Hub Content** | `hub-content.service.ts:219-220` | `serviceKey` + `status='active'` + `scope='global'` + `source IN (hq,supplier,community)` | Matches Global List |
| **L3: SignageQueryService** | `signage-query.service.ts:29-35` | `serviceKey` + `source IN (sources)` + `status='active'` | No deletedAt, no scope filter |
| **L4: Hub Signal** | `KpaOperatorDashboard.tsx:59` | `pendingMedia + pendingPlaylists > 0` | Derived from L3 Summary |

### 2.2 Playlist Conditions

| Layer | File | WHERE Conditions | Notes |
|-------|------|-----------------|-------|
| **L1: Registration** | `signage.service.ts:122-133` | (no explicit status set) | Depends on entity default |
| **L2: List API** | `signage.repository.ts:74-86` | `serviceKey` + `organizationId?` + `deletedAt IS NULL` + optional filters | Standard |
| **L2: Global List** | `signage.repository.ts:873-889` | `serviceKey` + `scope='global'` + `deletedAt IS NULL` + `source IN (hq,supplier,community)` | No status filter! |
| **L3: Operator Summary (active)** | `operator-summary.controller.ts:80-81` | `serviceKey='kpa-society'` + `status='active'` | No deletedAt |
| **L3: Operator Summary (pending)** | `operator-summary.controller.ts:97-98` | `serviceKey='kpa-society'` + `status='draft'` | No deletedAt |
| **L3: SignageQueryService** | `signage-query.service.ts:37-43` | `serviceKey` + `source IN (sources)` + `status='active'` | No deletedAt |

---

## 3. Mismatch Candidates

### M1: `deletedAt IS NULL` missing from Operator Summary (CONFIRMED)

| | List API | Operator Summary |
|--|----------|-----------------|
| **deletedAt filter** | `AND deletedAt IS NULL` | (none) |

**Impact**: Soft-deleted media/playlists with `status='active'` are still counted in operator dashboard totals. This inflates the active count and may cause discrepancy between "X active media" in dashboard vs actual items visible in list.

**Affected SQL**: Lines 76-77, 80-81, 93-94, 97-98 of `operator-summary.controller.ts`

**Severity**: Medium. In practice, soft-deleted items may have their status changed before deletion, but the gap exists.

---

### M2: `deletedAt IS NULL` missing from SignageQueryService (CONFIRMED)

| | Repository findMedia | SignageQueryService |
|--|---------------------|---------------------|
| **deletedAt filter** | `AND deletedAt IS NULL` | (none) |

**Impact**: Home page signage preview may include soft-deleted items.

**Affected SQL**: Lines 29-35, 37-43 of `signage-query.service.ts`

**Severity**: Low-Medium. SignageQueryService is Frozen Baseline, so fix requires WO.

---

### M3: Operator Summary counts ALL sources, Hub only shows global (DESIGN)

| | Operator Summary | Hub Content |
|--|-----------------|-------------|
| **scope filter** | (none) | `AND scope = 'global'` |
| **source filter** | (none) | `AND source IN ('hq','supplier','community')` |

**Impact**: Operator dashboard "active media: N" includes store-level content. Hub content listing only shows global content. These are intentionally different — dashboard shows org-wide view, Hub shows platform content. **Not a bug**, but important for debugging: "Why does my dashboard say 10 media but Hub only shows 3?"

**Severity**: N/A (by design). Document for debugging reference.

---

### M4: Global Playlist list has no `status` filter (POTENTIAL)

| | Global Media List | Global Playlist List |
|--|-------------------|---------------------|
| **status filter** | `AND status = 'active'` | (none) |

**Impact**: Global playlist listing may return non-active playlists (draft, archived). This asymmetry between media and playlist global queries could cause confusion.

**Affected SQL**: `signage.repository.ts:873-889` (`findGlobalPlaylists`)

**Severity**: Low. Playlists in non-active status are likely rare in global scope.

---

### M5: Pending status definitions are asymmetric (DESIGN)

| Entity | Pending Status |
|--------|---------------|
| Media | `IN ('processing', 'inactive')` |
| Playlist | `= 'draft'` |

**Impact**: Different status values are considered "pending" for each entity type. This is by design (media goes through processing, playlists start as draft), but may confuse operators and debugging.

**Severity**: N/A (by design). Document for reference.

---

## 4. Debug Protocol v1: L1-L4 Diagnostic Checklist

### Scenario: "Video registered but not showing in Hub"

#### L1: Registration Check (1 min)

```
Q: Was the media created successfully?
A: Check API response from POST /api/signage/:serviceKey/media

Verify:
[ ] Response status = 201
[ ] Response data.status = 'active'
[ ] Response data.serviceKey matches expected service
[ ] Response data.id is a valid UUID
```

#### L2: List API Check (1 min)

```
Q: Does the media appear in the list API?
A: Call GET /api/signage/:serviceKey/media?status=active

Verify:
[ ] Media ID appears in response data array
[ ] deletedAt is null (not soft-deleted)
[ ] serviceKey matches
[ ] organizationId matches (if store-level) or is null (if global)
```

#### L3a: Operator Summary Check (1 min)

```
Q: Is the media counted in operator dashboard?
A: Call GET /api/v1/kpa/operator/summary

Verify:
[ ] signage.totalMedia > 0
[ ] If recently created: totalMedia incremented
[ ] If expecting pending: pendingMedia > 0
[ ] KNOWN GAP: Summary does not filter deletedAt (M1)
[ ] KNOWN GAP: Summary counts ALL sources including store (M3)
```

#### L3b: Hub Content Check (1 min)

```
Q: Does the media appear in Hub content?
A: Call GET /api/v1/hub-content/:serviceKey/signage/media

Verify:
[ ] Media ID appears in response
[ ] If NOT appearing, check:
    [ ] scope = 'global'?        (store-level content won't appear)
    [ ] source IN ('hq','supplier','community')? (store source excluded)
    [ ] status = 'active'?
    [ ] deletedAt IS NULL?
```

#### L4: Hub Signal Check (1 min)

```
Q: Is the signage signal correct in operator dashboard?
A: Check KPI Grid → '사이니지 검수 대기' value

Verify:
[ ] If value > 0: pending items exist (status = processing/inactive/draft)
[ ] If value = 0 but expecting pending: check if items are already 'active'
[ ] Warning status shows when pendingCount > 0
[ ] Action Queue shows link to /operator/signage/content
```

---

## 5. Quick Reference: "Why doesn't my content show?"

| Symptom | Most Likely Cause | Check |
|---------|-------------------|-------|
| Not in store list | Wrong `organizationId` or `serviceKey` | L2: scope params |
| Not in Hub content | `scope != 'global'` or `source = 'store'` | L3b: scope + source |
| Dashboard count wrong | Soft-deleted items counted (M1) | L3a: deletedAt gap |
| Hub shows 0 but dashboard shows N | Dashboard counts store+global, Hub shows global only (M3) | By design |
| Pending count > 0 unexpectedly | Media in `processing`/`inactive` or playlist in `draft` | L3a: status check |
| Home preview missing item | SignageQueryService has no deletedAt filter (M2) | Check if item was soft-deleted |

---

## 6. File Reference

| Layer | File | Key Lines |
|-------|------|-----------|
| L1 | `apps/api-server/src/routes/signage/services/signage.service.ts` | 334-347 (createMedia), 1196-1212 (createGlobalMedia) |
| L2 | `apps/api-server/src/routes/signage/repositories/signage.repository.ts` | 233-286 (findMedia), 920-984 (findGlobalMedia), 865-918 (findGlobalPlaylists) |
| L2 | `apps/api-server/src/routes/signage/controllers/signage.controller.ts` | 61-73 (extractScope) |
| L3 | `apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts` | 75-99 (signage SQL) |
| L3 | `apps/api-server/src/modules/hub-content/hub-content.service.ts` | 219-220 (media), 281-282 (playlists) |
| L3 | `apps/api-server/src/modules/signage/signage-query.service.ts` | 24-46 (listForHome) |
| L4 | `services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx` | 59, 81-86, 136-143, 188-195 |
| UI | `services/web-kpa-society/src/pages/signage/ContentHubPage.tsx` | Content browsing |
| UI | `services/web-kpa-society/src/pages/pharmacy/StoreSignagePage.tsx` | Store management |
| UI | `services/web-kpa-society/src/pages/pharmacy/HubSignageLibraryPage.tsx` | Hub import |
| UI | `services/web-kpa-society/src/pages/signage/PublicSignagePage.tsx` | Kiosk renderer |

---

## 7. Definition of Done Verification

> WO 요구: 4가지 질문에 5분 이내 답변 가능해야 한다.

| # | Question | Answer Location |
|---|----------|----------------|
| 1 | "영상을 등록했는데 Hub에 안 나온다" — 어디서 빠지는가? | Section 5 Quick Reference + L3b checklist |
| 2 | 각 계층의 필터 조건 차이는? | Section 2 Condition Diff Table |
| 3 | 조건 불일치(Mismatch)가 있는가? | Section 3: M1 (deletedAt), M2 (SignageQS), M3 (scope), M4 (playlist status) |
| 4 | 다음 서비스 확장 시 어떤 패턴을 따르는가? | Section 4 L1-L4 Checklist (template for any APP) |

---

*Generated: 2026-02-24*
*WO: WO-O4O-DEBUG-PROTOCOL-V1*
*Baseline: KPA-a Signage (single org, video media, status=active)*
