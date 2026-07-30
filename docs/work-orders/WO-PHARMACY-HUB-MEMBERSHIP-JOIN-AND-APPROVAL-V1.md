# WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1

> 상태: **등록 완료 (미실행)** — 핸드오프 전용
> 등록일: 2026-07-30
> 선행: [WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1](WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1.md) · [CHECK-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1](../checks/CHECK-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1.md) (커밋 `489f497de`, `b3f2ef807` — `main` 포함 확인)
> 산출 CHECK 경로: `docs/checks/CHECK-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1.md`

---

## 1. 핵심 목표

Pharmacy-Hub의 가입 신청과 운영자 승인 흐름을 기존 공통 회원 구조에 연결한다.

확정값:

```text
서비스명: Pharmacy-Hub
한글명: 파머시 허브
serviceKey: pharmacy-hub
도메인: pharmacyhub.co.kr
```

대상 역할:

```text
pharmacy-hub:store_owner
pharmacy-hub:supplier
pharmacy-hub:operator
```

기본 흐름:

```text
기존 O4O 사용자 또는 신규 사용자
→ Pharmacy-Hub 가입 신청
→ service_memberships.status = pending
→ Pharmacy-Hub 운영자 검토
→ 승인 시 active
→ 신청한 역할에 맞는 화면 진입
```

이번 승인은 **서비스 회원 가입 승인**이다.

다음과 혼동하지 않는다.

```text
상품 승인 아님
공급 승인 아님
거래 승인 아님
이벤트 오퍼 승인 아님
콘텐츠 승인 아님
```

---

## 2. 작업 시작 전

1. VS Code/Claude Code의 선택 영역 공유를 해제한다.

2. 현재 저장소와 상태를 확인한다.

```bash
git status --short
git branch --show-current
git rev-parse HEAD
```

3. 현재 작업 트리가 clean하지 않을 가능성이 있다.

기존 변경을 다음과 같이 처리하지 않는다.

```text
수정 금지
삭제 금지
stash 금지
revert 금지
임의 unstage 금지
이번 commit에 포함 금지
```

4. Pharmacy-Hub Foundation이 이미 `main`에 포함됐는지 확인한다.

관련 커밋:

```text
489f497de
b3f2ef807
```

관련 문서:

```text
docs/checks/CHECK-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1.md
```

5. 현재 `main`이 위 커밋 이후 더 진행되었을 수 있으므로 실제 최신 코드를 기준으로 작업한다.

6. 다른 병행 작업 변경이 있더라도 Pharmacy-Hub 관련 경로만 path-specific stage·commit한다.

`git add .`는 사용하지 않는다.

---

## 3. 현재 Foundation 기준

이미 구현된 구조를 우선 재사용한다.

```text
serviceKey: pharmacy-hub
event-offer key: pharmacy-hub-event-offer
service catalog 등록
role registry 등록
scope middleware 등록
backend pharmacy-hub route 골격
services/web-pharmacy-hub 앱 골격
역할별 기본 진입점
MembershipGate
```

현재 카탈로그의 `joinEnabled`는 `false`로 등록되어 있다.

이번 작업에서는 실제 가입 신청 흐름을 연결한 뒤 안전하게 활성화할 수 있을 때만 `true`로 전환한다.

---

## 4. 조사 범위

구현 전에 현재 공통 회원가입·가입 승인 구조를 실제 코드로 조사한다.

### 4.1 가입 신청 구조

다음을 확인한다.

```text
service_memberships entity/table
가입 신청 API
중복 신청 처리
pending/active/rejected/inactive 상태
role 또는 memberType 저장 방식
신규 사용자 회원가입과 기존 사용자 서비스 추가 가입의 차이
```

### 4.2 운영자 승인 구조

기존 서비스 중 재사용 가능한 승인 흐름을 조사한다.

우선 조사 대상:

```text
KPA Society 회원 승인
GlycoPharm 회원 승인
K-Cosmetics 회원 승인
Neture 공급자 승인
공통 service membership 운영자 API
```

확인 항목:

```text
pending 목록
상세 조회
승인
반려
재승인 또는 재신청
비활성화
승인자 기록
승인 일시
역할 부여
중복 role_assignment 방지
```

### 4.3 인증·권한 연결

다음을 확인한다.

```text
로그인 응답의 memberships
roles
MembershipGate
scope middleware
serviceKey별 접근 차단
```

### 4.4 프로필 데이터

