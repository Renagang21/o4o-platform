# WO-O4O-MAIN-SITE-UNIQUE-VIEWER-MIGRATION-AND-PREVIEW-LINK-CLOSURE-V1 — CHECK

- **작성일**: 2026-08-20
- **선행 WO**: [WO-O4O-MAIN-SITE-RUNTIME-CONTRACT-AUDIT-AND-DECOMMISSION-DECISION-V1-CHECK](WO-O4O-MAIN-SITE-RUNTIME-CONTRACT-AUDIT-AND-DECOMMISSION-DECISION-V1-CHECK.md) (판정 `REDUCE_TO_INTERNAL_OR_LIMITED_ROLE`)
- **범위**: `o4o-main-site` 유일 viewer 3건 + admin Preview 링크 2건
- **DB write**: 0 · **GCP write**: 0 · **DNS 변경**: 0

---

## 1. 요약 판정

| viewer | §4 판정 | 근거 |
|---|:---:|---|
| `/marketing/product/:id` | **`DEAD_FEATURE`** | backend 삭제 · API 404 · 외부 진입 0 |
| `/marketing/quiz/:id` | **`DEAD_FEATURE`** | 동일 |
| `/lms/bundle/:bundleId` | **`DEAD_FEATURE`** | 동일 + 링크 생성 소비처 0 |

**UNKNOWN 0건.** 3건 모두 `DEAD_FEATURE` 이므로 §5 의 이전(재사용 / 공통 viewer 추출 / `neture-web` 이동)은
**적용 대상이 아니다.** 살아있지 않은 기능을 옮기는 것이 아니라 제거하는 것이 정합이다.

**결과: `o4o-main-site` 만의 유일 기능 0건.**

---

## 2. Backend 계약 실측 — viewer 가 호출하는 API 는 존재하지 않는다

WO §5 "단순 URL 치환 전에 viewer 의 데이터/API 계약을 확인한다" 에 따라 계약부터 확인했다.

### 2-1. 코드상 계약

| viewer | API client | base path |
|---|---|---|
| product | `productContentApi.ts` | `/api/v1/lms/marketing/products` |
| quiz | `quizCampaignApi.ts` | `/api/v1/lms/marketing/quiz-campaigns` |
| bundle | `contentBundleApi.ts` | `/api/v1/lms` → `/bundles` |

### 2-2. 프로덕션 실측 (`https://api.neture.co.kr`)

| endpoint | HTTP |
|---|:---:|
| `/api/v1/lms/marketing/products` | **404** |
| `/api/v1/lms/marketing/quiz-campaigns` | **404** |
| `/api/v1/lms/marketing/survey-campaigns` | **404** |
| `/api/v1/lms/bundles` | **404** |
| `/api/v1/lms/courses` (대조군) | 200 |

대조군이 200 이므로 `/api/v1/lms` 자체는 살아있다. 404 는 **해당 하위 경로만 없다**는 뜻이다.

### 2-3. 404 의 원인 — 코드 근거

1. **`packages/lms-marketing` 은 git 추적 파일 0건이다.**
   `git ls-files packages/lms-marketing | wc -l` → `0`. 디스크에 남은 것은 `dist/*.d.ts` 와 `node_modules` 뿐이며
   **버전 관리 대상 source 는 Phase R7 에서 삭제됐다.**
2. `apps/api-server/src/database/entities.ts:554` — `DOMAIN ENTITIES REMOVED (Phase R1)` 목록에
   `@o4o/lms-marketing (ProductContent, QuizCampaign, SurveyCampaign)` 이 명시돼 있다. **entity 등록 해제됨.**
3. `apps/api-server/src/app-manifests/index.ts:12` — `LMS: lms-core (lms-marketing R7에서 삭제됨)`, registry 는 비어 있다.
4. `packages/lms-core/src/index.ts:56` 의 `routes()` 가 `/bundles` 를 mount 하지만,
   **api-server bootstrap 에 `routes()` 호출부가 0건**이라 `/api/v1/lms/bundles` 는 등록되지 않는다.

즉 3 viewer 는 **삭제된 backend 를 향해 남아 있던 frontend 껍데기**다.

### 2-4. 확인하지 못한 항목 (숨기지 않고 기록)

`lms_marketing_*` 테이블의 **잔존 여부는 확인하지 못했다.** 로컬 `apps/api-server/.env` 의 `DB_PASSWORD` 가 빈 값이라
read-only 접속이 성립하지 않았다. 다만 **판정에는 영향이 없다** — 라우트가 등록되지 않았으므로
테이블이 남아 있든 아니든 viewer 는 도달 불가다. 테이블 정리는 §7 후속 후보로 남긴다.

---

