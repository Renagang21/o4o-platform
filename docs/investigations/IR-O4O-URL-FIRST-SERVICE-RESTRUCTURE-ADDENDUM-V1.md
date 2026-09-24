# IR 보강 — O4O URL 중심 서비스 재구성: 누락 조사 축

- 작성일: 2026-09-25
- 상위 문서: `IR-O4O-URL-FIRST-SERVICE-RESTRUCTURE-2026-09-24` (저장소 미수록 · 사용자 제공). 그 IR 의 §1 목적지 표 · §4 확인 항목을 전제로, **빠져 있던 조사 축**만 보강한다.
- 성격: 조사 전용. 코드 · DB · DNS · LB · 배포 변경 0. 소스 기준 `origin/main` = `26ac02a60`.
- 범위 한계: 운영 DB 행 수 · 실제 인쇄 QR 수 · 설치된 local agent 수 · Google 콘솔 · Gabia DNS 는 직접 확인하지 않았다(아래 "미확인" 표기).

---

## 0. 결론 요약

원 IR 은 "앱 · 서비스 키 · 기준 문서" 축은 잡았지만 다음 5개 축이 비어 있었다. 모두 **URL 을 옮기는 순간 되돌릴 수 없는 손실**이 생기는 영역이다.

| # | 누락 축 | 심각도 | 요지 |
|---|---|---|---|
| A | 물리 매체에 박힌 옛 호스트 (인쇄 QR · POP · 전단 · 제휴 QR) | Critical | 옛 도메인 **영구 301 유지**가 전제. `pharmacyhub.co.kr` "폐지"는 도메인 반납이 아니라 리다이렉트 전용 존치여야 한다 |
| B | 매장 기기 (태블릿 · 사이니지) · 고객 PC 설치 SW | Critical | origin 단위 localStorage 토큰 → 호스트 이전 시 **전 기기 재페어링**. local agent · Chrome 확장은 허용 origin 이 빌드에 고정 → 재배포 필요 |
| C | 인증 쿠키 · CORS · Google origin · 로그인 상태 | High | `*.neture.co.kr` 로 모이면 쿠키가 전 서비스 + admin 과 **공유**됨(동작 변화). CORS 는 하드코딩. 전 사용자 1회 로그아웃 |
| D | 저장된 URL (DB · 알림 · 발송된 메일) | High | `foreign_visitor_partner_qr_codes.landing_url` 절대 URL · **불변 설계**. 알림 `targetUrl` 은 상대경로라 `/store` · `/supplier` · `/market-trial` 경로 변경 시 앱 내 legacy redirect 필요 |
| E | 기준 문서 · RBAC 식별자 | High | 호스트 기반 서비스 판정은 Boundary F6 Rule 4 문언과 충돌. 독립 커뮤니티 회원은 ROLE-WORKSPACE §5 가 명시적으로 배제. 서비스 키 · role prefix 는 영구 내부 ID 로 유지 권고 |

원 IR §5 실행 순서 1단계("인벤토리 + 기준 문서 개정")는 유지하되, 아래 §7 의 **선결 결정 8건**을 그 단계의 산출물에 포함해야 한다.

---

## 1. 배포 · 호스트 인프라 현황 (원 IR §4 "인프라/로그인" 행 보강)

### 1-1. 앱 ↔ Cloud Run ↔ 도메인

| 앱 | Cloud Run | 현재 도메인 | 목표 (원 IR) |
|---|---|---|---|
| `services/web-neture` | `neture-web` | neture.co.kr (+www) · LB 기본 backend | 대표 홈 + `/supplier/*`(38 route) · `/market-trial*` · `/cafe24` · `/hospital-drug` · `/community` · `/operator` · `/admin` 공존 |
| `services/web-kpa-society` | `kpa-society-web` | kpa-society.co.kr | pharmacy.neture.co.kr |
| `services/web-kpa-branch` | `kpa-branch-web` | kpa-society.co.kr`/kpa/*` (LB pathRule) | kpa.neture.co.kr/{branch} |
| `services/web-k-cosmetics` | `k-cosmetics-web` | **k-cosmetics.site** (.co.kr 아님) | retail.neture.co.kr |
| `services/web-pharmacy-hub` | `pharmacy-hub-web` | pharmacyhub.co.kr | 폐지 후보 |
| `services/web-store` | `store-web` | store.neture.co.kr | 유지 (`/my-store` 재편) |
| `services/web-lecture` | `lecture-web` | study.neture.co.kr | 유지 |
| `services/web-hospital-pharmacy` | `hospital-pharmacy-web` | neture.co.kr`/hospital` (LB pathRule) | 유지 |
| `services/signage-player-web` | `signage-player-web` | run.app 만 (signage.neture.co.kr DNS 없음) | **원 IR 미언급** |
| `apps/admin-dashboard` | `o4o-admin-dashboard` | **admin.neture.co.kr 이미 운영 중** | 유지 — 원 IR 은 신설처럼 기술 |
| API | `o4o-core-api` | api.neture.co.kr (LB-only ingress) | 유지 |

