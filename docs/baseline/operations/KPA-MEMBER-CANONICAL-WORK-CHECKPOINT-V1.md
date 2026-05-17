# KPA Member Canonical 정비 — 중간 정리 지점 (Work Checkpoint V1)

**작성일**: 2026-05-17
**상태**: PAUSED — 새 작업으로 재설계 예정
**유형**: Work checkpoint (사실 기록 docs — 코드/DB 변경 없음)

---

## 0. 이 문서의 목적

KPA 회원 canonical lifecycle 정비를 시도했으나 진단 단계에서 **운영 DB 접근 채널 제약** 으로 중단됨.
현재 상태를 사실 그대로 기록하여, 향후 **새 작업에서 처음부터 재조사 후 단일 정비 작업으로 재설계** 할 때 출발점으로 활용한다.

---

## 1. 시도한 작업 — WO-O4O-KPA-MEMBER-CANONICAL-PRESENCE-BACKFILL-V1 (5단계 분리)

근거 IR: [IR-O4O-KPA-OPERATOR-PROFILE-PRESENCE-AUDIT-V1](../../investigations/IR-O4O-KPA-OPERATOR-PROFILE-PRESENCE-AUDIT-V1.md)

| Step | 내용 | 상태 |
|------|------|:----:|
| 1 | 진단 SQL 문서 추가 ([KPA-MEMBERS-PRESENCE-DRIFT-DIAGNOSTICS.md](./KPA-MEMBERS-PRESENCE-DRIFT-DIAGNOSTICS.md)) | ✅ **완료·검증 → push 됨** |
| 2 | Backfill migration (`kpa_members` skeleton 생성, ON CONFLICT DO NOTHING) | ⏸️ **미작성 / 미commit** |
| 3 | AdminUserController — KPA scope user 생성 시 `kpa_members` ensure | ⏸️ **미착수** |
| 4 | member.controller 자동 pharmacy_owner 활성화 — skeleton ensure | ⏸️ **미착수** |
| 5 | operator UI 라벨 정확화 + fallback 정보 표시 | ⏸️ **미착수** |

→ **이 WO 흐름은 본 시점에서 중단**. 후속 작업은 본 WO 의 5단계 분리 구조를 폐기하고 **하나의 정비 작업으로 재설계**.

---

## 2. 이 세션에서 push 된 commit (사실)

| Commit | 영역 | 검증 상태 |
|--------|------|----------|
| `4bf6724ff` — `refactor(kpa): WO-O4O-KPA-ACTIVITY-TYPE-ROLE-SYNC-V1 — activity_type 변경 시 store_owner role 동기화` | backend (`auth-account.controller.ts`) | typecheck pass, 사람 검증 별도 필요 |
| `a1e7cb986` — `docs(kpa): WO-O4O-KPA-MEMBER-CANONICAL-PRESENCE-BACKFILL-V1 Step 1 — kpa_members drift 진단 SQL 문서화` | docs only | 코드/DB 변경 0건 |

→ 본 checkpoint 외 추가 commit 예정 없음.

---

## 3. 진단 미실행 사실

[KPA-MEMBERS-PRESENCE-DRIFT-DIAGNOSTICS.md](./KPA-MEMBERS-PRESENCE-DRIFT-DIAGNOSTICS.md) 문서의 read-only 진단 SQL 3개 (전체 drift count / 샘플 10건 / derived membership_type 분포) 는 **이번 세션에서 실행되지 않음**.

### 시도 경과
| 채널 | 결과 |
|------|------|
| Cloud Console SQL Editor (사용자 직접 실행) | 결정 → 진행 보류로 변경 |
| `gcloud sql connect` + stdin SQL 주입 | PowerShell stdin 이 psql 의 password prompt 로 전달되지 않아 무한 대기 → 중단 |
| 직접 psql `-h 34.64.96.252` | TCP timeout (gcloud sql connect 가 추가한 IP 화이트리스트 5분 만료) |

### 환경 확인 (참고)
- psql 17.9 위치: `C:\Program Files\PostgreSQL\17\bin\psql.exe` (PATH 등록 없음, 세션 추가만)
- Cloud SQL instance: project `netureyoutube`, name `o4o-platform-db`, POSTGRES_15, IP `34.64.96.252`, state RUNNABLE
- SSL 정책: `ALLOW_UNENCRYPTED_AND_ENCRYPTED` (SSL 비필수)
- IAM 인증: 비활성 (password 인증 필수)
- DB users: `o4o_api`, `postgres` (BUILT_IN)

