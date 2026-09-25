# CHECK — O4O URL 중심 서비스 재구성 G0/G1 전수 대응표

- 작성일: 2026-09-25
- 단계: **G0 (현재 상태) · G1 (데이터/외부 환경 실측)**. 구현 A~F 는 이 결과 검토 후 별도 지시로 진행한다.
- 선행: [`IR-O4O-URL-FIRST-SERVICE-RESTRUCTURE-ADDENDUM-V1`](../investigations/IR-O4O-URL-FIRST-SERVICE-RESTRUCTURE-ADDENDUM-V1.md) §0~§11 (결정 8건 = §11).
- 변경: 코드 · 운영 DB · DNS · LB · 배포 설정 **변경 0**. 운영 DB 는 Cloud SQL Auth Proxy + `default_transaction_read_only=on` 세션으로 **집계 SELECT 만** 실행(개인정보 미출력). GCP 는 `describe`/`list` 만.
- 판정: **G0 PASS · G1 PARTIAL** — 저장소 밖 콘솔 3건(Google · Toss · Gabia 관리 화면)과 발송 메일 · 설치 PC 현장 확인이 미확인.

---

## 0. 요약 — 실측이 바꾼 전제

| 항목 | 실측 (2026-09-25) | 의미 |
|---|---|---|
| 운영 `users` | **2명** (30일 신규 1) | 실사용자 기반이 사실상 없다. 회원 이관 · 재로그인 · 재동의 비용은 현재 거의 0 |
| `service_memberships` active | kpa-society 1 · pharmacy-hub 1 · k-cosmetics 2 · neture 2 · kpa-branch 1 | 원 IR/ADDENDUM 의 "PH-only 6명"은 **현재 0명** (과거 CHECK 인용값, users reset 이전) |
| 매장 QR `store_qr_codes` | 활성 kpa-society 32 · pharmacy-hub 21 / 비활성 44 · 생성 2026-06-05~09-15 | 스캔 누적 113건(kpa 41 · PH 72), **마지막 스캔 2026-09-09**. 실제 인쇄 · 배포 여부는 DB 로 판별 불가 |
| 제휴 QR `foreign_visitor_partner_qr_codes` | **0행** | `landing_url` DB 수정 필요 없음(현재). 호스트 표 코드만 교정 대상 |
| 태블릿 `store_tablet_devices` | 5대 · 전부 비활성 · **페어링 0** | 재연결 대상 현재 0 |
| 사이니지 재생 로그 · channel heartbeat | **0** | 매장 화면 북마크 영향 현재 없음 |
| 병원 기기 `hospital_devices` | **0** | |
| local agent `local_agent_devices` | 3대 · 모두 `0.1.0` · 최근 7일 접속 0 · 마지막 09-15 | 배포 파이프라인 없음(§5). 개발 PC 3대 수준 |
| PH 주문 | 6건 · 전부 `cancelled` · 미완료 0 | 미완료 거래 이관 없음 |
| PH opt-in 오퍼 | 19건(APPROVED 18 · PENDING 1) · 공급자 1곳 | 고유 채널 데이터는 존재 |
| 복수 서비스 가입 매장 | **0** (매장별 active enrollment 가 모두 단일 서비스) | Store Hub "복수 서비스 보기"는 현재 실데이터로 검증 불가 |
| 분회 | `kpa_organizations` type=`group` 211 (slug 보유) · `branch_sites` 2 · `branch_memberships` 3 · `branch_domains` 0 | 분회 URL 은 생성 가능 상태지만 실사용 사이트 2 |

**결론**: 현재 운영 데이터 기준으로 이전 비용의 대부분(회원 · 기기 · 제휴 QR · 미완료 주문)은 **0에 가깝다**. 남는 실질 위험은 ① 이미 만들어진 매장 QR 53개(활성)가 인쇄됐을 가능성, ② 저장소 밖 설정(Google · Toss · DNS), ③ 코드 · 인프라 변경량 자체다. 사용자 기반이 생기기 전이 가장 싼 전환 시점이다(판단은 사용자).

---

## 1. G0 — 현재 상태

| 항목 | 값 |
|---|---|
| `origin/main` | `62ed594cb` (조사 착수 시 `26ac02a60`) |
| 배포 게이트 | `DEPLOY_ENABLED=false` (repo variable, 갱신 2026-09-25T02:31Z) — 웹 · API 배포 전부 닫힘 |
| 진행 중 run | 없음 |
| 열린 PR | #235(Membership Termination WO 접수 · docs) · #206(auth-e2e 트리거 범위) · dependabot 3건. 본 재구성과 직접 충돌 없음. #235 의 membership 종료 설계는 커뮤니티 membership(결정 6)과 **겹칠 수 있으므로 B 착수 전 대조** |
| Cloud Run 서비스 | glucoseview-web(은퇴 잔재) · hospital-pharmacy-web · k-cosmetics-web · kpa-branch-web · kpa-society-web · lecture-web · neture-web · o4o-admin-dashboard · o4o-core-api · pharmacy-hub-web · signage-player-web · store-web |
| 기준 문서 개정 승인 범위 | 미승인. 결정 6(독립 커뮤니티) 구현 전 ROLE-WORKSPACE V2 · RBAC F9 · Boundary F6 해석 · KPA 구조 문서 개정이 **중지 조건**(CLAUDE.md) |