- GlycoPharm · GlucoseView 는 은퇴 완료(83853d8d3 · 4274982e5). 원 IR 누락은 정상. 단 LB `glucoseview.co.kr` host rule · CORS `forum.`/`shop.` 등 잔재 존재.
- `services/web-account` 는 소스는 있으나 배포 workflow 없음. LB `account.neture.co.kr` backend 는 퇴역한 `o4o-main-site` 를 가리킨다.

### 1-2. 호스트 추가 경로 — 저장소 밖 수동 작업

- IaC 없음. Global LB `o4o-global-lb` URL map · Certificate Manager `o4o-main-cert-map` · **DNS 는 Gabia** · 전부 gcloud 수동 + CHECK 문서 기록(선례: `CHECK-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1` · `CHECK-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1`).
- 신규 호스트 1개당: NEG/backend → url-map host rule → 인증서 + map entry → Gabia A 레코드 → Google JS origin → CORS 코드 → API 재배포.
- 원 IR 목표 기준 신규 호스트: `supplier` · `partner`(예약만) · `funding`(CORS 에는 이미 있음) · `pharmacy` · `retail` · `kpa` · `community`.
- **`DEPLOY_ENABLED` 가 현재 닫혀 있다** (`deploy-web-services.yml` L96-117, Lecture 사고). 호스트 이전 일정은 이 게이트 재개방에 종속.

### 1-3. 하나의 앱 안에서 호스트를 가르는 구조가 없다

- supplier · funding 은 모두 `neture-web` 번들의 route prefix 다. 새 호스트로 보내려면 (a) 별도 번들 분리, (b) 같은 번들에 호스트 기반 라우팅 추가, (c) LB 가 `supplier.` 를 neture-web 으로 보내고 앱이 `/` → `/supplier` 로 재작성 — 중 하나를 골라야 한다. **현재 어느 것도 없다.**
- community.neture.co.kr 도 담당 앱이 없다. 커뮤니티 카탈로그는 각 서비스 앱의 `/forum` 으로 연결된다(`community-catalog.ts:61-90`).

---

## 2. 축 A — 물리 매체 · 인쇄 QR

- 매장 QR(`store_qr_codes`)은 **slug 만 저장**, 호스트는 렌더 시 `getServiceOrigin(serviceKey)` 로 결정. → 카탈로그만 바꾸면 **새로 뽑는 QR 은 새 호스트**, 이미 인쇄된 것은 옛 호스트.
  - 렌더 지점: `store-qr-landing.controller.ts:299,351,465,552` · `store-pop-v2.controller.ts:57-59` · `store-screen-set-qr.service.ts:28` · `PharmacyHubStoreQrController.ts:89-93` (각각 `kpa-society.co.kr` / `pharmacyhub.co.kr` 하드코딩 fallback 보유).
- 카탈로그를 우회하는 **중복 호스트 표** 2곳: `multilingual-product-content.controller.ts:166-177` · `foreign-visitor-partner-qr-code.service.ts:16-28`.
- 옛 호스트에서 **경로 · 쿼리 보존 301 을 영구 유지**해야 할 경로: `/qr/*` · `/tablet/*` · `/multilingual-products/*` · `/foreign-visitor/affiliate/*` · `/store/:slug/products|events|blog/*` · `/handoff` · `/auth/verify-email` · `/kpa/*`.
- 함의: **pharmacyhub.co.kr · kpa-society.co.kr · k-cosmetics.site 는 "폐지" 가 아니라 "리다이렉트 전용 존치"** 가 되어야 한다. 도메인 갱신 비용 · LB rule · 인증서를 계속 유지해야 한다.
- 미확인: 실제 인쇄 · 배포된 QR 수(운영 DB `store_qr_codes` 스캔 이력으로 추정 가능).

### 2-1. 이미 깨져 있는 것 (이전과 무관, 별도 WO 후보)

