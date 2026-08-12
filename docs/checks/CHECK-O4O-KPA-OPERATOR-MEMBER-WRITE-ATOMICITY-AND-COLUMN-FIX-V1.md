# CHECK-O4O-KPA-OPERATOR-MEMBER-WRITE-ATOMICITY-AND-COLUMN-FIX-V1

- **WO**: `WO-O4O-KPA-OPERATOR-MEMBER-WRITE-ATOMICITY-AND-COLUMN-FIX-V1`
- **선행 조사**: [`CHECK-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1`](CHECK-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1.md) — D-1 / D-2 / D-5, 최소 변경안 M1·M2·M3
- **일자**: 2026-08-12
- **판정**: **PASS** (코드 변경 + 회귀 테스트 12건 추가 · typecheck·영향범위 테스트 통과 · DB migration 0 · 운영 DB write 0)

---

## 1. 변경한 API 와 transaction 경계

대상 파일: [`apps/api-server/src/routes/kpa/controllers/member.controller.ts`](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts)

### 1-1. `PATCH /api/v1/kpa/members/:id/info`

| 단계 | 이전 | 이후 |
|---|---|---|
| `kpa_members` skeleton ensure (`INSERT`) | `dataSource.query` 단독 | **tx manager** |
| `kpa_members` 필드 저장 | `memberRepo.save` (전역 repo) | **tx manager** `manager.save(KpaMember, …)` |
| `users.name` | `dataSource.query` (컬럼 오타) | **tx manager** + `"updatedAt"` 교정 |
| `users.nickname` | `dataSource.query` | **tx manager** |
| `users.businessInfo` | `dataSource.query` | **tx manager** |
| `kpa_pharmacist_profiles` upsert | `dataSource.query` + swallow catch | **tx manager**, swallow 제거 |
| `role_assignments` (store_owner 회수) | `dataSource.query` + swallow catch | **tx manager**, swallow 제거 |
| store_owner **부여** (organizationOps / roleAssignment 서비스) | 별도 try, non-blocking | **경계 밖 유지** (commit 이후, 기존 계약대로 warnings) |
| audit log | 별도 try, non-blocking | **경계 밖 유지** (commit 이후) |

- transaction 밖에서 응답 계약을 유지하기 위해 sentinel `MemberInfoAbort(status, code, message)` 를 도입했다.
  transaction callback 은 `res` 를 직접 다루지 않고 이 오류를 throw 하며, 바깥 catch 가 기존 404 / 500 응답을 그대로 반환한다.
- `kpa_members` 저장 시점을 `pharmacy_address` 합성 **뒤 1회**로 옮겨 동일 transaction 내 중복 save 를 제거했다.

### 1-2. `PATCH /api/v1/kpa/members/:id/status`

| 전이 | 처리 |
|---|---|
| `pending → active` (승인) | **단일 transaction**: `kpa_members` save + `users`(status/isActive/approvedAt/approvedBy) + `kpa_pharmacist_profiles` \| `kpa_student_profiles` INSERT + `service_memberships` UPDATE + `kpa_member_services` 동기화 |
| `suspended` / `rejected` / `withdrawn` / `suspended → active` | `MembershipApprovalService` **위임을 먼저 수행**한 뒤, 성공한 경우에만 transaction 으로 `kpa_members` + `kpa_member_services` 저장 |
| pharmacy_owner 자동 활성화 · 알림 · 이메일 · audit log | **경계 밖 유지** (commit 이후, 기존 non-blocking + warnings 계약 그대로) |

**위임을 transaction 에 넣지 않은 이유**: `MembershipApprovalService` 의 approve/suspend/withdraw/reactivate 는
각각 `AppDataSource.createQueryRunner()` 로 **자체 transaction 과 `SELECT … FOR UPDATE` 행 잠금**을 소유한다.
바깥 transaction 안에서 호출하면 별도 connection 이 되어 (a) 바깥의 미커밋 변경을 보지 못하고 (b) 같은 행에 대한 lock 대기로 교착 위험이 있다.
그래서 **delegate → 성공 시에만 kpa_members write** 순서로 뒤집어, 위임 실패 시 `kpa_members` write 자체가 발생하지 않게 했다.

---

## 2. 기존 부분 성공 가능성을 어떻게 제거했는가

| 이전 부분 성공 시나리오 | 제거 방식 |
|---|---|
| 승인 시 `kpa_members`=active commit → `service_memberships` UPDATE 실패 → 삼킴 → 200 (D-2) | 두 write 가 같은 transaction. 실패 시 `kpa_members` 도 rollback, 500 반환 |
| 승인 시 `users.status` 갱신만 성공하고 자격 profile INSERT 실패 | 동일 transaction |
| 이름 수정 시 `kpa_members` commit 후 `users.name` write 가 컬럼 오타로 항상 실패 (D-1) | 컬럼 `"updatedAt"` 교정 + 동일 transaction |
| `/info` 의 6개 독립 write 중 임의 지점 실패 → 앞선 write 만 남음 (D-5) | 전부 동일 transaction manager |
| 정지·탈퇴 위임 실패 후에도 `kpa_members` 상태만 바뀌어 있음 | 위임을 먼저 수행하고 성공 시에만 저장 |

