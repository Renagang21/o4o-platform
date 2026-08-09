# CHECK-O4O-SERVICE-MEMBER-SOFT-DELETE-CROSS-SERVICE-ISOLATION-V1

> WO: `WO-O4O-SERVICE-MEMBER-SOFT-DELETE-CROSS-SERVICE-ISOLATION-V1`
> 대상: 서비스 운영자의 회원 탈퇴(soft delete)를 해당 서비스 Membership 범위로 격리
> 브랜치: `fix/service-member-soft-delete-cross-service-isolation` (`origin/main` = `fea953983` 기준)
> 상태: **정비 완료 · 게이트 GREEN** — 계정 통제 경계 5방향(승인·반려·중지·재활성화·탈퇴) 종료

> **선행 브랜치**: `6443a322b`(반려), `7ea975c2c`(재활성화) 는 아직 main 에 없다.
> 본 브랜치는 지시대로 최신 `main` 에서 분기했다. 파일 교집합은 §9 참조.

---

## 0. 결론 요약

| 항목 | 결과 |
|---|---|
| 서비스 운영자의 `users` 전역 비활성화 | ✅ 제거 |
| 서비스 운영자가 **다른 서비스 Membership 까지 종료**하던 문제 | ✅ 제거 (WO 조사 중 추가 발견) |
| 플랫폼 관리자의 계정 전체 탈퇴 | ✅ 보존 |
| 대상 서비스 Role 종료 | ✅ 기존 로직 유지 (이미 권한별 스코프) |
| 플랫폼 Role 보존 | ✅ |
| 변경 규모 | 서비스 1개 파일 · `if (isPlatformAdmin)` 분기 1개 |
| 테스트 | 신규 8 케이스 |
| 게이트 | tsc / 전체 jest 77 suites·1283 tests / lint ratchet 전부 GREEN |
| 컨트롤러·라우트·프런트·schema·migration | **0건** |
| DB write | **0건** |

---

## 1. soft delete 의 전역 write-path

`MembershipApprovalService.deleteMember()` 의 `mode='soft'` 분기 (수정 전) — **전역 write 2개**:

```sql
-- 1) 계정 전역 비활성화 (스코프 없음)
UPDATE users SET status = 'deleted', "isActive" = false WHERE id = $1

-- 2) 모든 서비스의 membership 종료 (스코프 없음)  ← 조사 중 추가 발견
UPDATE service_memberships SET status = 'withdrawn' WHERE user_id = $1
```

**WO 가 지목한 것은 1번이지만 2번이 더 직접적이었다.** 한 서비스 운영자의 탈퇴 처리가
그 사용자의 KPA·Neture·K-Cosmetics membership 까지 전부 `withdrawn` 으로 만들고 있었다.

`requireAuth` 가 매 요청 `users.isActive` 를 검사하므로(`authentication.middleware.ts`),
1번은 **다른 서비스의 진행 중 세션까지 즉시** 끊었다.

반면 role 정리는 **이미 올바르게 스코프**돼 있었다:

```ts
const prefixesToClean = isPlatformAdmin
  ? ALL_SERVICE_KEYS.map(k => `${resolveRolePrefixFromCanonicalServiceKey(k)}:`)
  : serviceKeys.map(...).filter(p => p !== ':');
```

→ 즉 **role 축은 이미 권한 경계를 지키고 있었고, membership·users 축만 뚫려 있었다.**

---

## 2. 서비스 운영자와 플랫폼 관리자의 호출 경계

| 항목 | 값 |
|---|---|
| 라우트 | `DELETE /api/v1/operator/members/:userId?mode=soft\|hard` |
| 컨트롤러 | `MembershipConsoleController.deleteMember:1045` (**유일한 호출부**) |
| `hard` 권한 | `mode === 'hard' && !scope.isPlatformAdmin` → 403 |
| `soft` 권한 | **서비스 운영자 허용** ← 문제의 지점 |
| boundary check | `deleteMember` 내부에서 `service_memberships ... service_key = ANY($2)` 로 대상 제한 (유지) |

프런트 소비처 (전부 `mode=soft`, URL·payload 불변):

| 파일 | 용도 |
|---|---|
| `services/web-glycopharm/src/pages/operator/UsersPage.tsx:148, :355` | 단건 · 일괄 탈퇴 |
| `services/web-k-cosmetics/src/pages/operator/UsersPage.tsx:146` | 단건 탈퇴 |
| `services/web-glycopharm/src/pages/admin/GlycoPharmAdminMembersPage.tsx:129` | `?mode=${mode}` |
| `services/web-k-cosmetics/src/pages/admin/KCosmeticsAdminMembersPage.tsx:132` | `?mode=${mode}` |

