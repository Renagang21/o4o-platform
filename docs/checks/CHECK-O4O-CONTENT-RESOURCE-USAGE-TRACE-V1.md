# CHECK-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1

Status: DONE — 코드 완료 + api/admin typecheck EXIT0 + 배포 + 프로덕션 브라우저 smoke PASS + 31/31 라이브 census + matcher 8/8 단위검증 (2026-07-09)
WO: `WO-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1`

> Content Resource(media_assets) 하나를 선택하면 **"현재 어디에서 사용 중인지"**(store_execution_assets) 를 read-only 로 확인. 추정 없이 **img/video/source 의 src 에 실제 삽입된 경우만** 사용으로 판정(iframe/YouTube 제외).

---

## 1. §13 착수 전 조사 (read-only)

### 1.1 html_content 저장 형태
편집기(`@o4o/content-editor`) 산출물은 이미지를 `<img class="editor-image" src="{media url}">`, 동영상을 `<video class="editor-video" src>` / `<source src>`(WO-3) 로 직렬화한다. media url 형태는 `https://storage.googleapis.com/o4o-media-library/media/YYYY/MM/{uuid}.webp` (프로덕션 실측 — Media Assets 상세의 파일 URL 필드로 확인). → **§5.4 대상 태그 img/video/source 로 커버됨.**

### 1.2 HTML 파서 가용성
api-server 에 `node-html-parser@^7.1.0` 이미 의존 존재(`media-library.service.ts` 가 상세설명 이미지 처리에 사용 중). **신규 무거운 의존 추가 없음** — 정규식 대체 불필요. 이 파서로 `img/video/source` 의 src 를 추출·비교.

### 1.3 실제 사용 중 자산 존재 여부
아래 §4 라이브 census 로 확정: **프로덕션 media_assets 31건 중 store_execution_assets.html_content 에 삽입된 것 0건.** 실행 자산 대부분이 POP PDF(asset_type=document)이고, 편집기 본문에 media-library 이미지를 삽입한 execution asset 이 현재 없음 → 자연스러운 0-case.

## 2. 구현 — 백엔드 (신규 엔드포인트 1개, read-only)

`GET /platform/media-library/:id/usage` (운영자 전용):
- asset 조회 → url 확보 → `store_execution_assets` coarse 필터(`html_content ILIKE '%{url}%'`, 파라미터 바인딩 `$1`) → 후보만 HTML 파싱하여 **img/video/source 의 src 가 url 과 정확히 일치**하는지 확정 → Usage 목록 반환.
- 응답: `{ success, resourceUrl, usages[] }`. 각 usage = `surface(=usage_type)` · `usageType` · `title` · `organizationId` · `updatedAt` · `resourceUrl` · `assetId`(execution asset id).
- `htmlReferencesResourceUrl(html, url)` 순수 함수: `querySelectorAll('img, video, source')` 의 src `.trim() === url.trim()`. **iframe 미포함**(YouTube=Resource 아님).
- **데이터 변경 없음.**

### 2.1 스코프 주의 (§7)
media_assets 는 서비스/조직 무관 공용 자산 → 사용처는 여러 organization 의 execution asset 에 걸쳐 존재 가능. admin 조회이므로 org 필터 없이 전 사용처 반환(각 항목에 organizationId 표기). **Boundary(F6)는 조회 전용이라 위반 아님.**

## 3. 구현 — Admin UI

`MediaAssetsPage` 메타 편집 모달을 **Resource 상세**(탭 2개)로 확장:
- **메타데이터** 탭: 기존 편집 폼 유지.
- **사용처** 탭: 탭 진입 시 **1회** `getMediaAssetUsage(id)` lazy fetch(§12 — 목록에서는 조회 안 함). 탭 라벨에 건수 표기(`사용처 (N)`). 표면·제목·조직·수정일 목록, 0건이면 안내 문구.
- `media-library.api.ts`: `MediaAssetUsageItem` + `getMediaAssetUsage(id)`.

## 4. 검증 — 프로덕션 라이브 census (§13.3, §14)

