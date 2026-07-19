# CHECK-O4O-SCREEN-CONTENT-H1-H2-GAP-ANALYSIS-V1

> P1 설계 gap 분석. 확정된 H1·H2 정책([ADR-...-SCREEN-CONTENT-CORE-...-V1](../architecture/ADR-O4O-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1.md) 참조) 대비 **현재 코드·스키마가 얼마나 충족하는지** 조사.
> 성격: **read-only 조사**. 코드·DB 변경 0. P2 Core 추출은 범위 밖.

---

## H1 — 영구 Media Resource 참조 (현재 충족도)

| H1 규칙 | 현재 상태 | 충족 | file:line |
|--------|----------|:---:|-----------|
| 텍스트·설정·배치 = 값 복사 | content_json 전체 값복사 | ✅ | asset-copy.service.ts:124-134 |
| O4O 이미지/영상 = 영구 resource ID 참조 | **원문 GCS URL을 content_json에 직접 임베드**(resource-ID 간접참조 아님) | ❌ | kpa-asset.resolver.ts:190-194; store-content.controller.ts:439-442 |
| 원본 콘텐츠 삭제 ≠ 미디어 파일 삭제 | 콘텐츠 row 삭제는 미디어 미삭제(FK 없음). 단 미디어 자체 삭제 경로 존재 | ⚠️ 부분 | — |
| 원본 수정 시 새 Resource(덮어쓰기 금지) | 재가져오기=새 사본(create_copy). 미디어 파일 자체는 별개 | ✅(사본) / ❌(파일) | reimport-source endpoint |
| **사용 중(참조>0) 미디어 하드삭제 금지** | **ref-count 없음.** 미디어 라이브러리·상품이미지가 GCS 파일 **하드삭제** | ❌ | media-library.service.ts:380 `bucket.file(gcsPath).delete()`; admin.controller.ts:1287 deleteProductImage |
| 참조 0일 때만 정리 | 참조 카운트 개념 부재 → 조건 없이 삭제 가능 | ❌ | (ref_count/reference_count 컬럼 부재) |
| 외부(YouTube/Vimeo)=URL 참조, 복제 안 함 | idle_media 외부 URL 참조(유효성/재생실패 대체) | ✅ | store-tablet-idle-block.ts; WO-IDLE-VIDEO-URL-ONLY-V1 |

### H1 Screen Set 한정 노출(중요)
Screen Set이 실제 임베드하는 미디어는 좁다 → H1 전면 구현 전에도 태블릿 위험은 제한적:
- `idle_media` = **외부 URL**(H1 외부 분기, 이미 부합) ✅
- `content_list`/`product_list` = **소스 라이브 참조**(shared_product_descriptions/kpa_store_contents/product_images를 resolve 시점에 조회, Screen Set에 복사 안 함) — Screen Set은 바이너리를 안 가짐
- `corner_description.body` = RichTextEditor HTML, 내부 이미지가 GCS URL일 수 있음(유일 임베드 미디어)

→ **Screen Set의 미디어 깨짐 위험 = "소스(상품 이미지·RichText 업로드) 미디어가 참조 중 하드삭제될 때"**로 국한. 즉 H1의 실효는 "**소스 미디어 in-use 하드삭제 가드 + (선택) resource-ID 간접참조**".

### H1 Gap 요약 & 최소 범위
- **핵심 gap**: ①미디어 ref-count/in-use 하드삭제 가드 부재, ②resource-ID 간접참조 부재(원문 GCS URL 직임베드).
- **최소 후속(P1-H1-WO 후보)**: (a) 미디어 하드삭제 경로(media-library, deleteProductImage)에 **참조 사용 검사 게이트** 도입 또는 **GCS 객체 불변·soft-only 정책** 명문화. (b) resource-ID 간접참조는 F12 Product Resource(`/r/{id}`) 확장과 정합 검토 — **광범위**하므로 별도 데이터 아키텍처 WO. (c) 외부 미디어는 무변경(이미 부합).
- **판정**: H1 전면(resource-ID 재설계)은 규모 큼 → Screen Set 실효 기준 **"in-use 미디어 하드삭제 가드"부터** 좁게 시작 권장.

---

## H2 — Screen Set QR 종속 채널 (현재 충족도)

