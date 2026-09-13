# CHECK-O4O-MINEROCK600-VIDEO-PILOT-RESET-AND-ASSET-PREP-V1

> **WO**: `WO-O4O-MINEROCK600-VIDEO-PILOT-RESET-AND-ASSET-PREP-V1`
> **상태**: ASSET-PREP DONE — 신규 VIDEO Job 생성 · 기존 자산 census · 공통 설명 그래픽 초안 12건 등록 · INPUT 2 / INTERMEDIATE 12 연결. **최종 영상 미제작(범위 밖)**. Product Master 고해상도 원본과 약사 캐릭터 선택은 사용자 입력 대기(§12·§13).
> **작성일**: 2026-09-13
> **성격**: O4O 기반(Media Library V2 · VIDEO Job · temp output) 위에서 미네락600 파일럿을 **처음부터 다시 시작**하는 준비 작업. 코드·schema·CI 변경 없음. 등록은 전부 production API(`platform:super_admin` smoke 계정, 쿠키 인증)로 수행.

---

## 1. Git 상태

- 시작: `main` = `origin/main` = `5e2bfbc81` (0/0). 다른 세션 dirty 2건(`docs/investigations/IR-O4O-CROSSSERVICE-…VERIFY-V1.md` 수정, `output/` 미추적) — 접촉하지 않음.
- 이번 WO 산출: 본 CHECK + `scripts/media/minerock600-pilot/build_graphics.py`(공통 그래픽 생성기, Python/PIL, 의존성 추가 없음).

## 2. 신규 VIDEO Job

| 항목 | 값 |
|---|---|
| **Job ID** | **`8a357640-ad64-42f3-ae4c-43519ce78222`** |
| 제목 | `MINEROCK600 설명형 판매영상 파일럿` |
| 상태 | `DRAFT` · statusNote `자산 준비 단계 — INPUT 2 · INTERMEDIATE 초안 12 연결. Product Master 고해상도 정면 원본·약사 캐릭터 선택 대기` |
| instructions | WO §12 문안 그대로 |
| Admin | `https://admin.neture.co.kr/automation/video-jobs/8a357640-ad64-42f3-ae4c-43519ce78222` |
| tempOutput | `NONE` (완성 영상 없음 — 설계대로) |

## 3. Codex 잔여물 조사 (삭제·변경 없음)

| 대상 | 판정 | 근거 |
|---|---|---|
| VIDEO Job `f7d74952-da6e-48ad-9472-bbfdd60fbc7c` "MINEROCK600 12편 설명형 판매영상 파일럿" (DRAFT, 2026-09-13 11:34Z, INPUT 1) | **TEST/ABANDONED** (신규 Job `8a357640` 로 대체) | 이어받지 않는다는 WO 원칙. 삭제 endpoint 없음. **권고**: 사용자 판단으로 `CANCELLED` + statusNote "superseded by 8a357640" 처리(PATCH 1회). 이 Job 의 INPUT 링크(asset `215592fd`)는 남아 있어도 신규 Job 연결과 충돌하지 않음 |
| `[SMOKE] 미네락600 제품 설명영상` `e9b943d3…` (COMPLETED, tempOutput AVAILABLE, 2026-09-14T15:32Z 만료) | **TEST/ABANDONED** | P0/TTL smoke 잔여. TTL 자연 만료 관찰용(선택). 미네락 파일럿과 무관 |
| `[SMOKE-TTL]` `fc2ee48a…` · `[SMOKE-TEMP]` `9980b5ad…` · `[SMOKE] 인바디` · `[SMOKE] 외국인` (전부 CANCELLED) | **TEST/ABANDONED** | smoke 잔여 |
| Media 메타데이터 — Codex 가 `215592fd`(title/tags/status=APPROVED/usageType=INPUT/description/memo) · `c54ea10d`(title/tags/status=REVIEW/usageType=REFERENCE/description) 편집 | **KEEP** | 내용이 정확하고 신규 Job 에 그대로 유효. 재작성하지 않음 |
| 로컬 `output/minerock600-p1/` (미추적, 4.6 MB: PNG/SVG 그래픽 8종 + `presenter-a-review.png` + `product-*-source.webp` + `build_graphics.py` + README/manifest) | **UNKNOWN → 보존** | 다른 세션 소유 미추적 파일. 조사만 함. Media Library 에는 **미등록**(README: 업로드 실패로 대기). 이번 파일럿은 이를 재사용하지 않고 §8 그래픽을 새로 만들었다. 정리 여부는 사용자 판단 |
| Codex 의 abandoned intermediate asset / incomplete link | **없음** | production Media Library 에 Codex 신규 업로드 0건, `f7d74952` 링크는 INPUT 1건뿐 |

