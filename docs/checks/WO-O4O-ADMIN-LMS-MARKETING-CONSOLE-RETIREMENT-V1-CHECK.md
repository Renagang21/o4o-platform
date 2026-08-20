# WO-O4O-ADMIN-LMS-MARKETING-CONSOLE-RETIREMENT-V1 — CHECK

- **작업일**: 2026-08-20
- **대상**: `apps/admin-dashboard` LMS Marketing publisher / onboarding / automation / engagement 콘솔
- **선행**: [MAIN-SITE-UNIQUE-VIEWER-MIGRATION](WO-O4O-MAIN-SITE-UNIQUE-VIEWER-MIGRATION-AND-PREVIEW-LINK-CLOSURE-V1-CHECK.md) · [MAIN-SITE-DECOMMISSION-FINAL-CLOSURE](WO-O4O-MAIN-SITE-DECOMMISSION-FINAL-CLOSURE-V1-CHECK.md)

---

## 1. 요약 판정

| 항목 | 결과 |
|---|---|
| Backend 최종 판정 | **`BACKEND_REMOVED`** |
| Product publisher | **`DEAD_UI`** (목록·생성·편집·저장·발행 전부) |
| Quiz publisher | **`DEAD_UI`** (동일) |
| Survey publisher | **`DEAD_UI`** (동일) |
| Onboarding / Automation / Engagement / Operator console | **`DEAD_UI`** |
| 삭제 route | 6 |
| 삭제 파일 | 17 |
| 삭제 navigation/menu | **0건 (원래 메뉴 진입점이 없었다)** |
| 잔존 `DEAD_REFERENCE` | **0** |
| `UNKNOWN` | **0** |
| admin-dashboard `tsc --noEmit` / build | **PASS / PASS** |

---

## 2. Census (§3)

### 2-1. 조사 범위와 결과

| 축 | 결과 |
|---|---|
| page/component | `apps/admin-dashboard/src/pages/marketing/**` (CMS designer 제외) **16 파일** |
| API client | `apps/admin-dashboard/src/lib/api/lmsMarketing.ts` **1 파일** (741줄, 전 export 가 `/lms/marketing` 사용) |
| route 등록 | `src/routes/lms-marketing.routes.tsx` 내 **6 route + 6 lazy import** |
| navigation/menu | **0건** — sidebar·menu config 어디에도 `/admin/marketing/*` 항목 없음 |
| dashboard 카드 / shortcut | **0건** |
| onboarding 진입 링크 | `OnboardingHome` 자신이 publisher 로 가는 내부 링크만 보유 (외부 진입점 아님) |
| hook / helper / validation | 별도 파일 **0건** (전부 페이지 내부) |
| type/interface | `lmsMarketing.ts` 안에만 존재, 외부 소비 0 |
| modal/dialog | 공용 `@/components/ag/AGModal` 사용 — 공유 자산, 유지 |
| test | 관련 전용 test **0건** |
| CSS/assets | **0건** |

**미조사 0.**

### 2-2. 혼동 주의 — 유사명이지만 무관한 ACTIVE 기능

| 대상 | 판정 |
|---|---|
| `src/pages/cms/designer/blocks/marketing/**` (CTA·FAQ·PricingCard 등 25파일) | **`ACTIVE_OTHER_FEATURE`** — CMS 디자이너 블록. 이름만 marketing |
| `src/pages/supplierops/pages/MarketingMaterials*.tsx` | **`ACTIVE_OTHER_FEATURE`** — 공급자 마케팅 자료, 별도 backend |
| `ProductMarketingAsset` entity (`entities.ts:384`) | **`ACTIVE_OTHER_FEATURE`** — WO-O4O-PRODUCT-MARKETING-GRAPH-V1 |
| 다국어 `ProductContent*` entity 계열 | **`ACTIVE_OTHER_FEATURE`** — store multilingual product content |

---

## 3. Backend 계약 재확인 (§4) → `BACKEND_REMOVED`

### 3-1. Source 근거

| 근거 | 실측 |
|---|---|
| `packages/lms-marketing` | git-tracked 파일 **0건** (`dist`·`node_modules` 잔재만 존재) |
| `app-manifests/index.ts` | `manifestRegistry` **비어 있음**, 주석 `LMS: lms-core (lms-marketing R7에서 삭제됨)` |
| `disabled-apps.registry.ts:32` | `R7 (2025-12-25): lms-marketing 패키지 삭제됨` |
| `database/entities.ts:554` | `- @o4o/lms-marketing (ProductContent, QuizCampaign, SurveyCampaign)` — **REMOVED 목록** |
| `bootstrap/register-routes.ts` | marketing 관련 마운트 **0건** |

