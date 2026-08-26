# CHECK-O4O-SIGNAGE-PLAYER-WEB-DEPLOYMENT-ADOPTION-AND-PRODUCTION-SMOKE-V1

- WO: `WO-O4O-SIGNAGE-PLAYER-WEB-DEPLOYMENT-ADOPTION-AND-PRODUCTION-SMOKE-V1`
- base: `origin/main` (`c2287c7e4` 위로 rebase) → 코드 commit `a27e10494`
- worktree: clean (다른 세션 WIP 미접촉 · `git add .` 미사용 · path-specific stage)
- 결론: **A. INDEPENDENT_WEB_SERVICE 채택 · 배포 완료**
  - `RUNTIME_DEPLOYMENT = PASS`
  - `REAL_CHANNEL_E2E = BLOCKED_NO_DATA` (`BLOCKED_NO_PRODUCTION_CHANNEL_ROW`)

---

## §1. 시작 상태 — "소스는 있는데 배포 축에 없음"

| 축 | 작업 전 상태 |
|---|---|
| 소스 `services/signage-player-web/` | 존재 (React 19 + Vite SPA · Dockerfile · nginx.conf) |
| `pnpm-workspace.yaml` | 포함 (`services/*` glob) |
| CI type-check | 포함 (`scripts/dev.mjs` 의 `discoverWorkspaces('services')` 자동 탐색) |
| GitHub Actions 배포 | **없음** |
| Cloud Run 서비스 | **없음** |
| IaC / terraform / docker-compose | **참조 0** |

---

## §2. 배포 흔적 전수 조사 (§4 — UNKNOWN 0)

`gcloud run services list --project=netureyoutube` (전 region) = 10개.

| Cloud Run 서비스 | 분류 |
|---|---|
| `neture-web` · `glycopharm-web` · `kpa-society-web` · `k-cosmetics-web` · `pharmacy-hub-web` · `kpa-branch-web` | ACTIVE (`deploy-web-services.yml` 관리) |
| `o4o-core-api` | ACTIVE (`deploy-api.yml`) |
| `o4o-admin-dashboard` | ACTIVE (`deploy-admin.yml`) |
| `o4o-admin-dashboard-dev` | ACTIVE (dev 축) |
| `glucoseview-web` | **PARTIAL** — 배포돼 있으나 `deploy-web-services.yml` 에 job 이 없다(수동 생성 선례). 본 WO 범위 밖 |
| `signage-player-web` | 작업 전 **UNUSED(미배포)** → 작업 후 **ACTIVE** |

파일 축:

| 항목 | 작업 전 분류 | 근거 |
|---|---|---|
| `.github/workflows/deploy-web-services.yml` | UNUSED (player 미포함) | path trigger · detect-changes · job 3곳 모두 부재 |
| `.github/workflows/deploy-api.yml` · `deploy-admin.yml` | UNUSED | player 참조 0 |
| `ci-pipeline.yml` type-check | **ACTIVE** | `discoverWorkspaces('services')` 로 자동 포함 |
| `infra/` (artifact-registry cleanup-policy) | UNUSED | signage 참조 0 |
| terraform / docker-compose | **부재** | 저장소에 없음 |
| `services/signage-player-web/Dockerfile` | **STALE** | 빌드 자체가 실패했다(§4) — 배포/CI 에서 한 번도 실행된 적 없음의 증거 |
| `services/signage-player-web/nginx.conf` | **STALE** | `listen 80` — Cloud Run(`--port=8080`) 에서 기동 불가 |
| `services/signage-player-web/.env.example` | ACTIVE | `VITE_API_URL` 1개, secret 0 |
| `CHECK-O4O-CLOUD-RUN-INGRESS-LOAD-BALANCER-ONLY-V1.md:167` | **STALE(부정확)** | `signage-player-web` 을 "기존 서비스" 로 열거했으나 실제로는 존재하지 않았다 |
| CORS allowlist 의 `https://signage.neture.co.kr` | **STALE** | 등록돼 있으나 DNS NXDOMAIN |

**UNKNOWN = 0.**

---

## §3. signage 축 구분 (§5)

