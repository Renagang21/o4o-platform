# CHECK-O4O-POP-SAVE-AS-CONTENT-V1

> **작업명:** WO-O4O-POP-SAVE-AS-CONTENT-V1
> **유형:** POP 콘텐츠 저장 추가 — 제작 결과를 `store_pops`(author_role='store') 로 저장. DB schema/migration **무변경**.
> **결과: PASS (PARTIAL — templateId 미저장) — 3서비스 StorePopPage 에 "POP 콘텐츠로 저장" 추가 → 신규 `POST /stores/:slug/pop/staff`(직접 작성, store_pops author_role='store') 로 저장. 저장된 POP 은 내 약국/내 매장 POP 사본 관리(StorePopStaffPage/PharmacyPopPage)에서 재편집·삭제·"이 POP으로 제작" 재활용 가능. 기존 PDF 생성 유지. typecheck(api-server+3) 0. DB/migration 무변경.**
> 선행: `IR-O4O-POP-EDITOR-TEMPLATE-OUTPUT-AND-SAVE-FLOW-AUDIT-V1`(C) — 2026-06-15

---

## 1. 배경 / 저장 대상 결정

선행 IR(C): 템플릿 적용 결과가 PDF(store_execution_assets)로만 저장되고 **재편집 가능한 POP 콘텐츠 저장 부재**. 본 WO 가 추가. **저장 대상 = `store_pops`(author_role='store')** — 사본 관리 화면과 직접 연결, 재편집·재제작 round-trip 자연. (`kpa_store_contents` 미사용 — POP 문안 round-trip 은 store_pops 가 직접적.)

## 2. 변경 (7 파일)

| 파일 | 변경 |
|------|------|
| `apps/api-server/.../o4o-store/controllers/pop.controller.ts` | **신규 `POST /stores/:slug/pop/staff`** — 직접 작성 store_pops INSERT(author_role='store', storeId, serviceKey, status='draft', title/content/excerpt, slug=title slugify+충돌 timestamp). verifyOwner. **DB 컬럼 추가 없음**(기존 컬럼만) |
| `web-{kpa,glycopharm,k-cosmetics}/src/api/popStaff.ts` | `createStaffPopPost(slug, {title,content,excerpt}, service?)` 추가 |
| `web-kpa/.../StorePopPage.tsx` | "POP 콘텐츠로 저장" 버튼(AI 패널) + handleSaveAsContent + getStoreSlug(pharmacyInfo)/createStaffPopPost import |
| `web-glycopharm/.../StorePopPage.tsx` | 동(getStoreSlug/createStaffPopPost from @/api/*, 용어 "내 약국") |
| `web-k-cosmetics/.../StorePopPage.tsx` | 동(용어 "내 매장") |

- 저장 데이터: `popAiContent` → title / content(shortText+bullets+longText 를 HTML 조합) / excerpt(shortText). **templateId 미저장**(store_pops 컬럼 부재 — §8 PARTIAL, DB 변경 회피).
- 버튼은 popAiContent 존재 시 노출. PDF 생성 버튼과 별도("PDF=출력물, POP 콘텐츠로 저장=재편집 콘텐츠").

## 3. round-trip (재활용)

```
StorePopPage(POP 제작) → "POP 콘텐츠로 저장" → POST /stores/:slug/pop/staff → store_pops(author_role='store', draft)
→ 내 약국/내 매장 POP 사본 관리(StorePopStaffPage/PharmacyPopPage) 목록 표시
→ 수정/삭제 + "이 POP으로 제작"(prefill) → StorePopPage 재제작 → PDF 생성
```

## 4. 검증

- **TypeScript 0 errors:** `api-server` · `web-kpa-society` · `web-glycopharm` · `web-k-cosmetics`.
- **정적:**
  - 신규 POST staff = store_pops INSERT(author_role='store'), 기존 GET/import/PUT/DELETE 와 동일 verifyOwner/slug 패턴. **migration 0, store_pops 컬럼 추가 0.**
  - createStaffPopPost 3서비스 추가(authFetch, service prefix). StorePopPage "POP 콘텐츠로 저장" 3서비스.
  - 저장 후 사본 관리 화면(이미 parity, `WO-...-POP-STAFF-PAGE-GP-KCOS-PARITY-V1`)에 표시·재편집·"이 POP으로 제작"(prefill, `WO-...-IMPORT-TO-BUILDER-LINK-V1`) 재활용.
  - **기존 PDF 생성(/pharmacy/pop/generate → store_execution_assets) 무변경.** generate 로직/입력 스키마 변경 0.
- **무변경:** store_pops/execution_assets 구조 · generate · kpa_store_contents · 복사 메커니즘. (connection.ts/neture 변경은 동시 세션 WIP — 미접촉.)
- **browser smoke:** 미수행 — dev 서버·인증 guard. POST/client/UI 는 typecheck + 기존 staff 패턴 동형. **배포 후 권장:** 3서비스 POP 제작 → "POP 콘텐츠로 저장" → 사본 관리에 표시 → 수정/재제작.

## 5. 판정 (§8)

**PASS (PARTIAL).** POP 콘텐츠 저장(store_pops) + 재편집/재제작 round-trip 3서비스 구현. **templateId 저장은 store_pops 컬럼 부재로 보류**(DB 변경 회피, PARTIAL) — 필요 시 후속(컬럼 추가 또는 content embed). 기존 PDF 흐름·DB·migration 무변경.

## 6. 완료 판정

POP 제작이 **PDF 출력 + 재편집 가능한 POP 콘텐츠 저장**까지 갖춘 한 턴 구조로 완성(사용자 원칙 충족). C(저장 부재) 해소.

## 7. 후속

1. (배포 후) 3서비스 "POP 콘텐츠로 저장" → 사본 관리 → 재제작 smoke.
2. (선택) templateId 보존 — store_pops 컬럼 추가(DB migration) 또는 content/메타 embed.
3. (선택) `WO-O4O-POP-EDITOR-INLINE-EDIT-V1`(인라인 편집) / `IR-O4O-POP-DATA-ROLE-CLARIFICATION-V1`(역할 정리).
4. (선택) KPA/GP/KCos StorePopPage·StorePopStaffPage dup 공통 컴포넌트 추출.

---

*Date: 2026-06-15 · POP 콘텐츠 저장 PASS(PARTIAL: templateId 보류) · 신규 POST /stores/:slug/pop/staff(store_pops author_role=store) + 3서비스 "POP 콘텐츠로 저장" + round-trip(사본 관리 재편집/재제작). 기존 PDF·DB·migration 무변경. typecheck(4) 0. 배포 후 smoke 권장.*
