# IR-O4O-NETURE-HOME-CURRENT-STATE-AND-IA-REDESIGN-V1

> **유형**: READ-ONLY 조사 (코드 · 설정 · DB · 배포 변경 0)
> **작성일**: 2026-09-28 · **기준**: origin/main `4e34267ef` + production(neture.co.kr 외 서브도메인 7개) 실브라우저 실측
> **선행**: [`CHECK-O4O-NETURE-HOME-ENTRY-REFRESH-V1`](../checks/CHECK-O4O-NETURE-HOME-ENTRY-REFRESH-V1.md) (로그인 전 pill URL 정정 — 코드 완료 · **미배포**)
> **결론 형식**: 최종 IA 선택 · 구현 · 이미지 제작은 하지 않는다. KEEP/MODIFY/REMOVE/ADD **후보**와 IA 대안 3개까지만 제시한다.

### 조사 방법과 한계

| 대상 | 방법 |
|---|---|
| 로그인 전 | production 실브라우저(headless Chromium, 1280 · 390) — DOM 순서 · 링크 · 호출 API · 스크린샷 |
| 로그인 후 | **코드 추적만** — 프로덕션 users 가 관리자 1행뿐이고 테스트 계정이 없다(2026-09-23 삭제). 로그인 후 화면은 실브라우저로 확인하지 못했다(아래 표기 `CODE_TRACE`) |
| 서비스 7개 | production 비로그인 실측 + 코드 · 최신 CHECK 문서 |

증거 스크린샷은 세션 scratchpad 에만 있다(저장소 미포함): `home-desktop.png` · `home-mobile.png` · `home-submit-loggedout.png` · `svc-*.png`.

---

## 1. Executive Summary

1. **현재 홈은 "AI 입력창 + 로그인 유도 + 서비스 pill + 소식" 네 조각의 최소 페이지다.** Header · 메뉴 · 모바일 nav · Help 가 없다(홈이 NetureLayout 밖). 로그인 후에는 pill 대신 `HomeEntryPanel`(업무 공간 4카드 · 내 서비스 · 상태 · 가입 가능한 서비스)이 나온다.
2. **AI 입력창은 실제 LLM 기능이지만 O4O 서비스와 연결돼 있지 않다.**
   - 로그인하면 Gemini(기본값)로 답하고, 첨부 이해와 Local Agent 기반 PC · 브라우저 작업이 된다.
   - 약국 · 리테일 · 공급자 · 커뮤니티 · 강의 · 펀딩 · 내 매장으로 이동하거나 조회하는 도구는 **0개**다.
   - 로그인 전 제출하면 로그인 모달만 열린다.
3. **로그인 전과 로그인 후의 서비스 주소가 서로 다르다.**
   - 로그인 전 pill(코드상)은 새 서브도메인을 가리킨다.
   - 로그인 후 「가입 가능한 서비스」 · handoff 는 서버 `service-catalog.ts` 의 **구 호스트**(kpa-society.co.kr · k-cosmetics.site · pharmacyhub.co.kr)를 가리킨다.
   - PharmacyHub 는 로그인 전에서 제거됐지만 로그인 후에는 여전히 「가입 가능」이다.
4. **신규 사용자 흐름에 막힘이 있다.**
   - Google 가입 뒤 서비스 선택 단계가 없다.
   - 「가입 가능한 서비스」는 다른 origin 새 탭(토큰 없음)이라 **Google 로그인을 다시** 해야 한다.
   - 그 목록의 `Neture → /register` 는 로그인된 사용자에게 **로그인 모달을 다시 여는 루프**다.
5. **Google-only 체계와 맞지 않는 잔존이 홈 밖에 있다.**
   - 약국 · 리테일 서비스 첫 화면 상단의 「🧪 체험용 계정 제공 / 체험 계정 보기」는 공용 비밀번호 계정 전제였다(2026-06-14).
   - 비밀번호 로그인은 2026-09-24 에 은퇴했고 해당 계정도 없다.
6. **서비스 7개는 성격이 셋으로 갈린다.**
   - 가입형 독립 서비스: 약국 · 리테일.
   - 업무 Workspace: 공급자 · 내 매장.
   - 공개 참여 · 콘텐츠: 커뮤니티 · 강의 · 펀딩.
   - 같은 카드로 나란히 놓을 근거는 코드에서 찾지 못했다.
7. **내 매장 · 강의는 아직 "홈에서 권하는" 수준이 아니다.**
   - 내 매장: 실계정 E2E 미완, handoff flag OFF.
   - 강의: 강좌 0개, 일반 사용자가 스스로 가입할 경로 없음(`joinEnabled=false`).
   - 펀딩은 공개 목록 · 로그인 참여가 동작하지만 현재 모집 0건이다.

## 2. 현재 로그인 전 홈 구조 (production 실측)

데스크톱과 모바일의 순서는 같다. 가로 overflow 는 없다(scrollWidth = viewport).

