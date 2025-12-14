# CMS Core Refactoring Work Order

**Branch**: `feature/cms-core`
**Priority**: P0 (Critical)
**CLAUDE.md 프로세스 준수 필수**

---

## Quick Summary

Round 3에서 확정된 4개 이슈를 해결하는 Core 정비 작업:

| Task | Issue | Severity | Est. Days |
|------|-------|----------|-----------|
| A | Navigation 하드코딩 → 동적 | Critical | 3-5 |
| B | Route 하드코딩 → 동적 | Critical | 5-7 |
| C | User.role deprecated 제거 | Medium | 2-3 |
| D | Member 필드 중복 제거 | Low | 3-5 |

---

## Task A: Dynamic Navigation System

**목표**: manifest.menus.admin 기반 동적 메뉴 로딩

**작업**:
1. cms-core에 NavigationRegistry 구현
2. useAdminMenu 훅 → NavigationRegistry 사용으로 변경
3. wordpressMenuFinal.tsx 제거
4. 모든 manifest → menus.admin 패턴 표준화

**영향 파일**:
- `packages/cms-core/src/navigation/` (신규)
- `apps/admin-dashboard/src/hooks/useAdminMenu.ts`
- `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx` (삭제)
- 40+ manifest files

**DoD**:
- [ ] 모든 메뉴 manifest 기반 로딩
- [ ] 앱 설치/비활성화 시 메뉴 자동 변경
- [ ] 하드코딩 메뉴 0개

---

## Task B: Dynamic Routing System

**목표**: manifest.viewTemplates 기반 동적 라우팅

**작업**:
1. cms-core에 RouteRegistry 구현
2. App.tsx 300+ Route → 동적 생성
3. viewTemplates/frontendRoutes manifest 활용
4. AppRouteGuard 통합

**영향 파일**:
- `packages/cms-core/src/routing/` (신규)
- `apps/admin-dashboard/src/App.tsx` (대폭 축소)
- 관련 manifest files

**DoD**:
- [ ] App.tsx 하드코딩 Route 제거
- [ ] 앱 비활성화 시 Route 자동 제거
- [ ] RBAC 권한 자동 적용

---

## Task C: RBAC Migration Complete

**목표**: User.role deprecated 필드 완전 제거

**작업**:
1. User entity에서 제거:
   - `role`
   - `roles`
   - `dbRoles`
   - `activeRole`
2. role_assignments 기반으로 100% 전환
3. 관련 서비스 코드 정리

**영향 파일**:
- `apps/api-server/src/modules/auth/entities/User.ts`
- `apps/api-server/src/services/auth/`
- 마이그레이션 스크립트

**DoD**:
- [ ] User.role 완전 제거
- [ ] 모든 권한 체크 RoleAssignment 기반
- [ ] 로그인/회원가입 정상 동작

---

## Task D: Member Field Deduplication

**목표**: Member/User 중복 필드 제거

**작업**:
1. Member entity에서 제거:
   - `phone`
   - `email`
   - `name`
2. User 참조로 변경
3. 조회 로직 수정 (JOIN)
4. 데이터 마이그레이션

**영향 파일**:
- `packages/membership-yaksa/src/backend/entities/Member.ts`
- `packages/membership-yaksa/src/backend/services/`
- 마이그레이션 스크립트

**DoD**:
- [ ] 중복 필드 제거
- [ ] 조회 API 정상 동작
- [ ] 데이터 마이그레이션 완료

---

## 실행 순서

```
Task C (RBAC) → Task D (Member) → Task A (Navigation) → Task B (Routing)
```

**이유**:
- C, D는 데이터 구조 변경 (먼저 완료)
- A, B는 프론트엔드 변경 (C, D 완료 후)

---

## 브랜치 전략

```bash
# 작업 시작
git checkout feature/cms-core

# 완료 후
git checkout develop && git merge feature/cms-core
git checkout main && git merge develop
```

---

## 참조 문서

- `docs/reports/phase-a-round3-investigation.md`
- `CLAUDE.md` (개발 프로세스)
- `docs/app-guidelines/core-app-development.md`