---

## 3. 재사용한 Membership·Role 종료 계약

| 계약 | 재사용 방식 |
|---|---|
| `service_memberships.status = 'withdrawn'` | `withdrawMembership()` 과 **동일 enum** (`WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1`) 그대로 사용 |
| role prefix 비활성화 | 기존 `prefixesToClean` 로직 **무변경** — 이미 `isPlatformAdmin` 별 스코프 |
| 플랫폼 role 보호 | 기존과 동일 — `platform:*` 는 prefix 매핑에 없어 자동 비활성화 대상 아님 |
| 대상 사용자 제한 | 기존 boundary check 무변경 |

**새 상태값·새 헬퍼·새 추상화 0개.** `withdrawMembership()` 로의 위임은 하지 않았다 —
이미 열린 트랜잭션 안에서 별도 queryRunner 를 여는 중첩이 생기고, 반환 형태(boolean → WithdrawResult)가
바뀌어 컨트롤러 계약까지 건드려야 하기 때문이다. 대신 **같은 상태 전이를 같은 방식으로** 스코프만 맞췄다.

---

## 4. 제거한 users 전역 변경

```diff
-        await queryRunner.query(
-          `UPDATE users SET status = 'deleted', "isActive" = false ... WHERE id = $1`, [userId]);
-        await queryRunner.query(
-          `UPDATE service_memberships SET status = 'withdrawn' ... WHERE user_id = $1`, [userId]);
+        if (isPlatformAdmin) {
+          await queryRunner.query(
+            `UPDATE users SET status = 'deleted', "isActive" = false ... WHERE id = $1`, [userId]);
+          await queryRunner.query(
+            `UPDATE service_memberships SET status = 'withdrawn' ... WHERE user_id = $1`, [userId]);
+        } else {
+          await queryRunner.query(
+            `UPDATE service_memberships SET status = 'withdrawn' ...
+             WHERE user_id = $1 AND service_key = ANY($2)`, [userId, serviceKeys]);
+        }
```

| 호출자 | `users` | `service_memberships` | `role_assignments` |
|---|---|---|---|
| 서비스 운영자 | **접촉 없음** | 자기 serviceKeys 만 | 자기 prefix 만 (기존) |
| 플랫폼 관리자 | `deleted` + `isActive=false` (보존) | 전체 (보존) | 전 서비스 prefix (기존) |

`mode='hard'` 분기는 **무변경**이다 (컨트롤러가 platform admin 으로 제한). 그 안의
"남은 membership 이 없으면 users 비활성화"(STEP H4)도 platform-admin 전용이라 경계 위반이 아니다.

---

## 5. 다른 서비스 불변 검증

신규 `MembershipApprovalService.softDeleteBoundary.test.ts` (8/8 PASS).
FakeQueryRunner 가 membership/role/users 테이블을 실제로 갱신해 **행 상태로** 판정한다.

fixture: `u1` 이 glycopharm·kpa-society·neture 3개 서비스 active + `platform:super_admin` 보유.
glycopharm 운영자가 `mode=soft` 탈퇴 실행.

| WO 요구 검증 항목 | 결과 |
|---|---|
| 대상 서비스 이용 차단 | ✅ `m-glyco` → `withdrawn` (membership-guard 가 `status !== 'active'` 403) |
| 대상 서비스 Role 비활성화 | ✅ `glycopharm:pharmacy` → `is_active=false` |
| 다른 서비스 로그인·기존 세션 정상 | ✅ `users` write **0건**, `status='active'`·`isActive=true` 유지 |
| 다른 서비스 Membership 불변 | ✅ `m-kpa`·`m-neture` → `active` 유지 |
| 다른 서비스 Role 불변 | ✅ `kpa:member`·`neture:supplier` → `is_active=true` 유지 |
| users 공통 상태 불변 | ✅ |
| 플랫폼 관리자의 계정 전체 soft delete 정상 | ✅ `users` → `deleted`, 3개 membership 전부 `withdrawn` |
| 플랫폼 Role 보존 | ✅ `platform:super_admin` → `is_active=true` (양쪽 경로 모두) |
| 스코프 밖 사용자 차단 | ✅ boundary check → `false`, write 0건 |

추가로 확인한 것:
- **플랫폼 관리자의 복구**: `reactivateMembership` 이 `users.status='deleted'` 를 해제 대상으로 유지 → 보존.
- **서비스 운영자는 플랫폼 삭제 계정을 복구하지 못함**: 이 검증은 선행 브랜치 `7ea975c2c` 의
  `MembershipApprovalService.reactivationBoundary.test.ts` 가 담당한다(운영자 해제 후보 `['deleted']`).
  ⚠️ 단, **본 브랜치 기준 main 에는 `7ea975c2c` 가 없어 운영자가 `suspended` 도 해제할 수 있다** —
  두 브랜치가 함께 병합되어야 이 항목이 완결된다.