---

## 2. G1 — 인프라 실측

### 2-1. DNS · HTTPS (공개 DNS 8.8.8.8 · `curl` GET)

| 호스트 | DNS | HTTPS | 비고 |
|---|---|---|---|
| neture.co.kr · www · admin · store · study | 136.110.132.35 | 200 | |
| api.neture.co.kr | 136.110.132.35 | 404(루트) | 정상 (API) |
| kpa-society.co.kr · www | LB IP | 200 | |
| pharmacyhub.co.kr · www | LB IP | 200 | |
| k-cosmetics.site · www | LB IP | 200 | |
| **supplier · funding · partner · pharmacy · retail · kpa · community `.neture.co.kr`** | **NXDOMAIN** | — | 목표 호스트 전부 미생성 (funding 은 CORS 에만 존재) |
| signage.neture.co.kr · hospital.neture.co.kr | NXDOMAIN | — | hospital 은 LB rule 잔재 |
| **cosmetics.neture.co.kr · k-cosmetics.neture.co.kr** | **NXDOMAIN** | — | 서버가 다국어/제휴 QR · 대시보드 링크에 쓰는 호스트 → **현재 결함** |
| **neture.o4o.kr** | **NXDOMAIN** | — | 상품 QR 기본 호스트 → **현재 결함** |
| branch.kpa-society.co.kr | NXDOMAIN | — | `platform_services.entry_url` 값 → 결함 |
| 메일 MX (`k-cosmetics.site` · `neture.co.kr`) | **MX 없음** (SOA 만) | — | 화면에 표기된 `support@`·`info@`·`partner@`·`tour@k-cosmetics.site`, `support@neture.co.kr` 등은 **현재 수신 불가** |

경로 probe (GET): `/qr/<없는 slug>` 는 세 옛 호스트 모두 200 SPA 셸 — 착지 route 존재 여부와 무관하게 200 이므로 **HTTP 코드로는 QR 동작 판정 불가**(실 slug 브라우저 검증 필요). `www.neture.co.kr/hospital` → **neture-web 셸**(병원 앱 아님).

### 2-2. LB URL map `o4o-global-lb` (`gcloud compute url-maps describe`)

- 기본 backend = `backend-neture-web-http` (규칙 없는 호스트는 neture-web).
- host rule 12개. 주요 사실:
  - `neture.co.kr` → `path-matcher-neture-hospital` (`/hospital`,`/hospital/*` → hospital-pharmacy-web). **`www.neture.co.kr` 은 별도 matcher(`path-matcher-neture`)라 `/hospital` 규칙 없음 → 결함**.
  - `kpa-society.co.kr`+www → `/kpa/tablet/*`·`/kpa/store/*` → kpa-society-web (레거시), `/kpa`·`/kpa/*` → kpa-branch-web. **분회 이전 시 앞의 레거시 2개 규칙을 보존해야 한다.**
  - `api.neture.co.kr` 외 `api.kpa-society.co.kr`·`api.k-cosmetics.site`·`api.glucoseview.co.kr` 가 API 로 연결 (별칭).
  - 잔재: `glucoseview.co.kr`(+www) → glucoseview backend, `hospital.neture.co.kr` rule.
- 인증서 (Certificate Manager `o4o-main-cert-map`, 전부 ACTIVE):
  - `cm-cert-neture-v2` 1장이 **13개 도메인**(neture · www · admin · api · kpa-society · www · api · k-cosmetics.site · www · api · glucoseview · www · api)을 묶는다 — 만료 2026-12-07 (관리형 자동 갱신).
  - `cm-cert-pharmacyhub`(2026-11-01) · `cm-cert-lecture-v2` · `cm-cert-store-v1` · `cm-cert-siteguide`(은퇴 잔재).
  - **주의**: 새 호스트를 `cm-cert-neture-v2` 에 추가하면 13개 도메인 인증서 재발급이 걸린다. 선례(store · study)처럼 **호스트별 별도 인증서**로 추가해야 한다.

### 2-3. 저장소 밖 · 확인 불가 (게이트)

| 항목 | 확인 방법 | 미확인 영향 |
|---|---|---|
| Google Authorized JavaScript origins | GCP 콘솔 › API 및 서비스 › 사용자 인증 정보 › Web client(`GOOGLE_WEB_CLIENT_ID`) 화면 캡처 (gcloud 로 조회 불가) | 새 호스트에서 Google 로그인 버튼 실패. 호스트별 cutover 보류 |
| Toss 가맹점 콘솔 도메인/복귀 URL | Toss 개발자센터 상점 설정 캡처 | 결제 복귀(`window.location.origin` 기반) 실패 가능. 결제 경로는 KEEP 이므로 이전 대상 아님 |
| Gabia DNS 관리 화면 | 레코드 목록 캡처 | 공개 DNS 결과(§2-1)로 현황은 확인. TTL · 추가 권한만 미확인 |
| 발송 메일 수 (verify-email · 초대) | 메일 발송 로그 소스 조사 필요 | 옛 호스트 유지(결정 1)로 링크는 계속 동작 → 영향 낮음 |
| 매장 QR 인쇄 여부 | 매장(2~3곳) 현장 확인 또는 운영자 문의 | 옛 호스트 유지로 인쇄물 보호 → 영향 낮음 |

