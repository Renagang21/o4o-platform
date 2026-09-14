# MINEROCK600 EP01 — Asset Manifest (V1)

> **Job**: `8a357640-ad64-42f3-ae4c-43519ce78222` · **컷 정의**: [EP01 대본·storyboard](EP01-SCRIPT-AND-STORYBOARD-V1.md)
> **원칙**: 영상 합성 원본은 **로컬 고해상도 파일**을 쓴다. Media Library(일반 업로드 1200px 축소)는 공개용 reference/cutout 카탈로그 역할. `preserve-original` 확장은 반복 필요가 확인될 때 별도 WO(P1).

## A. 제품 · 인물 (외부 입력 대기)

| ID | 자산 | 로컬 원본 (합성용) | Media Library | 컷 | 상태 | 비고 |
|---|---|---|---|---|---|---|
| A-01 | 제품 Master (실사 정면, 고해상도) | 사용자 제공 예정 — 예: `C:\Users\home\Downloads\minerock600-product-source.png` | 신규 등록 (metadata §1) → 기존 잠정 Master `215592fd` 는 INPUT 링크 유지·status 는 `SUPERSEDED` memo 만 | 1·3 | ⏸ 대기 | AI 재생성 금지 |
| A-02 | 제품 Cutout (투명 배경 PNG) | A-01 에서 제작 → `C:\tmp\minerock600-pilot\product\minerock600-cutout.png` | 신규 등록 (metadata §2) | 1·3 | ⏸ A-01 후 | 배경 제거만(라벨 픽셀 보존). 워터마크·수치 왜곡 육안 검수 |
| A-03 | `O4O 한국 여성 약사 A` R-01 정면 | ChatGPT 생성 → 예: `C:\Users\home\Downloads\o4o-pharmacist-a-front.png` | 신규 등록 (metadata §3) · service-neutral REUSABLE | 1·3 | ⏸ 대기 | [캐릭터 시트](CHARACTER-SHEET-O4O-KR-FEMALE-PHARMACIST-A-V1.md) |

## B. 분위기 배경 (AI 생성 · 사실 정보 부여 금지)

| ID | 자산 | 로컬 원본 | Media Library | 컷 | 상태 |
|---|---|---|---|---|---|
| B-01 | 동해/깊은 바다/암반 분위기 배경 1장 | 생성 → `C:\tmp\minerock600-pilot\bg\east-sea-deep-mood.png` (1920×1080+) | 신규 등록 (metadata §4) · MINEROCK 전용 INTERMEDIATE | 2 | ⏸ 대기 |

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

1. A-01 파일 경로 수신 → A-02 제작 → §1·§2 등록·INPUT 연결
2. A-03 파일 경로 수신 → §3 등록·INPUT 연결
3. B-01 생성·등록·INTERMEDIATE 연결
4. Job statusNote 갱신 (`자산 완비 · 영상 생성 대기`)
5. **여기서 중지** — EP01 외부 영상 생성은 별도 지시
