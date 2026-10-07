# CHECK-O4O-NETURE-HOME-ENTRY-REFRESH-V1

> **WO**: WO-O4O-NETURE-HOME-ENTRY-REFRESH-V1 — neture.co.kr 대표 홈 진입 링크를 현행 구조(Google-only 로그인 · 서브도메인 정본 URL)에 맞춘다
> **작성일**: 2026-09-28 · **기준 커밋**: `46e5d14b8`(origin/main)
> **판정**: **CODE_COMPLETE · PRODUCTION_SMOKE_PENDING_DEPLOY** — 코드 · 테스트 · 빌드 · 로컬 번들 실브라우저 smoke PASS. 배포 게이트 `DEPLOY_ENABLED=false` 라 변경분은 아직 프로덕션에 반영되지 않았다.

URL 판정 근거는 기억이 아니라 **현재 프로덕션 실측**(§3)과 정본
[`CHECK-O4O-URL-FIRST-CENSUS-V1`](CHECK-O4O-URL-FIRST-CENSUS-V1.md) CONFIRMED_DECISIONS ·
[`CHECK-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1`](CHECK-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1.md) §8-5(배포 1 실측)이다.

---

## 1. 홈 구성 파일

| 파일 | 역할 | 이번 변경 |
|---|---|---|
| [`services/web-neture/src/pages/O4OHomePage.tsx`](../../services/web-neture/src/pages/O4OHomePage.tsx) | 대표 홈 전체(`/`, `CURRENT_HOST_PROFILE === 'main'` 일 때만 · NetureLayout 밖 → Neture header/footer/bottom nav 없음) | **수정** — 로그인 전 pill `ENTRIES` |
| [`services/web-neture/src/components/home/HomeEntryPanel.tsx`](../../services/web-neture/src/components/home/HomeEntryPanel.tsx) | 로그인 후 패널(4 workspace 카드 · 내 서비스 · 가입 가능한 서비스) | 무변경 (서버 catalog 구동 · §7 잔여) |
| [`services/web-neture/src/lib/home-entry.ts`](../../services/web-neture/src/lib/home-entry.ts) | 로그인 후 모델(`publicServiceUrl` = 서버 catalog domain) | 무변경 |
| [`services/web-neture/src/components/home/HomeServiceNews.tsx`](../../services/web-neture/src/components/home/HomeServiceNews.tsx) | 「O4O 서비스 소식」(내부 `/forum` 링크) | 무변경 |
| [`services/web-neture/src/components/LoginModal.tsx`](../../services/web-neture/src/components/LoginModal.tsx) · `contexts/LoginModalContext.tsx` | 로그인/회원가입 모달(Google-only · `GoogleContinue`) | 무변경 |
| [`services/web-neture/src/lib/hostProfile.ts`](../../services/web-neture/src/lib/hostProfile.ts) | 기존 정본 origin(`HOST_ORIGIN.supplier` · `.community`) | 무변경 — **재사용** |

새 routing framework · 새 config 없음.

## 2. 홈의 모든 클릭 요소 census (변경 전 · 프로덕션 실측)

실측: 2026-09-28, headless Chromium, `https://neture.co.kr/`, 1280px · 390px 결과 동일, console error 0.
데스크톱 · 모바일 모두 별도 모바일 메뉴 · 헤더 · 하단 nav 없음(홈이 NetureLayout 밖).

