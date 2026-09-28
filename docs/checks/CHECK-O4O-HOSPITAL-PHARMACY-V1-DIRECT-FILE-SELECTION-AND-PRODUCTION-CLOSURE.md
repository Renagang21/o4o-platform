# CHECK — WO-O4O-HOSPITAL-PHARMACY-V1-DIRECT-FILE-SELECTION-AND-PRODUCTION-CLOSURE

> 병원약국 V1 원내 약품 파일 연결을 "폴더 선택 + 고정 파일명 `hospital-drugs.xlsx`" 에서
> "사용자가 Excel/CSV 파일 하나를 직접 선택(`showOpenFilePicker`)" 으로 전환하고 운영 배포까지 마감한다.
>
> 선행 기록: [`CHECK-O4O-HOSPITAL-PHARMACY-V1-FIXED-LOCAL-FILE-AND-LOGINLESS-SIMPLIFICATION`](CHECK-O4O-HOSPITAL-PHARMACY-V1-FIXED-LOCAL-FILE-AND-LOGINLESS-SIMPLIFICATION.md)
> (무로그인 · GFU profile 전송 · `/api/hospital/ai/structure` 는 현행 유지, 폴더/고정 파일명 부분만 이 WO 가 대체)

- **작성**: 2026-09-29
- **코드**: `bb26f3a26` (web-hospital-pharmacy 만 · API · 공용 패키지 · package.json/lockfile 무변경)
- **운영 배포**: DONE — `hospital-pharmacy-web-00013-2xt` · traffic 100% (§5)
- **운영 실브라우저 smoke A~H**: **PENDING** — native 파일 선택 창 · 권한 창은 사용자 실조작 필요 (§6)
- **HOSPITAL_V1_STATUS**: `PRODUCTION_READY` **아님** — smoke A~H PASS 후 올린다

---

## 1. 변경 요약

| 영역 | 이전 | 이후 |
|---|---|---|
| 파일 연결 | `showDirectoryPicker` → 폴더 안 `getFileHandle('hospital-drugs.xlsx')` | `showOpenFilePicker` 로 `.xlsx` · `.xls` · `.csv` 하나 직접 선택 (`multiple:false` · `startIn:'downloads'`) |
| 파일명 | 고정(`hospital-drugs.xlsx`) | 제한 없음 — 실제 파일명을 화면에 표시 |
| 저장(IndexedDB `o4o-hospital-pharmacy`/`kv`) | 폴더 handle | `drug-file` = `{handle, fileName, lastModified, size, connectedAt}` 만 · `drug-mapping` = fingerprint·GFU inference · 옛 `drug-folder` 키는 진입 시 삭제 |
| 재접속 | 폴더 권한 재요청 | 저장 handle 재사용 — granted 면 자동 읽기 · 아니면 [원내 약품 파일 읽기 허용] 1회 · 파일 이동/삭제 시 unreadable 안내 + [다른 파일 선택] |
| 덮어쓰기 | 폴더 재탐색 | 같은 handle 의 `lastModified`/`size` 변경 감지(조회 직전 · 화면 복귀 시) → 자동 재읽기 · fingerprint 같으면 mapping 재사용, 다르면 GFU 재추론 |
| 다른 파일 | 폴더 교체 | [파일 변경] → 파일 직접 재선택 · 취소 시 기존 연결 유지 |

파일 구성:

- `src/lib/drugFileStore.ts` (`folderStore.ts` rename)
- `src/lib/localDrugFile.ts` — picker 옵션 · 확장자 검사 · 권한 · `readDrugFile`
- `src/lib/drugFileSession.ts` (신규) — 연결 상태 기계, 의존성 주입으로 검증
- `src/contexts/LocalDrugContext.tsx` — 브라우저 의존 주입 + focus/visibility 전달만
- `src/components/DrugFileGate.tsx` (`FolderGate.tsx` rename)
- `App.tsx` · `HomePage` · `WardPage` · `PharmacyDeptPage` 문구 · `browserSupport.ts`

유지(무변경): `@o4o/file-understanding-core` · `HOSPITAL_DRUG_TARGET_SCHEMA` · `@o4o/hospital-pharmacy-core` · `/api/hospital/ai/request` · `/api/hospital/ai/structure` · `/api/ai/*` 인증 · 무로그인 · device enrollment 없음 · `/hospital-drug`.

## 2. 금지 사항 대조

| 금지 | 결과 |
|---|---|
| 폴더 자동 탐색 · 최신 파일 자동 탐색 · 복수 파일 자동 판단 | 없음 (`showDirectoryPicker` · `getFileHandle` 0 · `multiple:false`) |
| 파일명 고정 | 없음 (`hospital-drugs.xlsx` 0) |
| localStorage 전체 dataset | 없음 (번들 `localStorage` 0 · 정규화 행은 메모리만) |
| 서버 Excel 저장 · 전체 파일 업로드 | 없음 — 서버에는 profile(샘플 ≤20행)만 전송 |
| device auth · Google login 복구 | 없음 |
| 병원별 parser alias | 없음 |
| O4O Main Core 재설계 | 없음 |

## 3. 로컬 검증

| 검증 | 결과 |
|---|---|
| vitest `services/web-hospital-pharmacy/tests/direct-file-selection.test.ts` (루트에서 `npx vitest run --config services/web-hospital-pharmacy/vitest.config.mjs`) | 20/20 PASS |
| api-server jest 회귀 (hospital-pharmacy-core · representative-tasks · file-understanding · hospital-routes-profile-boundary) | 4 suites 38/38 PASS |
| web `tsc -b && vite build` | PASS (chunk size 경고만) |
| ESLint `src` · `tests` | 0 |
| 로컬 preview + Playwright (picker stub · structure API mock) | 최초 화면 · 연결 후 `원내 약품 파일: <파일명> · 3개 품목` · structure API 1회 · localStorage 키 0 — PASS. 새로고침 후 handle 재사용은 stub handle 이 structured-clone 불가라 로컬 검증 불가 → 운영 smoke F 로 이관 |

