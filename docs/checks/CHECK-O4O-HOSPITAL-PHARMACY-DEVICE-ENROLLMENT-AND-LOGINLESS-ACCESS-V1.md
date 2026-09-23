# CHECK — WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1

> 병원약국을 **개인 로그인 서비스가 아니라 공용 PC 공유 업무 서비스**로 전환한다. 관리자가 1회용
> 연결 코드를 발급 → 공용 PC 가 1회 device enrollment → 이후 **로그인 없이** device credential
> (HttpOnly 쿠키)로 hospital 범위 AI 를 쓴다. 개인 Google 로그인은 일반 경로에서 제거하고,
> 관리자(별도 역할)만 `/manage` 에서 로그인한다.

- **상태**: **구현 COMPLETE · 결정론 검증 PASS · 배포 GATE 대기(migration registry / deploy / smoke 보류)**
- **표기일**: 2026-09-23
- **결정론 검증**: `hospital-device-service.spec` 14/14 PASS(mock QueryExecutor · DB 불요) · api-server `tsc --noEmit` 0 · web-hospital-pharmacy `tsc -b` 0
- **보존**: `feature/hospital-pharmacy-device-enrollment` (commit `6bab8c49c`) push 완료 — **main 미반영(배포 gate)**
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

- 브라우저 smoke(연결 코드 발급→입력→연결→조사/파일이해) **미실행** — 배포 gate 로 서버 미배포.
- migration 실적용·fingerprint **미실행** — registry 오염으로 보류(§1).
- 관리자 `/manage` 실 로그인·발급·revoke **미실측** — 배포 후 §22 smoke 에서.

---

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 (해당 없음)
