# CHECK-O4O-AUTH-RUNTIME-E2E-TRIGGER-SCOPE-FIX-V1

- 기준: current main
- 문제: `E2E — Auth Runtime Regression` 의 `packages/auth-client/src/**` 경로가 RBAC-only helper 변경까지 자동 트리거하여, 로그인/session runtime과 무관한 PR에서도 서비스별 credential validation 단계가 실행됨.
- 재현: PR #205는 `packages/auth-client/src/rbac.{ts,js,d.ts}` 에서 dead `createPermissionGuard`만 제거했지만 auth runtime E2E가 자동 실행됨.
- 수정: `.github/workflows/e2e-auth-runtime.yml`의 `paths`에 `!packages/auth-client/src/rbac.*` negative pattern 추가.
- 보존: `workflow_dispatch` 수동 실행, 실제 auth-client runtime 파일 변경, AuthContext/auth-react/security-core 변경은 계속 E2E 자동 실행.
- 보존: 서비스별 8개 E2E Secret 검증의 fail-closed 계약은 변경하지 않음.

판정:

```text
RBAC-ONLY AUTH-CLIENT CHANGE -> AUTH RUNTIME E2E AUTO TRIGGER: DISABLED
REAL AUTH RUNTIME CHANGE -> AUTH RUNTIME E2E AUTO TRIGGER: ENABLED
E2E CREDENTIAL GATE: UNCHANGED / FAIL-CLOSED
```
