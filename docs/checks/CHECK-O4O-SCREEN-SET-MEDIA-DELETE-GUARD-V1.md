# CHECK-O4O-SCREEN-SET-MEDIA-DELETE-GUARD-V1

> WO-P1b (ADR H1, 좁게): 미디어 라이브러리 하드삭제 경로에 **Screen Set 사용 가드** 추가.
> 전면 media resource-ID 전환 없음. 신규 ref-count·테이블·컬럼·migration 없음. 기존 Usage Trace 매처 재사용.

---

## 1. 조사 — 기존 Usage Trace 체계 재사용

- 미디어 삭제: [media-library.service.ts](../../apps/api-server/src/modules/media/services/media-library.service.ts) `deleteAsset()` → GCS `bucket.file(gcsPath).delete()` + DB `repo.remove`. **삭제 전 가드 없었음**.
- 기존 사용추적: `getUsage()`(:285) + **`htmlReferencesResourceUrl(html, url)`**(:21) — HTML 의 img/video/source `src` **완전일치**(iframe/YouTube 제외, 본문 텍스트 언급 제외). WO-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1.
- → 이 매처를 **Screen Set 블록에 재사용**하고 `deleteAsset` 에 가드 추가(신규 체계 신설 아님).

## 2. 구현 (신규 테이블·컬럼·ref-count·migration 0)

### 변경 파일
| 파일 | 변경 |
|------|------|
| [media-library.service.ts](../../apps/api-server/src/modules/media/services/media-library.service.ts) | `screenSetUsageCount(url)` 신설 + `deleteAsset` 가드(사용 중이면 GCS/DB 아무것도 안 지우고 throw) |
| [media-library.controller.ts](../../apps/api-server/src/modules/media/controllers/media-library.controller.ts) | 가드 에러 → **409 `MEDIA_IN_USE_SCREEN_SET`** + 문구 |

### 가드 로직
- `deleteAsset`: GCS/DB 삭제 **이전에** `screenSetUsageCount(asset.url) > 0` 이면 삭제 거부(아무것도 안 지움).
- **`screenSetUsageCount(url)`**:
  - coarse: `store_tablet_screen_blocks b JOIN store_tablet_screen_sets s WHERE b.config::text ILIKE '%url%'` — **status·deleted_at 무관(물리적으로 남아 있는 모든 세트)**. active 만 검사하지 않음 — 보관/복원 가능 사본도 보호.
  - precise: **정규화 URL 완전일치**(단순 부분검색 아님):
    - corner_description/health_info `config.body`(HTML) → `htmlReferencesResourceUrl`(img/video/source src 일치)
    - idle_media `config.items[].url` → url 완전일치
  - 외부 YouTube/Vimeo: media-library 자산은 GCS url 이라 youtube/vimeo url 과 매치되지 않아 **자연 제외**.
- 삭제 거부 문구: **"이 미디어는 타블렛 콘텐츠에서 사용 중이므로 삭제할 수 없습니다. 사용 중인 콘텐츠에서 먼저 제거해 주세요."**

### 설계 결정
- **모든 물리 Screen Set 검사(deleted_at 무관)**: WO 명시 "리스트에서 제거된 콘텐츠도 복원될 수 있으므로 물리적으로 남아 있는 사본이 참조하면 보호". → active/보관/tombstone 어느 것이든 URL 참조 시 보호(과보호가 데이터 손실보다 안전).
- **원본 콘텐츠 삭제 후에도 매장 사본 참조 보호**: 가드는 미디어 URL ↔ Screen Set 블록만 보므로, 원본(kpa_contents 등) 삭제와 무관하게 **매장 Screen Set 사본이 참조하면 삭제 거부**.

## 3. 범위/제외
- 대상: **media-library `deleteAsset`**(RichText 업로드 등 GCS 자산). 
- 제외(별개 경로): `admin.controller.deleteProductImage`(상품 이미지) — Screen Set 은 상품 이미지를 content_list/product_list 로 **라이브 참조**(복사 아님)라 별도 개념. 이번 WO 범위 밖(필요 시 후속).
- resource-ID 전면 전환·ref-count 컬럼 없음(H1 좁은 실효만).

## 4. 검증
| 항목 | 결과 |
|------|------|
| api-server typecheck (내 2파일) | ✅ 오류 0 |
| deleteAsset 호출부 | 컨트롤러 1곳(:239)만 → 409 매핑 완료, 회귀 없음 |
| 매처 신뢰도 | 기존 프로덕션 `htmlReferencesResourceUrl` 재사용(검증된 완전일치) |
| 라이브 스모크 | ⏳ 배포 후(operator 권한 + 미디어·Screen Set 참조 setup 필요) — 미디어 삭제 시 참조 세트 있으면 409, 참조 제거 후 삭제 성공. |

## 5. 산출물
- 변경 파일 2 + 본 CHECK. **migration 0, 신규 컬럼·테이블·ref-count 0**. commit=(아래) / 배포 후 스모크.
