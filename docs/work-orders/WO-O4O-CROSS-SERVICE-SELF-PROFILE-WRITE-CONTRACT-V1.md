# WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1

- **대상 에이전트**: Agent D
- **작성일**: 2026-08-18
- **성격**: 공통 backend 계약 구현 + 4서비스 adoption + 회귀검증 + production closure 선행
- **선행 구현**: [`WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1`](WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1.md)
- **선행 관련 commit**: `e51ddcf3a`, `fdf6595b9`
- **선행 CHECK**: [`docs/checks/CHECK-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1.md`](../checks/CHECK-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1.md)

---

## 1. 목표

현재 Profile UI 공통화는 완료됐지만, **모든 로그인 사용자가 자기 자신의 ACCOUNT_CORE 프로필을 수정하는 canonical backend 계약이 없다.**

확인된 증상:

```text
PharmacyHub operator/supplier
→ /account 진입 가능
→ 조회 + 비밀번호 변경 가능
→ 이름/닉네임/연락처 수정 불가

GP / KCos / Neture
→ frontend는 PUT /api/v1/users/profile 호출
→ backend canonical self-profile route 부재
→ 일반 사용자 저장 실패 가능
```

이번 WO의 목표는 다음이다.

```text
self-profile write 전체 census
→ canonical 계약 확정
→ backend 구현
→ GP/KCos/Neture/PH adoption
→ KPA 회귀 확인
→ 보안/권한 검증
→ production 검증
→ CHECK
→ commit/push
```

---

## 2. 핵심 계약

이번 API는 **서비스별 프로필 API가 아니라 ACCOUNT_CORE 자기 수정 API**다.

canonical subject:

```text
req.user.id
```

body에서 다른 사용자의 `userId`를 받아 수정하는 구조는 금지한다.

허용 후보:

```text
name / firstName / lastName
nickname
phone
기타 users 테이블의 명확한 ACCOUNT_CORE 필드
```

실제 허용 필드는 현재 schema와 소비처 census 후 확정한다.

금지:

```text
roles
status
isActive
approvedAt / approvedBy
service membership
service role
service_credentials
businessInfo 전체
organizations
직역 / 면허
서비스별 profile
타 사용자 id 지정
```

---

## 3. 시작 기준

특정 과거 commit을 기준으로 삼지 않는다.

```bash
git fetch origin
git status -sb
git pull --ff-only origin main
git rev-parse HEAD
git rev-parse origin/main
```

확인:

```text
worktree clean
HEAD == origin/main
```

선행 commit 포함 여부:

```bash
git merge-base --is-ancestor e51ddcf3a origin/main
git merge-base --is-ancestor fdf6595b9 origin/main
```

다른 세션 WIP 수정·삭제·stash 금지.

---

## 4. Census — 미조사 0

다음을 전수조사한다.

### backend

```text
apps/api-server/src/routes/users.routes.ts
UserController / UserManagementController
/auth/me/profile
/users/me/contact
/users/password
/pharmacy-hub/store-owner/account/profile
KPA mypage profile
GP mypage
KCos mypage
Neture profile
```

### frontend

```text
KPA MyProfilePage / api/mypage
GP MyProfilePage / api
KCos MyProfilePage / api
Neture MyProfilePage / api
PharmacyHub MyProfilePage / account api
```

각 write 경로마다 기록:

```text
서비스
route
HTTP method
인증 조건
role/scope 조건
수정 대상 table
허용 필드
실제 consumer
정상 동작 여부
canonical / legacy / dead
```

미조사 0.

---

## 5. Canonical endpoint 판정

현재 frontend 일부는 다음을 기대한다.

```text
PUT /api/v1/users/profile
```

반면 users router의 일반 사용자 패턴은:

```text
GET/PATCH /api/v1/users/me/contact
PUT /api/v1/users/password
```

이다.

따라서 history와 소비처를 조사한 뒤 아래 중 하나로 확정한다.

### A안

```text
PUT /api/v1/users/profile
```

을 canonical self-profile write로 복구.

조건:

```text
기존 소비처가 다수
과거 계약 충돌 없음
관리자 user update와 의미 충돌 없음
```

### B안

```text
PATCH /api/v1/users/me/profile
```

을 canonical로 신설하고 모든 소비처를 전환.

조건:

```text
/users/profile이 legacy/dead 또는 의미 충돌
/me 패턴이 현재 아키텍처상 더 명확
```

**추측으로 결정하지 않는다.**

결론과 근거를 CHECK에 기록한다.

---

## 6. Backend 구현 원칙

canonical self-profile route는 반드시:

```text
authenticate
→ req.user.id 확인
→ allowlist validation
→ 자기 users row만 update
→ 최신 profile 응답
```

흐름으로 구현한다.

금지:

```text
requireAdmin
userId path/body 입력
role 기반 자기 수정 허용 분기
serviceKey로 ACCOUNT_CORE owner 결정
businessInfo spread merge
임의 JSON 전체 update
```

SQL/ORM update도 allowlist 필드만 명시적으로 적용한다.

---

## 7. 필드 ownership 정합

