# CHECK-O4O-KPA-CONTENT-LIST-INLINE-QR-CREATE-V1

> 작업: **KPA 콘텐츠 목록에서 QR 만들기 바로 실행**
> 대상: `/store/library/contents` (StoreContentsSelector + 신규 StoreQrCreateModal)
> 작업일: 2026-06-26 / 상태: **코드 완료 · typecheck PASS · 배포 `3895d5cd9` · 운영 브라우저 smoke PASS**

---

## 1. 변경 요약

`/store/library/contents`에서 콘텐츠 1개 선택 → QR 메뉴로 이동하지 않고 **현재 화면에서 QR 만들기 모달**을 바로 연다. **frontend 전용**(기존 `createStoreQrCode` + 공개 landing 재사용, 백엔드/migration 없음).

| 파일 | 변경 |
|------|------|
| `components/store/StoreQrCreateModal.tsx` (신규) | 선택 콘텐츠를 initialTarget으로 받아 기존 `createStoreQrCode` 호출. 제목/slug/상담 CTA 입력. 완료 화면에 `/qr/slug` 링크 + "QR-code 목록 보기" |
| `pages/pharmacy/StoreContentsSelector.tsx` | ActionBar 'QR-code 만들기'(page 모드 전용). 1개+direct/execution-asset 선택 시 활성. 복수/snapshot 비활성+안내. 생성 성공 시 선택 해제 |

## 2. QR 모달 재사용/분리 방식
기존 `StoreQRPage`의 QR 생성 폼은 자산 선택 모달(StoreAssetSelectorModal) 의존이 커서 그대로 추출하지 않고, **동일 생성 계약(`createStoreQrCode`)을 재사용**하는 경량 모달을 신규 작성. `/store/marketing/qr` 의 기존 흐름은 무변경.

## 3. origin별 QR target mapping (공개 landing resolution 기준)

| 콘텐츠 origin | QR payload | 공개 landing 렌더 | 지원 |
|---|---|---|---|
| **direct** (kpa_store_contents) | `landingType='page'`, `landingTargetId=id`, libraryItemId 미전송 | landing Step1: `kpa_store_contents WHERE source_type='direct'` content_json 렌더 | ✅ |
| **execution-asset** (store_execution_assets) | `landingType='page'`, `libraryItemId=id`, landingTargetId 미전송 | landing Step2: `store_execution_assets.html_content` 렌더 | ✅ |
| **snapshot** (o4o_asset_snapshots) | — | 공개 landing이 o4o_asset_snapshots 미렌더 + 사본 신규 생성은 WO 금지 | ❌ 미지원(안내) |

> snapshot은 선택 시 'QR-code 만들기' 비활성 + "가져온 콘텐츠(운영자 제공/커뮤니티)는 QR-code 대상이 아닙니다. 내가 만든 콘텐츠/제작 자료를 선택해 주세요." 안내. (3 origin 전체 지원이 이상적이나, snapshot QR은 공개 landing 렌더 경로·사본 생성 정책상 본 WO 범위 외 — 후속.)

## 4. 선택 UI 동작
- 0개: 버튼 비활성. 1개(direct/exec): 활성. 1개(snapshot): 비활성+안내. 2개+: 비활성+"QR-code는 콘텐츠 1개를 선택해 주세요."
- page 모드 전용(`mode==='page'`) → 제작 자료 선택 모달(modal 모드)엔 미노출.
- 상단 퀵액션 "QR-code 만들기"(메뉴 이동)와 별개로, **ActionBar의 'QR-code 만들기'는 인라인 모달**을 연다.

## 5. QR 저장 범위 검증 (운영 DB read-only, org 9c87f46b)

| 테이블 | baseline | QR 2개 생성 후 | 결과 |
|---|---:|---:|---|
| store_execution_assets (content) | 3 | 3 | **신규 0** ✅ |
| kpa_store_contents (direct) | 5 | 5 | **신규 0** ✅ |
| o4o_asset_snapshots | 1 | 1 | **신규 0** ✅ |
| store_qr_codes (active) | 7 | 9 | **+2** ✅ |

- 새 QR 매핑 확인: direct QR = `landing_type=page, library_item_id=NULL, landing_target_id=<direct id>`; exec QR = `landing_type=page, library_item_id=<exec id>, landing_target_id=NULL`.
- direct content QR 생성 시 `ensureStoreCopyForPageTarget` 가드가 **사본을 만들지 않음**(content_hub 원본이 아니므로) → exec 신규 0 확인.

## 6. 운영 브라우저 smoke (renagang21 "테스트 약국", 배포 `3895d5cd9`)

| 검증 | 결과 |
|------|------|
| 기존 목록/검색/태그/출처 탭 회귀 | ✅ |
| direct(프리미엄 간 건강) 선택 → QR 버튼 활성 → 모달(대상·배지 "매장 직접 작성") → 생성 | ✅ |
| direct QR 공개 `/qr/smoke-inline-qr-250626` 본문 렌더(1464자) | ✅ |
| execution-asset(역노화) 선택 → 생성(payload `library_item_id=<exec id>`) | ✅ |
| exec QR 공개 `/qr/smoke-inline-qr-exec-250626` 본문 렌더(928자) | ✅ |
| 게이팅: snapshot 단독 비활성+안내 / 2개 비활성+안내 / exec·direct 활성 | ✅ |
| 기존 QR `/qr/3`(역노화, slug=3) 공개 URL 정상 | ✅ |
| 기존 `/store/marketing/qr` 메뉴(생성 버튼+목록) 회귀 | ✅ |
| 테스트 데이터 정리(QR 2개만 id 기준 삭제 → 9→7 복귀, exec/direct/snapshot 무변경) | ✅ |

## 7. 검증 기타
- `web-kpa-society` tsc --noEmit 오류 0. Web Cloud Run 배포 success. (backend 무변경 → api-server 배포 불필요)

## 8. 범위/안전
- QR 결과는 `store_qr_codes` 에만 생성. 콘텐츠 원본/제작자료 신규 생성 0. 기존 QR target/공개 URL 무변경. execution-asset legacy target 해석 무변경.
- **KPA 전용**(`createStoreQrCode`=`/api/v1/kpa/pharmacy/qr`) → GP/KCos 무영향. modal(제작 자료 선택)은 QR 버튼 미노출.
- QR AI 버튼 제거·POP·제작자료 메뉴 숨김은 본 WO에서 미수행.

## 9. 미해결/후속
- **snapshot inline QR 미지원**: 공개 landing이 o4o_asset_snapshots 미렌더 + 사본 신규 생성 정책상 보류. snapshot을 QR 대상화하려면 별도 설계(사본 변환 정책) 필요.
- 다음: 같은 패턴으로 `WO-O4O-KPA-CONTENT-LIST-INLINE-POP-CREATE-V1`.

---

## 10. 최종 판정

> `/store/library/contents`에서 콘텐츠(direct/execution-asset) 1개를 선택해 QR-code 만들기를 현재 화면에서 바로 실행하고, 선택 콘텐츠가 대상으로 미리 설정되며, 저장 결과는 store_qr_codes에만 생긴다(콘텐츠/제작자료 신규 0). direct/exec 공개 landing 정상 렌더, 기존 QR·QR 메뉴 회귀 없음.

→ **충족** (snapshot 미지원은 안내 + 후속).