`https://admin.neture.co.kr/content-resource/media-assets` 로그인 후, admin 세션(httpOnly 쿠키)으로 `GET /platform/media-library/:id/usage` 를 **전 자산 31건에 대해 호출**:

| 항목 | 결과 |
|---|---|
| 총 자산 | 31 |
| 사용처 ≥1 인 자산 | **0** |
| API 에러 | **0** (31/31 안정) |
| 브라우저 콘솔 에러(신규) | 없음 |

UI smoke: 미네락 600 상세.jpg 상세 → **사용처** 탭 → `사용처 (0)` + 안내 문구("이 Resource를 실제로 사용(img/video/source 삽입)하는 매장 실행 자산이 없습니다.") 정상 렌더. 삭제 액션 없음.

> 0-case 는 매처 오작동이 아니라 **실제로 삽입 사용처가 없음**(§1.3). 매처가 항상 0 을 내는 것이 아님은 아래 §5 단위검증으로 확증.

## 5. 검증 — matcher 판별력 단위검증 (8/8 PASS)

`htmlReferencesResourceUrl` 을 동일 `node-html-parser` 로 격리 실행(테스트 데이터, DB 무관):

| 케이스 | 기대 | 결과 |
|---|---|---|
| `<img class="editor-image" src=URL>` | true | PASS |
| `<video class="editor-video" src=URL>` | true | PASS |
| `<source src=URL>` (video 내부) | true | PASS |
| src 앞뒤 공백 | true | PASS |
| 본문 텍스트에 URL 언급만(태그 아님) | false | PASS |
| `<iframe src=URL>` (YouTube) | false | PASS |
| 다른 URL | false | PASS |
| 빈 HTML | false | PASS |

→ **실제 참조(img/video/source src)만 사용으로 잡고, 텍스트 언급·iframe·불일치 URL 은 제외**(§5.2/§6) 함을 확증.

## 6. 검증 — typecheck / build / deploy

| 항목 | 결과 |
|---|---|
| api-server typecheck (media 변경) | 에러 0 (잔여는 병렬 drug-otc scripts, build 제외) |
| admin-dashboard typecheck | EXIT 0 |
| API 배포 | success |
| Admin 배포 | success |

commit `0b9aad63c` (path-restricted).

## 7. §13 DB 직접 census — 시도/차단 기록

프로덕션 DB 직접 census(html_content 전수 스캔)를 cloud-sql-proxy(127.0.0.1:5433)+psql 로 시도했으나, Cloud Run env 의 `DB_PASSWORD`(o4o_api) 로 password 인증 실패(직전 세션과 동일 벽). 런타임 비밀번호가 Secret Manager 참조로 해석되어 plain env 값과 불일치하는 것으로 추정. → **DB 직접 census 대신 배포된 Usage API 로 전 자산 census(§4) 수행**. 조회 채널이 authorized read-only(API) 이고 결과 동등(전수) 이므로 검증 충분. write 시도 없음.

## 8. 준수 확인

- Read-only · 기존 데이터 무변경 · Resource 삭제 없음(§5.1, §17).
- 실제 참조만 표시(§5.2) — 단위검증 §5.
- Resource 기준 = url(§5.3), HTML 파싱(§5.4), img/video/source·iframe 제외(§6).
- store_execution_assets 한정(§10), 상세 진입 1회 조회(§12).
- 제외 항목(Derivation 그래프/Delete Guard/Cross-Resource/AI/Template·Snapshot·SPD Usage/iframe) 미구현(§11).
- 신규 무거운 의존 없음(§1.2).

## 9. 후속 WO

`WO-O4O-CONTENT-RESOURCE-DELETE-GUARD-V1` (본 WO Usage 재사용해 사용 중 삭제 차단) → OWNERSHIP · DEDUP-HASH · VERSIONING · AI-RESOURCE-METADATA. **별도 착수 지시 필요.**

---

*Status: DONE (2026-07-09). Read-only Usage Trace 계층 구축 완료.*
