# CHECK — WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1

> 병원약국 전문 서비스 Foundation. O4O Main Automation Core 를 **소비만** 하는 얇은 Domain Core
> (`@o4o/hospital-pharmacy-core`) + web 서비스(`services/web-hospital-pharmacy` · 병동/약제부) +
> 공통 GFU 소비 HTTP 표면(`/api/ai/file-understanding`). 단방향 의존 Hospital → Core, Core 수정 0.

- **상태**: FOUNDATION COMPLETE · **인증 진입(§7) 구현·배포 완료** · **정본 진입 = `https://neture.co.kr/hospital`(서브디렉토리 · 운영 실측 PASS)** · 실제 Google 로그인 이후 구간(조사·GFU) 은 사용자 smoke 대기
- **표기일**: 2026-09-22
- **결정론 검증**: jest 3 suites / 21 tests PASS · web tsc 0 · vite build PASS
- **운영 배포**: deploy-web-services run 35694403812 SUCCESS(`deploy-hospital-pharmacy` job 포함) · Cloud Run `hospital-pharmacy-web` LIVE

---

## 1. 승인 범위 대비 결과

| WO 범위 | 결과 |
|---|---|
| census 판정 | 원내 Excel 파서(web-neture `localDataset.ts` HEADER_ALIASES) = **GFU 전면 전환(D1)** · 포팅 안 함 |
| `packages/hospital-pharmacy-core` | 얇은 Domain Core — 필드·TargetSchema·NL 파싱·원내 Local Context·adapter·surface plan. React/DOM/DB/네트워크/xlsx 의존 0 |
| `services/web-hospital-pharmacy` | Vite 서비스(병동 + 약제부 minimal + 홈). Core 소비 배선만 |
| Core 소비 배선(additive) | 서버 `/api/ai/file-understanding`(공통 GFU 소비 러너) — 이미 commit a4c870ad1 |
| 대표 업무 6종 E2E | 결정론 jest(`hospital-pharmacy-representative-tasks.spec.ts`) 6/6 |
| 브라우저 smoke | PENDING(사용자측) — signage-player·pharmacy-hub 선례(DNS·cert 는 Foundation 밖) |

**STOP 조건(O4O Main Core 수정 필요) 미발생.** 모든 병원 특수 요구는 hospital-pharmacy service/package 안에서 처리.

## 2. 확정 결정(D1~D3)

- **D1** 원내 Excel = 공통 Generic File Understanding 전면 전환. HEADER_ALIASES 파서 포팅 금지 —
  `decode → profile → inferFileStructure(Gemini) → normalize → confidence` 를 소비하고, 도메인 어휘는
  클라이언트가 주입한 `HOSPITAL_DRUG_TARGET_SCHEMA` 로만 온다(api-server 는 병원·약품 어휘 미보유).
- **D2** 원내 SSOT = 브라우저 `localStorage`(`HOSPITAL_DRUG_STORAGE_KEY`). Local-first V1 · 서버 미저장 ·
  환자정보 제외 · **DDL 0**. 서버 SQLite 경로 미사용. 병동 조회는 `localSource='client'` 로 서버 원내
  조회를 끄고 원내 결합은 브라우저가 자기 데이터로 수행.
- **D3** 대표 업무 = §1 예시 6종(원내 보유 / 동일성분 원내약 / 대체약 조사 / 성분·주의사항 조사 /
  주문 가능 확인 / 병원 프로그램 재고). §5·§6 은 후속.

## 3. 계약·경계 편차 보고

### 3-A. §4 (파일이 서버를 일시 경유) — 의도된 소비 경계
GFU Core 는 api-server 에 있으므로 약제부 파일은 base64 로 `/api/ai/file-understanding` 를 **일시 경유**한다.
그러나 (a) Gemini 에는 profile **표본(top-20)** 만 가고 전체 행 정규화는 서버 순수 함수가 하며,
(b) 파일 bytes·records 원문은 **저장하지 않고**(로그도 counts only) 응답으로만 돌려주며,
(c) 정규화 결과(원내 데이터셋)는 **브라우저 localStorage 에만** 남는다. 환자정보는 대상 밖(§7 첨부≠지식).
→ D2 "원내 SSOT=브라우저" 와 모순 없음. 서버는 구조 해석기일 뿐 원내 지식 저장소가 아니다.

