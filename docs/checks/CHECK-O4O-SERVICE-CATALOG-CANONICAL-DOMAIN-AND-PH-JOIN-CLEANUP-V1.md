# CHECK-O4O-SERVICE-CATALOG-CANONICAL-DOMAIN-AND-PH-JOIN-CLEANUP-V1

> **WO**: WO-O4O-SERVICE-CATALOG-CANONICAL-DOMAIN-AND-PH-JOIN-CLEANUP-V1
> **선행**: [IR-O4O-NETURE-HOME-CURRENT-STATE-AND-IA-REDESIGN-V1](../investigations/IR-O4O-NETURE-HOME-CURRENT-STATE-AND-IA-REDESIGN-V1.md) L2 · [CHECK-O4O-NETURE-HOME-ENTRY-REFRESH-V1](CHECK-O4O-NETURE-HOME-ENTRY-REFRESH-V1.md)
> **작성일**: 2026-09-28
> **판정**: **CODE_COMPLETE · PRODUCTION_SMOKE_PENDING_DEPLOY** (`DEPLOY_ENABLED=false` — 이번 WO 는 게이트를 열지 않았다)

---

## 0. 요약

| 항목 | 결과 |
|---|---|
| 약국 canonical | `kpa-society` : `kpa-society.co.kr` → **`pharmacy.neture.co.kr`** |
| 리테일 canonical | `k-cosmetics` : `k-cosmetics.site` → **`retail.neture.co.kr`** |
| PharmacyHub 신규 가입 노출 | `joinEnabled` true → **false** (catalog · 도메인 · membership · route 불변) |
| kpa-branch | **DEFERRED** (§6) |
| 옛 호스트 | 삭제 0 · DNS/LB/redirect 변경 0 · catalog `legacyDomains` 로 **수용 전용** 등록 |
| DB write / migration | 0 / 0 |
| 배포 | 0 (`DEPLOY_ENABLED=false`) |

원칙 — **Generation ≠ Compatibility**

```text
Generation     (handoff targetUrl · QR · 공개 랜딩 · 가입 안내)  → catalog `domain` = canonical 만
Compatibility  (인쇄 QR · 북마크 · 외부 링크로 들어온 요청)        → 옛 호스트 계속 서빙 + 서비스 판정 유지
```

---

## 1. Fresh Census (origin/main `a20cf16ec` 기준)

코드 · 설정 전수(`docs/` · `*.md` 제외) 57파일. docs 는 323파일(기록물 · 판정 대상 아님, G/I).

### 1-1. 사전 실측 — 호스트 서빙 상태 (curl, 변경 전)

| 경로 | kpa-society.co.kr | pharmacy.neture.co.kr | k-cosmetics.site | retail.neture.co.kr |
|---|---|---|---|---|
| `/` · `/qr/:slug` · `/multilingual-products/:k` · `/foreign-visitor/affiliate/:c` · `/handoff` · `/store/workspace` | 200 KPA 앱 | 200 **같은 KPA 앱** | 200 KCos 앱 | 200 **같은 KCos 앱** |
| `/kpa/` | 200 **분회 앱** | 200 KPA 앱 (분회 아님) | — | — |

→ 옛 · 새 호스트가 **동시에 같은 앱을 서빙**(301 없음). 생성 호스트만 옮기면 되고, 옛 호스트 수용은 인프라 그대로 유지된다.
→ `pharmacy.neture.co.kr/kpa` 는 분회 앱이 아니다 → kpa-branch 는 옮기면 안 된다(§6).

### 1-2. 분류 · 판정

