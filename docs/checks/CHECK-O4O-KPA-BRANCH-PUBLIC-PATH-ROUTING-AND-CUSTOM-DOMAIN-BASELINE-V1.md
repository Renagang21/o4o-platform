# CHECK — KPA Branch 공용 공개 URL 경로 확정 + 자체 도메인 alias 유지

- **WO**: `WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1`
- **일자**: 2026-09-05
- **상태**: CLOSED (구현 · 배포 · 운영 smoke 완료)
- **commit**: `d6a736afa` (routing / base path) · `ebb70b990` (잘못된 slug 404 구분)

---

## 0. 결론

분회 서비스의 **기본 공개 URL 을 `https://kpa-society.co.kr/kpa/{branchSlug}` 로 확정**하고
운영에 반영했다. 자체 도메인은 같은 `organizationId` 를 가리키는 **선택형 alias** 구조로 그대로 유지한다.

```text
kpa-society.co.kr/kpa/{slug}   → branchSlug → kpa_organizations → organizationId
{분회 자체 도메인}/            → Host       → branch_domains    → 같은 organizationId
```

`/kpa` 는 **URL prefix 일 뿐 tenant 가 아니다.** 분회 식별은 slug 또는 Host 이며
`organizationId` 는 언제나 backend `resolveBranch` 가 확정한다.

---

## 1. 기존 routing 구조 (변경 전)

| 축 | 상태 |
|---|---|
| LB | `o4o-global-lb` (global external ALB, `EXTERNAL_MANAGED`) |
| `kpa-society.co.kr` / `www.kpa-society.co.kr` | hostRule → `path-matcher-kpa-society` |
| `path-matcher-kpa-society` | **pathRules 없음** — `defaultService: backend-kpa-society-web` 뿐 |
| `kpa-branch-web` (Cloud Run, asia-northeast3) | **LB 에 미연결** — `run.app` URL 로만 접근 가능 |
| `branch.kpa-society.co.kr` | DNS 미연결 (과거 CHECK 에서 `000` 으로 기록됨) |

즉 URL map 전체에 pathRule 이 **하나도 없는** 상태였고, `/kpa/*` 추가는 순수 additive 였다.

### 기존 route 충돌 census

`web-kpa-society` 가 이미 쓰고 있던 브라우저 `/kpa/*` 경로는 **legacy redirect 3개뿐**이다
(`WO-STORE-SLUG-UNIFICATION-V1`, `services/web-kpa-society/src/App.tsx:1099-1101`):

```text
/kpa/tablet/:slug                 → /tablet/:slug
/kpa/store/:slug/blog             → /store/:slug/blog
/kpa/store/:slug/blog/:postSlug   → /store/:slug/blog/:postSlug
```

그 외 소스의 `/kpa/...` 는 전부 **API 경로**(`/api/v1/kpa/**`)라 `api.neture.co.kr` 축이며
이번 hostRule 과 무관하다.

분회 slug 209개에 대해 `store` / `tablet` / `login` / `me` / `assets` 충돌 **0건**을 확인했다.

---

## 2. 변경한 routing

`path-matcher-kpa-society` 에 pathRules 2개를 **추가만** 했다 (defaultService 불변).

```yaml
- defaultService: .../backendServices/backend-kpa-society-web
  name: path-matcher-kpa-society
  pathRules:
  - paths: [/kpa/tablet/*, /kpa/store/*]     # legacy redirect 보존 (longest-match 우선)
    service: .../backend-kpa-society-web
  - paths: [/kpa, /kpa/*]
    service: .../backend-kpa-branch-web
```

신규 인프라 (기존 `backend-kpa-society-web` 스펙과 동일하게 맞춤):

| 리소스 | 값 |
|---|---|
| `neg-kpa-branch-web` | serverless NEG · asia-northeast3 · Cloud Run `kpa-branch-web` |
| `backend-kpa-branch-web` | global · `EXTERNAL_MANAGED` · HTTP · logging on (sampleRate 1.0) · CDN off |

**기존 KPA Society route 는 변경하지 않았고 분회 앱에 흡수하지도 않았다.**

---

## 3. web-kpa-branch base path 대응

### 조사 — root 배포 전제 코드

| 지점 | 판정 |
|---|---|
| 내부 이동 (`Link to` / `navigate()`) | react-router `basename` 이 흡수 → **수정 불필요** |
| vite asset base (`/assets/*`) | **문제** — 같은 host 의 default backend(web-kpa-society)로 새어 404 |
| `PLATFORM_HOSTS` | `branch.kpa-society.co.kr` 고정 → 새 host 에서 **자체 도메인으로 오판** |
| `serve -s dist` | SPA fallback 은 정상 (HTML 은 어떤 경로든 index.html) |