| # | 영역 | 컴포넌트 | 목적 | 데이터 | 로그인 | 클릭 대상 | 현행성 | 비고 |
|---|---|---|---|---|---|---|---|---|
| 1 | 우상단 로그인 · 회원가입 | `O4OHomePage` 헤더 줄 | 인증 진입 | static | no | 로그인 모달(둘 다 같은 모달) | current | #4와 중복 |
| 2 | 워드마크 「O4O」 + 「무엇을 도와드릴까요?」 | `O4OHomePage` | 정체성 · AI 진입 | static | no | — | current | 무엇을 하는 곳인지 설명이 없다 |
| 3 | 첫 사용 안내 배너 | FIRST_USE_GUIDANCE | AI 사용법 한 줄 | localStorage `neture:automation:intro-seen:v1` | no | 닫기 | current | 모바일에서 4줄 |
| 4 | AI 입력창(+ 첨부) | `form[data-testid=home-composer]` | AI 요청 | `POST /api/ai/request` | 제출 시 필요 | 비로그인 제출 → 로그인 모달 | current | §5 |
| 5 | 소개문 + 로그인 · 회원가입 | `O4OHomePage` | 가치 설명 · 인증 | static | no | 로그인 모달 | current | 「약국 · 화장품 매장 · 공급자 · 서비스 운영자」 — 리테일 명칭과 불일치 |
| 6 | 서비스 안내 pill | `ENTRIES` · `EntryPill` | 서비스 발견 | static | no | **production**: kpa-society.co.kr · pharmacyhub.co.kr · k-cosmetics.site · /supplier · /community / **main 코드**: 서브도메인 4개 | legacy→current(미배포) | §16 |
| 7 | O4O 서비스 소식 | `HomeServiceNews` | 공지 · 사용법 | `GET /neture/home/news?limit=5` | no | `/forum/posts?category=…` | current | **현재 글 0건**("아직 등록된 소식이 없습니다") |
| 8 | Footer | `O4OHomePage` + `PublicLegalFooterInfo` | 법정 고지 | `GET /public/services/neture/footer-legal` | no | `/terms` · `/privacy` · `/contact` | current | 정상 |

Header · 서비스 메뉴 · 모바일 메뉴 · Help 영역은 **없다**(§9 · §8).

## 3. 현재 로그인 후 홈 구조 (CODE_TRACE)

순서: 우상단 계정 메뉴 → 워드마크 → AI 입력창 → `HomeEntryPanel`. `/home/entry` 조회가 실패하면 로그인 전 pill · 소식도 추가로 노출된다.

| # | 영역 | 누구에게 | 데이터 source | 이동 | 현행 구조 정합 |
|---|---|---|---|---|---|
| 1 | 계정 메뉴(이름 · 이메일 · 내 정보 · O4O 로그아웃) | 로그인 사용자 | `useAuth` | `/mypage` · `logout()` | 정합 |
| 2 | **내 업무 공간 4카드** — 커뮤니티 / 매장 / 공급자 / 서비스 운영(빈 카드는 "이용 중인 항목이 없습니다.") | 전원(카드 내용만 다름) | `GET /communities` · `GET /neture/home/entry` · `GET /work-scope/operator-services` | 커뮤니티: 내부 `/community` 또는 각 서비스 `/forum` handoff. 매장: **각 서비스 `/store/workspace` handoff(store.neture.co.kr 아님)**. 공급자: `/supplier/dashboard`. 운영: `/operator` 또는 서비스별 handoff | 매장 카드가 통합 Workspace 가 아닌 서비스별 경로를 쓴다(의도 — handoff flag OFF) |
| 3 | 플랫폼 관리 | super_admin | `user.roles` | `/admin` | 정합 |
| 4 | 내 서비스 | active membership · 공급자 | `GET /auth/services` | handoff → catalog domain `/` | **구 호스트로 handoff** |
| 5 | O4O 서비스 소식(newsSlot) | 전원 | home news | `/forum/…` | 정합(글 0건) |
| 6 | 가입 · 이용 상태 | 승인대기 · 반려 · 공급자 심사 중 | `/auth/services` · `serviceStates` | `/supplier` · `/register/pending` · PH `…/join/status` | PH 잔존 |
| 7 | 가입 가능한 서비스 | 미가입 서비스(`joinEnabled=true`) + 공급자 none | 같음 | 공급자→`/supplier`, Neture→`/register`, 그 외→`https://{catalog domain}{join}` 새 탭 | **구 호스트 · PH 노출 · /register 루프** |

## 4. 컴포넌트 · 데이터 source map

