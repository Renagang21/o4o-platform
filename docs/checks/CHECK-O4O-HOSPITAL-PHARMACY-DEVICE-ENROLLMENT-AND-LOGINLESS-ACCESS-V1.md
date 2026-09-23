# CHECK — WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1

> 병원약국을 **개인 로그인 서비스가 아니라 공용 PC 공유 업무 서비스**로 전환한다. 관리자가 1회용
> 연결 코드를 발급 → 공용 PC 가 1회 device enrollment → 이후 **로그인 없이** device credential
> (HttpOnly 쿠키)로 hospital 범위 AI 를 쓴다. 개인 Google 로그인은 일반 경로에서 제거하고,
> 관리자(별도 역할)만 `/manage` 에서 로그인한다.

- **상태**: **구현 COMPLETE · 결정론 검증 PASS · production 반영 COMPLETE(step 9) · 운영 smoke 진행 중(step 10 — 자격 불요 구간 PASS · 연결 이후 구간 PENDING)**
- **표기일**: 2026-09-23
- **결정론 검증**: `hospital-device-service.spec` 14/14 PASS(mock QueryExecutor · DB 불요) · api-server `tsc --noEmit` 0 · web-hospital-pharmacy `tsc -b` 0
- **보존**: `feature/hospital-pharmacy-device-enrollment` (commit `6bab8c49c`) → 이후 `b1c925251` 로 **`origin/main` 반영 완료**(§6)
- **STOP 조건(§24) 미발생**

---

## 1. 왜 배포를 보류했는가 (deployment gate · 같은 WO 내)

- 공유 migration registry(`apps/api-server/src/database/incremental/manifest.ts`)가 **다른 세션의
  미완료 ADMIN-OPERATOR WIP**(`CreateOperatorInvitations1790125106065`)로 오염돼 있고, `origin/main`
  manifest 는 `AlterHandoffTokensTargetWorkspace1789974015939` 에서 끝난다(registry mid-edit).
- foreign-dirty manifest 를 건드리지 않고(불가침), 불안정한 foreign 작업 위에 Hospital migration 을
  **최종 등록·fingerprint 확정할 수 없다**. main push = CI 자동 배포 = 등록 안 된 테이블에 라우트가
  붙어 **프로덕션 파손**. 따라서 구현·검증까지 끝내고 등록·배포만 gate 로 관리한다(사용자 확정 Option A).
- 배포 workflow 는 **main push 에서만** 트리거된다(`deploy-api.yml` `on: push: branches: [main]`).
  feature 브랜치 push 는 배포하지 않으므로 작업 보존 수단으로 사용했다.

### Gate 해제 후 절차(동일 WO)
1. `origin/main` 에 ADMIN-OPERATOR migration landing 확인 → 최신 main fetch
2. migration census 재확인(manifest·expected-schema-states·epoch13 정합)
3. `1790125390245-CreateHospitalDeviceTables` 를 **최신 순서로 최종 등록**(manifest append + expected-schema-states 항목 + fingerprint)
4. migration 테스트(isolated docker postgres:15)
5. build
6. deploy(main) — migration Job 먼저 → API deploy → web deploy
7. 프로덕션 smoke §22 A~I · `/hospital-drug` redirect/retire(§18, smoke PASS 후)

## 2. 승인 범위 대비 결과

| WO 범위 | 결과 |
|---|---|
| §3 device = 브라우저 프로필 대상(하드웨어 fingerprint 아님) | 서버 발급 random token(32B) · 해시 저장. 하드웨어 파생 0 |
| §4 device credential = HttpOnly Secure SameSite 쿠키 | `HOSPITAL_DEVICE_COOKIE`(httpOnly·secure=prod·sameSite=none·`.neture.co.kr`) · JS 미판독 · 원내 데이터는 localStorage 별도 |
| §5 1회용 연결 코드 | "XXXX-XXXX"(혼동문자 제외) · 10분 · **원자적 1회 claim** · 해시만 저장 |
| §6 device 범위 = hospital 전용 | 라우터에 O4O 계정/관리/타서비스/조직/결제/승인/credential 경로 **부재** — device 로 도달 불가 |
| §7 `/api/ai/*` authenticate 전역 제거 금지 | 공유 라우트 무변경. 전용 `/api/hospital/*` 에 device 게이트 additive |
| §8·§9 최소 registry | `hospital_devices` · `hospital_device_enrollment_codes`(해시만) — **등록 보류** |
| §10 관리자 최소 발급 UI/API | `/manage` 콘솔(코드 발급 · PC 목록 · revoke) · `/api/hospital/admin/*`(authenticate+requireAdmin) |
| §11·§12 연결 UX · 이후 로그인리스 | `EnrollmentGate` — 미연결 시 "이 PC 연결하기" → 코드 → 연결 후 로그인리스 |
| §13 credential ↔ 원내 데이터 분리 | 쿠키(접근) vs localStorage(원내) 완전 분리 |
| §15 rate limit(§16 revoke) | enroll 10분/20/IP · AI 60초/30/device · `revokeDevice` 조건부 UPDATE |
| §17 일반 Google 로그인 제거 | `LoginPage` 삭제 · `/login` 라우트 제거 · Ward/Pharmacy 401→Google 재개 제거 → device 재연결로 대체 |
| §18 `/hospital-drug` redirect/retire | **보류(smoke PASS 후)** |
| §19 정본 URL = `neture.co.kr/hospital` | 서브도메인 미사용 · 쿠키 도메인 `.neture.co.kr` 크로스 서브도메인 |