### 3-B. 순수 패키지 확장자 없는 상대 import(§2 규칙 범위)
`@o4o/hospital-pharmacy-core` 의 상대 import 는 `./domain`(확장자 없음)을 쓴다. CLAUDE.md §2 의
`.js` 확장자 규칙은 **Node ESM api-server 런타임의 TypeORM 엔티티**에만 적용된다. 이 패키지는 jest(ts-jest)
와 Vite 만이 소비하고 Node ESM 로 로드되지 않으며, Vite 는 `.js`→`.ts` 를 자동 해석하지 않으므로
확장자 없는 형태가 두 소비자 모두에서 옳다. TypeORM 엔티티가 아니므로 §2 위반 아님.

## 4. 검증

| 항목 | 명령 | 결과 |
|---|---|---|
| Domain Core 결정론 | `jest hospital-pharmacy-core.spec.ts` | 12/12 PASS |
| 공통 GFU 소비 러너 | `jest structured-file-understanding.spec.ts` | 3/3 PASS |
| 대표 업무 6종 E2E | `jest hospital-pharmacy-representative-tasks.spec.ts` | 6/6 PASS |
| web 타입체크 | `tsc -b`(services/web-hospital-pharmacy) | EXIT 0 |
| web 번들 | `vite build` | 155 modules · PASS (hospital-pharmacy-core 소스 번들) |

### 4-A. 운영 브라우저 smoke(Cloud Run URL `https://hospital-pharmacy-web-3e3aws7zqa-du.a.run.app`)

배포는 CI 로 자동 완료(run 35694403812 · `deploy-hospital-pharmacy` SUCCESS). Cloud Run URL 로 실브라우저 검증:

| 항목 | 결과 |
|---|---|
| 홈 진입(제목·헤더·네비·hero·2 타일·footer) | PASS |
| 병동/약제부 라우팅·렌더 | PASS |
| **D2** localStorage round-trip(약제부 4건 재조회 → 병동 "원내 자료 연결됨") | PASS |
| **대표 업무 ①** 원내 보유("우리 원내에 아세트아미노펜 있어?") → "[원내 약품] 2건 확인 - 타이레놀정500mg · 써스펜좌약" · **서버 0 호출**(순수 브라우저) | PASS |
| 조사(research)·파일 GFU 흐름 | **차단 → 우아한 degrade**("네트워크 오류…"). 원인=CORS 미등록(아래 4-B) + 인증 진입 부재 |

→ 인증이 필요없는 Local-first 경로(D2 · 원내 보유)는 운영에서 완전 동작 확인. 조사/GFU 는 서버 의존.

### 4-B. CORS 등록 — Foundation 서비스 배선의 빠진 절반(수정)

`web-hospital-pharmacy` 는 `/api/ai/*`(조사·파일 이해)를 `api.neture.co.kr` 로 cross-origin 호출한다.
그러나 api-server CORS 허용목록(`setup-middlewares.ts` `getAllowedOrigins`, **정확 origin · wildcard 금지**)에
`hospital.neture.co.kr` 도 Cloud Run URL 도 없어 브라우저가 인증 이전에 요청을 차단했다. 모든 신규
서비스(pharmacyhub·lecture·store·signage-player·kpa-branch)가 이 파일에 ①정본 도메인(DNS 전이라도)
②Cloud Run URL 을 등록한 선례와 동일하게, `https://hospital.neture.co.kr` + Cloud Run URL 2개를
additive·정확 origin 으로 등록했다(신규 서비스 origin 등록 = deploy 배선과 동일 범주 · **Automation Core
무관 → STOP 조건 아님**). api 재배포 후 조사/GFU 의 CORS 차단은 해소된다.

**남은 조사/GFU smoke 선행조건**: (a) api(`o4o-core-api`) 재배포로 CORS 반영, (b) 이 서비스의 인증 진입
(로그인/SSO 진입면 부재 — `/api/ai/*` 는 `authenticate` 필수), (c) `hospital.neture.co.kr` DNS·cert·LB.
(b)·(c)는 §5·§6 후속(사용자측 도메인 + 인증 진입 설계). Live Gemini 조사·파일 GFU 는 그 후 확인.

## 5. 배포 배선

- `deploy-web-services.yml`: path filter · detect-changes output · workflow_dispatch(all/개별) ·
  `decide "hospital-pharmacy"` · env `VITE_API_URL_HOSPITAL_PHARMACY`/`VITE_SERVICE_URL_HOSPITAL_PHARMACY` ·
  `deploy-hospital-pharmacy` job(Cloud Run `hospital-pharmacy-web`) 추가.
