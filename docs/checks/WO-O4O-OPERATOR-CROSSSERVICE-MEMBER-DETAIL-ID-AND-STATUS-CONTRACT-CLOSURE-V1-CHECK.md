# CHECK — WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-DETAIL-ID-AND-STATUS-CONTRACT-CLOSURE-V1

- 작성일: 2026-08-21
- 대상: KPA-Society / K-Cosmetics / Neture / PharmacyHub (GlycoPharm = 공유 모듈 회귀만)
- 커밋: `7387109bf` (D1~D3) · `b89115e0a` + `82e54ff21` (D4) · 본 CHECK 커밋은 §9
- 상태: (E2E 결과는 §5~§6)

---

## 1. KPA 회원 ID 계약 (WO §1)

canonical 계약은 직전 WO 커밋 `b0bfdd254` 에서 이미 확정되어 프로덕션에 반영돼 있다. 본 WO 는 이를 재확인하고 잔여 결함만 정리했다.

| 축 | canonical |
|---|---|
| 공통 Core `UserData.id` | **`users.id`** (전 서비스 동일) |
| `service_memberships.id` | backend 내부 write 대상 (프론트 노출 금지) |
| `kpa_members.id` | **KPA backend 경계 안에서만** — `resolveKpaMemberByAnyId` 가 `users.id` / `kpa_members.id` 양쪽을 수용 |

- wrapper(프론트)에서의 임의 ID 변환: **0건** — 변환은 backend `resolveKpaMemberByAnyId` 와 client adapter 경계에만 존재.
- `kpa_members` row 가 없는 정상 회원의 상태 변경 404: **0건** (ensure 경로가 skeleton row 를 생성한 뒤 상태 전이).
- "전체 상세 페이지 →" deep link 404: **0건**.

## 2. Neture 상태전이 계약 (WO §2)

`services/web-neture/src/pages/operator/UsersManagementPage.tsx:108-142` 확인.

- `rejected` 만 `/neture/operator/registrations/:id/reject` 를 호출한다 (가입 반려 의미 전용).
- 정지/활성화는 `PATCH /operator/members/:id/status` + `{ serviceKey: 'neture' }` 로 `active ⇄ suspended` 만 수행.
- 드로어의 `비활성화` 가 `reject` 로 새는 경로: **0건**.

## 3. PharmacyHub 회원 상세 (WO §3)

- route: `services/web-pharmacy-hub/src/App.tsx:472` `members/:id` → `OperatorUserDetailPage`.
- 상세 화면은 **공통 Core 재사용** — `services/web-pharmacy-hub/src/pages/operator/UserDetailPage.tsx` 는 `@o4o/ui` 의 `UserDetailPage` 에 adapter + config 만 주입한다 (신규 구조 없음).
- 목록 → 상세 deep link: `MembersPage.tsx:104` `fullDetailHref={(u) => '/operator/members/' + u.id}`.

## 4. lifecycle fan-out 경계 감사 (WO §4)

- write 축: `resolveWriteScope(req, scope)` 가 명시 `serviceKey` 로 좁힌다 → 상태 변경은 해당 serviceKey membership 에만 적용.
- 재활성화: `MembershipApprovalService.ts:828-845` — `liftableUserStatuses` 는 platform admin 일 때만 `['suspended','deleted']`, 서비스 운영자는 `['deleted']`. 즉 **서비스 운영자의 재활성화가 플랫폼 정지를 해제하지 않는다.**
- 실측(§5 Neture E2E): 5개 서비스 membership 을 모두 가진 fixture 를 Neture 에서 정지시켰을 때 neture 만 `suspended`, pharmacy-hub / glycopharm / k-cosmetics / kpa-society 는 `active` 유지. **서비스 간 침범 0건.**
- `users.status` 는 정지·복구 전후로 변경되지 않았다 (수정일 포함 동일). **불필요 변경 0건.**

## 5. 이번 WO 에서 발견·수정한 결함 4건

