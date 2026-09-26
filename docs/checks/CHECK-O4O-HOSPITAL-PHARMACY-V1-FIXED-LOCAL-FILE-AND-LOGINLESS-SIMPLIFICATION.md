# CHECK — WO-O4O-HOSPITAL-PHARMACY-V1-FIXED-LOCAL-FILE-AND-LOGINLESS-SIMPLIFICATION

> 병원약국 V1 운영 방식 확정: 병원 PC → Chrome/Edge → `https://neture.co.kr/hospital` → 최초 1회 원내 약품 폴더 연결
> → 고정 파일 `hospital-drugs.xlsx` 를 실제 PC 에서 직접 읽음 → 로그인 없음 · device enrollment 없음 ·
> 브라우저 저장소에 약품 데이터셋 복제 없음.
>
> 선행 기록: [`CHECK-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1`](CHECK-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1.md)
> (device enrollment 방식 — 이 WO 로 active path 에서 제거됨. 그 CHECK 의 §7 C~H · §9 PENDING 은 **이 WO 가 대체**한다.)

- **작성**: 2026-09-26
- **상태**: 코드 · 테스트 · CI 완결 / **운영 배포 PENDING — 전역 배포 게이트 `DEPLOY_ENABLED=false`** (§7)
- **FOUNDATION_STATUS**: `PRODUCTION_READY` **아님** — 배포 + 실브라우저 smoke A~J 전까지 올리지 않는다

---

## 1. 사용자 결정 (이 WO 안에서 확정)

| 결정 | 선택 | 근거 |
|---|---|---|
| 브라우저 Excel decode 의존성 | `web-hospital-pharmacy` 에 `xlsx@0.18.5` 추가 (web-neture · api-server 와 같은 버전 · 업그레이드 없음) | §18 전체 파일 서버 미전송 |
| GFU 순수 계층 위치 | 공용 패키지 `packages/file-understanding-core` 로 추출 — api-server 와 web 이 **같은 구현** 소비 | 사본 금지 · 병원 특화 파서 복제 금지 |

## 2. Census (최신 origin/main 기준, 구현 전)

| 항목 | 발견 | 판정 |
|---|---|---|
| `/hospital` UI | `EnrollmentGate`(연결 코드) + `/manage`(super_admin Google 로그인) | 교체 → `FolderGate` |
| 약제부 파일 흐름 | `<input type=file>` → **전체 파일 base64 서버 전송** → 서버 decode/GFU → 결과 localStorage 저장 | §18 위반 → 브라우저 decode + profile 만 전송 |
| GFU consumer | `ai-proxy.routes` `/api/ai/file-understanding`(authenticate) · `hospital.routes` · `file-understanding.spec` | 경로 호환 re-export 로 무변경 동작 |
| File System Access · IndexedDB helper | 저장소에 없음 | 신규(`folderStore.ts` · 네이티브 IndexedDB, 의존성 0) |
| hospital device service / cookie / registry / guard | `hospital-device.service.ts` · `hospitalDeviceToken` 쿠키 헬퍼 · `requireHospitalDevice` · `/session`·`/enroll`·`/disconnect`·`/admin/*` | §12 판정은 아래 §3 |
| rate limiter | `express-rate-limit` + `getTrustedClientIp` (기존) | 재사용 |
| localStorage dataset | `neture:hospital-drug:local-dataset:v1` — `/hospital` 과 `/hospital-drug` 가 **같은 origin 에서 공유** | `/hospital` 은 **읽지 않음**. clear 하지 않음(아직 살아 있는 `/hospital-drug` 데이터 보호) |
| `/hospital-drug` 참조 | web-neture `App.tsx` 라우트 1곳 · 진입 링크 0 | 이 WO 에서 변경 없음(§8) |

## 3. Device enrollment 구현 처리 (§12)

