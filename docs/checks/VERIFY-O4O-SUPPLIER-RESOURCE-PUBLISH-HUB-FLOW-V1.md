# VERIFY-O4O-SUPPLIER-RESOURCE-PUBLISH-HUB-FLOW-V1

> 대상: `WO-O4O-SUPPLIER-RESOURCE-CURRENT-PUBLISH-AND-HUB-FLOW-PRESERVE-V1` (코드 `0289608d1` / CHECK `10714a7f4`)
> 성격: 검증 전용 — 코드 수정 0 · migration 0 · 신규 승인/서비스 선택 0.
> Date: 2026-07-23 · 계정 renagang21(공급자+약국)

## 1. 배포 확인 — ✅

- origin/main `10714a7f4` · 코드/CHECK 커밋 모두 ancestor 포함.
- Deploy run 30010315854(head=`0289608d1`) success. 서빙 리비전 `o4o-core-api-02820-n26` 이미지 digest `sha256:2f0ae355…` 가 해당 run 로그의 빌드 digest 와 **일치** → 프로덕션 = `0289608d1` 확정.

## 2. 변경 범위 — ✅

- diff-tree = 정확히 3파일(kpa-asset.resolver / supplier-content.service / store-qr-landing.controller). migration 0(커밋 메시지 "migration 0" 문구가 grep 오탐이었음 — 파일 목록으로 재확인). 신규 route/테이블/승인/서비스 선택 코드 0.
- 배포 코드 실측: `SERVICE_KEY='kpa'` · resolveCms `status:'published'` · resolveSignage `"status"='active'` · video QR `status='published'` 전부 존재. supplier-content 경로의 `kpa-society` 잔존은 **주석 2건뿐**(코드 0). 타 도메인 정상 사용처(알림 등)는 미변경.

## 3. 프로덕션 검증 (4.1 태블렛 full) — ✅ 전 항목 PASS

세트 `589f9a04`(원본) / `56181b51`(사본):
작성 201 → **빈 세트 게시 400 EMPTY_SCREEN_SET** → 블록 저장 → 게시 active → HUB 목록 노출 → 미리보기 200(blocks 1) → **가져오기 201 origin=store** → **독립성 양방향**(원본 이름 v2 변경→사본 v1 유지 / 사본 이름 변경→원본 v2 유지) → 원본 보관 → **목록 제외** → **보관 원본 import 404 SUPPLIER_TEMPLATE_NOT_FOUND** → **사본은 보관 후에도 active 유지** → 사본 공식 DELETE(soft)→404.
DB 실측: 사본 origin=store·supplier_id NULL ✅ · provenance(store_asset_derivations source=원본→derived=사본) 1 ✅ · import 시 QR 자동발급→사본 삭제 후 is_active=false(행 보존 = 기존 QR 생명주기 계약) ✅.

## 4. 경계 검증

| 항목 | 결과 |
|---|---|
| 비공개(draft) CMS 가져오기 | **404 SOURCE_NOT_FOUND** ✅ (게이트는 단일 `status='published'` 조건 — draft 차단이 비공개 전반 차단을 실증) |
| pending / archived CMS | **NOT_RUN_NO_DATA** (운영 rows 0 — 픽스처 미생성. 동일 게이트로 커버) |
| published CMS | HUB read `serviceKey=kpa&status=published` 노출 ✅ · 비공개 혼입 0 ✅ · 가져오기 201 Full Copy(assetType=cms) ✅ → 스냅샷 삭제(hard) net-0 ✅ |
| 쓰기·읽기 serviceKey 일치 | 쓰기 `SERVICE_KEY='kpa'`(정적) = 읽기 `'kpa'`(라이브) ✅ — 실제 공급자 제출 실행은 잔여(승인요청 row, 삭제 경로 없음) 없이 불가하여 **계약 검증(정적)** 으로 표기 |
| active 사이니지 가져오기 | 201 → 삭제 net-0 ✅ |
| 비활성 사이니지 차단 | **NOT_RUN_NO_DATA** (운영 전량 active 5 — 코드 게이트 배포 확인으로 대체, 미존재 id 404 sanity ✅) |
| video QR 상태 게이트 | **NOT_RUN_NO_DATA** (store_videos 0건) — 배포 코드 분기(`AND status='published'`) 실측 + tsc ✅. 존재하지 않는 대상=videoUrl null 계약 유지 |
| 의약품 경계 | 해당 가드 파일 미변경(diff-tree) + 2026-07-22 E2E(의약품 비약국 0) 유효 ✅ |
| GP/KCos | 변경 3파일 전부 KPA/매장 QR 경로 — 무접촉 ✅ |

## 5. 보존 검증 — ✅

`SUPPLIER_HUB_SERVICE_KEY='kpa'` 고정 · 공급자 직접 게시(승인 단계 0) · hubTargetStoreType=매장 유형 의미 · `CONTENT_APPROVAL_ENTITY_TYPES` = [hub_content_submission, signage_campaign_request] 불변(QR 승인 도메인 없음) · ProductMaster 고정 URL 무접촉 · Screen Set QR 생명주기(발급·inactive 토글) 실측 일치 · 값 복사+독립성 실측 · 허위 승인/서비스 선택 UI 0(프론트 변경 자체 없음).

## 6. 정적 검증 — ✅

typecheck(변경 3파일) 0 · 관련 unit test 부재(기존에도 없음 — smoke 로 대체) · diff 3파일 한정 · migration 0 · 신규 route/schema 0 · kpa-society 잔존 주석 2건뿐.

## 7. 운영 데이터 정리

- 생성: 원본 세트 1(589f9a04)+블록 · 사본 1(56181b51)+블록+QR 1+provenance 1 · 스냅샷 2(cms/signage).
- 삭제: 스냅샷 2 **hard delete**(rows 0) · 사본 공식 DELETE(soft).
- soft 잔여: 원본 589f9a04(archived) · 사본 56181b51(archived+deleted) · QR 1(is_active=false) · provenance 1. 기존 aa0c9ff9 는 **미접촉**(지시 준수).
- **활성 데이터·매장 사본 순증가 0** (active_sets 0 / active_qr 0 / snapshots 0 실측).

## 8. 최종 판정 — **PASS**

- NOT_RUN_NO_DATA 3건: pending·archived CMS / 비활성 사이니지 / video QR 상태 매트릭스 (운영 데이터 부재, 픽스처 미생성 원칙 준수 — 코드 게이트는 전부 배포본에서 실측).
- 발견 결함: 0. 후속 작업: 불필요(선택: 추후 비활성 사이니지·video 데이터 발생 시 런타임 재확인).