| 파일 | 역할 |
|---|---|
| `services/web-neture/src/pages/O4OHomePage.tsx` | 홈 전체 · AI composer · pill · footer. `App.tsx:702` 에서 `CURRENT_HOST_PROFILE==='main'` 일 때만 `/` |
| `components/home/HomeEntryPanel.tsx` · `lib/home-entry.ts` | 로그인 후 패널 · 모델(`SERVICE_PATHS` · `NETURE_SERVICE_INFO` · `publicServiceUrl`) |
| `components/home/HomeServiceNews.tsx` · `lib/home-news.ts` | 소식 |
| `components/LoginModal.tsx` · `contexts/LoginModalContext.tsx` | Google-only 모달 |
| `lib/ai/unified-request.ts` · `lib/ai/home-chat.ts` | AI 요청 클라이언트 |
| API `routes/neture/controllers/neture-home-entry.controller.ts` · `neture-home-news.controller.ts` | 홈 엔트리 · 소식 |
| API `routes/ai-proxy.routes.ts` (`POST /api/ai/request`) · `services/ai-tools/*` | AI 라우팅 · 도구 |
| API `modules/auth/controllers/handoff.controller.ts` · `config/service-catalog.ts` | `/auth/services` · `/auth/handoff` · 서비스 도메인 |

## 5. AI 입력 실제 동작

- **UI**
  - 로그인 전과 후에 같은 composer 가 뜨고, 인증 조건이 없다. 데스크톱과 모바일의 구조 차이도 없다.
  - 첨부: 최대 5개, 개당 10MB, 합계 20MB, 11종. 이미지는 1600px JPEG 로 재인코딩한다.
  - 「내 PC 자료 연결」은 `aria-disabled` 로 막혀 있고 "준비 중"이다.
- **로그인 전 제출**
  - 요청을 보내지 않고 `openLoginModal()` 만 부른다. 입력 텍스트는 유지된다(production 실측 확인).
- **로그인 후 제출**
  - 클라이언트는 `POST /api/ai/request` 를 부르고, 404 가 나면 `/api/ai/home-chat` 으로 fallback 한다.
  - 서버는 `authenticate` + `dynamicLimiter('free')`(60초에 10회)를 건다.
  - 분류기는 키워드 규칙이다(AI 호출 없음). 결과는 chat · work · confirm_work 중 하나다.
- **chat 경로**
  - 도구를 최대 1개 호출한 뒤 LLM 을 1회 호출한다.
  - provider 는 env `AI_DEFAULT_PROVIDER` 를 따르고, 코드 기본값은 `gemini` 다.
  - 대화는 저장하지 않는다.
- **work 경로**
  - 연결된 Local Agent 기기가 필수다. 없으면 403 `WORK_AGENT_NOT_AVAILABLE` 을 돌려준다.
- **서비스 연결**
  - `workScope` 는 전송하지만 홈에서는 workspace=`home` 이라 매장 컨텍스트가 없다.
  - 등록된 도구는 Local Agent 상태, Windows 앱 4종, 브라우저 사이트 2개(neture.co.kr 테스트 · health.kr), 샘플 공급자 1개, 약학정보원, 로컬 SQLite 다.
  - **O4O 7개 서비스로 이동하거나 조회하는 도구는 없다.**
- **판정 근거** (선택은 하지 않는다)

| 판정 | 근거 |
|---|---|
| HOME_CORE_FUNCTION | 화면 중앙의 주 요소다. 실제 LLM · 라우터 · 첨부 · Work Agent 와 테스트가 있다 |
| USEFUL_BUT_LIMITED | 비로그인은 로그인 유도뿐이다. 실행에는 Local Agent 가 필요하다. 서비스 도구는 0개다. 홈에서는 사실상 일반 Q&A 와 파일 Q&A 다 |
| PLACEHOLDER | 「내 PC 자료 연결」 준비 중. 사이트 registry 는 V0 수준이고, 공급자 adapter 는 샘플뿐이다 |
| LEGACY | 일부만 해당: `/home-chat` fallback, 미사용 `runWorkAgent` 클라이언트, 파일 상단 "텍스트 응답 전용" 주석(stale) |

## 6. Google 로그인 · 회원가입 흐름

- 「로그인」 · 「회원가입」은 **같은 모달**을 연다.
  - 차이는 `openRegisterModal` 이 `returnUrl` 을 비우는 것 하나뿐이다. mode · 문구 · analytics 는 같다.
  - 버튼은 화면에 두 쌍(우상단과 중앙) 있다.
- 두 CTA 를 따로 둘 **코드상 이유는 없다.**
  - Google 계속하기가 신규면 동의 후 가입(`GOOGLE_SIGNUP_REQUIRED` → `signupWithGoogle`), 기존이면 로그인한다.
  - 남는 이유는 사용자 인지("회원가입 버튼을 찾는 사람")뿐이다.
- 신규 사용자 Google 가입 후 흐름:
  1. `users` 와 `linked_accounts` 만 생성된다. membership 과 role 은 없다.
  2. `returnUrl` 이 없어 모달만 닫히고 `/` 에 머문다. 서비스 선택 단계는 없다.
  3. 패널에는 커뮤니티 카드(O4O 공통 커뮤니티)와 「가입 가능한 서비스」 5개가 보인다: 공급자 신청, Neture(`/register` — **루프**), KPA Society(kpa-society.co.kr/register), K-Cosmetics(k-cosmetics.site/register → `/login`), 파머시 허브(pharmacyhub.co.kr/join).
  4. 외부 가입 링크는 새 탭 · 다른 origin 이고 토큰이 없다. 그래서 **다시 Google 로그인**을 해야 한다.
