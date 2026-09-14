# MINEROCK600 EP01 — Asset Manifest (V1)

> **Job**: `8a357640-ad64-42f3-ae4c-43519ce78222` · **컷 정의**: [EP01 대본·storyboard](EP01-SCRIPT-AND-STORYBOARD-V1.md)
> **원칙**: 영상 합성 원본은 **로컬 고해상도 파일**을 쓴다. Media Library(일반 업로드 1200px 축소)는 공개용 reference/cutout 카탈로그 역할. `preserve-original` 확장은 반복 필요가 확인될 때 별도 WO(P1).

## A. 제품 · 인물 (외부 입력 대기)

| ID | 자산 | 로컬 원본 (합성용) | Media Library | 컷 | 상태 | 비고 |
|---|---|---|---|---|---|---|
| A-01 | 제품 Master (실사 정면, **provisional** 1600×2200) | `C:\tmp\minerock600-pilot\product\minerock600-product-master-provisional.png` (사용자 제공, AI 재생성 없음) | ✅ `1a09602e-7c48-48a0-82d2-b43b803baa64` · INPUT `b84b611c…` · memo `provisional master — replace when high-resolution source becomes available` · 기존 `215592fd` 는 링크 유지 + SUPERSEDED memo | 1·3 | ✅ 2026-09-14 | 고해상도 원본 입수 시 교체(파일럿 blocker 아님) |
| A-02 | 제품 Cutout (투명 배경 PNG, 637×2000) | `C:\tmp\minerock600-pilot\product\minerock600-product-cutout-provisional.png` (A-01 원본 픽셀 분리) | ✅ `1a0263e1-03fa-41c7-bc67-ea9a2975e045` · `background-removed` · parent=A-01 · INTERMEDIATE `8317dc11…` | 1·3 | ✅ 2026-09-14 | 검수: 라벨 4항목 동일·수치 왜곡 없음. 병체 좌측 투명부 소프트 알파 밴드 → 합성 시 확인 |
| A-03 | `O4O 한국 여성 약사 A` R-01 정면 | `C:\tmp\minerock600-pilot\character\o4o-pharmacist-a-r01-front.png` (1122×1402, 원본은 `Downloads` 동명 파일) | **`4aa5e0c3-fc81-4bac-8aec-32e54a264f30`** (960×1200 축소본) · INPUT linkId `fdda776c…` | 1·3 | ✅ 등록 2026-09-14 | [캐릭터 시트](CHARACTER-SHEET-O4O-KR-FEMALE-PHARMACIST-A-V1.md). 파생: R-02 측면 `ba0b9211-491f-45b5-b2a5-a001b4150f9e` · R-03 제스처 `4dd57f20-556b-498d-a49c-18345339b836` (둘 다 `generated-angle`, parent=R-01, INPUT 연결) |

## B. 분위기 배경 (AI 생성 · 사실 정보 부여 금지)

| ID | 자산 | 로컬 원본 | Media Library | 컷 | 상태 |
|---|---|---|---|---|---|
| B-01 | 동해/깊은 바다/암반 분위기 배경 1장 | `C:\tmp\minerock600-pilot\bg\minerock600-bg-east-sea-deep.png` (1672×941 — 사양 1920×1080 미달, 파일럿 허용·합성 시 소폭 확대) | **`555b7289-a295-4222-90ec-3200c1995b87`** (1200×675) · INTERMEDIATE linkId `7ab54da7…` | 2 | ✅ 등록 2026-09-14 |

B-01 생성 프롬프트 초안:

```text
Cinematic wide shot of the deep, clean East Sea: calm dark-blue water surface at top,
light rays fading into deep water, layered dark bedrock at the bottom. Cool teal-blue palette,
quiet and pure atmosphere, no people, no bottles, no text, no logos. 16:9, photoreal.
```

가드: 이 이미지는 "분위기" 전용. 1,050m · 취수 구조 · 수치는 **G-02 그래픽만** 표기한다.

## G. 설명 그래픽 (준비 완료 — 1080p 로컬 원본)

재생성: `python scripts/media/minerock600-pilot/build_graphics.py` (기본 출력 `C:\tmp\minerock600-pilot\png\`, `argv[1]` 또는 `MINEROCK600_PNG_OUT` 로 변경). 2026-09-14 재생성 확인 12/12.

| ID | 파일 (1080p 로컬) | 크기 | Media Library (1200px 축소본) | 컷 |
|---|---|---|---|---|
| G-01 | `hardness-scale.png` | 1920×1080 | `82361d60-a3d…` | 3 |
| G-02 | `east-sea-bedrock-concept.png` | 1920×1080 | `d663c76e-f0d2…` | 2 |
| G-03 | `mineral-Ca.png` | 512×512 alpha | `a14da6fb-7385…` | 3 |
| G-04 | `mineral-Mg.png` | 512×512 alpha | `290bcb78-f813…` | 3 |
| G-05 | `mineral-icon-set.png` | 1920×1080 | `1f44b173-3fad…` | (예비) |
| — | 그 외 7종 (cell/na-k-pump/water/kidney/Na/K/sodium-sources) | — | 등록됨 | EP01 미사용 |

## S. 음성 · 자막

| ID | 자산 | 상태 | 비고 |
|---|---|---|---|
| S-01 | 내레이션 (대본 §2) | ⏸ | photo-avatar 립싱크 또는 TTS — 서비스 선택은 사용자 |
| S-02 | 자막 3줄 | ✅ 대본 문서에 확정 | 하단 safe area 안 |

## 진행 게이트

1. ~~A-01 수신 → A-02 → §1·§2 등록·연결(Master=INPUT, Cutout=INTERMEDIATE)~~ ✅ 2026-09-14 (provisional)
2. ~~A-03 등록·INPUT 연결~~ ✅ 2026-09-14
3. ~~B-01 등록·INTERMEDIATE 연결~~ ✅ 2026-09-14
4. ~~Job statusNote 갱신~~ ✅ 2026-09-14 `EP01 자산 완비 — 영상 생성 준비` (status DRAFT 유지) — **READY: 필수 자산 A-01/A-02/A-03/B-01/G 전부 등록·연결**
5. **여기서 중지** — EP01 외부 영상 생성은 별도 지시