| 축 | 위치 | API | 소비자 | 분류 |
|---|---|---|---|---|
| **signage-player-web** (본 WO) | `services/signage-player-web` | `/api/v1/channels/*` (legacy route) · `/api/signage/:serviceKey/*` (신 route) | 단말(TV/태블릿) 브라우저 | ACTIVE (신규 배포) |
| admin digital-signage v2 | `apps/admin-dashboard/src/pages/digital-signage/v2` | `/api/signage/:serviceKey/*` | 운영자 | ACTIVE |
| store "TV 재생" | `services/web-*/…/Signage*Page.tsx` + `packages/store-ui-core` 의 `signage-player` menu key | `/api/signage/:serviceKey/public/*` | 매장주 | **ACTIVE · 독립 구현** — player 앱을 embed 하지 않는다 |
| channel API (CMS) | `apps/api-server/src/routes/channels` | `/api/v1/channels` | player + CMS | ACTIVE |
| signage API | `apps/api-server/src/routes/signage/signage.routes.ts` | `/api/signage/:serviceKey` (**전체 `requireAuth`**) | admin | ACTIVE |
| signage public API | `.../signage-public.routes.ts` | `/api/signage/:serviceKey/public/*` (무인증) | store UI | ACTIVE |

`packages/store-ui-core` 의 `signage-player` 메뉴 키(`/store/marketing/signage/player` ·
`/store-owner/signage/player`)는 **다른 축**이다 — 각 web service 내부의 자체 재생 화면이며
`signage-player-web` 과 코드도 런타임도 공유하지 않는다
(`web-kpa-society/src/pages/pharmacy/SignagePlaybackPage.tsx` 는 자체 iframe/vimeo 렌더러 사용).

---

## §4. Dockerfile 이 실제로 빌드 불가였다는 증거

로컬 `docker build` 를 원본 그대로 실행해 3단 실패를 순차 재현했다.

| 단계 | 원본 | 실패 | 수정 |
|---|---|---|---|
| pnpm 설치 | `corepack prepare pnpm@latest --activate` | `ERR_UNKNOWN_BUILTIN_MODULE` — node:20-alpine 에 pnpm 11(node>=22) 설치 | `RUN npm install -g pnpm` (배포되는 다른 7개 web service 와 동일) |
| 의존성 설치 | `pnpm install --frozen-lockfile --filter signage-player-web` | 다음 step 에서 `sh: tsup: not found` — workspace 의존 패키지 devDependency 미설치 | `pnpm install --filter signage-player-web... --ignore-scripts` (동일 패턴) |
| 런타임 포트 | `listen 80` / `EXPOSE 80` | Cloud Run 은 8080 으로만 트래픽 전달 → 기동 실패 | `listen 8080` / `EXPOSE 8080` |

즉 이 서비스는 **한 번도 빌드·배포된 적이 없다**. "dormant artifact" 가 아니라
**미채택 상태의 실서비스 소스**였다. 세 수정 모두 신규 설계가 아니라
이미 배포 중인 web service Dockerfile 패턴으로의 수렴이다.

---

## §5. 판정 (§6)

**A. INDEPENDENT_WEB_SERVICE**

| 후보 | 판정 | 근거 |
|---|---|---|
| A. INDEPENDENT_WEB_SERVICE | **채택** | 자체 SPA router(`/signage/...` · `/player/...`) 와 SPA fallback 이 필요하고, 기존 web service 중 이 route 를 담당하는 것이 없다 |
| B. EXISTING_WEB_SERVICE_BUNDLE | 기각 | admin-dashboard 에 `/signage/:serviceKey/channel/...` route 가 없다(§7). 다른 web service 에 넣는 것은 신규 아키텍처 설계다 |
| C. STATIC_HOSTING_TARGET | 기각 | 정적 버킷/CDN 선례가 저장소에 없다. nginx SPA fallback + Cloud Run 이 기존 패턴 |
| D. INTERNAL_ONLY_TOOL | 기각 | 단말이 익명 접근하는 공개 런타임 |
| E. DEAD/DORMANT_ARTIFACT | 기각 | 정적 계약 spec 2개가 이 소스를 참조하고, 의존 API(`/api/v1/channels/*`)가 production 에서 살아 있다 |

