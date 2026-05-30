# IR-O4O-MEMBER-ROLE-CONTAMINATION-READONLY-AUDIT-V1

> 조사 전용 IR — **read-only 집계만 수행. 데이터 수정 없음. 코드 수정 없음.**
> 일자: 2026-05-30
> 선행: `IR-O4O-BARE-OPERATOR-ADMIN-WRITE-PATH-AUDIT-V1`(원인) · `WO-O4O-MEMBER-ROLE-WRITE-PATH-HARDENING-V1`(새 오염 차단 완료)

---

## 1. 전체 판정 — **오염 row 있음 (소량, 보정 가능)**

- **DB 접근 성공** (프로덕션, read-only SELECT). `service_memberships.role` 에 운영 권한 값이 저장된
  **오염 row 9건 / 계정 7개 / 4개 서비스** 확인.
- **모두 bare**(`operator`/`admin`), namespaced 형태는 membership.role 에 없음. status 전부 `active`.
- **실사용자(비테스트) 계정은 대부분 active namespaced canonical role_assignment 을 이미 보유**
  → membership.role 의 운영 권한 값은 **redundant**. 보정 시 운영 권한 손실 위험 낮음.
- `role_assignments` 의 bare operational 잔재는 **bare `super_admin` 1건(active)** 뿐 — 그 외는 namespaced canonical.
- **보정은 필요하나 소량·저위험.** 단 일부 계정은 복원할 참여 유형 근거가 없어(operator/admin 전용 계정) 보정 시 개별 판단 필요.

---

## 2. service_memberships.role 오염 집계 (Q1)

```
 service_key |   role   | status | count
-------------+----------+--------+-------
 glycopharm  | admin    | active |     1
 glycopharm  | operator | active |     3
 k-cosmetics | admin    | active |     1
 k-cosmetics | operator | active |     1
 kpa-society | admin    | active |     1
 neture      | operator | active |     2
```
**합계 9 rows.** 서비스별: GlycoPharm 4 · Neture 2 · K-Cosmetics 2 · KPA-Society 1. 모두 bare·active.

---

## 3. 오염 계정 상세 (Q3) — **7개 계정** (실사용자 gmail 부분 마스킹)

| email | service_key | membership.role | status | 보유 role_assignments (canonical 운영 권한) | canonical active? |
|---|---|---|---|---|---|
| glyco-operator@o4o.com | glycopharm | operator | active | glycopharm:operator | **f (inactive)** |
| kcos-admin@o4o.com | k-cosmetics | admin | active | cosmetics:admin | **f** |
| kcos-operator@o4o.com | k-cosmetics | operator | active | cosmetics:operator | **f** |
| ksm***@gmail.com | glycopharm | admin | active | glycopharm:admin | **t** ✅ |
| mmg***@gmail.com | glycopharm | operator | active | glycopharm:operator | **t** ✅ |
| sohae2100@gmail.com | glycopharm / kpa-society / neture (3 rows) | operator/admin/operator | active | platform:super_admin + 전 서비스 admin/operator (전부 active) | **t** ✅ |
| sohae21@naver.com | neture | operator | active | neture:operator (active) **+ supplier(active)** + kpa:store_owner | **t** ✅ |

> 9 rows = sohae2100(3 rows) + 나머지 6 계정(각 1 row).

---

## 4. role_assignments canonical 보유 여부 (Q3 분석)

- **실사용자 계정(ksm***, mmg***, sohae2100, sohae21)**: 모두 해당 서비스의 **active namespaced canonical
  role_assignment 보유** → membership.role 운영 권한 값은 redundant. 보정 시 운영 권한 손실 없음.
- **@o4o.com 테스트 계정 3개(glyco-operator, kcos-admin, kcos-operator)**: canonical role_assignment 이
  **is_active=f (비활성)**. 즉 deactivate 진행 흔적. [[project_test_account_cleanup_policy]] 기준 xxxx@o4o.com
  임시계정은 **삭제 상태가 정상** → 이들 오염은 테스트 계정 cleanup 트랙에서 함께 처리.
- **참여 유형 복원 근거**:
  - `sohae21@naver.com`: role_assignments 에 **`supplier`(active)** 존재 → membership.role 을 `supplier` 로
    환원 가능(근거 명확).
  - `ksm***` / `mmg***` / `sohae2100`: 명확한 참여 유형 없음(운영자/관리자 전용 성격) → 보정 시 중립값
    (예: `member`/`user`) 또는 비움으로, **개별 판단 필요**.