## 3. 소비처 전수조사 (WO §8)

`timeout 300 git grep -In "lms/bundle" -- .` 전수 결과:

| 소비 위치 | 성격 |
|---|---|
| `apps/main-site/src/pages/lms/bundle/BundleViewerPage.tsx` | viewer 자신 |
| `apps/main-site/src/router/index.tsx` | 자기 route 등록 |
| `packages/interactive-content-core/src/controllers/ContentBundleController.ts` | **주석의 API 경로 표기** (mount 안 됨) |
| `packages/lms-core/src/index.ts:56` | mount 코드 — **호출부 0** |
| `docs/checks/**` | 기록물 |

**링크를 생성하는 소비처(LMS admin · course 상세 · bundle 생성/수정 · 학습자 UI · 이메일 · QR · 직접 URL 생성기) 0건.**
WO §8 "소비처가 0이면 `DEAD_FEATURE` 가능성을 판단한다" 에 해당한다.

`/marketing/product/:id` · `/marketing/quiz/:id` 로 향하는 링크는 **admin Preview 2건이 유일**했고,
그 2건은 admin 상대경로라 `admin.neture.co.kr/marketing/...` 로 해석돼 **원래부터 404** 였다 (선행 WO CHECK §6 기록).

---

## 4. §5 우선순위 대조 — 왜 이전하지 않았는가

| 순위 | 방안 | 판단 |
|:---:|---|---|
| 1 | 기존 viewer 재사용 | **불가** — 동일 기능 viewer 가 다른 frontend 에 없음 |
| 2 | 공통 viewer 추출 (`packages/**`) | **불가** — 추출해도 호출할 backend 가 없음 |
| 3 | `neture-web` 이동 | **불가** — 동일 |

WO §14 중지 조건 중 **"API 계약이 main-site 전용"** 에 정확히 해당한다. 다만 이 경우의 "전용" 은
*main-site 만 쓰는 살아있는 API* 가 아니라 ***이미 삭제된 API*** 이므로, 중지가 아니라
§4 의 `DEAD_FEATURE` 판정으로 닫는 것이 맞다. WO §12 는 "dead route/component 는 cascade 없이 제거 가능" 을 허용한다.

viewer 를 서비스별로 복제하지 않았고(§5 금지), main-site 를 살리기 위한 CORS/domain 연결도 하지 않았다(§2 금지).

---

## 5. 실제 변경

### 5-1. `apps/main-site` — dead viewer 제거

삭제 (총 12 파일):

| 경로 | 비고 |
|---|---|
| `src/pages/marketing/` (index.ts · product/ · quiz/ · survey/) | `SurveyCampaignViewerPage` 는 route 조차 없던 dead 파일 |
| `src/pages/lms/bundle/BundleViewerPage.tsx` | |
| `src/components/lms-core/viewer/` (4 컴포넌트 + index) | `ContentBundleViewer` · `ContentItemRenderer` · `QuizRunner` · `SurveyRunner` — 소비처가 위 viewer 뿐 |
| `src/lib/api/{productContentApi,quizCampaignApi,contentBundleApi,surveyCampaignApi,engagementApi}.ts` | 전부 삭제된 backend 대상 |

`src/router/index.tsx` — lazy import 3건 + `<Route>` 3건 제거, 사유 주석으로 대체.
`src/lib/api/` 에는 `lmsYaksaMember.ts` 만 남는다.

**cascade 없음** — 위 파일들의 소비처는 main-site 내부로 닫혀 있었고, 외부(packages/services/admin)에서의 import 0건.

### 5-2. `apps/admin-dashboard` — 깨진 Preview 링크 2건 제거 (WO §7)

| 파일 | 변경 |
|---|---|
| `src/pages/marketing/publisher/product/edit.tsx` | Preview 버튼 제거 + 사유 주석, 미사용 `ExternalLink` import 정리 |
| `src/pages/marketing/publisher/quiz/edit.tsx` | 동일 |

**재지정(re-point) 하지 않았다.** 가리킬 viewer 가 존재하지 않으므로 다른 URL 로 바꾸면 404 를 404 로 옮기는 것뿐이다.

---

## 6. 검증

| 항목 | 결과 |
|---|:---:|
| `tsc --noEmit` · `apps/main-site` | **PASS** (오류 0) |
| `tsc --noEmit` · `apps/admin-dashboard` | **PASS** (오류 0) |
| `pnpm --filter @o4o/main-site-nextgen run build` | **PASS** (`✓ built in 30.98s`) |
| 잔여 참조 재검색 (§9) | 코드 참조 0 — 사유 주석 3곳만 잔존 |
| 프로덕션 API 실측 | §2-2 표 |
| DB write | 0 |
| GCP write | 0 |

