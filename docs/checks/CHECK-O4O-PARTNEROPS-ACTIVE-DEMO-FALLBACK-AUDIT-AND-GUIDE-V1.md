# CHECK-O4O-PARTNEROPS-ACTIVE-DEMO-FALLBACK-AUDIT-AND-GUIDE-V1

> WO: `WO-O4O-PARTNEROPS-ACTIVE-DEMO-FALLBACK-AUDIT-AND-GUIDE-V1`
> 작업일: 2026-08-11 · 기준 commit: `046faa386` → 구현 commit: `8dee7a651`
> 범위: **active partnerops 화면의 데모 데이터 위장 제거** (backend 복구 아님 · affiliate 기능 신설 아님)
> 결과: **PASS**

---

## 1. 기준 commit · 범위

| 항목 | 값 |
|------|-----|
| 기준 commit | `046faa386` |
| 구현 commit | `8dee7a651` |
| 변경 범위 | `apps/admin-dashboard/src/pages/partnerops/**` (frontend only) |
| backend 변경 | **0건** (route · migration · schema · 권한 · manifest 모두 미변경) |

---

## 2. app active 여부 · route 도달성

| 항목 | 확인 |
|------|------|
| app 등록 | `apps/api-server/src/app-manifests/partnerops.manifest.ts` · `appsCatalog.ts` · seed migration `2026012200002-SeedDefaultApps` |
| 프론트 route | `apps/admin-dashboard/src/routes/apps.routes.tsx:158` — `/partnerops/*` |
| Guard | `AdminProtectedRoute requiredRoles={['partner','admin']}` → `AppRouteGuard appId="partnerops"` → 화면별 `AppGuard` |
| 도달성 | **도달 가능** — dead route 가 아니라 실제로 열리는 active 화면이다 |

즉 사용자가 실제로 보는 화면이었고, 그 화면이 API 실패를 실적처럼 보여주고 있었다.

---

## 3. 제거한 demo fallback (6건)

모두 `catch → 가짜 데이터 주입` 패턴이었다. 제거 후에는 `PartnerOpsLoadError` 로 실패를 명시한다.

| # | 화면 | 호출 | 제거한 위장 데이터 |
|:--:|------|------|------|
| 1 | `pages/Dashboard.tsx` | `GET /partnerops/dashboard/summary` | 클릭 15,420 / 전환 342 / 누적수익 1,542,000원 / 최근활동 2건 |
| 2 | `pages/Links.tsx` | `GET /partnerops/links` | 링크 3건(`link.neture.co.kr/abc123` 등) + 상단 집계(총 링크·클릭·전환) |
| 3 | `pages/Conversions.tsx` | `GET /partnerops/conversions` · `/summary` | 주문 5건(`ORD-2024-001`~`005`) + 요약(전환 342 / 커미션 771,000원) |
| 4 | `pages/Settlement.tsx` | `GET /partnerops/settlement/batches` · `/summary` | 정산 batch 4건(`SET-2024-001`~`004`) + 요약(총 1,742,000원) |
| 5 | `pages/Profile.tsx` | `GET /partnerops/profile` | 데모 파트너(레벨 standard / 수수료 5% / SNS 계정 3건 / 커미션 1,542,000원) |
| 6 | `pages/Routines.tsx` | `GET /partnerops/routines` | 루틴 3건(겨울철 보습 / 민감 피부 진정 / 여드름 관리) |

**Profile 부수 효과 (중요):** 기존에는 실패해도 항상 프로필이 채워져 `if (!profile)` 의 **"파트너 등록" 화면이 도달 불가**였다. fallback 제거로 미등록 사용자가 등록 화면을 볼 수 있게 됐다.

### 오류 표시 계약

신규 공통 컴포넌트 `pages/partnerops/components/PartnerOpsLoadError.tsx`:

- 표시: `데이터를 불러오지 못했습니다` + **API 경로 / 응답 상태 / 요약 오류** + **다시 시도** 버튼
- 0건 정상 상태와 실패를 구분한다 (Dashboard 는 `표시할 파트너 실적 데이터가 없습니다` 별도 문구)
- **raw stack trace · 응답 본문 원문 · secret 미노출** — 응답이 HTML 이면 `API 응답이 JSON 이 아닙니다 (HTML 응답).` 로 대체하고, 메시지는 200자 상한

---

## 4. disabled · 안내 처리한 mutation CTA (10건)

문구: `이 기능은 현재 운영 API 검증 전입니다.` (`PartnerOpsMutationNotice`)

