# WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1

## 1. 핵심 목표

공통 `MembershipApprovalService.rejectMembership`의 반려 처리 결함을 수정하고, 반려·재승인 상태에서 membership과 role assignment가 일관되게 동작하도록 정비한다.

이번 작업은 Pharmacy-Hub 전용이 아니라 다음 서비스가 공유하는 membership Core 정비다.

```text
Neture
KPA Society
GlycoPharm
K-Cosmetics
Pharmacy-Hub
```

실측된 결함:

```text
D2. UPDATE ... RETURNING 결과 해석 오류
D3. 반려 후 role_assignments 활성 상태 잔존
```

신규 사용자가 반려 사유 화면에 접근하지 못하는 D1은 공통 가입 정책 판단이 필요하므로 이번 WO에서 수정하지 않는다. 

---

## 2. 작업 시작 전

1. VS Code/Claude Code 선택 영역 공유를 해제하고 긴 문서·JSON이 자동 첨부되지 않았는지 확인한다.

2. 저장소 상태를 확인한다.

```bash
git status --short
git branch --show-current
git rev-parse HEAD
```

3. 기존 병행 작업 변경은 수정·삭제·stash·revert·unstage하지 않는다.

4. 안전한 경우에만 동기화한다.

```bash
git checkout main
git pull --ff-only origin main
pnpm install --frozen-lockfile
```

5. 실제 최신 `main`을 기준으로 조사한다.

6. `git add .` 금지. 공유 Core 변경과 검증 문서만 path-specific commit한다.

---

## 3. 조사 범위

### 3.1 rejectMembership 실제 반환 구조

다음을 실측한다.

```text
MembershipApprovalService.rejectMembership
QueryRunner.query
AppDataSource.query
PostgresQueryRunner UPDATE ... RETURNING 반환 형태
현재 TypeORM 버전
```

확인해야 할 실제 형태:

```text
rows
[rows, rowCount]
QueryResult
기타 driver별 차이
```

추측으로 수정하지 말고 현재 런타임과 테스트에서 안전하게 행을 추출하는 공통 방식을 확정한다.

### 3.2 소비처 전수 조사

`rejectMembership` 호출부를 전수 조사한다.

```text
Neture
KPA Society
GlycoPharm
K-Cosmetics
Pharmacy-Hub
admin/operator 공통 membership API
```

확인 항목:

```text
반환 payload 소비
KPA kpa_members 상태 동기화
ActionLog
HTTP status/error mapping
role assignment 처리
재승인 처리
```

### 3.3 role_assignments 상태 정책

다음 상태 전이를 조사한다.

```text
pending → rejected
active → rejected
rejected → active
suspended → active
```

확인 항목:

```text
반려 시 어떤 역할을 비활성화해야 하는가
서비스 prefix 기준으로 한정 가능한가
다른 서비스 역할은 어떻게 보존되는가
재승인 시 기존 role row를 재활성화하는가
중복 role 생성 가능성
JWT 갱신 시점
```

---

## 4. 확정 정책

### 4.1 반려 범위

반려는 해당 `service_membership`과 해당 서비스 역할에만 영향을 준다.

예:

```text
pharmacy-hub membership 반려
→ pharmacy-hub:* 역할만 비활성화
→ kpa-society:* / neture:* / 기타 역할은 불변
```

### 4.2 역할 비활성화

membership이 `rejected`가 되면 해당 membership의 `role`과 일치하는 active `role_assignments`를 비활성화한다.

```text
is_active = false
```

역할 row를 삭제하지 않는다.

### 4.3 재승인

rejected membership을 다시 승인하면:

```text
membership.status = active
기존 role_assignment 재활성화
없으면 멱등 생성
중복 active role 0
```

### 4.4 트랜잭션

다음은 하나의 트랜잭션에서 처리한다.

```text
membership 상태 변경
role_assignment 비활성화 또는 재활성화
KPA 보조 원장 동기화
감사 로그에 필요한 식별자 확보
```

ActionLog 자체가 트랜잭션 밖에서 실행되는 기존 구조라면 현재 패턴을 유지하되, 올바른 userId/serviceKey를 전달한다.

### 4.5 D1 제외

이번 WO에서 다음은 변경하지 않는다.

```text
신규 users.status='pending' 정책
신규 가입자 로그인 허용 정책
ACCOUNT_NOT_ACTIVE 처리
반려 사유 화면 접근 정책
```

별도 IR로 넘긴다.

---

## 5. 구현 범위

### A. UPDATE RETURNING 결과 해석 수정

`rejectMembership`이 실제 반환 행을 안전하게 추출하도록 수정한다.

요구사항:

```text
정상 반려 시 membership row 반환
대상 없음 시 404 MEMBERSHIP_NOT_REJECTABLE
id/userId/serviceKey/status/role 정상 반환
driver 반환 형태 차이를 안전하게 처리
```

가능하면 raw `query()` 반환값에 의존하지 않고 다음 중 현재 구조에 가장 안전한 방식을 검토한다.

```text
SELECT ... FOR UPDATE → entity 확인 → UPDATE
QueryBuilder.update().returning()
QueryResult.raw 정규화 helper
```

공유 Core에서 가장 예측 가능한 방식을 선택한다.

### B. 반려 시 role 비활성화

반려 대상 membership의 role이 존재하면 해당 사용자·해당 role의 active assignment를 비활성화한다.

조건:

```text
user_id 일치
role 일치
is_active=true
```

다른 role은 변경하지 않는다.

membership.role이 null이거나 잘못된 경우:

```text
membership 반려는 수행
role 변경은 skip
명확한 로그 또는 테스트 기록
```

### C. 재승인 정합성

기존 approve 경로를 확인하고 필요하면 최소 수정한다.

