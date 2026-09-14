# CHECK-O4O-MINEROCK600-EP01-PREP-V1

> **WO**: 사용자 지시(2026-09-14, 채팅) — "세 가지 결정 완료 · 외부 입력 없이 가능한 작업을 계속 진행하라". 선행: [CHECK-…-ASSET-PREP-V1](CHECK-O4O-MINEROCK600-VIDEO-PILOT-RESET-AND-ASSET-PREP-V1.md)
> **상태**: PREP DONE + **약사 A 3장 · 배경 1장 등록·Job 연결 완료(2026-09-14, §7)** · 외부 입력 대기 1건(제품 실사 원본) · 영상 생성 미착수(범위 밖)
> **작성일**: 2026-09-14 · production API 호출 · 코드 변경 = pilot 스크립트 출력 경로 1건뿐

## 1. 사용자 결정 반영

| 결정 | 반영 |
|---|---|
| ① Product Master = 실제 사진 · AI 재생성 금지 · 경로 추후 제공 | manifest A-01/A-02, metadata §1·§2 (`derivationType=background-removed`, `parentAssetId` 연결) |
| ② stock avatar 종료 · `O4O 한국 여성 약사 A` 직접 제작(ChatGPT 생성 → 로컬 → Claude Code 등록) | [캐릭터 시트](../media-pilot/minerock600/CHARACTER-SHEET-O4O-KR-FEMALE-PHARMACIST-A-V1.md) · metadata §3 (`originType=ai_generated`, REUSABLE, service-neutral) |
| ③ 동해/심층수 분위기 배경 = AI 생성 · 사실 정보는 그래픽 | manifest B-01 + 프롬프트 · metadata §4 (`generated-scene`, SUPPORT_ONLY) · storyboard CUT 2 가드 |

## 2. 산출물