- **로그인 모달의 죽은 코드**: `SERVICE_NOT_MEMBER` 분기는 서버가 해당 코드를 내지 않아 실행되지 않는다.

## 7. Service Catalog 현황 (`apps/api-server/src/config/service-catalog.ts`)

| key | 이름 | catalog 도메인 | 신규 정본 URL | joinEnabled | 홈 사용 위치 | 변경 영향 |
|---|---|---|---|---|---|---|
| neture | Neture | neture.co.kr | 동일 | true | 내 서비스 · 가입 가능(`/register`) | — |
| kpa-society | (KPA Society) | **kpa-society.co.kr** | pharmacy.neture.co.kr | true | 내 서비스 · 매장 카드 · 가입 가능 · handoff | handoff 대상 origin · QR fallback(`store-screen-set-qr.service.ts`) · CI `VITE_SERVICE_URL_KPA` |
| k-cosmetics | (K-Cosmetics) | **k-cosmetics.site** | retail.neture.co.kr | true | 같음 | 같음 |
| pharmacy-hub | 파머시 허브 | **pharmacyhub.co.kr** | (약국에 흡수 · 신규 가입 비노출 결정) | **true** | 가입 가능 · 상태 · 매장 카드 | 가입 노출 여부는 `joinEnabled` 판단 필요 |
| kpa-branch | 약사회 분회 | **kpa-society.co.kr** + `/kpa` | kpa.neture.co.kr/{분회} | false | 내 서비스 · 운영 카드 | handoff basePath |
| lecture | O4O 강의 | study.neture.co.kr | 동일 | false | active membership 있을 때만 | — |
| community | 커뮤니티 | community.neture.co.kr | 동일 | false | 운영 카드 | — |
| supplier | 공급자 | supplier.neture.co.kr | 동일 | false | 운영 카드 | — |
| funding | 유통참여형 펀딩 | funding.neture.co.kr | 동일 | false | 운영 카드 | — |
| cafe24-b2b | Cafe24 B2B | neture.co.kr | 동일 | false | (내 서비스 skip) | — |

- `store` 는 **의도적으로 catalog 에 없다**. 별도 `config/store-workspace.ts` 에 있고, 테스트가 이를 강제한다.
- **catalog 는 사실상 handoff allowlist 다.** handoff 대상 origin 은 `getServiceOrigin` 으로 만든다.
- 구 호스트를 쓰는 소비처:
  - 서버: handoff · `/auth/services` · `session-origin`(Google login origin → serviceKey) · QR 공개 origin 5곳 이상 · neture dashboard.
  - CI: `VITE_SERVICE_URL_*`.
- CORS 는 catalog 와 무관하다. 하드코딩돼 있고 `*.neture.co.kr` 은 이미 허용돼 있다.
- **정정**: 직전 CHECK R1 은 "catalog 에 '새 호스트 검증 전까지' 유지 명시"라고 적었지만 catalog 에 그런 주석은 **없다**. 해당 문구는 `hostProfile.ts` 의 supplier/funding cutover 주석이다. CHECK 는 후속 커밋으로 정정했다.

## 8. Help 현황

- `O4OHelpSection` 은 **대표 홈에 렌더되지 않는다**.
- 기본값이 문제다.
  - 이용 항목 3개가 `href:'#'` 라 죽은 카드다.
  - 서비스 링크는 구 호스트(kpa-society.co.kr · www.k-cosmetics.site)다.
- 소비처는 5곳이다:
  - `StandardHomeTemplate`(항상 렌더)
  - web-neture `CommunityPage`(`/community`)
  - web-kpa-society `CommunityHomePage`
  - web-k-cosmetics `HomePage`
  - web-pharmacy-hub `CommunityHomePage`
- 대표 홈 IA 와는 직접 관계가 없다. 서비스 홈들의 cross-service 링크 정합 문제다.

## 9. 로그인 모달 명칭 · 공유 구조

- 「Neture 로그인 / 공급자 연결 서비스」는 `services/web-neture/src/components/LoginModal.tsx:87-88` 에 하드코딩돼 있다. prop 은 없다.
- 모달 1개(`App.tsx` `ModalRenderer`)를 web-neture 가 서빙하는 **main · supplier · funding · community 4개 host 가 공유**한다. host 별 명칭 장치는 없다(`CURRENT_HOST_PROFILE` 은 App routing · HostBoundary 에서만 쓴다).
- 가능한 선택:
  - **A. 전체 공통 명칭 변경**(예: O4O 로그인): 1줄 변경. 4개 host 모두 O4O 로 통일된다.
  - **B. host 별 명칭**: `CURRENT_HOST_PROFILE` 로 분기(파일 1개). supplier 는 공급자 문구를 유지할 수 있다.
  - **C. 현행 유지**: 대표 홈에서 "공급자 연결 서비스"라는 명칭 불일치가 남는다.