---

## 3. G1 — 운영 DB 실측 (read-only 집계)

쿼리 원문은 조사 세션 scratchpad 에 있으며 아래 표가 결과 전부다. 모든 쿼리는 집계만 출력했다.

| # | 대상 | 결과 |
|---|---|---|
| Q1 | `store_qr_codes` × 매장 enrollment | kpa-society 활성 32 · 비활성 37 / pharmacy-hub 활성 21 · 비활성 6 / k-cosmetics 비활성 1 |
| Q1c | `store_qr_scan_events` | kpa 41(30일 40) · PH 72(30일 70) · 스캔된 QR 90일 kpa 10 · PH 22 · 마지막 09-09 |
| Q2 | 제휴 QR · 스캔 | 0 · 0 |
| Q3 | 태블릿 기기 | kpa 5대 · 비활성 · 미페어링 |
| Q4 | 사이니지 | 플레이리스트 kpa global community active 1 · 재생 로그 0 · heartbeat 0 |
| Q5 | 병원 기기 | 0 |
| Q6 | `service_memberships` | 위 §0 · pending 0 · PH-only 0 · PH+KPA 겸 1 |
| Q7 | `checkout_orders` serviceKey | kpa-groupbuy 6 · pharmacy-hub 6 · k-cosmetics-event-offer 4 · glycopharm-event-offer 4 · neture 2(미완료 2) · null 1(미완료 1). PH 는 전부 cancelled |
| Q8 | PH opt-in 오퍼 | APPROVED 18 · PENDING 1 · 공급자 1 |
| Q9 | 포럼 | kpa-society 완료 2 · archived 1 · 게시글 6 / neture 완료 2 · 반려 1 · 게시글 1 / PH 반려 1 · 게시글 0 / k-cosmetics 0 |
| Q10 | 알림 `targetUrl` | `/operator` 26 · `/mypage` 4 · `/store` 2(kpa) · `/supplier` · `/market-trial` · 절대 URL **0** · 없음 24 |
| Q11 | 저장된 절대 URL | `platform_services.entry_url`: k-cosmetics=`https://k-cosmetics.site` · kpa-branch=`https://branch.kpa-society.co.kr`(NXDOMAIN) · kpa-society · pharmacy-hub · neture · lecture. `operator_qr_templates` 0 · community 링크 0 · `cms_contents`(63) · `store_blog_posts`(3) 본문의 옛 도메인 참조 **0** |
| Q12 | 분회 | §0 표 |
| Q13 | local agent | 기기 3 · 페어링 3(모두 소비) · 세션 30일 24 |
| Q14 | market trial | closed 1 · 참여자 0 |
| Q15 | 약사 프로필 | 1 · 미검증 |
| Q16 | 매장 enrollment | pharmacy-hub 8 · kpa-society 7 · neture 3 · k-cosmetics 2 · **복수 가입 매장 0** |
| 기타 | `organization_members` 3 · 활성 `role_assignments` 11 | |

---

## 4. 전수 대응표

열: **현재 → 목표 | 앱 / Cloud Run | 역할 · 가드 | serviceKey / prefix | 원장 · 연결 | 소비자 · 수량 | 인증·결제·기기 의존 | 필요 수정 | 검증 | 복원 | 처분 | 상태**
처분: KEEP · REDIRECT · HANDOFF · REPOINT · REMOVE. 상태: 확정 / 미정(사유).

### 4-1. 공개 · 소비자 · 기기 경로