---

## §6. hostname 판단 (§17 vs §40)

- `https://signage.neture.co.kr` — CORS allowlist 에는 **이미 등록**돼 있으나 DNS **NXDOMAIN**
- `apps/api-server/src/config/service-catalog.ts` 의 `O4O_SERVICES[].domain` SSOT 에 signage **없음**

§40 은 "production hostname/route 정책 결정 필요" 를 중지 조건으로 두지만
§17 이 **Cloud Run 생성 URL 을 허용**한다. 따라서 DNS·도메인 SSOT 를 전혀 건드리지 않고
Cloud Run 생성 URL 로 배포했다 — 중지 조건 불성립.

`HOSTNAME_POLICY_DEFERRED` — custom domain 부착은 별도 결정 사항으로 남긴다.
allowlist 의 `signage.neture.co.kr` 은 이후 DNS 작업 시 API 재배포가 불필요하도록 그대로 둔다.

---

## §7. 소비자 링크 실측 — 배포로 고쳐지지 않는 문제

admin-dashboard 의 player 링크는 **same-origin** 으로 조립된다.

| 위치 | 코드 |
|---|---|
| `ChannelEditor.tsx:201` | `${window.location.origin}/signage/${DEFAULT_SERVICE_KEY}/channel/${id}` |
| `ChannelEditor.tsx:628` | `<iframe src={/signage/${DEFAULT_SERVICE_KEY}/channel/${channelId}?mode=preview}>` |
| `ChannelList.tsx:153` | `/signage/${DEFAULT_SERVICE_KEY}/channel/${channel.id}` |
| `PlaylistEditor.tsx:402` | `window.open(/signage/neture/channel/${id}?mode=preview)` |

production 실측:

```
GET https://admin.neture.co.kr/signage/neture/channel/abc
→ 200, 2141 bytes, admin SPA shell ( `/` 와 바이트 동일, <title>O4O Admin Dashboard v0.5.9</title> )
```

admin-dashboard 에 해당 route 가 없어 **admin 자신의 SPA fallback 이 삼켜 player 가 뜨지 않는다**.
player 를 자체 origin 에 배포해도 이 링크들은 고쳐지지 않는다 —
링크가 player origin 을 가리키게 하는 것은 소비자 수정이므로 별도 WO 로 분리한다.
**`CONSUMER_LINK_GAP`**.

---

## §8. player 내부 두 런타임의 실제 동작 가능성 (§18~§21 핵심)

| route | 페이지 | 의존 API | 인증 | production 동작 |
|---|---|---|---|---|
| `/player/channels/:id` · `/player/channels/code/:code` (legacy) | `ChannelPlayerPage` | `/api/v1/channels/:id` · `/code/:code` · `/:id/contents` · `POST /:id/playback-log` · `POST /:id/heartbeat` | `optionalAuth` (무인증 허용) | **가능** |
| `/signage/:serviceKey/channel/:id` · `/channel/code/:code` | `SignagePlayerPage` | `/api/signage/:serviceKey/active-content` + `channels/:id/heartbeat` · `/playback-logs` · `/errors` | `signage.routes.ts` 최상단 `router.use(requireAuth)` | **불가** |

실측(익명):

```
GET /api/signage/neture/active-content        → 401 AUTH_REQUIRED
GET /api/signage/neture/channels              → 401 AUTH_REQUIRED
GET /api/signage/neture/public/media?limit=1  → 200   (public 축만 무인증)
GET /api/v1/channels/code/TESTCODE            → 404 NOT_FOUND   (무인증 도달 OK)
```

추가로 `/api/signage/:serviceKey/channels/:id/heartbeat` · `/playback-logs` · `/errors` 는
**서버에 아예 존재하지 않는다** (`routes/signage/` 전체 grep 0건).
player 는 `Authorization` 헤더도 쿠키도 전혀 보내지 않는다.

또 `PlayerController.initializePlayer()` 는 telemetry/ErrorTracker 를 `if (config.channelId)` 로
gate 하고 `ScheduleResolver` 는 `channelId` 만 query 에 싣는다 → `code` 기반 route 는
telemetry 도 content 해석도 하지 않는다.

