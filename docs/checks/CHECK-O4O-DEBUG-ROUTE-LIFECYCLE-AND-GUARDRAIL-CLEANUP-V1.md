# CHECK-O4O-DEBUG-ROUTE-LIFECYCLE-AND-GUARDRAIL-CLEANUP-V1

> WO-O4O-DEBUG-ROUTE-LIFECYCLE-AND-GUARDRAIL-CLEANUP-V1 · 2026-08-08
> 선행: `9bf1ed23f` (긴급 차단 A안 — `/__debug__/**` 프로덕션 미등록)

---

## 1. 8개 route 최종 판정

| # | route | 판정 | 근거 |
|:-:|---|:---:|---|
| 1 | `approval-test` | **DELETE** | 테스트 성격인데 운영 승인·RBAC 부여를 수행. 공식 대체 존재 — `MembershipConsoleController.approveMembership` (operator 콘솔) · `PharmacyHubMembershipConsoleController` |
| 2 | `forum-post-cleanup` | **DELETE** | `WO-KPA-FORUM-LEGACY-TEST-POST-HARD-DELETE-V1` 일회성 레거시 정리. 목적 달성, 2026-04-24 이후 변경 없음 |
| 3 | `order-canonical-table` | **DELETE** | 헤더에 "임시 진단 엔드포인트" 명시. `IR-O4O-ORDER-CANONICAL-TABLE-CONFIRM-V1` 판단 종료용 |
| 4 | `rbac-db-audit` | **DELETE** | "Phase 5B Step 1 전용 진단". RBAC Freeze F9(2026-02-27)로 해당 단계 종료 |
| 5 | `rbac-backfill-user-role` | **DELETE** | `WO-RBAC-DATA-NORMALIZATION-EXECUTION-V1` 일회성 backfill, 실행 완료 |
| 6 | `service-users-audit` | **DELETE** | SELECT 전용 감사. Cloud SQL Auth Proxy + psql 로 대체 가능 (`SETUP.md` §4) |
| 7 | `user-debug` | **DEV_ONLY** | 사용자 진단 가치 유지. **단 상태 변경 핸들러 2개 제거** (아래 §3) |
| 8 | `pharmacy-debug` | **REVIEW** | 조직 비활성화의 공식 admin API 를 찾지 못함. "임시 운영 도구" 주석 → 실사용 가능성. 현행 DEV_ONLY 유지 |

**DELETE 6 · DEV_ONLY 1 · REVIEW 1 · ADMIN_API 신규 전환 0 · CLI 신규 작성 0**

> `ADMIN_API` 로 승격한 항목이 없는 이유: 승격이 필요했을 기능(승인·사용자 상태)은
> **이미 공식 admin/operator API 가 존재**했고, debug route 는 그 중복 구현이었다.
> `CLI` 신규 작성이 없는 이유: 삭제 대상 중 반복 필요 기능이 없었고(전부 일회성·목적 달성),
> 읽기 진단은 기존 proxy + psql 채널로 충분하다.

---

## 2. 긴급 차단 보고의 정정 1건

차단 시 보고에서 `GET /__debug__/pharmacy/deactivate` 를 "GET 상태 변경" 으로 기재했으나,
**실제로는 확인 페이지(읽기 전용)이고 변경은 `POST /deactivate`** 였다. 정정한다.

반대로 `approval-test` 는 보고보다 넓었다 — `/approve` 외에
**`GET /repair/:userId` · `GET /repair-all` 도 `UPDATE users` + `INSERT INTO role_assignments`** 를 수행했다(RBAC 부여).

실제 GET 상태 변경 경로 (차단 전, 모두 인증 없음):

```text
GET /__debug__/approval-test/approve/:membershipId   승인 (isPlatformAdmin: true 하드코딩)
GET /__debug__/approval-test/repair/:userId          UPDATE users + INSERT role_assignments
GET /__debug__/approval-test/repair-all              위 작업 일괄
GET /__debug__/user/activate                         UPDATE users SET status='active'
GET /__debug__/user/sync-role                        role_assignments 보정
```

---

## 3. 조치 내역

**삭제 (6 컨트롤러 + 등록 블록 6개)** — 1,475 라인
`approval-test` · `forum-post-cleanup` · `order-canonical-table` · `rbac-db-audit` ·
`rbac-backfill-user-role` · `service-users-audit`

**`user-debug` 상태 변경 핸들러 제거 (187 라인)**
`GET /activate` · `GET /sync-role` 삭제 → 읽기 전용 진단만 유지(`GET /` · `GET /missing-roles`).
사용자 상태·역할의 정식 경로는 `AdminUserController`.

**유지** — `pharmacy-debug`(REVIEW) · `user-debug`(DEV_ONLY). 둘 다 프로덕션 미등록 유지.

---

## 4. 재발 방지 사전 조사 (저장소 전체)

| 패턴 | 결과 |
|---|---|
| `isPlatformAdmin: true` 등 권한 하드코딩 | **`approval-test` 1건뿐** (삭제됨). `signage-role.middleware.ts` 2건은 권한 검사 **통과 후** context 설정이라 안전 |
| `/api/v1/ops/seed-*` (2건) | **인증 있음** — `x-admin-secret` 가드. 프로덕션 401/404 실측. 이번 삭제 대상 아님 (FOLLOW-UP) |
| 인증 없는 상태 변경 HTTP route | `__debug__` 외 추가 발견 **0** |

---

## 5. 규칙 반영 (최소)

`CLAUDE.md` §8 에 5줄 규칙 신설, `AGENTS.md` §8 에 1항목 추가(상세는 CLAUDE.md 링크).
새 문서는 만들지 않았다.

```text
1. 진단·seed·repair·backfill 은 CLI 우선
2. HTTP 불가피 시 requireAuth + role guard 필수
3. debug/test route 는 프로덕션 미등록
4. GET 으로 상태 변경 금지
5. 권한 하드코딩 금지
```

---

## 6. 검증

```text
production /__debug__/** 404 유지        5/5 실측 (user·pharmacy·approval-test·
                                          forum-post-cleanup·rbac-db-audit)
삭제 route 참조                          0 (소스 전수 재검색)
가드 밖 __debug__ 등록                   0
api-server type-check                    OK
pnpm run type-check                      OK
pnpm run type-check:frontend             OK
lint ratchet                             102 (baseline 유지, 증가 0)
git diff --check                         OK
GET state-changing route (__debug__)     0
```

DB write 검증·취약 endpoint 실호출은 지시대로 수행하지 않았다.

---

## 7. FOLLOW-UP

| # | 항목 | 조건 |
|---|---|---|
| R1 | `pharmacy-debug` 최종 판정 | 조직 비활성화 공식 admin API 존재 여부 확인 필요. 운영자 실사용 보고가 오면 ADMIN_API 로 승격, 없으면 DELETE |
| F1 | `/api/v1/ops/seed-*` 2건 CLI 전환 | 인증은 있으나 "seed 는 공개 HTTP route 로 두지 않는다" 원칙 대상 |
| F2 | 규칙의 CI 가드화 | 인증 없는 상태 변경 route·권한 하드코딩 정적 검사 |
