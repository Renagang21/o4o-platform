# IR-O4O-SUPPLIER-LIBRARY-POLICY-V1

> **유형:** 조사 IR (read-only, 코드/UI/API/DB/route/menu 무변경)
> **목적:** Neture `/supplier/library` 를 매장형 자료실과 분리된 공급자 전용 자료실로 볼지 조사하고, 정책·역할·콘텐츠 범위·후속 방향을 확정한다.
> **작성:** 2026-06-13

---

## ⚠️ 핵심 결론 (먼저 읽을 것)

> **`/supplier/library` 는 LIVE 이지만 이미 메뉴에서 제거된(de-emphasized) 공급자 private 보관소다.** 2026-05-23 `WO-O4O-SUPPLIER-CONTENT-PRODUCER-UI-CLEANUP-V1` 이 **"공급자는 O4O 내부 Producer 가 아니다 — canonical 흐름은 '공급자 → 오프라인 전달 → Operator 등록 → HUB'"** 로 결정하면서 supplier 사이드바의 자료실 진입점을 제거했다(route 는 북마크 호환용으로만 유지).
>
> **정책 판정: D(보류·현 상태 유지) + E(장기 cleanup 후보).** 운영자 검수/전환 흐름(C)은 **이미 확정된 offline-handoff 철학과 모순**되므로 신설하지 않는다. 명칭은 재노출 시에만 "공급자 자료실"로(현재 메뉴 미노출이라 시급성 낮음). public `/resources` 와 데이터·페르소나가 완전히 분리되어 있어 같은 "자료실" 명칭은 혼동 소지.

## 1. 조사 개요

Neture `/supplier/library`(공급자 자료실)의 frontend·backend·운영자 연계·public `/resources` 관계를 read-only 2-에이전트 병렬 조사.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `53dddc842` |
| origin ahead/behind | 0 / 0 |
| 다른 세션 WIP | operator-core-ui(product-applications)·GP/KCos App.tsx·operatorMenuGroups·pnpm-lock·ProductApplicationManagementPage 등 다수 — **미접촉** |
| 조사 기준 commit | `53dddc842` |

## 3. route / menu 현황

| route | component | menu label | 사용자 | 상태 |
|-------|-----------|-----------|--------|:--:|
| `/supplier/library` | SupplierLibraryPage | **메뉴 제거됨** | supplier(SupplierRoute) | LIVE(미노출) |
| `/supplier/library/new` | SupplierLibraryFormPage | — | supplier | LIVE |
| `/supplier/library/:id/edit` | SupplierLibraryFormPage | — | supplier | LIVE |

- **메뉴 진입점:** `SupplierSpaceLayout.tsx` 의 SUPPLIER_SIDEBAR_GROUPS 에서 "자료실/Library" **제거됨**(WO-O4O-SUPPLIER-CONTENT-PRODUCER-UI-CLEANUP-V1, 2026-05-23). 사이드바: Overview / 제품 관리 / 공급 오퍼 / 유통참여형 펀딩 / 이벤트 오퍼 / 주문·배송 / Finance / 설정 / Community — 자료실 없음.
- route 는 **북마크·링크 호환용으로만 유지**. 직접 URL 외 발견 불가.
- 페이지 제목 "자료실", 설명 "파일 및 문서를 관리합니다", CTA "자료 등록", empty "등록된 자료가 없습니다".

## 4. component / API / DB 현황

### 4.1 Frontend
- **SupplierLibraryPage**: DataTable(제목/카테고리/파일명/공개/생성일), 공개범위 필터(전체/서비스 공개/비공개), 편집·삭제. "파일 업로드 기능은 추후 제공" 고지(현재 URL 직접 입력).
- **SupplierLibraryFormPage**: contentType `media`(fileUrl/fileName/mimeType/fileSize) 또는 `document`(RichTextEditor blocks), title/description/category/isPublic.
- **API client**: `supplierApi` → base `/neture/library` (GET 목록, POST 생성, PATCH 수정, DELETE 삭제).

### 4.2 Backend
- **Entity** `neture_supplier_library_items` (`modules/neture/entities/NetureSupplierLibraryItem.entity.ts`): id, **supplier_id**(FK CASCADE), title, description, file_url, file_name, file_size, mime_type, **category**(VARCHAR free-form, no enum), **is_public**(bool), **content_type**('media'|'document'), **visibility**('service'|'personal', isPublic 파생), blocks(JSONB, document만), created_at, updated_at.
  - **status/approval 컬럼 없음. createdBy(user) 없음. organizationId/serviceKey 없음.**