**판정: `SIGNAGE_ROUTE_AXIS_INCOMPLETE`.**
이 축을 동작시키려면 device credential 체계나 신규 무인증 endpoint 가 필요하고 둘 다
§16·§39 로 범위 밖이다. 따라서 이번 WO 는 **런타임 배포만** 닫고,
동작 가능한 축은 legacy `/player/channels/...` 라는 사실을 그대로 기록한다.

---

## §9. 변경 파일 (path-specific)

| 파일 | 변경 |
|---|---|
| `services/signage-player-web/Dockerfile` | pnpm 설치 방식 · install filter · `EXPOSE 8080` |
| `services/signage-player-web/nginx.conf` | `listen 8080` · 최소 보안 헤더 2개 |
| `.github/workflows/deploy-web-services.yml` | path trigger · env · detect-changes output/decide · `deploy-signage-player` job · summary |
| `apps/api-server/src/bootstrap/setup-middlewares.ts` | CORS allowlist 에 Cloud Run origin **1개** |
| `apps/api-server/src/__tests__/signage-player-web-deployment-contract.spec.ts` | 신규 정적 계약 spec (14 assertion) |

`services/signage-player-web/src/**` 는 **한 줄도 바꾸지 않았다**.
schema 변경 0 · migration 0 · production DB write 0 · production fixture 0.

---

## §10. 로컬 컨테이너 smoke (§29)

```
docker build --platform linux/amd64 --build-arg VITE_API_URL=https://api.neture.co.kr \
  -f services/signage-player-web/Dockerfile -t signage-player-web:smoke .    → 성공
docker run -d -p 18080:8080 signage-player-web:smoke
```

| 검사 | 결과 |
|---|---|
| `/health` | 200 `OK` |
| `/` | 200 · 700 bytes |
| `/signage/neture/channel/code/ABCD1234` | 200 · index 와 바이트 동일 (SPA fallback) |
| `/player/channels/code/ABCD1234` | 200 · index 와 바이트 동일 |
| asset 헤더 | `Cache-Control: public, immutable` + `X-Content-Type-Options: nosniff` + `Referrer-Policy: no-referrer` |
| 번들 API base | `https://api.neture.co.kr` (build-arg 주입 확인) |
| 번들 secret scan | **0건** |

---

## §11. 정적 계약 spec (§30)

`apps/api-server/src/__tests__/signage-player-web-deployment-contract.spec.ts` — **14/14 PASS**.

막는 회귀: ① nginx listen ↔ Cloud Run `--port` 불일치 ② workflow 채택 3요소 누락
③ frontend build-arg 에 secret 주입(§28) ④ CORS allowlist 누락 ⑤ SPA fallback·`/health` 소실
⑥ §24 위반(CSP·X-Frame-Options 도입).

---

## §12. 보안 (§11 · §24 · §28)

| 항목 | 판정 |
|---|---|
| build-arg | `VITE_API_URL` 1개뿐. `VITE_` prefix 강제 + secret 성 토큰 0 → **PASS** |
| Dockerfile ARG | secret 성 이름 0 |
| production 번들 실물 scan | `DATABASE_URL` · `JWT_SECRET` · `private_key` · `service_account` · `AIza…` · `PGPASSWORD` · `GCP_SA_KEY` **0건** |
| CORS | 정확한 origin **1개** 추가. wildcard · `origin:true` · reflect-origin · credentials 완화 **없음** |
| 인증 계층 | 신규 설계 0 (§16) |
| CSP / X-Frame-Options | **도입하지 않음** (§24) — remote media/video 와 admin preview iframe 을 깨뜨린다 |
| 추가한 헤더 | `X-Content-Type-Options: nosniff` · `Referrer-Policy: no-referrer` (media 무해) |

`?apiUrl=` query override (`SignagePlayerPage.tsx:40`) — 임의 호출자가 player 의 API base 를
바꿀 수 있다. **본 WO 에서 코드 변경하지 않았고** 별도 판단 대상으로 기록한다
(`PLAYER_APIURL_OVERRIDE_NOTED`).

---

## §13. Cloud Run 리소스 설정 (§15 · §38)