- 약국 · 리테일 · 강의 · 내 매장은 **각자 별도 앱의 로그인**을 쓴다. 이 모달과 무관하다.

## 10. 현행 서비스 7개 성격 비교

| 서비스 | 대상 사용자 | 가입 서비스 | 로그인 필요 | 홈 노출(현재) | 주요 목적 | 성격 | 비고 |
|---|---:|---:|---:|---|---|---|---|
| 약국 pharmacy | 약사 · 약국 경영자 | **예**(운영자 승인) | 열람 no / 업무 yes | pill(코드) · 로그인 후 구 호스트 | 커뮤니티 · 콘텐츠 · 매장 도구 | **가입형 독립 서비스** | 헤더 브랜드 「KPA-Society 약사 전문 플랫폼」 · 체험 계정 배너 잔존 |
| 리테일 retail | 화장품 등 소매 매장 | **예** | 같음 | pill 「화장품」 · 로그인 후 구 호스트 | 같음 | **가입형 독립 서비스** | 브랜드 「K-Cosmetics」 · 체험 계정 배너 잔존 |
| 공급자 supplier | 공급 사업자 | 서비스 가입 아님(조직 심사) | 랜딩 no / 업무 yes | pill · 패널 「공급자 서비스 신청/업무」 | 제품 · 콘텐츠 공급 | **업무 Workspace**(신청형) | 랜딩에 「공급자 등록 · 공급자 로그인」 |
| 커뮤니티 community | 약사 · 소매업소 | 아니오(커뮤니티별 가입은 deploy 2 이후) | 읽기 no | pill · 패널 커뮤니티 카드 | 커뮤니티 선택 문 | **커뮤니티 입구**(현재 카드 2개짜리 문 페이지) | 실제 포럼은 pharmacy/retail `/forum` |
| 강의 study | 학습자 · 강사 · 운영자 | 설계상 예 · **현재 불가**(`joinEnabled=false`) | 목록 no / 수강 yes | 없음 | 강의 · 평가 · 수료 | **교육** | 강좌 0개 · 가입 경로 미결정 · 인증 E2E 미검증 |
| 펀딩 funding | 공급자(제안) · 매장(참여) | 아니오 | 목록 no / 참여 yes(login 만) | 없음 | 유통참여형 펀딩 | **참여 서비스** | 모집 0건 · `/login?redirect=` 복귀 결함 · `?status=draft` 노출 의심(미검증) |
| 내 매장 store | 매장 경영자(조직 store role) | 아니오(조직 축) | **전부 yes** | 없음 | 가입 서비스들의 매장 업무 통합 | **통합 업무 Workspace** | §11 |

## 11. Store 현재 활성화 상태

- **비로그인 접근**: 「내 매장 · 로그인이 필요합니다」와 로그인 링크(Google)가 뜬다. 상단 nav(홈 · 내 매장 · 서비스 업무 · 매장 HUB · 내 서비스 · 설정)가 비로그인에도 노출된다.
- **로그인 후**:
  - 매장 0개: `NoStorePage`
  - 매장 1개: 바로 진입
  - 매장 2개 이상: Selector
  - 판정 근거는 `organization_members` 의 store role 이다(서비스 membership 이 아님).
- **`VITE_UNIFIED_STORE_HANDOFF=false`**: KPA · KCos `/store`, PH `/store-owner` 가 store.neture.co.kr 로 넘기지 않는다. 대표 홈의 매장 카드도 서비스별 `/store/workspace` 로 handoff 한다.
- **미완료 항목**:
  - store_owner 실브라우저 E2E(Phase 6 `PENDING_USER_VERIFICATION`)
  - 서비스별 flag flip
  - 복수 매장 케이스는 재현 데이터가 없다
- **홈 직접 진입 가능성**: 기술적으로는 된다(로그인 → NoStore/Selector). 다만 E2E 미검증이고 「Store 완료」로 판정된 기록이 없다. 권하는 CTA 로 두기엔 이르다.

## 12. Lecture 현재 활성화 상태

- **바로 쓸 수 있는 것**: 공개 `/courses` 와 상세, 수료증 검증, 로그인, handoff. 첫 화면 문구는 "공개 강의는 누구나 볼 수 있고, 수강 · 진행 · 수료증은 O4O 강의 회원에게 열립니다."
- **Phase 2 상태 정정**:
  - 앞서 이 세션 답변에서 "Phase 2 배포 · 데이터 전환 WO 남음"이라 했는데 **stale** 했다.
  - 테스트 LMS 데이터가 삭제돼 data cutover 는 **SUPERSEDED**(2026-09-23)다.
  - Phase 2 는 2026-09-24 통제 배포 DONE 이다.
- **실제 잔여**:
  - Lecture membership 부여 경로 미결정: `joinEnabled=true` + 승인 vs 운영자 직접 부여
  - 강좌 0개
  - 인증 E2E 미검증
  - study 는 2026-09-28 실제 Google 로그인 7/7 대상에서 빠졌다