## 4. 기존 미네락 관련 Media Library 자산 census

production 전수 50건(`page=2` 빈 응답으로 확인) 중 제목·태그·파일명·내용으로 판별. 키워드 검색(`미네락`·`미네락600`·`MINEROCK`·`minerock`·`해양심층`·`암반수`)은 메타데이터가 있는 2건만 hit — 파일명만 있는 자산은 검색에 잡히지 않는다(§14 참고).

| ID | 파일 | 크기 | 판정 | 비고 |
|---|---|---|---|---|
| `215592fd-1a89-4db6-b716-0b78234c2b83` | `minerock-s.jpg` (2026-04-02, general) | 500×500 webp | **USE** (identity anchor INPUT) | 광고 합성 이미지 안의 정면 병. 텍스트·잎 장식 포함 → 독립 cutout 아님. 확대 사용 한계 |
| `c54ea10d-9f04-412e-846d-a912ea113032` | `미네락 600 상세.jpg` (2026-06-27, description) | 239×1200 webp | **USE** (공식 공개 상세페이지 REFERENCE → INPUT) | Ca 86.2~129.4 / Mg 61.6~92.4 / K 5~10, "동해 1,050m 암반수" 문구 출처. 저해상도(업로드 경로 1200px 축소) |
| `e961f8ed-…` | `minerock600.jpg` (2026-04-27) | 239×1200, 51,822 B | **DUPLICATE** | `c54ea10d` 와 **SHA-256 동일** |
| `f400bd30-…` | `image.png` (2026-06-27) | 239×1200, 51,874 B | **DUPLICATE**(근사) | 바이트 상이하나 동일 상세페이지 재업로드 |
| `4ab9cf4b-…` | `item600_1000a.jpg` (2026-04-02) | 228×1200 | **DUPLICATE**(변형) | 상단 헤더가 있는 동일 상세페이지 변형 |
| `1ffd36f0-…` | `해양 심층수 효능 POP.pdf` (kpa/pop) | 9 KB | **REJECT** | 매장 POP. "효능" 표현·근거 검수 미완 → 영상 자산으로 전용하지 않음 |
| `7af6fce7-…` · `d706ac7e-…` | `해양 심층수 POP.pdf` ×2 (kpa/pop) | 4 KB | **REJECT** | POP 스모크 잔여(동일 크기, 바이트 상이) |
| `8451c9c7-…` | `해양 심층수 음용수 가치.pdf` (kpa-society/resources) | 318 KB | **UNKNOWN** | 외부 문헌. 재사용 권리 미확인 → 등록·연결 안 함 |
| `81718aa6-…` | `해양 심층수 움용수와 이의 용도 알츠하이머 등.pdf` (kpa-society/resources) | 595 KB | **REJECT** | 질환 표현 포함 문헌. 판매영상 자산으로 부적합 |

CLEANUP(중복 3건 삭제)은 하지 않았다 — 삭제는 DB write, 사용자 승인 대상. 어느 것도 `store_execution_assets` 사용처 없음(`/usage` 0).

## 5. Product Master 선정 결과

- **사용자가 제공한 실제 제품 이미지가 이번 세션에 없다.** 따라서 Master 는 **잠정** 선정: `215592fd` (기존 500×500 정면, 파란 뚜껑·MINEROCK 로고·라벨·`1000 mL` 표기 확인). 분류(이미 저장됨): `folder=general · assetType=image · usageType=INPUT · status=APPROVED · serviceKey=null(service-neutral)` · tags `minerock600, product-front, bottle, master`.
- 한계: 광고 합성본(문구·잎 장식 포함), 500px. 영상 hero/클로즈업용 고해상도 정면 원본 필요 → **§13-1**.
- Codex 의 AI cutout 시도는 라벨 왜곡(`10 kcal`→`0 kcal`)으로 불합격 기록. 이번에도 **AI 재생성 cutout 은 만들지 않았다** — 실제 픽셀 보존 원본이 먼저.

## 6. 제품 보조자산 계획

