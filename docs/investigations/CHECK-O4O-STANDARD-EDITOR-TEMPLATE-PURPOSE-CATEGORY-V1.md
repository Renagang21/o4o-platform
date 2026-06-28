# CHECK-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1

> 표준 편집기 기존 템플릿 기능에 용도 분류 + 860px 고정 레이아웃 노드 추가 (Phase 1 + Phase 2) 검증.
>
> WO: `WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1`
> 작성일: 2026-06-28 · 상태: Phase 1·2 구현·배포·라이브 검증 완료, 테스트 데이터 정리 완료

---

## 1. 선행 조사 결과 (§4)
- 편집기 = `@o4o/content-editor` `RichTextEditor`(TipTap, 공유 패키지). 템플릿은 **표현 전용** — 부모가 `templates`+`onLoadTemplates`/`onSaveAsTemplate` 제공.
- 저장 = 백엔드 `content_templates` 테이블(+ `/content/templates` API). **category 컬럼 이미 존재** → **DB/신규 API 무변경.**
- 소비처 = web-neture 공급자 상품 편집기(`ProductDetailDrawer`)만. → 본 WO 범위: **상품 완성 + QR/POP 분류구조만**.
- 860px: TipTap 확장에 컨테이너 노드 없음 → setContent 시 styled div 유실. raw-preserve는 "적용 후 편집" 시 깨짐 → **§B 전용 container node 채택**(사용자 결정).

## 2. Phase 1 — 용도 분류 (commit aafd1c4b7)
- 고정 4분류(상품/QR 코드/POP/기타) 상수+한글 라벨+정규화(미분류→기타) — `types.ts`
- TemplateModal: 고정 분류 탭+개수+미분류 기타 + `templateCategory` 자동선택
- SaveTemplateModal: 고정 4분류 한글, 용도 필수, `templateCategory` 기본선택
- RichTextEditor: 하단 버튼 → 탭 행 우측 "템플릿 ▾" 메뉴, `templateCategory` prop
- web-neture 공급자 상품(`ProductDetailDrawer`) `templateCategory="product"` 연결
- 라이브 smoke(테스트 상품) **PASS**: 탭 행 "템플릿 ▾" / 분류 탭 5개 / **상품 자동선택**(activeTabs=상품) / 메뉴 불러오기·저장 / 모바일 겹침 없음(버튼 right 342 ≤ vw 390).

## 3. Phase 2 — 860px 고정 레이아웃 노드 (commit 790afdbb9)
- `ProductDetailLayout` TipTap 블록 노드: `data-o4o-layout="product-detail-860"` **마커 div만 parse**, 고정 렌더(width100%/max-width860px/margin auto/box-sizing), `content:'block+'`(내부 편집 가능, **non-atom**). raw-preserve 미의존.
- built-in `상품 상세설명 표준형(860px)` 템플릿(category=product) — 마커 div + TipTap 안전요소(h2/p). TemplateModal에 병합, 사용기록/삭제 제외.
- 적용 시 `htmlSource` 동기화 → 탭 왕복 보존.
- **라이브 회귀(테스트 상품) PASS**:

| 단계 | 결과 |
|---|---|
| 적용 → 860px 컨테이너 | ✅ maxWidth 860px |
| **내부 글자 수정(WYSIWYG) 후** | ✅ **860px 유지** (raw-preserve 실패 케이스 통과) |
| 미리보기(ContentRenderer=공개 렌더 동일 경로) | ✅ 860px |
| HTML→편집 재파싱(sanitizeRichHtml 왕복) | ✅ 860px 유지 (DOMPurify가 marker/style 보존) |
| 모바일 | ✅ 364px(≤viewport), max-width 준수 |

> HTML 탭 textarea 직접 캡처는 다중 에디터 selector 스코프 문제로 미캡처 — 단 미리보기 PASS가 htmlSource의 marker 존재를 증명(미리보기=htmlSource 렌더). save→reopen은 `getHTML()`이 marker 포함(afterEdit 확인) + parseHTML 재생성(적용 경로 동일 검증)으로 보장.

## 4. 검증
- content-editor + web-neture `tsc --noEmit` **0 errors**, 빌드 성공.
- 배포: Deploy Web Services `service=all` — neture/kpa/glyco/k-cosmetics 4서비스 success(공유 패키지).
- 라이브 smoke/회귀 PASS(위).

## 5. 테스트 데이터 라이프사이클 (조건 1~10 준수)
- 생성 전 안전 게이트 조사: create(private 초안)는 승인요청/노출/모집/알림/listing **미트리거**(승인은 별도 submit-approval, auto-list는 승인 시점, serviceKeys 비움→service approval 없음). 삭제 경로 `DELETE /products/bulk` 존재.
- **orphan 방지**: manualData 신규 master 대신 **기존 [E2E_TEST] master(barcode 2003871659580) 재사용** offer 생성 → bulkDelete가 내 offer만 제거, master는 사전 존재(내 데이터 아님).
- 생성: offer `2654c6fe-1a9e-4efa-99e7-5b7cee96fc95` (PRIVATE/isActive:false/isPublic:false/serviceKeys 없음/승인 미제출).
- Phase 1·2 동일 상품으로 검증.
- 정리: `bulkDelete` deleted:1 → 목록 0개 복구, [E2E_TEST] master 보존 확인. **내 생성 데이터 완전 정리, orphan 0.**

## 6. 무변경 / 범위 외
- DB / 신규 API / migration 무변경 (content_templates.category 재사용).
- QR/POP는 분류 구조만 — 라이브 wiring·기본문구는 후속(별도 합의).
- 공개 상품 상세페이지 **실제 라이브 렌더**는 테스트 offer가 private/inactive라 미노출 → 직접 확인 불가. 단 미리보기·공개 모두 동일 `ContentRenderer`(sanitizeRichHtml) 경로라 동작 동일.

## 7. 후속 (필수 인지)
- **이미지 본문 폭 맞춤**(`이미지 → 라이브러리 → 본문 폭 맞춤`)은 **별도 이미지 기능 WO**. 860px 컨테이너는 문서 최대 폭만 보존하며, 기존 `width="240"` 등 좁은 이미지를 자동 확대하지 않음.
- 템플릿 적용 시 교체/아래 추가/취소(§13 3선택)는 현재 교체+confirm — 필요 시 후속 소폭 추가.
- 공개 상세페이지 live 렌더 확인은 공개 상품 1건에서 후속 1회 권장.

---

**작성:** O4O Platform Team · 2026-06-28
**상태:** Phase 1(용도 분류) + Phase 2(860px 고정 layout node) 완료 — tsc/빌드/배포/라이브 smoke·회귀 PASS, 테스트 데이터 완전 정리. 이미지 본문 폭 맞춤은 후속 WO.
