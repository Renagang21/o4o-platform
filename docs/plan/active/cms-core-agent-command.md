# [AGENT COMMAND] CMS Core Refactoring

**Branch**: `feature/cms-core`
**Work Order**: `docs/plan/active/cms-core-refactoring-workorder.md`

---

## 실행 지시

다음 4개 Task를 순서대로 수행하라:

### Task C: RBAC 정리 (2-3일)
```
1. User.ts에서 @deprecated 필드 제거: role, roles, dbRoles, activeRole
2. role_assignments 기반 권한 체크로 100% 전환
3. 관련 서비스 코드 정리
4. 마이그레이션 스크립트 작성 (기존 role → role_assignments)
```

### Task D: Member 필드 정리 (3-5일)
```
1. Member.ts에서 phone, email, name 제거
2. User 참조로 변경 (userId로 조회)
3. 조회 서비스 수정 (User JOIN)
4. 데이터 마이그레이션 스크립트 작성
```

### Task A: Dynamic Navigation (3-5일)
```
1. cms-core에 NavigationRegistry 구현
2. manifest.menus.admin 수집 → 동적 메뉴 생성
3. useAdminMenu 훅 수정 → Registry 사용
4. wordpressMenuFinal.tsx 제거
5. 앱 설치/비활성화 시 메뉴 자동 반영
```

### Task B: Dynamic Routing (5-7일)
```
1. cms-core에 RouteRegistry 구현
2. manifest.viewTemplates/frontendRoutes 수집 → 동적 Route 생성
3. App.tsx 하드코딩 Route 제거
4. AppRouteGuard + RBAC 통합
5. 앱 비활성화 시 Route 자동 제거
```

---

## 검증 기준

각 Task 완료 시:
1. `pnpm run build` 성공
2. 관련 기능 테스트 통과
3. 콘솔 에러 없음

전체 완료 시:
- 하드코딩 메뉴/라우트 0개
- deprecated 필드 0개
- 중복 필드 0개

---

## 참조

- Investigation: `docs/reports/phase-a-round3-investigation.md`
- Work Order: `docs/plan/active/cms-core-refactoring-workorder.md`
- Process: `CLAUDE.md`