- K-Cosmetics 앱에 `/qr/:slug` · `/multilingual-products` · `/foreign-visitor` route 가 없다(`web-k-cosmetics/src/App.tsx`, `tablet/:slug` 만 존재). 그런데 서버는 `k-cosmetics.site/qr/*` 또는 `cosmetics.neture.co.kr/*`(LB rule 없음 → neture-web 으로 떨어짐)로 QR 을 만든다.
- 화장품 호스트가 3개로 불일치: `k-cosmetics.site`(카탈로그) · `cosmetics.neture.co.kr`(다국어/제휴 QR) · `k-cosmetics.neture.co.kr`(`neture-dashboard.service.ts:67`).
- web-store 가 `window.location.origin` 으로 QR · 태블릿 URL 을 만들지만(`StoreQRPage.tsx:403,615` · `StoreTabletDisplaysPage.tsx:246` · `TabletContentLibraryList.tsx:732`) store 앱에는 `/qr` · `/tablet` route 가 없다 → 복사된 URL 이 dead.
- `neture.routes.ts:550-555` 상품 QR 기본 호스트 `neture.o4o.kr` · `SellerQRGuidePage.tsx:18` 동일 — 존재하지 않는 도메인으로 보인다.

---

## 3. 축 B — 매장 기기 · 설치형 소프트웨어

| 대상 | 현재 결합 | 호스트 이전 시 |
|---|---|---|
| 매장 태블릿 `/tablet/:slug` | 기기 토큰 localStorage `o4o.tablet.device` (`web-kpa-society/src/api/tablet.ts:196` · `web-store/src/api/tablet.ts:196`) | 301 로도 토큰은 안 넘어감 → **전 태블릿 재페어링** 또는 토큰 이관 bridge 필요 |
| 사이니지 재생 | `/signage/play/*` · `/public/signage` · `/store/marketing/signage/play/:playlistId` 가 매장 화면에 북마크 | 호스트 이전 + `/store`→`/my-store` 이중으로 깨짐 |
| 병원약국 기기 | HttpOnly 쿠키 `hospitalDeviceToken` · `.neture.co.kr` · 1년 | `/hospital` 유지 시 영향 없음 |
| local agent (`tools/o4o-local-agent`) | `ALLOWED_ORIGINS` exact-match 8개 고정(`local-server.mjs:49-58`) — neture · pharmacyhub · kpa-society · k-cosmetics.site | pharmacy/retail/supplier `.neture.co.kr` 에서 **연결 거부** → 설치본 전량 업데이트 필요 |
| Chrome 확장 | `manifest.json` `host_permissions` · content-script `matches` = `https://neture.co.kr/*` 만 | supplier. 로 옮기면 공급자 흐름 미적용 → 스토어 재심사 + 권한 재승인 |
| 모바일 앱 | API base = env · 웹 로그인 링크 `neture.co.kr/login` · universal link 없음 | 영향 낮음 |
| Cafe24 | OAuth redirect = `api.neture.co.kr/...` · App URL = `neture.co.kr/cafe24` | api · neture 루트 유지 시 영향 없음 |

---

## 4. 축 C — 인증 · 쿠키 · CORS

- **쿠키**: `cookie.utils.ts:20-24` `SERVICE_DOMAINS=['.neture.co.kr','.kpa-society.co.kr','.k-cosmetics.site']`. API 가 `api.neture.co.kr` 이므로 실제로 동작하는 것은 `.neture.co.kr` 뿐. 서비스들이 `*.neture.co.kr` 로 모이면 `accessToken`/`refreshToken`/`sessionId` 쿠키가 **pharmacy · retail · supplier · funding · store · admin 전부 공유**된다. admin-dashboard 는 쿠키 전략이므로 다른 서비스의 handoff/로그아웃이 admin 세션을 덮어쓰거나 지운다. → 의도(SSO 로 볼지, 격리할지) 결정 필요.
- **토큰 저장**: admin 외 모든 서비스 웹이 localStorage(`o4o_accessToken`). origin 단위이므로 **이전 시 전 사용자 1회 로그아웃**.
- **`isCrossOriginRequest`** (`auth-helpers.ts:17-45`): 같은 base domain 이 되면 로그인 응답 body 에 토큰을 넣지 않는다. auth-client 는 `includeLegacyTokens` 를 보내므로 정상이나, 이 플래그를 빠뜨린 커스텀 fetch 는 깨진다.
- **CORS**: `setup-middlewares.ts:39-102` exact-match 하드코딩. `CORS_ORIGIN` env 는 배포에서 미설정. 카탈로그에서 파생하지 않음(`getServiceOrigins()` 소비처 0). → 신규 호스트마다 코드 수정 + API 재배포.
- **handoff**: 소스 판정은 Origin hostname ↔ 카탈로그 domain exact match(`handoff.controller.ts:83-91`). exchange 의 origin lock 은 store(`store-workspace.ts:9`) · 대표 홈(`representative-entry.ts:25-45`) 2곳만.
- **Google**: GIS 팝업 방식 — redirect URI 없음, **Authorized JavaScript origins 만** 콘솔 수동 등록. 새 호스트마다 추가.
- **결제**: Toss 결제 복귀 URL 이 `window.location.origin` 기반(`web-pharmacy-hub/src/pages/store-owner/PaymentPage.tsx:59`). 가맹점 콘솔 등록 여부 미확인.

