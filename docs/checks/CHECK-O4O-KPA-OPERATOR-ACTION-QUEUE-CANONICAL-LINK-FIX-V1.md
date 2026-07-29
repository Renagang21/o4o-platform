# CHECK-O4O-KPA-OPERATOR-ACTION-QUEUE-CANONICAL-LINK-FIX-V1

> WO: **WO-O4O-KPA-OPERATOR-ACTION-QUEUE-CANONICAL-LINK-FIX-V1** (KPA 운영자 Action Queue 이동 경로 canonical 정렬)
> 실행일: 2026-07-29 · commit `787c8d190` · main 직접 · 상태: **DONE**

---

## 1. 목표

KPA 운영자 Action Queue 카드 2건의 잘못된 이동 경로를 canonical 운영 화면으로 정렬한다.
데이터·권한·집계 SQL 변경이 아니라 **업무 동선(actionUrl) 수정**이다.

## 2. 수정한 Action Queue 2건

파일: [apps/api-server/src/routes/kpa/action-definitions.ts](../../apps/api-server/src/routes/kpa/action-definitions.ts)

| id | 항목 | before | after |
|----|------|--------|-------|
| `suspended-members` | 정지 회원 복구 대기 | `/operator/users?status=suspended` | `/operator/members?status=suspended` |
| `forum-pending` | 포럼 카테고리 요청 | `/operator/forum` | `/operator/forum-requests` |

- `suspended-members`: `/operator/users` 는 KPA `OperatorRoutes.tsx:198` 에서 static
  `<Navigate to="/operator/members" replace />` 로 redirect 되며 **query(status=suspended)를 보존하지 못했다.**
  canonical 회원 관리 route(`/operator/members`, `OperatorRoutes.tsx:156` → `MemberManagementPage`)로 직접 연결하여 redirect 의존을 제거.
- `forum-pending`: 집계 대상은 **포럼 카테고리 신청 대기**(`forum_category_requests` + `kpa_approval_requests` entity_type='forum_category').
  canonical 신청 처리 화면은 `/operator/forum-requests`(`OperatorRoutes.tsx:96` → `ForumRequestsManagementPage`).
  기존 `/operator/forum`(`OperatorRoutes.tsx:153` → `OperatorForumPage`)은 포럼 운영 화면이라 집계 의미와 도착 화면이 불일치했다.

## 3. 중복 링크 조사 결과

- **KPA 내부**: 동일 목적의 중복 actionUrl 없음. `aiRuleGenerator` 는 `content-draft`(`/operator/content?status=draft`)·
  `member-pending`(`/operator/members`, suspended 무관) 두 규칙만 보유 — forum/suspended 목적의 AI action 링크 없음.
- **KpaOperatorDashboard.tsx:179**: 포럼 요청 KPI 는 이미 `/operator/forum-requests` 로 연결 → 이번 수정과 정합(회귀 아님, 오히려 기존 불일치를 카드 측에 정렬).
- **타 서비스(범위 밖)**: `/operator/users?status=suspended` 문자열이 `glycopharm/action-definitions.ts:64` ·
  `cosmetics/action-definitions.ts:79` 에도 존재하나, 이들은 **별도 서비스 프론트**(web-glycopharm / web-k-cosmetics,
  각자 OperatorRoutes·redirect 구조 상이)라 KPA-scoped 본 WO 범위 밖. 미접촉. 필요 시 서비스별 route 검증 동반한 별도 정렬 권장.

## 4. API 응답 검증 (프로덕션)

Action Queue 는 인증 필요(`/api/v1/kpa/operator/*`, `requireKpaScope`). 배포 후 authenticated 응답에서
`suspended-members.actionUrl` / `forum-pending.actionUrl` 확인. (§7 smoke 표 참조)

## 5. 검증 (typecheck / build)