### 수정

| 파일 | 변경 |
|---|---|
| `vite.config.ts` | `base: '/kpa/'` — asset 이 `/kpa/assets/*` 로 발행 |
| `Dockerfile` (runner) | `dist` 를 `dist/kpa` 에도 복제 — 한 이미지가 공용 경로와 자체 도메인 root 를 모두 서빙 |
| `src/lib/tenant.tsx` | `PLATFORM_HOSTS` → `kpa-society.co.kr` / `www`, `PUBLIC_BASE_PATH='/kpa'`, `detectBasename()` 추가 |
| `src/App.tsx` | `BrowserRouter basename={detectBasename()}`, `/reset-password` route 추가 |
| `src/config/service.ts` | `BRAND.domain='kpa-society.co.kr'` + `basePath='/kpa'` |
| `src/layouts/BranchLayout.tsx` | `BRANCH_NOT_FOUND` 를 미게시와 구분해 404 렌더 (§7 참조) |

`detectBasename()` 은 **host + pathname 두 조건**을 함께 본다. 자체 도메인의 `/kpa` 경로를
공용 prefix 로 오인하지 않기 위해서다.

```text
kpa-society.co.kr/kpa/{slug}   → basename '/kpa'
{분회 자체 도메인}/{...}        → basename ''      (root)
kpa-branch-web-*.run.app/      → basename ''      (운영 smoke)
```

라우트 트리와 `basePath`(`/{slug}`)는 **그대로**다 — `/kpa` 는 basename 으로만 흡수된다.

---

## 4. tenant resolver 결과

`resolveBranch` (`apps/api-server/src/middleware/kpa-branch-scope.middleware.ts`) 를
**그대로 재사용**했다. 신규 인증/tenant 구조를 만들지 않았고 resolver 코드는 손대지 않았다.

```text
GET /api/v1/kpa-branch/branches/gangnamgu
  → 565733d0-be34-49df-a60e-fab05389e3ec  강남구약사회  resolvedBy=slug
GET /api/v1/kpa-branch/branches/namgu
  → ba1e90a6-ae34-46b7-8134-07669b51a2fa  남구약사회    resolvedBy=slug
GET /api/v1/kpa-branch/branches/nonexistent-branch-zzz
  → 404 BRANCH_NOT_FOUND
GET /api/v1/kpa-branch/branches/gangnamgu/site
  → 404 BRANCH_SITE_NOT_PUBLISHED   (분회는 존재 · 홈페이지 미게시)
```

A/B 혼선 0 — 두 slug 가 서로 다른 `organizationId` 로 수렴하고 posts 도 각자 반환한다.

---

## 5. custom-domain 유지 구조 / canonical URL 정책

기존 3축(`branch_domains` · `findBranchByHostname` · `organizationId`)을 **변경 없이 유지**했다.
이번 WO 에서 실제 분회 도메인은 등록하지 않았다.

**primary 선택 가능 여부 — 데이터 구조상 이미 가능하다.**

| 근거 | 위치 |
|---|---|
| `branch_domains.is_primary boolean` | `routes/kpa-branch/entities/branch-domain.entity.ts` |
| 분회당 primary 1개 강제 (partial unique index) | `UQ_branch_domains_primary ON (organization_id) WHERE is_primary = true` |
| primary 전환 트랜잭션 (기존 primary 를 먼저 내림) | `BranchDomainController.adminSetStatus` |

따라서 canonical 정책은 다음과 같이 성립한다.

```text
active primary 도메인 없음  → primary = kpa-society.co.kr/kpa/{slug}   (현재 전 분회)
active primary 도메인 있음  → primary = 그 custom domain               (전환 가능)
```

301 redirect 정책은 이번 WO 범위에서 구현하지 않았다 (WO 명시). **후속 필요 항목**:
canonical 계산 helper(서버측 단일 지점) + canonical link 태그 + primary 전환 시 redirect.

---

## 6. auth / reset URL 수정

`branch.kpa-society.co.kr` 잔여 census 와 처리:

| 지점 | 처리 |
|---|---|
| `config/service-catalog.ts` — kpa-branch `domain` | `kpa-society.co.kr` + **신규 optional `basePath: '/kpa'`** |
| `config/service-catalog.ts` — `getServiceOrigin()` | `https://{domain}{basePath}` 반환 |
| `bootstrap/setup-middlewares.ts` — CORS allowlist | `https://branch.kpa-society.co.kr` **제거**. `https://kpa-society.co.kr` / `www` 가 이미 등록돼 있어 추가 항목 불필요 (origin 은 host 축이라 basePath 무관) |
| `modules/auth/controllers/handoff.controller.ts` | `targetUrl` 을 `getServiceOrigin()` 기반으로 변경 |
| `routes/kpa-branch/kpa-branch.routes.ts` — `/service-info` | `basePath` 를 함께 반환 |
| `services/web-kpa-branch/src/config/service.ts` · `src/lib/tenant.tsx` | 새 host + basePath 로 교체 |

