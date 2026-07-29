# CHECK-O4O-KPA-SCREEN-SET-HUB-IMPORT-AND-PAGINATION-CLOSEOUT-V1

> **WO:** WO-O4O-KPA-SCREEN-SET-HUB-IMPORT-AND-PAGINATION-CLOSEOUT-V1
> **목적:** 서버 페이지네이션 적용 후 매장 HUB의 **실제 가져오기 동선**과 **중복·상태 계약**을 마감 검증한다.
> **선행:** WO-O4O-KPA-SCREEN-SET-HUB-SERVER-PAGINATION-V1 (commit 4ef0d2f80 · 배포·smoke 완료)
> **판정:** ✅ **CLOSED** — 계약 정합 확인, 최소 수정 1건(§11 재시도 버튼) 적용
> **일자:** 2026-07-29

---

## 1. 검증 범위

조회 → 검색·필터 → 페이지 이동 → 상세·미리보기 → 매장 가져오기 → 가져온 화면 확인의 전체 동선에서:

1. 페이지네이션이 가져오기 대상 유실을 유발하지 않는가
2. 가져오기 후 목록·상태가 정확히 갱신되는가
3. 중복 가져오기 정책이 명확하고 UI가 backend와 일치하는가
4. 운영자/공급자 탭이 동일 계약을 따르는가

**대상 코드:**
- Frontend: [HubScreenSetLibraryPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/HubScreenSetLibraryPage.tsx) · [storeScreenSetHub.ts](../../services/web-kpa-society/src/api/storeScreenSetHub.ts)
- Backend: [store-tablet.routes.ts](../../apps/api-server/src/routes/platform/store-tablet.routes.ts) `GET/POST /api/v1/store/screen-set-hub/*`

---

## 2. 가져오기 ID 계약 (§5) — 고정 원본 ID 사용, index/order/page 추론 금지

| 항목 | 결과 |
|------|------|
| Frontend `handleImport` | ✅ `detail.id`(상세 조회로 확정된 **원본 고정 UUID**) 사용 — 목록 index·page·order 무관 |
| 상세 진입 경로 | ✅ `openOperatorDetail(row)`/`openSupplierDetail(row)` → `getXTemplate(row.id)` → `openDetail({ id: full.id })` — 행 클릭 시점의 실제 ID로 재조회 |
| Backend 재검증 | ✅ 운영자: `req.params.id` + `OPERATOR_TEMPLATE_WHERE` 재조회, 없으면 404 `OPERATOR_TEMPLATE_NOT_FOUND` |
| | ✅ 공급자: `req.params.id` + storeType·hubTargetVisibleTo·의약품 게이트 재검사 후 복사 |

**결론:** 페이지 이동·정렬·검색 상태와 무관하게 **사용자가 연 그 원본**만 가져온다. 페이지네이션에 의한 대상 유실·오지정 없음.

---

## 3. 중복 가져오기 정책 (§6) — Policy B (반복 허용·매번 새 사본)

backend 계약을 조사한 결과 **Policy B**로 확정:

| 근거 | 내용 |
|------|------|
| 운영자 import 핸들러 | 주석 "반복 가져오기 허용 … 호출마다 새 사본" · 중복 체크/409 없음 · INSERT 후 **201** |
| 공급자 import 핸들러 | 주석 "반복 가져오기 허용 — 호출마다 새 사본" · 동일 |
| API 클라이언트 docstring | `importOperatorTemplate`/`importSupplierTemplate` 모두 "반복 가져오기 허용 — 호출마다 새 사본" |
| Frontend UI | ✅ Policy A(“이미 가져옴” disabled) 잔재 없음 — 반복 클릭 가능, 매 호출 새 사본 생성. **UI ↔ backend 일치** |

가져오기 전 패널이 "그 시점의 내용을 복사한 **매장 소유 독립 사본**이 만들어집니다"를 명시해 새 사본 semantics를 전달한다. UI·backend가 이미 Policy B로 정합하므로 **정책 신설·불일치 정정 없음**(§6 준수).

---

## 4. 독립 사본 계약 (§8)

| 불변식 | 결과 |
|--------|------|
| 새 ID | ✅ INSERT 시 신규 UUID |
| 매장 소유 | ✅ `organization_id = <store>`, `origin = 'store'`, `status = 'active'` |
| 원본 귀속 제거 | ✅ `supplier_id = NULL`, `tablet_id = NULL`, (공급자) `hub_target_store_type = NULL` |
| 원본 FK 없음 | ✅ 사본→원본 참조 컬럼 없음. block은 **값 복사** |
| 역전파 없음 | ✅ 공급자/운영자 원본 수정·게시취소해도 사본 불변 (FK·동기화 부재로 구조적 보장) |
| 출처 보존 | ✅ `store_asset_derivations`(recordDerivations, best-effort)로 provenance 기록 |

---

## 5. 가져오기 후 상태 갱신 (§7) — 원본은 HUB에 잔존

| 항목 | 결과 |
|------|------|
| 원본 소비 여부 | ✅ 가져오기는 **사본 생성**일 뿐 원본을 소비/이동하지 않음 → 목록에서 사라지지 않음 |
| 목록 refetch 필요성 | ✅ 원본 목록 불변이므로 강제 refetch 불필요(정상). page 보정 대상 없음 |
| 성공 상태 반영 | ✅ `imported` 상태 → 상세 패널에 "내 태블렛 콘텐츠에서 확인" 이동 CTA 노출 |
| page 유실 위험 | ✅ 없음(목록 항목 수 불변) |

---

