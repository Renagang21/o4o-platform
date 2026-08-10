# WO-O4O-FRONTEND-AUTH-COMMONIZATION-DEPLOYABILITY-AND-ADOPTION-V1

- **상태**: IN PROGRESS
- **작성일**: 2026-08-10
- **유형**: 공유 인증 모듈 변경 (Shared Module Change Protocol 대상)
- **선행**: `work/frontend-auth-commonization` (미반영 branch — 3커밋)
- **관련 규칙**: CLAUDE.md §1 Shared Module / Core+Extension Change Rule

---

## 1. 목표 · 배경

`work/frontend-auth-commonization` 은 신규 패키지 `@o4o/auth-react` 를 만들고
5개 웹 서비스의 `AuthContext` · `RoleGuard` 를 공통 Core 로 수렴시킨다.

병합 자체는 `origin/main` 과 충돌이 없으나, **5개 서비스 Dockerfile 이 `packages/` 를
선별 COPY** 하는 구조인데 `packages/auth-react` 줄이 없어, 그대로 main 에 올리면
5개 웹 서비스 컨테이너 빌드가 전부 실패한다.

이 WO 의 목표는 해당 공통화 변경을 **실제 빌드·배포 가능한 상태로 완성**하고,
서비스별 인증·권한 회귀를 검증한 뒤 main 에 반영하는 것이다.

**대상 서비스**

- web-kpa-society
- web-neture
- web-glycopharm
- web-k-cosmetics
- web-pharmacy-hub

## 2. 승인 범위

- `packages/auth-react/**`
- 5개 서비스의 `Dockerfile` — `packages/auth-react` COPY 보완
- 5개 서비스의 `package.json` · `AuthContext` · `RoleGuard` · 로그인 진입점
- `pnpm-lock.yaml` (workspace link 반영분에 한함)
- CHECK 문서

## 3. 작업 방식

- 별도 worktree + 전용 branch (`work/auth-commonization-deployability`)
- 기준: `origin/main`
- 기존 `work/frontend-auth-commonization` 내용을 가져와 작업
- 기본 checkout 의 `main` 은 수정하지 않는다
- dependabot branch 3건은 손대지 않는다
- `git add .` 금지 — path-specific stage
- 다른 세션 상태를 흔드는 reset/rebase 금지

## 4. 실행 순서

### 4-1. 조사

1. `packages/auth-react` 의 실제 export 와 의존성
2. 5개 서비스 `package.json` 의 `@o4o/auth-react` 참조
3. 각 Dockerfile 의 packages COPY / build 구조
4. 각 서비스 `AuthContext` / `RoleGuard` 교체 범위
5. 기존 로그인 · 로그아웃 · serviceKey · role 처리 계약

### 4-2. 필수 수정

5개 웹 Dockerfile 에 `packages/auth-react` 가 build context 와 build 단계에
정확히 포함되도록 보완한다. **기존 Dockerfile 패턴을 그대로 따르고**,
불필요한 공통화나 Docker 구조 재설계는 하지 않는다.

### 4-3. 필수 검증

서비스별로 다음을 확인한다.

- typecheck
- production build
- Docker build 또는 실제 CI build 경로 확인
- 로그인 / 로그아웃
- 인증 만료 · 401 처리
- 권한 없는 route 차단
- serviceKey 별 credential 경계
- 기존 returnUrl / redirect 동작
- RoleGuard 결과
- console error 0

추가로 `admin-dashboard` typecheck/build 를 이번 최종 main 검증에 포함한다.

## 5. 제외 범위

- 인증 DB schema 변경
- `service_credentials` 계약 변경
- backend auth API 변경
- 다른 unrelated 패키지 정비
- Dockerfile 전면 재작성
- 기존 서비스별 role 의미 변경

## 6. 중지 조건

- `auth-react` 가 서비스별로 다른 인증 계약을 억지로 하나로 합치고 있음
- 한 서비스라도 기존 로그인 / 권한 계약이 깨짐
- backend 변경 없이는 공통화가 불가능함
- Docker build 외 추가 인프라 변경이 필요함
- 기존 branch 내용과 `origin/main` 사이 의미 충돌 발생

## 7. 완료 기준

1. 5개 Dockerfile build 가능
2. 5개 서비스 typecheck/build PASS
3. 인증 · 로그아웃 · RoleGuard 회귀 0
4. backend / auth DB 변경 0
5. main 반영 가능
6. CHECK 작성
7. commit · push
8. 검증 후 main 반영
9. `work/frontend-auth-commonization` 로컬 · 원격 branch 삭제

## 8. 완료 보고 (10개 항목)

1. auth-react 재사용 구조
2. Dockerfile 보완 내용
3. 서비스별 변경 파일
4. typecheck / build
5. 서비스별 인증 · 권한 smoke
6. 발견 회귀
7. backend 변경 0 확인
8. CHECK · commit · push
9. main 반영
10. branch / worktree 정리