---

## 5. 축 D — 저장된 URL

| 저장 위치 | 형태 | 처리 |
|---|---|---|
| `foreign_visitor_partner_qr_codes.landing_url` | 절대 URL · 생성 후 **불변** 설계(`service.ts:137`) · SVG 를 이 값으로 재생성 | 데이터 rewrite(= DB write, 사용자 승인 대상) + 옛 호스트 301 |
| `notifications.metadata.targetUrl` | 상대경로만(`resolveTarget.ts` 가 절대 URL 차단) — `/supplier/*` · `/market-trial/*` · `/store/*` · `/mypage` · `/operator/*` | 렌더하는 호스트 기준으로 해석됨 → 경로를 바꾸는 앱에 **legacy redirect route** 필수. 호스트 간 이동은 표현 불가 |
| 발송된 메일 | 절대 URL + token (`/auth/verify-email?token=` · `/operator-invitations/accept?token=`) | 301 이 쿼리 보존해야 함 |
| `platform_services.entry_url` | `https://pharmacyhub.co.kr` · `https://branch.kpa-society.co.kr`(이미 틀림) | 표시용. 데이터 수정 |
| `operator_qr_templates.target_url` · `community_*.link_url` · CMS/포럼 본문 | 운영자 입력 절대 URL 가능 | 데이터 스캔 필요(미확인) |

---

## 6. 축 E — 기준 문서 · 식별자

### 6-1. 기준 문서 충돌 (원 IR §2-4 는 ROLE-WORKSPACE 만 지적)

| 문서 | 조항 | 충돌 내용 |
|---|---|---|
| ROLE-WORKSPACE-V1 §5 (:149-160) | 커뮤니티 참여 = 서비스 membership 파생, 새 membership 테이블 0, 운영 권한 = `service_code` 서비스 운영자 | 독립 커뮤니티 가입 · O4O 운영자 승인과 정면 충돌. §10 은 V2 개정을 요구 |
| ROLE-WORKSPACE-V1 §3 (:85) | My Store = KPA/KCos `/store`, PH `/store-owner` ("PG callback 경로 불변") | `/my-store` 재편 · PH 은퇴와 충돌 |
| Boundary F6 §3 (:103) · Rule 4 (:163-171) · §7 (:256) | serviceKey 는 URL 경로 파라미터에서만, 헤더 수용 금지, 추출 방식 변경 = WO | Host/Origin(헤더)로 서비스를 판정하면 위반. **프론트가 호스트로 서비스를 알고 API 경로에 serviceKey 를 싣는 방식이면 준수** |
| KPA-UX F2 (:27-31, :142-149) | 영역 route · Block 구조 · API 계약 동결 | 호스트 이동 자체는 허용 가능하나 route 재편은 WO |
| KPA-SOCIETY-SERVICE-STRUCTURE (:116, :126-128) | 상단 메뉴에 기능 항목(포럼 등) 추가 금지 · 변경은 버전업 | 커뮤니티 분리 시 KPA 메뉴 재편 필요 |
| STORE-LAYER F3 (:312-317) | `store-ui-core` Public API 변경 = WO | `unifiedStoreHandoff.ts` RULES · 경로 resolver 변경 |
| RBAC F9 §4 (:55-61) | 새 role = 5단계 절차 + WO | 커뮤니티 운영자 role 신설 |
| USER-OPERATOR F11 (:38-45, :201-207) | 서비스별 예외 · membership bypass 금지 · KPA-a 단순화 금지 | O4O 운영자가 서비스 영역 승인을 대행하는 설계 |

### 6-2. 식별자는 옮기지 않는다 (권고)

