# CHECK-O4O-KPA-STORE-QR-TARGET-SCOPE-B-PHASE-V1

> 기준 IR: [IR-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1](./IR-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1.md)
> 선행: A안([CHECK A-PHASE](./CHECK-O4O-KPA-STORE-QR-TARGET-SCOPE-A-PHASE-V1.md)) + 콘텐츠 허브 소스(커밋 `95ccfe50f`, WO-O4O-CONTENT-SAVE-MEANS-READY-GLOBAL-STANDARD-V1 §7.4)
> 작업: B안 1차 — QR 선택 모달 source 확장(블로그 추가). C안(`kpa_store_contents`)은 제외.
> 일자: 2026-06-25 / 범위: KPA 우선

---

## 1. 배경 — 동시 작업 정합

B안 착수 중 동시 세션 커밋 `95ccfe50f` 가 **콘텐츠 허브 소스 탭**을 먼저 구현했음을 확인했다.
방식: 공통 `StoreAssetSelectorModal` 에 opt-in prop `enableContentHubSource` 추가 → "운영자 콘텐츠"
(kpa_contents, status='ready') 소스 탭. C-1 참조형(`landingType='page'`, `landingTargetId=content.id`).

→ 별도 모달 신설 대신 **동일 opt-in 패턴 위에 블로그 소스만 추가**하는 것으로 정렬(중복 제거,
공통 모듈 변경 규칙 준수). 별도 모달 시제(QrTargetSelectorModal)는 폐기.

---

## 2. 변경 내용 (B안)

### 2-1. `components/store/StoreAssetSelectorModal.tsx`
- `AssetSource` 에 `'blog'` 추가, `AssetSelectorResult.source` 에 `'blog'` 추가.
- opt-in prop **`enableBlogSource`** 신설 (기본 false → 사이니지 등 다른 소비처 무영향).
- 소스 탭에 "블로그" 추가. `store_blog_posts`(`fetchStaffBlogPosts`) 전체 노출.
  - draft 포함 노출 + 상태 배지(발행/초안/보관) — QR=연결 대상 저장이므로 발행 시 정상 작동.
- 선택 시 결과: `source='blog'`, `assetType='blog'`, `url=공개 절대 URL`
  (`${origin}/store/{slug}/blog/{postSlug}`). store slug 는 `getStoreSlug()` lazy 조회.

### 2-2. `pages/pharmacy/StoreQRPage.tsx`
- 모달에 `enableBlogSource` 전달.
- `handleLibrarySelect`: `source='blog'` → `landingType='link'`, `landingTargetId=url` prefill.
- `handleCreate`: 블로그(`isBlogRef`)는 `libraryItemId` 미전송 (참조형, 사본 복사 없음).
- `ASSET_TYPE_LABELS` 에 `blog: '블로그'` 배지 추가.

### 제외 (C안 후속)
- `kpa_store_contents`(직접 작성 콘텐츠) — QR 랜딩 백엔드 미해석. 별도 WO.

---

## 3. 탭별 데이터 / QR 연결 (최종)

| 탭 | 데이터 | landingType | libraryItemId |
|---|---|---|---|
| 내 매장 자료 | `store_execution_assets` (file/content/link, generated 포함) | file/content→page, link→link | ✅ 전송 |
| 운영자 콘텐츠 | `kpa_contents` (status=ready) | page (targetId=content.id) | ❌ |
| 블로그 | `store_blog_posts` (전체, draft 포함) | link (targetId=공개 URL) | ❌ |

> "내 매장 제작자료" 중 AI 생성물(generated)은 이미 "내 매장 자료" 탭에 포함되어 별도 탭 불필요.
> 블로그만 별도 테이블이라 신규 탭으로 추가.

---

## 4. 검증

### 정적
| 항목 | 결과 |
|---|---|
| 타입체크 (`tsc --noEmit`, web-kpa-society) | ✅ PASS (에러 0) |
| 사이니지 회귀 (StoreSignagePage) | ✅ 무영향 (opt-in 미전달 → 기본 false) |

### 브라우저 smoke (배포 후 수행)
| 항목 | 상태 |
|---|---|
| QR 모달에 "내 매장 자료 / 운영자 콘텐츠 / 블로그" 탭 노출 | ⏳ 배포 후 |
| 블로그 탭에 기존 블로그 글(예: "테스트") 노출 | ⏳ 배포 후 |
| 블로그 선택 → `landingType='link'`, 공개 URL 저장 → `/qr/:slug` 스캔 시 블로그로 이동 | ⏳ 배포 후 |
| 운영자 콘텐츠 선택 → `page` inline 렌더 | ⏳ 배포 후 |
| 자료(file/link) 선택 → 기존대로 저장 | ⏳ 배포 후 |
| 사이니지 자산 선택 모달 정상(탭 미노출) | ⏳ 배포 후 |

---

## 5. 남은 작업 (후속)

- **C안** — `kpa_store_contents`(직접 작성 콘텐츠) QR 대상화. QR 랜딩 백엔드에 해석 추가 필요. 별도 WO.
- 배포 후 자산/블로그 보유 계정으로 A안·B안 데이터 의존 항목 통합 재검.
- GP/KCos 공통화는 KPA 안정화 후 별도 IR/WO.