가입 승인에 반드시 필요한 최소 필드만 확인한다.

약국 경영자 후보:

```text
이름
연락처
약국명 또는 조직명
사업자 또는 약국 식별정보가 기존 구조에 있다면 재사용
```

공급자 후보:

```text
기존 Neture 공급자 계정 연결 여부
회사명
담당자 정보
```

불필요한 신규 프로필 테이블이나 대규모 온보딩은 만들지 않는다.

---

## 5. 확정 정책

### 5.1 가입은 서비스별 독립

다른 O4O 서비스 회원이어도 Pharmacy-Hub에 자동 가입되지 않는다.

```text
KPA 회원 ≠ Pharmacy-Hub 회원
GlycoPharm 회원 ≠ Pharmacy-Hub 회원
K-Cosmetics 회원 ≠ Pharmacy-Hub 회원
Neture 공급자 ≠ Pharmacy-Hub 공급자 회원
```

단, 기존 사용자 계정과 기존 조직·공급자 원장은 재사용할 수 있다.

### 5.2 가입 신청 역할

사용자는 가입 신청 시 다음 중 하나를 선택한다.

```text
약국 경영자
공급자
```

운영자 역할은 일반 회원가입에서 신청하지 않는다.

```text
pharmacy-hub:operator
```

운영자는 기존 관리자 또는 권한 있는 운영자가 별도로 부여한다.

### 5.3 승인 결과

약국 경영자 승인:

```text
service_memberships.status = active
pharmacy-hub:store_owner 역할 부여
/store-owner 진입 허용
```

공급자 승인:

```text
service_memberships.status = active
pharmacy-hub:supplier 역할 부여
/supplier 진입 허용
```

운영자 승인:

```text
기존 관리자 권한 부여 흐름 재사용
pharmacy-hub:operator 역할
/operator 진입 허용
```

### 5.4 반려

반려 시 최소한 다음을 보존한다.

```text
status = rejected 또는 기존 공통 반려 상태
반려 사유
처리자
처리 일시
```

기존 공통 구조에 반려 사유 필드가 없다면 즉시 migration을 만들지 말고 현재 확장 가능성을 조사해 보고한다.

### 5.5 운영자 역할 분리

Pharmacy-Hub 운영자는 다음 업무만 담당한다.

```text
회원 가입 승인·반려
회원 상태 관리
서비스 운영
커뮤니티 관리
공지 및 운영자 콘텐츠
```

다음 권한은 주지 않는다.

```text
공급자 상품 승인
약국 주문 승인
공급자 콘텐츠 승인
일반 거래 개입
```

현재 Foundation의 1:1 `scopeRoleMapping`을 유지한다.

---

## 6. 구현 범위

### A. 가입 신청 API

기존 공통 API를 재사용할 수 있으면 재사용한다.

필요한 최소 동작:

```text
POST Pharmacy-Hub 가입 신청
GET 내 가입 상태
```

가입 신청 입력:

```text
roleType: store_owner | supplier
필요한 최소 프로필 정보
```

서버에서 강제할 값:

```text
serviceKey = pharmacy-hub
status = pending
```

클라이언트가 임의 serviceKey나 operator 역할을 전달해 가입할 수 없도록 한다.

중복 처리:

```text
이미 active → ALREADY_MEMBER
이미 pending → ALREADY_PENDING
rejected → 기존 정책에 따라 재신청 가능 여부 결정
inactive → 기존 재활성화 정책 확인
```

### B. 가입 화면

`services/web-pharmacy-hub`에 최소 가입 화면을 만든다.

후보 라우트:

```text
/join
/join/status
```

화면 흐름:

```text
역할 선택
→ 최소 정보 입력
→ 가입 신청
→ 승인 대기 상태
```

현재 `joinEnabled: false`는 실제 흐름이 연결된 후 `true`로 변경한다.

### C. 운영자 승인 API

Pharmacy-Hub 운영자 전용으로 다음을 제공한다.

```text
pending 회원 목록
회원 상세 또는 필요한 정보
승인
반려
```

모든 API는 다음 scope를 요구한다.

```text
pharmacy-hub:operator
```

조회와 mutation 모두 `service_key='pharmacy-hub'`로 제한한다.

다른 서비스 membership을 조회하거나 변경하면 안 된다.

### D. 운영자 승인 화면

`services/web-pharmacy-hub` 운영자 영역에 최소 승인 콘솔을 추가한다.

후보 라우트:

