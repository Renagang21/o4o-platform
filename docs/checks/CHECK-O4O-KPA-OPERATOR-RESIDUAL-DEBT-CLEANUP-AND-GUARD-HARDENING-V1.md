# CHECK — WO-O4O-KPA-OPERATOR-RESIDUAL-DEBT-CLEANUP-AND-GUARD-HARDENING-V1

KPA 운영자 콘솔 종료 감사([IR-O4O-KPA-OPERATOR-TRACK-FINAL-CLOSEOUT-AND-RESIDUAL-DEBT-AUDIT-V1](../ir/IR-O4O-KPA-OPERATOR-TRACK-FINAL-CLOSEOUT-AND-RESIDUAL-DEBT-AUDIT-V1.md), 판정 PASS_WITH_DEBT)에서 확인된 잔여 기술부채 마감.

- **작업 WO**: WO-O4O-KPA-OPERATOR-RESIDUAL-DEBT-CLEANUP-AND-GUARD-HARDENING-V1
- **일자**: 2026-07-29
- **판정**: PASS (organization join 범위만 HOLD)
- **기능 트랙 종료 판정**: 유지 (권한을 넓히지 않고 가드만 명시화, 빈 레거시 테이블만 forward-only 은퇴)

---

## 1. 선행 census · dependency (read-only, cloud-sql-proxy 15433)

배포 직전 재확인 포함, 두 시점 모두 동일:

| 대상 | row count | inbound FK | trigger | view |
|---|---:|---:|---:|---:|
| `kpa_applications` | **0** | 0 | 0 | 0 |
| `kpa_working_contents` | **0** | 0 | 0 | 0 |
| `kpa_organization_join_requests` | **0** | — | — | — |

- `kpa_applications` 자체 제약 = `PK_kpa_applications` 만.
- `kpa_working_contents` 자체 = `PK_kpa_working_contents` + `IDX_kpa_working_contents_owner` + `IDX_kpa_working_contents_source`.
- 두 테이블 모두 **0행 · inbound FK 0 · trigger 0 · view 0** → forward-only DROP 안전(진행 조건 충족).

## 2. 범위 A — action-queue 가드 명시화

`action-queue.controller` 는 **KPA/GlycoPharm/Cosmetics 3서비스 공유 컨트롤러**(`common/action-queue/`)이며, 각 서비스가 자신의 `*:admin` executeGuard 를 주입한다. 따라서 KPA scope 하드닝은 **공유 컨트롤러 내부가 아니라 KPA 마운트 지점**에서 수행해야 한다(공유 컨트롤러 수정 시 glycopharm/cosmetics 빌드·계약 파손).

- **변경 전** [kpa.routes.ts:258](../../apps/api-server/src/routes/kpa/kpa.routes.ts): `router.use('/operator', coreRequireAuth as any, createActionQueueRouter(dataSource, kpaActionConfig, requireKpaScope('kpa:admin')))`
  - `GET /operator/actions`·`POST /operator/actions/dismiss/:id` 는 `coreRequireAuth`(인증) 만 + 같은 `/operator` prefix 에 **먼저** 마운트된 operator-summary 라우터([:251](../../apps/api-server/src/routes/kpa/kpa.routes.ts))의 `router.use(requireKpaScope('kpa:operator'))` 에 **간접 의존**하여 보호. 마운트 순서 취약(P2).
- **변경 후**: `router.use('/operator', coreRequireAuth as any, requireKpaScope('kpa:operator'), createActionQueueRouter(...))`
  - action-queue 전체가 마운트 순서와 무관하게 `kpa:operator` scope 로 명시 보호. `execute` 는 그대로 `kpa:admin` executeGuard(더 엄격) 유지.
- **허용 역할 불변**: 기존 유효 접근 정책(operator-summary 가 이미 모든 `/operator/*` 에 `kpa:operator` 강제)을 명시화만 함. 넓히거나 좁히지 않음.
- 전역 middleware·공유 컨트롤러 미변경.

## 3. 범위 A — inline membership census

KPA 운영자 endpoint 의 inline role/membership 검사 전수 census:

