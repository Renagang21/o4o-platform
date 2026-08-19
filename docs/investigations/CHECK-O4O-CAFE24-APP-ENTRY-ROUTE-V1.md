# CHECK-O4O-CAFE24-APP-ENTRY-ROUTE-V1

> **WO**: WO-O4O-CAFE24-APP-ENTRY-ROUTE-V1
> **판정**: **DONE** — `https://neture.co.kr/cafe24` 진입점 확보. Census WO 재개는 자격정보 주입 후 가능
> **일자**: 2026-08-19 · **커밋**: `6efdd2cbb`

## 1. 원인 — "404" 는 서버 404 가 아니었다

`services/web-neture` 는 `serve -s dist` 로 서빙된다(Dockerfile). `-s` 는 SPA fallback 이므로
**미등록 경로도 HTTP 200 + `index.html`** 을 돌려준다. 즉 `/cafe24` 는 서버에서 200 이었고,
SPA 라우터가 매칭 실패해 `NotFoundPage` 를 그렸다. 사용자가 본 404 는 **화면 문구**다.

→ 고칠 대상은 서버 라우팅이 아니라 **SPA route 등록** 하나였다.

## 2. 변경

| 파일 | 내용 |
|---|---|
| `services/web-neture/src/pages/Cafe24AppEntryPage.tsx` | 신규. 상태 안내 + mall_id 입력 + `[연결 시작]` |
| `services/web-neture/src/App.tsx` | lazy import + `<Route path="/cafe24">` 등록 |

**레이아웃 없는 공개 route 그룹**(`/qr/:slug` · `/p/:publicKey` 옆)에 넣었다.
Cafe24 앱은 Cafe24 관리자 화면 **iframe 안**에서 열리므로 `NetureLayout`(사이트 헤더/푸터)을 씌우지 않는다.

백엔드·OAuth 구조·`callback` route 는 **변경 0**이다.

## 3. Cafe24 launch parameter 계약 — 확정하지 못했다

공식 문서에서 App URL 진입 시 전달되는 query parameter 명세를 **찾지 못했다.**

| 확인한 문서 | 결과 |
|---|---|
| `docs-new/docs/guide/oauth2-authentication` | OAuth 엔드포인트만 기술. launch parameter·hmac 검증 **없음** |
| `docs-new/docs/guide/intro` | 없음 |
| `docs-new/docs/guide/app-development` | **404** (경로 자체가 존재하지 않음) |

확인된 사실(현재 구현과 일치):
- authorize: `https://{mall_id}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=&state=&redirect_uri=&scope=`
- token / refresh: `POST https://{mall_id}.cafe24api.com/api/v2/oauth/token` + Basic auth
- **"authorization code 요청은 반드시 웹 브라우저에서" (cURL·코드 직접 호출 금지)** — 현재 컨트롤러가 리다이렉트 대신 authorize URL 을 JSON 으로 돌려주고 브라우저가 이동하는 설계와 맞다

따라서 계약을 추측해 고정하지 않고 **방어적으로만** 구현했다:
- `mall_id`/`mallId`, `shop_no`/`shopNo` 두 표기를 모두 읽는다(표기 흔들림 대비)
- 읽은 값은 **화면 표시 + authorize 요청 prefill** 로만 쓴다
- **권한 근거로 쓰지 않는다.** 실제 판정은 서버 admin guard 가 한다 (WO §4)
- hmac 검증은 구현하지 않았다 — 검증 계약을 모르는 상태에서 만든 검증기는 보안 근거가 되지 못한다. 이 값들에 권한을 걸지 않았으므로 지금은 필요하지도 않다

> 실제 앱을 실행해 **도착한 query string 을 관측**하는 것이 계약 확정의 가장 확실한 경로다.
> 화면이 전달값을 그대로 보여주므로, 첫 실행 시 그 자리에서 확인할 수 있다.

## 4. OAuth 진입 가능 여부 — 구조적 제약을 기록한다 (WO §5)

`[연결 시작]` 은 기존 `GET /api/v1/admin/cafe24/authorize` 를 그대로 호출한다. 우회로를 만들지 않았다.

그런데 이 라우터는 전체가 `authenticate` + `requireRole(['platform:super_admin','neture:admin','neture:operator'])` 로 잠겨 있다(CLAUDE.md §8 — 인증 없는 연동 route 금지).

**결과: Cafe24 몰 관리자가 Cafe24 관리자 화면에서 이 앱을 실행해도 연결을 시작할 수 없다.**
그는 O4O 관리자가 아니기 때문이다. 현재 연결 개시가 가능한 주체는 **neture.co.kr 에 로그인한 O4O 관리자뿐**이다.

