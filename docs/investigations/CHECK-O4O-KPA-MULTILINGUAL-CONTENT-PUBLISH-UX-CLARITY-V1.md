# CHECK — KPA 다국어 상품 콘텐츠 저장/발행 UX Clarity V1

**WO:** `WO-O4O-KPA-MULTILINGUAL-CONTENT-PUBLISH-UX-CLARITY-V1`
**일자:** 2026-06-23
**성격:** KPA frontend-only UX 보정 — "저장"과 "HUB 노출/발행"의 차이를 운영자가 화면에서 이해하게 만듦. **published-only 정책·backend·DB 무변경.**
**상위 조사:** 운영자 작성 콘텐츠가 Store Hub 에 미노출되는 혼선 (DATA_STATE + UX_CLARITY). 원인 메커니즘 — hub 조회는 `group.status='published'` AND `page.status='published'` 1개 이상을 요구하나, 운영자는 "저장=완료"로 인지.
**검증:** web-kpa-society `tsc --noEmit` 에러 0.

---

## 1. 배경 / 확정된 원인

Store Hub 노출 조건(불변):

```text
1. group.status = 'published'
2. status='published' 인 언어 page 1개 이상
```

- hub 쿼리: `multilingual-product-content.controller.ts` — 그룹 `WHERE ... status='published'`, 페이지 `WHERE ... status='published'`.
- 운영자 저장 경로: 그룹 생성 시 서버가 **항상 `draft`** 강제 (`operator-multilingual-content.controller.ts`). 그룹 발행은 목록의 별도 버튼(PATCH `/groups/:id/publish`), 언어 페이지도 "저장 후 발행" 별도.
- → 운영자가 저장만 하고 그룹/페이지를 발행하지 않으면 hub WHERE 절에서 제외 → "저장했는데 왜 안 보이지?" 혼선.

**판정:** API_FILTER 아님(의도된 published-only). DATA_STATE(발행 안 됨) + UX_CLARITY(설명 부족). → 정책 유지, 화면 설명력만 보강.

## 2. 변경 파일 (KPA frontend 2파일)

| 파일 | 변경 |
|---|---|
| `OperatorMultilingualContentListPage.tsx` | (4.1) **HUB 노출 상태 컬럼·배지** 추가 — `hubVisibility(g)` 4상태 판정. (4.5) **발행 가드** — 발행된 언어 0개면 그룹 발행 차단 + toast 안내 (frontend only). |
| `OperatorMultilingualContentWritePage.tsx` | (4.2) 상단 **HUB 노출 안내 배너**(상태별 문구). (4.3) **언어 탭 상태 텍스트**(발행됨/초안/미작성). (4.4) 버튼 문구 — "저장"→"임시 저장", "저장 후 발행"→"저장 후 이 언어 발행". |

## 3. HUB 노출 상태 판정 (목록·배너 공통)

```text
archived                                          → 보관됨        (gray)
group.status !== 'published'                      → 그룹 초안     (gray)
group.status === 'published' && published 언어 0  → 발행된 언어 없음 (orange)
group.status === 'published' && published 언어 ≥1 → HUB 노출 가능  (green)
```

## 4. 보존 경계 (무변경)

```text
Store Hub published-only 노출 정책            — 불변
backend API / controller / route             — 무변경
DB / schema / migration                      — 0
매장 가져오기(import) flow                    — 무변경
GP / KCos / Neture / 태블릿 / 결제 / 관광객앱 — 미접촉
발행 가드는 frontend 안내/차단만 (backend contract 무변경)
```

## 5. 검증

- `web-kpa-society` `npx tsc --noEmit` → **에러 0**. (`tsc -b`는 이 서비스의 tsconfig.node.json emit 설정 충돌로 부적합 — direct-include 패턴이라 `tsc --noEmit`이 정답.)
- 변경 = web 2파일 + 본 CHECK. pnpm-lock.yaml·다른 세션 WIP 미접촉, 명시적 pathspec 커밋.
- UI smoke(배포 후): §6.

## 6. 배포 후 UI smoke — **PASS** (2026-06-23, Playwright)

- 배포: Deploy Web Services (Cloud Run) `73e01a368` **success**.
- KPA 운영자 로그인 → `/admin/kpa-dashboard` 랜딩(멀티롤) → operator route hard-nav.
- **목록** `/operator/multilingual-product-contents`: "HUB 노출" 컬럼 렌더 ✅. 라이브 배지 `그룹 초안`·`보관됨` 관측(현재 5행 한정 — `HUB 노출 가능`/`발행된 언어 없음`은 해당 데이터 없어 미관측이나 코드 경로 동일). 첫 행 `test`(영어 page 발행 + 그룹 draft) → **`그룹 초안`** 올바른 우선 판정.
- **발행 가드**: 발행된 언어 0개(그룹 초안) 행에서 발행 클릭 → toast **"발행된 언어 페이지가 없습니다 …"** 확인, backend 미호출(무변경) ✅.
- **작성/수정**: 상단 안내 배너(상태별 문구 + 조건 설명) ✅ / 언어 탭 상태 텍스트 `발행됨`·`미작성` ✅ / 버튼 `임시 저장`·`저장 후 이 언어 발행` ✅ / `초안으로 내리기` 유지.
- console error: footer 법령문서(terms/privacy) 404 4건 — **pre-existing/무관**(api.neture.co.kr legal docs 미시드, 본 WO와 무관). MLC API 4xx/5xx 0. pageError 0.
- 회귀: 목록 로드·작성 화면 진입·언어 page 발행 상태 표시 정상. published-only 노출 정책 불변.

## 7-A. 판정

```text
WO-O4O-KPA-MULTILINGUAL-CONTENT-PUBLISH-UX-CLARITY-V1 → CLOSED / PASS
```

## 7. 완료 기준 대비

| 기준 | 결과 |
|---|---|
| 저장/발행 차이를 화면에서 이해 | ✅ (배너 + 버튼 문구) |
| Store Hub 미노출 원인을 목록에서 확인 | ✅ (HUB 노출 배지) |
| 발행된 언어 없음 명확 표시 | ✅ (배지 + 배너 + 가드) |
| HUB 노출 가능 상태 명확 표시 | ✅ |
| published-only 정책 불변 | ✅ |
| backend/API/DB 무변경, KPA frontend만 | ✅ |

---

*Date: 2026-06-23 · CHECK · KPA frontend-only · 저장/발행 UX clarity · published-only 정책 불변 · backend/DB 0 · web tsc 에러 0.*