| # | 자산 | 판정 | 비고 |
|---|---|---|---|
| A | 실제 정면 Master | **EXISTING(잠정)** `215592fd` / 고해상도 원본은 **NEEDS 사용자 제공** | |
| B | 투명 배경 Cutout | **NEEDS_EDIT** | A 고해상도 원본 확보 후 배경 제거(라벨 픽셀 보존 방식만 허용, AI 재생성 금지) |
| C | 광고용 Hero Scene | **NEEDS_GENERATION** | B 확보 후. `derivationType=generated-scene`, parent=B |
| D | 자연/심층수 Scene | **NEEDS_GENERATION** | 실사 계열. 초안 개념도는 §8 `east-sea-bedrock-concept` 로 대체 가능 |
| E | 약국 사용 Scene | **NEEDS_GENERATION** | 약사 캐릭터(§7) 결정 후 |

## 7. 한국인 여성 약사 후보 (최대 3 · 결제·로그인 없음 · 공개 문서 기준)

| 서비스 | avatar/character ID | 무료 | 한국인 자연스러움 | 한국어 lip-sync | 상업 사용 | 반복 사용 |
|---|---|---|---|---|---|---|
| HeyGen (Avatar IV, 스톡 1,100+) | **미확정** — 로그인 없이 개별 ID 확인 불가 | Free 월 3편·1분·워터마크 / Creator $29·600 credits | 스톡에 동아시아 인물 다수(개별 검증 없음) | 175개 언어·자동 lip-sync 안내(실청취 없음) | 스톡 상업 조건 pricing 페이지에 명시 없음 → 약관 확인 필요 | 스톡 재사용 가능 |
| Synthesia (스톡 120+) | **미확정** | Free 720p·소수 스톡 | 실제 배우 기반(동의 촬영) | 160+ 언어 | **스톡 avatar 는 유료 광고·"any form of paid promotion" 금지**(웹사이트 제품영상은 허용) → 판매영상·매장 재생 용도는 **리스크** | 가능 |
| DeepBrain AI Studios (한국 기업, 스톡 100+) | **미확정** | Free 3편 / Starter $30 | 한국 기업으로 **동아시아·한국인 스톡 강점** | 한국어 TTS 자국어 | 표준 플랜 커스텀 avatar 불가, 스톡 상업 조건 미확인 | 가능 |

**판정**: 세 서비스 모두 로그인 전에는 개별 avatar ID·라이선스 확정 불가. 시리즈 12편 일관성 + 권리 통제 + 약국 톤 관점에서 **`O4O 한국 여성 약사 A` 를 AI 로 직접 제작(이미지 → 말하는 avatar 는 HeyGen/DeepBrain 의 photo-avatar 기능으로 2차 검증)** 을 1순위 권고. Codex 의 `presenter-a-review.png`(로컬, 미등록)는 참고용 후보로 사용자 검토 가능하나 이번 파일럿은 이어받지 않는다. **결정·결제는 사용자 몫.**

## 8. 공통 설명자산 Inventory