vitest 가 덮는 것: picker 계약 · 취소 · 임의 파일명 · 소스 스캔(폴더 API/고정명 0) · 재접속 granted 자동 읽기 · prompt→허용 · denied · 파일 삭제→unreadable · 미지원 브라우저 · 덮어쓰기 재읽기+mapping 재사용 · 구조 변경 재추론 · [파일 변경] · 저장 레코드 키가 정확히 5개(행 데이터 없음) · profile 샘플 ≤20행.

## 4. 배포 절차 (통제 배포)

| 단계 | 결과 |
|---|---|
| 태그 | `deploy/2026-09-28-hospital-direct-file` → `bb26f3a26` |
| 게이트 | `DEPLOY_ENABLED` true (사용자 승인) → dispatch → **07:19Z false 재폐쇄** |
| dispatch | `deploy-web-services.yml` · `service=hospital-pharmacy` · run `36390477488` |
| 범위 | `deploy-hospital-pharmacy` 만 실행 · 나머지 web 8개 skipped · API/admin 미포함 |
| environment | `production` required reviewer 승인 대기 → 사용자가 직접 승인 |

## 5. 배포 결과 (운영 실측 2026-09-28)

| 항목 | 결과 |
|---|---|
| `deploy-hospital-pharmacy` job | success |
| 새 revision | `hospital-pharmacy-web-00013-2xt` (07:28:13Z) |
| traffic | 00013-2xt 100% |
| serving 번들 | `https://neture.co.kr/hospital` → `/hospital/assets/index-CUkEWWxx.js` |
| 번들 문자열 | `showOpenFilePicker` 2 · `원내 약품 파일 연결` 3 · `파일 이름은 상관없습니다` 1 / `showDirectoryPicker` · `hospital-drugs.xlsx` · `getFileHandle` · `원내 약품 폴더` · `localStorage` · `로그인` · `enroll` 모두 0 |
| 운영 첫 화면 (Playwright) | 헤더 `원내 약품 파일 미연결` · "원내 약품 파일을 연결해 주세요 … 파일 이름은 상관없습니다" · [원내 약품 파일 연결] · 로그인/연결 코드 없음 — PASS |

## 6. 운영 실브라우저 smoke A~H — PENDING

native 파일 선택 창 · 권한 창은 자동화로 조작할 수 없어 사용자 Chrome/Edge 실조작 필요.

| # | 시나리오 | 기대 | 결과 |
|---|---|---|---|
| A | [원내 약품 파일 연결] | 다운로드 폴더에서 실제 .xlsx 직접 선택 | PENDING |
| B | 선택 후 | 실제 파일명 · 품목 수 표시 | PENDING |
| C | "우리 원내에 아세트아미노펜 있어?" | 원내 조회 결과 | PENDING |
| D | "타이레놀정 효능을 조사해줘" | Gemini 조사 | PENDING |
| E | "타이레놀과 같은 성분의 원내약 있어?" | 조사 + 원내 결합 | PENDING |
| F | 새로고침 | 자동 읽기 또는 권한 허용 1회 · 파일 재선택 없음 | PENDING |
| G | 같은 파일 덮어쓰기 후 탭 복귀 | 품목 수 자동 반영 | PENDING |
| H | [파일 변경] → 다른 Excel | 새 파일명 · 품목 수 | PENDING |

## 7. 잔여 · 별도 WO

| 항목 | 처리 |
|---|---|
| 신규 vitest 가 CI 에서 돌지 않음 | CI 변경 = 범위 밖 → 별도 WO 제안 |
| `apps/api-server/src/routes/hospital/hospital.routes.ts` 주석에 폴더/`hospital-drugs.xlsx` 서술 잔존(동작 무관) | smoke 후 정합 마감에서 판단 |
| `/hospital-drug` · `/hospital/manage` legacy census · 정리 | smoke PASS · PRODUCTION_READY 이후 후속 |

## 8. 판정 (현재)

```
DIRECT_FILE_SELECTION      = DONE (운영 번들 확인)
FOLDER_SELECTION_ACTIVE    = NO
FIXED_FILE_NAME_REQUIRED   = NO
FILE_HANDLE_PERSISTENCE    = DONE (IndexedDB handle · 운영 smoke F PENDING)
FILE_PERMISSION_REUSE      = DONE (단위 검증 · 운영 smoke F PENDING)
ACTUAL_FILE_SSOT           = YES
FULL_DATASET_PERSISTED     = NO
GENERIC_FILE_UNDERSTANDING = 유지 (profile 만 전송 · mapping 재사용)
LOCAL_CONTEXT              = 메모리만
FILE_CHANGE_DETECTION      = DONE (단위 검증 · 운영 smoke G PENDING)
FILE_REPLACEMENT           = DONE (단위 검증 · 운영 smoke H PENDING)
HOSPITAL_LOGIN_REQUIRED    = NO
DEVICE_ENROLLMENT          = NO
SUPPORTED_BROWSERS         = Chrome · Edge
PRODUCTION_DEPLOY          = DONE (hospital-pharmacy-web-00013-2xt · 100%)
PRODUCTION_SMOKE           = PENDING (사용자 실조작 A~H)
HOSPITAL_V1_STATUS         = PRODUCTION_READY 아님 (smoke 대기)
```
