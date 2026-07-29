# IR-O4O-KPA-OPERATOR-TRACK-FINAL-CLOSEOUT-AND-RESIDUAL-DEBT-AUDIT-V1

KPA 운영자 콘솔 정비 트랙의 최종 종료 가능 여부 판정. **종료 감사 전용 — 코드 변경·DB write·migration·배포 없음.**

- **일자**: 2026-07-29
- **성격**: read-only 최종 종료 감사 (IR)
- **판정**: **PASS_WITH_DEBT** — 기능 종료 가능, 잔여는 기술부채(S1 schema + deprecated 정리 + 문서) 및 fail-safe/dormant P2 하드닝뿐
- **DB / 코드 변경**: 없음

---

## 1. 최종 판정

**PASS_WITH_DEBT — KPA 운영자 트랙 기능 종료 가능.**

- **P0 = 0**, **확정 P1 = 0** (P1 후보 3건은 실측 검증 결과 전부 하향).
- 남은 항목: fail-safe/dormant P2(하드닝·정책결정) + P3(문서·affordance·deprecated) + S1 schema debt(빈 레거시 테이블 2종). 전부 단일 cleanup+하드닝 WO로 묶을 수 있고 운영에 즉각 영향 없음.
- 운영 기능 회귀 없음. 선행 완료 작업(오류 계약·승인 경로·dead flow 제거·AuditLog 정합·confirm 표준화)은 현재 `main`·프로덕션에 그대로 반영됨.

> HOLD/FAIL 아님 근거: 데이터 손상·보안 우회·승인 우회·사용자 노출 오류 계약·운영 업무 불가 사례가 실측으로 확인되지 않음. P1 후보였던 항목들은 (a) 의도적 메뉴 제거, (b) 인접 라우터 미들웨어로 현재 유효 보호, (c) 0-row dormant 로 각각 검증됨.

---

## 2. 현재 반영된 완료 항목 (source of truth = 현재 `main` + 프로덕션)

`main ≡ origin/main` = `a4d3ec978`. 미커밋 파일 0. 선행 커밋 전부 HEAD 조상 확인:
`703b68f2e`(WorkingContent 제거)·`2456f85ee`(CHECK)·`c3e91c7e2`(AuditLog 정합)·`9e9bdd142`(AuditLog CHECK).

| 영역 | 확인 결과 |
|---|---|
| **승인·회원** | `KpaApplication` live route 0(마운트 `kpa.routes.ts:219` 제거)·entity registry-only. canonical 회원 승인 = `PATCH /kpa/members/:id/status` 유지. `kpa_members` pending 0·provisioning gap 0. |
| **WorkingContent** | `/operator/working-content` route 0·페이지 0(glob)·backend controller/mount 0·`copy-to-store` operator flow 0. canonical `/assets/copy` 유지. `NO_STORE` throw 경로 0. |
| **오류·확인 흐름** | operator scope 실 `alert`/`confirm` 호출 0(전부 `ConfirmActionDialog` 이관 주석). `runBulk` 내부 confirm 0. 취소 시 mutation 미실행·실패후 성공 toast 오표시 0. |
| **AuditLog** | 컬럼 open string + known union(action 16/target 4) 정합, 좁은 union·unsafe cast 회귀 0. `ACTION_LABELS` 16키가 live 14종 전량 커버, `TARGET_LABELS` 4키=live 4종 1:1, raw fallback 유지. endpoint `kpa:admin` 게이트(FE `OperatorRoutes.tsx:133` + BE `kpa.routes.ts:1469`) 일치. |
| **Signage** | media usage guard 유지(`computeUsage` FK+snapshot). `store_playlist_items` 0행 → dangling snapshot 0. |

---

## 3. Route · Menu · Endpoint 잔여

