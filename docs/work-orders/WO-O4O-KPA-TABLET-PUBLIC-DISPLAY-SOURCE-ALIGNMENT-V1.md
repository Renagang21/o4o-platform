# WO-O4O-KPA-TABLET-PUBLIC-DISPLAY-SOURCE-ALIGNMENT-V1

> 작업 요청서 · 작성일 2026-07-03
> 주제: KPA 태블릿 공개 화면의 상품 집합을 편성 화면과 정합

## 1. 제목
**O4O KPA 태블릿 공개 화면 진열 정합: 편성 상품 집합을 고객 화면 기준으로 반영**

## 2. 배경/문제
공개 `/stores/:slug/tablet/products`는 `store_tablet_displays`를 상품 집합의 권위로 쓰지 않고, supplier=TABLET channel gate 전체, local=active 전체를 반환. `store_tablet_displays`는 content_id attach 용도로만 사용 → 편성에서 제외한 상품이 공개 화면에 계속 보이거나 순서가 다를 수 있음.

## 3. 핵심 결정
- 공개 상품 집합 = 매장 **first active tablet**의 **visible display rows**.
- **legacy fallback**: active tablet 없음 또는 visible row 0 → 기존 legacy 집합(supplier=TABLET gate, local=active 전체).
- device pairing 없는 V1이므로 공개 URL은 first active tablet 기준(관리 화면에 안내).

## 4. 범위
포함: 공개 query 재조사, first active tablet 기준 정합, supplier(4중 gate 유지 + display rows 필터), local(active/org gate 유지 + display rows 필터), 순서=display sort_order, selected content/다국어 정책 유지, fallback 유지, 편성 화면 안내, CHECK.
제외: QR Core, 소비자 관리/로그인/CRM, 상담 복구, 주문/결제, 앱/글래스, device pairing/per-tablet URL, 사이니지 통합, 신규 마이그레이션, 상품/콘텐츠/번역 생성, GP/KCos 확장.

## 5. 구현 요지
- `resolveTabletDisplaySource(org)` → `{ tabletId, configured }` (first active tablet + visible row 존재).
- supplier(`queryTabletVisibleProducts`): `firstTabletId`/`configured` 옵션. configured면 visible display row(disp) INNER 필터 + `disp.sort_order` 순서, 아니면 legacy. content attach는 disp.content_id 링크 유효 시. count도 configured 반영. 4중 commerce gate 불변.
- local(handler): 동일 기준. configured면 disp 있는 local만 + sort_order.
- 응답 additive: `tabletDisplaySource: 'configured'|'legacy_fallback'`, `tabletDisplayTabletId`.
- 다국어(ready/published만) · selected content 정책 불변.

## 6. 완료 조건 (요약)
configured면 공개 집합이 visible rows로 제한 / local active 전체 무조건 노출 안 됨 / supplier gate 유지 / 순서=편성 순서 / fallback 회귀 없음 / selected·다국어 회귀 없음 / 편성 화면 안내 / typecheck·검증 / CHECK.

## 7. 한 줄
```text
새 기능이 아니라, 매장이 저장한 태블릿 진열 구성이 실제 고객 공개 화면의 상품 집합과 일치하도록 만드는 정합 작업.
```