| 범주 | 위치 | 판정 |
|---|---|---|
| **A** catalog / handoff | `config/service-catalog.ts` (kpa-society · k-cosmetics domain) | **CHANGE** |
| A | `service-catalog.ts` pharmacy-hub domain · kpa-branch domain+basePath | KEEP (PH 새 호스트 미정 · kpa-branch DEFERRED) |
| A | `handoff.controller.ts:354` 주석 (kpa-branch) | UNRELATED (kpa-branch) |
| **B** session-origin / auth | `utils/session-origin.ts` — catalog `domain` 단일 매칭 | **CHANGE** (legacy 수용 추가) |
| B | `bootstrap/setup-middlewares.ts` CORS — 옛 · 새 origin 이미 모두 등록 | KEEP_LEGACY_COMPAT (변경 불필요) |
| B | `utils/cookie.utils.ts` `.kpa-society.co.kr` · `.k-cosmetics.site` (새 호스트는 `.neture.co.kr` 로 이미 커버) | KEEP_LEGACY_COMPAT |
| **D** QR / public URL 생성 | catalog 파생 5곳(`store-screen-set-qr` · `store-pop-v2` · `store-qr-landing` · `multilingual-product-content` · `foreign-visitor-partner-qr-code`) | catalog 변경으로 자동 canonical. **도달 불가 fallback 리터럴만 CHANGE** |
| D | `PharmacyHubStoreQrController` · `pharmacy-hub.routes` (`pharmacyhub.co.kr`) | KEEP (PH 도메인 불변) |
| C/D | `services/web-store/src/lib/serviceContext.ts` `SERVICE_PUBLIC_ORIGIN` (서버 QR 호스트 mirror) | **CHANGE** (kpa-society · k-cosmetics) |
| **E** CI / env | `deploy-web-services.yml` `VITE_SERVICE_URL_KPA_SOCIETY` · `_K_COSMETICS` | **CHANGE** (§10) |
| E | Dockerfile `ARG VITE_SERVICE_URL` 기본값(kpa-society · k-cosmetics · pharmacy-hub · kpa-branch) | KEEP — CI 가 build-arg 로 덮어씀 · 소스 소비처 0 (§10) |
| **F** test | `service-public-origin-qr-hosts.spec` · `representative-entry-return-handoff.spec:192` | **TEST_EXPECTATION** (생성 검증 → canonical) |
| F | `service-logout-auth-boundary.spec` · `unified-store-workspace-handoff.spec` · `representative-entry-return-handoff.spec` 나머지 (`https://kpa-society.co.kr` 를 **요청 origin** 으로 사용) | KEEP — **legacy 수용 검증**으로 그대로 통과 |
| F | `kpa-branch-host-kpa-neture.spec` · `pharmacy-hub-lms-*` · `HomeEntryPanel.back-navigation.test` (fixture) · `storeWorkspace.test` (mock) · `getUserDisplayName.test` (이메일) | UNRELATED / TEST fixture |
| **H** 옛 호스트 호환 | `services/web-kpa-branch/*` (PLATFORM_HOSTS · `/kpa` base) · `services/web-neture/src/pages/O4OHomePage.tsx` 주석 · entry-pills test (옛 호스트 금지 검증) | KEEP_LEGACY_COMPAT |
| C 프런트 표시 | `apps/admin-dashboard/.../StoreQrGuidePage.tsx` 안내 URL 3건 | 잔여 R2 (필수 아님) |
| C | `packages/shared-space-ui/src/O4OHelpSection.tsx` · `guide/copy/neture.ts` | WO §15 — **수정 금지**(별도 shared module WO) |
| C | `services/web-k-cosmetics` Footer · ContactPage (이메일 주소) | UNRELATED (메일 도메인) |
| C | `services/web-kpa-society` `index.html` · `sitemap.xml` · `robots.txt` (SEO canonical) | 잔여 R3 (SEO 정책 별도) |
| C | `services/web-pharmacy-hub/*` (주석 · config) | KEEP (PH 도메인 불변) |
| tooling | `tools/o4o-local-agent/src/local-server.mjs` pairing ALLOWED_ORIGINS (새 호스트 없음) | 잔여 R4 (보안 allowlist · 별도 판단) |
| I | migrations(seed) · `scripts/dev/*` · `scripts/e2e/*` · `e2e/**` · `scripts/verify/*` | UNRELATED (기록 · 수동 도구) |