- `pnpm-lock.yaml`: `services/web-hospital-pharmacy` importer 항목 수기 삽입(전역 install 회피 —
  타 세션의 `action-log-core` 삭제 미추적 상태와 얽히지 않도록). `pnpm install --filter hospital-pharmacy-web...`
  = "Lockfile is up to date"(정합).
- `apps/api-server/src/bootstrap/setup-middlewares.ts`: CORS 허용목록에 `https://hospital.neture.co.kr` +
  Cloud Run origin 추가(§4-B · additive · 정확 origin · api-server tsc 는 foreign `action-log-core` 삭제
  오류 18건 외 0건 = 이 변경 클린).

## 6. 미해결·후속(범위 밖 · 지시 대기)

- **조사·파일 GFU 운영 smoke**: api 재배포(CORS 반영) + 인증 진입(SSO/로그인) + `hospital.neture.co.kr` DNS·cert·LB 후.
- **인증 진입 설계**: 이 서비스는 로그인 진입면이 없다. `/api/ai/*` 는 `authenticate` 필수이므로,
  hospital-pharmacy 로 어떻게 인증 세션을 얻을지(공통 SSO handoff / 로그인 페이지) 별도 판단 필요.
- §5·§6 심화(약제부 확장·주문/재고 화면 자동화 실배선).
- 병동 화면-국소 질의 파싱(`extractLocalNeedles`)은 서비스 표시용 최소 구현 — 향후 원내 needle 파싱을
  패키지로 승격할지는 별도 판단.

---

## 7. 후속 — O4O Identity 진입 + 정본 도메인 (2026-09-22 · commit `7a64d8739`)

§6 의 "인증 진입 설계"·"DNS·cert·LB" 를 한 덩어리로 닫았다. **새 인증 시스템 0** — 기존 O4O Google 단일 로그인을 소비만 한다.

### 7-A. census (읽기 전용) — 재사용할 현행 계약
6개 서비스(neture · kpa-society · k-cosmetics · pharmacy-hub · kpa-branch · store)가 **예외 없이 같은 3종**을 쓴다:
`@o4o/auth-react` `useServiceAuth` + `GoogleContinue` + `authClient.getGoogleAuthConfig()`. 개별 구현 · `index.html` GIS 스크립트 ·
`VITE_GOOGLE_*` env 는 **0개**(`gsi/client` 문자열은 `packages/auth-client/src/google-identity.ts` 한 곳). clientId 는 서버
`GET /api/v1/auth/google/config` 가 SSOT. 최신 선례 = web-store(2026-09-21~22) — `lib/apiClient.ts` 가 병원약국과 동일.

### 7-B. 구현 (services/web-hospital-pharmacy)

| 파일 | 내용 |
|---|---|
| `src/contexts/AuthContext.tsx` (신규) | `useServiceAuth<HospitalUser>({ authClient, getAccessToken, toUser })`. **serviceKey 생략** — `hospital-pharmacy` 는 `ServiceKey` union · `service_memberships` 미등록이라 가짜 키를 만들지 않는다(web-store 선례). Google 로그인은 serviceKey 로 차단되지 않으므로 동작에 지장 0 · 등록 후 한 줄만 추가 |
| `src/components/LoginPanel.tsx` (신규) | `GoogleContinue` 단일 진입점. `getConfig` 는 **모듈 상수**(렌더마다 새 참조면 동의 화면이 초기화되는 공통 계층 기존 결함 회피) |
| `src/pages/LoginPage.tsx` (신규) | `/login` + `returnTo`(state.from). 로그인돼 있으면 즉시 복귀 |
| `src/App.tsx` | `AuthProvider` + 헤더 계정 영역(로그인 링크 / 이름·로그아웃). **route guard 없음** — 로그인 전 홈·원내 연결·원내 보유 조회는 그대로 열려 있다 |
| `src/pages/WardPage.tsx` · `PharmacyDeptPage.tsx` | 401 을 "다시 로그인하세요" 문구 대신 `pendingAuthRequest`(문장) / `pendingAuthFile`(File) 로 보관 → **제자리** LoginPanel → `onSuccess` 에서 같은 요청·같은 파일을 자동 재개. 라우트 이동이 없어 입력·원내 연결·직전 답변 **손실 0**, 파일을 다시 고를 필요 없음 |
| `Dockerfile` | `auth-utils`(main=dist → `pnpm --filter @o4o/auth-utils build` 필요) · `auth-react`(main=src → 빌드 불필요) COPY/빌드 추가(web-lecture 선례) |

