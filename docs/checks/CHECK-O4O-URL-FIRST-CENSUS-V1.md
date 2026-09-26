# CHECK — O4O URL 중심 서비스 재구성 G0/G1 전수 대응표

> **이 문서는 URL 재구성 통합 작업의 단일 TODO 이다** (2026-09-26 사용자 지시 · 실행 규칙: 큰 목표 1 = 작업 1, 새 문제 발견 ≠ 새 WO). 진행 기록은 §21.
>
> **INITIAL_PURPOSE** — 기존 서브디렉토리와 독립 도메인에 흩어진 O4O 기능을 확정된 URL 체계에 배치한다. 서비스별 운영 영역 · 독립 커뮤니티 · 매장 Hub 와 내 매장의 경계를 코드와 주소에서 일치시키고, 기존 QR · 인증 · 주문 경로가 전환 과정에서 끊기지 않게 한다.
>
> **CONFIRMED_DECISIONS** — 약국 `pharmacy.neture.co.kr` · 소매 `retail.neture.co.kr` · KPA 분회 `kpa.neture.co.kr/{분회}` · 커뮤니티 `community.neture.co.kr/pharmacist`·`/retail`(서비스 회원과 별도 가입) · 매장 `store.neture.co.kr/hub`·`/my-store`(서비스별 거래 화면은 필요한 범위에서 유지) · 공급자 `supplier.neture.co.kr`(공급자 도메인 기준 재사용) · 파트너 `partner.neture.co.kr` 예약(공급자 기능을 파트너로 되돌리지 않음) · 펀딩 `funding.neture.co.kr` · 병원약국 공개 화면 `neture.co.kr/hospital` · Cafe24 `neture.co.kr/cafe24` 유지 · 운영은 `admin.neture.co.kr` 고려하되 O4O 운영자에게 `platform:super_admin` 비부여. Neture 중복 `/hospital-drug` 제거(병원 앱 공유 저장 키 · 기기 데이터 보존). `pharmacyhub.co.kr` 에 새 독립 서비스 불가, 기존 호스트 HTTPS · QR · 호환 경로 · 데이터 식별자는 안전한 목적지 검증까지 보존. 서비스 키 · role prefix 일괄 변경 금지. **환불은 별도 확정 정책**(오프라인 처리 + 수기 기록, `WO-O4O-OFFLINE-REFUND-MANUAL-RECORD-ONLY-V1`) — PG 자동 환불을 이 작업에 다시 넣지 않는다. 그 밖의 확정 결정은 §9 · §12.
>
> **OUT_OF_SCOPE** — 새 사업 기능 개발 · PharmacyHub 데이터의 근거 없는 일괄 이관 · 폐기 · 환불 자동화 · signage 새 공개 도메인 · 운영 DB 무승인 쓰기. 사업 · 계약 판단이 남은 부분(opt-in 채널의 KPA 편입 등)은 현재 기능을 보존하고 결정 · 검증 조건을 이 문서에 표시한다.
>
> **DONE_CRITERIA** — ① 확정된 각 주소에서 의도한 앱 · 권한 화면이 열리고 직접 접속 · 새로고침 · 로그인 복귀 통과 ② 기존 인쇄 QR · 보존 대상 링크가 열리고, 인증 · 결제 옛 경로는 경로별 검증 결과 보유 ③ 관리자 세션 사용자 교체 미재현 · O4O 운영자가 관리자 전체 권한을 얻지 않음 ④ 다중 서비스 가입 매장 · 별도 커뮤니티 가입자 · 비로그인 병원 화면 핵심 흐름 검증 ⑤ 환불 자동 실행 경로 신설 0 · 의약품 거래 차단 유지 ⑥ 코드 준비 · 외부 설정 확인 · 운영 배포 결과를 구분 보고, 미확인 콘솔 · 현장 항목이 있으면 해당 전환 **미완료** + 필요한 증빙 명시.
>
> 방향 변경 시 먼저 기록: 원래 목적 · 새 발견 · 변경 이유 · 원래 목적과의 관계 · 범위 확대 여부 · 완료 기준 변경 여부.