### 보안 이슈
이번 세션 중 production DB `postgres` 사용자의 password 가 대화 메시지로 평문 노출됨.
→ **즉시 password 회전 권장** (Console → SQL → 인스턴스 → Users → postgres → 비밀번호 변경).

---

## 4. 누적된 관련 commit (이전 세션 포함, 참고)

### Store Owner 정책 정렬 — 4단 정합 완성
| Commit | WO |
|--------|---|
| `6a6f9426e` | MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION (회원 승인 시 자동 부여) |
| `27efcbe87` | MYPAGE-CAPABILITY-CARD-AUTO-ALIGN (role 보유 시 카드 미표시) |
| `59a4cbf8e` | PHARMACY-OWNER-DIRECT-CHANGE-GUARD (직역 select 차단) |
| `4bf6724ff` | ACTIVITY-TYPE-ROLE-SYNC (직역 이탈 시 role revoke) |

### /mypage UI 일관성 정비
| Commit | Phase |
|--------|-------|
| `e46abe5a3` | IR 작성 |
| `a94279ae8` | Phase 1 — MyPageLayout 신설 |
| `6fbd716c5` | Phase 2 — Dashboard/Certificates/Credits/Enrollments |
| `cec43c595` | Phase 3 — Profile/Settings |
| `2ce518fb7` | Phase 4 — Forums/Requests |
| `ca92aa2fb` | Phase 5 — Qualifications |

→ /mypage 9개 화면 100% 완료. 본 WO 영향 없음.

---

## 5. 새 작업 재개 방향 (사용자 지시)

### 5-A. 처음부터 재조사
- 본 WO 의 IR ([IR-O4O-KPA-OPERATOR-PROFILE-PRESENCE-AUDIT-V1.md](../../investigations/IR-O4O-KPA-OPERATOR-PROFILE-PRESENCE-AUDIT-V1.md)) 는 참고로 활용 가능하나, 새 IR 작성 권장
- 조사 범위는 단일 화면 / 단일 흐름 한정이 아니라 **KPA 회원 canonical lifecycle 전체**:
  - 가입 (register) → 운영자 승인 → 직역 변경 → store_owner 전환 → 탈퇴
  - 각 단계에서 `users` / `service_memberships` / `kpa_members` / `kpa_pharmacist_profiles` / `kpa_student_profiles` / `users.businessInfo` / `role_assignments` / `organizations` / `organization_members` 가 어떻게 변하는지 매트릭스
  - admin 직접 추가 / migration / bootstrap seed 등 우회 경로 포함

### 5-B. 단일 정비 작업으로 재설계
- 본 WO 의 5단계 분리는 본 시점에서 **폐기**
- 새 작업은 lifecycle 전체 정합을 한 번에 다루는 단일 WO 또는 명확하게 정의된 phase 구조
- 진단 채널 — Cloud Console SQL Editor 사용을 기본 전제로 가정 (Claude Code 직접 실행 시도는 환경 제약으로 비효율)

### 5-C. 본 checkpoint 의 활용
- 새 작업에서 본 문서를 reference 로 인용 가능
- [KPA-MEMBERS-PRESENCE-DRIFT-DIAGNOSTICS.md](./KPA-MEMBERS-PRESENCE-DRIFT-DIAGNOSTICS.md) 의 진단 SQL 은 그대로 재활용 가능 (read-only)
- 위 §2 의 commit `4bf6724ff` (activity_type ↔ role sync) 는 새 작업에서 **충돌 없는 선행 기반**

---

## 6. 본 checkpoint 외 변경 없음 — 작업 트리 사실

본 commit (checkpoint docs 1건) 외 본 세션의 추가 변경 / 미commit 잔재 0건.

작업 트리에 남은 다른 세션의 modified / untracked 파일은 본 작업과 무관 (operator IA / community canonical audit 등 별도 흐름).

---

## 7. 참조

- 진단 SQL: [KPA-MEMBERS-PRESENCE-DRIFT-DIAGNOSTICS.md](./KPA-MEMBERS-PRESENCE-DRIFT-DIAGNOSTICS.md)
- 근거 IR (참고): `docs/investigations/IR-O4O-KPA-OPERATOR-PROFILE-PRESENCE-AUDIT-V1.md`
- 관련 IR (참고): `IR-O4O-KPA-ACTIVITY-TYPE-CHANGE-FLOW-AUDIT-V1`, `IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1`
- 운영 마이그레이션 표준: [PRODUCTION-MIGRATION-STANDARD.md](./PRODUCTION-MIGRATION-STANDARD.md)
- CLAUDE.md §0 (환경 원칙)

---

*Work checkpoint — 코드/DB 변경 없음. 향후 새 작업은 본 문서를 참고하되 처음부터 재조사·재설계.*