- `kpa-society` 약 344회 · `k-cosmetics` 약 226회 · `cosmetics` 약 253회 · `'{svc}:operator'` 약 201회 리터럴. 저장 데이터(`role_assignments` · `service_memberships.service_key` · `forum_category_requests.service_code` · `checkout_orders.metadata.serviceKey` · `lms_courses.service_key` · `supplier_product_offers.service_keys` 등)에 박혀 있다.
- 코드베이스 관례도 이미 "식별자 불변 · `domain`/`basePath`/`nameKo` 만 변경"이다(`service-catalog.ts:22-27`). → **서비스 키 · role prefix 는 영구 내부 ID 로 두고 호스트 · 표시명만 바꾼다.**
- 명칭 충돌: `retail` 은 이미 `RETAIL_ORDER_SERVICE_KEYS`(`buyer-order-service-scope.ts:14,35-58`) · `OrderType.RETAIL` · `retailPrice` 로 쓰인다. 새 서비스 키로 `retail` 을 쓰면 안 되고, 공개명/호스트로만 사용 권고.

### 6-3. 커뮤니티 독립 회원 — 필요 구성 (현재 0)

`community_memberships`(user · community_key · status · reviewer · qualification_ref) 테이블, `CommunityParticipationPolicy` 제3 모드, 커뮤니티 단위 승인 주체(role), 포럼 원장의 community 축(`service_code` 신규 값 또는 `community_key` 컬럼 — 현재 `forum-category-request.routes.ts:45` 가 카탈로그 외 코드 거부), JWT/`freshenUserContext` 탑재. 약사 자격은 `kpa_pharmacist_profiles`(사람 단위) 재사용 가능.
- 운영 현황(기존 CHECK 기준, 재실측 아님): 활성 membership kpa-society 6 · pharmacy-hub 10 · k-cosmetics 5 · neture 7 · kpa-branch 3, **PH-only 6명**. 포럼은 kpa-society 완료 2 · neture 완료 2 · PH/KCos 실질 0 — 이관 데이터량은 작다.

---

## 7. 서비스별 보강 사실

### 7-1. PharmacyHub — "공통 기능 흡수" 로 끝나지 않는 고유 기능

- 공급자 **직접 opt-in 채널**: `SUPPLIER_OPTIN_SERVICE_KEYS=[PHARMACY_HUB]` — 운영자 승인 없이 매장 HUB 로 공급. KPA · 화장품은 승인 채널. Neture `/supplier/services/pharmacy-hub` 가 공급.
- 다공급자 단일 결제(`paymentGroupId`) + 정체 fulfillment 복구 운영 콘솔. 주문은 `checkout_orders.metadata.serviceKey='pharmacy-hub'`.
- `pharmacy-hub:member` 일반 약사 가입(KPA 에 대응 없음).
- `/news` · `/store-owner/tablets` · `/store-owner/manuals` (KPA 앱에 없음).
- pharmacyhub.co.kr 로 발급된 공개 QR/태블릿 URL (§2).
→ 은퇴 전 **각 고유 기능의 목적지(서비스 · 앱) 결정**과 PH-only 회원 6명의 처리 정책이 선결.

### 7-2. KPA 분회 → `kpa.neture.co.kr/{branch}`

- 함께 바꿔야 하는 6곳: `tenant.tsx:21-26` `PLATFORM_HOSTS`(목록 외 호스트 = **자체 도메인으로 오판** → "분회 없음"), `PUBLIC_BASE_PATH='/kpa'`, vite `base:'/kpa/'`, Dockerfile `dist/kpa`, 카탈로그 `domain`/`basePath`, LB pathRule.
- 자체 도메인은 `branch_domains` 테이블로 이미 구현, **활성 행 0**(CHECK 기준). 원 IR 의 "분회별 자체 도메인 보존"은 현재 보존 대상이 없다.

### 7-3. `/hospital-drug` 삭제 범위 (원 IR §2-5 확정)

- 삭제 가능(neture 전용): `App.tsx:690` route · `HospitalDrugPage.tsx` + test · `lib/hospital-drug/*` · `unified-request.ts` `surface` 필드 · `ai-proxy.routes.ts` 의 `surface==='hospital-drug'` 분기와 `performHospitalDrugRequest`.
- 유지(병원 앱 공유): `services/ai-tools/hospital-drug-surface.ts`(+composite) · `packages/hospital-pharmacy-core` · 저장 키 문자열 · `'hospital-drug'` surface/schema id.
- **주의**: 두 앱이 같은 neture.co.kr origin 에서 **같은 localStorage 키**를 공유한다(`hospital-pharmacy-core/src/domain.ts:43-44`, "기존 /hospital-drug 데이터셋과 형식 호환"). 삭제 시 이 키를 지우는 정리 코드를 넣으면 병원 기기 데이터가 사라진다.
- `scripts/ai/generic-file-understanding-smoke.mts` 참조 확인 필요.

