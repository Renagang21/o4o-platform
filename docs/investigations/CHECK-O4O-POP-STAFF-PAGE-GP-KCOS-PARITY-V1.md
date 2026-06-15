# CHECK-O4O-POP-STAFF-PAGE-GP-KCOS-PARITY-V1

> **작업명:** WO-O4O-POP-STAFF-PAGE-GP-KCOS-PARITY-V1
> **유형:** GP/KCos parity — 가져온 POP 사본(`store_pops` author_role='store') 목록/수정/삭제 화면 추가. backend/DB/route(backend) **무변경**.
> **결과: PASS — GP/KCos 에 KPA `PharmacyPopPage` 기준 `StorePopStaffPage`(목록/수정/삭제/일괄삭제) 추가 + popStaff client staff 함수 3종 추가 + route(`/store/marketing/pop/library`) + HUB import 페이지에서 진입 링크. import dead-end 해소. typecheck(GP/KCos) 0. KPA 무변경.**
> 선행: `IR-O4O-POP-IMPORT-TO-BUILDER-LINK-AUDIT-V1`(parity gap) — 2026-06-15

---

## 1. 배경

선행 IR: GP/KCos 는 운영자 POP 을 가져오면 `store_pops`(author_role='store') 사본은 생기나 **목록/수정 UI 부재**(KPA 만 `PharmacyPopPage` 보유, GP/KCos popStaff 는 `importOperatorPop` 만) → import dead-end. 본 WO 가 KPA parity.

## 2. backend 확인 (변경 없음)

`GET/PUT/DELETE /{svc}/stores/:slug/pop/staff(/:id)` (createStorePopStaffController) — **GP/KCos 이미 마운트**(glycopharm.routes:466 · cosmetics:206), 응답 shape KPA 동일(공통 컨트롤러). → frontend client + page 만 추가.

## 3. 변경 (8 파일)

| 파일 | 변경 |
|------|------|
| `web-glycopharm/src/api/popStaff.ts` | `StaffPopPost` + `fetchStaffPopPosts`/`updateStaffPopPost`/`deleteStaffPopPost` 추가(KPA mirror, authFetch+getApiBase('glycopharm')). `importOperatorPop` 유지 |
| `web-k-cosmetics/src/api/popStaff.ts` | 동(`cosmetics`) |
| `web-glycopharm/.../store-management/StorePopStaffPage.tsx` | **신규** — KPA PharmacyPopPage 포팅(list/editor mode, DataTable+rowSelection, ActionBar 일괄삭제, RichTextEditor 수정, status filter, pagination, empty/error). 용어 "내 약국" |
| `web-k-cosmetics/.../store/StorePopStaffPage.tsx` | **신규** — 동. 용어 "내 매장" |
| `web-glycopharm/src/App.tsx` | lazy import + `<Route path="marketing/pop/library">` |
| `web-k-cosmetics/src/App.tsx` | 동 |
| `web-glycopharm/.../hub/HubPopLibraryPage.tsx` | 헤더에 "내 약국 POP 사본 관리 →"(`/store/marketing/pop/library`) 링크 — 도달 진입점 |
| `web-k-cosmetics/.../hub/HubPopLibraryPage.tsx` | 동("내 매장 POP 사본 관리 →") |

- 사용 공통 패키지: `@o4o/ui`(DataTable/ActionBar/BulkResultModal) · `@o4o/operator-ux-core`(useBatchAction) · `@o4o/content-editor`(RichTextEditor) · `@o4o/error-handling` — GP/KCos 기존 보유.
- 서비스 차이: popStaff service prefix(glycopharm/cosmetics) · getStoreSlug(`@/api/storeHub`) · 용어(약국/매장).

## 4. 검증

- **TypeScript 0 errors:** `web-glycopharm` · `web-k-cosmetics`.
- **정적:**
  - GP/KCos 에서 import → `store_pops` 사본 → **HUB POP 페이지 헤더 링크 → `/store/marketing/pop/library`(StorePopStaffPage) 목록/수정/삭제** 동선 확보.
  - 기존 `/store-hub/pop` import · `/store/marketing/pop`(StorePopPage 출력) 동작 무변경.
  - **backend/DB/migration/backend route 변경 0.** KPA(PharmacyPopPage/popStaff) 무변경.
- **무변경:** builder 연결("이 POP 으로 제작") · `/pharmacy/pop/generate` · store_pops 구조 · origin metadata · 복사 메커니즘.
- **browser smoke:** 미수행 — dev 서버·인증 guard. KPA 검증된 페이지의 충실 포팅(동일 @o4o 패키지·client shape) + typecheck. **배포 후 권장:** GP/KCos `/store-hub/pop` 가져오기 → "내 [약국/매장] POP 사본 관리" → 목록 표시·수정 저장·삭제 확인.

## 5. 중단 기준 점검

backend shape KPA 동일 + route 마운트됨 + 권한(verifyOwner) 일치 → 무리 없음. (page는 KPA 1:1 포팅이라 GP/KCos near-dup 발생 — 후속 dedup 후보.)

## 6. 완료 판정

**PASS.** GP/KCos 가져온 POP 사본을 목록·수정·삭제할 수 있는 `StorePopStaffPage` + client + route + 진입 링크 추가. import dead-end 해소, KPA parity. backend/DB 무변경, typecheck 통과.

## 7. 후속

1. (배포 후) GP/KCos smoke — import→사본 관리 동선.
2. `WO-O4O-POP-IMPORT-TO-BUILDER-LINK-V1`(다음) — 가져온 POP → "이 POP 으로 제작" → builder 연결(product 결정 선행).
3. (선택) KPA/GP/KCos StorePopStaffPage 3중 dup → 공통 컴포넌트 추출(store-ui-core, content-editor dep 추가 동반).

---

*Date: 2026-06-15 · GP/KCos POP 사본 관리 parity PASS · StorePopStaffPage(목록/수정/삭제) + popStaff staff 함수 + route + import 진입 링크. import dead-end 해소. backend/DB 무변경, KPA 무변경, typecheck 0. 배포 후 smoke 권장.*
