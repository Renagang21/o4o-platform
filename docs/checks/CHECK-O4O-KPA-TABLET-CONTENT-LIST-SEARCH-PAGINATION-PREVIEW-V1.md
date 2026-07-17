# CHECK-O4O-KPA-TABLET-CONTENT-LIST-SEARCH-PAGINATION-PREVIEW-V1

> WO: `WO-O4O-KPA-TABLET-CONTENT-LIST-SEARCH-PAGINATION-PREVIEW-V1`
> 성격: 프론트 — 태블릿 콘텐츠 리스트 탐색(필터/페이지네이션) + 행 미리보기.
> Date: 2026-07-16

---

## 0. 결론

**PASS.** 태블릿 콘텐츠 리스트(`TabletContentLibraryList`)에 **템플릿·사용코너 필터 + 페이지당 표시 수 + 요약 문구**를 추가하고, **행 단위 미리보기 모달**(태블릿/QR 모바일)을 붙였다. **API·DB 무변경**(client-side 필터 + 기존 previewScreenSet 재사용).

## 1. 변경

| 파일 | 변경 |
|------|------|
| `TabletContentLibraryList.tsx` | 템플릿/코너 필터, pageSize(10/20/50), 요약 문구, 행 미리보기 모달, onRowClick→미리보기, kebab 'preview' 추가 |
| `TabletScreenSetManager.tsx` | 리스트에 `previewApi`/`storeSlug` 전달 |

## 2. 기능

### 필터 (기존 검색·상태 + 신규)
- **템플릿 필터**: 목록의 templateKey 에서 도출, `templateLabel` 로 표기(내부 key 미노출).
- **사용 코너 필터**: `usageBySet` 에서 코너명 도출 + `미사용` 옵션.
- 검색·상태·템플릿·코너·페이지크기 변경 시 **1페이지로 이동** + 선택 해제.

### 페이지네이션
- 페이지당 표시 수 **10/20/50** 선택(기본 20).
- 요약: `총 N건 · P / T 페이지 · 페이지당 L개`.
- 필터로 페이지가 범위를 넘으면 clamp.

### 미리보기 (별도 페이지 이동 없음)
- kebab **미리보기** + **콘텐츠명(행) 클릭** → 동일 모달.
- 모달 상단 `[태블릿 화면] [QR 모바일 화면]` 전환.
- 렌더 = 기존 `fetchScreenSet`(저장 원본) → `previewScreenSet`(draft resolve) → `TabletKioskPage embedded` **재사용**(신규 sanitizer/렌더러 없음).
- `previewApi`/`storeSlug` 미주입 시 비활성(toast 안내).

## 3. 실패 기준 대비 (배포본 실측)

| 실패 기준 | 결과 |
|-----------|:----:|
| 검색 결과가 전체와 동일 | ✅ 템플릿 필터(제품진열형) **10→2** 축소 확인 |
| 페이지 이동 없음 | ✅ Pagination + pageSize |
| 페이지당 수 알 수 없음 | ✅ `페이지당 20개` 표시 + 선택 |
| 미리보기에 편집 화면 진입 필요 | ✅ 행/kebab 클릭 → 모달(편집 불필요) |
| 미리보기에 템플릿 디자인 안 보임 | ✅ 실제 렌더(TabletKioskPage) |
| QR 모바일 확인 불가 | ✅ 모달 태블릿/QR 전환 |

## 4. 검증

| 항목 | 결과 |
|------|------|
| 템플릿/코너/페이지당 셀렉트 존재 | ✅ 각 1 |
| 템플릿 필터 동작 | ✅ 10→2 |
| 행 클릭 미리보기 모달 + 전환 | ✅ modal=1, 태블릿/QR toggle |
| 모달 닫은 뒤 검색/페이지 상태 유지 | ✅ 검색창 유지 |
| 요약 문구 | ✅ `총 10건 · 1/1 페이지 · 페이지당 20개`(스크린샷) |
| console/pageerror/API 오류 | ✅ 0 |
| tsc / vite build | ✅ EXIT=0 |
| API·DB 변경 | 없음 |

## 5. 유지

기존 만들기 · 수정 · 리스트에서 제거(구 보관) · 일괄 선택 · 코너 연결 상태 컬럼 · API·DB 계약 유지.

> 미리보기 모달의 상품 표시는 preview 리졸버 한계로 실제와 다를 수 있음(기존 preview 동작).

---

*콘텐츠 리스트 = 검색+템플릿/코너/상태 필터+페이지크기(10/20/50)+요약. 행/콘텐츠명 클릭·kebab '미리보기' → read-only 모달(태블릿/QR, previewScreenSet+TabletKioskPage 재사용). API·DB 무변경. 실측 필터 10→2·모달·상태유지·오류0.*
