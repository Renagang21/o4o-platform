# WO-O4O-NETURE-OPERATOR-PRODUCTION-DEFECT-CLOSURE-V1 — CHECK

**작업일:** 2026-08-14
**대상:** Neture 운영자 화면 잔여 결함 3건 마감 + 공식 4서비스 Operator 회귀
**선행 WO:** [WO-O4O-OPERATOR-COMMONIZATION-MAIN-INTEGRATION-AND-PRODUCTION-VALIDATION-V1](../work-orders/WO-O4O-OPERATOR-COMMONIZATION-MAIN-INTEGRATION-AND-PRODUCTION-VALIDATION-V1.md)
**WO:** [WO-O4O-NETURE-OPERATOR-PRODUCTION-DEFECT-CLOSURE-V1](../work-orders/WO-O4O-NETURE-OPERATOR-PRODUCTION-DEFECT-CLOSURE-V1.md)

---

## 0. 작업 시작 상태

| 항목 | 값 |
|---|---|
| branch | `main` |
| 시작 HEAD | `2c6f2cd8f` (WO 등록 커밋) |
| 커밋 | `0738a2916` (결함 3건) → `187504cd7` (동일 계열 403 2건) |
| 작업 중 HEAD 이동 | 타 세션 push `95e579448` · `c6dcc16ec` · `d51342e83` |
| 타 세션 미추적 파일 | `.prod-verify.mjs` · `.reg-check.mjs` — **미접촉·미스테이지** |
| production DB write | **0건** (WO 제약: read-only) |

---

## 1. 결함 1 — quick action dead link

**증상:** 운영자 대시보드 Quick Actions 의 `사이니지` → `/operator/signage/hq-media` 가 Neture 에 존재하지 않는 route.

**원인:** `WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1` 로 Neture frontend 의 `/operator/signage/*` route 가 제거됐으나, backend 가 내려주는 quickActions 배열에 항목이 남아 있었다.

**수정:** `apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts` — `go-signage` 항목 제거 (주석으로 근거 기록).

**검증(프로덕션):** `GET /api/v1/neture/operator/dashboard` → quickActions **8건**, `signage` 포함 0건. 화면 Quick Actions 8개 모두 존재 route.

---

## 2. 결함 2 — Action Queue 500

**증상:** `GET /api/v1/neture/operator/actions` → 500. `/operator/actions` 화면 렌더 실패.

**원인(Cloud Run 로그 실측):**

```
QueryFailedError: column "created_at" does not exist
  at async Promise.all (index 2)
```

`apps/api-server/src/database/connection.ts:91` 의 `SnakeNamingStrategy` 가 **주석 처리**되어 있어, 명시적 `name:` 없는 엔티티 컬럼은 물리 컬럼이 quoted camelCase 로 생성된다. `NetureContactMessage.entity.ts` 는 `@CreateDateColumn() createdAt` 이므로 물리 컬럼이 `"createdAt"` 인데, action-queue raw SQL 이 `created_at` 을 참조했다.

**정적 전수 확인:** 동일 `Promise.all` 의 나머지 3개 테이블은 엔티티가 `@CreateDateColumn({ name: 'created_at' })` 을 선언 — `service_memberships` · `neture_suppliers` · `neture_partnership_requests` 는 수정 불필요.

**수정:** `operator-action-queue.controller.ts` — index 2 쿼리만 `MIN("createdAt")` 으로 최소 수정.

**검증(프로덕션):** `GET /api/v1/neture/operator/actions` → **200**. 화면 렌더 — 총 작업 2건 / 긴급 1건 / 실제 큐 항목 표시.

---

## 3. 결함 3 — 알림 설정 403 (정책 A안)

**증상:** `/operator/settings/notifications` 진입 시 데이터 API 403.

**정책 판정(승인됨 · A안):** 해당 API 는 **플랫폼 공통 설정 계약**이며 서비스 운영자를 의도적으로 제외한다. `neture:operator` 를 허용 목록에 추가하면 타 서비스 운영자와의 형평성 및 설정 데이터의 service scope 까지 재설계해야 한다.

→ **route · API guard · 권한 계약 미변경.** Neture 운영자 사이드바에서만 항목 제외.

**수정:** `services/web-neture/src/config/operatorMenuGroups.ts` — `system` 그룹에서 '알림 설정' 제거.

**부작용 확인:** `packages/ui/src/operator-shell/filterMenuByRole.ts` 계약상 "통과 항목 0개인 그룹은 결과에서 제외" → 운영자 사이드바에 **빈 '시스템' 헤딩이 남지 않음**. 프로덕션 실측으로 확인.

---

## 4. 전수 재검증 중 추가 발견 — 동일 계열 403 2건

전수 스윕(fetch + XMLHttpRequest + window error 후킹)에서 추가 403 2건 검출.

