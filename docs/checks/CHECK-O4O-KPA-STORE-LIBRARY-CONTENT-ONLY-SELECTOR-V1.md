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
- 3단계(frontend) commit `f138b96b0` — **로컬 커밋, push 보류**.
  - 사유: 동일 로컬 main 에 병행 세션의 미push 커밋(tablet display WO P1-2/P3)이 선행 ancestor 로 존재. 본 stage-3 push 시 해당 세션의 진행 중 커밋이 함께 publish 되므로, 사용자 결정에 따라 보류. 병행 세션이 자신의 커밋을 push 한 뒤 본 커밋만 별도 push 예정.
- Stage-2 와 Stage-3 는 별도 커밋으로 분리(합치지 않음).

## 9. 운영 브라우저 smoke

- **미수행(배포 전)** — push 보류로 KPA web 미배포. 배포 후 다음을 확인 예정:
  - `/store/library/contents`: `콘텐츠/강의` 전환 미표시, 콘텐츠 목록 즉시 표시, 강의 목록·검색 미표시, 콘텐츠 검색·출처 필터 정상, 하단 QR·POP·PDF 표시, 편집·삭제 정상.
  - 제작 자료 생성/선택 모달: `콘텐츠/강의` 미표시, 콘텐츠 목록 즉시 표시, 선택 완료·제작 시작 정상, 강의 선택 경로 없음.
  - 회귀: `/lms` 강의 목록·수강 정상, 콘솔 오류 없음.

## 10. 완료 판정

**PASS (구현/타입체크/정적 검증).** 강의 선택 UI·소비 코드를 KPA 매장 콘텐츠 화면과 제작 자료 선택 모달에서 제거하고 콘텐츠 전용으로 정리했다. 콘텐츠 제작(QR/POP/PDF) 기능과 LMS 수강 기능은 그대로다. 기존 lesson snapshot 데이터는 보존되며 GP/KCos 무변경이다. 운영 브라우저 smoke 는 push·배포 후 수행한다.
