# DECISION-O4O-NETURE-SUPPLIER-STORE-CONTENT-D1-D4-V1

> 성격: **정책 결정 기록**(IR 후속). IR = 조사 결과, 본 문서 = 결정.
> 근거 조사: [`IR-O4O-NETURE-SUPPLIER-STORE-CONTENT-QR-TABLET-FLOW-AUDIT-V1`](IR-O4O-NETURE-SUPPLIER-STORE-CONTENT-QR-TABLET-FLOW-AUDIT-V1.md)
> 작성일: 2026-07-12 · 상태: D1·D2·D4 확정 / D3 별도 분리
> 적용 대상: Neture 공급자 → 매장용 상품 설명서/QR/태블릿 흐름의 후속 모든 WO

이 문서는 구현이 아니다. 후속 WO가 반드시 따라야 할 **결정 4건**을 확정한다.

---

## D1 — 설명서 타입 = 용도 기준 (✅ 확정)

- 공급자가 만드는 것은 **ProductMaster 기준 `description_type=STORE` 매장용 설명서 초안**이다.
- 설명서 타입은 "누가 만들었는가"가 아니라 **"어떤 용도로 쓰는가"**: `B2B`(거래·사업자용) / `B2C`(소비자 안내용) / `STORE`(매장 활용용).
- **`SUPPLIER_STORE`는 신규 경로에서 사용하지 않는다**(작성자+용도 혼합 → 타입 체계 붕괴). enum에 잔존하나 deprecated·신규 생성 금지. 참조/데이터 조사 후 삭제는 별도 WO.
- **작성 주체 구분은 타입이 아니라 메타데이터**: 기존 `source_type='supplier'` + 신규 `created_by_role` / `created_by_supplier_id` / `reviewed_by_operator_id`.
- 근거: 3-Role SSOT §6, `product-landing.service.ts:178,197`(공개 랜딩이 이미 STORE만 렌더 → 읽기 경로 변경 0), IR §C.

## D2 — 운영자 검수 후 canonical 노출 (✅ 확정)

- 공급자 작성 `STORE` 설명서는 **운영자 검수를 거쳐 `status=canonical`로 승격된 것만** 매장 경영자에게 노출한다.
- 공급자 초안 상태(`candidate`/`needs_review`)는 매장 비노출.
- 현행 SPD canonical 모델(`(master, description_type, language)` partial unique)과 정합. 단, 제거된 검수 컨트롤러/이중게이트 누락(IR §C-4)은 후속 WO에서 공급자 초안용 검수 진입으로 보정.
- 근거: 3-Role SSOT §7, F4, IR §C-4/§G.

## D3 — 랜딩 로그인 게이트 (⏸ 별도 결정/분리)

- 사용자 정책: `/p/{key}`·QR 랜딩은 **O4O 로그인 게이트(비공개)** 방향.
- 현재 코드: **전면 공개·무인증**(`product-landing.controller.ts:34`, `store-qr-landing.controller.ts:11`, `App.tsx:667-668` 가드 밖).
- 영향 범위가 크고(공개 read model·매장 QR·규제 노출 게이트와 얽힘) **다른 세션이 동시 작업 중**일 수 있으므로, 본 흐름의 WO에 포함하지 않고 **별도 IR/WO로 분리**한다.
- 후속: `WO-O4O-PRODUCT-LANDING-AUTH-GATE-V1`(별도).
- 근거: IR §D-4.

## D4 — 태블릿은 공급자 직접 배정 금지 (✅ 확정)

- 공급자는 **태블릿 콘텐츠 세트를 직접 만들거나 매장 태블릿에 배정하지 않는다.**
- 공급자는 `STORE` 설명서(또는 제안 콘텐츠)를 제공하고, **운영자 검수 후** 매장 경영자가 **가져오기=복사** 하여 자기 매장 Screen Set에 적용한다.
- 태블릿 모델에 `supplier` origin 없음; 정식 통로는 `operator_template → 매장 복제`(현재 미구현, net-new).
- 근거: IR §F-3, §E, 3-Role SSOT §6.

---

## 결정이 후속 WO에 강제하는 것 (요약)

```
콘텐츠 타입   : description_type = STORE (SUPPLIER_STORE 금지)
작성자 구분   : source_type + created_by_role/created_by_supplier_id (메타데이터)
노출 조건     : 운영자 검수 → canonical 만 매장 노출
HUB 직접게시  : 금지 (운영자 매개)
랜딩 인증     : D3 별도 결정 전까지 변경 금지
태블릿        : 공급자 직접 배정 금지, operator_template/매장 복사 경유
```

## 구현 순서 (D3 제외하고 진행 가능)

1. **`WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-ENTRY-AND-ONBOARDING-V1`** — 대시보드 진입점 + 온보딩 안내 (저장/QR/태블릿 없음). ← 첫 WO
2. `WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1` — 작성자 메타 컬럼.
3. `WO-O4O-PRODUCT-CONTENT-STORE-SUPPLIER-DRAFT-V1` — 공급자 STORE 초안 작성·제출.
4. `WO-O4O-STORE-DESCRIPTION-QR-AUTOLINK-V1` — canonical→/p·QR.
5. (병렬/별도) `WO-O4O-PRODUCT-LANDING-AUTH-GATE-V1` — D3.
6. `WO-O4O-STORE-IMPORT-STORE-DESCRIPTION-V1`, `WO-O4O-KPA-TABLET-OPERATOR-TEMPLATE-DUPLICATE-V1`.
</content>
