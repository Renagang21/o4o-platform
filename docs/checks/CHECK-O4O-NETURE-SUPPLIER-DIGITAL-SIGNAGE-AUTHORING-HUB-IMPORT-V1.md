# CHECK-O4O-NETURE-SUPPLIER-DIGITAL-SIGNAGE-AUTHORING-HUB-IMPORT-V1

> WO: `WO-O4O-NETURE-SUPPLIER-DIGITAL-SIGNAGE-AUTHORING-HUB-IMPORT-V1`
> 원칙: **상품의 분류와 콘텐츠 유통을 연결하지 않는다** — 의약품 여부 기반 콘텐츠 제한 0.
> Date: 2026-07-24 · commits `4fc3b1fbe`(본체) + `95bee6b51`(my-media 기존결함 fix) + `d53af9327`(사이드바 라벨)
> Deploy API+Web(neture) success · 프로덕션 smoke PASS

## 0. 결론 — ✅ PASS

공급자가 Neture `/supplier/signage` 에서 YouTube 연결 사이니지를 제작·미리보기·게시·보관하고,
게시(active) 즉시 **기존 KPA 매장 HUB(signage 축)** 에 노출되며, 매장은 **기존 asset-snapshot Full Copy**
로 독립 사본을 가져간다. **HUB 조회측·가져오기측 변경 0** (재사용만). migration 0.

## 1. 재사용한 기존 구조

| 축 | 재사용 |
|---|---|
| 모델 | `signage_media` 그대로 — `source='supplier'`, `serviceKey='kpa-society'`(HUB 축), `scope='global'`, 소유권=`createdByUserId`(캠페인 my-media 와 동일 축). 신규 테이블·컬럼 0 |
| 상태 | 기존 규칙 그대로: `draft→active(게시)→archived(보관)→draft(해제)` |
| HUB 노출 | 기존 `querySignageMedia`(source IN hq/supplier/community AND status='active' AND scope='global') — **변경 0** |
| 매장 가져오기 | 기존 `POST /kpa/assets/copy assetType='signage'`(Full Copy) + `resolveSignage` active 게이트 — **변경 0** |
| YouTube | `@o4o/types/signage` `extractYouTubeVideoId`/`getYouTubeThumbnail` 재사용(정규화·embedId·자동 썸네일) |
| 소유권 가드 | supplier-screen-set 컨트롤러의 `neture_suppliers ACTIVE` 패턴 재사용 |
| UI 컨벤션 | supplierScreenSets 클라이언트 패턴(BASE `/kpa/supplier/*`)·상태 라벨(게시 중/보관/작성 중)·사이드바 그룹 |

## 2. 신규 구현 (최소)

- 백엔드: `supplier-signage-media.controller.ts` — `GET/POST/PATCH /kpa/supplier/signage/media(/:id)` +
  `/:id/publish|archive|unarchive` + `DELETE`(soft; **active 직삭제 차단** — 캠페인 my-media 가 deletedAt 을
  안 보므로 보관 후 삭제 강제로 정합 유지). 잘못된 URL → 400 `INVALID_VIDEO_URL`.
- 프론트: `/supplier/signage`(목록·제작·수정·미리보기 모달·게시·보관), api client, 라우트, 사이드바 '디지털 사이니지'.
- **의약품 가드 없음**(연결 상품은 metadata 참고 정보일 뿐). 승인 절차·서비스 선택·migration 0.

## 3. smoke 중 발견한 기존 결함 수정 (1건)

캠페인 `/my-media` 가 **배포 이래 항상 500** — SQL 이 `created_at`(snake) 참조하나 signage_media 는
camelCase(`"createdAt"`). 공급자 생성 미디어가 없어 잠복. 2줄 수정(`95bee6b51`) → 200 정상.
(kpa_approval_requests 의 snake_case 참조는 그 테이블 스키마가 snake 라 정상 — 미변경.)

## 4. 프로덕션 smoke — ✅ 전 항목 PASS (renagang21)

- 잘못된 URL → 400 · 생성(draft, embedId=aqz-KE-bpKQ·자동 썸네일·source=supplier·kpa-society) 201.
- **draft: HUB 미노출 + 직접 가져오기 404** → 게시 → **HUB 노출(producer=supplier, 5→6)**.
- 캠페인 my-media: active 포함 → 보관 시 제외 (M0 200/M2 true/M3 true — 기존 계약 유지+복원).
- **매장 가져오기 201 Full Copy** → 원본 이름 수정+보관 → **스냅샷 원제목 유지(독립성)** ·
  HUB 기준 5로 복귀 · **보관 원본 직접 가져오기 404**.
- 브라우저: 사이드바 '디지털 사이니지' 링크→`/supplier/signage` · 폼 URL 입력 즉시 **YouTube iframe 미리보기** ·
  잘못된 URL 안내 · 빈 목록 상태 · console/pageerror 0. (실제 매장 재생 = 기존 스냅샷→store_playlists→
  SignageFullscreenPlayerPage 경로 그대로 — community 미디어와 동일 계약, 코드 무변경.)
- 무회귀: HQ·커뮤니티 HUB 목록 기준 5건 전후 동일 · 캠페인 요청 구조 무변경.
- 정리: 스냅샷 삭제 + 검증 미디어 soft delete → **활성 순증 0** (soft-deleted signage_media 2건 잔여).

## 5. 검증·배포

- typecheck: api-server(변경 파일) 0 · web-neture tsc 0 · vite build 성공. (union narrowing gotcha →
  NormalizedVideoSource flat 타입.)
- Deploy API Server ×2 · Deploy Web Services(neture) ×2 전부 success.

## 6. 변경 파일 (8)

```
apps/api-server/src/routes/kpa/controllers/supplier-signage-media.controller.ts  (신규)
apps/api-server/src/routes/kpa/kpa.routes.ts                                     (mount)
apps/api-server/src/routes/kpa/controllers/supplier-campaign-request.controller.ts (기존결함 2줄)
services/web-neture/src/lib/api/supplierSignage.ts                               (신규)
services/web-neture/src/pages/supplier/SupplierSignagePage.tsx                   (신규)
services/web-neture/src/App.tsx                                                  (라우트)
services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx               (사이드바)
docs/checks/CHECK-O4O-NETURE-SUPPLIER-DIGITAL-SIGNAGE-AUTHORING-HUB-IMPORT-V1.md
```

## 중지 조건 점검 — 전부 미해당

소유권 표현 가능(createdByUserId) · migration 0 · Full Copy 독립성 실측 · 캠페인 구조 무변경(결함 2줄 수정만) · 동시 작업 충돌 0.