ACCOUNT_CORE와 서비스/domain 정보를 섞지 않는다.

예:

```text
users
- 이름
- 닉네임
- 전화

service_memberships
- 서비스 membership/role

service_credentials
- 서비스 비밀번호

kpa_* profiles
- 직역/면허

organizations
- 매장/사업자 조직 정보

users.businessInfo
- 기존 계약상 필요한 입력/cache만
```

이번 WO에서 이 ownership 자체를 재설계하지 않는다.

---

## 8. PharmacyHub adoption

현재 구조:

```text
/account
→ 모든 로그인 사용자 개인 Profile

/store-owner/account
→ compatibility thin wrapper
```

유지한다.

canonical self-profile backend가 구현되면:

```text
operator
supplier
store_owner
admin
```

등 인증된 본인 사용자는 ACCOUNT_CORE 수정 가능 여부를 backend 계약 기준으로 판단한다.

역할 하드코딩 금지.

기존 `canEdit` prop은 서버 capability/실제 save adapter 가능 여부에 맞춰 정리한다.

StoreOwnerGuard나 backend scope를 완화해 우회하지 않는다.

---

## 9. GP / KCos / Neture adoption

각 서비스 Profile Core의 save adapter를 canonical self-profile endpoint로 정렬한다.

목표:

```text
GP       → ACCOUNT_CORE save 정상
KCos     → ACCOUNT_CORE save 정상
Neture   → ACCOUNT_CORE save 정상
```

사업자정보 등 서비스별 기존 write path는 유지한다.

즉:

```text
AccountProfileSection → canonical self-profile
BusinessProfileSection → 기존 서비스 API
SupplierProfile → 기존 Neture API
```

로 경계를 유지한다.

---

## 10. KPA 회귀

KPA는 기존 전용 프로필 write 경로가 있다.

이번 WO에서 억지로 canonical self-profile endpoint로 전환하지 않는다.

확인:

```text
KPA 기본 프로필 저장
직역/면허
businessInfo
비밀번호 변경
```

기존 동작 회귀가 없으면 유지한다.

공통 endpoint adoption이 명확히 더 단순하고 계약 충돌이 없다는 근거가 있을 때만 일부 검토 가능하나, 기본은 **미변경**이다.

---

## 11. 보안 검증 — 필수

반드시 자동 테스트를 추가한다.

### 정상

```text
authenticated user
→ 자기 이름/닉네임/전화 수정
→ 200
→ DB 반영
```

### 금지 필드

요청 body에 다음을 섞는다.

```text
roles
status
isActive
serviceKey
businessInfo
organizationId
membership
approvedAt
```

결과:

```text
400 또는 무시
```

둘 중 기존 validation 정책과 일치하게 처리하되, **DB에는 절대 반영되지 않아야 한다.**

### 타 사용자 수정 차단

다른 user id를 body/path에 넣어도:

```text
타 사용자 row 변경 0
```

이어야 한다.

### 권한 상승 차단

self-profile 호출만으로:

```text
member → operator
operator → admin
```

같은 변화가 절대 없어야 한다.

---

## 12. API contract test

최소 테스트:

```text
unauthenticated → 401

authenticated GP user → self profile update 200
authenticated KCos user → 200
authenticated Neture user → 200
authenticated PH operator → 200
authenticated PH supplier → 200 가능 시 확인
authenticated PH store_owner → 200

forbidden fields → 미반영
cross-user update → 불가
```

서비스별 membership이 없는 일반 platform user 처리도 현재 account policy와 맞춰 확인한다.

---

## 13. Production browser smoke

배포 후 실제 브라우저 검증한다.

### GlycoPharm

```text
login
→ Profile
→ 이름/연락처/닉네임 수정
→ 저장
→ 새로고침
→ 값 유지
```

### K-Cosmetics

동일.

### Neture

동일.

### PharmacyHub operator

```text
login
→ header 내 프로필
→ /account
→ 수정 버튼 노출
→ 이름/닉네임/연락처 수정
→ 저장
→ 새로고침 유지
→ 비밀번호 변경 진입 정상
```

### PharmacyHub store_owner

기존 `/store-owner/account` 호환 경로도 회귀 확인.

### KPA

기존 프로필 save 회귀 확인.

테스트 계정 값은 변경 전 기록하고 종료 후 원복한다.

---

## 14. Network / runtime 확인

각 서비스에서:

```text
404 0
예상 외 401/403 0
5xx 0
console exception 0
CORS 0
잘못된 method 0
잘못된 route 0
무한 refetch 0
중복 save 0
```

확인.

---

## 15. 제외 범위

이번 WO에서 하지 않는다.

```text
DB schema / migration
users 테이블 재설계
businessInfo 정본 재설계
service membership 구조 변경
Identity V2 재설계
계정 탈퇴 기능
organizations 재설계
KPA UX 공통화
operator 대리 수정 API 변경
```

---

## 15-A. 사전 승인 (본 WO 범위 내)

아래 2건은 **사전 승인**이므로 별도 중간 승인 없이 진행한다.

### 1. Production 배포 — 승인