**branchSlug 가 필요한 위치와 공용 fallback 의 구분:**

재설정 토큰은 **사용자 계정**에 묶이고 분회 소속은 로그인 후 `branch_memberships` 가 판정한다.
따라서 재설정 링크는 branchSlug 를 요구하지 않는 **공용 fallback 계층**(`/login` · `/me` 와 동급)이다.

```text
링크: https://kpa-society.co.kr/kpa/reset-password?token=...
```

이 경로가 실제로 착지하도록 `web-kpa-branch` 에 `ResetPasswordPage` 를 추가했다.
`serviceKey='kpa-branch'` 를 함께 전송해 다른 서비스 토큰 재사용을 막는다
(`WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1` 계약 유지).

운영 확인:

```text
GET /api/v1/kpa-branch/service-info
  → { domain: "kpa-society.co.kr", basePath: "/kpa", ... }
```

**소스 잔류 0** — `branch.kpa-society.co.kr` 는 이제 `docs/checks/**`(과거 기록물)에만 남는다.

---

## 7. browser smoke (production, Playwright chromium)

| 경로 | HTTP | 렌더 | console error |
|---|:---:|---|:---:|
| `/kpa` | 200 | 분회 찾기 (209개 목록) | 0 |
| `/kpa/gangnamgu` | 200 | 분회 셸 + 미게시 안내 | 0* |
| `/kpa/gangnamgu/notices` | 200 | 공지 (등록된 글 없음) | 0* |
| `/kpa/gangnamgu/resources` | 200 | 자료실 | 0* |
| `/kpa/gangnamgu/mypage/annual-report` | 200 | 신상신고 | — |
| `/kpa/gangnamgu/operator/site` · `/operator/posts` · `/operator/domains` | 200 | 운영자 화면 | — |
| `/kpa/namgu` · `/kpa/namgu/notices` | 200 | 분회 B (A 와 혼선 0) | 0* |
| `/kpa/login` | 200 | 분회 로그인 폼 | 0 |
| `/kpa/reset-password?token=...` | 200 | 재설정 폼 + 정책 체크리스트 | 0 |
| `/kpa/nonexistent-branch-zzz` | 200 | **"페이지를 찾을 수 없습니다"** (셸 없음) | — |

\* `BRANCH_SITE_NOT_PUBLISHED` 로 인한 API 404 뿐이다. **routing / asset 오류 0, requestfailed 0.**
분회 홈페이지가 아직 게시되지 않은 정상 상태이며 이번 변경과 무관하다.

- deep link / refresh: 위 경로 전부 **직접 진입(cold load)** 으로 실행했다 — SPA 내부 이동이 아니다.
- asset: `/kpa/assets/index-*.js` → `200 application/javascript`, `*.css` → `200 text/css`
- `www.kpa-society.co.kr/kpa/namgu` 도 동일하게 분회 앱

### 잘못된 slug 404 — 발견 및 수정 (`ebb70b990`)

1차 smoke 에서 `/kpa/{없는 slug}` 가 **유효 분회와 똑같은 셸 + "아직 공개되지 않은 분회
홈페이지입니다."** 로 렌더돼 404 와 구분되지 않았다. backend 는 이미 두 상황을 다른 code 로
구분하고 있었으나 `BranchLayout` 이 status 404 만 보고 뭉갰다. code 기반 분기로 수정했다.

```text
BRANCH_NOT_FOUND          slug 자체가 없다      → 404 화면 (셸 없음)
BRANCH_SITE_NOT_PUBLISHED 분회는 있고 미게시다  → 셸 + 안내 (기존 동작 유지)
```

---

## 8. KPA Society 회귀

전 경로 200 + `<title>KPA Society …</title>` 유지 (분회 앱으로 새지 않음):

```text
/  /login  /store  /tablet  /forum  /lecture  /mypage  /operator  /admin  /reset-password
```

legacy `/kpa/*` redirect 보존 확인:

```text
/kpa/store/foo/blog → KPA Society   (분회 앱 아님)
/kpa/tablet/foo     → KPA Society   (분회 앱 아님)
```

---

## 9. 검증 명세 대조 (WO §8)