### 3-2. Live 근거 (프로덕션 `api.neture.co.kr`)

| endpoint | 응답 |
|---|---|
| `/api/v1/lms/marketing/products` | **404** |
| `/api/v1/lms/marketing/quiz-campaigns` | **404** |
| `/api/v1/lms/marketing/survey-campaigns` | **404** |
| `/api/v1/lms/marketing/onboarding/checklist` | **404** |
| `/api/v1/lms/marketing/automation/settings` | **404** |
| `/api/v1/lms/marketing/insights/dashboard/:id` | **404** |
| `/api/v1/lms/courses` (대조군) | **200** |

대조군이 200 이므로 LMS 라우터 자체는 마운트돼 있고, marketing 하위만 미등록이다.
가드 미통과(401)가 아니라 **경로 미존재(404)** 이므로 `BACKEND_PARTIAL` 이 아니다. → **`BACKEND_REMOVED` 확정.**

---

## 4. 기능별 판정 (§5)

| 기능 | 목록 | 생성 | 편집 | 저장 | 발행 | 판정 |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Product publisher | 404 | 404 | 404 | 404 | 404 | **`DEAD_UI`** |
| Quiz publisher | 404 | 404 | 404 | 404 | 404 | **`DEAD_UI`** |
| Survey publisher | 404 | 404 | 404 | 404 | 404 | **`DEAD_UI`** |
| Onboarding Home / Profile | 404 | — | 404 | 404 | — | **`DEAD_UI`** |
| Automation Settings | 404 | — | — | 404 | — | **`DEAD_UI`** |
| Supplier Engagement / Operator Console | 404 | — | — | — | — | **`DEAD_UI`** |

Preview 링크 2건은 선행 WO 에서 이미 제거돼 이번 범위에 없다.

---

## 5. 삭제 route 목록 (§6·§7)

```
/admin/marketing/publisher/*        (하위 10 sub-route 포함)
/admin/marketing/onboarding
/admin/marketing/onboarding/profile
/admin/marketing/automation
/admin/marketing/supplier/engagement
/admin/marketing/operator/console
```

`MarketingPublisherRouter` 내부 sub-route 10개(`/`·`/product`·`/product/create`·`/product/:id`·`/quiz`·`/quiz/create`·`/quiz/:id`·`/survey`·`/survey/create`·`/survey/:id`)도 라우터 파일과 함께 제거됐다.

**삭제 navigation/menu: 0건.** 이 콘솔은 원래부터 sidebar·shortcut 등록이 없었고 직접 URL 로만 도달 가능했다. 따라서 "메뉴만 숨기고 route 는 남기는" 상태가 아니라 **route 자체를 제거**했다.

---

## 6. 삭제 파일 (17건)

**pages (16)**
```
pages/marketing/automation/AutomationSettings.tsx
pages/marketing/onboarding/OnboardingHome.tsx
pages/marketing/onboarding/SupplierProfileForm.tsx
pages/marketing/operator-console/index.tsx
pages/marketing/supplier-engagement/index.tsx
pages/marketing/publisher/MarketingPublisherRouter.tsx
pages/marketing/publisher/PublisherHome.tsx
pages/marketing/publisher/product/{list,create,edit}.tsx
pages/marketing/publisher/quiz/{list,create,edit}.tsx
pages/marketing/publisher/survey/{list,create,edit}.tsx
```
→ `src/pages/marketing/` 디렉터리 자체가 사라졌다.

**API client (1)**
```
lib/api/lmsMarketing.ts
```

**수정 (1)**
```
src/routes/lms-marketing.routes.tsx  — lazy import 6 · route 6 제거 + 근거 주석
```

---

## 7. API Client 정리 내역 (§8)

`lmsMarketing.ts` 는 **741줄 전체가 `const API_BASE = '/lms/marketing'` 기반**이다. `productContentApi` · `quizCampaignApi` · `surveyCampaignApi` · `insightsApi` · `onboardingApi` · `automationApi` 6개 export 그룹 전부가 삭제된 backend 만 호출한다.

소비처 전수조사 결과 **importer 15개가 모두 이번에 삭제한 marketing 페이지 자신**이었고, 외부 소비처는 0이었다. 따라서 §8 의 "공용 파일 안의 dead 함수만 제거" 예외에 해당하지 않아 **파일 전체를 삭제**했다.

---

## 8. 유지한 shared component와 이유