| # | CTA | 원래 호출 | 처리 |
|:--:|-----|------|------|
| 1 | 새 링크 생성 | `POST /partnerops/links` | 버튼 disabled + 생성 모달·핸들러 제거 |
| 2 | 링크 삭제 | `DELETE /partnerops/links/:id` | 행 액션 메뉴 제거 |
| 3 | 새 루틴 생성 | `POST /partnerops/routines` | 버튼 disabled + 폼 모달·핸들러 제거 |
| 4 | 루틴 수정 | `PUT /partnerops/routines/:id` | 행 버튼 disabled |
| 5 | 루틴 삭제 | `DELETE /partnerops/routines/:id` | 행 버튼 disabled |
| 6 | 루틴 publish/draft 토글 | `PUT /partnerops/routines/:id` | 행 버튼 disabled |
| 7 | 프로필 저장 | `PUT /partnerops/profile` | 수정·저장 버튼 disabled |
| 8 | 파트너 신청 | `POST /partnerops/profile/apply` | 버튼 disabled + 안내 |
| 9 | 정산 다운로드 | (미구현 no-op) | 헤더·행 버튼 disabled + 안내 |
| 10 | 전환 내보내기 | (미구현 no-op) | 헤더 버튼 disabled + 안내 |

`/partnerops/routines/new` · `/partnerops/routines/:id` 라우트는 **제거하지 않았다** (WO 범위 밖). 목록 + 안내를 표시한다.

부수 정정 1건: Settlement 하단이 `정산금은 매월 15일 등록된 계좌로 입금됩니다.` 라고 확정 안내하고 있었다. 검증되지 않은 운영 약속이므로 검증 전 상태임을 밝히는 문구로 교체했다.

---

## 5. backend mount read-only 결과 (§5)

**코드 확인 (변경 없음, 조사만):**

| # | 항목 | 결과 |
|:--:|------|------|
| 1 | `/partnerops/*` route factory 존재 | ✅ 존재 — `packages/partnerops/src/backend/index.ts` `createRoutes()` (dashboard/profile/routines/links/conversions/settlement 전 경로 정의) |
| 2 | api-server 에서 mount 되는지 | ❌ **mount 없음** — `apps/api-server/src` 내 partnerops 참조는 manifest·catalog·seed migration 뿐. `package.json` 에 `@o4o/partnerops` 의존 **없음** |
| 3 | app loader 가 `createRoutes` 를 연결하는지 | ❌ **연결 없음** — api-server 전체에서 `createRoutes` 호출 **0건** |
| 4 | install hook 테이블 vs runtime repository | ❌ **불일치** — install 은 `partnerops_partners/routines/links/clicks/conversions/settings` 생성, runtime 은 partner-core entity 사용 |
| 5 | partner-core entity vs `partnerops_*` 이름 | ❌ **불일치** — partner-core 는 `partners` · `partner_links` · `partner_clicks` · `partner_conversions` · `partner_commissions` · `partner_settlement_batches`. `PartnerRoutine` entity 는 **존재하지 않으며** 코드에 `getRepository('PartnerRoutine') as any` 로 남아 있다 |

**프로덕션 비파괴 GET (2026-08-11, 인증 없음):**

| 엔드포인트 | status | content-type |
|------|:---:|------|
| `GET /api/v1/partnerops/dashboard/summary` | **404** | `text/html` |
| `GET /api/v1/partnerops/profile` | **404** | `text/html` |
| `GET /api/v1/partnerops/links` | **404** | `text/html` |
| `GET /api/v1/partnerops/conversions` | **404** | `text/html` |
| `GET /api/v1/partnerops/settlement/summary` | **404** | `text/html` |

401/403 이 아니라 **전부 404 + Express 기본 HTML 오류 페이지**다. 가드가 가로챈 것이 아니라 **route 자체가 없다**. 이번 WO 의 CTA 비활성 판단은 이 결과에 근거한다.

---

## 6. 실브라우저 smoke (§6)

계정: `sohae2100@gmail.com` (admin) — 자격증명 SSOT `docs/local/TEST-ACCOUNTS.local.md`
배포 스탬프: `배포 테스트 v3.0 · 2026. 8. 11. 오전 9:25:51` (commit `8dee7a651` 리비전)
가드 통과: `AdminProtectedRoute(['partner','admin'])` → `AppRouteGuard appId="partnerops"` — 7개 경로 모두 실도달 (app-disabled 리다이렉트 0건).

| # | 경로 | 관측 | 가짜 데이터 | mutation CTA |
|:--:|------|------|:---:|------|
| 1 | `/partnerops/dashboard` | `데이터를 불러오지 못했습니다` · API `/partnerops/dashboard/summary` · 상태 `404` · 사유 문구 표시. KPI 타일 0건 | 0 | `새로고침`(재조회, 안전) |
| 2 | `/partnerops/profile` | 동일 실패 카드 (API `/partnerops/profile` · `404`). 등록 폼·데모 프로필 미노출 | 0 | 없음 (실패 시 early return) |
| 3 | `/partnerops/routines` | 실패 카드 + `루틴 생성·수정·삭제·게시 — 이 기능은 현재 운영 API 검증 전입니다.` | 0 | `새 루틴` **disabled** |
| 4 | `/partnerops/links` | 실패 카드 + `링크 생성·삭제 — …검증 전입니다.` | 0 | `새 링크` **disabled** |
| 5 | `/partnerops/conversions` | 실패 카드 + `전환 내보내기 — …검증 전입니다.` | 0 | `내보내기` **disabled** |
| 6 | `/partnerops/settlement` | 실패 카드 (API `/partnerops/settlement/batches`) + `정산 다운로드 — …검증 전입니다.` | 0 | `전체 다운로드` **disabled** |
| 7 | `/partnerops/ai-builder` | `AI Builder is coming soon...` placeholder (기존 상태, 미변경) | 0 | 없음 |

