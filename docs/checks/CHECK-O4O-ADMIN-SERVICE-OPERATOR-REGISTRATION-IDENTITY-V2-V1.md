# CHECK-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1

> WO: [`WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1`](../work-orders/WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1.md)
> 일자: 2026-08-10 · 기준: `origin/main`

---

## 1. 확인된 현황 (조사 결과)

| # | 사실 | 판정 |
|---|------|------|
| 1 | `/settings/admin-accounts` 는 **플랫폼 관리자 계정** 화면. 서비스 운영자 생성은 `/operators` 에 존재 | 중복 구현 금지 — 진입점만 추가 |
| 2 | `OperatorsPage.ASSIGNABLE_ROLES` 에 `pharmacy-hub:operator` 없음. backend 는 role·scope guard·Membership 보유 | **등록 UI 카탈로그 누락** |
| 3 | `POST /admin/users` 가 `service_credentials` 를 만들지 않음 | **생성 계약 결손** — 등록된 운영자가 Identity V2 로그인 불가 |
| 4 | 생성이 단일 트랜잭션이 아님 | 부분 생성(User만/역할일부/Membership일부) 가능 |
| 5 | 기존 사용자 경로가 입력 password 를 쓰지 않고 `KEEP_EXISTING_PASSWORD` 응답 | 관리자 오인 — 신규/기존 분리 필요 |

## 2. 변경 내용

### 2-1. `/settings/admin-accounts` — 진입점만
- "서비스 운영자 관리" 버튼 → `/operators` (`navigate`), 두 화면 역할 경계 안내 배너 1개.
- **생성 모달·생성 API 호출 없음** (중복 계약 방지).

### 2-2. `/operators` 등록 UI
- 카탈로그에 `pharmacy-hub:operator` 추가 (`rbac-catalog.ts` 에 `pharmacy-hub` 서비스 메타 포함).
- `platform:super_admin` 을 **등록 카탈로그에서 제외**. 편집 화면에서는 카탈로그 밖 role 을
  읽기 전용으로 보존·표시(체크 해제로 조용히 사라지는 것 방지).
- 등록 시 **대상 서비스 1개 + 역할 1개** 선택. canonical key 는 `resolveCanonicalServiceKey` SSOT 표시·전송.
- **신규 사용자 등록 / 기존 사용자 권한 추가** 라디오 분리.
  - 신규: 최초 비밀번호 필수(8자) → 선택 서비스 credential 로 저장
  - 기존: 초기 비밀번호 선택 입력 — credential 이 **없을 때만** 사용, 있으면 유지
- 서버 계약 코드(`SERVICE_PASSWORD_REQUIRED` / `SERVICE_PASSWORD_TOO_SHORT` /
  `MULTI_SERVICE_NOT_ALLOWED` / `SERVICE_KEY_MISMATCH`)를 해당 입력 필드 오류로 표면화.

#### 2-2-1. 재정비 — 대상 서비스 선택이 KPA 로 고정되던 결함 (사용자 지적, 동일 WO 범위)

1차 구현은 서비스 `<select>` 를 두었으나 **첫 서비스(KPA)를 기본값으로 자동 확정**했고,
select 가 입력창처럼 보여 다른 서비스를 고를 수 있다는 사실이 화면에서 드러나지 않았다.
→ 등록 대상이 KPA 로 고정될 위험(핵심 목적인 Pharmacy-Hub 등록 불가).

| 항목 | 재정비 후 |
|---|---|
| 단계 분리 | **1. 대상 서비스** / **2. 역할** 을 별도 블록으로 분리 |
| 서비스 목록 | KPA · Neture · Pharmacy-Hub · GlycoPharm · K-Cosmetics 5개를 라디오 카드로 **모두 노출** |
| 표시값 | 각 항목에 `resolveCanonicalServiceKey(key)` 결과를 함께 표기 (kpa-society / neture / pharmacy-hub / glycopharm / k-cosmetics) — 표시명에서 키를 추론하지 않는다 |
| 기본값 | **없음.** `targetServiceKey=''` · `targetRole=''` 로 시작하고 모달을 열 때도 자동 확정하지 않는다 |
| 역할 목록 | 선택한 서비스의 역할만 렌더. 미선택이면 안내문만 표시 (Pharmacy-Hub 는 Operator 하나) |
| 서비스 변경 | 역할 선택을 **초기화**한다(첫 역할 자동 확정 금지) — 표시 서비스와 실제 role 이 어긋나지 않는다 |
| 제출 차단 | 미선택 시 제출 버튼 disabled + `targetService`/`roles` 필드 오류 + 요청 생성 가드 |
| 적용 범위 | 신규 등록 / 기존 사용자 권한 추가 **양쪽 동일 구조** |