이번 세션에서 **직접 그린 도형+텍스트**(외부 저작물·제품 사진 미사용)로 초안 제작. 원본 1920×1080 PNG (`C:\tmp\minerock600-pilot\png\`) · 생성기 `scripts/media/minerock600-pilot/build_graphics.py` (`python build_graphics.py` 로 재생성).

| 자산 | 판정 | 에피소드 | 구분 | 이번 등록 |
|---|---|---|---|---|
| Na / K / Mg / Ca 아이콘 (세트 + 개별 512 투명) | CREATE → 등록 | EP02·03·05·06·07·09 | COMMON_REUSABLE | ✅ 5건 |
| 세포 기본도 | CREATE → 등록 | EP07·08 | COMMON_REUSABLE | ✅ |
| Na-K pump 기본도 (3 Na out · 2 K in · ATP) | CREATE → 등록 | EP07 | COMMON_REUSABLE | ✅ |
| 물/전해질 그래픽 | CREATE → 등록 | EP08·10·11 | COMMON_REUSABLE | ✅ |
| 신장 기본도 | CREATE → 등록 | EP09 | COMMON_REUSABLE | ✅ |
| 경도 scale (300 vs 600) | CREATE → 등록 | EP03 | MINEROCK 전용 | ✅ |
| 동해 · 1,050m 암반수 concept | CREATE → 등록 | EP01·04 | MINEROCK 전용 | ✅ |
| Na 섭취 경로 (가공식품·외식·배달·빵·시리얼·통조림) | CREATE → 등록 | EP05 | COMMON_REUSABLE | ✅ |
| 동해/심층수 실사 이미지 | CREATE (실사·AI 생성) | EP01·04 | MINEROCK 전용 | ⏸ 미착수 |
| 운동/땀 장면 | CREATE (실사·AI 생성) | EP10 | COMMON_REUSABLE | ⏸ 미착수 |
| 음주 다음날 일반 장면 | CREATE (실사·AI 생성, 숙취 치료 소구 금지) | EP11 | COMMON_REUSABLE | ⏸ 미착수 |
| 일반 음료/물 imagery · 비교 그래픽 | CREATE | EP02 | COMMON_REUSABLE | ⏸ 미착수(아이콘 세트로 일부 대체) |
| 약국 매대 · CTA 화면 | CREATE | EP12 | MINEROCK 전용 | ⏸ 미착수 |

표현 가드: 전 그래픽 하단에 "개념도 · 함량/효능 아님 · 실제 해부/지질/축척 아님" 문구. 1,050m 는 해양 수심이 아닌 **암반수** 로만 표기(공개 상세페이지 원문). 질환·치료 표현 없음.

## 9. 이번에 Media Library 에 새로 등록한 asset (12건)

공통 저장값: `folder=production`(Category=PRODUCTION) · `assetType=image` · `status=DRAFT` · `source=operator` · `language=ko` · `serviceKey=null`(service-neutral) · `isLibraryPublic=true` · catalog `originType=original · qaStatus=PENDING · productAccuracyLevel=SUPPORT_ONLY · rightsType=o4o-original · commercialUseAllowed=true · attributionRequired=false`. memo 에 `Category/MediaType/Purpose/Scope/Visibility` 요청 분류를 기재(전용 필드 없음, §14).

| 파일 | Asset ID | 저장 크기 | usageType |
|---|---|---|---|
| mineral-icon-set | `1f44b173-3fad-4e93-9614-ad6b9793c33f` | 1200×675 webp | REUSABLE |
| mineral-Na | `751094e5-fbbf-4635-9ac9-ef8471290f3b` | 512×512 webp(alpha) | REUSABLE |
| mineral-K | `c3d9c88a-d21b-4bd9-bf81-af3372a98529` | 512×512 webp(alpha) | REUSABLE |
| mineral-Mg | `290bcb78-f813-4201-b5ef-5a6acfb49ffe` | 512×512 webp(alpha) | REUSABLE |
| mineral-Ca | `a14da6fb-7385-41ae-85de-a7bc6de5747a` | 512×512 webp(alpha) | REUSABLE |
| cell-base | `cde49572-cfe5-4c82-b0a1-dd56cbefbe8b` | 1200×675 | REUSABLE |
| na-k-pump | `a247a363-b388-4f2d-a7f4-35b05f93ac4e` | 1200×675 | REUSABLE |
| water-electrolyte | `48d3d96b-3aa9-4e8c-9ca4-2284927c5f63` | 1200×675 | REUSABLE |
| kidney-base | `10e9c981-4a9c-45b7-bdad-d793e374611a` | 1200×675 | REUSABLE |
| hardness-scale | `82361d60-da4c-4a25-af9b-3cf8e14836e8` | 1200×675 | INTERMEDIATE |
| east-sea-bedrock-concept | `d663c76e-f0d2-43c8-82cb-6660766cd067` | 1200×675 | INTERMEDIATE |
| sodium-sources-flow | `5ec33ff4-6b8a-4ae0-bd57-fae8b3de2f6d` | 1200×675 | INTERMEDIATE |

## 10. VIDEO Job INPUT (2)

| Asset | linkId |
|---|---|
| `215592fd` 실제 제품 Master(잠정) | `37df8357-b59d-45a7-81dd-d63289abdb78` |
| `c54ea10d` 공식 공개 상세페이지 | `2e9ea7a4-525a-445d-ba13-68154f524f4e` |

## 11. VIDEO Job INTERMEDIATE (12)

§9 의 12건 전부 `purpose=INTERMEDIATE` 로 연결(linkId `ca34479b…`, `10f8de0d…`, `5d603ff5…`, `a8db1b60…`, `f219069a…`, `75ea67f5…`, `7c105df3…`, `96bde11a…`, `9e71c2d8…`, `94cdcc3d…`, `e2fdb981…`, `f2332e46…`). 재사용 자산(REUSABLE)도 이 Job 안에서는 INTERMEDIATE(§19 규칙).

## 12. 실패 / 보류 자산

| 항목 | 상태 | 사유 |
|---|---|---|
| Product Master 고해상도 정면 원본 | **보류(사용자 제공 대기)** | 세션에 실제 제품 이미지 미제공. 기존 자산은 전부 광고/상세페이지 합성본 |
| 투명 배경 Cutout | 보류 | 위 원본 없이는 라벨 픽셀 보존 불가. AI 재생성은 라벨 왜곡(Codex 기록)으로 금지 |
| 약사 캐릭터 | 보류(사용자 선택) | §7. 결제·계정 없이 개별 ID 확정 불가 |
| 실사 계열 scene 5종(§8 ⏸) | 미착수 | 외부 생성 서비스 필요 → 이번 단계 범위 밖 |
| Media Library 중복 3건 삭제 | 미실행 | DB write — 사용자 승인 필요 |
| Codex Job `f7d74952` CANCELLED 처리 | 미실행 | 판정만(§3). 사용자 승인 후 PATCH 1회 |

## 13. EP01 제작 전 추가로 필요한 것

1. **실제 제품 고해상도 정면 사진**(가능하면 2000px+, 무배경 또는 단색 배경) — 사용자 제공. 받는 즉시 Master 교체 + Cutout 제작.
2. 약사 캐릭터 결정(§7) — 직접 제작 시 이미지 1장 확정 → 말하는 avatar 서비스 1곳 선택(로그인·결제는 사용자).
3. EP01 내레이션 대본 확정(핵심 메시지: 해양심층암반수 + 경도 600 + 물처럼 마시는 고미네랄 음료).
4. 그래픽 1080p 원본 사용 경로 확정 — **Media Library 일반 업로드는 1200px 로 축소**한다(§14). 영상 합성 시엔 `build_graphics.py` 로 재생성한 1920×1080 PNG 를 로컬에서 직접 쓰거나, 일반 upload 에 `preserve-original` 옵션을 여는 별도 WO 필요.
5. 동해/심층수 실사 scene 1장(EP01 오프닝용).

## 14. 범위 밖 발견 (수정하지 않음 · 별도 WO 후보)

- **분류 전용 필드 없음**: WO 의 Category / Purpose / Scope / Visibility 는 `MediaAsset` 에 전용 컬럼이 없다. 이번엔 `folder`(Category) · `usageType`(Purpose) · `serviceKey`(Scope) · `isLibraryPublic`(Visibility) · `status` + memo 로 매핑. Admin UI 는 `usageType`·`status` 가 자유 입력이라 표기는 되나 enum 강제 없음.
- **일반 업로드 1200px 축소**: `POST /media-library/upload` 는 `imageMode` 없이 1200×1200 fit-inside WebP q85 고정. `preserve-original` 은 Neture import 경로에서만 사용 가능. 영상 제작용 1080p 그래픽에 부족.
- **검색이 파일명을 보지 않음**: `q=` 가 title/description/memo/keywords/tags 만 검색해 메타데이터 없는 legacy 자산(`item600_1000a.jpg` 등)이 키워드 검색에서 누락.
- Media Library 에 동일 바이트 중복(`c54ea10d`≡`e961f8ed`) 존재 — dedup 기능 없음(기존 핸드오프 WO 대기 상태와 일치).

## 15. 검증

- production API: Job POST 201 · PATCH 200 · GET 상세 `{INPUT:2, INTERMEDIATE:12}` · upload 12/12 201 · metadata PATCH 12/12 200 · catalog PATCH 12/12 200 · link POST 14/14 201 · 공개 URL HEAD 12/12 `200 image/webp` · `entityType=video-production-job&entityId=8a357640` 필터 total=14 · `q=minerock600` total=14.
- 서빙된 webp 재다운로드 후 육안 확인(na-k-pump 정상 렌더, 아이콘 alpha 유지).
- 브라우저 Admin 화면 smoke 는 하지 않았다(이번 WO 는 자산 준비이며 UI 변경 없음). 미검증으로 명시.
- 코드 변경 없음 → typecheck/lint/test 해당 없음. `git diff --check` 는 커밋 전 실행.

## 16. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건(§14: 분류 전용 필드 · 일반 업로드 preserve 옵션 · 검색 파일명 포함).