### D1. K-Cosmetics 상세 deep link 데드링크
공통 드로어의 "전체 상세 페이지 →" 기본값이 `/operator/users/:id` 인데, K-Cos 는 이 경로를 legacy alias 로 두고 **id 를 버린 채 목록으로 redirect** 하고 있었다.
수정: 목록/admin 목록에 canonical `fullDetailHref` 지정 + alias(`users/:id`)에서도 동일 상세를 렌더(Neture 와 동일 패턴).
파일: `services/web-k-cosmetics/src/pages/operator/UsersPage.tsx`, `.../admin/KCosmeticsAdminMembersPage.tsx`, `services/web-k-cosmetics/src/App.tsx`.

### D2. 상세 화면 lifecycle 버튼 게이팅이 잘못된 축을 사용
공통 Core 상세가 `users.status`(플랫폼 축)로 정지/복구 버튼을 게이팅했다. 그래서 `users.status='suspended'` 이지만 해당 서비스 membership 은 `active` 인 계정에서 운영자가 **'정지'를 아예 누를 수 없었다**. backend write 는 membership 축만 바꾸므로 축 불일치다.
수정: `packages/ui/src/operator-user-detail/UserDetailPage.tsx` 에 `lifecycleStatus`(= `config.serviceKey` 의 membership status, 없으면 `user.status`) 도입 → 헤더 배지와 4개 액션 게이트에 적용. `serviceKey` 미설정(플랫폼 콘솔)은 기존 계약 유지. 기본정보의 "상태" row 는 플랫폼 축을 그대로 보여준다.

### D3. 목록 상태가 write 직후에도 '활성'
`MembershipConsoleController.getMembers` 가 `memberships[0]`(= 가장 최근 생성된 **아무 서비스** membership)로 표시 상태를 뽑았다. platform admin 은 배치 조회에서 5개 서비스 membership 을 모두 받으므로, `serviceKey=neture` 로 조회해도 타 서비스 `active` 가 뽑혀 방금 정지시킨 회원이 목록에서 계속 활성으로 보였다(read 축 ≠ write 축).
수정: 요청 scope 의 serviceKey 에 해당하는 membership 을 우선한다.

### D4. 상태 전이가 service-neutral 전역 역할을 생성하고, 그 역할을 회수할 수 없음
K-Cos E2E 의 복구 단계에서 발견. k-cosmetics membership 의 `role` 컬럼에는 prefix 없는 legacy 값 `'store_owner'` 가 남아 있는데, `resolveGrantedRole` 은 `seller` 계열만 정규화했다. 그래서 복구가 **전역 역할 `store_owner`**(prefix 없음)를 새로 부여했다 — 서비스 경계를 넘는 역할 생성이다(F9 RBAC SSOT 위반).
게다가 그 역할은 **운영자 콘솔·admin 콘솔 어느 쪽에서도 회수되지 않았다(403)**. `removeMemberRole` 이 prefix 없는 요청을 `cosmetics:store_owner` 로 해석한 뒤, `roleEntity.serviceKey`(`'cosmetics'`)를 `scope.serviceKeys`(`['k-cosmetics']`)와 비교했기 때문이다 — role prefix 와 canonical service_key 는 서로 다른 축이라 영원히 불일치한다.
이어서 KPA E2E 에서 같은 결함의 **일반형**을 확인했다 — Neture 재활성화가 전역 역할 `member` 를 새로 생성했다. `service_memberships.role` 이 prefix 없는 legacy 값인 서비스는 모두 같은 경로를 탄다(K-Cos = `store_owner`, 그 외 = `member`). 서비스 축이 없는 역할을 만드는 것 자체가 **serviceKey 경계 이탈**이므로 WO §4 범위 안에서 함께 고쳤다.

수정:
1. `MembershipApprovalService.resolveGrantedRole` (`b89115e0a` → `82e54ff21` 에서 일반화) — bare `'member'` / `'store_owner'` 를 `{rolePrefix}:{role}` 로 정규화한다. prefix 도출은 `@o4o/security-core` SSOT(`resolveRolePrefixFromCanonicalServiceKey`)만 사용하고, 대상은 5개 서비스 모두 prefixed 카탈로그 항목이 존재하는 값으로 한정했다. 반려·정지 경로가 같은 함수를 쓰므로 **부여/회수 대칭은 유지**된다. pharmacy-hub bare role 정규화 migration `20270317000000` 과 같은 원칙이다.
2. `MembershipConsoleController.removeMemberRole` (`b89115e0a`) — prefix 없는 요청이 prefixed 역할로 해석된 경우, 해석된 이름이 자기 role prefix 로 시작하면 prefixed 분기와 **동일** 판정을 적용. prefixed 분기와 같은 기준이므로 권한 확대가 아니다.

