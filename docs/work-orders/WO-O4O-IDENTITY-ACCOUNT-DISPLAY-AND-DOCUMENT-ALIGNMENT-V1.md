# WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1

> 접수일: 2026-09-24 · 상태: **접수 → 실행**
> 선행: [`WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1`](WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1.md) = **COMPLETE**
> CHECK: [`CHECK-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1`](../checks/CHECK-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1.md)

## 0. 작업 성격

**조사 → 표시 계약 확정 → 코드 정비 → 문서 정합 → 테스트/CI → 필요 시 배포 → CHECK** 를 한 WO 로 닫는다.
작은 후속 WO 로 쪼개지 않는다.

Identity/Authorization 의 **동작을 바꾸는 작업이 아니다.** 이미 확정된 Google-only Identity 와
`role_assignments` SSOT 를 **UI 와 문서가 정확히 표현하게** 만드는 작업이다.

## 1. 선행 상태 (완료로 취급)

```text
인증   Google sub → linked_accounts → users.id
       password runtime 0 · password schema 0   (2026-09-24 DROP)
권한   role_assignments (배열 전체로 판정)
운영   users 1 · google link 1 · platform:super_admin active · roles 11 · memberships 5
```

## 2. 문제

Admin Header 가 `user.role` 을 "역할" 로 표시한다. 그 값은 backend `roles[0]` 이고 role 조회에
정렬이 없어 **어느 role 이 담길지 보장되지 않는다.** 실제로 `platform:super_admin` 포함 11개를
가진 관리자 화면에 `kpa-branch:operator` 가 찍혔다. 인가는 배열 판정이므로 **권한 결함이 아니라 표시 결함**이다.

## 3. 원칙

- `roles[]` 가 권한 정본이다. `user.role` 스칼라를 authorization SSOT 로 승격하지 않는다.
- **DB/배열 순서로 대표 역할을 만들지 않는다.** `roles[0]` 을 의미 있는 대표로 취급하는 코드를 제거한다.
- **전역 role 우선순위 표를 신설하지 않는다.** 서비스마다 role 의미가 달라 단일 서열을 강요할 수 없다.
  이번에 정하는 것은 **Admin surface 한 곳의 표시 규칙**이다.
- 표시를 위해 **새 개인정보를 저장하지 않는다**(Google email/사진 snapshot 금지).
- `users.email` 은 인증 키가 아니다 — "로그인 계정/이메일" 로 표기하지 않는다. 다만 이번 WO 에서
  **컬럼 변경(DROP·NOT NULL 해제·NULL 처리)은 하지 않는다** — migration 0.

## 4. 표시 계약

```text
로그인 수단   Google
관리 권한     platform:super_admin 보유 → "최고 관리자"  (미보유 → 표시하지 않음)
프로필 이메일 users.email
```

`platform:super_admin` · `kpa-branch:operator` 같은 raw string 을 대표 역할로 노출하지 않는다.
역할 **목록** 화면에서는 raw 병행 가능하다.

## 5. 범위

| 포함 | 제외 |
|---|---|
| `user.role` / `roles[0]` / email 표시 consumer **전수 census + 판정표** | `users.email` optional migration |
| 활성 UI 의 비결정 대표 역할 제거 | Google email 저장 |
| `roles[0]` 기반 **접근 판정** 제거 | role_assignments · service_memberships 데이터 변경 |
| compatibility scalar 의 결정성 확보 | role hierarchy 재설계 · 전역 우선순위 신설 |
| ACTIVE Identity 문서 정합(SSOT · V3 · MYPAGE · CANONICAL-INDEX) | `login_attempts` 제거 · bcrypt 제거 · baseline rollover |
| 표시 계약 테스트 + 정적 guard | **F10 · F11 Freeze 본문 수정** (REPORT_ONLY) |

## 6. 완료 기준

§24 원문 그대로. 요약: 비결정 대표 역할 표시 0 · 접근 판정 scalar 소비 0 · 표시 계약 테스트 PASS ·
ACTIVE 문서 drift 0 · **migration 0 · production DB write 0** · CI PASS · (UI 변경 시) 통제 배포 + smoke PASS.

## 7. 산출물

- 본 WO
- CHECK (census 판정표 · 변경 목록 · 검증 · 배포/smoke 기록)