| 대상 | 결과 |
|------|------|
| api-server `tsc -p tsconfig.build.json --noEmit` | ✅ EXIT 0 |
| web-kpa-society | 변경 없음 (API-only) |

## 6. 배포 결과

- push `787c8d190` → CI **Deploy API Server (Cloud Run)** ✅ success (Deploy to Cloud Run / Run database
  migrations / Verify deployment 전부 success). 서빙 리비전 `o4o-core-api-02997-s75`(100% traffic),
  이미지 태그 `api-server:787c8d190335e652e582d2ffb137c319d2a52d4a` = 본 커밋 확인.
- 신규 마이그레이션 없음(코드 상수만 변경) → "Run database migrations" no-op.
- KPA 웹 변경 없음 → Web 배포 불필요(WO §9).

## 7. Smoke (프로덕션 API)

Action Queue 엔드포인트 = `GET /api/v1/kpa/operator/actions`(`requireKpaScope('kpa:operator')`).

| 검증 | 기대 | 실측 |
|------|------|------|
| `/health` | 200 | ✅ 200 |
| `/api/v1/kpa/operator/actions` (no auth) | 401 | ✅ 401(guard 유지) |
| login `sohae2100@gmail.com` | accessToken 발급 | ✅ Set-Cookie accessToken(len 2221) |
| `/api/v1/kpa/operator/actions` (auth) | 200·정상 shape | ✅ `{success:true, data:{summary:{total:0,...}, items:[]}}` |
| 서빙 리비전 이미지 태그 | = commit `787c8d190` | ✅ `api-server:787c8d190...` |

**runtime actionUrl 관측 제약**: `buildActionQueue`(action-queue.factory.ts:44)는 `cnt > 0` 항목만 방출하고,
`actionUrl`(:59)은 config `def.actionUrl` 를 **verbatim 전달**한다. 프로덕션 현재 `suspended-members`·
`forum-pending` count 모두 0(pending 데이터 없음) → items 빈 배열(정상 동작). 따라서 배포된 정렬 URL 값은
(a) 서빙 리비전 = 본 커밋, (b) factory verbatim passthrough 로 확정된다. count>0 강제는 데이터 write(범위 밖)이므로
미수행. 브라우저 클릭 smoke 역시 데이터 0으로 카드 미노출(카드는 count>0 조건부 렌더) — 카드 렌더 시 이동 URL 은
동일 config 값.

## 8. 회귀 영향

- 집계 SQL·권한 guard·카드 id/label·priority 전부 불변. actionUrl 문자열 2건만 변경.
- 다른 Action Queue 항목(content-pending / content-draft / member-pending) actionUrl 불변 → 회귀 0.

## 9. 알려진 제약 (Follow-up 후보)

- KPA `MemberManagementPage` 는 shared `OperatorMembersConsolePage` 를 **`syncUrl` 미전달(기본 false)**로 렌더하며,
  URL query sync 시 param key 는 `members_tab`(값 예: `status-suspended`)이다. 따라서 `/operator/members?status=suspended`
  는 현재 **suspended 탭 자동선택을 트리거하지 않는다.**
- 본 수정으로 **redirect 의존 제거 + canonical 직결**은 달성했으나, "suspended 탭 자동필터 적용"까지 만들려면
  shared `OperatorMembersConsolePage`(GP/Cosmetics/Neture 공용) 변경 또는 KPA 측 `syncUrl` 활성화 + param 정렬이 필요하며,
  이는 본 WO 선언 파일 범위(action-definitions.ts) 및 "redirect 구조 전면 정리 = 범위 밖" 밖이다. 별도 WO 로 분리 권장.

## 10. 결론

**CLOSED.** KPA 운영자 Action Queue 이동 경로 2건(`suspended-members`, `forum-pending`)을 canonical route 로 정렬.
redirect 의존 제거 및 집계 의미↔도착 화면 일치. 집계·권한·데이터 불변, 회귀 0. suspended 탭 자동필터는 §9 제약으로 별도 후속.