### 3.1 Route/Menu/CTA (frontend)
- `OperatorRoutes.tsx` 전 route가 `UNIFIED_MENU`(`operatorMenuGroups.ts`) 또는 상세/redirect로 해석됨. **메뉴-없는-route 0, route-없는-메뉴 0, 잘못된 CTA 0.**
- redirect-compat 7(forum-management/community-management/news/lms-courses/users/operators + `*`→`/operator`).
- **제거된 flow 잔존 live 링크 0**: `working-content`/`WorkingContent` 매치 0, `KpaApplication`/`ApplicationsTab`는 `MemberManagementPage.tsx:9,178,299` 제거-문서화 주석뿐, `copy-to-store` 매치는 커뮤니티 import 액션(operator 무관).
- **의도적 orphan 2** (결함 아님): `/operator/collaboration-requests`(`OperatorRoutes.tsx:229`) — '협업 문의' 메뉴는 `operatorMenuGroups.ts:179` 에서 `WO-...-MENU-REMODEL-V1` 로 **의도적 제거**, route만 보존. `/operator/legal`(adminOnly) — 문서화된 레거시 보존.

### 3.2 Backend endpoint 소비처
- 운영자/admin 마운트 19개·distinct endpoint ~45개 조사. **frontend 소비 16 그룹**, 외부 소비 근거 1(`/admin/force-assets` → `apps/admin-dashboard`, dead 아님), **unmounted controller factory 0**.
- deprecated/zero-consumer 3: `/operator/actions`+`dismiss`(P2, §5)·`/kpa/forum-requests/*`(@deprecated, canonical `/api/v1/forum/operator/*` 로 대체·0 caller)·`/me/membership`(@deprecated, 외부 호환 유지).
- **제거된 flow live route 0** — 잔여는 entity/table registration only.

---

## 4. 오류 계약 · UI 표준 잔여

- **오류 계약**: operator ~65 페이지 전수. 빈 catch 0·`catch{return []}` 0·실패→빈목록 위장 0·`console.error`-only 0·실패후 성공 toast 0·mutation 후 refetch 누락 0·무한 로딩 0·in-flight 중복 mutation 가드 있음·page error 재시도 버튼 있음. (date/number formatter의 `catch{return '-'}` 는 무해.)
- **UI 표준**: list 화면 raw `<table>` 0(전부 shared DataTable/console 이관 주석)·operator scope raw dialog 실호출 0·파괴적 액션 confirm 누락 0·bulk=ActionBar+RowActionMenu+BulkResultModal·inline style 는 공유 design-token 객체(결함 아님).
- **P3 1건**: `KpaOperatorDashboard.tsx:87` — `data==null` 시 권한(401/403)과 일반 로드 실패를 한 문구로 통합(재시도 버튼 존재, 정직한 통합 문구). 상태 구분 nicety.

---

## 5. 권한 경계 결과 (6계층 정적 추적)

가드 모델: `createMembershipScopeGuard(KPA_SCOPE_CONFIG)` — `platformBypass:false`, `allowedRoles=[kpa:admin, kpa:operator]`, operator scope는 admin 포함. **super_admin은 KPA 멤버십 없으면 모든 scope-guarded 라우트 403**(문서화된 org-isolation). `store_owner`는 default-deny 로 operator API 차단.

**24개 capability 매핑 결과 P0 = 0.** audit-logs `kpa:admin` FE+BE 일치 확정.

| # | 항목 | 심각도 | 실측 판정 |
|---|---|---|---|
| F1 | action-queue `GET /actions`·`POST /actions/dismiss`(`kpa.routes.ts:258`)가 자체 scope 가드 없음 | **P2** | 같은 `/operator` prefix 에 **먼저** 마운트된 operator-summary 라우터(`:251`)의 최상단 `router.use(requireKpaScope('kpa:operator'))`(`operator-summary.controller.ts:47`)가 모든 `/operator/*` 요청에 실행 → 비운영자는 도달 전 403. **현재 유효 보호**. 단 마운트 순서 의존=취약. KPA 프론트 소비처 0. |
| F2 | 커뮤니티 signage `POST /signage/media`·`/playlists`(`kpa.routes.ts:2248,2345`) `authenticate`만 | **P2 (트랙 밖)** | 소비처가 `/signage/*` 커뮤니티 페이지(`PlaylistEditorPage.tsx:125` 등)·SQL `source='community'` → **의도적 커뮤니티 기여 경로**(operator 콘솔 아님). 형제 PATCH/DELETE는 owner-or-operator. 커뮤니티 게시 authorization 정책 결정은 operator 트랙 밖. |
| F4 | inline `isKpaOperatorOrAdmin`/`isSignageOperatorOrAdmin`(`kpa.routes.ts:1510,2240`)가 멤버십 미확인·super_admin 허용 | **P2** | content-hub/signage PATCH/DELETE 를 role만으로 인가(멤버십 가드 우회, super_admin 허용). 실무 영향 낮음(role은 통상 멤버십 동반). 정책 발산 → `requireKpaScope` 경유 권장. |
| F3 | `/members` manifest(`kpa.routes.ts:12-19`)는 admin 표기, 구현은 operator | **P3 (doc)** | 회원 승인=operator 는 "운영"으로 방어 가능·프론트와 일치. manifest 주석만 stale. 보안 갭 없음. |
| F5/F6 | operator UI 가 admin-only affordance(action-queue execute·AI summarize·회원 role 변경) 노출 | **P3** | 백엔드가 더 강한 게이트(kpa:admin)로 fail-safe. affordance 만 노출 → `ROLES.KPA_ADMIN` 뒤로 숨김 권장. |
| F7 | supplier submission endpoint role-open + ownership-scoped | **P3** | operator 권한 상승 없음. 트랙 경계. |