기대 대비 판정:

| 기대 (§6) | 결과 |
|------|:---:|
| demo 수치 · 가짜 row 0 | ✅ 7/7 |
| API 실패가 실제 데이터처럼 보이지 않음 | ✅ 실패 카드로만 표시 |
| blank page 0 | ✅ 7/7 |
| console error 0 또는 원인 명시 | ⚠️ **원인 명시** (아래) |
| `text/html` API 위장 0 | ✅ 404 HTML 을 데이터로 렌더하지 않고 `운영 API 엔드포인트가 존재하지 않습니다 (404).` 로 치환 |
| mutation CTA 가 검증 없이 실행되지 않음 | ✅ 4개 헤더 CTA 전부 `disabled` (DOM `button.disabled=true` 확인) |
| raw stack trace · secret 노출 | ✅ 0건 (endpoint · status · 고정 문구만 노출) |

**console error 원인 명시** — 각 화면당 2건씩 발생하며 전부 **의도된 실패 경로**다.
`Failed to load resource … /api/v1/partnerops/*` (브라우저 네트워크 404 기본 로그) +
`Failed to fetch …` (`console.error` 진단 로그, 화면 노출 아님). backend mount 부재의 직접 증거이므로
이번 WO 에서 숨기지 않았다(§8-1 참조).

---

## 7. typecheck · build · 배포

| 항목 | 결과 |
|------|:---:|
| `pnpm run type-check` (admin-dashboard) | ✅ PASS |
| `VITE_API_URL=... pnpm run build:prod` | ✅ PASS (1m 31s) |
| 번들 demo 문자열 잔존 (`demo-partner` / `abc123` / `ORD-2024-001` / `SET-2024-001` / `beauty_partner` / `겨울철 보습 루틴`) | ✅ **전부 0건** |
| Deploy Admin Dashboard (Cloud Run) | ✅ PASS (run `31445760068` · success) |
| Deploy API Server | ⛔ 실행하지 않음 (backend 변경 0건) |

---

## 8. 미수정 · HOLD (범위 밖 — 별도 WO 필요)

1. **partnerops backend mount 부재** — route factory 는 있으나 api-server 가 연결하지 않는다. 신설은 WO §4.3 금지사항.
2. **데이터 모델 이중화** — `partnerops_*` (install hook) vs `partner_*` (partner-core entity). 어느 쪽이 canonical 인지 미결정.
3. **`PartnerRoutine` entity 부재** — `getRepository('PartnerRoutine') as any` 는 mount 되는 순간 런타임 실패한다.
4. **`/partnerops/ai-builder*` 3개 라우트** — 화면이 `AI Builder is coming soon...` placeholder. 이번 범위(데모 데이터 위장)와 성격이 달라 손대지 않았다.
5. **affiliate surface 존치/은퇴 판단** — 사용자 정책상 전통 affiliate 수익·전환·자동 수수료·정산은 도입하지 않는 방향이므로, 화면군 자체의 존치 여부는 별도 판단이 필요하다.

---

## 9. 금지사항 준수 (§4.3)

| 금지 | 준수 |
|------|:---:|
| partnerops backend route 신설 | ✅ 없음 |
| partnerops table migration | ✅ 없음 |
| partner-core schema 변경 | ✅ 없음 |
| 정산/전환/커미션 엔진 구현 | ✅ 없음 |
| affiliate 자동 수익 로직 구현 | ✅ 없음 |
| DB write · 운영 데이터 mutation | ✅ 없음 (프로덕션 접근은 비파괴 GET 5건뿐) |
| 권한 · role 변경 | ✅ 없음 (guard 불변) |
| app manifest 활성/비활성 변경 | ✅ 없음 |
| 무관한 dirty 파일 · lockfile 스테이징 | ✅ 없음 (path-specific stage) |

---

## 10. 후속 후보 (§10 — 본 WO 범위 아님)

1. `IR-O4O-PARTNEROPS-BACKEND-MOUNT-AND-DATA-MODEL-AUDIT-V1`
2. `WO-O4O-PARTNEROPS-RETIRE-OR-CANONICALIZE-AFFILIATE-SURFACE-V1`
3. `WO-O4O-NETURE-ABOUT-LINK-AND-CATCH-ALL-ROUTE-V1`

---

## 11. 문서 정합 (CLAUDE.md §16)

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건 (§10)