**남은(설계상 의도된) 비원자 구간** — 이번 WO 범위 밖, 기존 계약 유지:
`store_owner` 자동 부여/조직 생성(`organizationOpsService`, `roleAssignmentService`, `StoreSlugService`), 알림·이메일, audit log.
모두 외부 서비스가 자체 connection 을 쓰며 실패해도 회원 상태·회원정보 저장은 성공해야 한다는 기존 정책(`warnings[]` 노출)을 그대로 둔다.
또한 위임 성공 직후 `kpa_members` 저장이 실패하는 경우 `service_memberships` 만 반영된 상태가 남을 수 있다(순서를 뒤집기 전보다 노출 범위가 좁고, 응답은 500 이라 은폐되지 않는다). 근본 해소는 위임 서비스가 외부 manager 를 받도록 하는 별도 WO 가 필요하다.

---

## 3. 오류 은폐 제거와 최종 오류 응답

- 제거: `catch (syncError) { console.error('[WO-KPA-A-APPROVAL-RBAC-ALIGNMENT-V1] User/profile sync failed:', syncError); }`
- 제거: `/info` 의 `kpa_pharmacist_profiles` swallow catch, `role_assignments` 회수 swallow catch
- 최종 응답: 실패 시 기존 형식 그대로 `500 { error: { code: 'INTERNAL_ERROR', message } }`
  (404 Member not found, skeleton ensure 실패의 500 도 기존 code/message 유지)
- 응답 성공 계약(`{ data }`, `{ success, data, warnings? }`)은 **변경 없음**.

---

## 4. 추가한 테스트와 실패 주입 결과

파일: [`apps/api-server/src/routes/kpa/controllers/__tests__/member.controller.writeAtomicity.test.ts`](../../apps/api-server/src/routes/kpa/controllers/__tests__/member.controller.writeAtomicity.test.ts) — 12 케이스

| # | 케이스 | WO 검증 항목 |
|---|---|---|
| 1 | 정상 정보 수정 → 관련 write 전부 tx 안, tx 밖 write 0 | 1 |
| 2 | `UPDATE users` 는 `"updatedAt"` 만 사용, bare `updated_at` 0 | 5 |
| 3 | `users.nickname` write 실패 주입 → commit 0 / rollback 1 / 500 | 2 |
| 4 | legacy businessInfo 키 보존 + canonical 키만 갱신 | 회귀 |
| 5 | 정상 승인 → `users` + 자격 profile + `service_memberships` + `kpa_members` 가 한 tx | 3 |
| 6 | `UPDATE service_memberships` 실패 주입 → **200 아님**, 500 + 전체 rollback | 4 |
| 7 | `service_memberships` write 는 `service_key='kpa-society'` 로만 한정 | 7 |
| 8~10 | rejected / suspended / withdrawn 위임 회귀 | 6 |
| 11 | suspended → active 재승인 위임 회귀 (승인 전용 inline 동기화 미실행) | 6 |
| 12 | 위임 실패 → 삼키지 않고 500, `kpa_members` 저장 0 | 4·6 |

**변경 전 코드 대비 검증(regression proof)**: 동일 테스트를 `HEAD` 시점 컨트롤러로 실행 → **10 failed / 2 passed**.
변경 후 → **12 passed**. 즉 테스트가 실제로 결함을 잡는다.

---

## 5. typecheck · 테스트 · runtime smoke

| 검증 | 결과 |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` (apps/api-server) | **PASS** (오류 0) |
| 신규 테스트 | **12/12 PASS** |
| 영향 범위 테스트 (`src/routes/kpa`, `src/services/approval`, `src/controllers/operator/__tests__`, `kpa-role-guard`, `kpa-boundary-regression`) | **9 suites / 128 tests PASS** |
| 실제 API runtime smoke | **미수행** — 두 엔드포인트 모두 프로덕션 회원 데이터를 변경하는 write API 다. WO 의 "운영 데이터 변경이 필요한 smoke 는 하지 않는다" 조건에 해당한다. |
| 프로덕션 DB 조회 | **0건** (이번 WO 는 스키마·데이터 확인이 불필요) |

---

## 6. DB migration · 운영 DB write · 배포

- DB migration: **없음**
- 신규 테이블 / 컬럼 / backfill: **없음**
- 운영 DB write: **0건**
- 배포: **수행하지 않음** (main push 후 CI/CD 판단은 별도)
- 정책 미변경: `users.status` / `service_memberships.status` 의미, 승인·반려·탈퇴 상태 전이, role 부여 규칙, 서비스 경계, 응답 계약
- 범위 제외 유지: `businessInfo` 키 정렬, JSONB concat 전환, `organizations` 이중 entity 수렴

---

## 7. CHECK · commit · push · 작업트리

- 변경 파일 2개 (경로 한정 stage):
  - `apps/api-server/src/routes/kpa/controllers/member.controller.ts`
  - `apps/api-server/src/routes/kpa/controllers/__tests__/member.controller.writeAtomicity.test.ts`
  - `docs/checks/CHECK-O4O-KPA-OPERATOR-MEMBER-WRITE-ATOMICITY-AND-COLUMN-FIX-V1.md`
- 다른 세션 소유의 dirty·미추적 파일(`auth-register.controller.ts`, `kpa-branch/*`)은 **접촉하지 않음**
- commit / push 결과는 완료 보고에 기재

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
(위임 서비스가 외부 transaction manager 를 받도록 하는 `MembershipApprovalService` manager 주입 — §2 잔여 구간)