기존에 확립된 production 배포 workflow 범위에서 **직접 배포까지 수행**한다.

```text
1. main push 후 자동 배포 여부 확인
2. 자동 배포면 완료 대기 → deployed revision 확인
3. 자동 배포가 아니면 기존 표준 workflow 를 수동 trigger
4. 배포 성공 확인 후 browser smoke
```

허용: 기존 GitHub Actions / Cloud Run 배포 workflow 실행 · 기존 service/revision 배포 · 배포 결과와 commit/revision 확인

금지: 새 deployment workflow 작성 · Cloud Run 설정 변경 · 환경변수 변경 · secret 변경 · service account/IAM 변경 · DB migration · 인프라 구조 변경

> 배포 자체를 다시 승인받기 위해 중지하지 않는다. **기존 표준 배포 경로가 없거나, 배포하려면 위 금지 항목 중 하나를 바꿔야 할 때만** 중지한다.

### 2. Production 테스트 계정 ACCOUNT_CORE write — 승인

허용 범위:

```text
docs/local/TEST-ACCOUNTS.local.md 에 정의된 테스트 계정
+ 본인 ACCOUNT_CORE 필드 (canonical allowlist 로 확정된 필드만)
+ 기능 검증에 필요한 최소 변경
+ 검증 직후 원복
```

허용 필드 예: `name` / `firstName` / `lastName` / `nickname` / `phone`

금지: 실사용자 계정 수정 · `roles` · `status`/`isActive` · membership · `service_credentials` · `businessInfo` · `organizations` · 직역/면허 · 사업자정보 · 타 사용자 데이터

검증 절차는 반드시 아래를 전부 수행한다.

```text
변경 전 값 기록
→ 테스트 값으로 수정
→ 저장 200 확인
→ 새로고침/재조회
→ DB/API persistence 확인
→ 원래 값으로 복원
→ 다시 재조회하여 원복 확인
```

**원복 실패 시 그냥 종료하지 않고 MUST_FIX 로 보고한다.**

---

## 16. 중지 조건

다음이면 무리하게 확대하지 않는다.

```text
schema/migration 필요
ACCOUNT_CORE ownership이 현 코드에서 불명확
기존 API contract 파괴 필요
Identity 계층 재설계 필요
production data 대량 수정 필요
다른 세션 WIP 직접 충돌
```

이 경우 조사 결과와 정확한 blocker를 CHECK에 남긴다.

---

## 17. 정적 검증

필수:

```text
apps/api-server typecheck
관련 Jest
users/profile security regression tests
```

frontend:

```text
@o4o/account-ui build
KPA tsc
GP tsc
KCos tsc
Neture tsc
PharmacyHub tsc/build
```

가능하면 전체 api-server Jest도 실행한다.

---

## 18. 완료 기준

다음 전부 충족:

```text
self-profile write census 미조사 0
canonical endpoint 1개 확정

GP 일반 사용자 save PASS
KCos 일반 사용자 save PASS
Neture 일반 사용자 save PASS
PH operator save PASS
PH store_owner 회귀 PASS
KPA 회귀 PASS

타 사용자 수정 0
role/status 변경 0
businessInfo 오염 0
membership 오염 0
service_credentials 오염 0
organizations 오염 0

schema/migration 0
```

---

## 19. CHECK

작성:

```text
docs/checks/CHECK-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1.md
```

포함:

```text
1. 기준 commit
2. self-profile write census
3. legacy/dead route 판정
4. canonical endpoint 선택 근거
5. 허용 ACCOUNT_CORE 필드
6. 금지 필드
7. backend 구현
8. 서비스별 adoption
9. KPA 회귀
10. security tests
11. production browser smoke
12. DB/schema/migration
13. 잔존 위험
14. Profile closure에 미치는 영향
15. CHECK/commit/push
```

---

## 20. Git

- 최신 main 기준
- 다른 세션 WIP 미접촉
- `git add .` 금지
- path-specific stage
- 관련 변경만 commit
- push 완료 후:

```text
HEAD == origin/main
이번 WO 범위 dirty 0
```

확인.

---

## 21. 최종 보고 형식

```text
1. 기준 commit
2. census
3. canonical endpoint
4. 실제 원인
5. 구현 파일
6. 허용/금지 필드
7. 서비스별 결과
8. security regression
9. production smoke
10. typecheck/Jest/build
11. DB/schema/migration
12. 잔존 위험
13. Profile track 상태
14. CHECK/commit/push
15. 최종 작업트리 상태
```

마지막 줄:

```text
문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건
```

---

## 실행 원칙

중간 승인 없이:

```text
census
→ canonical 계약 확정
→ backend 구현
→ 4서비스 adoption
→ KPA 회귀
→ security test
→ production 배포
→ browser smoke
→ CHECK
→ path-specific commit
→ push
```

까지 한 번에 진행한다.

**핵심 목표는 서비스별 임시 API를 추가하는 것이 아니라,
"인증된 사용자가 자기 ACCOUNT_CORE를 안전하게 수정하는 플랫폼 공통 계약"을 하나로 확정하는 것이다.**