## 3. 계약·경계 편차 보고

- **§7 device principal 채택** — "user auth OR device auth" 의 병원약국 정본 principal 은 device 다.
  공유 `authenticate` 를 제거하지 않고(전역 금지 준수) 전용 라우터에서 device 게이트를 additive 로 둔다.
  익명 엔드포인트 아님(유효 device 필수) · 다른 O4O API 도달 경로 없음.
- **screen modality** — device 스코프에는 사용자 바인딩 work agent 가 없으므로 안내(QUESTION 은
  정상 상태 §14). 조사·파일이해·원내결합은 그대로 동작.
- **Automation Core 수정 0** — `runHospitalDrugSurface`·`runStructuredFileUnderstanding`·
  `inferFileStructure`·`runWebResearch`·`classifyTaskModality` 는 소비만.

## 4. 변경 파일 (commit `6bab8c49c`)

Backend: `services/hospital/hospital-device.service.ts`(신규) · `routes/hospital/hospital.routes.ts`(신규) ·
`database/migrations/1790125390245-CreateHospitalDeviceTables.ts`(신규 · 등록 보류) ·
`utils/cookie.utils.ts`(device 쿠키 헬퍼 additive) · `bootstrap/register-routes.ts`(mount) ·
`__tests__/hospital-device-service.spec.ts`(신규).

Frontend(`services/web-hospital-pharmacy/src`): `contexts/DeviceContext.tsx`·`components/EnrollmentGate.tsx`·
`lib/deviceSession.ts`·`lib/adminApi.ts`·`pages/ManagePage.tsx`(신규) · `App.tsx`·`lib/aiRequest.ts`·
`lib/apiClient.ts`·`pages/WardPage.tsx`·`pages/PharmacyDeptPage.tsx`(수정) · `pages/LoginPage.tsx`(삭제).

## 5. 미검증 · 보류(정직 보고)

> 아래는 **배포 gate 시점(§1)의 기록**이다. step 9·10 으로 대부분 해소됐다 — 현재 상태는 §6·§7 이 정본이다.

- 브라우저 smoke(연결 코드 발급→입력→연결→조사/파일이해) **미실행** — 배포 gate 로 서버 미배포.
- migration 실적용·fingerprint **미실행** — registry 오염으로 보류(§1).
- 관리자 `/manage` 실 로그인·발급·revoke **미실측** — 배포 후 §22 smoke 에서.

---

## 6. Step 9 — production 반영 (실측 2026-09-23, 이 세션 확인)

§1 의 배포 gate 는 **해소**됐다. 오염 원인이던 `CreateOperatorInvitations1790125106065` 가 정식
incremental 4번째로 확정되면서 Hospital migration 이 5번째 expected state 로 등록됐다.

| 단계 | 결과 |
|---|---|
| main 반영 | 구현 커밋 `b1c925251` 이 `origin/main` 조상(확인 시 HEAD `7d17a1533`). 이 세션은 push·merge·rebase·force 0 — **반영 상태 확인만** |
| registry | `EXPECTED_SCHEMA_STATES[4] = CreateHospitalDeviceTables1790125390245` (fingerprint 5826 lines) |
| migration Job | execution `o4o-api-migrations-9vjgp` — `CURRENT_INCREMENTAL_PREFIX = 4/4` · `INCREMENTAL_PENDING = 0` · `PRE_MIGRATION_SCHEMA_ASSERTION = PASS` · `POST_MIGRATION_SCHEMA_ASSERTION = PASS` · `MIGRATION_JOB = SUCCESS` · LIVE == EXPECTED fingerprint |
| API deploy | Deploy API Server run `35856452770` success · `/api/health` = alive · database healthy (production) |
| web deploy | Cloud Run `hospital-pharmacy-web-00008-7mf` serving · 배포 번들에 Device Enrollment UI 포함(`연결 코드`·`이 PC`·`api/hospital` 문자열 실측) |

순서(migration Job → API deploy)는 `deploy-api` workflow 내부 job→deploy 순서로 지켜졌다.

## 7. Step 10 — 운영 smoke

**자격 불요 구간 = 실측 PASS.** 연결 코드가 필요한 구간(C~H)은 관리자 Google 로그인이 선행이라
**미측정으로 남긴다**(§9).

