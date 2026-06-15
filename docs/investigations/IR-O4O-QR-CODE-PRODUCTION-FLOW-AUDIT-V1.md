# IR-O4O-QR-CODE-PRODUCTION-FLOW-AUDIT-V1

> **유형**: Investigation (read-only) — QR-code 제작 흐름(대상 선택 → 정비 → 표시방식 → 생성/출력 → 저장 → 재수정/재활용) 감사. 코드/DB/route/UI **무변경**.
> **결론(요약): 판정 B(부분 정합) + D(서비스 drift) 주.** QR 은 POP 과 달리 **이미 영속 재편집 엔티티**(`store_qr_codes`, PUT 수정 가능)이며 운영자 QR 템플릿(`operator_qr_templates`) → HUB → import(`/stores/:slug/qr/staff/import` → store_qr_codes 사본) 흐름, production-materials 표시(getStoreQrCodes), 이미지(PNG/SVG)·인쇄 PDF·전단 PDF·스캔 통계까지 backend 3서비스 마운트 — **"단순 QR 목록(C)" 아님**. 그러나 **프론트가 KPA 편중**: KPA 는 생성/편집/AI/통계/POP-QR selector/상품 prefill/일괄인쇄 보유, **GP/KCos 는 생성·삭제·import·production-materials 표시만**(편집 폼 ✗ · POP-QR selector ✗ · AI/통계 ✗) → **D drift**. cross-content 연결은 **POP embed(qrId, KPA 한정)** 뿐 — blog/signage/snapshot·direct origin 연결 없음(B).
> **선행/근거**: `O4O-STORE-MENU-CANONICAL-TREE-V1`(QR=6항목 中 #3, KPA 단독 90%, W5) · `O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1` · `IR-O4O-KPA-OPERATOR-HUB-QR-BUSINESS-DEFINITION-V1`(QR=템플릿 모델).
> **작성일**: 2026-06-15

---

## 1. 목적

QR-code 가 단순 생성 기능이 아니라 **제작 프로세스 한 축**(대상→정비→표시방식→생성/출력→저장→재활용)인지, 3서비스 parity 와 함께 감사. 통합/변경 아님.

## 2. QR 제작 흐름도 (현재)

```text
[운영자]  operator_qr_templates (author_role='operator', targetType url|content, draft→published)  ← HUB 발행(템플릿)
   │  /operator/qr/templates (3서비스 마운트)
   ▼
[HUB browse]  /store-hub/qr (HubQrLibraryPage) → importOperatorQr
   │  POST /stores/:slug/qr/staff/import → store_qr_codes 사본(landingType 변환, '[운영자 자료 가져옴]' 접두)
   ▼
[매장 QR]  store_qr_codes (org-scoped, landingType product|promotion|page|link, landingTargetId)
   │  생성: POST /pharmacy/qr (product 직접 연결 지원) · 수정: PUT /pharmacy/qr/:id · 삭제: soft
   ▼
[출력/활용]  이미지 GET /:id/image(PNG/SVG) · 일괄 인쇄 POST /print(PDF) · 전단 GET /:id/flyer(PDF) · 공개 랜딩 GET /qr/public/:slug + 스캔 통계
   │
   ├─▶ production-materials 표시(kind='qr', getStoreQrCodes) ✅
   └─▶ POP embed: /pharmacy/pop/generate { qrId } (KPA StorePopPage selectedQrId 한정)
```

## 3. 인벤토리

### 3.1 테이블/엔티티
| 테이블 | 역할 | 핵심 |
|--------|------|------|
| `store_qr_codes` | 매장 QR **영속 결과물**(재편집 가능) | org-scoped, **author_role 없음**, title/description/landingType/landingTargetId/slug(편집 가능), libraryItemId(논리참조), isActive |
| `operator_qr_templates` | 운영자 QR **템플릿**(HUB 발행 청사진) | author_role='operator', service_key, targetType(url/content), status. organization_id/slug 없음 |
| `store_qr_scan_events` | 스캔 통계 | org-scoped, device/IP hash |
| `store_execution_assets` | POP PDF(QR embed 시) | QR 자체는 미저장(on-demand 이미지) |

### 3.2 backend (3서비스 마운트)
| 컨트롤러 | 엔드포인트 | mount |
|----------|-----------|-------|
| `store-qr-landing.controller.ts` | `/pharmacy/qr`(CRUD) ·`/source/products` ·`/:id/image|analytics|flyer` ·`/print` ·공개 `/qr/public/:slug` | kpa:402 · glycopharm:404 · cosmetics:168 |
| `operator-qr.controller.ts` | `/operator/qr/templates`(CRUD+publish/archive) | kpa:461 · glycopharm:455 · cosmetics:197 |
| `qr.controller.ts`(staff) | `/stores/:slug/qr/staff/import`(operator template→store_qr_codes) | kpa:471 · glycopharm:473 · cosmetics:206 |

### 3.3 frontend (서비스별 차이 큼)
| 화면 | route | KPA / GP / KCos |
|------|-------|------|
| 매장 QR | `/store/marketing/qr` | StoreQRPage(KPA, 1337줄·full) / StoreQrPage(GP 625·thin) / StoreQrPage(KCos 525·thin) |
| HUB QR import | `/store-hub/qr` | HubQrLibraryPage (3서비스) |
| client | qrStaff.ts / storeQr.ts(KPA) · qrFetch inline(GP/KCos) | — |

## 4. 조사 질문별

| 질문 | 결과 |
|------|------|
| **5.1 생성 주체** | 운영자(템플릿)·매장(직접 생성·import)·상품 연결(landingType=product) 모두 가능. serviceKey 격리 ✅ |
| **5.2 입력 대상** | landingType **product/promotion/page/link** + landingTargetId(상품 offer/listing·content·URL). 운영자 템플릿 target=url/content. (snapshot/direct origin 은 QR production-material 입력으로 미수용 — library-only, `QR-CANONICAL-AND-LEGACY-AUDIT`) |
| **5.3 편집 단계** | store_qr_codes title/description/landingType/landingTargetId/slug **편집 가능(PUT)**. **KPA 편집 폼 O, GP/KCos 편집 폼 ✗**(생성·삭제만). KPA AI 제목/설명 보조 O |
| **5.4 출력/저장** | `store_qr_codes` 영속(재편집) + production-materials 표시 ✅. 출력: 이미지/인쇄PDF/전단PDF(KPA rich, GP/KCos PNG 다운로드). QR 은 **POP PDF 와 달리 영속 엔티티라 "콘텐츠 저장" 내재 충족** |
| **5.5 parity** | §5 표 — KPA full, GP/KCos thin(D) |

## 5. 3서비스 parity

| 항목 | KPA | GP | KCos |
|------|:---:|:--:|:----:|
| 매장 QR 페이지/생성/삭제 | ✅ | ✅ | ✅ |
| HUB QR import(operator template) | ✅ | ✅ | ✅ |
| QR production-materials 표시 | ✅ | ✅ | ✅ |
| **QR 편집 폼** | ✅ | ✗ | ✗ |
| **POP-QR selector**(POP에 QR 연결) | ✅ | ✗ | ✗ |
| AI 제목/설명 보조 | ✅ | ✗ | ✗ |
| 스캔 통계/일괄인쇄/전단/상품 prefill | ✅ | 부분/✗ | 부분/✗ |

> backend 는 3서비스 완비. **프론트 격차(편집·POP-QR·AI·통계)가 KPA↔GP/KCos drift(D)**. canonical(MENU-TREE §2.1): QR "기존 구현 KPA 단독 90%, 후속 W5" — 일치.

## 6. 판정

| 안 | 해당 | 근거 |
|----|:---:|------|
| **A** 흐름 정합(저장·재활용·타 제작물 연결) | KPA 근접 | KPA: 생성→store_qr_codes(영속·편집)→production-materials→POP embed→통계 |
| **B** 생성·저장 되나 타 제작물 연결 약함 | **부분** | cross-content = POP embed(qrId)만. blog/signage/snapshot·direct origin 연결 없음 |
| **C** 단순 QR 목록 중심 | ❌ | 영속 엔티티+import+production-materials+POP embed+통계 — 목록 이상 |
| **D** 서비스 drift | **주** | KPA full vs GP/KCos thin(편집·POP-QR·AI·통계 미흡) |

→ **종합 = B(부분 정합, cross-content 약함) + D(서비스 drift). C 아님(QR 은 영속 재편집 엔티티로 POP 보다 저장 우위).**

## 7. POP 축 대비 (참고)

- POP: PDF 산출물(execution_assets)만 → 콘텐츠 저장 별도 추가 필요했음(`WO-...-POP-SAVE-AS-CONTENT-V1`).
- **QR: store_qr_codes 자체가 영속·재편집 엔티티 → "콘텐츠 저장" 내재.** 따라서 QR 의 핵심 gap 은 "저장"이 아니라 **GP/KCos 편집·연결 parity(D)** 와 **cross-content 연결(B)**.

## 8. 후속 WO 후보

1. **`WO-O4O-QR-EDITOR-GP-KCOS-PARITY-V1`**(D 핵심) — GP/KCos StoreQrPage 에 **편집 폼**(title/description/landingType/landingTargetId) 추가. backend PUT `/pharmacy/qr/:id` 이미 존재 → frontend only. (POP staff parity WO 동형.)
2. **`WO-O4O-POP-QR-SELECTOR-GP-KCOS-PARITY-V1`**(D) — GP/KCos StorePopPage 에 QR selector(selectedQrId → generate qrId) 추가. KPA 동형, backend 무변경.
3. (선택) `WO-O4O-QR-CROSS-CONTENT-LINKAGE-V1`(B) — QR landingTarget 에 blog/snapshot/direct content 연결 확장(현재 library/url/product 중심). product 결정 동반.
4. (선택) `WO-O4O-QR-AI-ANALYTICS-GP-KCOS-PARITY-V1` — GP/KCos AI 제목·설명 + 스캔 통계 parity.
5. (선택) `IR-O4O-QR-ADMIN-DASHBOARD-LEGACY-AUDIT-V1` — `QR-CANONICAL-AND-LEGACY-AUDIT` 의 admin-dashboard parallel QR UI dead 의심 확인.

> **권장 순서**: ① GP/KCos QR 편집 폼(D, frontend) → ② GP/KCos POP-QR selector(D) → ③ cross-content 연결(B) / AI·통계 parity.

## 9. 검증 (본 조사)

- **코드/DB/route/UI 변경 0** (read-only). 산출물 = IR 문서 1건. 동시 세션 WIP 미접촉.
- store_qr_codes 편집 가능(PUT) · operator_qr_templates+import 3서비스 · production-materials qr 포함 · POP embed qrId(KPA) · GP/KCos 편집/POP-QR/AI 부재 확인(file:line은 §3·§5).

## 10. 결론

- QR-code 는 **영속 재편집 엔티티(store_qr_codes) + 운영자 템플릿 import + production-materials 표시 + POP embed + 통계**까지 갖춰 **"단순 목록(C)" 이 아니며 POP 보다 저장 측면 우위**.
- 핵심 gap 은 **(D) GP/KCos 프론트 parity**(편집 폼·POP-QR selector·AI/통계 부재)와 **(B) cross-content 연결**(POP embed 외 blog/signage/origin 연결 없음).
- **권고**: 저장 구조 변경 불요. ① GP/KCos QR 편집 폼 parity(frontend, backend PUT 기존) → ② POP-QR selector parity → ③ cross-content/AI·통계. 본 조사 범위는 확인까지 — 코드 무변경.

---

*Date: 2026-06-15 · read-only IR · 코드/DB 무변경 · QR = 영속 재편집 엔티티+템플릿 import+production-materials+POP embed (C 아님). 판정 B(cross-content 약함)+D(GP/KCos 편집·POP-QR·AI/통계 parity 미흡). 후속: GP/KCos QR 편집 폼 parity 우선.*
