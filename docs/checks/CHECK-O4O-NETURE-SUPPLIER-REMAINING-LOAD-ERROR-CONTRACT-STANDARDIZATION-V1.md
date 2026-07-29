# CHECK-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-STANDARDIZATION-V1

WO: WO-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-STANDARDIZATION-V1
버킷: E (공급자 실제 사용 화면 조회 실패 은폐 제거)
상태: 구현·정적검증 완료 / 배포·프로덕션 smoke 진행

## 1. 목적

Neture 공급자용 화면에서 API 조회 실패가 "정상 0건"(빈 목록) 또는 "신규"(빈 폼)로
둔갑하는 silent-swallow 를 제거한다. 각 조회는 4개 표준 상태를 갖는다:
**로딩 / 정상 데이터 / 정상 0건 / 조회 오류 + 다시 시도.**

한 API 실패가 건강한 다른 영역까지 무너뜨리지 않도록 영역별 오류 상태를 격리한다.

## 2. 제거 대상 안티패턴

- `catch(() => [])` / `catch(() => null)` → 빈 목록 위장
- catch → 빈 목록 후 정상 화면
- console.error only + 정상 화면
- 기존 draft/canonical 조회 실패 → 신규 폼 전환
- try/catch 부재 → unhandled rejection / 무한 "불러오는 중" 스피너

## 3. 대상 화면별 조치

| # | 화면 | 조치 |
|---|------|------|
| 1 | SupplierStoreDescriptionsPage | profileError / productsError 분리 상태 + reload-key 재시도. 프로필 실패 ≠ "미승인", 상품 실패 ≠ "상품 0건" |
| 2 | SupplierStoreDescriptionEditorDrawer | loadError + reloadKey. 조회 실패 시 **빈 편집기 열지 않음**(기존 작업 덮어쓰기 방지), 철회·임시저장·검수요청 버튼 차단, 다시 시도 |
| 3 | SupplierEventOfferPage | itemsError / proposableError / proposalsError 3영역 독립 격리. 오퍼 목록·내 제안·제안 가능 오퍼 각각 재시도. 실패 시 총건수 숨김, 제안 mutation 무변경 |
| 4 | SupplierProductLibraryPage | searchError 추가(기존 try/catch 부재 → 무한 "검색 중" 위험 제거). 검색 전/중/성공0건/성공N건/실패 구분. 재시도는 검색어·필터·페이지 유지. 참조데이터(카테고리·브랜드) 실패는 toast 알림(검색은 필터 없이 동작) |
| 5 | SupplierProductCreatePage | categoriesLoading/categoriesError/categoriesReloadKey. 카테고리 로드 실패 시 빈 select 대신 오류+다시 시도, validateStep 에서 제출 차단, 입력값 유지. 바코드 조회 실패 ≠ "새 상품"(barcodeChecked 는 성공 시에만 true) |
| 6 | SupplierTrialListPage (Market Trial 목록) | load useCallback 추출 + 다시 시도. 조회 실패 ≠ "펀딩 0건", 필터·페이지 유지 |
| 7 | SupplierTrialDetailPage (상세) | 404=존재 안 함 / 403=권한 없음(재시도 미노출) / 그 외=오류+다시 시도(canRetry). 콘텐츠 정책 무변경 |
| 8 | SupplierTrialEditPage (편집) | load useCallback + canRetry. 조회 실패 시 빈 CreatePage 폼으로 떨어뜨리지 않음, 저장 차단(폼 미렌더), 다시 시도. 비초안 확정 상태는 재시도 미노출 |

## 4. 제외 (WO 명시)

AdminSupplierApprovalPage, SupplierQualityPage, RegulatedCategoriesModal, CsvImport,
`market-trial/*` Hub/Detail(store/public scope).

## 5. 불변식 (금지 준수)

- API endpoint 변경 없음 / DB write 없음 / migration 없음
- 상태 머신·승인 정책·route·menu 변경 없음
- 신규 공통 패키지·dependency 추가 없음
- 의도적 fail-open 소비처가 있는 shared API 헬퍼 변경 없음 (각 화면 로컬 정비만)
- 기존 mutation(제안, createProduct/updateTrial, 검수요청, 철회) 무변경

## 6. 정적 검증

- `pnpm --filter @o4o/web-neture exec tsc --noEmit -p tsconfig.json` → PASS (에러 0)
- `pnpm --filter @o4o/web-neture build` → PASS (built in ~13s)

## 7. 배포 & 프로덕션 검증

- CI "Deploy Web Services (Cloud Run)" → deploy-neture **success** (2m15s, commit 53e2e7fcc)
- neture-web URL: https://neture-web-3e3aws7zqa-du.a.run.app

### 7-1. 실브라우저 합성 오류 smoke — BLOCKED

Playwright 자동화 브라우저가 공유 프로파일(`C:\Users\home\.playwright-o4o-profile`)을
다른 동시 세션의 Chrome 인스턴스가 점유 중이어서 기동 실패(즉시 exit). 동시 세션 작업을
훼손하지 않기 위해 해당 Chrome 프로세스를 강제 종료하지 않음. → **대화형 오류 주입 smoke 보류.**

### 7-2. 프로덕션 배포 산출물 검증 (대체 채널 — CLAUDE.md §8 코드 경로 정적 분석 + API 직접 호출)

배포된 프로덕션 번들(chunk)을 직접 fetch 하여 각 화면의 신규 오류계약 문자열이
실제 LIVE 상태임을 확인. 8/8 화면 PASS:

| 화면 | 프로덕션 chunk | 확인된 신규 문자열 |
|------|----------------|-------------------|
| StoreDescriptionsPage + EditorDrawer | SupplierStoreDescriptionsPage-DU2tTIc1.js | "설명서를 불러오지 못했습니다" / "기존 작업 내용을 덮어쓰지 않도록 편집기를 열지 않았습니다" / "다시 시도" |
| EventOfferPage | SupplierEventOfferPage-On8w60kN.js | "상품을 불러오지 못했습니다" / "현황을 불러오지 못했습니다" / "다시 시도" |
| ProductLibraryPage | SupplierProductLibraryPage-8pT3OubQ.js | "상품을 검색하지 못했습니다" / "카테고리 목록을 불러오지 못했습니다" / "브랜드 목록을 불러오지 못했습니다" / "다시 시도" |
| ProductCreatePage | SupplierProductCreatePage-BSwoh7I9.js | "카테고리 목록을 불러오지 못했습니다" / "바코드 조회에 실패" / "다시 시도" |
| TrialListPage | index-Dj3hUNkt.js | "목록을 불러오지 못했습니다" / "다시 시도" |
| TrialDetailPage | index-wDEQXHi7.js | "접근 권한이 없습니다"(403) / "유통참여형 펀딩을 찾을 수 없습니다"(404) / "결과를 불러오지 못했습니다"(else) / "다시 시도" |
| TrialEditPage | index-wDEQXHi7.js | "유통참여형 펀딩을 불러오지 못했습니다" / "초안 상태의 유통참여형 펀딩만 수정" / "다시 시도" |

정적 검증(tsc/build) + 배포 성공 + 번들 문자열 확인으로 계약 반영을 확인. 대화형 합성
오류 주입 smoke 는 브라우저 프로파일 점유 해제 후 후속 수행 권장.
