# CHECK-O4O-KPA-STORE-HUB-CONTENT-SOURCE-ALIGNMENT-V1

> WO-O4O-KPA-STORE-HUB-CONTENT-SOURCE-ALIGNMENT-V1 (C안 — 병합 조회) 실행 결과
> 실행일: 2026-06-25 · 대상: 프로덕션 `https://kpa-society.co.kr` (API `o4o-core-api`)
> 검증 방식: Playwright(chromium) 실제 브라우저 + 운영자/매장 토큰 API 직접 호출(seed/정리)
> 구현 커밋: `d9c25f216` (frontend, KPA 전용) — 배포 완료(Web Cloud Run, 10:17 KST)

## 목적

KPA `/store-hub/content`(`HubContentLibraryPage`)가 기존 `cms_contents(published)` 에 더해 **운영자 콘텐츠 허브 `kpa_contents(status='ready')`** 를 함께 노출하고, "가져오기=복사" 흐름으로 내 약국에 사본을 만들 수 있는지 검증.

## 구현 위치 결정 (정정)

| 계획(초안) | 실제(확정) | 이유 |
|---|---|---|
| 백엔드 controller/service에서 병합·정규화 | **KPA 프론트 `useKpaContentHubConfig` 클라이언트 병합** | 목록 조회가 공유 `GET /api/v1/cms/contents`(=cms-core, **CLAUDE.md §3 동결**)라 백엔드 병합 시 동결 위반 + GP/KCos 전파 |
| import/copy API에 kpa_content 분기 추가 | **신규 백엔드 분기 불필요** | asset-snapshot copy가 이미 `assetType:'content'`로 kpa_contents Full Copy 지원(`KpaAssetResolver`, WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1). 프론트에서 출처별 assetType만 분기 |

→ 순수 프론트(KPA 전용) 변경. 백엔드/DB/마이그레이션 0. GP/KCos 무영향.

## 결과 요약

| # | 판정 기준 | 결과 | 근거 |
|---|------|:---:|------|
| 1 | 배포 확인 | ✅ | Web 리비전이 `d9c25f216` 포함(10:17 KST). 페이지에 WO 전용 emptyMessage 라이브 노출 |
| 2 | 타입체크 | ✅ | `web-kpa-society` tsc 클린(커밋 코드, CI 배포 성공) |
| 3 | 병합 조회 (cms published + kpa_contents ready) | ✅ PASS | seed한 운영자 ready 콘텐츠가 목록에 **"콘텐츠 허브" 배지**로 노출. API 확인: cms published total=1(단, 1건은 hero/welcome → `hero/featured` 제외 필터로 정상 제외), kpa ready seed 후 노출 |
| 4 | draft 비노출 | ✅ PASS | `listContentHubItems({status:'ready'})` 만 조회 — draft/비-ready 미노출 |
| 5 | 가져오기=복사 (출처별 분기) | ✅ PASS | "내 약국에 복사" → toast 성공 → 상태 "복사됨". kpa_content는 `assetSnapshotApi.copy(assetType='content')` 분기로 o4o_asset_snapshots에 사본 생성(API로 sourceAssetId 매칭 사본 1건 확인) |
| 6 | 기존 CMS 콘텐츠 유지 | ✅ | cms published 경로/copy(assetType='cms') 무변경. hero/featured 제외 로직 보존 |
| 7 | GP/KCos 무영향 | ✅ | 변경은 KPA `HubContentLibraryPage`/config 한정. 공통 `ContentHubItem` 타입 미변경(출처는 KPA-local `sourceDomainRef` Map) |
| 8 | 테스트 데이터 정리 | ✅ | 사본(snapshot) 삭제 + seed kpa_content soft-delete(ready total 0 복귀) |

### 실측 흐름

1. 운영자(`kpa:admin`) 로그인 → `POST /api/v1/kpa/contents` (status 미지정 → 기본 `ready`, WO-O4O-CONTENT-SAVE-MEANS-READY 표준)로 "스모크 운영자콘텐츠 0625" 생성(id `98a9b8e3…`).
2. 매장 경영자(체험 계정) 로그인 → `/store-hub/content` → 목록에 **콘텐츠 허브 / 스모크 운영자콘텐츠 0625 / 신규 / 미복사 / 내 약국에 복사** 행 노출(총 1건).
3. "내 약국에 복사" 클릭 → "…내 약국에 복사되었습니다" toast → 상태 "복사됨" + "작업하러 가기 →". 사본은 `assetType='content'`, `sourceAssetId=98a9b8e3…` 로 생성 확인.
4. 정리: 사본 DELETE 200 + 운영자 콘텐츠 soft-delete → ready total 0.

## 페이지네이션 정책 (V1 명시)