- 작성일: 2026-09-25
- 단계: G0 · G1 조사(§0~§20) 완료 → **2026-09-26 부터 통합 TODO 로 구현 진행 중**(진행 상태 = §21). 운영 전환은 외부 설정 증빙과 `DEPLOY_ENABLED` 개방 후에만 완료로 표시한다.
- 선행: [`IR-O4O-URL-FIRST-SERVICE-RESTRUCTURE-ADDENDUM-V1`](../investigations/IR-O4O-URL-FIRST-SERVICE-RESTRUCTURE-ADDENDUM-V1.md) §0~§11 (결정 8건 = §11).
- 변경: 코드 · 운영 DB · DNS · LB · 배포 설정 **변경 0**. 운영 DB 는 Cloud SQL Auth Proxy + `default_transaction_read_only=on` 세션으로 **집계 SELECT 만** 실행(개인정보 미출력). GCP 는 `describe`/`list` 만.
- 판정: **G0 PASS · G1 PARTIAL** (사용자 동의 2026-09-25 · 결정 = §9 · PH 대응 설계 = §10 · 커뮤니티 권한 설계 = §11 · 2차 결정 = §12 · B 모델 = §13 · 결제 = §14 · 운영자 권한 = §15 · 호스트 진입 = §16 · Store Hub = §17 · 커뮤니티 모델 = §18 · 현재 결함 = §19 · 다음 판단 = §20) — 저장소 밖 콘솔 3건(Google · Toss · Gabia 관리 화면)과 발송 메일 · 설치 PC 현장 확인이 미확인.

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
| 메일 MX (`k-cosmetics.site` · `neture.co.kr`) | **MX 없음** (SOA 만) | — | **MX 없음, 실제 수신 미검증.** MX 가 없으면 SMTP 는 도메인 주소(A) 레코드로 배달을 시도할 수 있으므로 수신 불가로 확정할 수 없다. 표기 주소(`support@`·`info@`·`partner@`·`tour@k-cosmetics.site`, `support@neture.co.kr` 등)별 실제 수신 시험 또는 메일 운영 설정 확인으로 판정 |

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
| P14 | signage-player-web `/signage/:serviceKey/channel/*` (run.app 만) | signage-player-web | device | path param | `channel_heartbeats` 0 | 0 | 없음 | **새 공개 도메인 배정 안 함**(결정 2026-09-25) | — | — | KEEP | 확정 |
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
| A8 | 표기 메일 `@k-cosmetics.site`(Footer · Contact) · `@neture.co.kr` | kcos · 공통 | — | — | — | — | **MX 없음, 실제 수신 미검증** | 주소별 수신 시험 결과에 따라 결정 | 주소별 수신 시험 | — | 검증 대상 | 미정(수신 시험) |

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
| O1 | neture.co.kr/operator/* (약 37: 회원 · 가입승인 · 포럼 · 상품승인 · **공급자 승인** · **펀딩 승인** · 홈 CMS) | neture-web | OperatorRoute(`neture:operator`+) | neture | 각 | 알림 `/operator` neture 6 | — | 목표 = admin.neture.co.kr (O4O 운영). **기능별 소유자 · 이전 경로 확인 전까지 유지.** 선결: admin-dashboard 는 `platform:super_admin` 전용이라 `neture:operator` 진입 불가 → 운영자 진입 허용은 권한 · route 변경(중지 조건) | 권한 | — | KEEP (→ 기능별 이전) | 확정(방향) · 시점 미정 |
| O2 | neture.co.kr/admin/* (약 57: AI 제어 · 역할 · 정산 · 상품마스터 · 약관) | neture-web | AdminRoute(`neture:admin`+) | neture | 각 | — | — | 목표 = admin.neture.co.kr. 중복(상품마스터 · 사용자) 기능별 소유자 확정 후 이전 | 권한 상승 없음 | — | KEEP (→ 기능별 이전) | 확정(방향) · 시점 미정 |
| O3 | neture.co.kr/admin/platform/* | neture-web | PlatformRoute(super_admin) | platform | — | — | — | admin-dashboard `/users` 등과 중복 — 기능별 대조 후 정리 | — | — | KEEP | 확정(방향) · 시점 미정 |
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
4. `k-cosmetics.site` · `neture.co.kr` MX 레코드 없음 — **실제 수신 미검증**(MX 부재만으로 수신 불가 확정 아님). 표기 주소별 수신 시험 필요.
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

---

## 9. 결정 기록 (2026-09-25, G0/G1 검토 후 사용자 판정)

| 항목 | 결정 |
|---|---|
| 판정 | G0 PASS · G1 PARTIAL 동의. 활성 QR 53 · 스캔 기록이 있으므로 **옛 주소 HTTPS 접근 계속 보호** |
| PharmacyHub | **§6-1 B안 수정 진행** — 별도 서비스로 존속시키지 않고 약국 서비스로 기능 흡수. **직접 공급(opt-in) 채널과 단일 결제의 동작 · 데이터는 없애지 않는다.** `pharmacy-hub` 키는 기존 QR · 오퍼 · 주문을 읽는 호환 식별자로 보존, 신규 가입 서비스로 노출하지 않음. 대응이 안전하지 않은 기능은 **기존 경로 유지 · 전환 보류** |
| 기존 커뮤니티 참여자 | **§6-2 B안** — 자동 가입 없음. 커뮤니티별 신청 · 승인. 기존 글 · 작성자 연결 보존. 가입 전 열람 · 본인 글 수정 권한을 명시 설계(§11) |
| Store Hub | **§6-3 C안 혼합형** — `/hub` · `/my-store` 상위 진입, 서비스 고유 주문 · 결제는 `/work/:serviceKey`. 복수 서비스 가입 테스트 매장으로 화면 · 권한 검증 |
| 운영 영역 | 약국 · 소매 서비스 운영자 = 각 서비스 호스트. 공급자 · 펀딩 · 커뮤니티 등 O4O 운영 = **기존 `admin.neture.co.kr`**. Neture `/operator` · `/admin` 은 기능별 소유자 · 이전 경로 확인 전까지 유지(O1~O3 반영) |
| signage-player-web | 새 공개 도메인 배정 안 함(P14 반영) |
| 메일 | "MX 없음 → 수신 불가" 표현 정정 → **MX 없음, 실제 수신 미검증**. 주소별 수신 시험으로 판정(§2-1 · A8 · §7 반영) |
| 게이트 | Google · Toss · DNS 콘솔 증빙과 QR 인쇄 여부는 **해당 호스트 실제 전환 전 게이트**로 유지. 그동안 코드 경로 · 권한 설계 조사 계속 |
| 구현 · 배포 | A~F 구현 · 배포 **미착수 유지** |

**운영 영역 결정에서 드러난 선결 제약**: `admin.neture.co.kr`(admin-dashboard)은 전체가 `AdminProtectedRoute requiredRoles=['platform:super_admin']` 이라 `neture:operator` 는 들어갈 수 없다. O4O 운영 업무를 옮기려면 admin-dashboard 에 운영자 진입 · 역할별 메뉴를 여는 **권한 · route 변경**이 필요하다(CLAUDE.md 중지 조건 → 해당 구현 시 승인 요청).

---

## 10. PharmacyHub → 약국 서비스 대응 설계

### 10-1. 실측 (운영 DB read-only 집계, 2026-09-25)

| 대상 | 실측 | 함의 |
|---|---|---|
| PH 매장 조직 (`organizations` type=pharmacy, code `ph-pharm-*`) | **8곳 · 활성 구성원 0곳** (`organization_members` 활성 행 0) · 사업자번호 보유 1 · KPA 조직과 사업자번호 충돌 0 · KPA enrollment/slug 0 · PH slug 8 | **옮길 매장 경영자가 없다.** 조직 · 자산만 남은 상태(사용자 reset 이후 고아 조직) |
| PH 매장 경영자 준비도 | owner/admin/manager 0명 → KPA 이관 대상 0 · 409 모호성 대상 0 | 사람 단위 이관 작업 없음 |
| `service_memberships` pharmacy-hub | 1행 · role `pharmacy-hub:operator` · 동일 사용자 KPA active | 운영자 1명(KPA 운영자 겸임) |
| `role_assignments` | `pharmacy-hub:admin` 1 · `pharmacy-hub:operator` 1 (/ `kpa:admin` · `kpa:operator` · `kpa:store_owner` 각 1) | PH 운영 권한 보유자가 KPA 운영 권한도 보유 |
| opt-in 오퍼 | **19건 · 공급자 1곳** · 전부 `distribution_type=SERVICE` · 키는 `pharmacy-hub` 만 · KPA 승인 0 · PH 가격행 1 · **의약품 규제(`regulatory_type` DRUG) 6건** | KPA 로 흡수 시 오퍼 19건의 노출 경로 설계 필요. 의약품 6건은 별도 정책 대조 |
| PH 조직 listing | 19건 · 1개 조직(구성원 없음) · 전부 opt-in 오퍼 | 소유자 없는 조직의 진열 |
| 장바구니 · 주문 · 결제 | 장바구니 0 · 주문 6(전부 cancelled, 결제그룹 5, 구매자 1) · `o4o_payments` CREATED 6 · `neture_orders` pharmacy-hub/kpa-society 0 | 진행 중 거래 없음 → 읽기 전용 호환 기록 |
| 조직 단위 자산 | QR 27 · 로컬 상품 4 · 실행 자산 7 · 플레이리스트 1 · 태블릿 5 · 매장 콘텐츠 0 | 조직 키라 조직이 남으면 그대로 보존 |
| 서비스 키 자산 | POP · 블로그 · 사이니지 미디어/스케줄 · 권한(entitlement) 0 · screen set 5(`service_key` 비어 있음) | 재키잉 대상 사실상 없음 |
| 콘텐츠 · 법무 | `cms_contents` knowledge 3(archived) · LMS 0 · 알림 0 · 약관 동의 1 · PH 약관/개인정보 문서 published | 문서는 보존 · 신규 동의는 KPA 문서로 |

### 10-2. 대상별 대응

| PH 대상 | 현재 키 · 소유 · 가드 | 약국 서비스 대응 | 판정 |
|---|---|---|---|
| 신규 가입 (`POST /pharmacy-hub/join`) | 카탈로그 `joinEnabled` 를 **무시**하는 자체 route | route 차단 + 카탈로그 `joinEnabled=false` + PH 웹 가입 진입 제거. 신규 약사는 KPA 가입 | 확정 방향 · **API 계약 변경 = 구현 시 승인** |
| PH 회원 · `pharmacy-hub:member` | 활성 0 | 대응 없음. 기록 보존 | 확정 |
| `pharmacy-hub:store_owner` | 활성 0 | 대응 없음 | 확정 |
| `pharmacy-hub:operator` · `:admin` (1명, KPA 운영자 겸) | 회원 콘솔 · fulfillment 복구 콘솔 | 회원 승인 → KPA 운영자 콘솔. 단일결제 복구 콘솔 → §10-4 결정 후 pharmacy 호스트 운영 메뉴로 | 방향 확정 · 콘솔 이전은 §10-4 종속 |
| 매장 조직 8곳 (구성원 0) | `pharmacy-hub` enrollment · slug | **KPA enrollment 를 붙이지 않는다**(소유자 없음 · 모호성 유발 방지). 조직 · slug · 자산은 그대로 두어 옛 QR 이 계속 착지. 소유자가 나타나면 KPA 매장 개설 절차로 신규 조직 생성 후 자산 이관은 별도 판단 | 확정 제안 |
| 활성 QR 21 (조직 8 소속) | `pharmacyhub.co.kr/qr/{slug}` | 옛 호스트 유지(결정 1). 조직이 소유자 없이 남으므로 착지 페이지는 현행 PH 공개 route | 확정 |
| opt-in 오퍼 19 · listing 19 | `service_keys` + opt-in 전략 · 공급자 1 | **§10-3 모델 선택 전까지 기존 PH 경로 유지 · 전환 보류** | 보류 |
| 단일 결제 | PH 어댑터 + 공통 core | §10-4 | 보류 |
| 주문 6 · 결제 6 (전부 미완료 종결) | `metadata.serviceKey=pharmacy-hub` | 읽기 전용 호환 기록. 키 변경 · 삭제 없음 | 확정 |
| 콘텐츠 · 포럼 · 약관 | `cms_contents` 3 archived · 포럼 반려 1 · PH 약관 | 보존. 포럼은 이미 약사 커뮤니티 공용(`community-catalog.ts:64`) — 새 커뮤니티 설계(§11)로 흡수 | 확정 |
| PH 고유 화면 `/news` · `/store-owner/tablets` · `/store-owner/manuals` | PH 웹 | 뉴스 = KPA 뉴스 라우터(데이터 없음) · 태블릿 = KPA/공통 store 태블릿(조직 키) · 매뉴얼 = 직접 대응 없음(가장 가까운 것은 `/api/v1/store/handled-products/qr`) | 매뉴얼만 목적지 미정 |
| web-store `/work/pharmacy-hub/*` | PH scope guard · enrollment 필요 | 흡수 후 `/work/kpa-society` 로 수렴. **주의**: `serviceContext.ts` 우선순위가 KPA → KCos → PH 라, PH 조직에 KPA enrollment 를 붙이면 공통 화면이 KPA API 로 바뀌어 권한 없는 사용자가 실패 | 확정 제안 |

### 10-3. opt-in 채널 보존 방식 (핵심 결정)

현재 KPA 는 **승인 채널**이다. KPA 카탈로그 · `/orderable` · B2B checkout 이 모두 `offer_service_approvals` approved 행을 요구하고, `setServiceDelivery` 는 승인 채널 키(kpa-society)에 opt-in 을 거부하며, 두 목록이 겹치지 않는다는 불변식이 기동 시 검사된다(`offer-exposure-strategy.ts:42-51`). 따라서 opt-in 오퍼는 지금 KPA 매장에 도달할 수 없다.

| 모델 | 내용 | 영향 |
|---|---|---|
| A. 호환 채널 | KPA 매장 안에 `pharmacy-hub` opt-in 채널을 내부 채널로 유지. PH scope guard 가 `kpa:store_owner`+kpa-society membership 을 받도록, PH 조직 resolver 를 KPA linkage 로 변경. checkout 은 `pharmacy-hub` 키 유지 | `pharmacy-hub` 가 "읽기 호환 식별자"를 넘어 **운영 채널 키로 계속 쓰임** → 결정의 "호환 식별자로만 보존"과 부분 충돌. 코드 변경은 가장 작음 |
| B. 복합 전략 | `kpa-society` 에 "승인 **또는** opt-in" 전략. 공급자가 kpa-society 로 직접 opt-in 가능 | 불변식(두 목록 비중첩) 폐기 · KPA 카탈로그/orderable/apply/checkout · 공급자 주문 route allowlist · `neture_orders` 필터 전부 변경. **F8 "Checkout Guard 조건 변경 = WO + 구조 검토"** 대상. KPA 운영자 승인 없이 들어오는 상품이 생기는 사업 판단 |
| C. 자동 승인 | 공급자 opt-in 시 kpa-society 승인 행을 자동 생성 | 코드 변경 중간. KPA 운영자 승인 단계를 없애는 정책 변경 · F8 대상 |

**권고: 지금은 기존 PH opt-in 경로 유지 · 전환 보류(결정의 보류 조건 적용), B 를 기준안으로 구조 검토 WO 준비.**
근거: (1) 이관할 매장 경영자가 0명이고 오퍼 19건은 소유자 없는 조직 1곳에만 진열돼 있어 보류 비용이 거의 없다. (2) A 는 결정 문구와 충돌하고, B · C 는 Frozen F8 구조 검토와 "KPA 운영자 승인 없이 노출" 사업 판단이 필요하다. (3) 의약품 규제 6건이 섞여 있어, 어느 모델이든 KPA 노출 전에 의약품 거래 차단 정책과 대조해야 한다.

### 10-4. 단일 결제 보존

- KPA 에 동등 경로가 **이미 있다**: `POST /api/v1/store/cart/kpa-society/checkout-confirm-b2b`(조직 필수 · `pg_` paymentGroupId) + `/api/v1/kpa/b2b/payments/{prepare,confirm,order/:id}`(serviceKey `kpa-society`·`kpa-groupbuy`).
- PH 대비 결손 3가지: ① 결제 후 **그룹 단위 취소/환불** 없음 ② **운영자 수준** 정체 fulfillment 복구 없음(super_admin 복구만) ③ 브리지된 `neture_orders(service_key='kpa-society')` 를 **공급자 주문 목록 · 정산이 보지 못함**(`supplier-order.service.ts:43-60` · `supplier-unified-order.service.ts:117-120,173-186` · `neture-settlement.service.ts:186-189` 가 `neture` 만 필터).
- ③은 흡수와 무관하게 **현재도 KPA B2B 주문이 공급자에게 보이지 않을 수 있는 결함 후보**다(실측: `neture_orders` kpa-society 0행이라 현재 영향 0). 별도 추적.
- 권고: ①②③을 KPA 쪽에 채운 뒤에만 PH 단일 결제 경로를 닫는다. 그 전까지 PH 결제 경로 유지.

### 10-5. 흡수 순서 제안 (구현 착수 시)

1. PH 신규 가입 차단(route + `joinEnabled`) — 사람 이관 대상 0 이라 먼저 가능.
2. PH 운영 회원 콘솔 기능을 KPA 운영자 콘솔로 확인 · 정리(운영자 1명 겸임).
3. KPA B2B 결손 ①②③ 보강.
4. opt-in 모델 결정(§10-3) → F8 구조 검토 → 구현.
5. PH 공개 경로(`/qr` · `/tablet` · `/multilingual-products` · `/foreign-visitor/affiliate`)는 **옛 호스트에서 계속 제공**. PH 웹 런타임 종료는 G5 판정.

---

## 11. 커뮤니티 가입 전 열람 · 본인 글 권한 설계

### 11-1. 현재 동작

- **읽기**: 백엔드는 모든 서비스에서 공개(`optionalAuth`). 비공개 포럼만 `checkClosedForumAccess` 로 제한. 단 **PH 프론트는 읽기까지 `MembershipGate`** 로 막아 백엔드보다 엄격 — KPA 회원이 백엔드상 자격이 있어도 PH 화면에선 못 읽는다.
- **쓰기 · 수정 · 삭제**: 라우트 단계 `requireCommunityAccess`(JWT 의 서비스 membership)가 컨트롤러의 작성자 확인보다 먼저 실행 → 자격 없는 작성자는 **본인 글 수정 · 삭제도 403**. 예외 없음.
- **작성자 연결**: `forum_post.author_id`(nullable) · `forum_comment.author_id`(NOT NULL) → `users`. membership 과 무관하므로 membership 이 없어져도 연결 · 표시는 유지. PR #235(Identity 분리)가 users 행을 살려 두는 것을 보장.
- 삭제는 soft delete(글 ARCHIVED · 댓글 DELETED).
- 부수: `ForumPostController.ts:90` 에 커뮤니티를 모르는 KPA 전용 bypass 역할 목록 하드코딩.

### 11-2. 설계 (결정 B안 기준)

| 행위 | 비회원(로그인 · 미가입) | 가입 신청 중(pending) | 회원(active) | 정지 · 탈퇴 후 |
|---|---|---|---|---|
| 공개 포럼 목록 · 글 · 댓글 읽기 | **허용**(현행 공개 read 계약 유지) | 허용 | 허용 | 허용 |
| 비공개 포럼 읽기 | 포럼 구성원만(현행) | 동일 | 동일 | 동일 |
| 글 · 댓글 작성 · 좋아요 | 차단 | 차단 | 허용 | 차단 |
| **본인 기존 글 · 댓글 삭제** | **허용** | 허용 | 허용 | **허용** |
| 본인 기존 글 · 댓글 수정 | 차단 | 차단 | 허용 | 차단 |
| 작성자 표시 | 유지 | 유지 | 유지 | 유지 |

- 핵심 선택: **삭제는 자격과 무관하게 작성자에게 허용, 수정은 회원만.** 근거: 자기 글을 내릴 권리는 가입 여부와 무관해야 하고, 수정은 새 게시와 같은 효과(내용 변경)이므로 참여 자격을 따른다.
- 대안: (i) 현행 유지(삭제 · 수정 모두 차단) — 구현 0, 가입 전 작성자가 자기 글을 못 내림. (ii) 삭제 · 수정 모두 허용 — 미가입자가 수정으로 내용을 바꿀 수 있음.
- 구현 시 필요: `write` 배열 분리(작성 · 댓글 · 좋아요 = 커뮤니티 가드, 삭제 = 작성자 확인만), KPA `pharmacyWrite` 동일 분리, PH 프론트 읽기 `MembershipGate` 제거로 백엔드와 일치, `resolveCommunityAccess` 를 커뮤니티 membership 원장으로 교체, `ForumPostController.ts:90` 하드코딩 정리. → 권한 · API 계약 변경이므로 **구현 시 승인 대상**.
- 영향 규모(실측): 기존 게시글 kpa-society 6 · neture 1 · PH 0 · kcos 0, 사용자 2명.

---

## 12. 결정 기록 (2026-09-25, 2차)

| 항목 | 결정 |
|---|---|
| PharmacyHub opt-in 채널 | **현재 경로 유지 · 약국 서비스 전환 보류.** PH 별도 서비스 존속의 최종 결정은 아니다. B안("승인 **또는** opt-in")을 **이 통합 작업 안에서** 검토하고, KPA 승인 정책 · 매장 노출 권한 · 오퍼 소유권을 함께 설명할 수 있을 때 전환. **A · C 안을 임시 우회책으로 쓰지 않는다.** 별도 WO 없음 |
| 기존 글 본인 권한 | **삭제만 가입 상태와 분리.** 비회원 · 대기 · 정지 · 탈퇴에서도 작성자 본인 확인 후 기존 글 삭제 가능. 수정 · 새 글 · 댓글은 승인된 커뮤니티 회원만. 구현 시 삭제 방식 · 감사 기록 · 첨부 · 댓글 영향 명시. 공개 열람은 현행 유지 |
| 의약품 오퍼 6건 | **B 구조 검토 1단계에서 거래 차단 정책과 대조**(별도 WO 없음). 오퍼별 현재/신구조 상태를 기록하고, **정책상 차단 대상이 전환 때문에 주문 가능해지지 않는 것**을 검증 조건으로 삼는다(§13-5) |
| 관리자 영역 | `admin.neture.co.kr` 진입을 넓히려고 O4O 운영자에게 **`platform:super_admin` 을 부여하지 않는다.** 공급자 · 펀딩 · 커뮤니티 업무 범위만 가진 운영자 권한 · 경로를 설계하고 기존 관리자 권한 · 서버 검사와 분리. 권한 변경은 구현 전 검토(§15) |
| 유지 | 현재 PharmacyHub 경로 · QR 유지. A~F 코드 구현 · 배포는 이 설계 검토 후 개방 |

---

## 13. opt-in 모델 B 설계 (KPA = 승인 **또는** 공급자 opt-in)

### 13-1. 현재 불변식 (B 가 건드리는 것)

- `APPROVAL_ELIGIBLE_SERVICE_KEYS = ['kpa-society','k-cosmetics']`(`approval-service-keys.ts:18-21`) · `SUPPLIER_OPTIN_SERVICE_KEYS = ['pharmacy-hub']`(`supplier-optin-services.ts:37`) · 두 목록 교집합이 있으면 **서버 기동 실패**(`offer-exposure-strategy.ts:42-51`).
- 계약 문서 `O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`: S2(두 공급 축 "섞지 않는다") · C3("승인축 서비스는 `service_keys` opt-in 만으로 주문할 수 없다") · C4(교집합 0) · §13-7 #4.
- F8 `NETURE-DISTRIBUTION-ENGINE-FREEZE-V1` §7: **Checkout Guard 조건 변경 · Listing 자동 활성화 정책 변경 · Tier 자동 확산 · 캐스케이드 변경 = WO + 구조 검토**.
- 결론: B 는 **계약 C3 · C4 · S2 · §13-7 #4 개정 + F8 구조 검토**가 선행돼야 하는 변경이다(구현 시 중지 조건).

### 13-2. KPA 승인 정책 · 노출 · 소유권 — 현재 2단 구조

| 단 | 원장 | 결정자 | 역할 |
|---|---|---|---|
| 1단 (오퍼 × 서비스) | `offer_service_approvals`(osa) | **Neture 운영자**(`neture:operator`, `/operator/product-service-approvals`) | KPA 카탈로그 · `/orderable` · checkout 노출의 **유일한 권한** |
| 2단 (매장 × 오퍼) | `product_approvals`(v2) | **KPA 운영자**(`/kpa/operator/product-applications`) | SERVICE/PRIVATE 오퍼의 매장 취급 신청 승인 → 활성 listing 생성 |
| 연결 | osa approved 시 KPA 2차 심사 큐에 pending 자동 생성(`offer-service-approval.service.ts:467-478`) | — | — |

- 오퍼 소유 = `supplier_product_offers.supplier_id`. 가격 = `offer_service_prices(offer_id, service_key)` 1행/서비스 → B 에서는 두 채널이 **같은 `kpa-society` 가격 1행**을 공유(채널 무관 동일가).

### 13-3. opt-in 표시 방식 — 별도 테이블 권고

| 후보 | 판정 | 이유 |
|---|---|---|
| (i) `service_keys` 에 `kpa-society` | **불가** | 이미 "승인 채널 신청" 의미. pending/rejected 오퍼도 키를 유지하므로 opt-in 판정에 쓰면 **미승인 · 반려 KPA 오퍼가 즉시 노출**(C3 위반) |
| (ii-a) osa 에 새 상태/출처 | **위험** | `UNIQUE(offer_id, service_key)` 로 승인행과 공존 불가 · sync 가 미지 상태를 REJECTED 로 보고 **전 서비스 listing 비활성 cascade** · 관리자 일괄 승인/반려가 덮어씀 |
| (ii-b) `product_approvals` 새 type | **부적합** | 매장 단위 원장(단위 불일치) · ENUM 변경 = F8 동결 |
| **(iii) 새 테이블 `offer_service_optins`** | **권고** | `(offer_id, service_key, status active/withdrawn/revoked, enabled_by/at, revoked_by/at, reason, UNIQUE(offer_id, service_key))`. `service_keys` 의미 · osa sync · cascade · 일괄 처리를 건드리지 않음. KPA 운영자 거부권 = `revoked` |

### 13-4. 주체별 권한 (B)

- **공급자**: opt-in 켜기/끄기(소유 오퍼만). 새 메서드(예: `setServiceOptin`)로 분리 — 기존 `setServiceDelivery` 의 승인키 거부(`SERVICE_KEY_REQUIRES_APPROVAL_FLOW`)는 유지.
- **KPA 운영자**: opt-in 오퍼 목록 · **철회(revoke)**. 철회 시 opt-in 경로로 생긴 listing 만 비활성(현재 listing 에 채널 컬럼이 없으므로 채널 기록 또는 노출 재계산 필요 — osa 승인도 가진 오퍼는 유지).
- **Neture 운영자**: osa 승인(현행 유지).
- **매장**: opt-in 오퍼를 카탈로그에서 보고 취급 신청. **결정 필요**: opt-in 오퍼 취급 신청을 (a) 즉시 활성 listing(PH 와 동일 · F8 listing 자동 활성화) 로 할지 (b) KPA 2단 심사 큐로 보낼지.

### 13-5. 의약품 오퍼 — 오퍼별 현재/신구조 상태와 검증 조건

실측(운영 DB read-only, 2026-09-25): PH opt-in 오퍼 19건 전부 공급자 1곳 · `SERVICE` · 활성 · 활성 listing 1건씩(구성원 없는 PH 조직 1곳).

| 오퍼(id 앞 8자리) | 규제 유형 | 현재(PH) 조회 · 취급등록 | 현재 장바구니 · 주문 | B 전환 후 KPA | 검증 조건 |
|---|---|---|---|---|---|
| 1b3fb24c · 7b417c3e · 91c2223a · c28fe05f · f1754b2a · fc353ddb | **DRUG** (6) | 가능 | **불가** — 장바구니 403 `DRUG_COMMERCE_FORBIDDEN`(`store-cart.service.ts:200-210`), 주문 생성 전 차단(`checkout.service.ts:146-164`). 서비스 · 역할 무관 절대 차단 | 조회 · 취급등록 가능 / **장바구니 · 주문 불가 유지** | ① 6건 각각 KPA 장바구니 추가 → 403 ② `createOrder` 경로 직접 호출 → 차단 ③ opt-in 켜기 시 `assertDrugOfferAllowed(['kpa-society'])` 통과(약국 대상 서비스) · PUBLIC 전환 시 거부 |
| 10fa44aa · 370840ea · 54d82e90 · 65da2603 · 7df629d6 · c336a52f | 건강기능식품 (6) | 가능 | 가능(PH) | 가능 | 기존 흐름 회귀 |
| 361a1f06 · 39fea5f0 · 3dd46a73 · 4e9724ca · 875afc41 · 959b5e92 | COSMETIC (6) | 가능 | 가능(PH) | 가능 — **약국 서비스 노출이 사업상 맞는지 확인 필요** | 기존 흐름 회귀 |
| 3bb54519 | GENERAL · `approval_status` PENDING · PH 가격행 있음 | 가능(PH opt-in 게이트는 전역 approval_status 를 보지 않음) | 가능(PH) | B 의 게이트 정의에 따름 | PENDING 오퍼의 노출 여부를 B 규칙으로 명시 |

- 정책 근거: `docs/ir/IR-O4O-DRUG-ACCESS-POLICY-DECISION-AND-LIVE-EXPOSURE-AUDIT-V1.md` §4(:166, DRUG 장바구니 · 주문 · 결제 = 모든 역할 거부 · 약국 서비스는 조회/상세/intake 허용), 구현 `CHECK-O4O-DRUG-COMMERCE-ABSOLUTE-BLOCK-V1.md`(058831274, **main 반영됨** — 문서 본문의 "main 미병합" 표기는 stale).
- 부수 발견: 이 오퍼 18건에 `offer_service_approvals(service_key='pharmacy-hub', approved)` 행이 있다. `pharmacy-hub` 는 승인 채널 키가 아니므로 현행 opt-in 게이트에는 영향이 없지만, B 에서 osa 를 노출 판정에 섞으면 오해석될 수 있어 **B 구현 전 이 행들의 출처 확인 필요**.
- UX 결손: PH 상품 화면이 DRUG 필터 칩 · 취급등록을 제공하지만 장바구니에서 403 — 정책과는 일치하나 화면이 완료할 수 없는 행동을 제시.

### 13-6. 영향표

| 구성요소 | 현재 | B 적용 후 | 동결 · 계약 영향 | 필요한 테스트 |
|---|---|---|---|---|
| `offer-exposure-strategy.ts` | 키 상호배타 · 승인 = osa | 새 전략(osa approved **OR** opt-in active) · 행별 채널 게이트 | F8 Checkout Guard · 계약 C3/C4/S2/§13-7 | pending/rejected osa + service_keys 는 **통과 못 함** · revoke 된 opt-in 거부 · PRIVATE opt-in 거부 |
| KPA `/catalog` · `findApplicableOffer` | PUBLIC OR osa | + opt-in(비PRIVATE · master ACTIVE) — 단일 SQL 조각(KCos 공용 빌더 주의) | 노출 SSOT | KCos 무영향 회귀 |
| `/apply` | SERVICE → 매장 심사 큐 | opt-in 처리 방식 결정(§13-4) | F8 listing 자동 활성화 | 멱등 · 서비스키 `kpa-society` |
| `/orderable` | SERVICE 는 osa 필요 · 표시가격이 osp 무시 | + opt-in · osp 사용 | 계약 parity | 카탈로그/주문가능/결제 가격 일치 |
| checkout-confirm-b2b | 승인 전략(PUBLIC 도 osa 필요) | 새 전략 · **PUBLIC 처리 명시** | F8 | 채널별 성공/거부 |
| `deriveDistributionType` | `is_public` + `service_keys` | active opt-in 도 SERVICE 로 계산 | F8 distribution 의미 | KPA 전용 opt-in 오퍼가 PRIVATE 로 떨어지지 않음 |
| 가격 `setPrices` | **다른 서비스 가격행 삭제(결함, §19)** | 선수정 필요 | — | 승인 가격 저장 시 PH 행 보존 |
| KPA 운영자 화면 | product_approvals 만 | opt-in 목록 + revoke | PH baseline(PH 는 승인 능력 금지) · KPA 는 결정 필요 | revoke 는 opt-in 유래 listing 만 |
| 공급자 주문 가시성 | `neture` 만 | kpa-society 포함(§14 G5) | 계약 S1 | 공급자가 KPA 주문 확인 |
| 의약품 | 조회 · 등록 가능, 주문 불가 | 동일 | 없음 | §13-5 검증 조건 |

### 13-7. 전환 조건 (결정 문구 기준)

아래가 모두 설명 · 검증될 때 PH opt-in → 약국 서비스 전환: ① 계약 · F8 개정안 승인 ② KPA 운영자 권한(철회) 확정 ③ 매장 취급 신청 방식 확정 ④ §13-5 검증 조건 통과 ⑤ §14 G5(공급자 가시성) 해결 ⑥ 가격 삭제 결함 수정.

---

## 14. 결제 기능 차이 설계 (PH 단일 결제 ↔ KPA B2B)

> **대체됨 (2026-09-25 · [`WO-O4O-OFFLINE-REFUND-MANUAL-RECORD-ONLY-V1`](../work-orders/WO-O4O-OFFLINE-REFUND-MANUAL-RECORD-ONLY-V1.md)).** 아래의 **자동 환불 구현 제안**(G1 결제 후 그룹 취소 · 환불 공용화, G2 PH 환불 코드 보정, G3 부분 환불, G4 운영자 환불 경로, G11 환불 알림)과 금액 결정 목록 1 · 2 · 4 · 6 · 9 는 새 정책 — 환불은 거래 당사자가 오프라인에서 결정 · 처리하고 O4O 는 담당자가 확인한 결과를 수작업으로 기록만 한다 — 으로 대체되었다. 공급자 주문 가시성(G5) · 정체 주문 복구(G6) · bridge 중복(G7) · 목록 정보(G8 · G9) · 그룹 결제 가능성(G10)은 환불 자동화가 아니므로 이 표시의 대상이 아니다. 원문은 조사 기록으로 보존한다.

KPA 는 주문 생성 · prepare/confirm · 결제완료 핸들러 · fulfillment bridge · 결제 전 단건 취소를 **이미 갖췄다**. 차이는 아래.

| # | 차이 | 설계안 | 주요 파일 | 결정 필요 |
|---|---|---|---|---|
| G1 | KPA 결제 후 그룹 취소 · 환불 없음(`store-order-cancel.service.ts:149-156` 409 `ALREADY_PAID`) | PH `cancelAfterPayment` 를 서비스 파라미터화한 공용 서비스로 추출(`serviceKeys` · `sources`), factory 에 `POST /:paymentGroupId/cancel`. 이벤트 특가 재고 복원 포함. **PH 코드를 그대로 복제하지 않는다**(G2) | `b2b-payment-controller.factory.ts` · 신규 공용 서비스 | 1 · 4 · 5 · 6 |
| G2 | **PH 환불 코드 결함**(§19-2) | PAID 결제행만 선택 · 그룹 `neture_orders` 를 `FOR UPDATE` 로 잠그고 조건부 전이 확인 후 PG 환불 · PG 성공/DB 실패 보정 로그 | `PharmacyHubPaymentController.ts:331-384` · `TypeORMPaymentRepository` | 없음(정합성) |
| G3 | 부분 환불 | 범위 밖 — Toss `cancelAmount` · PaymentCore 부분환불 상태 필요 | `packages/payment-core` · Toss 어댑터 | 2 |
| G4 | 공급자 수락 후 환불 | PH 규칙대로 `requiresOperator` 반환 + `kpa:operator` 환불 경로 | 신규 운영자 컨트롤러 | 1 · 3 · 9 |
| G5 | **공급자가 KPA 주문을 못 봄**(§19-4) | `fulfillment-service-scope.ts` 에 공급자 작업공간 서비스키 집합(neture + 승인키 + 이벤트특가 키) + `= ANY()` 헬퍼, 공급자 KPI · 목록 · 통합목록 · 비활성화 가드 적용. 정산은 정책 결정 전까지 neture 유지 | `supplier-order.service.ts` · `supplier-unified-order.service.ts` · `supplier.service.ts` | 8 |
| G6 | KPA 운영자 정체 주문 복구 없음(super_admin 만) | `CheckoutFulfillmentRecoveryService`(이미 범위 파라미터 보유) 위에 `requireKpaScope('kpa:operator')` 컨트롤러 | `kpa.routes.ts` · 신규 컨트롤러 | kpa-groupbuy 포함 여부 |
| G7 | bridge 중복 생성 경쟁 | `neture_orders((metadata->>'checkoutOrderId'))` 부분 unique index + 23505 → ALREADY_BRIDGED | migration(**중지 조건**) | 없음 |
| G8 | KPA 구매자 목록에 결제그룹 · 공급자 · 배송상태 없음 | 응답 필드 추가 | `kpa-checkout.controller.ts` | 없음 |
| G9 | KPA 운영자 주문 목록이 kpa-groupbuy 제외 | 키 추가 · bridge 상태 | `operator-summary.controller.ts:56` | 가시성 |
| G10 | 결제 전 단건 취소 후 그룹 결제 불가(PH · KPA) | 그룹 합계에서 cancelled 제외 또는 그룹 취소 | factory · PH | 허용 여부 |
| G11 | 알림 없음 | PAYMENT_REFUNDED 구독 등 | 핸들러 | 7 |

**금액 관련 사업 결정(CLAUDE.md: 결제 · 정산 판단은 사용자)**: 1) 공급자가 하나라도 수락한 뒤 구매자 자가 환불 허용? 2) 부분 환불(공급자별 · 품목별)? 3) 수락 후 환불 결정 주체(KPA 운영자 · 공급자 · 플랫폼)? 4) 배송비 전액 환불? 5) 이벤트 특가 주문 환불 · 재고 복원? 6) 환불 기한? 7) 구매자 · 공급자 알림? 8) KPA 주문 정산 포함? 9) 운영자 대리 환불?

**PH 단일 결제 경로를 닫는 조건**: G1 · G2 · G5 · G6 완료 + 결정 1 · 3 · 5 확정.

---

## 15. O4O 운영자 권한 설계 (admin.neture.co.kr, super_admin 비부여)

### 15-1. 사실

- admin-dashboard 전체가 `AdminProtectedRoute requiredRoles=['platform:super_admin']`(`App.tsx:180-203`). 이 floor 는 **CLOSED 결정 2건**(`WO-O4O-ADMIN-PLATFORM-ONLY-ACCESS-AND-POST-REFACTOR-FINAL-CLOSURE-V1-CHECK` · IA 재편 CHECK)과 **회귀 테스트 4개**로 고정: floor 정확히 1개, `neture:operator` 진입 거부, 메뉴 선언은 `PLATFORM_ADMIN_ROLES` 만, 서비스 전용 업무(포럼 등) 복귀 금지.
- 로그인은 역할 무관하게 성공하고(`google-auth.controller.ts:50-63`) floor 에서만 막힌다.
- 세 업무 API 는 이미 `neture:operator` 로 가드: 공급자 승인 `requireNetureScope('neture:operator')`(`operator-supplier.controller.ts:56-57`) · 펀딩 승인(`market-trial-operator.routes.ts:26-27`) · 포럼 운영(`operator-forum.routes.ts`, `serviceCode=neture`). `requireNetureScope` 는 **활성 neture membership 을 서버에서 확인**하고, `neture:operator` 는 `neture:admin` · `platform:super_admin` 전용 API 에 닿지 못한다.
- 플랫폼 수준 운영자 역할은 없다(`platform:admin`/`platform:operator` 는 코드에서 제거, `RBAC-ROLE-CATALOG-V1.md:41-42`).
- **커뮤니티 회원 승인 API 는 아직 없다**(결정 6 미구현).

### 15-2. 안

| 안 | 내용 | 장점 | 한계 |
|---|---|---|---|
| **P1. `neture:operator` 재사용 + `/ops/*` 별도 진입** (권고) | 기존 `/*` platform floor 는 그대로. 형제 경로 `/ops/*` 를 `requiredRoles=['neture:operator','neture:admin','platform:super_admin']` + **neture membership 필수**로 추가. 전용 메뉴 · 레이아웃(`admin-ops-menu`, deny-by-default) · 로그인 후 역할별 착지(super_admin → `/admin`, 운영자 → `/ops`) | 새 역할 · DB · security-core 변경 0. 서버 가드 그대로. platform 메뉴는 여전히 platform 전용 | `neture:operator` 는 **Neture 운영 전체 범위**(회원 · 매장 · 주문 · 상품 승인 · 홈 CMS · 서비스 약관/문의 · cafe24 연결)를 가진다 → "세 업무만"으로 서버에서 좁혀지지 않음 |
| P2. 새 역할 `o4o:operator` | 세 업무 API 만 허용하는 새 prefix/scope | 서버에서 정확히 세 업무로 제한 | 새 ServiceKey · security-core scope(F1) · RBAC F9 §4 5단계 · F11 membership(`o4o` membership 행 또는 bypass 금지) · roles 마이그레이션 · 모든 가드 수정 |

- 결정 문구("필요한 범위만 가진 운영자 권한")를 **엄격히** 적용하면 P2, 현행 Neture 운영자가 곧 O4O 운영자라는 해석이면 P1. **P1 로 시작하고, 세 업무 외 Neture 운영 API 를 `/ops` 메뉴에 노출하지 않는 것**을 권고하되, 서버 차원의 좁은 범위가 필요하면 P2 — **사용자 판단 필요.**
- 두 안 공통: 기존 관리자 권한 · 서버 검사(`requireAdmin` = super_admin, DB 확인)는 변경 없음.

### 15-3. 영향표 (P1 기준)

| 파일 | 변경 | 동결 · 계약 영향 |
|---|---|---|
| `apps/admin-dashboard/src/App.tsx` | `/ops/*` 형제 경로(기존 floor 문자열 불변) | CLOSED 결정("우회 진입점 무증식") 번복 → **사용자 승인** |
| `packages/auth-context/AdminProtectedRoute.tsx` · `adminRouteAccess.ts` | `requireMembership` 추가(super_admin 면제) | 공용 패키지(소비처 admin-dashboard 1곳) |
| `Login.tsx` · `InitialRedirect.tsx` | 역할별 착지 | 프론트만 |
| 신규 `admin-ops-menu` · `opsMenuPermissions` · `OpsLayout` · `routes/ops.routes.tsx` · `pages/ops/*` · `api/ops/*` | 운영자 화면(쿠키 클라이언트) | 신규. `/forum*` · `pages/forum` 경로명 금지(IA 테스트) |
| 회귀 테스트 4개 | `/ops` 는 neture:operator+membership 허용 · `kpa:*` 거부 · platform 메뉴는 여전히 platform 전용 | 테스트 계약 변경 |
| `operator-registration.controller.ts:25-29` | (선택) `requireNetureScope` 로 정렬 — 현재 membership 확인 없음 · 레거시 역할 포함 | API 계약 변경 |
| `operator-forum.routes.ts` `requireServiceOperator` | (선택) membership 확인 — 현재 역할만 봄(F11 "role 만으로 operator 판단 금지"와 불일치) | API 계약 변경 |
| 데이터 | 실제 O4O 운영자 계정에 `neture:operator` + neture membership | 실계정 데이터 쓰기(승인 대상) |

- 선결 결함: **admin 세션 교체 결함(§19-1)**을 `/ops` 개방 전에 해결해야 한다. 운영자가 늘어나면 영향 계정이 늘어난다.

---

## 16. supplier · funding 호스트 진입 설계 (neture-web 재사용)

판정: **기존 번들로 가능하나 그대로는 부족**. 페이지가 전부 lazy 라 번들 분리는 불필요.

| # | 필요 변경 | 성격 |
|---|---|---|
| 1 | `window.location.hostname` → 호스트 프로필(supplier · funding · 기본), 호스트별 `<Routes>` 트리(같은 lazy 컴포넌트 재사용, 경로 형태 `/supplier/*` · `/market-trial/*` 유지 → 내부 링크 약 135개 수정 불필요). `/` 만 호스트 착지, `PostLoginRedirect` 호스트 인지 | 프론트 |
| 2 | `hostHref(path)` 헬퍼로 호스트 간 링크 약 30곳(공급자 사이드바 `/mypage/business-profile` · "O4O 홈으로" · `/guide` · `/forum/post` · 약관 · 헤더/유저메뉴/하단 내비 · 커뮤니티 카드) | 프론트 |
| 3 | **handoff 대상 추가**: 현재 neture.co.kr → supplier 호스트로 세션을 옮길 방법이 없다(`'neture'` 대표 진입은 `returnPath='/'` 강제 · origin 을 neture.co.kr/www 로 고정). store 작업공간처럼 supplier · funding 전용 대상 + origin lock | **백엔드 · 인증(승인 대상)** |
| 4 | CORS 에 `supplier.neture.co.kr` 추가(funding 은 이미 있음) | 백엔드 · API 재배포 |
| 5 | Google JS origin 2개 추가 | 콘솔 |
| 6 | DNS · 인증서(호스트별 별도) · LB host rule → 기존 `backend-neture-web-http` | 인프라 |
| 7 | 호스트별 robots/noindex · canonical · `og:url` (현재 `robots.txt` · sitemap 이 모든 호스트에서 동일 → 중복 색인) | 프론트/서빙 |
| 8 | Chrome 확장 · local agent 허용 목록 — 공급자 화면은 확장을 쓰지 않음(가져오기 도우미는 붙여넣기 방식). **현재 불필요** | 선택 |

- 권한 분리: supplier 호스트에서 `/admin` · `/operator` · `/store` 등을 숨기는 것은 UX 이며, 서버는 이미 `requireActiveSupplier` · `requireNetureScope` 로 강제한다.
- 펀딩 참여는 로그인만 필요(`market-trial.routes.ts:33`) · 다른 서비스 의존 없음.
- 위험: handoff(3) 없이는 호스트마다 따로 로그인 · 로그아웃도 전파 안 됨 / 새 호스트도 `.neture.co.kr` 쿠키 범위 → §19-1 결함 노출 확대.
- 부수 결함: 펀딩 화면이 `/login?redirect=` 를 쓰는데 로그인 리다이렉트는 `returnUrl` 만 읽음 → 로그인 후 원래 화면으로 못 돌아옴(§19).

---

## 17. Store Hub C안 · `/my-store` 설계

### 17-1. 현재 구조의 한계 (C안 구현 전 해결 대상)

1. **선택한 매장이 백엔드로 전달되지 않는다.** web-store 는 organizationId 를 보내지 않고, 서비스 API 는 사용자+서비스로 매장을 추정 → 같은 서비스에 매장이 2개 이상이면 409 모호, 선택 화면의 매장과 API 가 읽는 매장이 다를 수 있다.
2. **"공통" 화면이 실제로는 한 서비스 API 에 묶여 있다**(우선순위 KPA → KCos → PH). 복수 가입 매장은 공통 화면에서 KCos · PH 데이터를 보지 못한다.
3. PH API 경로 형태(`/store-owner/*`)가 달라 **PH 만 가입한 매장은 공통 화면 대부분이 404**.
4. KCos 에 없는 마운트(`/pharmacy/info` · `/store-assets` · 동영상 · `/groupbuy`) · KPA 하드코딩(사이니지 미디어/스케줄 · 장바구니 · 제품설명).
5. POP · 블로그 · 동영상 · 다국어 · 장바구니 · 플레이리스트가 `service_key` 를 가진 테이블 → "매장 공통"으로 합치려면 **제품 결정 또는 데이터 이관**.
6. `/work-scope/store-services` 는 enrollment 만 읽는데 KPA 매장은 slug 에만 기록된 경우가 있음 → `/work/kpa-society` 미노출 가능(실데이터 확인 필요).

### 17-2. 제안 정보 구조

| 상단 메뉴 | 경로 | 데이터 범위 | API 방향 |
|---|---|---|---|
| 홈 | `/` | 매장 | `/work-scope/*` |
| 내 매장 — 정보 · 제품 · 자체상품 · QR · 태블릿 · 상담 · 자료함 · 분석 | `/my-store/*` | **매장(조직)** | 중립 `/api/v1/store/*` + **명시적 organizationId** (현재 KPA 전용 `/pharmacy/info` 등은 중립 API 로) |
| 내 매장 — POP · 블로그 · 동영상 · 다국어 · 사이니지 | `/my-store/*` | 현재 **서비스 키 데이터** | 결정: 매장 단위로 이관 vs 서비스 필터/탭 |
| 매장 HUB — 콘텐츠 라이브러리 | `/hub/*` | 가입 서비스 합집합 또는 서비스 필터 | `/api/v1/hub?serviceKey=` 반복 |
| 매장 HUB — 상품 카탈로그 · 이벤트 특가 · 장바구니 | `/hub/b2b` 등 → `/work/:svc/*` 로 이동 권고 | **서비스** (승인/opt-in 채널이 서비스별) | 서비스별 기존 API |
| 서비스 업무 | `/work/:serviceKey/*` | 서비스 × 매장 | 기존 |
| 호환 | `/store/*` → `/my-store/*` · `/store-hub/*` → `/hub/*` | — | 리다이렉트 |

- 이름 변경 영향: web-store 약 34파일의 내비 리터럴(API 경로 `/store/...` 는 **바꾸지 않음**) + `store-ui-core` `unifiedStoreHandoff.ts` RULES(**F3 동결 패키지 → 명시적 WO 필요**). 백엔드 returnTo 검사는 경로 prefix 를 보지 않아 변경 불필요.
- **테스트 매장 문제**: 로컬 API `.env` 가 운영 DB 프록시(5442)를 가리키고, 복수 가입 시드 · web-store e2e 가 없으며, 운영 smoke 계정 2개는 정지 상태 · 각 1개 매장만 연결. → 복수 서비스 테스트 매장은 **격리 PG 컨테이너 수동 시드** 또는 **승인된 운영 데이터 쓰기** 중 선택 필요.

---

## 18. 커뮤니티 독립 회원 · 삭제 분리 설계 보강

### 18-1. 데이터 모델 (권고: 별도 테이블)

`service_memberships` 에 `community:*` 키로 넣으면 안 된다 — 약 75개 파일이 서비스 필터 없이 membership 을 순회 · 계산하고(매장 게이트 통과 · 서비스키 추론 · 플랫폼 관리자 일괄 정지/탈퇴가 커뮤니티 행까지 처리), 승인 서비스가 `users.status` 를 바꾸고 역할을 부여한다.

`community_memberships`: `id` · `user_id`(FK users) · `community_key`(`pharmacist`/`retail` — `retail` 은 **키가 아닌 URL/표시명**으로만 쓰는 원칙에 따라 키 명명 재확인 필요) · `status`(pending/active/suspended/rejected/withdrawn) · `applied_at` · `reviewed_by/at` · `rejection_reason` · `suspension_reason` · `operator_notes` · `qualification_type` · `qualification_ref` · `qualification_snapshot`(jsonb) · `created_at/updated_at` · `UNIQUE(user_id, community_key)`.

- 약사 자격: `kpa_pharmacist_profiles` 를 참조할 수 있으나 **`license_verified=true` 를 설정하는 코드가 없다** → 자격 "검증 완료"를 요건으로 걸 수 없음. 승인자가 심사 시 면허번호 · 활동유형을 확인하고 `qualification_snapshot` 에 남기는 방식 권고(이후 프로필 변경과 무관하게 결정 근거 보존).
- 커뮤니티 승인 서비스는 `users.status` · `role_assignments` 를 건드리지 않는다.
- 승인자 = §15 의 O4O 운영자(P1 이면 `neture:operator`). 포럼 거버넌스(`operator-forum.routes.ts` 서비스 맵 · `hasForumModerationOverride` · `checkClosedForumAccess`)에 커뮤니티 운영자 분기 추가.
- 호스트: `community.neture.co.kr` = neture-web 호스트 진입(§16 방식), API 는 경로에 커뮤니티 키(`/api/v1/communities/:key/forum`) — F6 "serviceKey 는 URL 경로에서만" 준수.

### 18-2. 삭제만 가입 상태와 분리 — 구현 명세

| 항목 | 현재 사실 | 명세 |
|---|---|---|
| 삭제 방식 | 글 삭제 = `status=ARCHIVED` 로 변경(soft) · 작성자 또는 플랫폼 관리자만(`ForumPostController.ts:545-555`) · 댓글 삭제 = `CommentStatus.DELETED`(soft) | soft delete 유지. 가드만 분리: 삭제 경로는 **인증 + 작성자 확인**만, 커뮤니티 참여 가드 제외 |
| 감사 기록 | 글 삭제 메서드에 **감사 기록 호출 없음**(상태만 변경) | 삭제 시 행위자 · 시각 · 당시 커뮤니티 회원 상태(비회원/대기/정지/탈퇴/회원)를 기록 — 기존 감사 테이블 재사용 여부는 구현 시 확인 |
| 댓글 영향 | 글을 ARCHIVED 로 바꿔도 **댓글 행은 그대로** | 글 삭제 시 댓글 표시 정책 명시 필요(글과 함께 비노출 권고, 데이터는 보존) |
| 첨부 | `ForumPost` 엔티티에 별도 첨부 컬럼 없음(본문 블록 안 이미지 URL 형태로 추정 — 구현 시 확인) | 삭제는 글 상태만 바꾸고 미디어 파일은 지우지 않음. 파일 삭제가 필요하면 별도 정책 |
| 수정 · 새 글 · 댓글 | 참여 가드 → 서비스 membership | 커뮤니티 membership `active` 만 |
| 공개 열람 | 백엔드 공개 · PH 프론트만 읽기 차단 | 현행 공개 유지, PH 프론트 차이는 커뮤니티 이전 시 정리 |

---

## 19. 이번 조사에서 확인된 현재 결함 (URL 재구성과 무관 · 별도 추적)

| # | 결함 | 확인 수준 | 현재 운영 영향 | 비고 |
|---|---|---|---|---|
| 19-1 | **관리자 세션 교체**: neture.co.kr · store · study 의 handoff 페이지가 `credentials:'include'` 로 exchange → 넘겨받은 사용자 토큰이 `.neture.co.kr` 쿠키로 기록 → 쿠키만 쓰는 admin-dashboard 가 **경고 없이 그 사용자로 바뀜**(`AuthProvider.tsx:130` 은 다른 사용자를 그대로 채택) | 코드 확인(HandoffPage 3곳 · `handoff.controller.ts:478` · admin `strategy:'cookie'` · AuthProvider). **실브라우저 재현 미실시** | 같은 브라우저에서 관리자와 다른 사용자가 번갈아 쓰는 경우 | 새 호스트 추가 시 노출 호스트 3 → 7. **보안 · 인증 변경이므로 수정은 승인 대상**. 재현 절차는 아래 |
| 19-2 | **PH 결제 후 환불 행 선택 결함**: 정렬 없는 `findByOrderId` 가 PAID 가 아닌 결제행을 고르면 PG 환불은 건너뛰고 원장은 `paymentStatus=refunded` 로 바뀜 | 코드 확인(`TypeORMPaymentRepository.ts:55-58` · `PharmacyHubPaymentController.ts:358-372`) | 운영 PH 결제완료 주문 0 → 현재 피해 0 | 금액 결함. 수락/환불 경쟁 조건도 동반(§14 G2) |
| 19-3 | **공급자 가격 저장 시 PH 가격행 삭제**: `setPrices` 가 목록 외 가격행 전체 DELETE | 코드 확인(`offer-service-price.service.ts:84-91`) | PH 가격행 보유 오퍼 1건 | |
| 19-4 | **공급자가 KPA · KCos B2B / 이벤트특가 주문을 목록 · KPI · 정산 · 비활성화 가드에서 못 봄**(`neture` 만 조회). ID 를 알면 상세 처리는 가능 | 코드 조사(서브조사 · 필터 헬퍼 `fulfillment-service-scope.ts`) | `neture_orders` kpa-society 0 → 현재 0 | 첫 KPA B2B 결제부터 발생 |
| 19-5 | 매장 상품 라이브러리가 서비스 구분 없이 전역 `approval_status='APPROVED'` 로 등록 허용 | 코드 확인(`store-product-library.controller.ts:194-200`) | 미측정 | 서비스 경계 누수 |
| 19-6 | `/neture/operator/registrations` 가드에 membership 확인 없음 · 레거시 역할 포함 / 포럼 운영자 가드가 역할만 확인 | 코드 조사 | — | F11 불일치 |
| 19-7 | 펀딩 화면 `/login?redirect=` 무시(로그인 리다이렉트는 `returnUrl` 만) | 코드 조사 | 로그인 후 원 화면 복귀 실패 | |
| 19-8 | bridge 중복 생성 경쟁(unique index 없음) | 코드 조사 | 동시 복구 · 지연 이벤트 시 | |
| 19-9 | `CHECK-O4O-DRUG-COMMERCE-ABSOLUTE-BLOCK-V1.md` 의 "main 미병합" 표기가 stale(058831274 는 main 에 있음) | git 확인(서브조사) | 문서만 | 기록물 · 보고만 |

**19-1 재현 절차 (브라우저 검증용)**
1. 탭1: admin.neture.co.kr 에 계정 A(super_admin)로 로그인 → `.neture.co.kr` 쿠키 확인, `/auth/status` user = A.
2. 탭2(같은 브라우저): kpa-society.co.kr 에 계정 B 로 로그인 → "O4O 홈" 복귀 또는 store 작업공간 handoff 실행.
3. 탭2 Network: `/auth/handoff/exchange` 응답에 `Set-Cookie: accessToken=...; Domain=.neture.co.kr` → 쿠키가 B 로 바뀌었는지 확인.
4. 탭1(새로고침 없이) 관리자 API 호출 → **실패 신호: 요청이 B 로 인증**(헤더 표시는 여전히 A).
5. 탭1 새로고침 → **실패 신호: `/auth/status` 가 B**, 화면이 B 로 바뀌거나 권한 없음 표시.
6. 대조군: 탭2 에서 handoff 없이 일반 Google 로그인만 → 응답 쿠키가 저장되지 않아 탭1 은 A 유지가 정상.

---

## 20. 다음 단계 제안 (구현 개방 전 사용자 판단)

1. **§19-1 관리자 세션 교체**: 브라우저 재현 → 수정 방향(handoff exchange 에서 쿠키 미설정 · admin 사용자 불일치 시 로그아웃 등) 결정. 운영 보안 사안이라 URL 재구성보다 먼저 다루기를 권고.
2. **§15 운영자 권한**: P1(`neture:operator` 재사용 + `/ops`) vs P2(새 역할) 선택, CLOSED 결정 번복 승인.
3. **§13 B 모델**: 계약 C3/C4/S2 · F8 개정안 작성 승인, 매장 취급 신청 방식(§13-4) · PUBLIC 처리 결정.
4. **§14 결제**: 금액 결정 9개 중 최소 1 · 3 · 5.
5. **§17 Store Hub**: 서비스 키 데이터(POP · 블로그 등)의 공통화 방식, 테스트 매장 준비 방식(격리 DB vs 운영 쓰기).
6. §18 커뮤니티 키 명명(`retail` 키 금지 원칙과 `community.neture.co.kr/retail` 경로의 관계).

---

## 21. 통합 작업 진행 기록

### 21-1. 2026-09-26 — 최신 main 대조 (HEAD `cacc2a57d`)

§4 이후 반영된 커밋: Google-only 인증 정리(PR #238), 플랫폼 관리자 역할 가드 수정, membership 종료 분리, Supplier Domain 경계 동결(`O4O-SUPPLIER-DOMAIN-BOUNDARY-V1`, 303221b8b). 이에 따라 낡은 사실:

| 위치 | 이전 | 현재 | 근거 |
|---|---|---|---|
| A2 `/auth/verify-email` | KEEP + REPOINT | **제거 완료**(3앱 페이지 · 백엔드 route · 메일 템플릿 전부) → 이관 대상 없음 | `auth.routes.ts:149-152` · `google-only-auth-cleanup.spec.ts:107-108` |
| A3 `/operator-invitations/accept` | KEEP | **제거 완료**. 대체 = 관리자가 기존 Google 사용자에게 직접 지정(`/admin/operator-assignments`), 메일 초대 없음 | `OperatorAssignmentController.ts:50-66,92` |
| X3 모바일 앱 | KEEP | **은퇴**(추적 파일 0 · `/api/v1/mobile/*` 제거) → 호스트 의존 없음 | 7595e6d27 |
| §2-3 발송 메일 게이트 | 미확인 | **해당 없음**(인증 · 초대 메일 자체가 없음) | `mail.service.ts:355` |
| A6 CORS | `setup-middlewares.ts:39-102` | 내용 동일 · 줄 이동(`:37-99`). funding 있음 · supplier 없음 유지 | — |
| §19-1 전제 | — | **모두 그대로**(handoff · cookie.utils · AuthProvider 변경 0) | — |
| 그 외 | — | `service-catalog.ts` · `store-workspace.ts` · `representative-entry.ts` · `tenant.tsx` 변경 0 | — |

**Supplier 기준(`O4O-SUPPLIER-DOMAIN-BOUNDARY-V1`, FROZEN)이 이 작업에 거는 제약**
- 호스트 · 도메인 규정은 없다(§16 · F1 과 충돌도 확정도 아님). 공급자 호스트 설계는 §16 그대로.
- 펀딩 호스트의 문구 · SEO · 메뉴는 플랫폼 공통 제품명 **"유통참여형 펀딩"** 유지, 자금 모집 · 정산을 암시하지 않는다(:124). 이름 변경은 플랫폼 어휘 변경이라 이 작업 밖.
- `/supplier/forum*` · `/supplier/my-forum` 은 legacy deep-link 보존 — 공급자 호스트 route 트리에서 이름 변경 · 리다이렉트 체인 금지(:53).
- 공급자 영역에 운영자 · 커뮤니티 · Store 운영 기능 신설 금지(§9) · 조직 전환 switcher 금지(§7) → 공급자 호스트에서 `/admin`·`/operator`·`/store` 숨김과 일치.
- **opt-in 모델 B(§13) 추가 제약**: 공급 가능 판정의 SSOT 는 `offer_service_approvals`(서비스 운영자 소유, 공급자는 읽기만), `distribution_type` 은 `(isPublic, serviceKeys)` 파생만. B 의 "승인 OR opt-in" · opt-in 을 파생에 반영 · 공급자 쓰기 권한은 모두 **이 FROZEN 기준의 명시적 개정**이 필요하다 → 결정 문구대로 현재 기능 보존, 결정 · 검증 조건만 유지.
- 실제 공급자 계정 smoke 는 `DEFERRED_PENDING_GOOGLE_IDENTITY` → 공급자 호스트 전환 검증도 그 해제 이후.

### 21-2. 인증 게이트 — §19-1 관리자 세션 사용자 교체

**판정: 결함 확정(코드 · 이력), 브라우저 재현 미실시**(두 번째 사용자 계정 필요 · 운영 smoke 계정 정지 상태).

- **근본 원인 = 회귀.** 2026-03-13 handoff 설계(3946b17ee)는 쿠키 전략 앱용으로 exchange 에서 쿠키도 내렸다 → 2026-03-17(adb23b828) 앱들이 localStorage 로 바뀌며 `credentials:'include'` 제거 → **2026-09-14(2464f2494) HandoffPage 재작성 때 `credentials:'include'` 재유입**, 이후 lecture · store 가 복사.
- **노출 호스트 4곳**: neture.co.kr · store · study(같은 사이트) + **pharmacyhub.co.kr**(쿠키 도메인이 `COOKIE_DOMAIN=.neture.co.kr` 폴백 → 서드파티 쿠키 허용 브라우저에서 저장). kpa-society.co.kr · k-cosmetics.site 는 도메인 불일치로 브라우저가 거부.
- **exchange 쿠키에 의존하는 운영 앱 없음**: 배포 서비스 8개 전부 localStorage + Bearer, admin-dashboard 는 handoff 대상 아님. 유일한 쿠키 의존은 web-account(미배포 · 카탈로그 미등록).

**조치 (a) — 이번에 구현 (프론트만 · API 계약 불변)**
- 배포되는 HandoffPage 6곳(neture · store · lecture · pharmacy-hub · k-cosmetics · kpa-branch)에서 `credentials:'include'` 제거 → 브라우저가 exchange 응답 쿠키를 저장하지 않는다. web-account 는 쿠키 전략 앱이라 제외.
- 테스트: `apps/api-server/src/__tests__/handoff-exchange-no-credentials.spec.ts`(7개 HandoffPage 정적 계약 · PASS 7/7) · web-neture `HandoffPage.staleTokenGuard.test.tsx` 에 exchange 요청 `credentials !== 'include'` 단언 추가(PASS 3/3). eslint 오류 0(kpa-branch 기존 경고 1건은 변경 무관).
- 한계: 이미 배포된 옛 번들 · 앞으로 복사될 페이지에는 효과 없음 → (b) 필요.

**(b) · (c) — 2026-09-26 승인 · 구현 완료(§21-5).** 아래는 승인 전 기록:
- (b) 서버 `handoff.controller.ts:478` exchange 에서 `setAuthCookies` 제거(body 토큰 응답은 불변). 문서화된 "쿠키 + body 이중" 동작을 바꾸므로 승인 대상. 함께 바꿀 것: 같은 파일 주석 · `unified-store-workspace-handoff.spec.ts:263` 반전 · `representative-entry-return-handoff.spec.ts` 성공 경로 단언 · 신원 아키텍처 문서 문구.
- (c) admin-dashboard `packages/auth-context/src/AuthProvider.tsx:129-131` — 캐시 사용자와 `/auth/status` 사용자가 다르면 조용히 채택하는 대신 세션 무효화 후 로그인으로(단 `authClient.logout()` 은 호출하지 않는다 — 다른 사용자의 refresh family 를 끊음). 공용 패키지(소비처 admin-dashboard 1곳) · 방어 심층.
- 쿠키 이름 분리(admin 전용 쿠키) · host-only 쿠키 안은 채택하지 않음(동명 쿠키 공존 시 우선순위 불확정).

**인증 게이트 나머지**
| 항목 | 상태 |
|---|---|
| Store Google 로그인 origin(`https://store.neture.co.kr`) | **미확인** — `WO-O4O-GOOGLE-IDENTITY-STORE-ORIGIN-AND-SMOKE-V1` ACTIVE, CHECK 없음. 콘솔 캡처 필요 |
| 새 호스트 Google origin · CORS · handoff 대상 | 호스트 구현 단계에서(아래 21-4) |
| 브라우저 재현(§19-1 절차) | 계정 2개 필요 → 한 계정으로도 가능한 대체 절차: DevTools 에서 `.neture.co.kr` `accessToken` 쿠키 값 · 만료 기록 → 자기 handoff 실행 → 수정 전에는 exchange 응답에 `Set-Cookie … Domain=.neture.co.kr` 가 있고 값이 바뀜, 수정 후에는 없음 |

### 21-3. §19 · §7 결함 재분류 (실행 규칙: 원래 목적 안 → 포함 / 밖 → 사유 기록)

| 결함 | 분류 | 사유 · 처리 |
|---|---|---|
| 19-1 관리자 세션 교체 | **포함** | DONE ③. (a) 완료 · (b)(c) 승인 대기 |
| 19-6 운영자 가드 membership 누락(`/neture/operator/registrations` · 포럼 운영자) | **포함** | DONE ③ "O4O 운영자가 전체 권한을 얻지 않음" · §15 운영자 권한 설계와 같은 작업. API 가드 변경 = 승인 대상 |
| 19-7 펀딩 `/login?redirect=` 무시 | **포함** | DONE ① 로그인 복귀. 프론트 수정 |
| 19-3 공급자 가격 저장 시 PH 가격행 삭제 | **포함** | OUT_OF_SCOPE 문구 "현재 기능 보존"의 대상인 PH opt-in 기능을 훼손. Supplier FROZEN 은 버그 수정 허용 |
| §7-1 화장품 QR 호스트(`cosmetics.neture.co.kr` · `k-cosmetics.neture.co.kr` NXDOMAIN) · KCos 공개 QR route 부재 | **포함** | QR 목적지 = 이 작업의 핵심(DONE ②) |
| §7-2 상품 QR 기본 호스트 `neture.o4o.kr` | **포함** | 동일 |
| §7-3 `www.neture.co.kr/hospital` LB 규칙 누락 | **포함** | DONE ④ 비로그인 병원 화면. LB 변경 = 인프라(승인) |
| §7-5 `platform_services.entry_url` · §7-6 web-store dead QR URL · §7-7 LB/인증서 잔재 | **포함** | URL 정합 |
| §7-4 메일 MX(수신 미검증) | **포함(검증만)** | 표기 주소가 새 호스트 체계에 남는지 판단 필요. 수신 시험은 사용자 |
| 19-2 PH 환불 행 선택 · R1 결제 확정 경쟁 | **밖** | 환불은 별도 확정 정책 — `WO-O4O-OFFLINE-REFUND-MANUAL-RECORD-ONLY-V1` 이 처리(410 · R1 설계) |
| 19-4 공급자가 KPA B2B 주문 미표시 | **밖** | 주문 가시성 문제로 URL 목적과 무관. 현재 영향 0(`neture_orders` kpa-society 0행). PH 흡수 · B 모델 전환 조건(§13-7 ⑤)으로만 추적 — 독립 위험이 현실화(첫 KPA B2B 결제)되기 전 처리 필요, 별도 작업 여부는 그때 판단 |
| 19-5 매장 상품 라이브러리 전역 승인 누수 · 19-8 bridge 중복 경쟁 | **밖** | 공급 노출 경계(Supplier FROZEN 영역) · fulfillment — URL 목적과 무관. 기록만 |
| 19-9 · 인증 정리 잔재(swagger `auth.yaml:77` verify-email · `OperatorAssignmentController.ts:2,6` 주석) | **밖(문서)** | 기록물 · 주석 — 보고만 |

### 21-4. 다음 실행 묶음과 필요한 판단

| 묶음 | 내용 | 코드만으로 가능 | 승인 필요 지점 |
|---|---|---|---|
| 인증 게이트 마감 | (b) · (c) | — | (b) API 동작 · (c) 공용 패키지 |
| QR · 호스트 정합(현재 결함) | 화장품 QR 호스트 표 2곳 → 카탈로그 파생 · 상품 QR 기본 호스트 · web-store dead URL · 펀딩 로그인 복귀 | 예 | 없음(프론트 · 서버 내부 계산) |
| 운영자 권한 | §15 P1(`neture:operator` + `/ops`) 또는 P2 · 19-6 가드 | — | CLOSED 결정 번복 · API 가드 |
| 호스트 진입 | neture-web 호스트 프로필(supplier · funding · community), 분회 6곳 동시 변경, pharmacy/retail 호스트 | 프론트 준비 가능 | handoff 새 대상(인증) · CORS(API 재배포) · DNS/인증서/LB/Google 콘솔(외부) |
| 매장 · 커뮤니티 | Store Hub C안 · `/my-store` · 커뮤니티 membership | — | `store-ui-core`(F3) · DB 스키마 · RBAC F9 · ROLE-WORKSPACE V2 |
| 배포 | 모든 운영 전환 | — | `DEPLOY_ENABLED=false`(2026-09-25T23:02Z 갱신) — 게이트 개방 전 운영 전환 완료 표시 금지 |

### 21-5. 인증 게이트 (b) · (c) 구현 (2026-09-26 사용자 승인 → `5fd971083`)

| 항목 | 내용 | 검증 |
|---|---|---|
| (b) 서버 | `handoff.controller.ts` exchange 에서 `setAuthCookies` 제거 — body 토큰만. 변경 전 재확인: 배포 서비스 8개 전부 localStorage, 쿠키 전략은 admin-dashboard 뿐(handoff 대상 아님), web-account 는 배포 workflow · 카탈로그 둘 다 없음 | 계약 테스트: workspace · 대표 진입 성공 경로에서 `setAuthCookies` · `res.cookie` · `Set-Cookie` 헤더 **0**(이미 배포된 HandoffPage 가 `credentials:'include'` 로 호출해도 저장될 쿠키가 없음을 서버 쪽에서 고정) · 정적 가드에 서버 `setAuthCookies` 부재 추가 · 관련 4 suite 66 tests PASS |
| (b) 문서 | `O4O-IDENTITY-ARCHITECTURE-V3` 승계 표에 "V1 §8 쿠키 설정 · Cookie domain 자동 감지 비승계" 예외 기록 | — |
| (c) admin | `@o4o/auth-context` AuthProvider: 캐시 사용자 ≠ `/auth/status` 사용자 → 새 사용자 **채택 안 함** · 화면 비움(user=null → 보호 화면 unmount, 이후 API 요청 없음) · 재채택 금지 표식(`admin-session-conflict`) 저장 → 새로고침 후에도 서버 세션 비채택 · **명시적 Google 로그인 성공 · 명시적 logout 에서만 해제** · `logout()` 호출 없음 · 창 포커스/가시성 복귀 때 재대조. 로그인 화면에 세션 변경 안내(`data-testid=session-conflict-notice`) | vitest 6건(교체 감지 · 새로고침 후 비채택 · 회귀 2 · 재로그인 해제 · 포커스 재대조) — CI(`ci-pipeline.yml` auth-context step) PASS. 소비처 = admin-dashboard 1곳(auth-react 는 별도 패키지) |
| CI | `5fd971083` CI Pipeline success (run 36222991651) | — |

**판정 구분 (요청대로 분리 보고)**
- 코드 · CI: **PASS**.
- **운영 브라우저에서 사용자 교체 미재현: 미판정** — `DEPLOY_ENABLED=false` 로 운영 미반영(Deploy 워크플로 build-and-deploy · 서비스별 deploy job 전부 skipped). 배포 후 §21-2 의 한 계정 절차(exchange 응답에 `Set-Cookie` 없음 · `.neture.co.kr` 쿠키 불변) + 두 계정 절차(admin 탭 새로고침 · 포커스 시 안내 화면)로 판정한다.
- 남는 경로: `google-auth` 로그인 · `/auth/refresh` 는 여전히 `.neture.co.kr` 쿠키를 설정한다(admin 자체 로그인에 필요). 서비스 웹은 이 요청에 credentials 를 싣지 않아 쿠키가 저장되지 않는다(§21-2 분석). 새 호스트도 같은 패턴을 따라야 한다(호스트 구현 시 점검 항목).

### 21-6. QR · 호스트 정합 수정 (승인 불요 묶음)

| 결함 | 수정 | 검증 |
|---|---|---|
| §7-1 화장품 QR 호스트(`cosmetics.neture.co.kr` NXDOMAIN) — 다국어 · 제휴 QR | 파일별 호스트 표 2곳 삭제 → `getServicePublicOrigin()`(카탈로그 + `resolveCanonicalServiceKey` alias) 파생. kpa · pharmacy-hub 값 불변, cosmetics → `https://k-cosmetics.site` | api spec 13건 PASS(alias 6종 · 미지 키 · 제휴 URL · 하드코딩 재유입 금지) |
| §7-1 Neture 공급자 대시보드 `k-cosmetics.neture.co.kr` | 카탈로그 파생 | 동일 spec |
| §7-2 상품 QR/전단 기본 호스트 `neture.o4o.kr` | 서버: `getServiceOrigin('neture')` · `PUBLIC_DOMAIN`(미설정) 의존 제거 / 프론트 `SellerQRGuidePage` → `https://neture.co.kr` | 동일 spec |
| §7-6 web-store 가 store 호스트로 `/qr` · `/tablet` URL 생성(열리지 않음) | `SERVICE_PUBLIC_ORIGIN` · `getActiveServicePublicOrigin()` 추가, QR 복사 · 미리보기 · 운영 보드 링크 · 태블릿 URL · 태블릿 설정 URL 을 활성 서비스 공개 origin 으로. 미설정 `VITE_KPA_WEB_ORIGIN` 의존 제거 | web-store tsc 0 |
| §19-7 펀딩 로그인 복귀 | `lib/loginReturnPath.ts` — `state.from` → `?returnUrl` → 레거시 `?redirect` 순, 같은 origin 상대 경로만 허용(`//` · `/\` · 절대 URL 거부). 펀딩 화면 5곳 `?returnUrl=` 로 정정 | vitest 5건 PASS · web-neture tsc 0 |

**남은 것 (이 묶음에서 코드로 끝나지 않음)**
- 화장품 앱에 공개 route(`/qr/:slug` · `/multilingual-products/:publicKey` · `/foreign-visitor/affiliate/:shortCode` · `/tablet/setup`)가 **없다** → 호스트는 맞아졌지만 착지 화면이 없다. PH 판(가장 작음)을 옮기거나 `store-ui-core` 로 공통화 필요 — 소매 호스트(`retail.neture.co.kr`) 구현 묶음에서 함께 처리(현재 화장품 활성 QR 0 · 다국어/제휴 0).
- 이미 저장된 제휴 QR `landing_url` 은 운영 0행이라 데이터 조치 불필요(§3 Q2).
- 공급자 대시보드의 화장품 `ordersPath=/supplier/orders` 는 화장품 앱에서 RoleNotAvailable 화면 — 경로 자체는 공급자 호스트 설계(§16)에서 정리.
- 배포 전이므로 운영 반영 **미반영**(`DEPLOY_ENABLED=false`).

### 21-7. O4O 운영자 권한 — P2 설계 (2026-09-26 사용자 지시: P2 기준, super_admin 비부여)

**원칙**: `neture:operator` 의 넓은 서버 권한을 `/ops` 메뉴에서 숨기는 방식은 쓰지 않는다. 실제 O4O 운영 업무 API 에만 접근하는 **별도 역할**을 만든다.

#### 21-7-1. 권한표 (허용 = 새 역할 접근, 제외 = 접근 불가)

| 업무 | API (현재 가드) | 새 역할 | 비고 |
|---|---|---|---|
| 공급자 승인 · 관리 | `/api/v1/neture/operator/suppliers*` 12개(읽기 6 · 쓰기 6: 목록 · 대기 · 일괄 · 문서 다운로드 · 규제 카테고리 · 기본정보 수정 · 승인 · 반려) — `requireNetureScope('neture:operator')` | **허용** | `GET /suppliers/:id/onboarding` 호출처 없음 |
| 공급자 비활성/재활성(governance) | `/api/v1/neture/admin/suppliers/*/deactivate · reactivate` — `neture:admin` | **제외(결정 필요)** | 현재 운영자보다 상위 등급 |
| 펀딩 승인 · 운영 | `/api/v1/neture/operator/market-trial*` 17개(목록 · KPI · 상세 · 참여자 · 상태 · 승인 · 반려 · 포럼 동기화) — `neture:operator` | **허용** | 단 참여자 `settlement-status` · `payment-status`(:118 · :120) 는 **결정 필요**(정산 제외 원칙과 겹침) |
| 커뮤니티 운영(포럼) | `/api/v1/forum/operator/*`(serviceCode=neture) — 요청 검토 · 일괄 검토 · 삭제 요청 처리 · 카테고리 수정/비활성/활성 · 분석 — `isServiceOperator` (역할만, membership 미확인) | **허용** | **`DELETE /categories/:id/hard`(영구 삭제) 제외** |
| 포럼 관리자(복원 · 영구삭제 · 감사로그) | `/api/v1/forum/admin/*` — `neture:admin` | 제외 | |
| 가입 신청 승인 | `/api/v1/neture/operator/registrations*`(목록 · 승인 · 반려 · 메모 · 일괄) — `requireRole` 목록(membership 미확인) | **결정 필요** | 승인이 `neture:supplier` 역할 부여 + 공급자 행 생성 → 사실상 공급자 온보딩. `/registrations/copilot`(AI) 제외 |
| 커뮤니티 회원 승인(독립 커뮤니티) | **API 없음**(§18 미구현) | 설계 시 허용 대상 | 커뮤니티 membership 구현과 함께 |
| 회원 · 매장 · 주문 · 상품 승인 · 홈 CMS · 광고/스폰서 · 서비스 약관/문의 · cafe24 · 정산 · AI | 각 `neture:operator`/`neture:admin` | **제외** | 새 역할은 어떤 기존 exact-match 역할 목록에도 들어가지 않는다 |

#### 21-7-2. 안 비교 → 권고

| 안 | 내용 | F9 · F11 대조 | 판정 |
|---|---|---|---|
| **Z. `neture:o4o_operator`** (새 역할 · 기존 서비스 키 `neture`) | 로컬 scope 설정 `o4o-operator-scope.middleware.ts`(`createMembershipScopeGuard` 재사용, `scopeRoleMapping['neture:o4o_ops'] = [o4o_operator, operator, admin]`) 를 위 허용 API 에만 적용 | F9 §4: ① `UserRole` 상수 ② `operator-assignment.service`(→ `assignRole`) 로만 부여(두 operator-role-catalog 동기 테스트 존재) ③ 가드 = 로컬 설정 ④ `RBAC-ROLE-CATALOG-V1` 갱신 ⑤ security-core 동결이라 **로컬 설정 예외**(pharmacy-hub · lecture 선례, 카탈로그 :88-91). F11: 부여 시 `service_memberships('neture')` active 자동 보장 · 스코프 가드가 DB 에서 membership 확인. **포럼 · 가입 경로는 역할만 보므로 새 역할에는 membership 확인을 추가**(설정 표 방식, 서비스별 inline 분기 금지) | **권고** — 새 ServiceKey · `platform_services` 행 · security-core/`@core` 변경 0 |
| Y. `o4o:operator` (새 서비스 키 `o4o`) | 새 ServiceKey · scope config · `service_memberships('o4o')` · `platform_services('o4o')` · 라우트마다 역할별 가드 분기 | 새 서비스 정체성 = 구조 변경(F11 §9 · CLAUDE.md 인프라 목록). `o4o→neture` alias 는 역맵을 깨므로 불가 | 비권고(범위 · 위험 큼) |

- 가드 결합 주의: Express 미들웨어는 AND 라 "기존 가드 OR 새 가드"를 쌓을 수 없다 → 허용 라우트의 라우터 가드를 **하나의 설정**(두 역할 집합을 모두 받는)으로 교체한다. `NETURE_SCOPE_CONFIG` 의 `neture:operator` 매핑에 새 역할을 넣으면 14개 이상 컨트롤러로 번지므로 금지.
- **선결 구조 문제**: `neture.routes.ts` 에서 운영자 대시보드 라우터(:171)가 `/operator` 전체에 `requireNetureScope('neture:operator')` 를 걸고 먼저 마운트된다 → 새 역할은 공급자 · 가입 라우트에 닿기 전에 403. 공급자 · 가입 컨트롤러를 먼저 마운트하고 가드를 경로 한정으로 바꿔야 한다(모든 `/operator/*` 순서에 영향).

#### 21-7-3. 변경 목록 (Z 기준 · 구현 시)

- API: 새 `middleware/o4o-operator-scope.middleware.ts` · `operator-supplier.controller.ts`(경로 한정 가드) · `neture.routes.ts`(마운트 순서) · `market-trial-operator.routes.ts` · `operator-registration.controller.ts` · `operator-forum.routes.ts`(새 역할 + membership · 영구삭제 거부) · `types/auth.ts` `UserRole` · `types/roles.ts` · `config/operator-role-catalog.ts`.
- **DB**: `roles` 에 `('neture:o4o_operator', service_key 'neture', role_key 'o4o_operator', is_assignable, not admin)` seed migration(`ON CONFLICT DO UPDATE`) — **migration = 중지 조건**.
- admin-dashboard: `lib/operator-role-catalog.ts` + 동기 테스트 · `/ops/*` 형제 경로(기존 `/*` platform floor 문자열 불변) · 운영자 메뉴(deny-by-default) · `AdminProtectedRoute` 에 membership 확인 · 역할별 착지 · 회귀 테스트 4개 개정(**`/ops` 진입 범위에서만**: `/ops` 는 새 역할+membership 허용 · `kpa:*` 거부 · platform 메뉴는 여전히 platform 전용).
- 문서: `RBAC-ROLE-CATALOG-V1`(로컬 설정 예외 · 새 역할) · CLOSED 결정 2건(`WO-O4O-ADMIN-PLATFORM-ONLY-ACCESS…` · IA 재편 CHECK)에 `/ops` 예외 기록.
- 테스트: 새 역할 403 확인(`/operator/dashboard` · members · stores · 상품 승인 · 포럼 영구삭제 · `/api/v1/admin/*`) · `neture:supplier` 가 새 scope 에 403 · 기존 `neture:operator` 동작 불변.

#### 21-7-4. 실행 전 사용자 결정 (중지 조건)

1. 안 Z 채택 · 역할 이름(`neture:o4o_operator`) · **roles seed migration** 승인.
2. `/operator/*` 마운트 순서 변경 승인(선결 구조 문제).
3. 공급자 governance(비활성/재활성, 현재 `neture:admin`) 포함 여부.
4. 펀딩 참여자 정산 · 결제 상태 변경(:118 · :120) 포함 여부.
5. 가입 신청 승인(= 공급자 역할 부여) 포함 여부.
6. 포럼 영구 삭제를 새 역할만 막을지, 기존 `neture:operator` 에게도 막을지.
7. admin-dashboard `/ops` 개방(CLOSED 결정 · 회귀 테스트 범위 개정) — 지시상 허용 범위이나 구현 착수 확인.

### 21-8. 방향 변경 기록 — 서브도메인 이전 우선 (2026-09-26 사용자 지시)

| 항목 | 내용 |
|---|---|
| 원래 목적 | INITIAL_PURPOSE 그대로(흩어진 기능을 확정 URL 체계에 배치 · 기존 QR · 인증 · 주문 경로 보존) |
| 현재 발견 | P2 운영자 역할은 roles migration · `/operator/*` 마운트 순서 · CLOSED 결정 번복 등 결정 7건이 남아 있다(§21-7-4). 반면 새 호스트는 전부 NXDOMAIN 이고 `neture.co.kr/supplier` 만 열린다 |
| 변경 이유 | 사용자가 **서브도메인 이전을 먼저** 진행하도록 우선순위를 바꿨다. 목표는 새 주소에서 기존 기능에 실제 진입 · 사용 가능한 상태(빈 진입 화면은 완료 아님) |
| 원래 목적과의 관계 | 같은 목적의 실행 순서 변경. P2 운영자 역할 · `/ops` 는 서브도메인 안정화 뒤 **같은 TODO 의 다음 순서** |
| 범위 확대 | **NO** — 오히려 이번 단계에서 `neture:o4o_operator` · roles migration · `/ops` · 운영자 등록 변경 · 공급자 경계 재설계 · PH 고유 기능 일괄 이관 · 환불 자동화를 제외 |
| 완료 기준 변경 | **NO** — DONE_CRITERIA 유지. 커뮤니티 별도 가입 · 매장 다중 서비스 데이터는 "주소 이전과 연결된 후속 기능"으로 남은 조건 표시(동작하지 않는 기능을 이전 완료로 표시하지 않음) |

**실행 순서(지시)**: ① 경로 대응표 확정 ② 공급자 · 펀딩 ③ 약국 · 소매 · 분회(`/kpa/tablet/*` · `/kpa/store/*` 보존, 소매 공개 QR 은 실제 열리는 경로만) ④ 커뮤니티 · 매장 링크 ⑤ 호스트별 DNS · 인증서 · LB · CORS · Google origin · handoff · 로그인 복귀(Store Google origin 미확인 상태로 로그인 PASS 금지) ⑥ 옛 주소 경로별 보호(일괄 301 금지).
**보고 구분**: 코드/CI · DNS/콘솔 설정 · 운영 배포 · 브라우저 실측. `DEPLOY_ENABLED=false` 동안 운영 이전 완료 판정 없음.

### 21-9. 서브도메인 이전 ① 대응표 · ② 공급자 · 펀딩 (2026-09-26)

**출발 상태(실측 §2-1)**: `neture.co.kr/supplier` · `/market-trial` 정상, `supplier.neture.co.kr` · `funding.neture.co.kr` 은 NXDOMAIN(서비스 없음).

#### 대응표 — 공급자 · 펀딩 (나머지 호스트는 §4 행 그대로, 착수 시 이 형식으로 확정)

| 현재 | 새 호스트 | 처리 | 세션 · 인증 |
|---|---|---|---|
| `neture.co.kr/supplier` (랜딩) · `/supplier/*` (약 40, `SupplierRoute`) · `/supplier/forum*` 레거시 deep-link · `/account/supplier/*` · `/workspace/*` | `supplier.neture.co.kr` — **경로 형태 그대로**(`/supplier/...`), `/` → `/supplier` | 같은 번들 재사용 · 호스트 경계(`HostBoundary`) | 호스트별 localStorage — 새 호스트에서 Google 로그인 필요(아래 게이트) |
| `neture.co.kr/market-trial` · `/market-trial/my` · `/market-trial/:id` | `funding.neture.co.kr` — 경로 그대로, `/` → `/market-trial` | 동일 | 참여는 로그인만 필요(`market-trial.routes.ts:33`) |
| 공급자 호스트에서 소유하지 않은 경로(`/operator` · `/admin` · `/guide` · `/forum` · `/store` · `/` 외 전부) | → `https://neture.co.kr` 같은 경로 · 쿼리 · 해시 | 전체 이동(내부 링크 약 135개 수정 불요) | 대표 호스트 세션 필요 |
| 모든 새 호스트의 `/handoff` · `/login` · `/register*` · `/terms` · `/privacy` · `/contact` · `/mypage*` | 그 호스트에서 그대로 | — | 그 호스트 세션 |
| 대표 호스트 `neture.co.kr/supplier*` · `/market-trial*` 옛 링크 · 알림 `targetUrl`(상대경로) | **당분간 대표 호스트에서 그대로 동작**. 새 호스트 검증 후 빌드 플래그(`VITE_HOST_CUTOVER_SUPPLIER` / `_FUNDING`)로만 경로 · 쿼리 보존 이동 | 일괄 301 아님 · 앱 단 전환 | — |
| 공급자 운영 승인(`/operator/suppliers` · `/operator/market-trial`) | 대표 호스트 유지 | — | P2 운영자 역할은 다음 순서 |

#### 구현 (코드)

- `services/web-neture/src/lib/hostProfile.ts` — 호스트 판정 · 소유/공유 경로 · 판정 함수 · cutover 플래그(기본 꺼짐).
- `services/web-neture/src/components/HostBoundary.tsx` — `<Routes>` 를 감싸 판정 적용(route 선언 · 경로 불변).
- API CORS 에 목표 호스트 5개 추가(`supplier` · `pharmacy` · `retail` · `kpa` · `community` `.neture.co.kr`, `funding` 은 기존). 정확 origin 만 · 와일드카드 0 · `partner` 는 예약이라 제외. 쿠키 도메인은 `.neture.co.kr` 자동 판정이라 변경 불요.
- 테스트: web-neture vitest 11건(호스트 판정 · 소유/공유 · 교차 이동 쿼리 보존 · 접두만 같은 경로 · cutover 플래그) · CORS 계약 spec PASS · web-neture tsc 0.
- Supplier FROZEN 기준 준수: 공급자 호스트에 운영자 · 커뮤니티 · Store 기능 신설 없음(소유하지 않은 경로는 대표 호스트로), `/supplier/forum*` 경로 · 리다이렉트 체인 변경 없음, 펀딩 명칭 "유통참여형 펀딩" 변경 없음.

#### 남은 게이트 (공급자 · 펀딩 호스트)

| 게이트 | 내용 | 주체 | 상태 |
|---|---|---|---|
| DNS | Gabia A 레코드 `supplier` · `funding` → `136.110.132.35` | 사용자(Gabia) | 미실시 |
| 인증서 | 호스트별 **별도** 관리형 인증서 + cert map entry(`cm-cert-neture-v2` 13도메인 묶음에 추가 금지 — §2-2) | gcloud(운영 인프라 변경) | **승인 대기** |
| LB | URL map host rule `supplier.neture.co.kr` · `funding.neture.co.kr` → 기존 `backend-neture-web-http`(새 backend · NEG 불요) | gcloud(운영 인프라 변경) | **승인 대기** |
| Google JS origin | `https://supplier.neture.co.kr` · `https://funding.neture.co.kr` 추가 | 사용자(GCP 콘솔) | 미실시 · Store origin 도 **미확인** |
| 배포 | neture-web · API(CORS) | `DEPLOY_ENABLED=false` | 미반영 |
| 대표 → 새 호스트 로그인 이어받기 | 현재 handoff 는 neture 대표 진입이 `returnPath='/'` · origin `neture.co.kr/www` 고정이라 새 호스트로 세션을 옮길 대상이 없다 → 새 호스트에서 직접 Google 로그인은 가능 | handoff 새 대상 추가 = **인증 API 계약 변경(중지 조건)** | 결정 필요 |
| SEO | 새 호스트가 전체 사이트와 같은 `robots.txt` · sitemap 을 서빙(소유하지 않은 경로는 이동하므로 중복 색인은 제한적) · 호스트별 canonical 은 미구현 | — | 기록 |
| 브라우저 실측 | 직접 접속 · 새로고침 · 로그인 · 복귀 · 핵심 업무(공급자 대시보드 · 상품 · 주문 / 펀딩 목록 · 상세 · 참여) | — | 배포 후 |
| 공급자 실계정 | Supplier 기준 §10 `DEFERRED_PENDING_GOOGLE_IDENTITY` — 실제 공급자 로그인 smoke 는 그 해제 뒤 | — | 차단 |

**인증서 · LB 실행 절차(승인 후 · 선례 = store · study)**
```
gcloud certificate-manager certificates create cm-cert-supplier-v1 --domains=supplier.neture.co.kr
gcloud certificate-manager maps entries create cm-entry-supplier --map=o4o-main-cert-map --certificates=cm-cert-supplier-v1 --hostname=supplier.neture.co.kr
gcloud certificate-manager certificates create cm-cert-funding-v1 --domains=funding.neture.co.kr
gcloud certificate-manager maps entries create cm-entry-funding --map=o4o-main-cert-map --certificates=cm-cert-funding-v1 --hostname=funding.neture.co.kr
gcloud compute url-maps add-host-rule o4o-global-lb --global --hosts=supplier.neture.co.kr,funding.neture.co.kr --path-matcher-name=path-matcher-neture
```
- 관리형 인증서는 DNS 가 LB IP 를 가리켜야 발급된다 → DNS 선행. 발급 전까지 HTTPS 불가.
- 원복: host rule 제거(`url-maps remove-host-rule`) · map entry 삭제. 기존 호스트 · 인증서 영향 0.

### 21-10. 여섯 호스트 인프라 · 코드 (2026-09-26 · 사용자 지시 "서브도메인 이전 계속")

#### DNS · 인증서 · LB (운영 인프라 — 사용자 승인 범위)

| 호스트 | 공개 DNS(8.8.8.8 · 1.1.1.1) | 인증서(별도 · 관리형) | LB 연결 | HTTPS 실측 | 현재 서빙 |
|---|---|---|---|---|---|
| supplier.neture.co.kr | 136.110.132.35 | `cm-cert-supplier-v1` **ACTIVE** | host rule → `path-matcher-neture` → neture-web | 200 | 운영 neture-web(`14587a9ad`) — 새 호스트 코드 **미배포**라 O4O 홈이 보인다 |
| funding.neture.co.kr | 〃 | `cm-cert-funding-v1` ACTIVE | 〃 | 200 | 〃 |
| community.neture.co.kr | 〃 | `cm-cert-community-v1` ACTIVE | 〃 | 200 | 〃 |
| pharmacy.neture.co.kr | 〃 | `cm-cert-pharmacy-v1` ACTIVE | **새 matcher** `path-matcher-pharmacy` → kpa-society-web(`/kpa` 분회 규칙 없음) | 200 | KPA 앱 그대로(호스트 비의존 확인) |
| retail.neture.co.kr | 〃 | `cm-cert-retail-v1` ACTIVE | host rule → `path-matcher-k-cosmetics` | 200 | K-Cosmetics 앱 그대로(호스트 비의존 확인) |
| kpa.neture.co.kr | 〃 | `cm-cert-kpa-v1` ACTIVE | **새 matcher** `path-matcher-kpa-host` → kpa-branch-web | 200 · `/kpa/assets/*` 200 | 분회 앱 — 운영 버전은 이 호스트를 자체 도메인으로 오판(수정 코드 **미배포**) |

- 기존 13도메인 인증서(`cm-cert-neture-v2`) 수정 0. 변경 전 URL map export 백업(세션 scratchpad `urlmap-before-20260926.yaml`). 원복 = 추가한 host rule · path matcher · map entry 삭제.
- 변경 직후 기존 호스트 회귀: neture · www · admin · store · study · kpa-society · k-cosmetics · pharmacyhub `/` 200, `neture.co.kr/hospital` 200, `kpa-society.co.kr/kpa/` · `/kpa/tablet/x` 200, `pharmacyhub.co.kr/qr/x` 200, API `/health` 200. **옛 `/kpa/tablet/*` · `/kpa/store/*` 규칙 변경 없음.**

#### 코드 (이번 커밋)

- web-neture: `/` 를 호스트별 대표 화면으로 **직접 렌더**(supplier = `SupplierLandingPage`, funding = `MarketTrialHubPage`, community = 커뮤니티 진입 화면) — 리다이렉트 없음. `community` 호스트 프로필: `/pharmacist` → `pharmacy.neture.co.kr/forum`, `/retail` → `retail.neture.co.kr/forum`(현재 동작하는 각 서비스 포럼으로 연결). vitest 15건.
- web-kpa-branch: `PLATFORM_HOSTS` 에 `kpa.neture.co.kr` — `kpa.neture.co.kr/{분회}` root 진입. 옛 `kpa-society.co.kr/kpa/{분회}` 판정 · `/kpa` asset base 불변. 정적 계약 spec 2건.
- pharmacy · retail: 앱 코드 변경 불요(호스트 의존 코드 없음 — `@k-cosmetics.site` 메일 표기만).
- 서비스 키 · role prefix · `service-catalog` 도메인 **변경 없음** — 새 호스트 검증 전까지 handoff 대상 · 새 QR 인쇄 호스트는 옛 도메인 유지(옛 QR 보호).

#### 커뮤니티 · Store 표시 기준

- `community.neture.co.kr/pharmacist` · `/retail`: **주소 진입 연결(부분)** — 실제 활동은 각 서비스 포럼. 독립 커뮤니티 가입 · 승인은 **미구현**(§18) → 완료로 표시하지 않는다.
- `store.neture.co.kr/hub` · `/my-store`: `/hub` 는 기존 동작, `/my-store` 는 **미구현**(현재 `/store`), 다중 서비스 데이터 통합 미구현(§17) → 완료로 표시하지 않는다.

#### 새로 드러난 선결 조건 — handoff 대상 추가는 DB 변경을 요구한다

- 승인된 "공급자 · 펀딩 handoff 대상 추가"는 작업공간 대상을 늘리는 방식인데, `handoff_tokens` 의 CHECK 제약이 `target_workspace = 'store'` 만 허용한다(`1789974015939-AlterHandoffTokensTargetWorkspace.ts:29-33`) → **제약 변경 migration 필요 = 중지 조건(DB schema)**. 코드는 아직 넣지 않았다.
- 제안: incremental migration 으로 제약을 `target_workspace IN ('store','supplier','funding')` 로 교체(+ `expected-schema-states` · ledger spec 같은 커밋), `HANDOFF_WORKSPACES` 확장, 대상별 exchange origin lock(`supplier.neture.co.kr` · `funding.neture.co.kr` 정확 일치), 대상 URL 생성, Neture 에서 공급자 · 펀딩으로 가는 진입 링크를 handoff 로. 원복 = 이전 제약으로 되돌리는 down migration.
- 이 전까지: 새 호스트에서 **직접 Google 로그인**은 가능(Google 승인 원본 등록 전제).

### 21-11. 통제 배포 준비 · handoff migration 설계 (2026-09-26 사용자 판정)

**판정(사용자)**: 서브도메인 코드 `236c22dfc` 를 먼저 통제 배포(조건부 승인 — Google 원본 확인 · 배포 직전 SHA/CI/revision 점검 선행, `303221b8b` Supplier 동결 포함 범위), handoff 제약 변경 migration 은 **같은 TODO 의 다음 단계**로 구현 · 운영 적용은 검토 후. 첫 배포(migration 0건)와 DB 변경의 판정은 분리한다.

#### 배포 선행 조건 — Google 승인 원본

| 원본 | 상태 | 근거 |
|---|---|---|
| `https://supplier.neture.co.kr` · `https://funding.neture.co.kr` · `https://community.neture.co.kr` · `https://pharmacy.neture.co.kr` · `https://retail.neture.co.kr` · `https://kpa.neture.co.kr` | **미확인** | GCP 콘솔(OAuth 웹 클라이언트) 화면은 gcloud 로 조회 불가 · 이 세션에 브라우저 도구 없음. Google `checkOrigin` 공개 엔드포인트는 등록된 `neture.co.kr` 까지 모두 403 → 증거로 쓸 수 없음 |
| `https://store.neture.co.kr` | **미확인**(기존) | 동일 |

→ **사용자 콘솔 확인 · 누락분 등록 · 캡처(또는 실제 로그인 결과) 전까지 배포 보류.** 등록 완료로 추정하지 않는다.

#### 배포 직전 점검 절차 (조건 충족 시)

1. `git fetch` → `origin/main` 이 `236c22dfc` 인지 확인. **다르면 중지** — 게이트를 연 동안의 push 는 곧바로 배포된다(push 트리거). 현재 작업트리에 다른 세션의 미커밋 변경(ai-tools · package.json · lockfile)이 있어, 게이트 개방 중 push 가능성을 사용자와 확인한다.
2. `236c22dfc` CI success 확인(run 36228186534 ✔).
3. 서비스별 현재 revision · 이미지 태그 기록(원복 대상 = `14587a9ad` 이미지 revision).
4. `gh variable set DEPLOY_ENABLED --body true` → API workflow dispatch(main) → 배포 3신호(job 실행 · revision 생성 · traffic 100%) 확인 → API 회귀 smoke(`/health` · 기존 로그인 경로 · exchange 응답에 `Set-Cookie` 없음).
5. 웹 앱 순서 dispatch: neture-web → kpa-branch-web → store-web · k-cosmetics-web · lecture-web · pharmacy-hub-web → o4o-admin-dashboard. 각 단계 기존 호스트 · 새 호스트 실측.
6. 감시: 같은 시간대 다른 서비스 자동 추종 · 재실행(deploy-web concurrency 상호 취소 주의).
7. 종료: `gh variable set DEPLOY_ENABLED --body false` → 확인.
8. 회귀 시: 해당 서비스 `gcloud run services update-traffic <svc> --to-revisions=<이전 revision>=100`.
9. cutover 플래그(`VITE_HOST_CUTOVER_SUPPLIER` / `_FUNDING`)는 **꺼 둔 채** 배포.

#### handoff 제약 변경 migration — 설계 (구현 승인 · 운영 적용은 검토 후)

**왜 지금 파일을 main 에 넣지 않는가**: 이 저장소는 API 배포 Job 이 migration 을 자동 실행한다. `236c22dfc` 배포 전에 migration 이 main 에 들어가면 첫 배포(= main 기준 dispatch)에 DB 변경이 섞인다. → **첫 배포 완료 후** migration 커밋을 올린다(사용자 지시 "섞지 말 것").

| 항목 | 내용 |
|---|---|
| 파일 | `apps/api-server/src/database/migrations/<ts>-ExtendHandoffTokensWorkspaceTargets.ts` + `database/incremental/manifest.ts` 등록 |
| up | `DROP CONSTRAINT "CHK_handoff_tokens_target_kind"` → 재생성: `(target_service_key IS NOT NULL AND target_workspace IS NULL) OR (target_service_key IS NULL AND target_workspace IS NOT NULL AND target_workspace IN ('store','supplier','funding'))` — `store` 보존, 두 값만 추가, 임의 문자열 금지 · 둘 다 NULL 차단 유지 |
| down | ① `DELETE FROM handoff_tokens WHERE target_workspace IN ('supplier','funding')` (단일 사용 · 60초 TTL 토큰이라 소비 · 만료된 행은 효력 없음) ② 제약을 `'store'` 전용으로 재생성. **①이 없으면 새 대상 토큰 행이 남아 있는 한 down 이 CHECK 위반으로 실패한다** |
| 원복 운영 조건 | 새 대상 토큰 발급 중단(코드 원복 배포 또는 해당 진입 비활성) → 60초 + 여유 대기 → 미사용 새 대상 토큰 0 확인(`SELECT count(*) … WHERE target_workspace IN ('supplier','funding') AND consumed_at IS NULL AND expires_at > now()`) → down 실행. 정리 job(`expires_at < now() - 1h` 삭제)이 이미 있다(`handoff-token.service.ts:187`) |
| 코드 | `HANDOFF_WORKSPACES = ['store','supplier','funding']` · 대상별 exchange origin 정확 일치(`supplier.neture.co.kr` · `funding.neture.co.kr`, 비프로덕션 localhost) · 대상 URL `https://{host}/handoff?token=&returnTo=` · 대상 자격(공급자 = 활성 neture membership + 공급자 역할, 펀딩 = 인증 사용자) — 기존 store 자격 규칙 불변 |
| 스키마 기대 상태 | `expected-schema-states.ts` 에 새 fingerprint — baseline 2026-09-18-id685 fresh bootstrap + incremental 전체를 **격리 PostgreSQL 15** 에서 산출(운영 DB fingerprint 채택 아님) · ledger spec · agent 테스트 같은 커밋 |
| 계약 테스트 | 제약: `store` · `supplier` · `funding` 허용, 임의 값 · 둘 다 NULL 거부 / exchange: supplier 토큰을 funding · store · neture origin 에서 교환 → 401 / 기존 store · 서비스 handoff 회귀 0 / down 이 새 대상 행 삭제 후 성공 |
| 운영 적용 | 배포 Job 자동 실행(CI/CD 원칙). 적용 전 사용자에게 migration · 영향 · 원복 결과 제시 |