전역 search-and-replace 는 쓰지 않았다. 변경은 위 CHANGE 행뿐이다.

---

## 2. 변경한 catalog 항목

```text
kpa-society   domain  kpa-society.co.kr → pharmacy.neture.co.kr   legacyDomains ['kpa-society.co.kr']
k-cosmetics   domain  k-cosmetics.site  → retail.neture.co.kr     legacyDomains ['k-cosmetics.site']
pharmacy-hub  joinEnabled true → false  (domain · workspace · 나머지 불변)
kpa-branch    변경 없음 (DEFERRED 주석만)
```

신규 필드 `legacyDomains?: readonly string[]` — **수용 전용**. `getServiceOrigin` · `getServicePublicOrigin` · `getServiceOrigins` 는 `domain` 만 본다(생성 경로에 옛 호스트가 섞이지 않음). 읽는 곳은 `session-origin` 하나다.

## 3. kpa-society

old `https://kpa-society.co.kr` → canonical `https://pharmacy.neture.co.kr`. 로그인 전 대표 홈 pill(`O4OHomePage` · `hostProfile`)과 동일 호스트.

## 4. k-cosmetics

old `https://k-cosmetics.site` → canonical `https://retail.neture.co.kr`. 로그인 전 대표 홈 pill 과 동일 호스트. `neture-dashboard.service` 의 K-Cosmetics 링크도 catalog 파생이라 함께 정렬된다.

## 5. PharmacyHub 신규 가입 노출

- `joinEnabled=false` 만으로 충분함을 코드로 확인:
  - 대표 홈 「가입 가능한 서비스」: `home-entry.ts` 가 `svc.joinEnabled` 로 거른다 → PH 비노출.
  - 범용 `POST /auth/services/pharmacy-hub/join` → `JOIN_DISABLED`.
  - `getJoinableServices()` 에서 제외.
- **기존 회원 접근 차단 없음** (중지 조건 5 해당 없음):
  - handoff 발급은 `service_memberships.status='active'` 로만 판정 — `joinEnabled` 를 보지 않는다.
  - PH 자체 route(`/api/v1/pharmacy-hub/*` · `/join` · `/join/status`)는 catalog `joinEnabled` 를 보지 않는다 → 삭제 · 변경 0.
  - 대표 홈 상태 안내(pending · rejected 의 「다시 신청하기」)는 `joinEnabled` 와 무관 — 기존 신청자 안내 유지.
- `/pharmacy-hub/service-info` 의 `joinEnabled` 값은 false 로 바뀌지만 프런트 소비처 0 (web-pharmacy-hub 가 읽지 않음).
- 잔여 R1: PharmacyHub 앱 **내부**의 「가입 신청」 버튼 · `/join` 화면은 이번 WO 범위(O4O 대표 진입의 신규 가입 노출) 밖이며 route 삭제 금지 조항에 따라 그대로 두었다.

## 6. kpa-branch — **DEFERRED**

- catalog: `domain=kpa-society.co.kr` + `basePath=/kpa` 그대로.
- 근거: `pharmacy.neture.co.kr/kpa/` 는 분회 앱이 아니라 KPA 앱을 서빙(§1-1). 목표 `kpa.neture.co.kr/{분회}` 는 basePath 가 없는 구조라 handoff base URL · 분회 slug 해석(`web-kpa-branch/src/lib/tenant.tsx`) · `/kpa` asset base 를 함께 바꿔야 한다 → 기계적 치환 불가.
- 부수 효과 점검: kpa-society 와 kpa-branch 가 같은 `kpa-society.co.kr` 을 공유하게 됐다(kpa-society 는 legacy, kpa-branch 는 domain). session-origin 은 catalog 순서 1회 순회라 `kpa-society.co.kr → kpa-society` (종전과 동일)가 유지되며 테스트로 고정했다.