- **홈에서 소개할 때의 위험**: 일반 사용자가 로그인해도 **수강 가입을 할 수 없다**. "학습합니다"는 현재 제공 범위를 넘는다. "공개 강의 둘러보기" 수준까지만 사실이다.

## 13. Funding 현재 활성화 상태

- 공개 페이지는 「유통참여형 펀딩」 3단계 설명(공급자 제안 → 매장 참여 → 결과/보상)과 「모집 중 0 · 현재 모집 중인 펀딩이 없습니다」다.
- 목록과 상세는 비로그인 공개다. 참여는 로그인만 요구하고 서비스 membership · 매장 보유는 확인하지 않는다(`participantType: 'store_owner'` 로 기록).
- 제안은 공급자 workspace 에서 하고, 승인은 `funding:operator` 가 한다.
- 대표 홈에서 직접 노출할 이유와 주의점:
  - 이유: 공급자와 매장을 잇는 O4O 고유의 참여 모델이다.
  - 주의 1: 현재 모집 0건이라 빈 화면으로 보낸다.
  - 주의 2: 로그인 복귀 결함이 있다.

## 14. Desktop / Mobile 비교 (로그인 전, production)

| 항목 | Desktop 1280 | Mobile 390 |
|---|---|---|
| 순서 | 동일 | 동일 |
| overflow | 없음 | 없음 |
| 로그인 · 회원가입 | 우상단 + 중앙(중복) | 동일(첫 화면에 2쌍) |
| AI 안내 배너 | 2줄 | **4줄** — 첫 화면 대부분을 차지 |
| pill | 1줄 | 2줄 wrap |
| 소식 | 빈 목록 | 빈 목록 |
| Header/nav | 없음 | 없음(모바일 메뉴도 없음) |
| 문서 높이 | 907px | 1006px |

모바일에서 사라지는 요소는 없다. 모바일 첫 화면은 AI 배너, 입력창, 소개문, 로그인 버튼으로 차고, 서비스 pill 은 스크롤 아래에 있다.

## 15. 주요 사용자 동선

| 시나리오 | 현재 흐름 | 끊기는 지점 |
|---|---|---|
| A 첫 방문 | 홈 → AI · 소개문 · pill 을 본다 → 로그인/회원가입(같은 모달) → Google → `/` 에 머묾 → 패널 | 서비스 선택 단계 없음. 무엇부터 할지 안내 없음 |
| B 기존 가입자 | 로그인 → 패널 「내 서비스」 → handoff | handoff 가 **구 호스트**(kpa-society.co.kr 등)로 간다 |
| C 신규 가입 희망 | pill(로그인 전) → 서비스 사이트 → 해당 사이트에서 로그인/가입. 또는 로그인 후 「가입 가능한 서비스」 | 새 탭 · 다른 origin 이라 **Google 재로그인**. Neture `/register` **루프**. PH 가 여전히 가입 대상으로 노출 |
| D 공급자 | pill 공급자 → supplier.neture.co.kr → 「공급자 등록/로그인」. 로그인 후 패널 공급자 카드 → `/supplier/dashboard`(main host 경로) | supplier cutover flag OFF 라 로그인 후 업무는 neture.co.kr 하위경로에서 열린다(서브도메인과 병존) |
| E 매장 사용자 | 로그인 → 매장 카드 → 서비스별 `/store/workspace` handoff | 통합 `store.neture.co.kr` 로 가는 진입이 홈에 없다(flag OFF, 의도) |

## 16. legacy · 중복 · 혼란 요소

| # | 요소 | 위치 | 종류 |
|---|---|---|---|
| L1 | 구 호스트 pill · 「약국 경영」 | 대표 홈(production) | legacy — **코드 수정 완료 · 미배포** |
| L2 | 로그인 후 가입 · handoff 대상 구 호스트, PH `joinEnabled=true` | service-catalog | legacy · 불일치 |
| L3 | `/register` 로그인 모달 재오픈 루프 | web-neture `RegisterRedirect` | 결함(로그인 상태 미확인) |
| L4 | 「체험용 계정 제공 / 체험 계정 보기」 | pharmacy · retail 첫 화면 | legacy(공용 비밀번호 계정 전제 · 계정 없음) |
| L5 | 「Neture 로그인 / 공급자 연결 서비스」 | 대표 홈 모달 | 명칭 불일치 |
| L6 | 로그인 · 회원가입 버튼 2쌍, 동작 동일 | 대표 홈 | 중복 |
| L7 | 서비스 명칭 혼재: 약국 = 「KPA-Society」 · 리테일 = 「화장품」 · 「K-Cosmetics」 · 소개문 「화장품 매장」 | 홈 · 서비스 헤더 | 명칭 불일치 |
| L8 | O4OHelpSection `href:'#'` 3개 · 구 호스트 | 서비스 홈 5곳 | legacy · 죽은 링크 |
| L9 | 소식 0건인데 섹션 상시 노출 | 대표 홈 | 빈 영역 |
| L10 | 「내 PC 자료 연결 · 준비 중」 | AI + 메뉴 | placeholder |
| L11 | `SERVICE_NOT_MEMBER` 분기 · `/home-chat` fallback · 미사용 `runWorkAgent` · 상단 stale 주석 | 코드 | dead code |
| L12 | 로그인 후 pill 과 「가입 가능한 서비스」가 서로 다른 주소 체계 | 홈 | 중복 · 불일치 |

