# CHECK-O4O-KPA-QR-TARGET-COPY-GUARD-V1

> WO: **WO-O4O-KPA-QR-TARGET-COPY-GUARD-V1** (P1=A안 결정 후속)
> 선행: `docs/ir/IR-O4O-COPY-ON-IMPORT-INVARIANT-AUDIT-V1.md`
> 작업일: 2026-06-26 · 상태: **COMPLETE (smoke PASS)** · 커밋: backend `72edfba3c`

## 정책 (P1=A안)

매장 영역에서 생성·사용되는 QR 은 반드시 매장 소유 사본을 참조한다. 운영자 content_hub 원본(`kpa_contents`)을 매장 QR 이 직접 참조하는 구조는 허용하지 않는다. (broadcast 모델은 별도 기능으로 분리, 본 WO 미포함)

## 변경 내용

| 파일 | 변경 |
|------|------|
| `o4o-store/services/qr-content-hub-copy.service.ts` (신규) | `ensureStoreCopyForPageTarget` — page QR target 이 kpa_contents 원본이면 store_execution_assets(content) 매장 사본 생성/재사용 후 `libraryItemId` 로 치환(`landingTargetId=null`). dedup=store_asset_derivations(content_hub→store_execution_asset) 재사용 |
| `o4o-store/services/store-asset-derivation.service.ts` | 어휘 추가: source `content_hub`, derived `store_execution_asset` |
| `o4o-store/controllers/store-qr-landing.controller.ts` | POST /pharmacy/qr 에 가드 적용(page) + resolver 의 `page→kpa_contents` 원본 직접 렌더 분기 **제거**(매장 직접 콘텐츠/store_asset 만 노출) |
| `o4o-store/controllers/qr.controller.ts` | 운영자 QR 템플릿 staff import 변환에 가드 적용(page) |
| `web-kpa-society/.../StoreAssetSelectorModal.tsx` | 안내 문구 정정: "원본을 가리키는 QR(사본 복사 없음)" → "매장 사본이 만들어지고 QR은 사본을 가리킴" |
| `web-kpa-society/.../StoreQRPage.tsx` | 운영자 콘텐츠 연결 QR GuideBlock 문구 정정(사본 생성 반영) |

## 가드 동작

1. page QR 생성/변환 시 `landingTargetId` 가 `kpa_contents`(content_hub 원본)이면 → 본문(body, 비면 blocks→HTML)을 `store_execution_assets`(asset_type='content', organization 소유) 사본으로 생성.
2. 같은 원본에서 이미 만든 사본이 있으면(derivation) 재사용.
3. QR 은 `library_item_id`=사본 id 로 저장(`landing_target_id=null`) → 기존 PASS 경로(공개 landing 의 store_asset 분기) 재사용.
4. 원본 id 는 `store_asset_derivations`(content_hub→store_execution_asset) 추적용으로만 보관.
5. resolver 는 더 이상 `kpa_contents` 원본을 직접 렌더하지 않음(방어).

## 브라우저 + API + DB smoke (kpa-society.co.kr, 테스트 약국 매장)

선행 baseline(운영 DB read-only): 활성 page QR 의 kpa_contents 원본 참조 **0건**.

| Case | 내용 | 결과 |
|------|------|------|
| 1 | content_hub 원본(`kpa_contents` 5b258882…)을 target 으로 POST /pharmacy/qr | 201, 생성 QR `landingTargetId=null`, `libraryItemId=967ac425…`(새 사본) ✅ |
| 2 | 새 사본 `967ac425` = store_execution_assets content/generated/active, html 보유, org 소유 | ✅ |
| 3 | derivation `content_hub`(5b258882) → `store_execution_asset`(967ac425) 기록 | ✅ |
| 4 | 공개 QR `/qr/smoke-guard-0626` 렌더 = **사본 본문**(껌 콘텐츠), 원본 직접 참조 아님 | ✅ |
| 5 | 가드 후 활성 page QR 의 kpa_contents 원본 참조 | **0건 유지** ✅ |
| 6 | 회귀: 기존 direct page QR `/qr/4` 정상 렌더(resolver 변경 무영향) | ✅ |
| 7 | smoke 데이터 정리: QR DELETE(200) → 사본 DELETE(200, QR 선삭제 후 허용 = DELETE QR-참조 가드도 정상) | ✅ |

> UI 경로(QR 만들기 → 운영자 콘텐츠 탭)는 테스트 매장에 운영자 content_hub 항목이 없어 비어 있음. 가드는 백엔드에서 동작하므로 API 호출(앱 인증 컨텍스트)로 동일 경로를 정확히 재현·검증함.

## 정적 검증

- `apps/api-server`: `tsc --noEmit` PASS
- `services/web-kpa-society`: `tsc --noEmit` PASS

## migration

운영 데이터에 원본 참조 QR 0건 → migration 불필요(선행 IR + 본 CHECK read-only 확인).

## 후속

- P3 `WO-O4O-QR-LANDING-TARGET-TYPE-TAG-V1` — store_qr_codes 에 target_kind 컬럼(사본/원본 구분 가독성·가드 강화) 권장.
- P4 `WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-SINGLE-EDIT-V1` — snapshot "보기"→편집(사본이라 안전).
- blocks-only content_hub 항목은 간이 HTML 직렬화로 사본화(텍스트 손실 최소화) — 대부분 body(HTML) 보유.
- broadcast(운영자 공지형 QR)는 별도 기능으로 분리(본 WO 미포함).