- **Routes** (`neture-library.routes.ts`, mount `/api/v1/neture/library`):
  | method | path | guard |
  |--------|------|-------|
  | GET | `/library/public` | **무인증** (isPublic=true 전체) |
  | GET | `/library` | requireAuth + requireLinkedSupplier (본인 supplierId) |
  | POST | `/library` | requireAuth + requireActiveSupplier |
  | PATCH | `/library/:id` | requireActiveSupplier + 소유확인(id,supplierId) |
  | DELETE | `/library/:id` | requireActiveSupplier + 소유확인(hard delete) |
  - **운영자/admin endpoint 없음** (검수/승인/전환/list-all 부재).
- **Boundary:** **supplierId 단독** scope. serviceKey/organizationId 미사용. public read = isPublic=true 필터만(큐레이션·승인 없음).

## 5. 콘텐츠 유형 분석

| 유형 | 현재 지원 | 비고 |
|------|:--:|------|
| 파일(media): 소개서/이미지/영상/PDF/인증/가격표/홍보물 | ✅ (fileUrl 기반, 업로드는 추후) | category 자유 문자열로 표현 |
| 문서(document): RichText blocks | ✅ | JSONB blocks |
| 카테고리 enum(제품소개서/이미지/영상/인증/가격표/제안서…) | ❌ 미정의 | free-form VARCHAR(100) — 스키마 강제 없음 |
| status(draft/pending/approved) | ❌ 없음 | isPublic 이진값만 |

> 자료 유형은 **media/document 2종 + 자유 category** 로 사실상 무엇이든 보관 가능하나, **정책적 유형 체계는 없음**.

## 6. 운영자 활용 흐름 분석

| 점검 | 결과 |
|------|------|
| 운영자가 supplier library 조회 | ❌ 운영자 endpoint/화면 없음 |
| 승인/반려 | ❌ 없음(status 자체 부재) |
| 콘텐츠 전환 | ❌ 없음 |
| 각 서비스 자료실 복사/게시 | ❌ 없음 |
| cross-module 소비(operator content/event-offer/funding/CMS) | ❌ **격리** — 다른 모듈에서 `neture_supplier_library_items` 미참조 |

> **현재는 순수 supplier private 보관소** — 운영자 연계 0. canonical 흐름은 offline 전달이며, 이 in-app 라이브러리는 그 대체 채널로 만들어졌다가 2026-05-23 에 메뉴에서 의도적으로 제외됨.

## 7. 매장형 자료실과의 경계

| 구분 | 공급자 자료실(Neture) | 매장형 자료실(KPA/GP/KCos) |
|------|----------------------|---------------------------|
| 사용자 | 공급자 | 매장 경영자 |
| 목적 | 공급자 private 보관 | 매장 실행 자료 활용 |
| scope | **supplierId** | organizationId/storeId |
| 자료 성격 | 제품/사업/홍보 원본(자유) | 매장 실행 결과물 |
| 운영자 역할 | **없음(격리)** | 게시/제공/관리 |
| 진입 | **메뉴 제거(북마크만)** | 정식 메뉴 |

> 경계 명확 — **절대 같은 축으로 묶으면 안 됨**(사용자 가설 확인).

## 8. Neture public `/resources` 와의 관계

| 항목 | `/supplier/library` | `/resources`(NetureResourcesPage) |
|------|---------------------|-----------------------------------|
| 데이터 원천 | `neture_supplier_library_items`(GET `/neture/library/public`) | **CMS** `GET /neture/content?type=resource` |
| 페르소나 | 공급자(쓰기) | public read-only |
| 컴포넌트 | local SupplierLibraryPage | shared `ResourcesHubTemplate` |
| 제목 | "자료실" | "자료실"(공급자·파트너 공유) |
| 통합 | **없음** — supplier library 자료가 `/resources` 로 흐르지 않음 | — |

> ⚠️ **명칭 충돌**: 둘 다 "자료실" 이나 데이터·역할 완전 분리. 재노출 시 supplier 쪽은 "공급자 자료실" 로 구분 필요.

## 9. 정책 판단

**판정: D(보류·현 상태 유지) + E(장기 cleanup/재설계 후보). C(운영자 검수/전환) 명시적 반대.**

| 옵션 | 적용 |
|------|------|
| A 현재 유지 | 부분 — route 호환 유지 |
| B 명칭 정비 | 보류 — **메뉴 미노출**이라 사용자-facing 명칭 정비 시급성 없음(재노출 시에만 "공급자 자료실") |
| C 운영자 검수/전환 흐름 | **반대** — canonical "공급자→오프라인→Operator→HUB" 철학(2026-05-23)과 모순. in-app 공급자 material 채널은 의도적으로 비채택됨 |
| D 보관함 수준·보류 | **채택** — 현재 정확히 이 상태. supplier onboarding/제품 등록/이벤트오퍼/펀딩 흐름 설계 시 재검토 |
| E 제거/축소 후보 | **부수 채택** — 메뉴 이미 제거됨. route+backend 는 vestigial. 단 본 IR 에서 삭제 안 함 |

