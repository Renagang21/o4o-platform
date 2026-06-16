# CHECK-O4O-PRODUCT-DESCRIPTION-GUIDE-NOTICE-V1

> **작업명:** WO-O4O-PRODUCT-DESCRIPTION-GUIDE-NOTICE-V1
> **유형:** 정책 안내 문구만 추가 (UI 텍스트). 기능/DB/API/route **무변경**.
> **결과: PASS — KPA/GP/KCos 상품설명 화면 + neture 관리자 정비 모달에 "O4O 공용 상품 DB 기준 / 매장 특화 문구는 콘텐츠 만들기" 안내 배너 추가. 4서비스 typecheck 0.**
> 선행: SHARED-CANDIDATE-STORAGE · CANONICAL-OUTPUT-LINK · CANDIDATE-SEED · ADMIN-CURATION — 2026-06-16

---

## 1. 수정 파일 (4 + CHECK)

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx` | 헤더 하단 안내 배너(약국 표현) |
| `services/web-glycopharm/src/pages/store-management/StoreProductDescriptionsPage.tsx` | 동(약국 표현) |
| `services/web-k-cosmetics/src/pages/store/StoreProductDescriptionsPage.tsx` | 동(매장 표현) |
| `services/web-neture/src/pages/admin/ProductDescriptionCurationModal.tsx` | 모달 상단 정책 안내 문구 |
| `docs/investigations/CHECK-O4O-PRODUCT-DESCRIPTION-GUIDE-NOTICE-V1.md` | 본 CHECK |

> DB/API/route/저장 구조/편집 기능/메뉴 **변경 0**. 안내 텍스트(`<div>` 1개씩)만 추가.

## 2. 적용 문구

### 2.1 매장/약국 상품설명 화면 (헤더 하단 배너)
- **KPA/GP(약국):**
  > 상품설명은 **O4O 공용 상품 DB 기준**으로 관리됩니다. 공급자 설명·AI 초안·의약품 정보 등을 바탕으로 O4O 관리자가 대표 설명을 정비합니다. **약국 특화** 홍보문·이벤트 문구·POP/블로그용 문구가 필요하면 **콘텐츠 만들기**에서 별도 콘텐츠로 제작하세요.
- **KCos(매장):** 동일 문구, "약국 특화" → **"매장 특화"**.

### 2.2 관리자 정비 모달 (상단 안내)
> ProductMaster 기준 **공용 상품설명 후보**를 정비하는 화면입니다. 대표로 지정된 설명은 상품 상세에 노출됩니다. 후보는 공급자 설명·AI 초안·의약품 정보 등에서 가져올 수 있으며, **매장별 override나 매장별 선택값은 사용하지 않습니다.**

## 3. 서비스별 표현 차이 (§8)

| 서비스 | 표현 |
|------|------|
| KPA / GlycoPharm | "약국 특화 홍보문" |
| K-Cosmetics | "매장 특화 홍보문" |
| neture admin | "공용 상품설명 후보 정비", "매장별 override/선택값 미사용" |

권장 표현(O4O 공용/대표 상품설명/콘텐츠 만들기 유도) 채택, 피해야 할 표현("매장별 상품설명 선택/저장" 등) 미사용.

## 4. 구현 방식 / 스타일

- KPA: 기존 `colors`(theme) 사용한 inline 배너(neutral50/200/700).
- GP/KCos: `colors` 미import → 동일 룩 literal hex(#F8FAFC/#E2E8F0/#334155) inline 배너.
- neture: Tailwind className(bg-slate-50/text-slate-500) 모달 상단 안내.
- **신규 route/링크/버튼 없음** — 텍스트 안내만(§5.2 "기존 route 불명확 시 텍스트 안내" 준수). "콘텐츠 만들기"는 텍스트 강조(`<strong>`)로만, 하드 링크 미추가.

## 5. 불변 / 미도입 확인 (§6)

- DB/migration/API/route/저장 구조/output path/편집기/메뉴 **변경 0**.
- 매장별 override 저장소 / selection table **미도입**.
- AI batch / bulk seed / 관리자 정비 기능 확장 / 콘텐츠 만들기 코드 / HTML 렌더 정책 **미변경**.
- 기존 버튼/목록/모달 동작 무영향(배너 `<div>` 삽입만).

## 6. 검증

- **typecheck PASS (4 서비스):** web-kpa-society / web-glycopharm / web-k-cosmetics / web-neture — 각 `tsc --noEmit` error 0.
- 정적: 배너는 헤더와 본문 layout 사이에 삽입(레이아웃 흐름 비파괴). neture 모달은 헤더 다음 안내 줄 추가.
- 브라우저 확인 권장(배포 후): 3 상품설명 화면 배너 노출 / 관리자 모달 안내 노출 / 기존 동작 정상.

## 7. 완료 판정

**PASS.** 상품설명 정책 안내(공용 상품 DB 기준 + 콘텐츠 만들기 유도) 4개 화면 추가, 매장별 override/selection 오해 문구 미사용, 코드/DB/API/route 무변경, 4서비스 typecheck 통과.

> §10 PARTIAL PASS 사유(매장 화면 구조 노후)에는 해당하지 않음 — 3 서비스 상품설명 화면 모두 존재·동형이라 안내 일괄 적용. 단 화면이 여전히 "상품설명 관리" 편집 UI 성격이므로, 구조적 정렬이 필요하면 후속(§8 STORE-FACING-PAGE-ALIGNMENT).

## 8. 후속 WO

1. `WO-O4O-PRODUCT-DESCRIPTION-HTML-RENDERING-POLICY-V1` — content HTML sanitize/리치 렌더.
2. `WO-O4O-KPA-STOREFRONT-DESCRIPTION-LINK-V1` — KPA storefront canonical 연결.
3. (선택) `WO-O4O-PRODUCT-DESCRIPTION-STORE-FACING-PAGE-ALIGNMENT-V1` — 매장 상품설명 화면이 공용 정책과 구조적으로 더 정렬되도록(편집 성격 축소 등) 후속 정비.

---

*Date: 2026-06-16 · 상품설명 공용 자산 안내 문구 · PASS · KPA/GP/KCos 상품설명 화면 + neture 관리자 모달에 "O4O 공용 상품 DB 기준 / 매장 특화 문구는 콘텐츠 만들기" 배너 · 코드/DB/API/route 무변경(텍스트만) · 4서비스 typecheck 0 · 후속 HTML 렌더/KPA link/store-facing 정렬.*