### 7-4. funding · supplier

- market-trial 은 serviceKey scope 없음(`visibleServiceKeys` 제거됨). 화면 표기는 이미 "유통참여형 펀딩". URL 변경은 web-neture 약 22파일 + guide copy + **알림 row 의 `/market-trial/{id}` · `/supplier/market-trial/{id}`**. 테이블 · 패키지 · API 경로는 그대로 둘 수 있다.
- supplier 데이터는 serviceKey `neture` 에 의존하지 않음(`organization_members` → `neture_suppliers`). 의존은 프론트 가드(`neture:supplier` role + `requireMembership="neture"`)뿐.

### 7-5. store `/store` → `/my-store`

- web-store 약 37파일 + `store-ui-core/src/workspace/unifiedStoreHandoff.ts:24-68`(KPA/KCos/PH 레거시 경로 → store 경로 매핑, 유일한 앱 간 매핑).
- **공개 소비자 경로 `/store/:slug/*`**(서비스 앱의 QR 착지 · 블로그)와 이름이 겹친다 — 재편 범위를 store 앱으로 한정해야 한다.
- 서비스 앱 → store 진입 플래그 `VITE_UNIFIED_STORE_HANDOFF` 는 현재 3앱 모두 `false`(테스트가 `false` 를 단언). 원 IR 의 "공통 매장 작업공간" 은 아직 **사용자 경로에 열려 있지 않다**.

---

## 8. 선결 결정 (통합 WO 전 사용자 판단)

1. 옛 도메인 3개(kpa-society.co.kr · pharmacyhub.co.kr · k-cosmetics.site)를 **301 전용으로 영구 존치**할지 — 인쇄 QR 때문에 사실상 필수.
2. `*.neture.co.kr` 쿠키 공유를 SSO 로 받아들일지, admin 을 격리할지.
3. supplier · funding 을 neture-web 에서 **번들 분리**할지, 호스트 기반 라우팅으로 갈지.
4. 태블릿 · 사이니지 기기 이전 방식 — 재페어링 공지 vs 토큰 이관 bridge.
5. local agent · Chrome 확장 업데이트 배포 시점(호스트 이전보다 **먼저**).
6. 독립 커뮤니티 회원: ROLE-WORKSPACE V2 개정 + 새 테이블 · role(RBAC F9 WO) 수용 여부, 기존 참여자 자동 부여 여부.
7. PharmacyHub 고유 기능(opt-in 채널 · 단일결제 · 일반 약사 가입 · 뉴스/태블릿/매뉴얼)의 목적지.
8. 서비스 키 · role prefix 는 불변(표시명 · 호스트만 변경)으로 확정할지 — `retail` 을 키로 쓰지 않는 것 포함.

## 9. 별도 WO 후보 (이전과 무관하게 현재 결함)

- 화장품 공개 QR route 부재 + 호스트 3중 불일치 (§2-1).
- web-store 가 dead QR/태블릿 URL 복사 (§2-1).
- 상품 QR 기본 호스트 `neture.o4o.kr` (§2-1).
- `platform_services.entry_url` 의 `branch.kpa-society.co.kr` (§5).
- LB 잔재: `hospital.neture.co.kr` · `glucoseview.co.kr` host rule, `account.neture.co.kr` → 퇴역 backend. CORS 잔재 `forum.`/`shop.`.
- `RBAC-ROLE-CATALOG-V1.md:71` 의 `glucoseview:` prefix (기준 문서 drift — 보고만).

## 10. 미확인 (다음 조사에서 실측 필요)

- 운영 DB: 인쇄 대상 QR 수 · 제휴 QR `landing_url` 호스트 분포 · 페어링된 태블릿 수 · 운영자 입력 절대 URL 스캔. (ADC/프록시 필요)
- Google 콘솔 등록 origin 실제 목록 · Gabia DNS · LB url-map 현재 상태.
- 설치된 local agent 버전 분포 · Chrome 확장 설치 수.
- Toss 가맹점 콘솔 도메인 등록 여부.