**근거:** CLAUDE.md 사업 철학 SSOT 의 canonical flow(공급자 자료는 오프라인 전달 → 운영자가 등록 → HUB 게시)가 이미 in-app 공급자 라이브러리를 대체했다. 따라서 supplier library 에 운영자 연계(C)를 다시 붙이는 것은 철학 역행. 현 상태(private 보관, 메뉴 hidden)가 철학과 정합.

## 10. 권장 명칭 / 설명

(메뉴 재노출 또는 정비 시에만 적용 — 현재는 불요)
- 명칭: **"공급자 자료실"** (단순 "자료실" 금지 — public `/resources` 와 충돌)
- 설명 후보: "공급자가 제품·사업·홍보 자료를 보관하는 공간" / "운영자 전달용 원천 자료 보관소"
- 단, **canonical 흐름상 운영자 전달은 오프라인** 이므로 "운영자에게 노출/제공" 류 문구는 현 정책과 불일치 → 사용 주의.

## 11. 후속 WO 후보

| 후보 | 내용 | 권장도 |
|------|------|:--:|
| `WO-O4O-NETURE-SUPPLIER-LIBRARY-LABEL-CLARITY-V1` | 재노출 시 "공급자 자료실" 명칭/설명 정비 | **보류**(메뉴 미노출이라 현재 무의미) |
| `IR-O4O-SUPPLIER-MATERIAL-TO-OPERATOR-CONTENT-FLOW-V1` | 공급자 자료→운영자 콘텐츠/이벤트/펀딩 전환 흐름 | **비권장**(offline-handoff 철학과 충돌; 진행 시 철학 재검토 선행 필수) |
| `WO-O4O-NETURE-SUPPLIER-LIBRARY-DEAD-SURFACE-DECISION-V1` | vestigial route/backend 유지 vs 축소 결정 | 선택(장기) |
| supplier onboarding/제품 등록 설계 시 통합 검토 | 자료 보관 필요성을 제품 등록·이벤트오퍼·펀딩 흐름에 흡수할지 | 권장(자연 시점) |

## 12. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| 공급자 자료실이 공급자→운영자→매장 흐름과 맞는가 | △ canonical 은 **오프라인 전달** — in-app 라이브러리는 의도적으로 메뉴 제외(철학 정합 위해 hidden) |
| 공급자 원천 자료 vs 매장 실행 자료 혼동? | ✅ 경계 명확(supplierId vs organizationId), 같은 축 금지 |
| 운영자 선별·전환 구조 필요? | ❌ 철학상 offline 전달이 canonical → in-app 전환 흐름 신설은 역행 |
| Neture 를 매장형 자료실에 오포함? | ✅ 방지 — 매장형 없음, 공급자 축 별도 |
| 공급자에게 필요한 자료실인가, 중복 메뉴인가 | 현재 **메뉴 미노출**, private 보관만 — 필수성 낮음(D/E) |
| 이벤트오퍼/펀딩/제품 등록과 연결 가능? | 가능하나, **그 흐름 설계 시점에 통합 판단** — 지금 별도 라이브러리 강화는 불요 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | **없음** (read-only IR) |
| 생성 IR | `docs/investigations/IR-O4O-SUPPLIER-LIBRARY-POLICY-V1.md` |
| 조사 기준 commit | `53dddc842` |
| `/supplier/library` live 여부 | **LIVE** (단 사이드바 메뉴 제거됨, 북마크 호환만) |
| DB/API scope | `neture_supplier_library_items`, **supplierId 단독**(serviceKey/org 없음), status/approval 없음 |
| 콘텐츠 유형 | media(파일URL)/document(blocks) + 자유 category(enum 없음) |
| 운영자 활용 흐름 | **없음**(운영자 endpoint/화면 0, 격리) |
| 매장형과의 경계 | 명확(공급자 private vs 매장 실행), 같은 축 금지 |
| `/resources` 관계 | **별개**(CMS content), 통합 없음, "자료실" 명칭 충돌 |
| 정책 판단 | **D(보류) + E(cleanup 후보), C 반대** |
| 권장 명칭 | 재노출 시 "공급자 자료실"(현재 불요) |
| 후속 WO | label-clarity 보류, operator-flow 비권장, onboarding 설계 시 통합 검토 |
| git status | 다른 세션 WIP 다수(미접촉), 본 IR 문서만 신규 |