| helper / route | 위치 | 성격 | 판정 |
|---|---|---|---|
| `isKpaOperatorOrAdmin` | [kpa.routes.ts:1510](../../apps/api-server/src/routes/kpa/kpa.routes.ts) | in-memory `user.roles` 역할검사(SQL 없음), super_admin 허용 | — |
| `GET /contents`·`GET /contents/:id` | :1535·:1731 | 읽기 가시성 확대(operator 에게 draft/전상태 노출) | (a) scope 등가·비인가게이트 아님 → 유지 |
| `PATCH /contents/:id`·`DELETE /contents/:id` | :1780·:1879 | `isOwner \|\| isOperator` | (b) owner-OR-operator 의도 → 유지 |
| `isSignageOperatorOrAdmin` | :2240 | 동일 in-memory 역할검사 | — |
| `PATCH /signage/media/:id`·`/signage/playlists/:id` | :2289·:2453 | `createdByUserId` DB 소유권 비교 + operator | (b) owner-OR-operator → 유지 |

- **위험한 auth-only(c) operator write = 없음** — 위 write 는 전부 소유권 또는 scope 결합.
- 유일한 `/operator` prefix 하의 auth-only write 였던 action-queue `dismiss`/`GET` 은 §2 에서 명시 가드로 해소.
- inline helper 는 canonical `requireKpaScope('kpa:operator')` 와 **역할 판정은 등가**이나 `platform:super_admin` 을 role 문자열로 허용(scope guard 는 `platformBypass:false`). WO 원칙 "super_admin 기존 동작 보존" + "inline 제거로 권한 넓히지 않음" + owner-OR-operator 의미 손실 방지 → **하드닝 대상 아님(유지)**. 억지 role 배열 신설·refactor 없음.

## 4. 범위 B — `kpa_applications` entity·table 은퇴

dead flow(0행·live route/controller/frontend/repository 소비처 0, canonical 온보딩 = `PATCH /kpa/members/:id/status` 별도 존재). 라이브 코드 참조는 이미 제거된 상태였고 남은 것은 entity 정의 + 등록뿐.

- entity 파일 삭제: `apps/api-server/src/routes/kpa/entities/kpa-application.entity.ts`
- barrel 제거: [entities/index.ts](../../apps/api-server/src/routes/kpa/entities/index.ts) (`export * from './kpa-application.entity.js'`)
- registry 제거: [database/entities.ts](../../apps/api-server/src/database/entities.ts) import + entities 배열 2곳
- table DROP: 신규 forward-only migration `20270212000000-DropKpaApplicationsDeadTable`
- `kpa_product_applications` / `/operator/product-applications`(별개 live 기능) 미변경.

## 5. 범위 B — `kpa_working_contents` entity·table 은퇴

dead entity(0행·live route/controller/frontend/repository 소비처 0). `o4o_asset_snapshots` / canonical `/assets/copy` 와 **무관**(FK·import·query 0, standalone). 원본-복사본 publish flow 는 이미 제거됨.

- entity 파일 삭제: `apps/api-server/src/routes/kpa/entities/kpa-working-content.entity.ts`
- barrel 제거: [entities/index.ts](../../apps/api-server/src/routes/kpa/entities/index.ts)
- registry 제거: [database/entities.ts](../../apps/api-server/src/database/entities.ts) import + 배열 2곳
- table DROP(전용 index 2 포함): 신규 forward-only migration `20270213000000-DropKpaWorkingContentsDeadTable`
- `o4o_asset_snapshots`·`/assets/copy`·기존 snapshot 미변경.

## 6. Migration 내용 · 실행

두 개의 forward-only migration(과거 migration 미수정, `CASCADE` 미사용):

- [20270212000000-DropKpaApplicationsDeadTable.ts](../../apps/api-server/src/database/migrations/20270212000000-DropKpaApplicationsDeadTable.ts)
- [20270213000000-DropKpaWorkingContentsDeadTable.ts](../../apps/api-server/src/database/migrations/20270213000000-DropKpaWorkingContentsDeadTable.ts)

각 migration `up()` 안전 가드:
1. `hasTable` 존재 확인(부재 시 멱등 no-op)
2. 실행 직전 `count(*) = 0` 재확인 — 1행 이상이면 `throw` → 트랜잭션 rollback(테이블 보존)
3. inbound FK(`confrelid = 대상::regclass`) `= 0` 재확인 — 있으면 `throw`
4. 통과 시 `DROP TABLE IF EXISTS`(PK·전용 index 동반 제거)

`down()` = 원 CREATE(20260206190000 / 20260410400000 + 20261124000000) 기준 **빈 구조 복원**(row 0, dead flow 이므로 데이터 복원 무의미 — 구조만).