| # | 위치 | 요소 | 변경 전 대상 | 분류 | 조치 |
|---|---|---|---|---|---|
| 1 | 서비스 안내 pill | 약국 | `https://kpa-society.co.kr/` | B 구 호스트 | → `https://pharmacy.neture.co.kr/` |
| 2 | 서비스 안내 pill | 약국 경영 | `https://pharmacyhub.co.kr` | C 흡수(신규 가입 서비스로 노출 안 함) | **제거** |
| 3 | 서비스 안내 pill | 화장품 | `https://www.k-cosmetics.site/` | B 구 호스트 | → `https://retail.neture.co.kr/` (라벨 유지) |
| 4 | 서비스 안내 pill | 공급자 | `/supplier` | B 하위경로 | → `HOST_ORIGIN.supplier` = `https://supplier.neture.co.kr` |
| 5 | 서비스 안내 pill | 커뮤니티 | `/community` (Neture 포럼) | B 하위경로 | → `HOST_ORIGIN.community` = `https://community.neture.co.kr` |
| 6 | 우상단 · 중앙 | 로그인 (×2) | `openLoginModal()` | F | 유지 — Google-only 확인 |
| 7 | 우상단 · 중앙 | 회원가입 (×2) | `openRegisterModal()` → 같은 로그인 모달 | F | 유지 — Google 계속하기가 가입 겸함 |
| 8 | 서비스 소식 | 전체 보기 · 새 기능·업데이트 · 사용법 · 활용 사례 | `/forum/posts?category=…(&tag=…)` | D | 유지 |
| 9 | footer | 이용약관 · 개인정보처리방침 · Contact | `/terms` · `/privacy` · `/contact` | D | 유지 (전부 렌더 확인) |
| 10 | footer | 법정정보 | `PublicLegalFooterInfo serviceKey="neture"` (API 값) | D | 유지 |
| 11 | 로그인 후 계정 메뉴 | 내 정보 · O4O 로그아웃 | `/mypage` · `logout()` | D · F | 유지 |
| 12 | 로그인 후 패널 | workspace 카드 · 내 서비스 · 가입 가능한 서비스 | 내부 Link / 서버 catalog 공개 URL / `POST /auth/handoff` | A~D 혼재 | 무변경 — §7 잔여 R1 |

E(병원약국): 홈에 링크 **없음**. 그대로 둔다(§5). G(외부): Google 계정 화면 외 없음.

## 3. 정본 URL mapping (프로덕션 실측 2026-09-28)

| 서비스 | 정본 URL | 실측 결과 |
|---|---|---|
| 약국 | `https://pharmacy.neture.co.kr/` | 200 · "KPA Society — 커뮤니티" · h1 "정보를 매장 실행 경쟁력으로 연결합니다" · console error 0 |
| 화장품(소매) | `https://retail.neture.co.kr/` | 200 · "K-Cosmetics - O4O Platform" · "K-Beauty Community Hub" · error 0 |
| 공급자 | `https://supplier.neture.co.kr` | 200 · "Neture 공급자로 참여하세요" · error 0 |
| 커뮤니티 | `https://community.neture.co.kr` | 200 · "O4O 커뮤니티" · error 0 |
| 병원약국 | `https://neture.co.kr/hospital` | 200 · "병원약국 \| Neture" · error 0 (홈 진입 대상 아님) |

(curl 은 SPA 라 전부 200 이므로 판정에 쓰지 않았고, 실브라우저 렌더 결과로 판정했다.)

## 4. before → after

| 라벨 | before | after | 열기 |
|---|---|---|---|
| 약국 | `https://kpa-society.co.kr/` | `https://pharmacy.neture.co.kr/` | 새 탭 (유지) |
| 약국 경영 | `https://pharmacyhub.co.kr` | **제거** | — |
| 화장품 | `https://www.k-cosmetics.site/` | `https://retail.neture.co.kr/` | 새 탭 (유지) |
| 공급자 | `/supplier` (같은 탭 `<Link>`) | `https://supplier.neture.co.kr` | 새 탭 (다른 origin 이라 외부 링크로) |
| 커뮤니티 | `/community` (같은 탭 `<Link>`) | `https://community.neture.co.kr` | 새 탭 |

주석도 갱신했다: 구 호스트는 인쇄 QR 보존용이고 대표 홈 진입이 아니며, 약국 경영은 흡수됐고, 병원약국은 분리 서비스라는 점을 적었다.
구 호스트 · `/supplier` · `/community` 경로 자체는 **살아 있다**(QR · cutover flag off). 이번 변경은 홈에서 그 경로로 가는 **진입만** 바꾼다.

## 5. Google 로그인 · 병원약국 처리

- **로그인 · 회원가입**: 프로덕션 `https://neture.co.kr/` 에서 두 버튼 모두 같은 모달을 연다. `input[type=password]` 0개, Google GIS iframe(`accounts.google.com/gsi/button`) 렌더 확인. 문구는 "처음이신가요? 같은 버튼으로 약관 동의 후 계정이 만들어집니다." legacy email/password 진입은 없다. 로컬 번들은 Google client ID 가 없어 "Google 로그인은 준비 중입니다" 로 표시되며, 이는 빌드 env 차이이지 결함이 아니다.
- **병원약국**: 홈에 추가하지 않았다. `/hospital` 정상 로드만 확인했다. hospital.neture.co.kr 은 대상이 아니다. 병원약국 코드 변경 0.