---

## 6. 프로덕션 census (read-only, cloud-sql-proxy, PII 없음)

| 항목 | 결과 |
|---|---|
| `kpa_applications` | 테이블 존재, **0행** |
| `kpa_working_contents` | 테이블 존재, **0행** |
| AuditLog | 261행 · action distinct 14 / target distinct 4 · null·empty 0 · casing 정상 · 미매핑 live 값 0 |
| Signage | `store_playlist_items` 0행 → dangling snapshot 0 (playlists 10 / media 7) |
| 회원·승인 | `kpa_members` 6(active 5/withdrawn 1) · pending 0 · active-without-role_assignment 0 |
| 조직 가입 요청 | `kpa_organization_join_requests` **0행** · `kpa_join_inquiries` **0행** (아래 §11 dormant gap) |

AuditLog 최근 emitter(2026-07-27 `CONTENT_UPDATED`)와 DB 값 불일치 없음.

---

## 7. Schema / Entity residual debt

| 대상 | row | live route | read/write 소비처 | registry | FK/index | DROP 난이도 | 분류 |
|---|---:|---|---|---|---|---|---|
| `kpa_applications` / `KpaApplication` | 0 | 0 | 0 / 0 | `database/entities.ts:309,786` | FK 없음·index 없음 | LOW(standalone) | **S1** |
| `kpa_working_contents` / `KpaWorkingContent` | 0 | 0 | 0 / 0 | `database/entities.ts:325,816` | index 2·FK 없음 | LOW–MODERATE(공유 types 문서 결합) | **S1** (경미 S2) |

- 둘 다 **S3 아님** — 컨트롤러·페이지 이미 삭제, write path 0, 재활성화 UI/API 0.
- 두 entity 파일에 `@deprecated` 마커 누락(경미 코드 잔여). 본 IR 에서 DROP migration 만들지 않음.

---

## 8. 문서 · 주석 · 테스트 잔여

- **historical (잔존 허용)**: `docs/checks/CHECK-...RETIREMENT-V1.md`·`docs/ir|investigations/IR-...AUDIT-V1.md`·in-code 제거 주석(`kpa.routes.ts:57-58` 등, canonical redirect 문서화) — 기록.
- **현재 운영 문서 정리 후보 (P3)**: ① `docs/architecture/O4O-KPA-OPERATOR-CANONICAL-STATE-V1.md:317,482`(삭제된 `WorkingContentListPage` 를 현존 페이지로 표기) ② `docs/architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md:276`(`WorkingContentEditPage` 를 live 예시로 사용) ③ `packages/types/src/content-meta.ts:11-14,54,84,105-107`(`kpa_working_contents` 를 현행 "Layer 2 — Working" 로 명시) ④ `docs/platform/content/CONTENT-META-PRODUCTION-READY-V1.md:25,107,151`(현행 레이어로 제시).
- dead test fixture·삭제 UI screenshot·stale API 문서 없음.

---

## 9. P0/P1/P2/P3 분류

