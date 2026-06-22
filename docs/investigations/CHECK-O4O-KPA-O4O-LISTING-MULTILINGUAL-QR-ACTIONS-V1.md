# CHECK — WO-O4O-KPA-O4O-LISTING-MULTILINGUAL-QR-ACTIONS-V1

> KPA **O4O 주문 가능 상품(listing)** 화면에도 다국어 콘텐츠 고객용 링크/QR 액션을 붙이는 얇은 frontend 표면 보강.
> 매장 취급 상품(local)에는 이미 적용됨(QR-LANDING WO). 이번엔 `targetKind=listing` 표면만 동일화.
> **backend 무변경.**

**대상:** KPA only · `PharmacyB2BPage` (O4O 주문 가능 상품).

---

## 1. 조사 — 빠진 표면 확정

`PharmacyB2BPage` 는 BADGES-PILOT WO 에서 이미:
- `getMlcSummaryMap('listing')` 로드 + `mlcSummary` state
- 다국어 컬럼 `<MultilingualContentBadge summary={mlcSummary.get(row.listingId)} />`

까지 있었으나 **고객용 링크/QR 액션(`MultilingualPublicActions`)이 없었다** — local 화면(StoreLocalProductsPage)에는 모달 패널에 이미 존재. 이번 WO 는 listing 화면에 동일 액션만 추가.

## 2. backend 무변경 근거 (정적 확인)

`multilingual-product-content.controller.ts`:
- `GET /pharmacy/.../summary` — `targetKind`(local|listing) 필터 지원(L365·376). `getMlcSummaryMap('listing')` 동작.
- `POST /pharmacy/.../:groupId/public-key` (L421) · `GET /pharmacy/.../:groupId/qr` (L508) · `GET /public/multilingual-product-contents/:publicKey` (L193) — 전부 **groupId/publicKey 기준, targetKind-agnostic**. listing-bound group 도 동일 동작.

→ summary / public-key / QR / public landing 모두 listing 에 그대로 적용 가능. **backend 보정 0.**

## 3. 변경 (frontend only, 1 파일)

`services/web-kpa-society/src/pages/pharmacy/PharmacyB2BPage.tsx`:
- import: `MultilingualPublicActions`, `localeLabel`, `QrCode`/`X` (lucide).
- state: `qrPanel: { product, summary } | null`.
- 다국어 컬럼 render: summary 있을 때 배지 + **"고객용"** 트리거 버튼(QR 아이콘) → `setQrPanel`.
- 모달: 상품명 + "O4O 주문 가능 상품" + 배지 + 지원 언어 + **`MultilingualPublicActions groupId`** (고객용 보기 / URL 복사 / QR 보기 — 기존 컴포넌트 재사용).

기존 컴포넌트 재사용: `MultilingualContentBadge`, `MultilingualPublicActions` (신규 컴포넌트 0).

## 4. 문구
"O4O 주문 가능 상품" / "다국어 상품 안내 — 고객용" / "운영자 자료 복사" 유지. 금지어(내 매장 상품 / QR 연결 예정 / 임시 QR / 운영자 원본 보기) 미사용.

## 5. 검증

### 5.1 정적
- `web-kpa-society` `npx tsc --noEmit` — **error 0**.
- backend 무변경 → api-server typecheck 불요.

### 5.2 기능 smoke (배포 후)
```
KPA store-owner → /store/products (O4O 주문 가능 상품)
→ listing 에 연결된 다국어 배지 표시
→ "고객용" 클릭 → 모달
→ 고객용 보기(public-key 발급 + landing) / URL 복사 / QR 보기(SVG)
→ public landing 비인증 렌더 / archived 비노출(기존 정책)
```

### 5.3 회귀
local 상품 QR 흐름 / public landing / summary(local·listing) / Store Hub 다국어 route / 가져오기 flow / B2B 목록 기존 기능 — 무영향(additive only).

## 6. 안전
- backend 무변경. `connection.ts` / `store-entitlement`·payment WIP / `services/mobile-app/*` / `pnpm-lock.yaml` **미접촉**. 명시 pathspec commit.
- 단일 commit(code+CHECK) — web deploy HEAD 단일 커밋 변경감지 대응.

---

*Date: 2026-06-21 · frontend 표면 보강 1파일 · listing 다국어 고객용 링크/QR(기존 컴포넌트 재사용) · backend 무변경(targetKind-agnostic 확인) · web-kpa typecheck 0 · KPA only.*