경계: 로그인 없이 = 홈 · 원내 파일 연결 · localStorage · 원내 보유 조회 / 로그인 필요 = 서버 AI(조사 · 파일 이해 · Work Agent).
password 진입 · 계정 병합 · 새 auth 방식 **0**. 서버 Identity 계약 · CORS 목록 · O4O Main Core 변경 **0**.

### 7-C. 검증
`tsc --noEmit` 0 · `vite build` PASS · eslint 0 · 로컬 브라우저 smoke(Playwright · 서버 응답 stub):
로그인 전 원내 보유 조회가 **API 호출 0건**으로 정상 응답 · 401 시 LoginPanel 렌더 + textarea/질문/원내 연결 보존 ·
약제부는 고른 파일명 보존 문구 · `/login` 단독 화면 렌더. Deploy Web Services run = **success**(`hospital-pharmacy-web` 재배포,
번들에 `auth/google/config` 포함 확인).

> 로컬 dev origin(`http://localhost:4210`)은 서버 CORS 허용목록에 없어 로컬에서 **실제** API 호출은 불가하다(web-store 4210 ·
> web-lecture 4209 도 같은 기존 갭). 운영 CORS 를 이 WO 에서 넓히지 않고 응답 stub 으로 배선만 검증했다. 실 AI smoke 는 배포본에서.

### 7-D. 정본 도메인 `hospital.neture.co.kr` — GCP 선례 그대로(별도 인프라 재설계 0)

| # | 작업 | 상태 |
|---|---|---|
| 1 | serverless NEG `neg-hospital-pharmacy-web` → Cloud Run `hospital-pharmacy-web` | **생성 완료** |
| 2 | backend service `backend-hospital-pharmacy-web`(EXTERNAL_MANAGED · protocol HTTP · portName 없음 = `backend-lecture-web` 와 동일) + NEG 연결 | **생성 완료** |
| 3 | `o4o-global-lb` url-map 에 host rule `hospital.neture.co.kr` → `path-matcher-hospital` **추가**(additive) | **완료** — 기존 11개 host rule 전수 불변 확인 |
| 4 | Certificate Manager `cm-cert-hospital` + map entry `cm-entry-hospital`(`o4o-main-cert-map`) — lecture 와 같은 **LB 인증**(DNS authorization 없음) | **생성 완료** · 현재 `PROVISIONING` / entry `PENDING` |
| 5 | **DNS A 레코드 `hospital.neture.co.kr → 136.110.132.35`** | **PENDING — 사용자 작업**(등록기관 콘솔 · Cloud DNS managed zone 없음). 이 레코드가 생기면 4번 인증서가 자동 발급되어 ACTIVE 가 되고 도메인이 열린다 |

LB IP `136.110.132.35` 는 기존 `neture.co.kr`·`study.neture.co.kr`·`store.neture.co.kr` 과 같은 값(실측).

### 7-D-2. **정본 진입 변경 — 서브디렉토리 `https://neture.co.kr/hospital`** (사용자 결정 2026-09-22 · commit `f4e9d5854`)

병원약국은 **당분간 임시 서비스**이므로 전용 도메인을 만들지 않고 기존 `neture.co.kr` 오리진에 얹는다.
`kpa-society.co.kr/kpa/*` → `kpa-branch-web` 과 **같은 패턴**(이 저장소의 기존 선례).

얻은 것 — 7-D 의 사용자 PENDING 2건이 **소멸**:

| 서브도메인이었다면 | 서브디렉토리에서는 |
|---|---|
| DNS A 레코드 등록(등록기관) | 불필요 — `neture.co.kr` 이 이미 LB 를 가리킴 |
| 인증서 발급 대기 | 불필요 — 기존 `neture.co.kr` 인증서 |
| Google authorized origin 신규 등록 | 불필요 — `https://neture.co.kr` 이미 등록됨 → **운영에서 Google 버튼 실제 렌더 확인** |
| 별도 로그인 | Neture 와 같은 오리진 = 세션(localStorage) 공유 |