## 6. 상세·미리보기 stale 방지 (§9)

| 항목 | 결과 |
|------|------|
| 상세 진입 시 초기화 | ✅ `openDetail`이 `screen=null`, `imported=null` 재설정 후 새 상세 세팅 |
| 상세 로드 실패 | ✅ toast + `detail=null` + `detailLoading=false` — 이전 상세 잔존 없음 |
| 패널 닫기 후 재진입 | ✅ 다음 `openDetail`이 `imported`/`screen` 초기화 → 이전 가져오기·미리보기 상태 미노출 |
| 탭 전환 | ✅ `switchSource`가 `detail/screen/imported=null`, `page=1`, `total=0` 리셋(§10) |

**stale 상세 0** 확인.

---

## 7. 탭 정합 (§10) — 운영자 ↔ 공급자

| 항목 | 결과 |
|------|------|
| 탭 전환 시 page | ✅ `setPage(1)` |
| 선택/상세 초기화 | ✅ `setDetail(null)`, `setScreen(null)`, `setImported(null)` — 교차 탭 상세 잔존 없음 |
| 검색/필터 유지 | 의도적 유지(q·templateFilter) — 동일 축의 재조회로 자연스러움, 각 탭 로드가 page=1로 재조회 |
| 계약 일치 | ✅ 두 탭 모두 page/limit/total/totalPages · 고정 ID import · Policy B · 독립 사본 동일 계약 |

---

## 8. 오류 계약 (§11) — 상태 구분 + 재시도

| 상태 | 처리 | 결과 |
|------|------|------|
| 정상 0건 | DataTable `emptyMessage` | ✅ 성공·빈 목록으로 표기(오류 아님) |
| **목록 조회 실패** | 오류 배너 + **"다시 시도"** 버튼(`loadData` 재호출) | ✅ **본 WO에서 추가** — 이전엔 배너만 있고 재시도 없었음 |
| 상세 실패 | toast + detail 미표시 | ✅ 0건/성공으로 위장 안 함 |
| 가져오기 실패 | toast, `MEDICATION_PHARMACY_ONLY`는 전용 메시지 | ✅ 구분 |
| 중복 | Policy B이므로 오류 아님(정상 새 사본) | ✅ 해당 없음 |
| 권한 없음 | 403 `STORE_TYPE_NOT_ELIGIBLE`/`MEDICATION_PHARMACY_ONLY` | ✅ backend 차단 + 프론트 메시지 |
| 게시취소·비활성 원본 | 404 `*_NOT_FOUND` → 상세/가져오기 실패 메시지 | ✅ 성공 위장 없음 |

**적용 최소 수정:** 목록 조회 실패 배너에 `다시 시도` 버튼 추가 — load-error 계약(4상태 + 재시도) 완성. 오류를 성공/0건으로 위장하지 않음.

```tsx
{error && (
  <div className="mb-3 flex items-center justify-between gap-3 ...">
    <span className="min-w-0">{error}</span>
    <button onClick={() => void loadData()} disabled={isLoading} ...>다시 시도</button>
  </div>
)}
```

---

## 9. 검증 방식 (§12) — 운영 write 0 유지

- 프로덕션에 게시된 screen set **0건**(선행 WO smoke에서 `total:0` 확인). 승인된 테스트용 비활성 원본이 없으므로 **운영 데이터 mutation 미수행**.
- 계약 검증은 **코드 경로 정적 분석 + 선행 WO의 프로덕션 API·브라우저 DOM smoke**로 수행. import/detail 실데이터 브라우저 smoke는 원본 21건+ 존재 시점까지 유보(운영 write 0 원칙 준수).
- 본 WO의 프론트 변경(재시도 버튼)은 typecheck·build로 회귀 검증.

---

## 10. 제외 확인 (§14)

신규 screen-set 저작 ✅없음 / 편집기 재설계 ✅없음 / 게시 정책 변경 ✅없음 / 동기화 ✅없음 / 신규 테이블·migration ✅없음 / 공통 패키지 변경 ✅없음 / 의약품 정책 변경 ✅없음.

변경 파일: `HubScreenSetLibraryPage.tsx` 1개(프론트 오류 UX만).

---

## 11. 빌드·타입 (§15)

| 검증 | 결과 |
|------|------|
| `tsc --noEmit` (@o4o/web-kpa-society) | ✅ PASS (no output) |
| `pnpm --filter @o4o/web-kpa-society build` | ✅ `✓ built in 17.34s` |

---

## 12. 반응형 (§13)

정적 검증: 오류 배너는 `flex items-center justify-between gap-3` + 메시지 `min-w-0`(축소 허용) + 버튼 `shrink-0` — 좁은 폭(390px)에서도 버튼 유지·메시지 말줄임 가능. 기존 Pagination/DataTable 레이아웃은 선행 WO에서 검증 완료.

---

## 13. 완료 기준 (§18)

- [x] 중복 정책 UI·backend 일치 (Policy B — 반복 허용·새 사본, 양측 정합)
- [x] 가져오기 후 목록·상태 갱신 (원본 HUB 잔존 → refetch 불요, imported 상태 반영)
- [x] 원본·매장 사본 독립성 유지 (새 ID·매장 소유·FK 없음·값 복사·역전파 없음)
- [x] stale 상세 0 (openDetail/스위치 초기화)
- [x] 조회 실패·가져오기 실패·0건 구분 (+ 재시도 버튼 추가)
- [x] typecheck·build PASS
- [x] 운영 데이터 write 0

---

*Status: CLOSED · 2026-07-29*