| 화면 | 데이터 API | guard |
|---|---|---|
| `/operator/ai-card-report` | `GET /api/ai/card-report` | `requireAdmin` |
| `/operator/ai-operations` | `GET /api/ai/operations` | `requireAdmin` |

`requireAdmin` 은 `WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1` 이후 **`platform:super_admin` 단독 허용**이므로 `neture:operator` 로는 403이고 화면은 0 값으로만 렌더된다. 플랫폼 공통 AI 운영 계약이므로 **결함 3과 동일하게 A안 적용** — guard 유지, 메뉴만 `adminOnly: true`.

> **잔여 사항(별도 WO 후보):** Neture admin 사이드바는 자체 메뉴(`/admin/ai-admin` · `/admin/ai-card-rules` · `/admin/ai-business-pack`)를 쓰므로, `/operator/ai-card-report` · `/operator/ai-operations` 두 화면은 **route 는 살아 있으나 메뉴 진입점이 없다.** 은퇴할지 admin 메뉴로 승격할지는 별도 판단 필요.

---

## 5. 프로덕션 실계정 검증 결과

후킹 방식: `window.fetch` + `XMLHttpRequest.prototype.open/send` + `error` / `unhandledrejection`.
(fetch 단독 후킹은 axios/XHR 4xx 를 놓친다 — 실제로 4장의 403 2건이 fetch 후킹에서 누락됐다.)

| 서비스 | 화면 수 | 4xx/5xx | JS exception | white screen |
|---|---:|---:|---:|---:|
| Neture (desktop 1440) | 23 | **0** | **0** | **0** |
| Neture (mobile 390) | 7 | **0** | **0** | **0** |
| KPA Society (desktop) | 10 | **0** | **0** | **0** |
| KPA Society (mobile 390) | 4 | **0** | **0** | **0** |
| K-Cosmetics (desktop) | 30 | **0** | **0** | **0** |
| Pharmacy-Hub (desktop) | 2 | **0** | **0** | **0** |

- Neture dead link: 사이드바 표시 경로 + Quick Actions 8건 전수를 `App.tsx` route 정의와 정확 매칭 → **미존재 0건**.
- Pharmacy-Hub 운영자 영역은 설계상 `/operator` · `/operator/memberships` 2화면(가입 승인·반려 전용).

### 관찰 사항 (이번 WO 범위 외 · 별도 WO 후보)

- `/operator/orders` (Neture) 모바일 390 에서 가로 overflow(문서 폭 474px). 표 레이아웃 이슈이며 **이번 변경과 무관한 기존 상태**. 403/500·white screen·JS exception 아님.
- pushState 기반 연속 스윕에서 `/operator/actions` 가 lazy chunk 로딩 타이밍상 짧게 측정되는 경우가 있어, 직접 navigation 으로 재확인 — desktop·mobile 모두 정상 렌더.

---

## 6. 검증 · Git

| 항목 | 결과 |
|---|---|
| `pnpm typecheck` (변경 워크스페이스) | PASS |
| `pnpm --filter @o4o/web-neture build` | PASS |
| API 배포 | `o4o-core-api-03326-qlk` 100% 서빙 |
| Web 배포 | `Deploy Web Services (Cloud Run)` completed/success (양 커밋) |
| `CI Pipeline` | `0738a2916` · `187504cd7` · CHECK 커밋 `4c7a3efc2` **모두 cancelled** — GitHub Actions concurrency 로 타 세션의 연속 push(`95e579448` · `c6dcc16ec` · `d51342e83` · `4a38c9cb0`)가 선행 run 을 계속 취소. **실패 아님이며 green run 을 확보하지 못했다.** 대체 검증으로 로컬 `pnpm --filter @o4o/api-server type-check` PASS · `pnpm --filter @o4o/web-neture build` PASS (현재 main 기준) |
| production DB write | **0건** |

**커밋**

| commit | 내용 |
|---|---|
| `0738a2916` | 결함 1·2·3 마감 (dashboard quickActions / action-queue SQL / 알림 설정 메뉴) |
| `187504cd7` | AI 카드 리포트·AI 운영 메뉴 `adminOnly` 전환 |

---

## 7. 완료 기준 대조

| 기준 | 결과 |
|---|:---:|
| Neture 운영자 dead link 0 | ✅ |
| 표시 기능의 403 · 500 0 | ✅ |
| white screen · JS exception 0 | ✅ |
| 공식 4서비스(KPA · K-Cosmetics · Neture · Pharmacy-Hub) 회귀 0 | ✅ |

**문서 정합:** 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (① `/operator/ai-card-report` · `/operator/ai-operations` 메뉴 진입점 부재 처리 ② Neture `/operator/orders` 모바일 가로 overflow)