요구사항:

```text
inactive role_assignment가 있으면 재활성화
없으면 생성
중복 active row 없음
다른 서비스 역할 불변
```

### D. KPA 동기화 복원

현재 `service_key === 'kpa-society'` 분기가 실제 row를 기준으로 정상 실행되도록 수정한다.

검증:

```text
KPA membership 반려
→ kpa_members 대응 상태 동기화
→ 대상 없음/중복 시 기존 정책 유지
```

KPA 전용 로직을 Pharmacy-Hub 등에 확장하지 않는다.

### E. 응답·로그 정합성

반려 응답에 다음이 정상 포함되는지 확인한다.

```text
id
userId
serviceKey
status
roleType 또는 role
rejectionReason
```

ActionLog에 다음이 undefined로 남지 않아야 한다.

```text
actor
target user
serviceKey
membership id
```

---

## 6. 제외 범위

이번 작업에서는 다음을 하지 않는다.

```text
신규 회원가입 정책 변경
users.status 정책 변경
로그인 에러 문구 변경
반려 후 재신청 정책 변경
서비스별 membership UI 변경
Pharmacy-Hub 상품·주문
DB 테이블 신설
role schema 변경
role 삭제
기존 서비스 권한 체계 재설계
```

---

## 7. 중지 조건

다음 중 하나라도 해당하면 수정 확대 없이 조사 결과를 보고한다.

1. `rejectMembership` 반환 구조가 환경마다 달라 단일 안전 처리 방식이 없는 경우
2. role 비활성화가 기존 서비스에서 의도적으로 금지된 정책과 충돌하는 경우
3. 재승인 시 role 재활성화가 unique constraint와 충돌해 migration이 필요한 경우
4. KPA 동기화가 별도 SSOT와 충돌하는 경우
5. 공유 Core 수정이 membership 외 광범위한 인증 구조 변경을 요구하는 경우
6. 병행 작업 파일을 건드려야 하는 경우
7. 프로덕션 DB write 없이 검증할 방법이 전혀 없는 경우

단위 테스트·통합 테스트로 충분히 검증 가능하면 프로덕션 write가 없다는 이유로 중지하지 않는다.

---

## 8. 검증

### 8.1 단위/통합 테스트

최소 시나리오:

```text
pending → rejected
active → rejected
없는 membership 반려 → 404
다른 서비스 membership 반려 시 대상 서비스 role만 비활성화
다른 서비스 role 불변
rejected → approved 시 role 재활성화
기존 role 없을 때 승인 시 생성
중복 active role 0
KPA 반려 동기화 실행
ActionLog 식별자 정상
```

### 8.2 서비스별 회귀

```text
Neture
KPA Society
GlycoPharm
K-Cosmetics
Pharmacy-Hub
```

각 서비스에서 최소한:

```text
approve 정상
reject 정상
권한 없는 운영자 차단
타 서비스 membership 변경 불가
```

### 8.3 정적 검증

```text
serviceKey 하드 경계
raw SQL parameter binding
다른 서비스 role 보존
migration 0
신규 테이블 0
```

### 8.4 빌드

```text
api-server typecheck/build
관련 테스트
변경이 영향을 주는 web operator 화면 typecheck
```

가능하면 승인된 E2E 테스트 계정으로 배포 후 반려→재로그인→role 제거, 재승인→role 복원까지 검증한다.

---

## 9. CHECK 문서

작성 경로:

```text
docs/checks/CHECK-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1.md
```

포함 내용:

```text
반환값 오류의 정확한 원인
TypeORM 실제 반환 형태
수정 방식과 선택 이유
reject 상태 전이
role 비활성화 정책
재승인 role 재활성화
KPA 동기화 결과
응답 payload
ActionLog 정합성
서비스별 회귀
신규 테이블·migration 0 확인
D1 제외 확인
실행한 검증
미실행 항목과 사유
```

---

## 10. 실행 순서

1. 저장소 상태 확인
2. 최신 main 동기화
3. rejectMembership 구현·소비처 전수 조사
4. TypeORM 반환 구조 실측
5. role assignment 상태 정책 확인
6. 중지 조건 판단
7. 반환값 처리 수정
8. role 비활성화 구현
9. 재승인 재활성화 검증 및 필요 최소 수정
10. KPA 동기화 검증
11. 테스트 추가
12. typecheck/build
13. 가능 범위 E2E
14. CHECK 작성
15. path-specific stage
16. cached 파일 확인
17. commit
18. push
19. 완료 보고

---

## 11. Git 규칙

```text
git add . 금지
다른 세션 staged 파일 unstage 금지
공유 Core 관련 경로와 CHECK만 path-specific commit
```

commit 전:

```bash
git status --short
git diff --cached --stat
git diff --cached --name-only
```

권장 커밋 메시지:

```text
fix(membership): correct rejection result and role state
```

push 후:

```bash
git rev-parse HEAD
git status --short
```

---

## 12. 완료 보고 형식

### 1. 원인

```text
TypeORM 반환 구조
기존 코드의 잘못된 해석
영향 서비스
```

### 2. 구현

```text
반환값 수정
role 비활성화
재승인 재활성화
KPA 동기화
로그 정합성
```

### 3. 상태 전이

```text
pending → rejected
active → rejected
rejected → active
```

### 4. 서비스 격리

```text
대상 서비스 role만 변경
다른 서비스 membership·role 불변
```

### 5. 검증

```text
단위/통합 테스트
typecheck/build
서비스별 회귀
E2E
```

### 6. 제외 범위

```text
D1 신규 사용자 로그인 정책
재신청 정책
상품·주문
```

### 7. Git

```text
작업 전 HEAD
commit SHA
push 결과
작업 후 HEAD
잔여 작업 트리
```