> 네 결함 모두 **DB schema / migration / SQL 직접 수정 없이** UI·API 계약 레벨에서 해결했다.

## 6. 검증

### 6-1. 정적 검증
| 항목 | 결과 |
|---|---|
| api-server typecheck | PASS (격리 worktree `/c/tmp/wo-idc` 기준 — main worktree 는 타 세션의 `@o4o/action-log-core` 삭제로 기존 실패) |
| `packages/ui` typecheck | PASS |
| 4서비스 + GlycoPharm typecheck | PASS (5/5) |
| web-k-cosmetics build 대상 typecheck 재확인 | PASS |
| membership/approval jest | D1~D3 시점 9 suites / 125 tests PASS · D4 시점 12 suites / 160 tests PASS |

> api-server 전체 jest 병렬 실행에서 3 suite / 14 test 가 실패로 보고됐으나, 3 suite 를 각각 단독 실행하면 8 / 17 / 65 tests 전부 PASS 다. 본 WO 변경과 무관한 **병렬 실행 타임아웃 flakiness** 로 판정한다.


### 6-2. 프로덕션 브라우저 write E2E

공통 흐름: `회원 목록 → 회원 상세 → deep link + 새로고침 → active→suspended → suspended→active → 역할 조회 → 부여 → 회수 → 원복`.
계정은 `docs/local/TEST-ACCOUNTS.local.md` 의 서비스 운영자 계정, 대상은 안전한 E2E fixture 만 사용했다.

#### PharmacyHub — PASS
fixture `E2E 약사회원` (pharmacy-hub membership 단독).

| 단계 | 결과 |
|---|---|
| 목록 → drawer → `/operator/members/:id` deep link → 새로고침 | PASS (404·white screen 0) |
| 정지 | membership `suspended` + `pharmacy-hub:member` 비활성. `users.status` 는 활성 유지 |
| 역할 부여 `pharmacy-hub:store_owner` | 활성 생성 |
| 역할 회수 | 비활성 전환 (soft revoke) |
| 복구 | membership `active` + `pharmacy-hub:member` 재활성. 회수된 `store_owner` 는 비활성 유지(정상) |
| `users.status` / 수정일 | 전 단계 불변 |

> 직전 WO 에서 미실행이었던 **role write E2E 를 이번에 수행**했다.

#### K-Cosmetics — PASS (D4 발견 포함)
fixture `VerifySmoke` (k-cosmetics membership 단독, `users.status` 는 사전부터 `suspended`).

| 단계 | 결과 |
|---|---|
| drawer deep link | canonical `/operator/members/:id` (D1 수정 반영) |
| legacy alias `/operator/users/:id` | 상세 렌더 + URL 유지 (redirect 소실 해소) |
| 상세 진입 | 기본정보 상태 `정지`(플랫폼 축) + 헤더 `활성`(서비스 축) + '정지' 버튼 활성 (D2 수정 반영) |
| 정지 | membership `suspended`. `users.status` 수정일 불변 |
| 역할 부여 `cosmetics:partner` → 회수 | 활성 → 비활성 PASS |
| 복구 | membership `active` + `cosmetics:store_owner` 재활성 |
| 이상 | 복구가 전역 역할 `store_owner` 를 함께 생성 → **D4** |

#### Neture — PASS
5개 서비스 membership 을 모두 가진 fixture 로 fan-out 경계를 실측했다(§4). 정지·복구 모두 neture membership 에만 적용되고 타 서비스는 `active` 유지. 드로어 `비활성화` 가 `reject` 를 호출하는 경로 없음.

#### KPA-Society — PASS
fixture `E2E AuthMain` (`44fa7733-…`, 5개 서비스 membership 보유 · `users.status` 는 사전부터 `suspended`).