```
npx jest src/services/approval               → 22 passed (신규 8 + 기존 14)
cd apps/api-server && npx jest --maxWorkers=1 → 77 suites / 1283 tests PASS
npx tsc --noEmit -p tsconfig.json             → exit 0
node scripts/lint-ratchet.mjs                 → ESLint 102 errors (baseline 102 유지)
```

> **정직한 한계**: 프로덕션 실계정 다중 서비스 세션 E2E 는 수행하지 않았다(운영 데이터 write 필요, 금지).

---

## 6. 탈퇴 후 표시 정합성 (실행 5)

| 확인 | 결과 |
|---|---|
| 조회 API 기준 | `getMembers` 는 이미 **membership status 를 users.status 보다 우선** 사용 (`:223` `effectiveStatus`) |
| 목록 필터 | `sm_f.status` 기준 → `withdrawn` 필터 정상 |
| UI 라벨 | `status-withdrawn` → "탈퇴" 존재 (GlycoPharm `:269`, K-Cosmetics `:212`) |
| 변화 | 대상 서비스 운영자 화면: 이전과 동일하게 "탈퇴" 표시 (unchanged) |
| **개선** | 다른 서비스 운영자 화면: 이전에는 같은 사용자가 "탈퇴"로 보였으나 이제 **"활성"으로 정확히** 표시된다 |

프런트 변경 0건 — URL·payload·응답 형태 불변.

---

## 7. P2 `withdrawn` 감사에 남긴 정책 사항

이번에는 **전역 write 제거에 필요한 최소 의미**만 확정했다. 아래는 상태 체계·재가입 정책이라 P2 로 남긴다.

| # | 항목 |
|---|---|
| 1 | 서비스 탈퇴를 `withdrawn` / `rejected` / `suspended` 중 무엇으로 표현할지 (현재 `withdrawn` 유지) |
| 2 | `PATCH :userId/status { withdrawn }` 와 `DELETE :userId?mode=soft` 두 경로의 통합 여부 — **의미가 다를 수 있으므로 통합 대상으로 전제하지 않음** |
| 3 | 재가입 시 기존 membership 복원인지 신규 생성인지 |
| 4 | `PATCH status=withdrawn` 경로는 role 을 비활성화하지 않는다(soft delete 는 한다) — 두 경로의 role 처리 불일치 |
| 5 | 마지막 서비스 탈퇴 시 계정을 휴면 처리할지 (현재: 하지 않음. `hard` 경로만 STEP H4 로 처리) |
| 6 | `approveMembership` STEP2 가 `'deleted'` 계정을 되살리는 부분 — 같은 축 |

---

## 8. 금지사항 준수

- ❌ Membership 상태 체계 전면 재설계 — 하지 않음 (상태값·enum·schema 불변)
- ❌ withdrawn·suspended·rejected 의미 임의 통합 — 하지 않음
- ❌ 재가입 정책 확정 — 하지 않음
- ❌ 비밀번호 구조 변경 — 하지 않음
- ❌ JWT·refresh·role-cache 정비 — 하지 않음
- ❌ 운영 DB 보정 — 하지 않음 (DB 접근 0)
- ❌ main 병합 — 하지 않음

---

## 9. Git · 병합 시 주의

| 항목 | 값 |
|---|---|
| worktree | `C:/tmp/o4o-identity-v2` |
| 브랜치 | `fix/service-member-soft-delete-cross-service-isolation` (`origin/main` `fea953983` 기준) |
| 변경 | `MembershipApprovalService.ts` 1개 + 신규 테스트 1개 + 본 CHECK |
| migration | **0건** |
| main 병합 | ❌ |

**3개 미병합 브랜치의 파일 관계**

| 브랜치 | 코드 파일 |
|---|---|
| `6443a322b` 반려 격리 | `controllers/operator/MembershipConsoleController.ts` |
| `7ea975c2c` 재활성화 경계 | `services/approval/MembershipApprovalService.ts` (**reactivateMembership STEP2**) |
| `본 브랜치` soft delete 격리 | `services/approval/MembershipApprovalService.ts` (**deleteMember soft 분기**) |

`7ea975c2c` 와 본 브랜치는 **같은 파일의 서로 다른 메서드**를 고친다 —
텍스트 충돌 가능성은 낮으나 병합 후 `npx jest src/services/approval` 로 4개 테스트 파일이
함께 통과하는지 확인하는 것을 권장한다. `6443a322b` 는 파일이 달라 무관하다.
