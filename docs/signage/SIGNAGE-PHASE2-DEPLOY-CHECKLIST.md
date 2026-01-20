# Digital Signage - Phase 2 Deploy Checklist

> **Version:** 2.0.0
> **Tag:** v2.0.0-signage-phase2
> **Date:** 2025-01-20

---

## Pre-Deployment

### Code Verification

- [x] feature/signage-role-reform-v1 → develop 병합
- [x] develop → main 병합
- [x] Git Tag 생성: `v2.0.0-signage-phase2`
- [x] api-server 빌드 성공
- [x] web-neture 빌드 성공

### Environment Variables

| Service | Variable | Required |
|---------|----------|----------|
| api-server | SIGNAGE_SERVICE_KEY | ☐ |
| api-server | MEDIA_STORAGE_BUCKET | ☐ |
| signage-player | SIGNAGE_PLAYER_ORIGIN | ☐ |
| signage-player | SIGNAGE_HEARTBEAT_INTERVAL | ☐ |

---

## Cloud Run Deployment

### Services to Deploy

| Service | Path | Status |
|---------|------|--------|
| o4o-core-api | apps/api-server | ☐ |
| signage-player-web | services/signage-player-web | ☐ |
| admin-dashboard | apps/admin-dashboard | ☐ |
| Store frontends | services/web-* | ☐ |

### Deployment Commands

```bash
# API Server (via GitHub Actions)
# Push to main triggers auto-deploy

# Manual deploy (if needed)
gcloud run deploy o4o-core-api \
  --source apps/api-server \
  --region asia-northeast3 \
  --platform managed
```

---

## Database Migration

### Migration Files

| Migration | Description | Status |
|-----------|-------------|--------|
| 2026011700001-CreateSignageCoreEntities | Core 12 entities | ☐ |

### Verification

```bash
# Check migration status
pnpm --filter api-server typeorm migration:show

# Run migrations (dry-run)
pnpm --filter api-server typeorm migration:run -- --dry-run

# Run migrations
pnpm --filter api-server typeorm migration:run
```

### Schema Verification

| Table | Fields to Verify |
|-------|------------------|
| signage_playlists | scope, source, parentPlaylistId |
| signage_media | scope, source |
| signage_schedules | organizationId |
| signage_templates | config (JSONB) |
| signage_layout_presets | layout (JSONB) |

---

## Post-Deployment

### Health Checks

| Service | Endpoint | Expected |
|---------|----------|----------|
| API | /api/health | 200 OK |
| API | /api/signage/:key/playlists | 200 (with auth) |
| Player | / | HTML page |
| Admin | / | HTML page |

### Smoke Test Execution

1. **Admin Test**
   - [ ] Admin 로그인
   - [ ] 403 접근 제한 확인
   - [ ] Settings/Extensions 정상

2. **Operator Test**
   - [ ] HQ 콘텐츠 생성
   - [ ] 글로벌 발행
   - [ ] Template 관리

3. **Store Test**
   - [ ] Global 콘텐츠 조회
   - [ ] Clone → 편집
   - [ ] Schedule 설정

4. **Player Test**
   - [ ] Channel 재생
   - [ ] Offline fallback
   - [ ] Heartbeat 확인

---

## Rollback Plan

### If Issues Found

```bash
# Revert to previous tag
git checkout v1.x.x-previous-stable

# Redeploy
gcloud run deploy o4o-core-api \
  --source apps/api-server \
  --region asia-northeast3
```

### Database Rollback

```bash
# Revert migration
pnpm --filter api-server typeorm migration:revert
```

---

## Sign-off

| Step | Responsible | Date | Signature |
|------|-------------|------|-----------|
| Code Review | | | |
| Env Config | | | |
| Deployment | | | |
| Migration | | | |
| Smoke Test | | | |
| Final Approval | | | |

---

## Phase 2 Finalization Complete

When all items are checked:

> **Digital Signage Phase 2가 프로덕션 준비 완료되었습니다.**
> **이 상태가 Phase 3 확장앱 개발의 기준점입니다.**

---

*Checklist created: 2025-01-20*
*Tag: v2.0.0-signage-phase2*