## 7. session-origin 영향

| origin | 변경 전 | 변경 후 |
|---|---|---|
| `https://pharmacy.neture.co.kr` | **null** (세션 귀속 없음 — 잠재 결함) | `kpa-society` |
| `https://retail.neture.co.kr` | **null** | `k-cosmetics` |
| `https://kpa-society.co.kr` | `kpa-society` | `kpa-society` (legacy 수용) |
| `https://k-cosmetics.site` | `k-cosmetics` | `k-cosmetics` (legacy 수용) |
| `https://pharmacyhub.co.kr` | `pharmacy-hub` | 동일 |
| `www.kpa-society.co.kr` · `www.k-cosmetics.site` | null | null (종전과 동일 — 범위 밖) |

- 소비처: Google login/signup `sessionServiceKey` · 서비스 단위 logout. 새 호스트에서 로그인한 세션이 이제 올바른 서비스로 귀속된다.
- Google OAuth 승인 origin 은 WO 전제(완료)를 따랐고 코드상 추가 allowlist 는 없다. CORS 는 새 · 옛 origin 모두 이미 등록돼 있다.

## 8. handoff 영향

- `POST /auth/handoff` targetUrl: `https://pharmacy.neture.co.kr/handoff?token=…` · `https://retail.neture.co.kr/handoff?token=…`. 두 호스트의 `/handoff` 가 해당 앱을 서빙함을 실측(§1-1).
- exchange 는 origin 을 서비스 판정에 쓰지 않는다(토큰 claim 기준). store workspace · 대표 진입 origin 고정 로직 불변.
- 쿠키: 새 호스트는 `.neture.co.kr` 도메인 쿠키 — 대표 홈과 같은 스코프. 옛 호스트는 기존 쿠키 도메인 유지.
- `/auth/services` 응답의 `domain` 이 canonical 로 바뀌어 대표 홈 「가입 가능한 서비스」 링크 = `https://pharmacy.neture.co.kr/register` · `https://retail.neture.co.kr/register`.

## 9. QR / public URL 영향

- 모든 서버 QR · 랜딩 URL 은 **요청 시 동적 생성**(DB 에 URL 저장 없음 — slug · publicKey · shortCode 만 저장). 배포 후 새로 렌더되는 QR 이미지 · 복사 URL 은 canonical 호스트.
- 이미 인쇄된 QR(`kpa-society.co.kr/qr/…` 등): 옛 호스트가 그대로 서빙 · 공개 QR 랜딩은 slug 로만 해석(호스트 검사 없음) → **계속 동작**. 중지 조건 1 해당 없음.
- fallback 리터럴(카탈로그 조회 실패 시, 현재 도달 불가) 5곳도 `pharmacy.neture.co.kr` 로 정렬. `store-qr-landing.controller.ts` 는 기존 정규식의 제어문자 2개를 포함한 파일이라 node 로 정확 치환하고 제어문자 수 불변을 검증했다.
- web-store `SERVICE_PUBLIC_ORIGIN`(QR 복사 · 미리보기 · 공개 경로 redirect) 도 서버와 같은 canonical 로 정렬.

## 10. legacy domain compatibility 보존 방식

| 층 | 방식 |
|---|---|
| DNS · LB · 인증서 · redirect | 변경 0 |
| CORS | 옛 origin 목록 유지(변경 0) |
| 쿠키 도메인 | 옛 도메인 유지(변경 0) |
| 세션 판정 | catalog `legacyDomains` → session-origin |
| QR 랜딩 | slug 기반 · 호스트 무관 |
| 분회 공용 경로 | `kpa-society.co.kr/kpa/{slug}` 그대로 (kpa-branch DEFERRED) |

## 11. CI / env