`--memory=256Mi --cpu=1 --min-instances=0 --max-instances=5` —
`deploy-web-services.yml` 의 다른 6개 web service 와 **완전히 동일**. 임의 고사양 0.
`min-instances=0` 이므로 유휴 비용은 사실상 0이고 신규 상시 비용 증가가 없다.

---

## §14. 배포 결과 (§32)

`Deploy Web Services (Cloud Run)` @ `a27e10494` — **success**.

| job | 결과 |
|---|---|
| `detect-changes` | success |
| **`deploy-signage-player`** | **success** |
| `deploy-neture` · `deploy-k-cosmetics` · `deploy-kpa-society` · `deploy-glycopharm` · `deploy-pharmacy-hub` · `deploy-kpa-branch` | **전부 skipped** (기존 서비스 무영향) |
| `summary` | success |

```
SERVICE_URL = https://signage-player-web-3e3aws7zqa-du.a.run.app
IMAGE       = gcr.io/netureyoutube/signage-player-web:a27e104942f9b53fe302c3e3d392cc230bab7644
PORT        = 8080
REVISION    = signage-player-web-00001-qjh
```

**serving image tag == commit SHA** (배포 검증 규약 충족).
예측해 CORS 에 넣어둔 origin 과 실제 발급 URL 이 정확히 일치했다.

`Deploy API Server (Cloud Run)` @ `a27e10494` — **success**,
serving image `…/api-server:a27e104942f9b53fe302c3e3d392cc230bab7644` (CORS 반영 완료).

---

## §15. production player smoke (§33 · §25)

| 요청 | 결과 |
|---|---|
| `GET /health` | **200** `OK` |
| `GET /` | **200** · 700 bytes |
| `GET /signage/neture/channel/code/ABCD1234` | **200** · index 와 바이트 동일 → SPA fallback OK |
| `GET /player/channels/code/ABCD1234` | **200** · index 와 바이트 동일 |
| `GET /player/channels/00000000-0000-0000-0000-000000000000` | **200** · index 와 바이트 동일 |
| `GET /no/such/route` | **200** · index (SPA 라우터가 `*` → `/` 로 처리) |
| 응답 헤더 | `x-content-type-options: nosniff` · `referrer-policy: no-referrer` · `server: Google Frontend` |
| asset 헤더 | `cache-control: public, immutable` + 보안 헤더 2개 |
| 번들 API base | `https://api.neture.co.kr` |
| 번들 secret scan | **0건** |

번들 파일명이 로컬 빌드와 동일(`/assets/index-Bq_u91GS.js`) — 재현 가능한 빌드.

**deep-link 라우팅은 HTTP 레벨에서 PASS.** 화면에 실제 콘텐츠가 뜨는지는 §17 참조.

---

## §16. production CORS smoke (§34)

배포 전 baseline(allowlist 미반영 상태):

```
GET /api/v1/channels/code/ABCD1234   Origin: <player>   → 500   (ACAO 없음)
GET /api/v1/channels/code/ABCD1234   Origin: neture.co.kr → 404  + ACAO   (대조군)
GET /api/v1/channels/code/ABCD1234   (Origin 없음)        → 404  (ACAO 없음)
```

API 재배포 후:

```
GET     Origin: https://signage-player-web-3e3aws7zqa-du.a.run.app
  → 404 + access-control-allow-origin: https://signage-player-web-3e3aws7zqa-du.a.run.app

OPTIONS Origin: 동일, Access-Control-Request-Method: GET
  → 204 + ACAO 동일
       + allow-methods GET,POST,PUT,DELETE,OPTIONS,PATCH
       + allow-headers Content-Type,Authorization,X-Requested-With,Accept,Origin,X-Organization-Id
       + max-age 86400

GET     Origin: https://evil.example.com   → 500 (여전히 거부)
```

**CORS = PASS.** 정확히 필요한 origin 1개만 열렸고 미등록 origin 은 그대로 막힌다.
과도한 완화 0 (§11).

---

## §17. channel row census 와 E2E 판정 (§18 · §22 · §35)

익명 read-only 실측:

```
GET /api/v1/channels?serviceKey=neture       → {"data":[],"pagination":{"total":0}}
GET /api/v1/channels?serviceKey=kpa-society  → total 0
GET /api/v1/channels?serviceKey=glycopharm   → total 0
GET /api/v1/channels?serviceKey=k-cosmetics  → total 0
GET /api/v1/channels/code/TESTCODE           → 404 NOT_FOUND
GET /api/v1/channels/health                  → {"status":"ok","service":"channels"}
```

선행 WO 의 migration census 로그와 일치한다
(`[AddChannelsCodeUniqueIndex] census: total=0 withCode=0 nullCode=0 duplicateCodeGroups=0`).

**production channels = 0행.** WO §18·§22 지시대로 **fixture 를 만들지 않았다.**

| 항목 | 판정 |
|---|---|
| `RUNTIME_DEPLOYMENT` | **PASS** |
| `REAL_CHANNEL_E2E` | **BLOCKED_NO_DATA** |
| §35 | **`BLOCKED_NO_PRODUCTION_CHANNEL_ROW`** |

즉 "player 가 배포되어 URL 로 접근되고 API 에 도달 가능하다" 는 확인됐고,
"실제 채널 콘텐츠가 화면에 재생된다" 는 **데이터가 없어 확인 불가**다. 두 사실을 섞지 않는다.

---

## §18. telemetry 자제 (§21 · §36)

production DB write 0 원칙에 따라 **heartbeat / playback log row 를 생성하지 않았다.**
모든 production 요청은 `GET` 과 `OPTIONS` 뿐이다.
`POST /api/v1/channels/:id/playback-log` · `POST /:id/heartbeat` 는 호출하지 않았다
(채널 0행이므로 어차피 대상 id 도 없다).

`TELEMETRY_WRITE_SMOKE = NOT_PERFORMED_BY_DESIGN`.

---

## §19. rollback (§37)

신규 서비스이므로 롤백은 "제거" 또는 "이전 revision 고정" 두 갈래다.

| 상황 | 조치 |
|---|---|
| player 를 되돌리고 싶다 | `gcloud run services delete signage-player-web --region=asia-northeast3` — 다른 9개 서비스에 영향 0 |
| 특정 revision 으로 고정 | `gcloud run services update-traffic signage-player-web --to-revisions=signage-player-web-00001-qjh=100` |
| CORS 만 되돌리고 싶다 | `setup-middlewares.ts` 의 origin 1줄 제거 후 API 재배포 |
| workflow 채택만 되돌리고 싶다 | `deploy-web-services.yml` 의 player 4곳 제거 — 기존 6개 job 은 무변경 |

기존 서비스의 job·이미지·revision 은 하나도 건드리지 않았다.

---

## §20. provisioning gap (§23)

channel 을 만들 수 있는 **동작하는 UI 경로가 없다.**

- `/api/v1/channels` `POST` = `requireAdmin` — 이 endpoint 를 호출하는 프론트엔드가 **저장소 전체에 0건**
- 유일한 channel 생성 UI(`admin-dashboard` digital-signage v2 `ChannelEditor` · `ChannelList`)는
  `/api/signage/:serviceKey/channels` 를 호출하지만 **그 route 는 서버에 존재하지 않는다**
  (`signage.routes.ts` 에 `channels` path 0건)

따라서 `channel.code` 를 발급할 수 있는 실동작 경로가 없고, 이것이 §17 의 0행 원인이다.

**`PROVISIONING_GAP`** — WO 지시대로 **신규 provisioning UI 를 만들지 않았다.**

---

## §21. 검증 결과 (§31 — skip/완화 0)

| 검증 | 결과 |
|---|---|
| `services/signage-player-web` `tsc -b` | **exit 0** |
| `apps/api-server` `tsc --noEmit` | **exit 0** |
| `node scripts/lint-ratchet.mjs` | **exit 0** — 67 errors (baseline 69). baseline 은 내리지 않았다(스크립트 규칙: 실제로 고친 뒤에만 하향) |
| 신규 정적 계약 spec | **14/14 PASS** |
| 관련 jest 6 suite 동시 실행 | **6 suites PASS · 104 passed · 10 skipped(기존 조건부 skip)** |
| `Deploy Web Services (Cloud Run)` @ `a27e10494` | **success** |
| `Deploy API Server (Cloud Run)` @ `a27e10494` | **success** |
| `CodeQL Security Analysis` | `a27e10494` 에서 다른 세션 push(`daaca4a0f`) 의 concurrency 로 **cancelled** → 후속 `daaca4a0f` 에서 **success** |
| `CI Pipeline` | `a27e10494` 동일 사유로 cancelled → `daaca4a0f`(본 commit 의 자손, docs-only 변경) 에서 **success** |