| 단계 | 결과 |
|---|---|
| `/operator/users/:id` deep link + 새로고침 | PASS (404·white screen 0) |
| 상세 진입 | 헤더 `활성`(kpa membership) + 기본정보 `정지`(`users.status`) 병기 — D2 수정 반영 |
| 역할 회수 (전역 `member`) | 200 · 비활성 전환 — 수정 전에는 403 이던 경로 (D4 part 2) |
| 정지 | 목록 상태 `정지` + 역할 컬럼 `—`. `users.status` 수정일 불변 |
| 복구 | membership `active` + **`kpa:member` 재활성**. 전역 bare `member` 신규 생성 **0** (D4 part 1) |
| 타 서비스 membership | 4건 모두 `active` 유지 (fan-out 0) |
| console error | 0 |

#### D4 배포 후 재검증 (커밋 `82e54ff21` 반영 빌드) — PASS

| 서비스 | 재검증 내용 | 결과 |
|---|---|---|
| KPA-Society | 잔여 전역 `member` 회수 → 정지 → 복구 | 403 → 200 · 복구 시 `kpa:member` 만 재활성 |
| K-Cosmetics | 잔여 전역 `store_owner` 회수 → 정지 → 복구 | 403 → 200 · 복구 시 `cosmetics:store_owner` 만 재활성, bare role 신규 생성 0 |

두 서비스 모두 `PATCH .../status` 200, 예상치 못한 4xx·5xx 0.

## 7. 완료 기준 대조 (WO)

| 기준 | 결과 |
|---|---|
| KPA 상태 변경 404 | 0 |
| KPA 상세 deep link 404 | 0 |
| Neture 비활성화 → `rejected` | 0 |
| Neture suspend·reactivate UI | PASS |
| PharmacyHub `members/:id` | PASS |
| PharmacyHub role 조회·부여·회수 | PASS |
| 서비스 간 membership 침범 | 0 |
| `users.status` 불필요 변경 | 0 |
| dead link / white screen / JS exception | 0 |
| 예상치 못한 4xx·5xx | D4 로 확정된 403 외 0 (D4 는 수정 완료) |

## 8. 남은 문제 · 후속

1. **역할 회수는 soft revoke** — UI 회수는 `role_assignments.is_active=false` 로 내리고 row 를 남긴다(이력 보존 계약). E2E fixture 에 비활성 `pharmacy-hub:store_owner` / `cosmetics:partner` row 가 남지만 권한 효과는 없다. hard delete 는 직접 SQL 이 필요해 수행하지 않았다(WO 금지 절). E2E 로 생성한 전역 bare role(`member` · `store_owner`)은 UI 회수로 **전부 비활성 원복**했다.
2. **정지 시 역할 비활성화 범위가 서비스별로 다르다** — PharmacyHub 정지는 membership role 을 함께 비활성화했고, K-Cosmetics 정지는 `cosmetics:store_owner` 를 활성 유지했다. `resolveGrantedRole` 정규화(D4) 이후 재발 여부를 별도로 확인할 필요가 있다. 계약 통일은 본 WO 범위 밖 → 별도 WO 제안.
3. **legacy bare role row** — D4 수정은 **앞으로 부여되는** 역할만 정규화한다. 과거에 생성된 전역 bare role row(`member`, `store_owner`) 정리는 migration 이 필요하므로 수행하지 않았다(중지 조건). 별도 WO 제안.
4. **KPA `kpa_members` skeleton row** — `kpa_members` row 가 없던 fixture 의 상태 변경 시 ensure 경로가 skeleton row 를 생성한다(설계된 동작). E2E 이후에도 row 는 남는다.

## 9. Git · 배포

| 항목 | 값 |
|---|---|
| 커밋 | `7387109bf` (D1~D3) · `b89115e0a` (D4 part 1·2) · `82e54ff21` (D4 일반화) · 본 CHECK |
| 브랜치 | `main` (직접 작업) |
| 배포 | Deploy API Server (Cloud Run) · Deploy Web Services (Cloud Run) 모두 success |
| API·DB·schema 변경 | **없음** — migration 0 · 테이블/컬럼 변경 0 · API 계약 변경 0 |
| GlycoPharm 공유모듈 회귀 | typecheck·build PASS (코드 변경 없음) |

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (legacy bare role row 정리 · 정지 시 역할 비활성화 범위 통일)
