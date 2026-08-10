# WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1

> 관리자 화면에서 **서비스 운영자(Pharmacy-Hub 포함)** 를 등록하고,
> 그 계정이 **해당 서비스 Identity V2 credential 로 실제 로그인**되게 한다.

- 상태: ACTIVE
- 등록일: 2026-08-10
- 기준: 최신 `origin/main`
- 관련: `WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1` (B6 서비스 비밀번호 계약),
  `WO-O4O-IDENTITY-V2-PHASE1-REGISTER-LOGIN-V1`, `WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1`

---

## 1. 목표 · 배경

코드 조사에서 확인된 현황이다.

1. `/settings/admin-accounts` 는 **플랫폼 관리자 계정 관리** 화면이며, 서비스 운영자 생성 기능은
   `/operators` (`OperatorsPage.tsx`) 에 있다. 두 화면에 생성 기능을 중복 구현하지 않는다.
2. `OperatorsPage` 의 `ASSIGNABLE_ROLES` 에 `pharmacy-hub:operator` 가 없다. 백엔드에는
   canonical serviceKey `pharmacy-hub`, 역할·scope guard·Membership 구조가 이미 존재한다 —
   **역할 부재가 아니라 등록 UI 카탈로그 누락**이다.
3. `POST /admin/users` 는 User · `role_assignments` · `service_memberships` 까지만 만들고
   **`service_credentials` 를 만들지 않는다**. 따라서 등록된 서비스 운영자는 해당 서비스에서
   Identity V2 credential 로 로그인할 수 없다(생성 계약 결손).
4. 생성 과정이 **단일 트랜잭션이 아니다**. 중간 실패 시 User 만 / 역할 일부만 / Membership 일부만
   남는 부분 생성이 가능하다.
5. 기존 사용자 경로는 입력 password 를 **사용하지 않고** `KEEP_EXISTING_PASSWORD` 로 응답한다.
   관리자가 초기 비밀번호가 적용됐다고 오인할 수 있다.

목표: Pharmacy-Hub 를 포함한 서비스 운영자를 관리자 화면에서 등록하고, 해당 서비스의
Identity V2 credential 로 실제 로그인할 수 있게 한다.

---

## 2. 승인 범위

- `/settings/admin-accounts` — “서비스 운영자 관리” 진입점 추가 (중복 생성 기능 금지)
- `/operators` — 운영자 등록 UI 정비 (Pharmacy-Hub 추가 · 대상 서비스 단일 선택 ·
  신규/기존 사용자 흐름 분리 · `platform:super_admin` 은 서비스 운영자 등록 대상에서 제외)
- `POST /admin/users` — 단일 트랜잭션 + 대상 서비스 credential 생성 계약
- 관련 테스트 · CHECK 문서

## 3. 실행 순서

1. `/settings/admin-accounts` 에 `/operators` 로 가는 “서비스 운영자 관리” 버튼만 추가한다.
2. `/operators` 등록 UI 정비.
   - `pharmacy-hub:operator` 추가, canonical serviceKey 는 기존 SSOT(`resolveCanonicalServiceKey`) 사용
   - 대상 서비스 하나를 명시적으로 선택, `platform:super_admin` 제외
   - 신규 사용자 / 기존 사용자 권한 추가를 명확히 구분
3. 등록 API 정비 — User 생성 또는 기존 User 확인 · 대상 서비스 role_assignment ·
   active Membership · 대상 서비스 credential 을 **단일 트랜잭션**으로 처리한다.
   실패 시 부분 생성 0, 다른 서비스 Membership·credential 불변.
4. 신규 사용자 — 최초 비밀번호는 선택한 서비스 credential 에 저장한다.
   `users.password` 를 서비스 로그인 원본으로 삼지 않는다. 스키마상 write 가 불가피하면
   현재 계약을 조사해 안전한 처리 근거를 제시하고 테스트로 고정한다.
5. 기존 사용자 — 중복 User 금지 · 같은 서비스 Membership 중복 금지 ·
   기존 credential 덮어쓰기 금지 · 없을 때만 명시적 초기 비밀번호로 생성 · 타 서비스 credential 불변.
6. 기존 P1/B6 서비스 비밀번호 변경 계약과 `resolveCanonicalServiceKey` 를 재사용한다.
   로컬 serviceKey 매핑을 만들지 않는다.

## 4. 제외 범위

- `/settings/admin-accounts` 의 별도 생성 모달
- 플랫폼 계정(`platform:super_admin`) 생성·비밀번호 정책
- Identity V2 · Frozen Core 계약 자체의 변경, migration
- 진행 중인 `UserForm` 작업 파일

## 5. 중지 조건

- `users.password` 스키마 또는 인증 계약 때문에 서비스 credential 단독 초기화가 불가능함
- 기존 사용자 credential 보존과 초기 생성을 안전하게 구분할 수 없음
- Identity V2 또는 Frozen Core 계약 변경이 필요함
- migration 이 필요함
- 진행 중인 `UserForm` 작업과 실제 파일 충돌 발생

## 6. 검증 · Git

- Pharmacy-Hub 선택 가능 / 신규 Pharmacy-Hub 운영자 등록
- 생성 credential 로 Pharmacy-Hub 로그인 성공 · 잘못된 비밀번호 실패
- Pharmacy-Hub 운영자 보호 route 진입 · 다른 서비스 route 접근 거부
- 기존 사용자 권한 추가 및 중복 방지 · 다른 서비스 credential 불변
- 실패 주입 시 User·role·Membership·credential 부분 생성 0
- OperatorsPage P1/B6 회귀 없음 · auth-react 인증 회귀 없음
- 테스트 · typecheck · lint ratchet · build · migration 0 확인
- path-specific stage → commit → push (main 병합·배포는 완료 보고 후 판단)

## 7. 완료 보고

1. 확인된 현황과 실제 원인
2. `/settings/admin-accounts` 변경
3. `/operators` 등록 UI 변경
4. `POST /admin/users` 계약 변경 (트랜잭션 · credential)
5. 신규/기존 사용자 분기 계약
6. 검증 결과 (테스트 · typecheck · build · 브라우저)
7. 미검증·제한 사항
8. CHECK · commit · push · 문서 정합