| ID | 현재 → 목표 | 앱 | 역할·가드 | key | 원장 | 소비자·수량 | 의존 | 필요 수정 | 검증 | 복원 | 처분 | 상태 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | kpa-society.co.kr/qr/:slug → 옛 호스트 유지 · 신규 발급은 pharmacy.neture.co.kr/qr/:slug | kpa-society-web | consumer · 없음 | kpa-society | `store_qr_codes`(slug만) | 활성 32 · 스캔 41 | 없음 | 카탈로그 domain · fallback 하드코딩 4곳 | 옛/새 호스트 실 slug 착지 | 카탈로그 원복 | KEEP + REPOINT | 확정 |
| P2 | pharmacyhub.co.kr/qr/:slug | pharmacy-hub-web | consumer | pharmacy-hub | 동일 | 활성 21 · 스캔 72 | 없음 | PH 목적지 결정 후 | 동일 | — | KEEP | 미정(결정 7) |
| P3 | k-cosmetics.site/qr/* | k-cosmetics-web | — | k-cosmetics | 동일 | 활성 0 · 비활성 1 | — | **route 부재(결함)** | — | — | 결함 추적 | 미정 |
| P4 | neture.co.kr/qr/:slug · /p/:publicKey | neture-web | consumer | neture | `store_qr_codes` · product_landings | — | 없음 | 없음 | 착지 | — | KEEP | 확정 |
| P5 | /tablet/:slug · /tablet/setup (kpa · PH · kcos) → 옛 호스트 유지 · 신규는 새 호스트 | 각 서비스 웹 | device | 각 | `store_tablet_devices` | 5대 · 페어링 0 | localStorage `o4o.tablet.device` | 신규 URL 생성기 | 새 호스트 페어링 | LB 원복 | KEEP + REPOINT (재연결 기본안) | 확정 |
| P6 | /multilingual-products/:publicKey (kpa · PH) | kpa · PH 웹 | consumer | 각 | 다국어 콘텐츠 | 미측정 | 없음 | 중복 호스트 표(`multilingual-product-content.controller.ts:166-177`) · kcos `cosmetics.neture.co.kr`(NXDOMAIN) | 착지 | 원복 | KEEP + REPOINT | 확정 |
| P7 | /foreign-visitor/affiliate/:shortCode (kpa · PH) | kpa · PH 웹 | consumer | 각 | `foreign_visitor_partner_qr_codes` | **0행** | 없음 | 호스트 표(`foreign-visitor-partner-qr-code.service.ts:16-28`) | 생성 URL | 원복 | REPOINT (DB 수정 불요) | 확정 |
| P8 | 공개 /store/:slug/products/:id · /store/:slug/blog* (kpa) · /store/:slug/blog* (kcos) | kpa · kcos 웹 | consumer | 각 | `store_blog_posts` 3 | 소량 | 없음 | `/my-store` 재편에서 **제외** | 착지 | — | KEEP (+ 새 호스트 동일 경로) | 확정 |
| P9 | neture.co.kr/store/:storeSlug/product/:productSlug · /store/product/:offerId | neture-web | consumer | neture | offers | 미측정 | 없음 | 상품 QR 기본 호스트 `neture.o4o.kr`(NXDOMAIN) 교정 | QR 착지 | — | KEEP · 결함 추적 | 확정 |
| P10 | kpa-society.co.kr/kpa/tablet/:slug · /kpa/store/:slug/blog* | kpa-society-web (LB 전용 규칙) | consumer | kpa-society | — | 레거시 | 없음 | 분회 이전 시 LB 규칙 보존 | 레거시 착지 | — | KEEP | 확정 |
| P11 | /view/:snapshotId(/print) (kpa) | kpa-society-web | consumer | kpa-society | 스냅샷 | 미측정 | 없음 | 없음 | — | — | KEEP | 확정 |
| P12 | /public/signage · /signage/play/* (kpa) | kpa-society-web | device | kpa-society | `signage_playlists` 1 | 재생 로그 0 | 없음 | 새 호스트 동일 경로 | 재생 | 원복 | KEEP + REPOINT | 확정 |
| P13 | /store/marketing/signage/play/:id (kpa · kcos · store) · /store-owner/signage/play/:id (PH) | 각 | store_owner · device | 각 | playlists | 재생 0 | 로그인 | `/my-store` 재편 시 호환 경로 | 재생 | 원복 | KEEP (호환) | 확정 |
| P14 | signage-player-web `/signage/:serviceKey/channel/*` (run.app 만) | signage-player-web | device | path param | `channel_heartbeats` 0 | 0 | 없음 | 공개 호스트 부여 여부 결정 | — | — | KEEP | 미정(호스트 필요 여부) |
| P15 | neture.co.kr/hospital/* | hospital-pharmacy-web | device(`EnrollmentGate`) · /manage=super_admin | hospital-pharmacy | `hospital_devices` 0 | 0 | 쿠키 `hospitalDeviceToken` · localStorage | `www.neture.co.kr` 에 `/hospital` 규칙 누락(결함) · `hospital.neture.co.kr` 잔재 | 병원 화면 | — | KEEP | 확정 |
| P16 | neture.co.kr/hospital-drug | neture-web | device | — | localStorage 키 공유 | 미측정 | local agent | Neture 화면 · 전용 분기만 삭제, 공유 키 · surface 보존 | 병원 앱 회귀 | revision 원복 | REMOVE | 확정(범위 E) |
| P17 | neture.co.kr/cafe24 · api.neture.co.kr/api/v1/admin/cafe24/callback · /api/v1/cafe24-b2b/* | neture-web · API | 외부 앱 | cafe24-b2b | cafe24 연결 | 미측정 | Cafe24 OAuth | 없음 | — | — | KEEP | 확정 |

### 4-2. 인증 · 가입 · 메일

| ID | 현재 → 목표 | 앱 | 역할·가드 | key | 원장 | 소비자·수량 | 의존 | 필요 수정 | 검증 | 복원 | 처분 | 상태 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | /handoff (neture · kpa · branch · kcos · PH · store · lecture) → 새 호스트 각자 | 각 | public | 카탈로그 | handoff token(60s) | — | 토큰 localStorage | `service-catalog.ts` domain/basePath · exchange origin lock(store · 대표 홈) | 호스트 간 이동 | 카탈로그 원복 | HANDOFF | 확정 |
| A2 | /auth/verify-email (neture · kpa · kcos) | 각 | public | 카탈로그 | 토큰 | 발송 수 미확인 | 메일 절대 URL | 옛 호스트 route 유지 · 신규 메일은 새 호스트 | 옛/새 링크 | — | KEEP + REPOINT | 확정 |
| A3 | neture.co.kr/operator-invitations/accept | neture-web | 초대 토큰 + Google | — | 초대 | 미확인 | Google | 없음 | — | — | KEEP | 확정 |
| A4 | /login · /register (각 앱) | 각 | public | — | — | — | **Google JS origin(콘솔 미확인)** | 새 호스트 origin 등록 | 새 호스트 Google 로그인 | — | 신규 호스트별 | 미정(G1 게이트) |
| A5 | 인증 쿠키 `.neture.co.kr` | API | — | — | — | admin 은 쿠키 전략 | 기존 공유 존재 | pharmacy · retail 추가 시 세션 동작 재현 | 로그인/로그아웃 교차 | — | 검증 대상 | 확정(A 묶음) |
| A6 | API CORS (`setup-middlewares.ts:39-102` 하드코딩) | API | — | — | — | — | — | 새 호스트 추가 · API 재배포 | preflight | revision 원복 | 신규 | 확정 |
| A7 | 가입 /join/pharmacy (kpa) · /join · /join/status (PH) · /kpa/join (branch) | 각 | public | 각 | `service_memberships` | pending 0 | — | 새 호스트 동일 | 가입 흐름 | — | KEEP + 새 호스트 | 확정 |
| A8 | 표기 메일 `@k-cosmetics.site`(Footer · Contact) · `@neture.co.kr` | kcos · 공통 | — | — | — | — | **MX 없음 → 수신 불가(현재 결함)** | 메일 수신 설정 또는 표기 교체 | 수신 테스트 | — | 결함 추적 | 미정(사용자: 메일 운영 방식) |

### 4-3. 커뮤니티

| ID | 현재 → 목표 | 앱 | 역할·가드 | key | 원장 | 소비자·수량 | 의존 | 필요 수정 | 검증 | 복원 | 처분 | 상태 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M1 | kpa-society.co.kr/forum/* → community.neture.co.kr/pharmacist | kpa-society-web → (담당 앱 미정) | 서비스 membership 파생 | `forum.service_code=kpa-society` | 포럼 완료 2 · 게시글 6 | 소량 | 로그인 | 커뮤니티 membership 모델(B) · 담당 앱 | 격리 | — | REDIRECT(목적지 생긴 뒤) | 미정(결정 6 구현 · 앱) |
| M2 | pharmacyhub.co.kr/forum/* → 동일 | pharmacy-hub-web | MembershipGate | pharmacy-hub | 반려 1 · 게시글 0 | 0 | — | 동일 | — | — | REDIRECT | 미정 |
| M3 | k-cosmetics.site/forum/* → community.neture.co.kr/retail | k-cosmetics-web | ProtectedRoute | k-cosmetics | 0 | 0 | — | 동일 | — | — | REDIRECT | 미정 |
| M4 | neture.co.kr/forum/* · /community (o4o-general) | neture-web | authenticated | neture | 완료 2 · 반려 1 · 게시글 1 | 소량 | — | 존치/분류 결정 | — | — | KEEP (결정 전 숨김·삭제 금지) | 미정 |

### 4-4. 매장 작업공간

| ID | 현재 → 목표 | 앱 | 역할·가드 | key | 원장 | 소비자·수량 | 의존 | 필요 수정 | 검증 | 복원 | 처분 | 상태 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | store.neture.co.kr/store/* → /my-store/* | store-web | StoreGate | (없음, org 중심) | enrollments | enrollment 20 · 복수 가입 0 | 로그인 | `WORKSPACE_PATHS` · 약 37파일 · `unifiedStoreHandoff.ts` RULES(F3) | 구 경로 리다이렉트 | revision 원복 | REDIRECT(앱 내) | 확정 |
| S2 | store.neture.co.kr/hub/* · /store-hub/* | store-web | StoreGate | — | — | — | — | 없음 | — | — | KEEP | 확정 |
| S3 | store.neture.co.kr/work/:serviceKey/* (kpa 19 · kcos 5 · PH 10) | store-web | StoreGate | path param | 각 | — | 결제 복귀 포함 | 화면 구성 결정 전 제거 금지 | — | — | KEEP | 미정(Store Hub 결정) |
| S4 | kpa-society.co.kr/store/* (약 70) · /store-hub/* | kpa-society-web | PharmacyGuard · HubGuard | kpa-society · `kpa:store_owner` | — | 매장 7 | `VITE_UNIFIED_STORE_HANDOFF=false` | 새 호스트 이동 vs store 로 handoff 개방 | — | 플래그 원복 | HANDOFF(점진) | 미정(Store Hub 결정) |
| S5 | k-cosmetics.site/store/* (약 55) · /store-hub/* | k-cosmetics-web | StoreOwnerRoute | k-cosmetics · `cosmetics:store_owner` | — | 매장 2 | 동일 | 동일 | — | — | HANDOFF(점진) | 미정 |
| S6 | pharmacyhub.co.kr/store-owner/* (약 37) · /store-hub | pharmacy-hub-web | StoreOwnerShell | pharmacy-hub | — | 매장 8 | 동일 | PH 결정 | — | — | KEEP | 미정(결정 7) |
| S7 | 결제 복귀: neture /store/payment/* · PH /store-owner/payment/* · PH·kpa·store foreign-visitor payment/* · store /work/pharmacy-hub/payment/* | 각 | store_owner | 각 | `checkout_orders` | 미완료 PH 0 · neture 2 · null 1 | **Toss(콘솔 미확인)** | 없음 | — | — | KEEP | 확정 |
| S8 | neture.co.kr/store/cart · /store/orders · /store/manage/* (B2B 구매자) | neture-web | 라우터 가드 없음(백엔드) | neture | `checkout_orders` | neture 2 | 결제 | 없음 | — | — | KEEP | 확정 |

### 4-5. 공급자 · 펀딩 · 파트너

| ID | 현재 → 목표 | 앱 | 역할·가드 | key | 원장 | 소비자·수량 | 의존 | 필요 수정 | 검증 | 복원 | 처분 | 상태 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | neture.co.kr/supplier · /supplier/* (약 40) → supplier.neture.co.kr | neture-web | SupplierRoute(`neture:supplier` + neture membership) | neture | `neture_suppliers` · org members | 알림 `/supplier` 0 | **Chrome 확장 host_permissions** · local agent origin | 호스트별 진입 설계(결정 3) · DNS · 인증서 · LB · CORS · Google origin | 가드 · 링크 | LB 원복 | REDIRECT(목적지 검증 후) | 미정(설계) |
| F2 | /account/supplier/* · /workspace/* 레거시 | neture-web | — | — | — | — | — | 새 호스트로 재지정 | — | — | REDIRECT | 확정 |
| F3 | neture.co.kr/market-trial* → funding.neture.co.kr | neture-web | 참여자 가드 없음 | 없음(serviceKey 제거됨) | `market_trials` closed 1 · 참여 0 | 알림 0 | 없음 | 약 22파일 · guide copy · 알림 생성기 | 흐름 | 원복 | REDIRECT | 미정(설계) |
| F4 | /supplier/market-trial* · /operator/market-trial* | neture-web | supplier · operator | neture | 동일 | — | — | F1 · O1 과 함께 | — | — | 동반 이전 | 미정 |
| F5 | partner.neture.co.kr | 없음 | — | — | — | — | — | 주소 예약만(DNS 미생성) | — | — | 예약 | 확정 |
| F6 | kpa /supplier/event-offers · kcos /supplier/* · /seller/*(RoleNotAvailable) | 각 | — | — | — | — | — | supplier 호스트로 안내 | — | — | REDIRECT | 미정 |

### 4-6. 운영자 · 관리자

| ID | 현재 → 목표 | 앱 | 역할·가드 | key | 원장 | 소비자·수량 | 의존 | 필요 수정 | 검증 | 복원 | 처분 | 상태 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| O1 | neture.co.kr/operator/* (약 37: 회원 · 가입승인 · 포럼 · 상품승인 · **공급자 승인** · **펀딩 승인** · 홈 CMS) | neture-web | OperatorRoute(`neture:operator`+) | neture | 각 | 알림 `/operator` neture 6 | — | 위치 결정: neture 유지 vs admin.neture.co.kr 흡수 | 권한 | — | KEEP | 미정 |
| O2 | neture.co.kr/admin/* (약 57: AI 제어 · 역할 · 정산 · 상품마스터 · 약관) | neture-web | AdminRoute(`neture:admin`+) | neture | 각 | — | — | admin-dashboard 와 중복(상품마스터 · 사용자) 정리 여부 | 권한 상승 없음 | — | KEEP | 미정 |
| O3 | neture.co.kr/admin/platform/* | neture-web | PlatformRoute(super_admin) | platform | — | — | — | admin-dashboard `/users` 등과 중복 | — | — | KEEP | 미정 |
| O4 | admin.neture.co.kr/* | o4o-admin-dashboard | `platform:super_admin` 만 | platform | — | — | 쿠키 전략 | 없음 · 쿠키 세션 재현(A5) | 교차 로그아웃 | — | KEEP | 확정 |
| O5 | kpa-society.co.kr/operator/* (약 65) · /admin/* → pharmacy.neture.co.kr 동일 경로 | kpa-society-web | `kpa:operator`/`kpa:admin` | kpa-society · `kpa:` | — | 알림 16 | — | 호스트만 이동(F2 5-Block 유지) | 권한 | LB 원복 | REDIRECT(호스트) | 확정(시점 미정) |
| O6 | k-cosmetics.site/operator/* (약 50) · /admin/* → retail.neture.co.kr | k-cosmetics-web | `cosmetics:operator`/`admin` | k-cosmetics · `cosmetics:` | — | 알림 4 | — | 동일 | 권한 | — | REDIRECT(호스트) | 확정(시점 미정) |
| O7 | pharmacyhub.co.kr/operator/* (18) · /admin | pharmacy-hub-web | `pharmacy-hub:operator` | pharmacy-hub | — | — | — | PH 결정 | — | — | KEEP | 미정(결정 7) |
| O8 | kpa-society.co.kr/kpa/* (분회 전체, 운영 `/:slug/operator/*` 포함) → kpa.neture.co.kr/* | kpa-branch-web | 메뉴 게이트 + API 403 | kpa-branch · `kpa-branch:` | group 211 · sites 2 · members 3 · domains 0 | 소량 | — | `PLATFORM_HOSTS` · `PUBLIC_BASE_PATH` · vite base · Dockerfile · 카탈로그 · LB(레거시 `/kpa/tablet`·`/kpa/store` 보존) 한 단위 | 옛 `/kpa/:slug` 리다이렉트 | LB · revision 원복 | REDIRECT | 확정(시점 미정) |
| O9 | study.neture.co.kr/operator/* · hospital /manage | lecture-web · hospital | 각 | — | — | — | — | 없음 | — | — | KEEP | 확정 |

### 4-7. 저장 URL · 설치 소프트웨어 · 외부 설정

| ID | 대상 | 실측 | 처분 | 필요 수정 / 게이트 | 상태 |
|---|---|---|---|---|---|
| D1 | `platform_services.entry_url` | 6개 값, `branch.kpa-society.co.kr` NXDOMAIN | REPOINT (데이터 수정 = 사용자 승인) | 새 호스트 확정 후 일괄안 제시 | 미정 |
| D2 | 알림 `metadata.targetUrl` | 절대 0 · `/store` 2 · `/operator` 26 · `/mypage` 4 | 앱 내 호환 route | `/store`→`/my-store` 는 store-web 한정이므로 kpa `/store` 알림 영향 없음 | 확정 |
| D3 | CMS · 블로그 · QR 템플릿 · 커뮤니티 링크 절대 URL | 0 | 조치 없음 | — | 확정 |
| X1 | local agent (`tools/o4o-local-agent`) | 기기 3 · v0.1.0 · 7일 접속 0 | 새 호스트 허용 버전 선배포(결정 5) | **배포 수단 없음**(아래 §5) | 미정 |
| X2 | Chrome 확장 v0.0.2 | 서버 보고 없음 → 수량 불명 | 동일 | 배포 수단 없음 · 개발자 모드 로드 | 미정 |
| X3 | 모바일 앱 | API env · `neture.co.kr/login` | KEEP | — | 확정 |
| X4 | Google JS origin | 미확인 | — | 콘솔 캡처 | G1 게이트 |
| X5 | Toss 콘솔 | 미확인 | — | 콘솔 캡처 | G1 게이트 |
| X6 | LB · 인증서 · DNS | §2 실측 | — | 새 호스트 = 별도 인증서 | 확정 |

---

## 5. local agent · Chrome 확장 — 배포 방식과 설치 확인 방법

**현재 배포 수단은 없다.**
- local agent: package.json · 설치 프로그램 · 릴리스 workflow · 다운로드 링크 · 자동 업데이트 전부 없음(`CHECK-O4O-LOCAL-WORK-AGENT-V0.md:22` 가 명시적으로 범위 밖). 실행 = Node 18+ 설치 후 `node src/index.mjs run`, Chrome 연결은 `install-native-host.mjs` 가 HKCU 레지스트리 등록. 사실상 저장소 `tools/` 폴더 복사.
- Chrome 확장: 웹스토어 미게시 · `update_url` 없음 · 개발자 모드 unpacked 로드(ID `lpjfjaabelhajonbiankhmfkbmonhcgc`).
- 웹 진입: neture `/mypage/settings` 의 `LocalAgentCard`(연결 버튼만, 다운로드 없음) · `/hospital-drug`(상태 표시).

**설치 확인 방법 (현재 가능한 것)**
| 방법 | 알 수 있는 것 | 한계 |
|---|---|---|
| `local_agent_devices` 집계 (§3 Q13) | 페어링된 PC 수 · 최근 접속 | `agent_version` 은 **최초 페어링 시점 값**만 저장(이후 갱신 안 함) |
| 웹 페이지의 `127.0.0.1:47821/health` 호출 | 그 PC 에서 실행 중인 실제 버전 | 사용자가 해당 페이지를 열어야 함 · 서버 기록 없음 |
| 현장 확인 | `chrome://extensions` · HKCU `...\NativeMessagingHosts\com.neture.o4o_agent_bridge` | 수작업 |

**함의**: 결정 5("새 호스트 허용 버전 선배포 → 확인 → 전환")를 지키려면 배포 · 버전 보고 수단이 먼저 필요하다. 다만 실측 3대(개발 PC 수준)이므로, 현재는 **수동 교체 + `/health` 확인**으로 충분하고, 배포 파이프라인 · heartbeat 버전 갱신은 실사용 보급 전의 별도 과제로 둘 수 있다(사용자 판단).

---

## 6. 사업 판단 선택안

### 6-1. PharmacyHub 기능 목적지

실측: 활성 회원 1(KPA 겸) · PH-only 0 · 매장 enrollment 8 · 활성 QR 21 · 주문 6(전부 취소) · opt-in 오퍼 19(공급자 1). store-web 에 이미 `/work/pharmacy-hub/*`(상품 · 장바구니 · 주문 · 결제 10 route) 존재.

| 안 | 내용 | 영향 |
|---|---|---|
| **A. 서비스 존속 · 사이트만 이전** (권장) | `pharmacy-hub` 키 · 가입 · opt-in 채널 · 단일결제 유지. 매장 기능은 store.neture.co.kr `/work/pharmacy-hub` 로, 커뮤니티는 community `/pharmacist` 로, 운영 콘솔은 pharmacy.neture.co.kr 또는 admin 쪽 배치. pharmacyhub.co.kr 은 QR · 결제 복귀용으로 존치 | 사업 규칙 변경 0. 운영 콘솔 위치만 결정. 기존 store-web 경로 재사용 |
| B. 약국 서비스(kpa-society)로 흡수 | opt-in 채널 · 단일결제 · 일반 약사 회원을 KPA 에 추가, PH 키는 과거 데이터용으로만 보존 | KPA 승인 채널과 opt-in 정책이 한 서비스 안에서 공존 → 사업 판단 필요. KPA F2 · 서비스 구조 문서 개정. 공급자 1곳 · 오퍼 19 재분류 |
| C. 서비스 은퇴 | 기능별 폐기 확인 후 종료, 데이터 보존 | 현재 활성 데이터가 거의 없어 비용은 낮음. opt-in 채널이라는 **사업 모델 하나를 없애는 결정** |

### 6-2. 기존 커뮤니티 참여자 처리

실측: 서비스 활성 회원 합계 7행(사용자 2명) · 포럼 게시글 kpa 6 · neture 1 · PH 0 · kcos 0.

| 안 | 내용 | 영향 |
|---|---|---|
| A. 자동 부여 | 서비스 active 회원에게 해당 커뮤니티 membership `active` 생성 | 대상 수 명 · 결정 6의 "독립 가입" 취지와 어긋남 · 데이터 write(승인 대상) |
| **B. 자동 부여 없음 · 재가입** (권장) | 커뮤니티는 신규 가입 · 승인으로만 시작. 기존 게시글은 원장 그대로 보존 · 표시 | 현재 사용자 2명이라 부담 최소. 기존 작성자가 가입 전엔 쓰기 불가(읽기 · 자기 글 표시는 정책으로 정함) |
| C. 경과 조치 | 기존 참여자에게 `pending` 생성 → 운영자 승인 | 이관 데이터 write 필요 · 운영자 승인 작업 발생. 사용자가 늘어난 뒤라면 의미 있음 |

`o4o-general`(neture 포럼 2 · 게시글 1)의 존치/분류는 별도 결정(M4).

### 6-3. Store Hub 화면 구성

실측: 매장 enrollment 20 · **복수 서비스 가입 매장 0**. 현재 store-web 상단 메뉴 6개(홈 · 내 매장 · 서비스 업무 · 매장 HUB · 내 서비스 · 설정) + `/work/:serviceKey`.

| 안 | 내용 | 영향 |
|---|---|---|
| A. 통합 목록 | Hub · 내 매장에서 서비스 구분 없이 합쳐 보여주고 출처 배지 표시 | 화면 단순. 서비스별 규칙(승인 채널 · 결제)이 다른 항목이 한 목록에 섞임 → 행 단위 규칙 표시 필요 |
| B. 서비스 탭 | 상단에 가입 서비스 탭, 탭별 목록 | 현재 `/work/:serviceKey` 와 가까움 · 구현 작음. 서비스가 1개면 탭이 불필요한 층 |
| **C. 혼합** (권장) | Hub(콘텐츠 · 상품 소스)와 내 매장(매장 정보 · QR · 사이니지 등 공통)은 통합, 주문 · 결제 · 서비스 고유 업무는 `/work/:serviceKey` 유지 | 현행 구조와 가장 가깝고 `/work` 제거 금지 조건과 맞음. 복수 가입 실데이터가 0 이라 **테스트 매장으로 검증해야 함** |

---

## 7. 이번 조사로 확인된 현재 결함 (이전과 무관 · 별도 추적)

1. `cosmetics.neture.co.kr` · `k-cosmetics.neture.co.kr` NXDOMAIN — 서버가 생성하는 화장품 다국어/제휴 QR · 대시보드 링크가 열리지 않음. K-Cosmetics 앱에 `/qr` · `/multilingual-products` · `/foreign-visitor` route 없음.
2. `neture.o4o.kr` NXDOMAIN — Neture 상품 QR/전단 기본 호스트(`neture.routes.ts:550-555`) · `SellerQRGuidePage.tsx:18`.
3. `www.neture.co.kr/hospital` 이 병원 앱이 아닌 neture-web 으로 연결(LB `path-matcher-neture` 에 `/hospital` 규칙 없음).
4. `k-cosmetics.site` · `neture.co.kr` MX 레코드 없음 — 화면에 표기된 문의 메일 주소 수신 불가.
5. `platform_services.entry_url` 의 `https://branch.kpa-society.co.kr` NXDOMAIN.
6. web-store 가 존재하지 않는 `/qr` · `/tablet` URL 을 `window.location.origin` 으로 만들어 복사 제공.
7. 잔재: LB `glucoseview.co.kr` · `api.glucoseview.co.kr` · `hospital.neture.co.kr` rule, `cm-cert-siteguide`, Cloud Run `glucoseview-web`.

---

## 8. G1 미완료 게이트 (전환 전 필요)

| 게이트 | 필요한 증빙 | 누가 |
|---|---|---|
| Google JS origin 목록 | 콘솔 캡처 | 사용자 |
| Toss 상점 도메인/복귀 URL | 콘솔 캡처 | 사용자 |
| 매장 QR 인쇄 여부 | 매장 확인 | 사용자 |
| local agent · 확장 설치 PC | 현장 또는 `/health` | 사용자 |
| 발송 메일 로그 | 메일 발송 기록 소스 조사 | 다음 조사 |
| 기준 문서 개정 승인 | ROLE-WORKSPACE V2 등 개정 범위 승인 | 사용자 |