## 17. KEEP / MODIFY / REMOVE / ADD matrix (후보)

| 현재 요소 | 전/후 | 판정 후보 | 이유 | 영향 범위 |
|---|---|---|---|---|
| AI 입력창 | 둘 다 | **KEEP**(위치) · **MODIFY**(비로그인 안내) | 실제 기능이고 방향(AI 진입점)과 맞다. 다만 비로그인 제출은 로그인 모달뿐이고, 서비스 도구가 없어 "무엇을 할 수 있는지"가 불명확하다 | 문구 · 예시만이면 홈 1파일. 서비스 도구 추가는 AI 트랙(대형) |
| 첫 사용 안내 배너 | 둘 다 | MODIFY 후보 | 모바일 첫 화면을 크게 차지한다 | 홈 1파일 |
| 우상단 로그인 · 회원가입 | 전 | KEEP(로그인) · 회원가입 **통합 후보** | 동작이 같다 | 홈 1파일 |
| 중앙 소개문 + 로그인 · 회원가입 | 전 | MODIFY | 중복 버튼. 소개문 명칭(화장품 매장) 정합 | 홈 1파일 |
| 서비스 안내 pill | 전 | KEEP(배포) → IA 에 따라 MODIFY | URL 은 정정 완료. 위계 없는 동일 pill 이다 | 홈 1파일 |
| 서비스 소식 | 둘 다 | KEEP(구조) · 빈 상태 처리 MODIFY 후보 | 글 0건 | 홈 · 운영 콘텐츠 |
| Footer | 둘 다 | KEEP | 정합 | — |
| 계정 메뉴 | 후 | KEEP | 정합 | — |
| 내 업무 공간 4카드 | 후 | KEEP | 역할 기반 진입. 테스트로 고정된 계약 | — |
| 내 서비스 | 후 | KEEP · 대상 URL MODIFY(R1) | 구 호스트 handoff | **API catalog 계약(중지 조건)** |
| 가입 · 이용 상태 | 후 | KEEP · PH 처리 MODIFY | PH 흡수 결정과 불일치 | catalog · 홈 모델 |
| 가입 가능한 서비스 | 후 | **MODIFY** | 구 호스트 · PH 노출 · 재로그인 · `/register` 루프 | catalog(API) + `home-entry.ts` · App `RegisterRedirect` |
| 로그인 모달 명칭 | 둘 다 | MODIFY(§9 A/B) | 대표 입구 명칭 불일치 | web-neture 1파일(4 host 영향) |
| 체험 계정 배너(pharmacy · retail) | 서비스 홈 | **REMOVE** 후보 | 공용 비밀번호 계정 없음 · Google-only 와 모순 | web-kpa-society · web-k-cosmetics 각 1파일 + 각 LoginModal autofill 잔존 확인 필요 |
| O4OHelpSection 기본값 | 서비스 홈 | MODIFY | `#` · 구 호스트 | shared module(소비처 5) |
| 「내 PC 자료 연결」 | 둘 다 | KEEP(준비 중 명시) 또는 숨김 | placeholder | 홈 1파일 |
| (없음) 신규 사용자 다음 단계 안내 | 후 | **ADD** 후보 | Google 가입 뒤 membership 0인 사용자가 무엇을 해야 할지 모른다 | `HomeEntryPanel`(계약 테스트 동반) |
| (없음) 펀딩 · 강의 진입 | 전 | ADD 후보(조건부) | 공개 목록이 있다. 단 강의는 가입 불가 · 강좌 0, 펀딩은 모집 0 | 홈 1파일 |
| (없음) 내 매장 진입 | 후 | ADD 후보(**조건부**: E2E · flag 후) | 통합 Workspace 가 목표 구조다 | 홈 + handoff flag |

이미지 · 배너 추가는 전제로 두지 않았다. 위 ADD 는 텍스트 진입이어도 성립한다.

## 18. IA 대안 (선택하지 않음)

### 안 1 — 「AI 진입 + 역할별 입구」 (현 구조 유지 · 정합 보수)
- **로그인 전**: AI 입력창 → 짧은 정체성 문장 → 단일 「Google 로 시작」 → 서비스 입구를 **성격별 3그룹**으로 제시(가입 서비스: 약국 · 리테일 / 업무: 공급자 / 참여 · 학습: 커뮤니티 · 펀딩 · 강의).
- **로그인 후**: 현재 `HomeEntryPanel` 을 유지하고, 「가입 가능한 서비스」 대상 URL · PH 노출 · 루프만 바로잡는다.
- **AI 위치**: 최상단. **서비스 발견**: 그룹 pill/텍스트 카드.
- **재사용**: `ENTRIES` · `HomeEntryPanel` · `HomeServiceNews` 거의 전부.
- **변경 규모**: 소(홈) + 중(catalog R1 · 별도 승인).
- **장점**: 가장 작고 되돌리기 쉽다. **주의점**: AI 가 서비스와 연결되지 않은 채 최상단에 있다는 점은 그대로다.