이는 결함이 아니라 **아직 결정하지 않은 것의 결과**다 — Cafe24 몰 사용자를 어떤 신원으로 볼지(external commerce ownership)는 Census 숫자를 본 뒤 결정하기로 했다. 억지로 뚫지 않고 화면이 상태를 정직하게 알린다:

| 서버 응답 | 화면 |
|---|---|
| 401 / 403 | "O4O 관리자 로그인이 필요합니다" |
| `CAFE24_CREDENTIALS_NOT_CONFIGURED` (503) | "Cafe24 앱 자격정보가 아직 설정되지 않았습니다" |
| 성공 | `authorizeUrl` 로 브라우저 이동 |

**현재 프로덕션은 두 번째 상태다** — `CAFE24_CLIENT_ID`/`SECRET`/`REDIRECT_URI` 미주입 (2026-08-19 `gcloud run services describe` 실측, env 21개 중 CAFE24_* 0개). `ENCRYPTION_KEY` 는 정상.

## 5. 검증

| 항목 | 결과 |
|---|---|
| typecheck `web-neture` (`tsc --noEmit`) | **exit 0** |
| typecheck `web-glycopharm` (`tsc -b`) | **exit 0** |
| production browser smoke | 아래 §5-1 — **PASS** |
| 기존 route 회귀 | 아래 §5-1 — 이상 없음 |
| Cafe24 callback route | **무변경** (diff 0) |
| secret/token 노출 | **0** — 화면·코드·본 문서 어디에도 없음 |

> 최초 로컬 typecheck 에서 나온 `@o4o/account-ui` 의 `MyPageActivityFeed`·`MyPageAppreciationCard`
> 미해결 오류는 로컬 `packages/account-ui/dist` 미빌드가 원인이었다(소스에는 export 존재).
> 패키지 빌드 후 두 서비스 모두 exit 0. CI 는 패키지를 먼저 빌드하므로 애초에 재현되지 않았다.

### 5-1. Production browser smoke

배포 리비전: 커밋 `6efdd2cbb` · `deploy-neture: success` · 2026-08-19 · 실제 브라우저(Playwright, headless chromium)

| # | 대상 | HTTP | 화면 | console error |
|:-:|---|:---:|---|:---:|
| 1 | `https://neture.co.kr/cafe24?mall_id=o4otest&shop_no=1` | 200 | Cafe24 × O4O 진입 화면 렌더 · **"Cafe24 가 전달한 값" 블록에 `mall_id o4otest` / `shop_no 1` 정상 echo** | 0 |
| 2 | `https://neture.co.kr/cafe24` (파라미터 없음) | 200 | 동일 화면 렌더 · echo 블록 **미표시**(의도대로) | 0 |
| 3 | `https://neture.co.kr/` | 200 | 정상 (회귀 없음) | 0 |
| 4 | `https://neture.co.kr/contact` | 200 | 정상 (회귀 없음) | 0 |
| 5 | `https://neture.co.kr/__no_such_route__` | 200 | `NotFoundPage` — SPA fallback 동작 **유지**(§1 진단과 일치) | 0 |

**iframe 임베드 가능 여부**: 응답 헤더에 `x-frame-options` 없음, `content-security-policy` 의
`frame-ancestors` 지시자 없음 → Cafe24 관리자 화면 iframe 안에서 차단되지 않는다.

`[연결 시작]` 버튼의 실제 OAuth 왕복은 **검증하지 않았다** — `CAFE24_*` 자격정보가 아직 프로덕션에
없기 때문이다(§4). 이 상태에서 버튼을 누르면 §4 표의 두 번째 상태 문구가 나오는 것이 정상 동작이다.

## 6. 다음 단계

1. Cafe24 Developers 에서 일반 앱 생성
   - App URL: `https://neture.co.kr/cafe24` ← **이번 작업으로 사용 가능**
   - Redirect URI: `https://api.neture.co.kr/api/v1/admin/cafe24/callback` (변경 없음)
   - 권한: 상품 읽기만 (`mall.read_product`) · `CAFE24_SCOPES` env 는 설정하지 않는다
2. `CAFE24_CLIENT_ID` / `CAFE24_CLIENT_SECRET`(Secret Manager 권장) / `CAFE24_REDIRECT_URI` 주입
3. **`WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-RESUME-V1` 재개** — 위 2가 끝나면 §2 전제가 충족된다

QR / Tablet / Digital Signage 의 external ownership 설계는 **Census 실측 이후**다. 이번 작업에서 시작하지 않았다.

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