- **실행 경로**: main push → CI/CD 자동 migration(프로덕션 표준). 적용 결과·census 는 §13.

## 7. 범위 C — organization join 판정: **HOLD (정책 질문)**

`kpa_organization_join_requests` 물리 테이블은 **완전 orphan**(entity·registry·컨트롤러 모두 미참조 — 컨트롤러는 `kpa_approval_requests` 사용). 생성 UI 0·검토 UI 0·0행·[controller.ts:263](../../apps/api-server/src/routes/kpa/controllers/organization-join-request.controller.ts) `reviewUrl` = 미등록 `/operator/kpa/organization-join-requests`(데드링크).

**그러나** approve 핸들러 `applyApproval()`([controller.ts:49-102](../../apps/api-server/src/routes/kpa/controllers/organization-join-request.controller.ts))가 **실제 canonical membership provisioning**(`OrganizationMemberService.addMember`/`updateMemberRole` + `users.status='active'` + 승인 이메일)을 수행한다 → WO 범위 C2 트리거("승인 시 canonical membership 변경"). 도달 불가지만 코드상 no-op 아님. `operator-dashboard.service.ts:186` membershipPending KPI 의 유일 feeder(실질 항상 0).

**판정 근거**: 코드상 실 provisioning 존재(C2) + 의도-live vs 방치 여부·리뷰 surface 대상 불확정(C3) → WO 원칙 "organization join 의미를 추정하지 않음" + 중지조건 "live 정책 기능 확인 시 해당 항목만 HOLD" 적용. **컨트롤러·orphan 테이블·orphan 타입(`joinRequest.ts`)·reviewUrl 전부 미변경**, 나머지 A/B/D 는 계속 진행.

**정책 질문(사용자 결정 필요)**: KPA 는 조직 가입/역할 승격 승인 채널을 (a) 유지하려는가 → create+review UI 신설 필요 / (b) `kpa_applications` 처럼 은퇴하려는가? 결정 시 lockstep 대상 = `operator-dashboard.service.ts:186` membershipPending KPI.

## 8. 범위 D — 문서·주석·dead code

- 라이브 주석 정리: [kpa-block-adapter.ts:14](../../services/web-kpa-society/src/utils/kpa-block-adapter.ts) 주석에서 은퇴된 `kpa_working_contents.edited_blocks` 참조 제거(라이브 `kpa_contents.blocks` 보존).
- entity registry/barrel 에 은퇴 사유 주석 명시(§4·§5).
- **보존**: 과거 IR·CHECK·investigation·archive·아키텍처 분석 문서(`CONTENT-META-PRODUCTION-READY-V1.md` 등)는 기록으로 보존(운영 가이드·API 문서 아님). WO 원칙 준수.
- org-join 관련 문서·타입·reviewUrl 은 §7 HOLD 로 미변경.

## 9. 권한 6계층 검증

(§13 실브라우저 smoke 에서 확정)

1. action-queue `kpa:admin` 접근 — 
2. `kpa:operator` 접근 — 
3. `platform:super_admin` 기존 접근 — 
4. store owner 차단 — 
5. 일반 회원 차단 — 
6. 비로그인 401 — 

## 10. canonical 회원·자료함 회귀

(§13) 회원 관리·대시보드·AuditLog·자료함 회귀 smoke.

## 11. HOLD 항목

- **organization join 전체 범위**(§7) — 정책 질문. 컨트롤러·orphan 테이블(`kpa_organization_join_requests`)·orphan 타입·reviewUrl 미변경.

## 12. 빌드

- api-server `tsc -p tsconfig.build.json --noEmit` **EXIT=0**; `npm run build` **EXIT=0** — migration JS 2개 `dist/database/migrations/` 산출 확인, 삭제 entity JS 제거 확인.
- web-kpa-society `tsc --noEmit` **EXIT=0**; `vite build` ✓ **EXIT=0**.

## 13. 배포 · 프로덕션 schema census · 실브라우저 smoke

(배포 후 갱신)

- 배포 리비전: (pending)
- migration 적용 결과: (pending)
- schema census(테이블 부재·index 부재): (pending)
- action-queue 실브라우저 smoke: (pending)
- 회원·대시보드·AuditLog 회귀: (pending)
- removed API 404: (pending)

## 14. 커밋

- 코드(guard·entity·registry·migration·block-adapter) + CHECK 초안: (commit 1)
- 배포·smoke 결과 갱신: (commit 2)