```text
/operator/memberships
/operator/memberships/:id
```

최소 UI:

```text
신청자
신청 역할
신청 일시
현재 상태
승인
반려
반려 사유
```

기존 공통 DataTable·페이지네이션·ActionBar가 있으면 재사용한다.

새로운 UI 패턴을 만들지 않는다.

### E. 역할 부여

승인 시 기존 `role_assignments` 구조를 사용한다.

다음 조건을 보장한다.

```text
역할 중복 생성 없음
membership active와 role assignment가 정합
반려 시 역할 부여 없음
다른 서비스 역할 영향 없음
```

membership 승인과 역할 부여는 가능하면 하나의 트랜잭션으로 처리한다.

트랜잭션 구현이 기존 공통 구조와 충돌하면 중지하고 보고한다.

### F. MembershipGate 연결

상태별 동작을 확인하고 필요한 최소 정비만 한다.

```text
미가입 → 가입 안내
pending → 승인 대기
rejected → 반려 사유 및 재신청 가능 여부
active → 역할별 대시보드
inactive → 이용 정지 안내
```

---

## 7. 데이터 구조 원칙

기존 구조를 사용한다.

```text
users
organizations
service_memberships
role_assignments
neture_suppliers
```

다음은 새로 만들지 않는다.

```text
pharmacy_hub_users
pharmacy_hub_members
pharmacy_hub_suppliers
pharmacy_hub_stores
별도 인증 테이블
별도 사용자 DB
```

약국 경영자 조직이 필요한 경우 기존 `organizations`와 기존 매장 조직 구조를 재사용한다.

공급자는 기존 Neture 공급자 계정 또는 조직과 연결한다.

공급자 회원 승인 시 새로운 공급자 원장을 복제하지 않는다.

---

## 8. platform_services 처리

현재 Pharmacy-Hub의 `platform_services` 행 존재 여부를 확인한다.

없다면 다음 중 실제 기존 구조에 맞는 최소 방식을 선택한다.

```text
기존 seed script에 Pharmacy-Hub 추가
기존 idempotent service registration 사용
최소 migration 또는 seed
```

단순 가입 기능을 위해 신규 전용 테이블 migration을 만들지 않는다.

`platform_services` 등록은 기존 서비스 등록 방식과 일치해야 한다.

예상 값:

```text
service_key = pharmacy-hub
display_name = Pharmacy-Hub
status = active
domain = pharmacyhub.co.kr
```

실제 컬럼은 현재 스키마에 맞춘다.

---

## 9. 제외 범위

이번 작업에서는 다음을 하지 않는다.

```text
공급자 상품 노출
상품 승인
상품 카탈로그
장바구니
주문·결제·정산
콘텐츠 저작·가져오기
커뮤니티
이벤트 오퍼
Market Trial
소비자 배송지
도메인 배포
DNS
Cloud Run
기존 서비스 회원 자동 편입
대규모 프로필 온보딩
CRM
```

---

## 10. 중지 조건

다음 중 하나라도 해당하면 구현을 확대하지 말고 조사 결과를 보고한다.

1. `service_memberships`가 역할별 가입 신청을 표현할 수 없는 경우
2. 승인과 역할 부여를 위해 공통 회원 모델을 대규모 변경해야 하는 경우
3. Pharmacy-Hub 승인 구현이 기존 서비스 승인 정책을 변경해야 하는 경우
4. 공급자 승인을 위해 SupplierProductOffer 또는 상품 승인까지 함께 구현해야 하는 경우
5. 가입 신청만으로 기존 KPA·Neture 회원 상태가 변경되는 경우
6. 운영자 권한이 상품·주문 권한과 분리되지 않는 경우
7. 병행 작업 파일 또는 보호 대상 파일 수정이 필요한 경우
8. 신규 전용 회원 테이블 없이는 구현이 불가능한 경우
9. 현재 공유 index 상태 때문에 안전한 path-specific commit이 불가능한 경우

---

## 11. 검증

최소 검증:

### Backend

```text
가입 신청 생성
중복 신청 차단
미가입 상태 조회
pending 상태 조회
운영자 pending 목록
운영자 승인
운영자 반려
active 회원 역할 부여
다른 서비스 membership 불변
비운영자 승인 API 접근 차단
```

### Frontend

```text
/join 렌더
약국 경영자 가입 신청
공급자 가입 신청
pending 안내
operator 승인 목록 렌더
승인 후 역할별 진입
반려 상태 표시
```