| 요소 | 판정 | 처리 |
|---|---|---|
| `services/hospital/hospital-device.service.ts` + `hospital-device-service.spec.ts` | DELETE_IF_SAFE | 삭제 — 소비처는 hospital.routes 뿐 |
| `hospitalDeviceToken` 쿠키 헬퍼(`cookie.utils.ts`) | DELETE_IF_SAFE | 삭제 — `check-literal-consumers` 살아있는 소비처 0 |
| `/api/hospital/session` · `/enroll` · `/disconnect` · `/admin/*` · device 게이트 | REMOVE_FROM_ACTIVE_PATH | 라우트 삭제 |
| `/api/hospital/ai/file-understanding`(전체 파일 수신) | REMOVE_FROM_ACTIVE_PATH | 삭제 → `/ai/structure`(profile 만)로 대체 |
| web `/manage` · `AuthContext` · `LoginPanel` · `adminApi` · `DeviceContext` · `EnrollmentGate` · `deviceSession` · `localStore` | DELETE_IF_SAFE | 삭제. `@o4o/auth-*` 의존 제거 |
| migration `1790125390245-CreateHospitalDeviceTables` · 테이블 `hospital_devices` · `hospital_device_enrollment_codes` | HISTORICAL_ONLY | **유지**. drop migration 없음 · destructive rollback 없음(운영 `hospital_devices` 0행 — URL census) |

공유 `/api/ai/*` 의 `authenticate` 는 변경 없음. 다른 서비스 로그인 변경 없음. O4O Main Core(cms/auth/platform/organization) 변경 없음.

## 4. 구현

### 4-1. 공용 `@o4o/file-understanding-core` (신규 · dist 빌드 패키지)
- `contract` · `decode` · `profile` · `fingerprint` · `normalize` 를 **내용 변경 없이** 이동(`strict: true` 빌드 오류 0).
- api-server `services/ai-tools/file-understanding/*.ts` 는 `export * from '@o4o/file-understanding-core'` re-export — 기존 import 경로 전부 그대로.
- AI 호출(`inferFileStructure` · Gemini)은 api-server 에만 남는다.
- api-server `tsconfig` 는 `@o4o/*` → `packages/*/dist`, tsup 은 `@o4o/*` inline 번들(xlsx 는 external · `package.production.json` 에 이미 있음) → `package.production.json` 변경 불요.

### 4-2. API — `/api/hospital/*` (무로그인 bounded AI)
| 경로 | 내용 | 제한 |
|---|---|---|
| `POST /ai/request` | `runHospitalDrugSurface`(Gemini Web Research) · `suppressLocal=true` · screen modality → 안내 | IP 1분 20회 + surface 전체 10분 600회 |
| `POST /ai/structure` | `validateStructureProfile` → `inferFileStructure` → inference 반환 | IP 10분 10회 + surface 전체 |

`validateStructureProfile`: 시트 ≤ 20 · 열 ≤ 200 · 표본 행 ≤ 20(`STRUCTURE_PROFILE_SAMPLE_ROWS`) · 셀 ≤ 200자 · 열 통계 표본 ≤ 3개 · ≤ 40자 · 알 수 없는 키 재조립으로 제거. **전체 행이 실린 요청은 400.**
쿠키·토큰을 읽지도 심지도 않는다. O4O 계정 · admin · 조직 · 결제 · credential · 임의 tool 경로 없음.
rate limit 은 기본 memory store — Cloud Run 인스턴스별로 센다(근사치, 새 quota 시스템 미도입).