선택값 → 요청(`roles:[targetRole]`, `serviceKey: resolveCanonicalServiceKey(targetServiceKey)`)
→ 서버의 Membership · service_credentials 생성까지 **같은 값 하나**로 연결된다
(서버는 role 접두어에서 파생한 키와 다르면 `SERVICE_KEY_MISMATCH` 로 거부).

### 2-3. `POST /admin/users` 계약
- `resolveOperatorTargetServiceKey(roles, body.serviceKey)` 로 **대상 서비스 1개** 확정.
  다중 서비스 / 명시 키 불일치는 **아무것도 쓰기 전에** 400.
- 신규: `AppDataSource.transaction` 하나에서 User → role_assignments → service_memberships →
  service_credentials 생성. 실패 시 전부 롤백(부분 생성 0).
- 기존: 같은 트랜잭션에서 role·Membership 추가 + credential 은 **없을 때만** 생성.
  기존 credential 은 조회만 하고 덮어쓰지 않는다 → `credentialPolicy: 'KEEP_EXISTING_CREDENTIAL'`.
  credential 이 없는데 초기 비밀번호도 없으면 트랜잭션 안에서 계약 오류를 던져 role·Membership 까지 롤백.
- `roleAssignmentService.assignRole(input, manager?)` 에 선택적 `EntityManager` 추가.
  **write 경로는 그대로 하나**(F9) — 저장소만 트랜잭션 것으로 바꾼다.
- validator: `password` · `firstName` · `lastName` 을 optional 로 완화하고 필수 여부는
  controller 계약(`SERVICE_PASSWORD_REQUIRED` / `NAME_REQUIRED`)이 강제. (`POST /admin/users` 소비처는 `/operators` 하나)

### 2-4. `users.password` 처리 근거 (WO 실행 4)
`users.password` 는 **NOT NULL** 이라 신규 생성에서 생략할 수 없다. 안전 근거:
- 로그인은 `serviceKey` 가 오면 `service_credentials` 를 우선 사용한다
  (`auth-login.service.ts`: `credentialHash ?? user.password`) — **서비스 로그인 원본은 credential**.
- 우리는 그 credential 을 **같은 트랜잭션**에서 만든다.
- 이는 일반 가입 경로(`auth-register.controller.ts`)가 같은 hash 를 users.password + credential 에
  동시에 기록하는 기존 계약과 동일하다.
→ 테스트 `users.password(L1) 와 서비스 credential(L2) 은 같은 hash 다` 로 고정.

## 3. 검증 결과

| 항목 | 결과 |
|------|------|
| api-server jest 전체 | **83 suites / 1349 tests PASS** |
| 신규 등록 계약 테스트 (14) | PASS — 단일 트랜잭션 · credential 생성 · 기존 credential 유지 · 부분 생성 0 · 다중 서비스 거절 |
| admin-dashboard vitest 전체 | **12 files / 207 tests PASS** (OperatorsPage P1·B6 회귀 + 서비스 선택 재정비 6건 포함) |
| 서비스 선택 계약 테스트 (신규 6) | PASS — 5서비스 노출 · 기본값 없음 · 서비스 변경 시 역할 초기화 · 미선택 제출 차단 · 선택 서비스 역할만 렌더 · canonical key SSOT 표시 |
| type-check (api-server / admin-dashboard) | PASS |
| lint (변경 6파일) | error 0 (기존 warning 1건 — `AdminAccountsSettings` useMemo deps, 본 변경과 무관) |
| build (api-server / admin-dashboard) | PASS |
| migration | **0건** (스키마 변경 없음) |

## 4. 미검증 · 제한 사항

- **프로덕션 브라우저 검증 미수행.** 등록·로그인 검증은 프로덕션에 **실제 운영자 계정을 생성**하는
  write 이며, 배포된 리비전이 필요하다. CLAUDE.md §0 (데이터 변경 승인) · 중지 조건(실제 계정·자격정보)에
  따라 **배포 후 사용자 승인 하에 수행**한다. 대상 시나리오:
  1. 5개 서비스 노출 확인 → Pharmacy-Hub 선택 → 역할 목록이 Operator 하나로 바뀜 → 신규 운영자 등록
  2. 생성 credential 로 Pharmacy-Hub 로그인 성공 / 잘못된 비밀번호 실패
  3. Pharmacy-Hub 보호 route 진입 · 다른 서비스 route 거부
  4. 기존 사용자 권한 추가 시 타 서비스 credential 불변
- 실패 주입에 의한 부분 생성 0 은 **트랜잭션 stub 단위 테스트**로 검증했다(실 DB 롤백 관측 아님).

## 5. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