| H2 규칙 | 현재 상태 | 충족 | file:line |
|--------|----------|:---:|-----------|
| 생성 QR ensure 멱등 | `ensureScreenSetQr` 멱등(1 QR/set 부분 unique) | ✅ | store-screen-set-qr.service.ts:57; migration uq_sqc_screen_set_target |
| slug 불변(rename에도 유지) | rename은 title만, slug 불변 | ✅ | store-tablet.routes.ts:1334-1341 |
| slug 재사용 금지 | slug 전역 unique, 새 set=새 slug, 기존 재사용 안 함 | ✅ | store_qr_codes slug unique |
| **archived → QR is_active=false** | **미연결** — soft delete(deleted_at)만, QR row·public_qr_slug 그대로. 차단은 resolve 게이트(status<>archived)로만 | ❌ | store-tablet.routes.ts:1358-1385; resolve gate store-public-screen-set-resolve.ts:119-125 |
| **복원 → 동일 slug 재활성(is_active=true)** | 복원 시 QR is_active 토글 로직 없음(애초 false 설정 안 하므로) | ❌(미연결) | — |
| 영구 삭제 → QR tombstone 보존 | 하드삭제 경로 부재(soft only), QR row 유지 → de-facto tombstone(비명문화) | ⚠️ 사실상 | — |
| 비활성 QR 접속 → 명확한 종료 화면 | 현재 404 `SCREEN_SET_UNAVAILABLE`(전용 종료 화면 아님) | ❌ | store-qr-landing.controller.ts:309-335 |
| 편집·코너 적용/해제는 QR 활성 무영향 | QR is_active를 편집/적용이 건드리지 않음 | ✅ | — |
| 일반 QR 수동 활성/비활성과 별도 계약 | 일반 QR은 `is_active` 수동, Screen Set QR은 자동 추종(별 계약) | ✅(설계상) | — |

### H2 Gap 요약 & 최소 범위
- **충족**: 멱등 생성, slug 불변·재사용 금지, QR 편집/적용 독립, tombstone 사실상 보존.
- **핵심 gap(2개, 국소적)**:
  1. **archive/restore ↔ QR `is_active` 연결**: Screen Set archive 시 연결 QR `is_active=false`, 복원 시 `=true`. (현재 resolve 게이트로만 차단 → 명시 상태 반영 필요)
  2. **비활성 QR 종료 화면**: 404 대신 PublicScreenSetViewer/QrLandingPage에 **"종료된 화면입니다" 안내 화면**.
- **판정**: H2는 **범위 작고 국소적**(store-tablet archive/restore 훅 2곳 + 공개 뷰어 1곳) → **H1보다 먼저, 단독 최소 WO로 구현 가능**. 회귀 위험: archived-only 대상 엄수(활성 Screen Set QR 접근 영향 금지).

---

## 종합 판정 & 후속

| 결정 | 현재 충족 | 잔여 gap | 후속 규모 |
|------|:---:|---------|---------|
| **H1** 영구 media resource | 외부 URL ✅ / O4O 미디어 △ | ref-count·in-use 하드삭제 가드·resource-ID 간접참조 | 中~大(데이터 아키텍처). Screen Set 실효 기준 "in-use 하드삭제 가드"부터 |
| **H2** QR 종속 채널 | 대부분 ✅(멱등·slug·독립·tombstone) | archive/restore↔is_active, 종료 화면 | **小(국소)** — 우선 구현 후보 |

**권고 순서**:
1. **WO-P1a (H2, 소규모)**: Screen Set archive→QR is_active=false / restore→true 연결 + 비활성 QR 종료 화면. archived-only, slug 불변, 일반 QR 계약 무영향. (신규 테이블 0, 컬럼 0 — 기존 store_qr_codes.is_active 재사용)
2. **WO-P1b (H1, 좁게)**: 사용 중 미디어 하드삭제 가드(media-library/deleteProductImage에 참조 검사 또는 GCS soft-only 명문화). resource-ID 전면 재설계는 F12와 함께 별도 데이터 WO로 분리.
3. (이후) ADR §8의 P2~P5는 H1/H2 구현 후 착수.

**신규 테이블 신설은 계속 금지**(HOLD①). H1·H2 모두 **기존 컬럼(store_qr_codes.is_active)·기존 정책 명문화**로 해소 가능 범위부터 진행.

---

## 코드·DB 변경 0 확인
- 본 gap 분석은 read-only. 소스·마이그레이션·DB write 0. 산출물 = 본 CHECK + ADR H1·H2 반영.
