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

## 6. 배포 후 UI smoke — *pending*

```text
1. KPA operator 로그인 → /operator/multilingual-product-contents
2. 목록 "HUB 노출" 배지: 초안=그룹 초안 / 그룹만 발행=발행된 언어 없음 / 정상=HUB 노출 가능
3. 발행 언어 0개인 그룹 발행 시도 → 차단 toast 확인
4. 작성/수정 화면 상단 상태별 안내 배너 확인
5. 언어 탭 상태 텍스트(발행됨/초안/미작성) 확인
6. 버튼 문구 "임시 저장" / "저장 후 이 언어 발행" 확인
7. console error 0 / 관련 4xx·5xx 0
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