### 회귀

```text
web-pharmacy-hub typecheck/build
api-server typecheck
security-core 변경 시 build
기존 KPA/GlycoPharm/K-Cosmetics/Neture typecheck
serviceKey 충돌 0
Market Trial 연결 0
```

가능하면 로컬 DB 또는 승인된 테스트 환경에서 API smoke를 수행한다.

프로덕션 DB write나 실제 회원 승인은 별도 승인 없이 하지 않는다.

---

## 12. CHECK 문서

작성 경로:

```text
docs/checks/CHECK-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1.md
```

포함 내용:

```text
조사한 공통 membership 구조
재사용한 기존 API·서비스·컴포넌트
변경 파일
가입 신청 상태 전이
운영자 승인 상태 전이
역할 부여 방식
serviceKey 격리 검증
platform_services 처리
신규 테이블·migration 여부
실행한 검증과 결과
미실행 검증과 사유
병행 작업 파일 미포함 확인
후속 작업
```

---

## 13. 실행 순서

1. 작업 상태 확인
2. Pharmacy-Hub Foundation 포함 확인
3. 공통 가입·승인 구조 조사
4. 구현 방식 확정
5. 중지 조건 확인
6. 가입 신청 API 구현
7. 가입 화면 구현
8. 운영자 승인 API 구현
9. 운영자 승인 화면 구현
10. MembershipGate 상태 정렬
11. platform service 등록 확인·보완
12. typecheck/build
13. 가능한 범위 smoke
14. CHECK 작성
15. Pharmacy-Hub 관련 경로만 path-specific stage
16. staged 파일 확인
17. commit
18. push

---

## 14. Git 규칙

`git add .` 금지.

commit 전 확인:

```bash
git status --short
git diff --cached --stat
git diff --cached --name-only
```

병행 작업 파일이 cached 상태에 있어도 다른 세션이 stage한 것으로 판단되면 임의 unstage하지 않는다.

이번 작업 파일만 경로를 지정해 commit한다.

권장 커밋 메시지:

```text
feat(pharmacy-hub): add membership join and approval
```

push:

```bash
git push origin main
```

push 후:

```bash
git rev-parse HEAD
git status --short
```

작업 트리에 병행 작업 변경이 남아 있어도 Pharmacy-Hub 관련 미커밋이 0이면 실패가 아니다.

---

## 15. 완료 보고 형식

### 1. 조사 결과

```text
membership SSOT
승인 SSOT
역할 부여 구조
platform service 등록 방식
재사용한 기존 서비스
```

### 2. 구현 내용

```text
가입 API
가입 화면
상태 화면
운영자 승인 API
운영자 승인 화면
MembershipGate
역할 부여
```

### 3. 데이터 변경

```text
테이블
migration
seed
platform_services
```

### 4. 제외 범위

```text
상품
주문
콘텐츠
커뮤니티
이벤트 오퍼
배포
```

### 5. 검증 결과

```text
typecheck
build
API smoke
browser smoke
기존 서비스 회귀
서비스 격리
```

### 6. 후속 작업

우선순위:

```text
1. 공급자의 Pharmacy-Hub 상품 제공
2. 약국 B2B 카탈로그
3. 장바구니·주문
4. 콘텐츠
5. 커뮤니티
6. 이벤트 오퍼
7. 배송지 부가 기능
8. 배포·DNS
```

### 7. Git

```text
작업 전 HEAD
commit SHA
push 결과
작업 후 HEAD
잔여 작업 트리 상태
```

---

## 부록 — 등록 시점 사실 확인 (미실행, read-only)

| 항목 | 확인 결과 |
|---|---|
| 브랜치 / HEAD | `main` / `55c99593f` |
| Foundation 커밋 `489f497de` | `main` 포함 확인 (`git merge-base --is-ancestor`) |
| Foundation 커밋 `b3f2ef807` | `main` 포함 확인 |
| 작업 트리 | NOT clean — 병행 HFF/OTC 세션 변경 2건 잔존 (`apps/api-server/src/scripts/data/otc-v4-nr26-post-verification-all.ga.json`, `pnpm-lock.yaml`) · 미접촉 |
| 실행 여부 | **미실행** — 본 문서는 핸드오프 등록만 수행 |

§2-1(VS Code 선택 영역 공유 해제)은 편집기 측 설정으로 Claude Code가 수행할 수 없다. 실행 세션 시작 전 사용자가 직접 해제해야 한다.