### 4-3. Web — `services/web-hospital-pharmacy`
- `FolderGate`: unsupported(Chrome/Edge 안내) · unconnected(`[원내 약품 폴더 연결]`) · needs-permission(클릭 1회 허용) · file-missing(`hospital-drugs.xlsx 파일을 찾지 못했습니다…`) · error · ready.
- `LocalDrugContext`: `showDirectoryPicker({mode:'read'})` → `getFileHandle('hospital-drugs.xlsx')` 존재 확인 후 handle 을 **IndexedDB** 저장. 재접속 시 handle 재사용(폴더 재선택 없음).
- 변경 감지: focus/visibility 복귀 · 조회 직전 `ensureFresh()` 에서 `lastModified`/`size` 비교 → 바뀌면 재파싱.
- 파이프라인(`localDrugFile.ts`): 브라우저 decode → profile → fingerprint → 같은 fingerprint+schema 면 저장 mapping 재사용, 아니면 `/ai/structure`(profile 만) → 결정론 정규화 → `normalizedRecordsToHospitalRows` → **메모리** Local Context. 캐시 mapping 이 0건이면 1회 재추론.
- IndexedDB 저장 항목: directory handle · `{fingerprint, targetSchemaId, inference, model, createdAt}` 뿐. 약품 행은 저장하지 않는다.
- Chrome/Edge 외 Chromium(Whale·Opera 등)은 동작하더라도 "공식 지원 대상 아님" 배너.
- 병동 화면: 원내 보유(local_only)는 서버 없이 메모리 행으로, 동일성분은 서버 조사 + 메모리 행 결합.
- TargetSchema 는 `@o4o/hospital-pharmacy-core` 의 기존 `HOSPITAL_DRUG_TARGET_SCHEMA`(product_name·ingredient·strength·dosage_form·manufacturer·status) 그대로. WO §7 예시의 `hospital_code`·section 필드는 **추가하지 않았다**(스키마 변경은 web-neture `/hospital-drug` 와 공유 · 예시 항목).

### 4-4. 빌드 인프라
- `pnpm-lock.yaml` — importer 3곳만(api-server +1 · 새 패키지 · web-hospital-pharmacy ±). 새 외부 패키지 다운로드 0.
- `services/web-hospital-pharmacy/Dockerfile` — auth 패키지 COPY/빌드 제거, `@o4o/file-understanding-core` COPY + build 추가.
- `scripts/ci/__tests__/detect-affected.test.mjs` W4 — auth-client 소비 서비스 전제 8→7(병원약국이 auth 를 쓰지 않게 된 사실 반영) + "hospital-pharmacy 는 auth-client 미소비" 단언 추가.

## 5. 검증 (로컬 실측)

| 검증 | 결과 |
|---|---|
| `@o4o/file-understanding-core` `tsc --build`(strict) | PASS |
| api-server `tsc -p tsconfig.json --noEmit` | PASS (exit 0 · 출력 0) |
| api-server `tsup` 번들 | PASS · `main.js` 에 `validateStructureProfile`·`hospital:surface` 포함 · `hospitalDeviceToken` 0 |
| jest: `file-understanding` · `hospital-pharmacy-core` · `hospital-pharmacy-representative-tasks` · 신규 `hospital-routes-profile-boundary` | **4 suites · 38 tests PASS** |
| web-hospital-pharmacy `tsc -b && vite build` | PASS (번들 589KB · xlsx 포함 — chunk 크기 경고만) |
| `detect-affected.test.mjs` | 75/75 PASS (W4 기대값 정정 후) |
| ESLint(변경 파일 전체) | 0 |
| `check-literal-consumers` (cookie.utils · decode) | 살아있는 소비처 0 |
| 제거 경로 참조(`hospital/enroll`·`hospital/session`·`HOSPITAL_DEVICE_REQUIRED`·`hospital/admin/`·`hospital/manage`) | 코드 0 (docs 기록물만) |

## 6. 운영 smoke (§23) — PENDING

배포 전이라 **미측정**. 게이트 개방 · 배포 후 실제 Chrome/Edge 에서:

| 항목 | 상태 | 비고 |
|---|---|---|
| A 최초 접속(로그인·enrollment 없음 · 폴더 안내) | PENDING | |
| B 폴더 연결(실제 폴더 선택 · 파일 발견) | PENDING | 네이티브 폴더 선택 창 — 사용자 조작 필요 |
| C 새로고침(연결 유지 · 자동 재접근) | PENDING | Chrome/Edge 는 재접속 시 "허용" 1클릭을 요구할 수 있음 → 권한 창 "방문할 때마다 허용" 선택 시 무클릭. **폴더 재선택은 불요**. 실측으로 확인 |
| D 파일 변경(같은 이름 덮어쓰기 → 자동 반영) | PENDING | |
| E 원내 조회 | PENDING | |
| F Gemini 조사 | PENDING | |
| G GFU(처음 보는 구조) | PENDING | |
| H Research + Local | PENDING | |
| I 파일명 오류 안내 | PENDING | |
| J 브라우저 제한 안내 | PENDING | |

대표 업무 5(주문 가능 확인) · 6(병원 프로그램 재고)은 외부 사이트/PC 프로그램 정보가 없으면 QUESTION/안내가 정상 상태다.

## 7. 배포 게이트

`DEPLOY_ENABLED=false`(repo variable · 2026-09-25T23:02Z 갱신 · URL-first 트랙이 운영 전환 통제를 위해 닫음 — [`CHECK-O4O-URL-FIRST-CENSUS-V1`](CHECK-O4O-URL-FIRST-CENSUS-V1.md)).
이 WO 단독 이유로 전역 게이트를 열지 않는다. main push 후 CI 는 돌고 배포 job 은 skip 된다.
게이트가 열리면 API(`/api/hospital/ai/structure`)와 web 이 **같이** 나가야 한다 — web 만 먼저 나가면 구조 이해가 404, API 만 먼저 나가면 구 web(device) 이 동작하지 않는다(운영 enrolled device 0 이라 실사용 영향 없음).

## 8. 범위 밖 · 후속

- `/hospital-drug`(web-neture) redirect/retire — 이 WO 에서 손대지 않음. `/hospital` smoke PASS 후 별도 판단(URL census P16 = REMOVE 확정).
- `www.neture.co.kr/hospital` LB 규칙 누락 — URL census P15 결함으로 기록됨(이 WO 범위 밖).
- rate limit 은 인스턴스별 memory store — 비용 이상 징후가 보이면 공용 store 로 올리는 것을 별도 판단.

## 9. 최종 판정 (현재)

```text
HOSPITAL_LOGIN_REQUIRED       = NO (코드)
DEVICE_ENROLLMENT_ACTIVE      = NO (코드 · 테이블은 HISTORICAL_ONLY)
SUPPORTED_BROWSERS            = CHROME_EDGE
FIXED_FILE_NAME               = hospital-drugs.xlsx
FILE_SYSTEM_ACCESS            = IMPLEMENTED (운영 실측 PENDING)
ACTUAL_FILE_SSOT              = YES
LOCALSTORAGE_DATASET_SSOT     = NO
GENERIC_FILE_UNDERSTANDING    = PASS (공용 Core · 결정론 테스트) / 운영 PENDING
FILE_CHANGE_DETECTION         = IMPLEMENTED (운영 실측 PENDING)
HOSPITAL_AI_BOUNDARY          = PASS (코드 · 테스트)
RATE_LIMIT                    = IMPLEMENTED (IP + surface 전체)
PRIVACY_BOUNDARY              = PASS (profile 만 전송 · 전체 행 400)
GOOGLE_LOGIN_UI               = REMOVED
HOSPITAL_MANAGE_DEVICE_FLOW   = REMOVED
PRODUCTION_SMOKE              = PENDING (DEPLOY_ENABLED=false)
FOUNDATION_STATUS             = NOT_YET (배포 + smoke 후 PRODUCTION_READY)
```

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — 기준 문서(baseline·architecture·CANONICAL-INDEX)에 device enrollment 정본 기술 없음. 선행 CHECK 는 기록물이라 대상 아님.