- **P0 (데이터 손상·보안·승인 우회)**: 0
- **P1 (운영 업무 불가·잘못된 성공 표시)**: 0 (후보 3건 전부 하향 — 의도적 메뉴 제거 / 마운트순서 유효보호 / 0-row dormant)
- **P2 (하드닝·정책결정, 현재 fail-safe/dormant)**:
  - action-queue GET/dismiss 명시적 scope 가드 부재(F1, 현재 인접 라우터로 보호·취약)
  - inline role 체크 멤버십 우회·super_admin 허용(F4)
  - 조직가입 요청: 이메일 `reviewUrl` 이 존재하지 않는 `/operator/kpa/organization-join-requests` 지시 + 전용 리뷰 UI 부재(현재 0-row dormant) — `organization-join-request.controller.ts:263`
  - [트랙 밖] 커뮤니티 signage CREATE scope 부재(F2)
- **P3 (UX·문서·타입·dead code)**: 대시보드 권한/로드 문구 통합(`KpaOperatorDashboard.tsx:87`)·admin-only affordance 노출(F5/F6)·`/members` manifest drift(F3)·deprecated 정리(forum-requests routes·`/me/membership`·entity `@deprecated` 마커)·문서 4곳(§8)·의도적 orphan 문서 정합(collaboration-requests 주석 vs 메뉴)
- **Schema debt**: `kpa_applications`·`kpa_working_contents` = S1

---

## 10. KPA 운영자 트랙 종료 가능 여부

**종료 가능 (PASS_WITH_DEBT).** 운영자가 정상 업무(회원 승인·콘텐츠 검수/승인·상품 신청 처리·이벤트오퍼·포럼/LMS 관리·감사 로그 조회)를 수행하는 데 지장을 주는 live 결함(P0/P1)은 실측으로 0. 잔여는 (a) fail-safe/dormant P2 하드닝, (b) P3 UX/문서, (c) S1 빈 레거시 테이블 — 모두 즉각 운영 영향 없음.

**KPA 운영자 콘솔 정비 트랙 종료를 선언한다.**

---

## 11. 다음 작업 제안 (0 또는 1개)

**단일 cleanup+하드닝 WO 1개** 제안 (기능 WO 억지 생성 안 함, 조사 WO 반복 안 함):

> **WO-O4O-KPA-OPERATOR-RESIDUAL-DEBT-CLEANUP-AND-GUARD-HARDENING-V1** (제안, 미승인)
> 1. **가드 하드닝**: action-queue `GET /actions`·`/actions/dismiss` 에 명시적 `requireKpaScope('kpa:operator')` 부착(마운트순서 의존 제거). inline `isKpaOperatorOrAdmin`/`isSignageOperatorOrAdmin` 를 `requireKpaScope` 경유로 정합(멤버십 확인·super_admin 정책 통일). — 현재 fail-safe 이므로 회귀 위험 낮음.
> 2. **schema 은퇴**: `kpa_applications`·`kpa_working_contents`(둘 다 S1·0행) + 다른 빈 레거시 테이블과 묶어 단일 DROP migration + entity/registry 제거. 두 entity `@deprecated` 마커.
> 3. **문서 정리**: §8 현행 문서 4곳을 retirement 반영.
> 4. **조직가입 요청 정책 결정**: 리뷰 UI 신설 vs 알림/이메일 `reviewUrl` 은퇴 — 0-row dormant 이므로 결정만 요함.
> 5. (선택) F5/F6 admin-only affordance 를 `ROLES.KPA_ADMIN` 뒤로 숨김.

> **트랙 밖 별도 처리**: 커뮤니티 signage CREATE authorization(F2)은 operator 트랙이 아니라 커뮤니티 signage 기능의 정책 사안 — 별도 판단 대상으로 분리.

---

## 12. IR commit SHA

- IR 문서: 본 커밋 (path-specific, `docs/ir/IR-O4O-KPA-OPERATOR-TRACK-FINAL-CLOSEOUT-AND-RESIDUAL-DEBT-AUDIT-V1.md`)

---

## 중지 조건 점검

프로덕션 read-only 연결 정상(261행)·현재 배포 SHA 확인 가능·타 세션 대규모 변경 없음(미커밋 0)·판정에 mutation/PII 불필요 → 중지 조건 해당 없음. 미확인 항목 없음.