| 유지 대상 | 이유 |
|---|---|
| `src/routes/lms-marketing.routes.tsx` **파일 자체** | 같은 파일에 **LMS Instructor · Digital Signage · Store Content · Store POP · Store QR · Store Tablet** 등 ACTIVE route 가 함께 들어 있다. marketing route 6건만 제거했다. 파일명은 역사적 이유로 유지하고 그 사실을 주석에 남겼다 |
| `@/components/ui/*` (card·button·input·badge·skeleton·alert·tabs·switch·progress·select·checkbox·textarea·label) | admin 전역 공용 primitive |
| `@/components/ag/AGTable` · `AGTabs` · `AGModal` | admin 전역 공용 테이블/탭/모달 |
| `@o4o/auth-context` (`AdminProtectedRoute`·`useAuth`) | 공용 인증 계약 |
| `src/pages/cms/designer/blocks/marketing/**` | CMS 디자이너 블록 — 이름만 같은 별개 ACTIVE 기능 |
| `src/pages/supplierops/pages/MarketingMaterials*.tsx` | 별도 backend 를 쓰는 ACTIVE 기능 |

---

## 9. Source 잔재 재검색 (§9)

`lms/marketing` · `marketing/publisher` · `quiz-campaigns` · `survey-campaigns` · `lmsMarketing` 전수 재검색 결과:

| 분류 | 건수 | 내용 |
|---|:--:|---|
| `ACTIVE_OTHER_FEATURE` | 0 (검색어 기준) | 위 §2-2 항목들은 이 검색어에 걸리지 않는다 |
| `HISTORICAL_DOC` | 5 | `docs/checks/**` 3 · `docs/archive/**` 1 · `docs/investigations/**` 1 — CLAUDE.md §16-1 상 **기록물이므로 수정 대상 아님** |
| `COMMENT_RECORD` | 2 | `src/routes/lms-marketing.routes.tsx` (이번 제거 근거 주석) · `apps/main-site/src/router/index.tsx` (선행 WO 근거 주석, RETIRED_RUNTIME source) |
| **`DEAD_REFERENCE`** | **0** | — |

---

## 10. Test / Build (§10)

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (admin-dashboard) | **PASS** (0 error) |
| `pnpm --filter @o4o/admin-dashboard run build` | **PASS** (`✓ built in 1m 25s`) |
| `src/tests/admin-menu-route-backend-alignment.test.ts` | **PASS** (14/14) |
| dead import | **0** (tsc 가 미해결 import 를 잡는다) |
| route compile | PASS (build 산출 chunk 정상) |

삭제량이 17 파일로 커서 **전체 admin-dashboard build 를 수행**했다.

---

## 11. Production 검증 (§11)

> 배포 후 채워 넣는다.

---

## 12. §13 중지 조건 대조

| 조건 | 해당 |
|---|---|
| backend endpoint 일부 active | **아니오** — 6/6 전부 404 |
| 다른 UI 가 같은 component 공유 | **아니오** — 외부 importer 0 |
| API client 가 다른 active 기능에서 사용 | **아니오** — importer 15건 전부 삭제 대상 |
| route ownership 불명확 | **아니오** — `lms-marketing.routes.tsx` 단일 등록 |
| UNKNOWN | **0** |
| 삭제가 공용 LMS/Marketing 구조로 확장 | **아니오** — 공용 route 파일은 유지, marketing 6 route 만 제거 |
| 운영자 실사용 발견 | **아니오** — backend 가 404 라 저장·발행이 성립 불가 |

중지 조건 발동 없음.

---

## 13. 범위 밖 발견 (미수정 · §12 에 따라 별도 WO 로 이관)

1. `deploy-api.yml:100` — 이미 삭제된 `@o4o/lms-marketing` build 단계가 no-op 로 잔존
2. root `package.json` scripts — 존재하지 않는 `@o4o/main-site` 필터 (실제는 `@o4o/main-site-nextgen`)
3. Artifact Registry `main-site` image 23건 — `ORPHAN_MANUAL_CANDIDATE`
4. `packages/lms-marketing/{dist,node_modules}` — git-tracked 파일 0인데 로컬 빌드 산출물만 남아 있음 (untracked, 저장소 영향 없음)
5. `lms_marketing_*` / `content_bundle*` DB 테이블 잔재 여부 미확인 — DB write 권한 필요

---

## 14. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건

- `docs/checks/**` · `docs/archive/**` · `docs/investigations/**` 의 marketing 참조는 과거 시점 기록물이므로 CLAUDE.md §16-1 에 따라 **수정하지 않았다.**
