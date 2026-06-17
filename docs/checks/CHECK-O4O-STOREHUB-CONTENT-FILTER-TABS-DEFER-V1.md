# CHECK-O4O-STOREHUB-CONTENT-FILTER-TABS-DEFER-V1

> **작업명:** WO-O4O-STOREHUB-CONTENT-FILTER-TABS-DEFER-V1
> **유형:** frontend-only IA 단순화 — 3서비스 `/store-hub/content` 의 CMS type 필터 탭 보류. backend/DB/route/API **변경 0**.
> **결과: PASS — shared `ContentHubTemplate` 에 `showTypeFilters` 플래그(기본 true, backward-compatible) 추가 + 3서비스 config 에서 `showTypeFilters: false`. filters 배열은 보존(재도입 여지). 검색+전체 목록 중심으로 단순화. 4서비스 typecheck 0.**
> 선행: IR-O4O-STORE-CONTENT-SURFACE-AUDIT-V1 — 2026-06-17

---

## 1. 작업 목적

KPA Society / GlycoPharm / K-Cosmetics 3서비스 `/store-hub/content` 의 CMS type 필터 탭(전체/공지/가이드/지식/프로모션/뉴스)을 보류한다. 콘텐츠 수가 적은 현 단계에서 6개 탭은 대부분 비어 보여 "자료 부족" 인상을 준다. 매장 사용자 관점의 자료실은 **검색 + 전체 목록 중심**이 더 적합하다.

"필터 기능 삭제"가 아니라 **상단 탭 탐색 UI 보류**다. CMS type enum / backend query param / 데이터 type 값은 무변경.

## 2. 변경 전/후 UI 구조

| | 변경 전 | 변경 후 |
|---|---|---|
| Hero(제목/설명) | 유지 | 유지 (서비스별 약국/매장 문맥 유지) |
| 검색창 | 표시 | 표시 (무변경) |
| **CMS type 탭** | **전체/공지/가이드/지식/프로모션/뉴스 6탭** | **미표시** |
| 총 콘텐츠 수 | 표시 | 표시 (무변경) |
| 카드 type 배지 | 표시 | 표시 (무변경) |
| 기본 fetch | `activeFilter='all'` 전체 | `activeFilter='all'` 전체 (동일) |
| 활성 필터 칩(active row) | 필터 선택/검색 시 표시 | 탭 없어 필터 변경 불가 → **검색어 칩만** 표시 |

## 3. 변경 파일 (4 + CHECK)

| 파일 | 변경 |
|------|------|
| `packages/shared-space-ui/src/ContentHubTemplate.tsx` | `ContentHubConfig` 에 `showTypeFilters?: boolean`(기본 true) 추가. 필터 탭 렌더 가드를 `config.showTypeFilters !== false && config.filters && config.filters.length > 1` 로 변경 |
| `services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx` | config 에 `showTypeFilters: false` 추가. filters 배열 보존 |
| `services/web-glycopharm/src/pages/hub/HubContentListPage.tsx` | config 에 `showTypeFilters: false` 추가. filters 배열 보존 |
| `services/web-k-cosmetics/src/pages/hub/HubContentPage.tsx` | config 에 `showTypeFilters: false` 추가. filters 배열 보존 |
| `docs/checks/CHECK-O4O-STOREHUB-CONTENT-FILTER-TABS-DEFER-V1.md` | 본 CHECK |

## 4. shared template 변경 여부 및 3서비스 영향 범위

- **shared `ContentHubTemplate` 변경 O** — 단, 추가는 **순수 가산·backward-compatible**. `showTypeFilters` 미지정 시 `!== false` 가 true → 기존 동작(탭 표시) 그대로.
- **소비처 전수(코드 5개) 확인:**
  - 대상 3개: `/store-hub/content` (KPA/GP/KCos) → `showTypeFilters: false` 적용
  - 비대상 2개: `web-k-cosmetics/.../library/ContentLibraryPage.tsx`, `web-neture/.../library/ContentLibraryPage.tsx` (`/store/library` 계열) → 플래그 미지정 → **탭 그대로 표시, 무회귀**
