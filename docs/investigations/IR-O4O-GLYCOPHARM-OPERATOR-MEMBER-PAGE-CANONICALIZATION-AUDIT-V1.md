# IR-O4O-GLYCOPHARM-OPERATOR-MEMBER-PAGE-CANONICALIZATION-AUDIT-V1

**Investigation Date:** 2026-05-29  
**Service:** GlycoPharm (`services/web-glycopharm`)  
**Scope:** Two Operator Member Management Pages Consolidation Feasibility

---

## 1. 전체 판정 (Overall Verdict)

**IMMEDIATE CONSOLIDATION POSSIBLE WITH CAUTION**

Two pages are functionally and architecturally **nearly identical** — both wrapping `OperatorMembersConsolePage` with identical API clients. However, they serve different **semantic purposes** and show **deliberate role/status tab differences**:

- **`/operator/members` (UsersPage):** General member management (2 role tabs: pharmacist/store_owner; 2 status tabs: suspended/withdrawn)
- **`/operator/glycopharm-members` (GlycopharmMembersPage):** Pharmacist application workflow (1 role tab: pharmacist; 4 status tabs: active/rejected/suspended/withdrawn)

**Risk Assessment:** LOW-MEDIUM. Both pages use identical API endpoints (`/operator/members`), identical client adapter logic, and shared `EditUserModal`. Consolidation is technically straightforward but requires **deliberate semantic choice** — which page becomes canonical and whether role/status tabs should be merged or kept as-is.

**Recommendation:** Consolidate into `/operator/members` (UsersPage); deprecate `/operator/glycopharm-members` with appropriate notice.

---

## 2. 조사한 파일 (Files Investigated)

### Core Application Routes
- `services/web-glycopharm/src/App.tsx` (Lines 715–721)

### Page Components
- `services/web-glycopharm/src/pages/operator/UsersPage.tsx` (295 lines)
- `services/web-glycopharm/src/pages/operator/GlycopharmMembersPage.tsx` (227 lines)
- `services/web-glycopharm/src/pages/operator/EditUserModal.tsx` (50+ lines) — shared by both

### Navigation/Menu Configuration
- `services/web-glycopharm/src/config/operatorMenuGroups.ts` (165 lines)

### Dashboard Reference
- `services/web-glycopharm/src/pages/operator/GlycoPharmOperatorDashboard.tsx` (149 lines)

### Admin Comparison
- `services/web-glycopharm/src/pages/admin/GlycoPharmAdminMembersPage.tsx` (100+ lines, for reference)

---

## 3. 라우트 등록 상태 (Route Registration Status)

### Current Routes

Both pages live under a single `/operator` route parent with `OperatorRoute` guard:

```typescript
<Route path="glycopharm-members" element={<GlycopharmMembersPage />} />
{/* WO-O4O-GLYCOPHARM-OPERATOR-ROUTE-CANONICALIZATION-V1: canonical route */}
<Route path="members" element={<UsersPage />} />
<Route path="members/:id" element={<UserDetailPage />} />
{/* backward compat redirect: /operator/users → /operator/members */}
<Route path="users" element={<Navigate to="/operator/members" replace />} />
<Route path="users/:id" element={<UserDetailPage />} />
```

### Route Guard
Both routes are wrapped in single `<OperatorRoute>` guard allowing: `['glycopharm:operator', 'glycopharm:admin', 'platform:super_admin']`

### Legacy Redirect
`/operator/users` → `/operator/members` (backward compat maintained via WO-O4O-GLYCOPHARM-OPERATOR-ROUTE-CANONICALIZATION-V1)

---

## 4. 메뉴/사이드바/대시보드 링크 사용처 (Menu/Sidebar Link Usages)

### Navigation Config (operatorMenuGroups.ts)

**UNIFIED_MENU (current):**
```
users: [{ label: '회원 관리', path: '/operator/members' }]  // canonical
approvals: [
  ...
  { label: '약사 회원 관리', path: '/operator/glycopharm-members' }  // legacy
  ...
]
```

### Dashboard Navigation (GlycoPharmOperatorDashboard.tsx)

Dashboard axis links **only** `/operator/members` (UsersPage), not `glycopharm-members`. This indicates UsersPage is already canonical.

### Menu Group Placement Mismatch

Semantic conflict: `users` group for general management vs. `approvals` group for pharmacist workflow. However, both pages access identical data with only tab visibility differences.

---

## 5. UsersPage vs GlycopharmMembersPage 기능 비교 (Feature Comparison Table)

