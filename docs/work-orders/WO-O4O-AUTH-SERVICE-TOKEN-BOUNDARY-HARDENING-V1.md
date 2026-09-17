# WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1

> **성격**: **CRITICAL 인증 경계 차단(최소 수정)** — [`IR-O4O-PRIVACY-DATA-CENSUS-V1`](../investigations/IR-O4O-PRIVACY-DATA-CENSUS-V1.md) §7-1 #1·#2 만 닫는다. Google 로그인 전환 · 개인정보 Target Model · Credential/Relationship 리팩토링은 하지 않는다.
> **핸드오프 전용** — 명시 지시 전에는 실행하지 않는다.
> **선행 근거**: Census 결과 `POST /api/v1/auth/service/login` 은 `{id,email}` 입력만으로 provider 검증 없이 service 토큰을 발급하고(`auth-service-user.service.ts:103-125`), `requireAuth`(소비 966곳) 가 `tokenType:'service'` 를 거부하지 않는다(`authentication.middleware.ts:93-165`). 이는 개인정보 문제가 아니라 **인증 경계 자체의 문제**이며, 개인정보를 Core 로 모으는 작업보다 먼저 닫아야 한다 — 한 번의 우회로 접근 가능한 정보가 커지기 때문이다.
> **관련 정본**: [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md)(auth-core 동결) · [`USER-OPERATOR-FREEZE-V1`](../architecture/USER-OPERATOR-FREEZE-V1.md) · [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md) · CLAUDE.md §8(진단 route 규칙) · §14(Frozen: 버그 수정 허용).

---

## 1. 목표와 배경

`users.id` 만 알면 일반 `requireAuth` 라우트에 접근할 수 있는 구조를 차단한다.

원칙:

```text
Human Authentication ≠ Service Authentication

User Token    → user-authenticated route
Service Token → explicitly service-authorized route 만
```

service token 이 일반 `requireAuth` 경계를 통과하는 것을 허용하지 않는다. 사람 사용자 인증과 서비스(machine) 인증의 trust boundary 를 분리한다.

핵심 판단: **"service authentication 이 정말 필요한가?"** 를 먼저 확인한다. legitimate caller 가 없다면 새 service-token 시스템을 만드는 것보다 죽은 경로를 제거하는 것이 낫다.

## 2. 승인 범위

### 2-1. 조사 (코드 변경 전)

1. `POST /api/v1/auth/service/login` 의 실제 호출자 — route / client / packages / workflow / docs / test 를 **교차 확인**한다. 검색 한 번으로 caller 0 을 선언하지 않는다.
2. production workflow(`.github/workflows`) 또는 외부 서비스에서 사용하는 계약인지 확인한다.
3. 발급 JWT 의 claim / issuer / audience / expiry 확인 (`generateServiceAccessToken`).
4. 일반 사용자 JWT 와 service JWT 의 구분 수단이 현재 존재하는지 (`tokenType`, `isServiceToken`, `requirePlatformUser` 의 실사용 여부).
5. `service_credentials` 의 실제 writer / reader / 사용 목적 — **service login 과 무관한 L2 password credential 인지** 판정 (Census 상 `service_credentials.password_hash` 는 사람 사용자 로그인의 L2 경로로 쓰이고 있음 — 이 테이블을 service auth 와 혼동하지 않는다).
6. 해당 엔드포인트의 legitimate caller 가 0 인지 판정.

### 2-2. 처리

**A. legitimate caller 0** → 가장 작은 변경으로 해당 인증 경로를 비활성화 또는 제거한다(`RETIRE`). dead service authentication 을 새로 설계하지 않는다. 임의 `{id,email}` 로 JWT 가 발급되지 않음을 테스트로 검증한다.

**B. legitimate caller 존재** → 하드닝(`HARDEN`):
- 임의 user `id/email` payload 를 신뢰하지 않는다.
- 서비스는 사전에 등록되고 검증 가능한 machine credential 로만 인증한다.
- `requireAuth` 가 `tokenType:'service'` 를 거부하고, service token 은 명시적으로 허용된 service route 만 통과한다.
- 구체적 credential 방식은 기존 호출자와 현 구조를 조사한 뒤 **최소 변경**으로 결정한다.