- `deploy-web-services.yml`: `VITE_SERVICE_URL_KPA_SOCIETY` → `https://pharmacy.neture.co.kr`, `VITE_SERVICE_URL_K_COSMETICS` → `https://retail.neture.co.kr` ("service-catalog mirror" 주석 계약).
- 실측: 프런트 소스에 `VITE_SERVICE_URL` 소비처 0 → 런타임 영향 없음(정합성 정렬만).
- Dockerfile `ARG` 기본값은 CI build-arg 가 덮어쓰므로 변경하지 않음.
- OAuth · DB secret · approval · `DEPLOY_ENABLED` 무변경. 워크플로 파일 수정으로 push 시 web 배포 workflow 가 트리거되지만 게이트가 false 라 `deploy-hold-notice` 만 실행된다(배포 0).

## 12. 변경 파일

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/config/service-catalog.ts` | canonical domain 2 · `legacyDomains` 필드 · PH joinEnabled=false · kpa-branch DEFERRED 주석 |
| `apps/api-server/src/utils/session-origin.ts` | domain + legacyDomains 판정 |
| `apps/api-server/src/routes/platform/store-screen-set-qr.service.ts` | fallback 리터럴 |
| `apps/api-server/src/routes/o4o-store/controllers/store-pop-v2.controller.ts` | fallback 리터럴 |
| `apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts` | fallback 리터럴 + 주석 |
| `apps/api-server/src/routes/o4o-store/controllers/multilingual-product-content.controller.ts` | fallback 리터럴 |
| `apps/api-server/src/modules/foreign-visitor-partner/foreign-visitor-partner-qr-code.service.ts` | fallback 리터럴 |
| `services/web-store/src/lib/serviceContext.ts` | `SERVICE_PUBLIC_ORIGIN` canonical |
| `.github/workflows/deploy-web-services.yml` | `VITE_SERVICE_URL_*` 2줄 |
| `apps/api-server/src/__tests__/service-public-origin-qr-hosts.spec.ts` | 생성 기대값 → canonical |
| `apps/api-server/src/__tests__/representative-entry-return-handoff.spec.ts` | handoff targetUrl 기대값 → canonical |
| `apps/api-server/src/config/__tests__/service-catalog.canonical-domain.test.ts` | **신규** 회귀 |
| `services/web-neture/src/lib/__tests__/home-entry.catalog-canonical.test.ts` | **신규** 회귀 |

## 13. 테스트

| WO §17 항목 | 검증 | 결과 |
|---|---|---|
| 1 · 2 catalog canonical | `service-catalog.canonical-domain.test` | PASS |
| 3 PH 가입 가능 제외 | 同 + `home-entry.catalog-canonical.test` | PASS |
| 4 PH membership · route 보존 | 同(catalog · handoff origin · workspace) · `representative-entry-return-handoff`(PH target membership 판정 불변) · PH 관련 spec | PASS |
| 5 `/auth/services` 정합 | 응답 = `O4O_SERVICES` 직접 매핑 — catalog 테스트 + 프런트 모델 테스트 | PASS |
| 6 handoff origin | `representative-entry-return-handoff` (targetUrl canonical) | PASS |
| 7 session-origin 신규 | `service-catalog.canonical-domain.test` | PASS |
| 8 legacy 호환 | 同 + `service-logout-auth-boundary` · `unified-store-workspace-handoff` (옛 origin 입력 무수정 통과) | PASS |
| 9 QR 생성 canonical | `service-public-origin-qr-hosts` · Screen Set QR 케이스 | PASS |
| 10 기존 QR 수용 | 코드 확인(slug 해석 · 호스트 무관) + 옛 호스트 `/qr/*` 200 실측 | PASS (정적+실측) |
| 11 web-neture | vitest home-entry · HomeEntryPanel · pages (13 files / 95 tests + 신규 4) | PASS |
| 12 API | 관련 18 suites / 297 · `--findRelatedTests` 39 suites / 604 · 정적 계약 10 suites / 175 | PASS |
| — | `scripts/ci/__tests__/detect-affected.test.mjs` | PASS |

## 14. typecheck / build / lint

- `apps/api-server` `tsc --noEmit`: 0 error. (첫 실행 시 `ServiceKey` 3건은 로컬 `@o4o/security-core` dist 가 낡아서였고, 패키지 재빌드 후 0 — 변경 파일과 무관)
- `services/web-store` · `services/web-neture` `tsc --noEmit`: 0 error.
- `services/web-store` `vite build`: 성공.
- `node scripts/lint-ratchet.mjs`: 46 errors = baseline 46 (회귀 0). `store-qr-landing.controller.ts` 의 `no-control-regex` 1건은 origin/main 에 이미 있는 기존 error.

## 15. local / browser smoke

- **미실행.** 대표 홈 로그인 후 영역은 운영 API(`/auth/services`)를 호출하는데 운영 API 는 아직 옛 catalog 이고, 로컬 API 는 운영 DB 연결이 필요하다. 대신 같은 모델 함수(`buildHomeEntryModel`)에 새 catalog 응답 모양을 넣어 링크 · 노출을 검증했다(§13).
- 호스트 서빙 실측(§1-1)으로 canonical 호스트의 `/handoff` · `/register` 대상 앱 · QR 경로가 동작함을 확인했다.

## 16. production smoke / 배포 대기

- `DEPLOY_ENABLED=false` (2026-09-28 기준). 이번 WO 는 게이트를 열지 않았다 → **PRODUCTION_SMOKE_PENDING_DEPLOY**.
- 배포 순서: API(`o4o-core-api`) 반영이 본질이다(catalog · session-origin · QR). web-store 는 복사 URL mirror 만 바뀌므로 API 이후 어느 시점이든 무방.
- 배포 후 확인 항목:
  1. Neture 로그인 → 내 서비스 → 약국 → `pharmacy.neture.co.kr/handoff?token=…` → 로그인 상태 도착
  2. 같은 흐름 리테일 → `retail.neture.co.kr`
  3. 가입 가능한 서비스에 파머시 허브 없음 · 약국/리테일 링크가 canonical
  4. `pharmacy.neture.co.kr` 에서 Google 로그인 → 로그아웃이 KPA 세션만 폐기
  5. 매장 QR 관리 화면의 새 QR URL 호스트 = canonical · 옛 인쇄 QR(`kpa-society.co.kr/qr/…`) 정상 랜딩

## 17. PENDING_USER_VERIFICATION

**예** — 위 §16 1·2·4 는 KPA · KCos active membership 을 가진 실제 계정이 필요하다. 계정 생성 · DB 수정은 하지 않았다.

## 18. 잔여 작업

| # | 항목 | 성격 |
|---|---|---|
| R0 | 배포 후 §16 production smoke | 배포 게이트 대기 |
| R1 | PharmacyHub 앱 내부 「가입 신청」 · `/join` 노출 정책 | 사업 판단 · 별도 WO |
| R2 | admin-dashboard `StoreQrGuidePage` 안내 URL canonical 정렬 | 소규모 별도 |
| R3 | web-kpa-society SEO canonical(`index.html` · sitemap · robots) | SEO 정책 별도 |
| R4 | o4o-local-agent pairing `ALLOWED_ORIGINS` 에 새 호스트 부재 | 보안 allowlist 별도 판단 |
| R5 | kpa-branch → `kpa.neture.co.kr/{분회}` 전환 | DEFERRED (§6) |
| R6 | `platform_services.entry_url` (DB, 관리자 편집 값) — 런타임 미소비 | DB write 필요 · 별도 |
| R7 | `www.*` 옛 호스트의 세션 판정(null, 종전과 동일) | 필요 시 별도 |
| — | WO §13~16 (`/register` 루프 · 체험 계정 배너 · O4OHelpSection · Funding draft) | 지시대로 미접촉 |

## 19. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — IR §7 catalog 표는 기록물이라 갱신 대상 아님(이 CHECK 가 후속 상태를 기록).