| Feature | UsersPage | GlycopharmMembersPage | Difference |
|---------|-----------|----------------------|-----------|
| **Route** | `/operator/members` | `/operator/glycopharm-members` | Canonical vs Legacy |
| **API Endpoint** | `/operator/members` | `/operator/members` | **IDENTICAL** |
| **serviceKey** | `'glycopharm'` | `'glycopharm'` | **IDENTICAL** |
| **Role Tabs** | pharmacist, store_owner | pharmacist only | DIFFERENT |
| **Status Tabs** | suspended, withdrawn | active, rejected, suspended, withdrawn | DIFFERENT |
| **Delete Flow** | Rich risk modal | Simple confirm | DIFFERENT UX |
| **Row Actions** | suspend, restore | suspend, restore | IDENTICAL |
| **Bulk Actions** | suspend, restore, withdraw | suspend, restore, withdraw | IDENTICAL |
| **EditUserModal** | Shared | Shared | IDENTICAL |

---

## 6. Canonical 후보 판단 (Canonical Candidate Decision)

**Verdict: `/operator/members` (UsersPage) is already canonical**

Evidence:
1. App.tsx line 716 explicitly marks it: `/* WO-O4O-GLYCOPHARM-OPERATOR-ROUTE-CANONICALIZATION-V1: canonical route */`
2. Dashboard quick links point only to `/operator/members`
3. Primary menu group uses `/operator/members`

---

## 7. Legacy 경로 처리 방안 A/B/C/D안 (Legacy Route Options with Pros/Cons)

### Option A: Hard Deprecation (RECOMMENDED)

**Action:** Remove `/operator/glycopharm-members` route; update menu to point to `/operator/members` only.

**Pros:** Reduces complexity, eliminates duplication, forces consolidation

**Cons:** Breaking change for bookmarks; requires menu update

**Effort:** 30 minutes

**Recommendation:** HIGH

---

### Option B: Silent Redirect (Medium)

**Action:** Keep route but redirect `/operator/glycopharm-members` → `/operator/members`

**Pros:** Backward compatible

**Cons:** Keeps dead route; requires query param handling

**Effort:** 45 minutes

**Recommendation:** MEDIUM

---

### Option C: Coexistence with Notice (Low)

**Action:** Keep both; add deprecation banner to legacy page

**Pros:** No breaking changes

**Cons:** Duplicate code, maintenance burden, violates DRY

**Effort:** 20 minutes

**Recommendation:** LOW

---

### Option D: Semantic Separation (Not Viable)

**Action:** Keep both pages with different workflows

**Cons:** Both use same API endpoint; no actual data isolation possible; creates cognitive load

**Verdict:** NOT VIABLE

---

## 8. GlycopharmMembersPage 제거 가능성 (Can We Delete It?)

### Technical Feasibility: YES

**Blockers:** None found.

**Dependencies:**
- App.tsx: 1 route reference (line 715)
- operatorMenuGroups.ts: 1 menu item (line 32)
- No other imports

**Effort:** 15 minutes

### Risk Assessment: LOW
No database changes, no API changes, shared EditUserModal unaffected.

### Recommendation
**DELETE GlycopharmMembersPage.tsx immediately** after consolidating unique UX elements into UsersPage.

---

## 9. UsersPage statusTabs 정합성 (statusTabs Completeness Check)

### Current statusTabs in UsersPage
```typescript
statusTabs={[
  { key: 'suspended', label: '정지', status: 'suspended' },
  { key: 'withdrawn', label: '탈퇴', status: 'withdrawn' },
]}
```

### Missing States

UsersPage omits:
- `active` (approved members)
- `rejected` (rejected applicants)

### Completeness Verdict: INCOMPLETE

**Recommendation:** Add 'active' and 'rejected' tabs if general member management should show full approval workflow.

---

## 10. API 사용 비교 (API Usage Comparison)

### API Endpoints

Both pages use **identical endpoints**:
- `GET /operator/members` (list)
- `GET /operator/members?limit=1000&serviceKey=glycopharm` (fetch all)
- `GET /operator/members/stats` (stats)
- `PATCH /operator/members/:id/status` (update single)
- `POST /operator/members/batch-status` (batch update)
- `PUT /operator/members/:id` (password)
- `DELETE /operator/members/:id?mode=soft` (soft delete)
- `GET /operator/members/:id/delete-risk` (risk assessment)

### Status Transitions Difference

**FOUND:** Line 154 in GlycopharmMembersPage uses `'approved'`:
```typescript
await gpOperatorClient.updateStatus(u.id, 'approved');
```

