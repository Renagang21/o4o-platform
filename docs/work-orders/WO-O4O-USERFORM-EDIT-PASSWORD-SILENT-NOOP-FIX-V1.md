# WO-O4O-USERFORM-EDIT-PASSWORD-SILENT-NOOP-FIX-V1

- **상태**: HANDOFF (미착수)
- **작성일**: 2026-08-10
- **유형**: 소규모 정비 (프런트 중심 + 백엔드 계약 명시화 검토)
- **선행**: OperatorsPage P1 / B6 계약 (변경 대상 아님)
- **후속**: P2 신규 운영자 생성 credential 정책 (별도 WO)

---

## 1. 목표 · 배경

`UserForm` 수정 화면에서 비밀번호를 입력해도 `PUT /v1/users/:id` 가 이를 처리하지 않는다.
사용자는 "저장됨" 응답을 받지만 비밀번호는 바뀌지 않는 **사일런트 무효(silent no-op)** 이며,
관리자가 비밀번호를 바꿨다고 오인할 수 있는 거짓 성공 경로다.

이 WO 의 핵심은 **비밀번호 변경 기능을 새로 만드는 것이 아니라, 작동하지 않는 입력을 제거하여
거짓 성공 가능성을 없애는 것**이다.

## 2. 승인 범위

- `pages/users/UserForm.tsx`
- `UserForm` 의 생성 · 수정 라우트
- `POST /v1/users` 생성 계약 (유지 확인)
- `PUT /v1/users/:id` 수정 계약 (password 처리 방침 확정)
- 관련 테스트 및 CHECK 문서

## 3. 실행 순서

### 3-1. 조사

1. `UserForm` 을 사용하는 모든 라우트와 진입점을 확인한다.
2. 생성 · 수정 모드가 같은 폼을 공유하는 방식을 확인한다.
3. `POST /v1/users` 에서 `password` 가 실제로 사용되는 경로를 확인한다.
4. `PUT /v1/users/:id` 의 허용 필드와 `password` 미처리 사실을 확인한다.
5. 별도의 정상적인 서비스 비밀번호 변경 화면 · API 로 안내할 수 있는지 확인한다.
6. `UserForm` 이 어느 서비스 범위의 사용자를 관리하는지 확인한다.

### 3-2. 구현 원칙

- 생성 모드의 `password` 입력과 `POST /v1/users` 계약은 **유지**한다.
- 수정 모드에서는 작동하지 않는 `password` 입력을 제거하고, 수정 요청에 `password` 를 전송하지 않는다.
- 수정 화면에는 필요할 경우 "비밀번호는 해당 서비스의 비밀번호 변경 기능에서 변경하세요" 라는
  **짧은 안내만** 제공한다.
- 어느 서비스의 credential 을 변경할지 확정할 수 없다면 이 화면에 **새로운 비밀번호 변경 기능을 만들지 않는다.**
- `PUT /v1/users/:id` 에 새로운 password write 를 추가하지 않는다.
- `users.password` 및 service credential 을 이번 작업에서 변경하지 않는다.

### 3-3. 백엔드 확인

- `PUT /v1/users/:id` 가 `password` 를 조용히 무시하는 계약을 **명시적으로 거부**해야 하는지 소비처 전체를 조사한다.
- 다른 소비처가 없다면 `password` 필드 전달 시 **400 명시적 거부**를 우선한다.
- 소비처나 호환성 문제가 발견되면 **프런트 수정만 완료**하고 백엔드 거부는 별도 판단 대상으로 보고한다.
- 빈 문자열도 조용히 허용하지 않는 방향으로 검토한다.

## 4. 제외 범위

- OperatorsPage 의 P1 구현 및 B6 계약 — 변경 금지
- `POST /admin/users` 신규 운영자 생성(P2) — 변경 금지
- migration, 운영 DB 직접 write — 금지
- 새로운 비밀번호 변경 · 초대 · 재설정 기능 신설 — 금지

## 5. 중지 조건

- 생성 · 수정 모드를 안전하게 구분할 수 없음
- `UserForm` 수정에서 실제 비밀번호 변경 기능이 반드시 필요함
- 대상 `serviceKey` 또는 Membership 을 유일하게 확정해야만 수정 가능함
- `PUT /v1/users/:id` 의 `password` 가 다른 정상 소비처에서 사용됨
- P2 신규 운영자 생성 계약 변경이 필요함
- 진행 중인 인증 공통화 작업과 실제 파일 충돌 발생

## 6. 검증 · Git

**검증**

- 생성 모드에 password 입력이 유지됨
- 생성 요청에 기존과 동일하게 password 가 포함됨
- 수정 모드에 password 입력이 없음
- 수정 요청에 password 가 포함되지 않음
- 일반 사용자 정보 수정은 정상 작동
- `users.password` write 0 / service credential write 0
- OperatorsPage 와 B6 계약 불변
- 관련 프런트 · 백엔드 테스트
- 타입검사 · lint ratchet · 관련 build
- migration 0 확인
- CHECK 작성

**Git**

- 전부 통과하면 **별도 브랜치**에 커밋 · push 한다
  (CLAUDE.md §1 은 main 직접 작업이 기본이나, 본 WO 가 명시적으로 별도 브랜치를 지정하므로 예외에 해당한다)
- main 병합 · 배포는 완료 보고 후 판단한다

## 7. 완료 보고

1. `UserForm` 의 생성 · 수정 라우트와 호출 경로
2. 사일런트 무효의 정확한 원인
3. 수정 모드에서 제거한 UI · 전송값
4. 생성 모드 및 `POST` 계약 불변 증명
5. `PUT /v1/users/:id` 의 password 거부 적용 여부와 근거
6. 테스트 · typecheck · lint · build 결과
7. `users.password` 와 service credential write 0 증명
8. 남은 P2 신규 운영자 credential 문제
9. 문서 정합 (CLAUDE.md §16-5)

---

## 부록 — 후속 P2 결정 항목

신규 운영자 생성 시 다음 3가지를 확정해야 하며, 서비스와 Membership 을 명시해야 하므로 본 WO 와 분리한다.

- 어느 서비스의 운영자로 생성하는가
- 최초 서비스 credential 을 생성할 것인가
- 초기 비밀번호를 관리자가 정할지, 초대 · 재설정 방식으로 만들지