코드(kpa-branch 레시피):
- `vite.config.ts` `base: '/hospital/'` — asset 이 `/hospital/assets/*` 로 발행돼야 한다(root 면 같은 host 의 default backend(web-neture)로 새어 404).
- `src/lib/basename.ts` + `BrowserRouter basename` — `neture.co.kr`(또는 www)의 `/hospital` 진입만 `'/hospital'`, Cloud Run root·dev 는 `''`.
- `Dockerfile` runner: `dist` 를 `/hospital` 아래에도 복사(두 진입 동시 서빙 · SPA fallback 은 `serve -s`).
- `BRAND.domain` · `VITE_SERVICE_URL_HOSPITAL_PHARMACY` = `https://neture.co.kr/hospital`.

LB(additive):
- `neture.co.kr` host rule → `path-matcher-neture-hospital`(default `backend-neture-web-http` 유지 + pathRules `['/hospital','/hospital/*']` → `backend-hospital-pharmacy-web`). 나머지 host rule 11개 전수 불변.
- 7-D 에서 만든 NEG·backend 는 **그대로 재사용**. 서브도메인 전용이던 cert `cm-cert-hospital` · map entry `cm-entry-hospital` 은 **삭제**.
- **잔여**: `hospital.neture.co.kr` host rule + `path-matcher-hospital` 은 남아 있다 — `remove-host-rule` 이 무관한 `path-matcher-store` 를 고아로 판정하는 gcloud 경고를 내어 **적용하지 않고 중단**했다(안전 우선). DNS 레코드가 없으므로 트래픽 0·무해. 나중에 `url-maps export/import` 로 정리하거나, 서브도메인으로 되돌릴 때 재사용한다.
- Cloud CDN(`backend-neture-web-http` `CACHE_ALL_STATIC`) 때문에 전환 직후 `/hospital` 이 이전 캐시(web-neture)로 응답했다 → `invalidate-cdn-cache --host=neture.co.kr --path=/hospital`·`/hospital/*` 로 해소. **다음에 같은 전환을 하면 반드시 invalidate 를 함께 한다.**

### 7-D-3. 운영 실측 (2026-09-22 · `https://neture.co.kr/hospital`)

| 항목 | 결과 |
|---|---|
| `/hospital` · `/hospital/ward` · `/hospital/pharmacy` · `/hospital/login` | 200 · `<title>병원약국 | Neture</title>` (SPA deep link 포함) |
| asset | `/hospital/assets/index-*.js` 200 · `application/javascript` |
| 기존 회귀 | `neture.co.kr/` · `neture.co.kr/hospital-drug` 모두 web-neture 그대로(제목 불변) |
| 로그인 전 원내 보유 조회 | **API 호출 0건**으로 정상 응답(브라우저 localStorage 만 사용) |
| 서버 조사(401) | 제자리 안내 + **Google 버튼 실렌더(iframe 1)** · textarea·질문·원내 연결 보존 |
| 약제부 파일(401) | 제자리 안내 + 고른 파일명(`ward-list.csv`) 보존 문구 |
| `/hospital/login` | LoginPanel 렌더 |
| 콘솔 오류 | 401 2건(의도된 미인증 호출)뿐 |

### 7-E. 남은 PENDING
1. ~~DNS 레코드~~ · ~~Google authorized origin 등록~~ — **서브디렉토리 전환(7-D-2)으로 소멸.**
2. **운영 smoke ②~⑤**: ② 실제 Google 로그인(사용자 브라우저) ③ Gemini 조사 ④ 파일 이해(GFU) ⑤ 원내+조사 결합 — 버튼 렌더까지는 PASS(7-D-3), 실제 계정 로그인 이후 구간은 **사용자 실행 대기**. PASS 로 쓰지 않는다.
3. `hospital-pharmacy` 를 `ServiceKey` union · `service_memberships` 에 등록할지 — 별도 판단(등록 시 AuthContext 에 `serviceKey` 한 줄).
4. `hospital.neture.co.kr` host rule/`path-matcher-hospital` 잔여 정리(7-D-2) — 무해 · 별도 판단.
5. web-neture 의 기존 `/hospital-drug`(무로그인 병동 파일럿)와 `/hospital`(정식 서비스) 공존 — 경로 충돌은 없으나 **사용자 혼동 가능**. 흡수/리다이렉트 여부는 별도 판단(이 WO 에서 건드리지 않음).

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