작업 중 실수 1건을 기록한다. 제가 시작한 `cloud-sql-proxy` 를 종료하면서 이미지명 기준 `taskkill` 을 써서
**다른 세션이 5442 포트로 띄워 두었던 `cloud-sql-proxy` 프로세스까지 함께 종료**됐습니다.
로컬 개발 프로세스이고 프로덕션 영향은 없으나, 해당 세션에서는 프록시 재기동이 필요합니다.

---

## 7. §13 재판정 — `DECOMMISSION_CONFIRMED`

선행 WO §9C 게이트 대조 (이번 변경 반영):

| 게이트 | 상태 |
|---|:---:|
| 실제 사용자 진입 0 | ✅ (60일 11요청 = CI self-smoke 8 · bot 2 · 자체 점검 1, 24h 0) |
| auth · callback · handoff 소비처 0 | ✅ |
| **`o4o-main-site` 만의 unique 기능 0** | ✅ **이번 WO 로 해소** |
| GCLB · DNS · custom domain 소비처 0 | ✅ |
| CI 가 legacy 배포 계약 | ✅ (`deploy-main-site.yml` — custom domain 안내 문구가 stale) |
| traffic 이 bot · test · direct-run.app 수준 | ✅ |
| UNKNOWN 0 | ✅ |

**7/7 충족 → 판정 `DECOMMISSION_CONFIRMED`.**
실제 폐기는 WO 범위 밖이므로 수행하지 않았다. **`WO-O4O-MAIN-SITE-DECOMMISSION-FINAL-CLOSURE-V1` 로 인계**한다.

인계 시 함께 처리할 사항:
- Cloud Run `o4o-main-site` 삭제
- `.github/workflows/deploy-main-site.yml` 삭제 (이번 WO 에서는 미변경 — 편집 자체가 프로덕션 재배포를 유발한다)
- `apps/main-site/` source 처리 방침 결정 (WO §12 에 따라 이번에는 전체 삭제하지 않았다)
- Artifact Registry `main-site` 이미지 정리

---

## 8. 범위 밖 발견 (수정하지 않음 · 별도 WO 제안)

**admin marketing publisher 콘솔 전체가 같은 삭제된 backend 를 호출한다.**

- `apps/admin-dashboard/src/lib/api/lmsMarketing.ts` → `API_BASE = '/lms/marketing'` (404)
- 소비 화면 11개: `pages/marketing/publisher/{product,quiz,survey}/{list,create,edit}.tsx` · `PublisherHome` · `MarketingPublisherRouter`
- `apps/admin-dashboard/src/App.tsx:61` 에서 `LmsMarketingRoutes` 로 **실제 mount 되어 있고**,
  `pages/marketing/onboarding/OnboardingHome.tsx` 가 `/admin/marketing/publisher/*` 로 링크한다.
- `pages/marketing/operator-console/index.tsx` · `supplier-engagement/index.tsx` 도 같은 client 를 쓴다.

즉 운영자가 도달 가능한 화면이지만 저장·발행이 전부 실패한다. 다만 이번 WO 의 §7 범위는
**"Preview 링크 2건"** 으로 한정돼 있어 콘솔 자체는 손대지 않았다.
→ 제안: `WO-O4O-ADMIN-LMS-MARKETING-CONSOLE-RETIREMENT-V1`

기타 후속 후보:
- `.github/workflows/deploy-api.yml:100` 의 `pnpm --filter '@o4o/lms-marketing' run build` — 대상 패키지가 없어 no-op (빌드는 통과)
- `lms_marketing_*` · `content_bundle*` 테이블 잔존 여부 확인 및 정리 판단
- `packages/lms-core` `routes()` — 호출부 0인 미mount 코드
- `packages/lms-marketing/{dist,node_modules}` 로컬 잔재 (git 미추적)

---

## 9. WO §14 중지 조건 대조

| 조건 | 해당 |
|---|:---:|
| viewer 가 서비스별 계약에 강하게 결합 | ✖ |
| API 계약이 main-site 전용 | △ — 전용이 아니라 **이미 삭제됨** → `DEAD_FEATURE` 로 종료 (§4) |
| auth · CORS 변경이 광범위하게 필요 | ✖ (변경 0) |
| 데이터 모델 변경 필요 | ✖ (DB write 0) |
| 공통화가 오히려 복잡성 크게 증가 | ✖ (공통화 미수행) |
| UNKNOWN 해소 불가 | ✖ (UNKNOWN 0) |

---

## 10. 문서 정합

`문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건`

(선행 WO CHECK 는 기록물이므로 수정하지 않았다. §16-1 에 따라 `docs/checks/**` 는 정비 대상이 아니다.)