- CLAUDE.md §1 Shared Module Change Rule 준수: 모든 소비처 식별 후 영향 확인. 임시 서비스별 예외 아님(공통 플래그 도입).

## 5. 유지한 항목

- 검색창 / 검색 동작 (전체 CMS 콘텐츠 기준 검색)
- 기본 fetch = 전체 목록 (`activeFilter='all'`, type param 없음 → 기존 `전체` 탭과 동일 결과)
- 총 콘텐츠 수 표기 / 페이지네이션 (`pageLimit`)
- 카드 type 배지 (콘텐츠 성격 보조 정보)
- 복사/가져오기 흐름 및 서비스별 문구 (KPA·GP=`내 약국`, KCos=`내 매장`)
- 서비스별 Hero 문맥 (약국/매장 용어)

## 6. 변경하지 않은 항목 (명시적 비대상)

backend / DB migration / schema / CMS type enum / 데이터 type 값 / `/api/v1/hub/contents` / asset copy·import 로직 / `o4o_asset_snapshots` / POP·QR·블로그·사이니지 형제 페이지 / store-hub 부모 네비게이션 / 카드 디자인 / package.json·lockfile / route / guard **변경 0**.

## 7. 검증 결과 (typecheck)

| 서비스 | 결과 |
|--------|------|
| web-kpa-society | `tsc --noEmit` EXIT 0 |
| web-glycopharm | `tsc -b --noEmit` EXIT 0 |
| web-k-cosmetics | `tsc --noEmit` EXIT 0 |
| web-neture (비대상 소비처 무회귀) | `tsc --noEmit` EXIT 0 |

## 8. browser smoke 수행 여부

- **미수행** — 배포 후 권장. 체크리스트:
  - KPA/GP/KCos `/store-hub/content`: 제목·검색창 표시 / **CMS 필터 탭 미표시** / 총 콘텐츠 수 표시 / 카드 목록(전체) 표시 / 카드 type 배지 표시 / 복사 버튼 문구(KPA·GP `내 약국`, KCos `내 매장`) / console error 0
  - 검색 입력 시 전체 CMS 콘텐츠 내 검색 동작
  - 무영향: `/store-hub/{blog,pop,qr,signage}`, `/store/library/contents`, `/store/content`, `/store/library/contents`(neture·kcos library 탭 그대로)

## 9. 후속 재도입 조건

CMS type 필터 탭은 다음 중 하나 충족 시 재도입 검토 — **각 서비스 config 의 `showTypeFilters` 를 true(또는 제거)** 하면 즉시 복원(filters 배열 보존됨):

- CMS 콘텐츠 수가 충분히 많아져 전체 목록 탐색이 불편
- 운영자가 type 별 노출을 명확히 관리해야 할 때
- 매장 사용자가 공지/가이드/뉴스 구분 탐색을 요구
- 검색만으로 탐색이 어렵다는 피드백

재도입 형태 후보: 상단 탭 / 드롭다운 / 검색 우측 보조 필터 / 모바일 접힘 / 카드 배지 클릭 필터.

## 10. 완료 판정

**PASS.** 3서비스 `/store-hub/content` CMS type 탭 미표시, 검색+전체 목록 유지, filters 배열·복사·배지·형제 페이지·backend/DB/route/package 무변경, 비대상 library 2개 무회귀, 4서비스 typecheck 0.

---

*Date: 2026-06-17 · storehub content CMS type 탭 보류 · PASS · ContentHubTemplate showTypeFilters 플래그(가산·backward-compatible) + 3서비스 config showTypeFilters:false(filters 보존) · 검색+전체 목록 중심 · backend/DB/route 무변경, library 2개 무회귀 · typecheck 0 · 재도입=showTypeFilters true.*
