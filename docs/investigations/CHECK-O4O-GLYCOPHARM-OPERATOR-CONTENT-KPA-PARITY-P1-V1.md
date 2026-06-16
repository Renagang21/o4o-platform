# CHECK-O4O-GLYCOPHARM-OPERATOR-CONTENT-KPA-PARITY-P1-V1

Date: 2026-06-16

## Scope

Frontend-only first pass for GlycoPharm operator Content IA parity with KPA Society.

Canonical target:

- KPA Society operator Content is the baseline.
- GlycoPharm guidelines/care operator Content differences are legacy remnants, not service-specific features.
- GlycoPharm-specific Content behavior should be designed only after KPA/GlycoPharm parity is complete.

## Completed

- Removed GlycoPharm operator Content menu entry for guideline management.
- Moved GlycoPharm `Home 편집` into the Content menu group, matching KPA Society.
- Renamed GlycoPharm notice/news menu label to `공지사항/뉴스`, matching KPA Society.
- Kept `자료실 관리` in the separate resources group.
- Removed `커뮤니티 관리` from the forum menu group because the route is now surfaced as Content `Home 편집`.
- Added canonical `/operator/content` route for GlycoPharm notice/news management.
- Redirected legacy `/operator/content-management` to `/operator/content`.
- Redirected legacy `/operator/guidelines` to `/operator/content`.
- Removed the legacy `GuidelineManagementPage.tsx` screen.
- Updated GlycoPharm Home edit page copy from community-management wording to Home edit wording.

## Modified Files

- `services/web-glycopharm/src/App.tsx`
- `services/web-glycopharm/src/config/operatorMenuGroups.ts`
- `services/web-glycopharm/src/pages/operator/CommunityManagementPage.tsx`
- `services/web-glycopharm/src/pages/operator/OperatorContentPage.tsx`
- `services/web-glycopharm/src/pages/operator/GuidelineManagementPage.tsx` (deleted)
- `docs/investigations/CHECK-O4O-GLYCOPHARM-OPERATOR-CONTENT-KPA-PARITY-P1-V1.md`

## Not Touched

- Backend endpoints
- Database schema
- Migrations
- API contracts
- Package manifests and lockfiles
- KPA Society and KCos source files
- GlycoPharm resources route and resources menu
- GlycoPharm signage content routes
- GlycoPharm public/business `bloodcare` routes

## Follow-Up Required

The Content Hub parity work is mandatory and intentionally split because it requires backend/API/DB/migration scope.

Follow-up WO:

`WO-O4O-GLYCOPHARM-OPERATOR-CONTENT-HUB-KPA-PARITY-V1`

Required follow-up scope:

- Port `OperatorContentHubPage.tsx`
- Port `OperatorContentDetailPage.tsx`
- Add GlycoPharm block adapter
- Add `/operator/docs`
- Add `/operator/content-hub/:id`
- Add required backend endpoints
- Add required GlycoPharm content working/recommendation tables and migrations
- Connect AI summarize/extract/tag/recommend/copy-to-store flows with the same structure as KPA Society

## Validation

Passed:

- `pnpm --filter glycopharm-web build`

Notes:

- The first sandboxed build attempt failed at Vite config loading with esbuild `spawn EPERM`.
- The same command passed after approval outside the sandbox.

## Existing Workspace State

Existing modified files were present before this WO and were preserved while editing:

- `services/web-glycopharm/src/App.tsx`
- `services/web-glycopharm/src/config/operatorMenuGroups.ts`

Existing untracked files were not touched:

- `ctmpcheck_guide_links.sh`
- `home-kcos-market-trial-cta.png`
- `home-kpa-market-trial-cta.png`
- `kpa-derivation-viewer-modal.png`
- `kpa-prodmat-unified-qr.png`
- `neture-admin-drawer-open.png`
- `neture-admin-mobile-sidebar.png`

## Git State

- Staging: not staged
- Commit: not created
- Push: not pushed