vs. Line 225 in UsersPage uses `'active'`:
```typescript
await gpMembersClient.updateStatus(u.id, 'active');
```

**Risk:** Backend may treat these differently. Requires clarification.

---

## 11. 권한/역할 Guard 비교 (Auth Guard Comparison)

### Both use identical OperatorRoute guard

No privilege escalation or security distinction. Consolidation poses no security risk.

### Role Tab Filtering Difference

**GlycopharmMembersPage uses legacy role names:**
```typescript
roleFilter: ['pharmacist', 'pharmacy']
```

**UsersPage uses canonical names:**
```typescript
roleFilter: ['glycopharm:pharmacist', 'glycopharm:store_owner']
```

**Issue:** Legacy names may no longer return results if backend has been updated.

---

## 12. 위험 요소 (Risks)

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|-----------|
| Status naming: `'active'` vs `'approved'` | Medium | Restore may fail if backend treats differently | Confirm backend behavior |
| Legacy role names in GlycopharmMembersPage | Medium | Tab filtering may return empty results | Update to canonical names |
| Delete flow UX mismatch | Low | User experience inconsistency | Standardize on risk modal |
| Missing approval workflow tabs | Low | No visibility into rejected applications | Add 'active'/'rejected' tabs |
| Deep link breakage | Low | Bookmarks to old path will 404 | Implement silent redirect |
| No tableId in UsersPage | Cosmetic | Scroll position not persisted | Add tableId prop |

---

## 13. Current Structure vs O4O Philosophy Conflict Check

### O4O Design Philosophy

1. **Single Source of Truth:** One route per function (see `/operator/users` → `/operator/members` redirect)
2. **Thin Wrappers:** Pages wrap shared console components
3. **Semantic Naming:** Route names describe user actions
4. **Role-Based UI:** Display workflows based on role, not separate pages

### Current Violations

**VIOLATION 1: Duplicate Pages for Single Function**
Two routes perform identical operations. Violates SRP and DRY.

**VIOLATION 2: Legacy Path Coexistence**
Similar to `/operator/users` → `/operator/members` pattern, but `/operator/glycopharm-members` still exists. Inconsistent with canonicalization philosophy.

**VIOLATION 3: Semantic Overloading**
Path implies pharmacist-specific management, but accesses all members. Tab visibility differences are cosmetic.

### Alignment Recommendation

**Adopt Option A** to align with O4O philosophy. Delete legacy route and consolidate tabs.

---

## 14. 다음 WO 제안 (Next WO Scope Proposal)

### Recommended Work Order: "WO-O4O-GLYCOPHARM-OPERATOR-MEMBER-PAGE-CONSOLIDATION-V1"

**Phase 1: Preparation (1 day)**

1. **Audit & Risk Assessment** (1 hour)
   - Confirm backend: `active` vs `approved` status behavior
   - Verify legacy role names (`'pharmacist'`, `'pharmacy'`) still in use
   - Check for any analytics on `/operator/glycopharm-members` path

2. **Update UsersPage** (3 hours)
   - Add 'active' and 'rejected' status tabs
   - Update roleFilter to canonical names
   - Change restore to use `'active'` status
   - Add `tableId="operator-members"` for persistence
   - Optionally adopt risk modal for delete UX
   - Test all tab filters and actions

3. **Remove GlycopharmMembersPage** (1 hour)
   - Delete file
   - Remove import from App.tsx
   - Remove route from App.tsx
   - Remove menu item from operatorMenuGroups.ts
   - Test menu rendering

**Phase 2: Backward Compatibility (optional, 1 day)**

If deep link preservation critical: implement silent redirect

**Phase 3: Testing & Deployment (1 day)**

- Unit tests for status filtering
- E2E tests for workflows
- QA verification
- Deploy to staging

**Total Effort:** 8–10 hours (1–2 developer days)

**Dependencies:**
- Backend clarification on status naming
- Analytics/tracking review
- Product/UX sign-off on tab consolidation

**Success Metrics:**
- No 404 errors on `/operator/members`
- All member statuses filterable
- Bulk actions work correctly
- Edit modal launches
- Delete modal displays
- No broken menu links
- (Optional) Redirect works

---

## Conclusion

**GlycopharmMembersPage is a legacy duplicate with minor UX differences.** Consolidation is straightforward and aligns with O4O canonicalization philosophy. Recommend **immediate deprecation** with Phase 1 preparation and optional Phase 2 backward compatibility.

**Next Action:** Schedule WO-O4O-GLYCOPHARM-OPERATOR-MEMBER-PAGE-CONSOLIDATION-V1 to clarify backend status naming and role filters.