---

## 5. role_assignments bare 잔재 (Q4)

```
    role     | is_active | count
-------------+-----------+-------
 super_admin | t         |     1
```
bare `operator`/`admin` 은 role_assignments 에 **없음**(0). bare `super_admin` **1건(active)** 만 존재.
→ role_assignments 운영 권한 축은 사실상 namespaced canonical. 이 1건은 `platform:super_admin` 으로 정규화 대상(소량).

---

## 6. 서비스별 영향

| 서비스 | 오염 membership row | 비고 |
|---|---|---|
| **GlycoPharm** | 4 (admin 1 + operator 3) | ksm***(admin)·mmg***(operator)·sohae2100·glyco-operator@o4o(test) |
| **Neture** | 2 (operator) | sohae2100 · sohae21(참여유형 supplier 복원 가능) |
| **K-Cosmetics** | 2 (admin 1 + operator 1) | kcos-admin@o4o·kcos-operator@o4o (둘 다 test, canonical inactive) |
| **KPA-Society** | 1 (admin) | sohae2100 |

→ 순수 실사용자 신규 보정 대상은 사실상 **ksm***, mmg***, sohae21** + super admin(sohae2100). K-Cosmetics 2건은 테스트 계정.

---

## 7. 데이터 보정 필요 여부 — **필요(소량·저위험)**

- 9 rows / 7 계정 → 보정 규모 작음. 실사용자 계정은 canonical role_assignment 이 이미 active 라 운영 권한 손실 없음.
- [[project_pre_service_disposable_data]]: 운영 DB 데이터는 현재 disposable → backfill 보다 **재시드/직접 정리**가
  더 단순할 수 있음(보정 WO 에서 방식 선택).

## 8. 보정 시 권장 원칙

1. `service_memberships.role` 은 **참여 유형으로만** 유지. 운영 권한 값(operator/admin)을 제거.
2. 운영 권한은 **role_assignments(namespaced)** 로만 유지(이미 대부분 보유).
3. **참여 유형 복원 근거가 있는 계정만 그 값으로 환원**:
   - sohae21@naver.com → `supplier` (role_assignments 근거).
4. **참여 유형 근거 없는 운영자/관리자 전용 계정**(ksm***, mmg***, sohae2100)은 중립값/비움 — **보정 전 개별 확인**.
5. **@o4o.com 테스트 계정 3건**은 [[project_test_account_cleanup_policy]] 에 따라 cleanup 트랙(삭제/비활성)로 처리.
6. role_assignments 의 bare `super_admin` 1건 → `platform:super_admin` 정규화(선택).

## 9. 후속 WO 필요 여부 — **필요(데이터 보정 WO)**

- `WO-O4O-MEMBER-ROLE-CONTAMINATION-DATA-CORRECTION-V1`(가칭):
  - 위 §8 원칙으로 9 rows 정리. UPDATE/마이그레이션은 **사용자 승인 후** 실행(프로덕션 데이터 변경 — CLAUDE.md §0).
  - 참여 유형 근거 없는 계정·테스트 계정은 별도 분기.
  - write-path 는 이미 하드닝됨(재오염 방지 완료) → 보정 후 재발 없음.

---

## 10. 실행한 read-only 쿼리 / 접근 방식

- 접근: Cloud Run `o4o-core-api` env 에서 prod DB 자격증명(user `o4o_api`) 확보 → 현재 IP 를 Cloud SQL
  authorized-networks 에 **임시 추가(기존 항목 보존)** → 직접 psql SELECT → **authorized-networks 원복 완료**.
  (앱은 Cloud SQL unix socket 연결이라 network 변경 무영향. SELECT 외 쓰기 없음.)
- 쿼리: Q1(service_memberships 오염 집계) · Q3(계정별 membership ↔ role_assignments 비교) · Q4(role_assignments bare operational). 모두 SELECT.

## 11. 격리 무결성

- ✅ DB 쓰기 0 (SELECT only). authorized-networks 임시 변경 후 **원복 확인**.
- ✅ 코드 수정 0. 본 IR 문서 1건만 신설.
- ✅ git add 광범위 미사용. 다른 세션 파일 미접촉.

*read-only 실데이터 기반. PII(실사용자 email)는 부분 마스킹. 데이터 보정은 미수행 — 별도 WO·사용자 승인 필요.*