| 항목 | 결과 |
|---|:---:|
| 최소 2개 분회 slug (`gangnamgu` / `namgu`) home 200 | ✅ |
| notices 200 | ✅ |
| login 200 | ✅ |
| deep link refresh 정상 | ✅ |
| 잘못된 slug 404 | ✅ (`ebb70b990` 으로 확보) |
| A/B tenant 혼선 0 | ✅ |
| `/kpa/*` 외 기존 KPA Society 주요 route 회귀 0 | ✅ |
| web-kpa-branch console error 0 | ✅ (미게시 API 404 제외) |
| API tenant boundary 유지 | ✅ (resolver 무변경) |
| 기존 custom-domain resolver 회귀 0 | ✅ (`findBranchByHostname` 무변경, 미등록 host → 404) |
| password reset URL `branch.kpa-society.co.kr` 잔류 0 | ✅ (소스 0건) |

---

## 10. 미해결 · 후속

| # | 항목 | 비고 |
|---|---|---|
| 1 | **custom-domain onboarding 운영 흐름** | 다음 WO. `branch_domains` 등록 → DNS TXT 검증 → LB 인증서 / hostRule → primary 전환 |
| 2 | CORS 동적 origin | 209개 분회 자체 도메인은 정적 allowlist 로 확장 불가 — `branch_domains(status='active')` 기반 동적 판정 필요 (기존 코멘트에 이미 명시) |
| 3 | canonical link 태그 + primary 전환 시 301 | 데이터 구조는 준비됨(§5), 정책 미구현 |
| 4 | `platform_services` row 의 `entry_url` | `20270305000000-SeedKpaBranchServiceAndRoles` 가 `https://branch.kpa-society.co.kr` 로 seed 했다. **DB 데이터 변경이라 이번 WO 범위 밖**(CLAUDE.md 중지 조건 — migration / 데이터 변경). URL 생성 경로는 `service-catalog` SSOT 를 쓰므로 **운영 영향 없음**. 정리는 별도 WO |
| 5 | 분회 홈페이지 미게시 | 209개 분회 전부 `branch_sites` 미게시 상태 — 운영 데이터 이슈이며 routing 과 무관 |

**슬러그 예약어**: `/kpa/tablet/*` · `/kpa/store/*` 는 legacy redirect 로 예약됐다.
분회 slug 로 `tablet` / `store` 를 발급하면 안 된다 (현재 209개 중 충돌 0).

---

## 11. 문서 정합

```text
문서 정합: 발견 4건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

- 발견 4건은 전부 `docs/checks/**` (`CHECK-O4O-KPA-BRANCH-DEPLOY-AND-RUNTIME-SMOKE-V1`,
  `CHECK-O4O-KPA-BRANCH-SERVICE-CREDENTIAL-ONBOARDING-V1`,
  `CHECK-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1`,
  `WO-O4O-MAIN-SITE-RUNTIME-CONTRACT-AUDIT-AND-DECOMMISSION-DECISION-V1-CHECK`)
  의 `branch.kpa-society.co.kr` 언급이다.
  **CLAUDE.md §16-1 에 따라 기록물은 정비 대상이 아니다** — 손대지 않았다.
- `docs/baseline/**` · `docs/architecture/**` 에는 분회 도메인 참조가 없어 SUPERSEDED 표기 대상 0건.
- 별도 WO 제안 1건: 위 §10-4 (`platform_services.entry_url` 정리).

---

## 12. 중지 조건 판단 (WO §9)

**중지하지 않고 진행했다.** 근거:

- URL map 에 pathRule 이 하나도 없어 `/kpa/*` 추가가 순수 additive 였다 (defaultService 불변).
- DNS / SSL / LB 는 전부 동일 프로젝트(`netureyoutube`) 소유이며 `kpa-society.co.kr` 은
  이미 같은 LB 의 hostRule 에 등록돼 있었다 — ownership 불명확 없음.
- 기존 `/kpa/*` 소비는 legacy redirect 3개로 한정되며 longest-match pathRule 로 보존했다.

DB 변경 · migration · dependency · CI 인프라 변경은 하지 않았다.

---

## 13. CI 상태

`CI Pipeline` 의 `Code Quality Check`(ESLint regression ratchet)는 **이번 변경 이전부터 red** 다.

```text
89332f865 (직전 커밋, 이번 WO 이전) : Code Quality Check FAILURE
d6a736afa (이번 WO)                 : Code Quality Check FAILURE — 동일 job
ESLint: 57 errors (baseline 55)
```

신규 오류로 열거된 파일은 `apps/admin-dashboard/src/pages/cpt-engine/**`,
`apps/admin-dashboard/src/services/ai/reference-fetcher.service.ts`,
`apps/api-server/src/__tests__/**` 로 **이번 WO 가 만진 파일이 아니다**.
현재 변경과 무관한 선행 실패이므로 이번 WO 에서 손대지 않았다 (CLAUDE.md 중지 조건).

`Deploy API Server` / `Deploy Web Services` 는 두 커밋 모두 success.