| 항목 | 상태 | 근거(운영 실측) |
|---|---|---|
| A 관리자 `/manage` | **PARTIAL** | `neture.co.kr/hospital/manage` = 관리자 로그인 화면 · 실 Google GSI iframe 1개 렌더 · `GET /api/v1/auth/google/config -> 200` · 콘솔 오류 0. **실 로그인·코드 발급은 미측정** |
| B 미등록 PC | **PASS** | `/hospital` = "이 PC 는 아직 … 연결되지 않았습니다 / 개인 계정 로그인은 필요하지 않습니다" · 코드 입력 UI(input 2·버튼 1) · **Google 버튼 0 · "Google" 문구 없음** · 헤더 "이 PC: 미연결" · `/hospital/ward` 딥링크도 동일 게이트(textarea 0) · 무효 코드 → "유효하지 않거나 만료·사용되었습니다." |
| C Enrollment | **PENDING** | 유효 코드 필요 |
| D Local Context | **PENDING** | 연결 이후 구간 |
| E Gemini Research | **PENDING** | 연결 이후 구간 |
| F Generic File Understanding | **PENDING** | 연결 이후 구간 |
| G Local + Research | **PENDING** | 연결 이후 구간 |
| H Revoke | **PENDING(코드 경로)** · 계약 확인 | `resolveActiveDevice` 가 매 요청 `status='active'` 조건부 UPDATE → revoke 즉시 다음 요청부터 차단(코드 실측). 운영 revoke 왕복은 미측정 |
| I Scope isolation | **PASS(무자격 방향)** | device 쿠키만으로 `/api/v1/auth/me`·`/api/v1/users/profile`·`/api/v1/admin/users` 전부 401 `AUTH_REQUIRED` · 위조 device 쿠키로 `/api/hospital/ai/request` 401 `HOSPITAL_DEVICE_REQUIRED` · token 은 sha256 해시로만 저장(평문 비교 없음) · 신원은 HttpOnly 쿠키에서만(body `deviceId` 미신뢰) |
| J Regression | **PASS** | `neture.co.kr`(200) · `store.neture.co.kr`(200) · `admin.neture.co.kr`(200 · Google 버튼 1 = 기존 동작) · `kpa-society.co.kr`(200) 전부 콘솔 오류 0 · 기존 로그인 진입 변화 없음 |

부수 실측:
- device gate negative: `POST /api/hospital/ai/request`·`/ai/file-understanding` (쿠키 없음) → 401 `HOSPITAL_DEVICE_REQUIRED`
- admin API negative: `GET /admin/devices`·`POST /admin/enrollment-codes` (무인증) → 401 `AUTH_REQUIRED`
- enroll 입력 검증: 빈 코드 → 400 `CODE_REQUIRED`
- **rate limit 동작 확인**: enroll 응답에 `ratelimit-policy: 20;w=600` · `ratelimit-limit: 20` · `ratelimit-remaining` 감소 관측. 한도를 **고갈시키지 않았다**(사용자 연결을 막지 않기 위해 3회만 소모)

## 8. Step 12 — `/hospital-drug` 참조 census (삭제·redirect **미실행**)

선행 삭제 금지 원칙에 따라 **census 만** 수행했다.

| 축 | 결과 |
|---|---|
| 라우트 | `services/web-neture/src/App.tsx:692` `<Route path="/hospital-drug">` 1곳(lazy `HospitalDrugPage`) |
| 진입 링크·메뉴 | **0곳** — nav/사이드바/홈 카드 어디에도 링크 없음(URL 직접 진입 전용) |
| 서버 계약 | `surface='hospital-drug'` 조립기(`runHospitalDrugSurface`)는 **신규 `/api/hospital/ai/request` 가 그대로 소비**한다 → 페이지를 은퇴시켜도 서버 계약·테스트는 유지 |
| 원내 데이터 | 두 표면이 **동일 localStorage 키**(`neture:hospital-drug:local-dataset:v1`)를 쓰고, `/hospital` 이 **같은 origin(`neture.co.kr`)** 서브디렉토리라 기존 사용자 데이터셋이 **자동 승계**된다(이관 작업 불필요) |
| 기존 동작 관측 | `/hospital-drug` 는 로컬 에이전트 전제(미기동 시 `ERR_CONNECTION_REFUSED` 콘솔 1건) — 이번 WO 와 무관한 기존 동작 |

**판정**: redirect/retire **PENDING** — step 10 C~H PASS 로 `/hospital` 의 정식 대체가 확인된 뒤에만 실행한다.

## 9. 남은 PENDING — 사용자 직접 조치가 선행

관리자 Google 로그인은 이 세션이 대신할 수 없다(Google-only · 자격 미보유).

1. `https://neture.co.kr/hospital/manage` 에서 Google 로그인 → **연결 코드 발급**(A 완료)
2. 그 코드로 `https://neture.co.kr/hospital` 에서 **이 PC 연결**(C) → 새로고침 후 로그인 없이 진입
3. 이후 D~G(원내 Excel 연결 · 조사 · 파일 이해 · 결합)와 H(revoke 후 차단·재연결 안내) 측정

위 3개가 PASS 로 실측되기 전에는 `FOUNDATION_STATUS = PRODUCTION_READY` 로 쓰지 않는다.

---

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 (해당 없음)