## 6. 검증

| 항목 | 결과 |
|---|---|
| 신규 테스트 [`O4OHomePage.entry-pills.test.tsx`](../../services/web-neture/src/pages/__tests__/O4OHomePage.entry-pills.test.tsx) | 2/2 PASS — pill href · 새 탭 · 구 호스트/하위경로/약국 경영/병원약국/partner 비노출 |
| web-neture vitest 전체 | **23 files / 181 tests PASS** |
| `tsc && vite build` (web-neture) | **PASS** — 처음에는 `MySettingsPage.tsx` TS2741 로 실패. 원인은 로컬 `packages/account-ui/dist` 가 stale(git ignored)해서 은퇴한 `onChangePassword` 가 남아 있던 것. `pnpm --filter @o4o/account-ui run build` 로 로컬 dist 만 재생성한 뒤 PASS. 저장소 변경 없음 · 이번 변경과 무관 |
| 로컬 번들 실브라우저 smoke (`vite preview`, 1280 · 390) | PASS — pill 4개가 after URL · `_blank`. 로그인/회원가입 모달 password input 0. console error 4건은 localhost → 프로덕션 API CORS(news · footer-legal)로 예상된 것이고, 그 때문에 소식 링크가 `/forum` 으로 축소 표시된 것도 환경 차이다 |
| 프로덕션 smoke (변경 후) | **PENDING** — `DEPLOY_ENABLED=false` (배포 보류 게이트). 배포 후 `https://neture.co.kr/` pill href 4개 재확인이 필요하다 |

## 7. 잔여 (범위 밖 — 보고만)

| # | 잔여 | 이유 | 제안 |
|---|---|---|---|
| R1 | 로그인 후 `HomeEntryPanel` 의 가입 링크 · handoff 대상이 서버 `apps/api-server/src/config/service-catalog.ts` domain(kpa-society.co.kr · k-cosmetics.site · pharmacyhub.co.kr)을 쓴다 | catalog 변경은 API · handoff 계약 변경(중지 조건). ~~catalog 에 "새 호스트 검증 전까지" 의도적으로 유지한다고 명시돼 있다~~ → **정정(2026-09-28)**: catalog 에 그런 주석은 없다(해당 문구는 `hostProfile.ts` supplier/funding cutover 주석). domain 값은 단순 legacy 값이다 — [IR-O4O-NETURE-HOME-CURRENT-STATE-AND-IA-REDESIGN-V1 §7](../investigations/IR-O4O-NETURE-HOME-CURRENT-STATE-AND-IA-REDESIGN-V1.md) | 별도 WO: service-catalog domain REPOINT (새 호스트 검증 완료 후) |
| R2 | [`packages/shared-space-ui/src/O4OHelpSection.tsx`](../../packages/shared-space-ui/src/O4OHelpSection.tsx) cross-service 카탈로그가 구 호스트(kpa-society.co.kr · www.k-cosmetics.site)를 가리킨다 | shared module — 소비처 식별 절차가 필요하다 | 별도 WO (Shared Module Change Protocol) |
| R3 | 대표 홈 로그인 모달 헤더 문구 "Neture 로그인 · 공급자 연결 서비스" 가 O4O 대표 입구 성격과 어긋날 수 있다 | LoginModal 은 supplier 등 다른 host 와 공용. 문구 판단 필요 | 문구 판단 후 별도 WO |
| R4 | 대표 홈 pill 에 펀딩 · 강의 · 매장 진입이 없다 | 추가는 IA 결정이다(이번 WO 는 기존 링크 정정만) | 다음 IA WO |
| R5 | 변경분 프로덕션 반영 · smoke | 배포 게이트 off | 배포 승인 후 §6 PENDING 항목 확인 |

## 8. 변경 파일

- `services/web-neture/src/pages/O4OHomePage.tsx` — `ENTRIES` 5→4 · `HOST_ORIGIN` import · 주석
- `services/web-neture/src/pages/__tests__/O4OHomePage.entry-pills.test.tsx` — 신규
- `docs/checks/CHECK-O4O-NETURE-HOME-ENTRY-REFRESH-V1.md` — 본 문서

API · route · DB · package.json · CI · shared module 변경 0.

## 9. 문서 정합

발견 0건(기준 문서 drift 없음 — R1~R3 는 코드 잔여) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건(R1 · R2 · R3).