| 파일 | 내용 |
|---|---|
| [`docs/media-pilot/minerock600/EP01-SCRIPT-AND-STORYBOARD-V1.md`](../media-pilot/minerock600/EP01-SCRIPT-AND-STORYBOARD-V1.md) | 내레이션 확정안(≈27초) · 자막 3줄 · 3-cut storyboard(7/10/10s) · 소재 매핑 · 표현 가드 |
| [`…/CHARACTER-SHEET-O4O-KR-FEMALE-PHARMACIST-A-V1.md`](../media-pilot/minerock600/CHARACTER-SHEET-O4O-KR-FEMALE-PHARMACIST-A-V1.md) | 고정 속성(사용자 조건 그대로) · 기준 이미지 3컷 사양(R-01 필수) · 프롬프트 초안 · 검수 기준 |
| [`…/EP01-ASSET-MANIFEST-V1.md`](../media-pilot/minerock600/EP01-ASSET-MANIFEST-V1.md) | A(제품·인물) / B(배경) / G(그래픽) / S(음성·자막) · 로컬 원본 경로 · 진행 게이트 |
| [`…/MEDIA-LIBRARY-REGISTRATION-METADATA-DRAFT-V1.md`](../media-pilot/minerock600/MEDIA-LIBRARY-REGISTRATION-METADATA-DRAFT-V1.md) | 신규 4건 upload/metadata/catalog/link payload (enum 은 `media-catalog.service.ts` `MEDIA_ENUMS` 대조) |
| `scripts/media/minerock600-pilot/build_graphics.py` | 출력 경로 고정 `C:\tmp\minerock600-pilot\png\` (argv/`MINEROCK600_PNG_OUT` 로 변경 가능). 그림 로직 불변 |

## 3. 1080p 그래픽 재생성

`C:\tmp\minerock600-pilot\` 는 이 세션 시작 시 **존재하지 않았다**(이전 원본 소실). 재생성 12/12 확인: 1920×1080 RGBA 8종 + 512×512 alpha 4종. EP01 사용분 = `hardness-scale` · `east-sea-bedrock-concept` · `mineral-Ca` · `mineral-Mg`.

## 4. 하지 않은 것 (외부 입력 대기 · 범위 밖)

- 제품 Master/Cutout 제작·등록 — 사용자 파일 경로 대기
- 약사 A 이미지 등록 — ChatGPT 생성본 대기
- 배경 생성·등록 — 생성 도구 미보유(프롬프트만 제공)
- Job `8a357640` PATCH — 신규 자산 없어 statusNote 변경 없음
- EP01 외부 영상 생성 — 명시적 범위 밖
- Media Library 업로드 `preserve-original` 확장 — 사용자 결정대로 P1 보류

## 5. 검증

- `python build_graphics.py` 실행 성공 · 출력 12건 크기/모드 PIL 로 확인.
- 문서는 CHECK §9·§10 의 asset ID·Job ID·linkId 와 대조. 코드 enum 은 소스 직접 확인.
- API 호출·브라우저 smoke 없음(이번 범위에 등록 작업 없음).

## 7. 2차 — 약사 A · 배경 등록 (2026-09-14)

사용자가 ChatGPT 생성본 4장을 `Downloads` 에 저장 → 검수(캐릭터 시트 §1·§4 충족: 명찰·안경·텍스트 없음, 동일 인물 3포즈, 단색 배경 / 배경: 병·텍스트·측정선 없음) → 규격명으로 `C:\tmp\minerock600-pilot\{character,bg}\` 보존 → production API 등록(`platform:super_admin` 계정, Bearer).

| 자산 | 원본 | Asset ID | 저장 | catalog | Job 링크 |
|---|---|---|---|---|---|
| 약사 A R-01 정면(기준) | 1122×1402 | `4aa5e0c3-fc81-4bac-8aec-32e54a264f30` | 960×1200 webp · REUSABLE · APPROVED · public | `ai_generated/original` · qa APPROVED · SUPPORT_ONLY · o4o-original | INPUT `fdda776c…` |
| 약사 A R-02 3/4 측면 | 1122×1402 | `ba0b9211-491f-45b5-b2a5-a001b4150f9e` | 동일 | `generated-angle` · parent=R-01 | INPUT `5995aa0e…` |
| 약사 A R-03 설명 포즈 | 1122×1402 | `4dd57f20-556b-498d-a49c-18345339b836` | 동일 | `generated-angle` · parent=R-01 | INPUT `4afb1e5e…` |
| 동해 심층 분위기 배경 B-01 | 1672×941 | `555b7289-a295-4222-90ec-3200c1995b87` | 1200×675 webp · INTERMEDIATE · DRAFT · internal | `ai_generated/original` · qa PENDING | INTERMEDIATE `7ab54da7…` |

- Job `8a357640` 현재 `{INPUT: 5, INTERMEDIATE: 13}` · statusNote `자산 준비 — … 대기: 제품 실사 Master/Cutout(사용자 제공). 영상 생성 미착수` · status `DRAFT` 유지.
- 검증: login 200 · upload 4/4 201 · metadata 4/4 200 · catalog 4/4 200(배경 1회 `PARENT_REQUIRED` 후 `original` 로 재시도) · `/automation-jobs/:id/assets` 4/4 201 · Job PATCH 200 · 공개 URL HEAD 4/4 `200 image/webp` · GET 상세로 parent/derivation/qa 재확인.
- 발견: 라우트 prefix 는 `/api/v1/platform/…`(`register-routes.ts` 29d-5/6) — metadata 초안 문서에 반영. `generated-scene` 은 parent 필수.
- 해상도: 약사 1122px · 배경 1672px 로 시트 사양(2000px / 1920px) 미달이나 파일럿 허용(사용자 합의). 합성 원본은 로컬 PNG.
- V2 보정 후보: 안쪽 하늘색 V넥이 스크럽 느낌 → 다음 생성 시 라운드/셔츠 카라.
- 하지 않은 것: 제품 Master/Cutout(원본 대기) · 영상 생성 · 브라우저 Admin smoke.

## 6. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 (ASSET-PREP CHECK §14 의 3건은 기존 제안 유지).
