# CHECK-O4O-KPA-STORE-LIBRARY-CONTENT-ONLY-SELECTOR-V1

> **작업명:** KPA 강의 → 매장 자료함 연결 제거 3단계 (frontend)
> **유형:** KPA 매장 콘텐츠 화면·제작 자료 선택 모달의 강의 선택 UI 제거 (frontend-only)
> **결과: PASS (코드/타입체크)** — `StoreContentsSelector` 의 콘텐츠/강의 상위 전환과 `LessonsSection` 을 제거하고 콘텐츠 전용으로 정리. KPA web typecheck 0 errors. 운영 브라우저 smoke 는 배포 후 수행(아래 §9 — push 보류 중이라 미배포).
> **선행:** `CHECK-O4O-LMS-KPA-LESSON-SNAPSHOT-CREATION-REMOVAL-V1` (2단계, backend — 본 사이클에서 재구현·커밋·push 완료, commit `d2aaf6194`)
> **작성일:** 2026-06-27 · 기준 HEAD (push 전 로컬) `f138b96b0`

## 1. 조사 결과

- `StoreContentsSelector` 가 `/store/library/contents`(page)와 `SelectContentsForProductionModal`(modal) 두 곳에서 공유됨. 강의 관련 코드는 KPA 내부에만 존재(`LessonsSection`/`toLessonRow`/`LessonRow`/`TopTabBar` 정의·소비 모두 KPA selector 한정).
- GP/KCos 및 다른 서비스는 `StoreContentsSelector` 를 사용하지 않음 → 공통 코드 영향 없음.
- 콘텐츠 하단 QR·POP·인쇄용 PDF·제작 시작·선택 삭제·검색·출처/태그 필터·페이지네이션은 모두 `DocumentsSection` 에 위치 → 강의 코드 제거가 콘텐츠 기능에 영향 없음.
- 콘텐츠 내부 `문서형/코스형` SubTab 은 선행 WO 에서 이미 제거되어 상위 `콘텐츠/강의` 전환만 남아 있었음(본 작업 대상). 코스형 잔여 재도입 없음.

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/StoreContentsSelector.tsx` | `TopTab`/`TopTabBar`, `LessonRow`, `toLessonRow`, `readNumber`, `LessonsSection`, `topTab` state, 강의 데이터 호출(`list({type:'lesson'})`) 제거. `StoreContentsSelector` 가 `DocumentsSection` 직접 렌더. 미사용 import(`BookOpen`/`storeAssetControlApi`/`StoreAssetItem`)·dead `segmented*` style 제거 |
| `services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx` | 부제·헤더 주석에서 `강의(LMS 참조 자산)` 표현 제거, 콘텐츠 전용 설명으로 정리 |
| `services/web-kpa-society/src/pages/pharmacy/SelectContentsForProductionModal.tsx` | 소스 탭 라벨 `콘텐츠·강의` → `콘텐츠`, 관련 주석 정리 |
| `services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx` | 제작 자료 페이지 부제/빈 상태 안내 2곳의 `콘텐츠·강의` → `콘텐츠` (브라우저 smoke 중 발견한 stray 표기) |
| `docs/checks/CHECK-O4O-KPA-STORE-LIBRARY-CONTENT-ONLY-SELECTOR-V1.md` | 본 CHECK 기록 |

## 3. 제거한 강의 UI·코드

- 상위 `콘텐츠 / 강의` 전환 버튼(`TopTabBar`)과 segmented 스타일.
- `LessonsSection`(강의 목록·검색·선택·삭제·제작 시작), `LessonRow`/`toLessonRow`/`readNumber`.
- 강의 데이터 조회 `storeAssetControlApi.list({ type: 'lesson' })` 호출과 `StoreAssetItem` 의존.
- 제작 자료 선택 모달의 `콘텐츠·강의` 라벨(→ `콘텐츠`).

## 4. 유지한 콘텐츠 제작 기능 (회귀 없음)

- 하단 작업막대: `QR-code 만들기` / `POP 만들기` / `인쇄용 PDF 만들기` / `제작 시작` / `선택 삭제`.
- `StoreQrCreateModal`, `StorePopCreateModal`, `ContentPdfExportModal` import·렌더 유지.
- 콘텐츠 검색, 출처(전체/운영자/커뮤니티/내가 만든) 필터, 태그 필터, 페이지네이션, 콘텐츠 편집 연결.
- `mode='page'` 와 `mode='modal'` 동작 모두 유지(모달의 직접 작성/운영자 콘텐츠/내 제작자료 소스 탭 포함).

## 5. 기존 lesson snapshot 보존 확인

- 본 작업은 frontend 표시·선택만 제거. DB entity/migration/`o4o_asset_snapshots` row/조회 API 미변경.
- 기존 lesson snapshot 데이터와 `store-assets?type=lesson` 조회 호환 경로는 백엔드에 유지(2단계는 신규 생성만 차단).

## 6. KPA 외 서비스 무변경 확인

- `git diff -- services/web-glycopharm services/web-k-cosmetics` (본 커밋 범위) 0건.
- 변경은 `services/web-kpa-society/src/pages/pharmacy/*` 3개 파일 + 본 CHECK 문서로 한정.

## 7. 타입체크 결과

- `pnpm exec tsc --noEmit -p services/web-kpa-society/tsconfig.json` — **PASS (0 errors)**.
- 정적 확인: selector 코드에 `LessonsSection`/`toLessonRow`/`LessonRow`/`type: 'lesson'` 잔존 0건(주석 제외). QR·POP·PDF 액션과 3개 모달 import 존재 확인.

## 8. 배포 커밋과 배포 상태

- 2단계(backend) commit `d2aaf6194` — **push 완료**(origin/main).
- 3단계(frontend) commit `f138b96b0` + CHECK `2f8f10cf6` — **push 완료**(origin/main). 병행 세션이 자신의 tablet 커밋을 push 할 때 본 ancestor 커밋이 함께 올라가 자연 해소(별도 강제 push 불필요). 확인: `git branch -r --contains` 으로 3개 모두 origin/main 확인.
- 배포: "Deploy Web Services (Cloud Run)" run `28280735029`(commit `aa1dda2ec`, 본 stage-3 커밋이 ancestor) **success** → KPA web 라이브 반영.
- Stage-2 와 Stage-3 는 별도 커밋으로 분리(합치지 않음). 본 smoke·stray-fix 는 stage-3 후속 커밋.

## 9. 운영 브라우저 smoke — **PASS** (2026-06-27, `renagang21` = kpa:store_owner, kpa-society.co.kr)

- `/store/library/contents`: **PASS** — `콘텐츠/강의` 상위 전환 미표시, 콘텐츠 목록(표) 즉시 표시, 강의 목록·강의 검색 미표시, 출처 필터(전체/운영자 제공/커뮤니티 가져옴/내가 만든 콘텐츠)·제목 검색·헤더(콘텐츠 제작/가이드/새로고침) 정상. 부제 강의 표현 제거 확인.
- 제작 자료 선택 모달(`/store/library/production-materials` → 새 제작 자료 만들기): **PASS** — 소스 탭 `콘텐츠`(이전 `콘텐츠·강의`)·운영자 콘텐츠·내 제작자료. `콘텐츠` 탭 내부에 `콘텐츠/강의` 하위 전환 없음, 콘텐츠 표 직접 표시, 강의 선택 경로 없음. `처음부터 만들기`/`빈 제작 자료 만들기` 유지.
- 회귀 `/lms`: **PASS** — 강의 5건 목록·수강하기/바로 보기 정상(LMS 무영향).
- 하단 QR·POP·인쇄용 PDF 액션: 선택 행이 있을 때만 노출되는 ActionBar 인데 테스트 매장(Sohae 약국 매장)에 콘텐츠 0건이라 행 선택 불가 → 화면 노출 미확인. 코드/정적 검증(§7)에서 액션·모달 존재 확인됨.
- smoke 중 발견한 stray: 제작 자료 페이지 부제 2곳의 `콘텐츠·강의` 표기 → `콘텐츠` 로 정정(§2 표 반영).

## 10. 완료 판정

**PASS (구현/타입체크/정적 검증/운영 브라우저 smoke).** 강의 선택 UI·소비 코드를 KPA 매장 콘텐츠 화면과 제작 자료 선택 모달에서 제거하고 콘텐츠 전용으로 정리했다. 콘텐츠 제작(QR/POP/PDF) 기능과 LMS 수강 기능은 그대로다. 기존 lesson snapshot 데이터는 보존되며 GP/KCos 무변경이다. 배포(run `28280735029`) 후 운영 화면 smoke 에서 콘텐츠 전용 표시·모달 정합·LMS 무영향을 확인했다.