### 2-3. auth-core 동결 정책

`auth-core` 는 동결 Core 이므로 원칙적으로 수정하지 않는다. CRITICAL 경계를 닫기 위해 수정이 불가피하면 ① 왜 Core 변경이 필요한지 먼저 보고 ② 최소 파일 · 최소 diff ③ 범용 리팩토링 금지 ④ regression test 필수 로 처리한다 (CLAUDE.md §14 "버그 수정 허용" 범위).

## 3. 실행 순서

```text
조사(§2-1 6항목) → RETIRE / HARDEN 판정 보고 → 최소 수정 → Negative test → typecheck/test → CHECK 문서 → path-specific commit → push → 완료 보고
```

## 4. 제외 범위

- Google Login 구현 · password Login 제거 · Kakao/Naver Login 제거
- `users` 리팩토링 · `professional_credentials` 구현
- 사업자 / 매장 / 조직 Relationship 변경 · 개인정보 중복 제거 · dead 개인정보 테이블 삭제
- 서비스 전반 JWT 재설계 · JWT secret 회전 실행(필요 여부 **판정만** §7)
- Census 의 다른 SECURITY_FIX(#3~#9) — 별도 WO

CRITICAL 을 닫는 데 직접 필요한 변경만 한다.

## 5. 중지 조건

- 조사 결과 legitimate caller 가 외부 서비스 · 프로덕션 workflow 에 존재해 계약 변경이 필요한 경우 → 판정 보고 후 대기
- auth-core 변경이 §2-3 최소 diff 로 닫히지 않는 경우
- DB schema · migration · env/secret 변경이 필요한 경우
- 다른 세션의 dirty / untracked 파일 접촉이 필요한 경우
- 현재 변경과 무관한 build · test 실패

## 6. 검증과 Git

### 6-1. 필수 Negative Test

```text
임의 {id,email}                      → token 발급 실패
존재하는 user id 만 제시              → token 발급 실패
변조된 service credential             → 실패
인증되지 않은 service token           → 일반 requireAuth route 접근 실패
```

legitimate service authentication 이 존재하면 추가:

```text
정상 service credential → service 용 인증 성공
service token           → 명시적으로 허용된 service route 만 접근
```

- 기존 사용자 로그인(`/auth/login`, L2 `service_credentials` 경로 포함) 회귀 없음 확인.
- Git: `git fetch origin` → `git status -sb` → `node scripts/git/check-staged-scope.mjs <경로>` → `git commit -- <경로>` → push. `--force` · `git add .` · stash 금지.

## 7. 완료 보고

- 기존 `service/login` 실제 caller (교차 확인 경로 명시)
- 취약점의 직접 원인
- 선택한 처리: `RETIRE` 또는 `HARDEN` 과 근거
- 변경 파일 · 새 인증 경계
- Negative test 결과(실행 로그 요약)
- 기존 사용자 로그인 영향 · 기존 service caller 영향
- JWT secret rotation 필요 여부 판정
- 남은 후속사항(Census SECURITY_FIX #3~#9 와의 관계)
- `HEAD == origin/main` · 작업트리 상태 · `문서 정합:` 한 줄

---

## 후속 (이 WO 완료 후 · 참고)

```text
0. CRITICAL 인증 취약점 차단 (본 WO)
1. 개인정보 Target Model 확정 — Phase 1 (설계 조사: 219 필드 · 중복 9 클러스터 · Relationship 11 후보를 새 모델에 매핑)
2. Google 단일 로그인 전환 (기존 user ↔ Google sub 연결 migration 먼저 · 이메일 일치 자동 연결 지양)
3. Credential / Business / Store / Organization 정본화
4. 서비스에는 Claim / Role 만 제공 (role_assignments SSOT 유지)
5. 중복 · 불필요 개인정보 제거
6. 운영자 접근권한 최소화
7. 로그 / AI / 외부전송 정리
```

Kakao 구분: Kakao Login/OAuth 구성 = `DELETE_CANDIDATE` / `users.kakao_*` = Connected Channel 후보(장기 `connected_channels` 로 이동) — 통째로 지우지 않는다.

---

*작성: 2026-09-17 · 상태: DRAFT (핸드오프 · 실행 지시 대기)*