### 안 2 — 「로그인 전 = 서비스 발견, 로그인 후 = 업무 시작」 분리
- **로그인 전**: 정체성 문장 → 서비스 7개 중 공개 가능한 것을 성격별 카드(설명 + CTA)로 → 로그인. AI 입력창은 축소(예시 · 한 줄)하거나 로그인 후 전용으로 둔다.
- **로그인 후**: AI 입력창 최상단 + `HomeEntryPanel` + 신규 사용자 「다음 단계」(ADD).
- **서비스 발견**: 로그인 전 카드가 담당하고, 로그인 후에는 「가입 가능한 서비스」가 담당한다.
- **재사용**: 패널과 소식은 그대로 쓴다. 로그인 전 영역은 새로 만든다.
- **변경 규모**: 중(홈 로그인 전 영역 재구성).
- **장점**: 비로그인 AI 가 로그인 유도뿐이라는 현재 사실과 맞는다. 신규 사용자 이해가 쉽다.
- **주의점**: "AI 기반 진입점" 방향이 로그인 전 화면에서는 약해진다. 카드가 늘면 모바일 스크롤이 길어진다.

### 안 3 — 「AI 가 서비스로 안내」 (AI 중심 · 서비스 도구 연결)
- **로그인 전 · 후 공통**: AI 입력창 최상단. 입력 예시 칩("약국 서비스 가입", "공급자 등록", "펀딩 보기" 등)을 AI 로 보내지 않고 해당 서비스로 **바로 이동**하게 한다. 서비스 목록은 칩 아래 보조로만 둔다.
- **로그인 후**: 패널을 유지하되 AI 가 "내 매장 열기 · 가입 상태 확인" 같은 서비스 이동 도구를 갖도록 확장한다(서버 tool 추가).
- **재사용**: composer · 패널. 서비스 이동 도구는 신규다.
- **변경 규모**: 대(AI tool registry · 서버 계약). 칩만 먼저 하면 소.
- **장점**: 사업 방향(AI 업무 진입점)에 가장 가깝다. 비로그인에게도 AI 영역이 의미를 가진다.
- **주의점**: 현재 AI 에는 서비스 도구가 0개다. 칩과 실제 AI 능력이 어긋나지 않게 해야 한다. AI 트랙과 범위가 겹친다.

## 19. 구현 시 영향 범위

| 변경 묶음 | 파일 · 계층 | 중지 조건 해당 |
|---|---|---|
| 홈 로그인 전 영역(문구 · pill · 그룹 · 버튼 통합 · 배너) | `O4OHomePage.tsx` (+ 신규 테스트) | 아니오 |
| 로그인 모달 명칭 | `web-neture/src/components/LoginModal.tsx` — main · supplier · funding · community 4 host | 아니오(공유 UI · 4 host smoke 필요) |
| `/register` 루프 | `web-neture/src/App.tsx` `RegisterRedirect` | route 동작 변경 — 경미하지만 WO 명시 권장 |
| 가입 가능한 서비스 · 내 서비스 URL · PH 노출 | `apps/api-server/src/config/service-catalog.ts` · `handoff.controller` 소비처 · `session-origin` · QR origin · CI `VITE_SERVICE_URL_*` | **예 — API/handoff 계약 · CI** |
| 체험 계정 배너 제거 | web-kpa-society `CommunityHomePage` · web-k-cosmetics `HomePage`(+ 각 LoginModal autofill 확인) | 아니오(타 서비스 · 별도 WO) |
| Help 기본값 | `packages/shared-space-ui/src/O4OHelpSection.tsx` 소비처 5 | **예 — shared module protocol** |
| 내 매장 진입 | 홈 + `VITE_UNIFIED_STORE_HANDOFF` flip(CI) + store_owner E2E | **예 — CI · 실계정 검증** |
| AI 서비스 도구 | `apps/api-server/src/services/ai-tools/*` | **예 — API 계약** |
| 강의 노출 | 홈 문구 + Lecture membership 부여 정책 결정 | 정책 판단 필요 |

---

## 문서 정합

- 발견 1건: 직전 CHECK R1 의 사실 오류("catalog 에 '새 호스트 검증 전까지' 명시")
  - 기록물이지만 이 세션 산출물의 오류라 후속 커밋으로 정정했다.
  - 기준 문서 drift 는 0건이다.
- SUPERSEDED 표기 0건 / 링크 수정 0건
- 별도 WO 제안 5건:
  - catalog REPOINT · PH 가입 노출(L2)
  - `/register` 루프(L3)
  - 체험 계정 배너 은퇴(L4)
  - Help 기본값(L8)
  - funding `?status=draft` 노출 의심 검증 — 이번 조사에서 미검증 · 코드 정황만