`filter='all'` 에서 두 소스를 각각 최대 `MERGE_CAP(100)` 조회 후 작성일 DESC 로 **클라이언트 병합·정렬·슬라이스**. `total = cms + kpa(필터 제외분 보정)`. 콘텐츠 수가 적은 단계 정책 — 양쪽 합이 MERGE_CAP을 초과하면 경계가 부정확해질 수 있으며, 그 단계에서는 서버측 통합 피드로 승격 필요(후속 후보). 특정 CMS type 필터(공지/가이드 등)는 cms taxonomy 전용이라 기존 CMS-only 동작 유지.

## 결론

**WO 전 판정 기준 PASS.** cms_contents(published) + kpa_contents(ready) 병합 노출 + 출처별 복사(cms/content) 분기가 실사용 흐름으로 검증됨. cms-core 동결 준수 + GP/KCos 무영향 + DB/백엔드 신규 0. 구현은 동시 세션이 `d9c25f216`로 커밋·배포했고, 본 CHECK는 운영 브라우저 e2e 검증을 추가한다.

### 후속 후보
- MERGE_CAP 초과 단계 진입 시 서버측 통합 페이지네이션(예: `/store-library/contents` 패턴) 승격.
- GP/KCos 동일 정합은 별도 IR/WO(현재 GP/KCos는 공통 `StoreProductionMaterialsView`/CMS-only 경로).

---

## Update — WO-O4O-KPA-STORE-HUB-CONTENT-SOURCE-TABS-V1 (병합 → 소스 탭 분리)

> 구현 커밋: `8538ee754` (frontend + 공통 ContentHubTemplate opt-in) — 배포 완료
> 검증: Playwright 실제 브라우저(운영자/매장 동일 계정), 2026-06-25

### 변경 이유

병합(C안)은 두 소스를 한 목록에 섞어 정렬/페이지네이션 경계가 모호(MERGE_CAP 한계)했다. 후속으로 **소스 탭 분리**로 전환 — 콘텐츠 허브(kpa_contents ready) / 운영 자료(cms published)를 탭으로 구분, 탭별 단일 소스 조회(병합/정렬/중복제거 불필요), '전체' 탭 없음, 기본 탭=콘텐츠 허브. 검색은 현재 탭 안에서만.

### 변경 내역

| 파일 | 변경 |
|---|---|
| `packages/shared-space-ui/src/ContentHubTemplate.tsx` | opt-in `filtersAsSourceTabs` + `filterEmptyMessages` 추가. 탭 모드에서 탭 전환을 '필터'로 취급하지 않음(chip/초기화 행 숨김, "총 N개" 표기, 탭별 빈 상태). 미지정 시 기존 동작 환원 |
| `services/web-kpa-society/.../HubContentLibraryPage.tsx` | filters=[콘텐츠 허브, 운영 자료], filtersAsSourceTabs=true, 탭별 단일 소스 fetch, filterEmptyMessages. 가져오기=복사 + 출처별 assetType 분기(cms/content) 유지 |

→ 공통 템플릿 변경은 **순수 additive·opt-in**. GP/KCos/Neture는 `filtersAsSourceTabs` 미지정 → 기존 동작 그대로(typecheck: kpa·glycopharm 클린).

### 소스 탭 버전 운영 브라우저 smoke (배포본 `8538ee754`)

| 기준 | 결과 |
|---|---|
| 소스 탭 2개(콘텐츠 허브 / 운영 자료) 노출, 기본=콘텐츠 허브 | ✅ |
| 9.2 콘텐츠 허브 탭 = kpa_contents ready 노출('콘텐츠 허브' 배지) | ✅ ("총 2개", ready 콘텐츠 2건) |
| 9.3 draft 비노출 | ✅ (ready만, 원본 draft 6건 미노출) |
| 9.1 운영 자료 탭 = cms published | ✅ ("총 0개" — cms published=0, 경로 유지) |
| 탭별 빈 상태 문구 | ✅ 운영 자료 탭 "현재 제공되는 운영 자료가 없습니다…" |
| 9.4 가져오기=복사(복사 상태 표시) | ✅ 복사됨/미복사 정확(loadCopiedIds=cms+content 병합). 복사 e2e는 병합 smoke에서 실증(onCopy 동일) |
| 9.5 사본이 내 약국 콘텐츠 자료함 → 제작자료/QR 재사용 | ✅ origin=snapshot, '커뮤니티(콘텐츠 허브)' 표기 |
| 테스트 데이터 정리 | ✅ 사본 + ready 콘텐츠 2건 삭제, 원본 draft 6건 보존 |

### 결론(업데이트)

소스 탭 분리 버전이 배포·검증됨. "저장한 운영자 콘텐츠가 매장 허브에 보이고 가져와 사본으로 사용" + "기존 CMS 게시 콘텐츠 유지(운영 자료 탭)"를 충족하며, 공통 템플릿 opt-in 변경으로 GP/KCos/Neture 무영향.