`a27e10494` 의 `CI Pipeline`/`CodeQL` cancelled 는 **내 변경의 실패가 아니라**
다른 세션의 후속 push 가 같은 concurrency group 을 선점한 결과다.
동일 코드가 포함된 자손 commit 에서 재검증된다.

---

## §22. 남은 gap (모두 본 WO 범위 밖 — 만들지 않았다)

| 태그 | 내용 | 왜 여기서 안 했는가 |
|---|---|---|
| `SIGNAGE_ROUTE_AXIS_INCOMPLETE` | `/signage/:serviceKey/channel/...` 축은 `requireAuth` + 미존재 telemetry endpoint 로 동작 불가 | device credential 체계 / 신규 인증 계층 = §16·§39 범위 밖 |
| `CONSUMER_LINK_GAP` | admin 의 player 링크 4곳이 same-origin 이라 admin SPA 가 삼킨다 | 소비자 수정 — 별도 WO |
| `PROVISIONING_GAP` | channel 생성 실동작 경로 없음 | §23 — 신규 provisioning UI 금지 |
| `BLOCKED_NO_PRODUCTION_CHANNEL_ROW` | 실제 콘텐츠 재생 E2E 불가 | §18·§22 — fixture 생성 금지 |
| `HOSTNAME_POLICY_DEFERRED` | custom domain 미부착 (Cloud Run URL 사용) | §17 이 허용 · 도메인 SSOT 변경은 별도 결정 |
| `PLAYER_APIURL_OVERRIDE_NOTED` | `?apiUrl=` 로 API base 교체 가능 | player src 무변경 원칙 |
| `GLUCOSEVIEW_WEB_UNMANAGED` | `glucoseview-web` 이 배포돼 있으나 workflow job 없음 | 다른 서비스 축 |
| `CHECK_DOC_INACCURACY` | `CHECK-O4O-CLOUD-RUN-INGRESS-LOAD-BALANCER-ONLY-V1.md:167` 이 미존재 서비스를 열거 | 과거 문서 정정은 별도 |

---

## §23. 중지 조건 점검 (§40) — 전부 불성립

| 조건 | 판정 |
|---|---|
| player 가 실제 독립 production target 이 아님 | 불성립 — A 로 확정 |
| 기존 다른 서비스가 이미 player runtime 담당 | 불성립 — 담당 서비스 0 (§3 · §7) |
| production hostname/route 정책 결정 필요 | 불성립 — §17 이 Cloud Run URL 허용, DNS 무변경 |
| CORS 를 크게 완화해야만 동작 | 불성립 — 정확한 origin 1개 (§16) |
| secret 을 frontend 에 넣어야 함 | 불성립 — `VITE_API_URL` 뿐 (§12) |
| 신규 조직/계정 권한 승인 필요 | 불성립 — 동일 project·region·SA·패턴 |
| 다른 세션 WIP 와 직접 충돌 | 불성립 — worktree clean, 충돌 0 |

§40 단서("단순 workflow 추가나 Cloud Run 서비스 생성이 기존 web-service 패턴으로 명확하면
중간 승인 없이 진행")에 정확히 해당하여 그대로 진행했다.

---

## §24. 범위 밖 미수행 (§39)

production channel fixture 생성 · device credential 체계 · channel provisioning 신규 UI ·
`channel.code` normalization · channels organization authorization · CMS legacy migration ·
새 content 제작 — **모두 하지 않았다.**

schema 변경 0 · migration 0 · production DB write 0 · production 데이터 삭제/변경 0 ·
테스트 skip/완화 0 · `git add .` 0 · 다른 세션 WIP 접촉 0.
