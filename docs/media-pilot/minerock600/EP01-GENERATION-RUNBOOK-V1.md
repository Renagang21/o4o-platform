# MINEROCK600 EP01 — 1차 생성 Runbook (Higgsfield · Seedance 2.5 · ElevenLabs · FFmpeg)

> **Job**: VIDEO `8a357640-ad64-42f3-ae4c-43519ce78222` (`IN_PROGRESS` · statusNote `EP01 첫 생성 준비`) · **선행**: [CHECK-…-EP01-PREP-V1](../../checks/CHECK-O4O-MINEROCK600-EP01-PREP-V1.md) · 대본 [EP01-SCRIPT-AND-STORYBOARD-V1](EP01-SCRIPT-AND-STORYBOARD-V1.md)
> **제작 스택(사용자 결정 2026-09-14)**: 1순위 Higgsfield + Seedance 2.5 · 보조 Veo 3.1(4/6/8s 재생성·camera control) · 내레이션 ElevenLabs(한국어 여성 voice, Starter 이상 상업 라이선스) · 합성 FFmpeg(Claude Code)
> **역할 분담**: 외부 서비스 로그인·구독·결제·생성 버튼 = **사용자** / 텍스트·프롬프트·파일·Media Library·Job·합성 = Claude Code

---

## 0. 제작 원칙 (전 CUT 공통)

```text
AI 영상  = 약사 A 움직임 + 바다/암반 분위기 + 카메라 + 배경
실제 제품 = provisional Master/Cutout 후합성 (병을 AI 에 생성시키지 않음)
정확 한글·숫자 = 기존 그래픽(east-sea-bedrock-concept · hardness-scale · mineral-Ca/Mg) + 자막 PNG 후합성
```

- 영상 모델에 **MINEROCK 병 · 한글 문구 · 경도 600 · 1,050m** 를 생성시키지 않는다 (프롬프트 negative 고정).
- CUT 1·3: 약사가 제품을 들지 않는다. **제품을 놓을 빈 공간**(CUT1 좌측 1/3 · CUT3 중앙)을 비워 생성한다.
- CUT 2: 1,050m 를 수심으로 시각화하지 않는다. 숫자·측정선·텍스트 없음. `1,050m 암반수` 는 그래픽 PIP 만.
- 첫 버전은 **CUT 별 생성 → 합성**. 성공 시 2차 실험으로 27초 one-pass 비교.

## 1. S-01 내레이션 (ElevenLabs) — 사용자 실행

텍스트 정본: [`scripts/media/minerock600-pilot/ep01/narration-ko.txt`](../../../scripts/media/minerock600-pilot/ep01/narration-ko.txt) (대본 §2 원문, CUT 별 3 블록).

| 항목 | 값 |
|---|---|
| 플랜 | Starter 이상(상업 이용). 무료 플랜 산출물은 사용 금지 |
| Voice | 한국어 지원 여성, 차분·신뢰(광고 톤 아님). 후보를 2~3개 들어보고 **하나를 O4O 공통 voice 로 고정**(12편 동일) — Voice 이름/ID 를 보고에 기록 |
| Model | Multilingual v2 (또는 v3 가 안정적이면 v3) |
| 설정 | Stability 0.55 · Similarity 0.75 · Style 0.15 · Speaker boost on · Speed 1.0 (길이 초과 시 0.95 → 0.9) |
| 생성 단위 | CUT 별 3회 (`[CUT1]` / `[CUT2]` / `[CUT3]` 블록 각각) |
| 목표 길이 | CUT1 ≤ 6.5s · CUT2 ≤ 9.5s · CUT3 ≤ 9.5s |
| 저장 | `C:\tmp\minerock600-pilot\ep01\narration\ep01-cut1.mp3` · `ep01-cut2.mp3` · `ep01-cut3.mp3` (mp3 44.1kHz 128k 이상) |

발음 주의: `미네락600` → "미네락 육백", `1,050미터` → "천오십 미터", `경도 600` → "경도 육백". 잘못 읽으면 텍스트를 한글 숫자로 바꿔 재생성한다.

## 2. Higgsfield — 약사 A Character/Element 고정 — 사용자 실행

1. Higgsfield 로그인 → Character(Element) 생성 → 이름 `O4O Pharmacist A (KR)`.
2. 업로드: `C:\tmp\minerock600-pilot\character\o4o-pharmacist-a-r01-front.png`(기준) · `r02-side.png` · `r03-gesture.png` — 3장 모두 같은 Character 에.
3. 이후 CUT 1·3 생성 시 이 Character 를 reference 로 선택. Element ID/이름을 보고에 기록.

## 3. CUT 별 생성 — 사용자 실행 (Seedance 2.5 · 16:9 · 1080p · 각 1회 → 실패 시 최대 2회 재생성)

저장 규약: `C:\tmp\minerock600-pilot\ep01\clips\cut1.mp4` · `cut2.mp4` · `cut3.mp4` (재생성본은 `cut1-v2.mp4` 처럼 보존, 채택본만 규약명으로 복사). 생성 설정·seed·시도 횟수·크레딧을 메모해 두면 CHECK 에 그대로 옮긴다.

### CUT 1 — 7초 · 약사 A 정면 · 제품 공간 좌측

- Reference: Character `O4O Pharmacist A` (R-01 주 · R-03 보조) · Duration 7s · Camera: static, 아주 미세한 push-in
- Prompt:

```text
A Korean female pharmacist in her late 30s to early 40s, white lab coat, neat low ponytail, natural makeup, standing behind a calm pharmacy counter. She is positioned in the RIGHT third of the frame, facing the camera, speaking gently and professionally with subtle natural head movement and small hand gestures near chest level. The LEFT third of the frame is intentionally empty: a clean, softly lit, plain light-grey counter and wall with no objects, reserved for a product to be composited later. Soft diffused studio lighting, shallow depth of field, muted low-saturation palette, quiet trustworthy mood, 16:9, cinematic realism, no camera movement.
```

- Negative: `bottle, water bottle, product, packaging, label, text, letters, numbers, logo, watermark, subtitles, name tag, glasses, second person, hands holding object, exaggerated smile, advertising pose`

### CUT 2 — 10초 · 동해 심층 분위기 · 하강 카메라

- Reference: 이미지 `C:\tmp\minerock600-pilot\bg\minerock600-bg-east-sea-deep.png`(B-01) · Duration 10s · Camera: slow tilt-down / descend
- Prompt:

```text
Cinematic underwater atmosphere of the deep East Sea: the camera slowly descends from dim blue water near the surface into darker, deeper water, ending near a dark rocky bedrock formation. Gentle light rays fade as the camera goes down, fine floating particles, subtle currents, no fish or creatures, no human-made objects. Calm, quiet, documentary-like mood, deep teal to near-black palette, 16:9, smooth continuous slow camera movement, photorealistic.
```

- Negative: `text, numbers, depth markers, scale, ruler, measurement lines, labels, logo, watermark, bottle, product, people, diver, fish, submarine, pipe, drilling equipment, bright neon colors`
- 가드: 이 배경은 분위기 전용. 실제 취수 현장 의미를 부여하지 않는다. `1,050m 암반수` 는 후합성 그래픽만.

### CUT 3 — 10초 · 약사 A 설명 제스처 · 제품 공간 중앙

- Reference: Character `O4O Pharmacist A` (R-03 주 · R-01 보조) · Duration 10s · Camera: static
- Prompt:

```text
The same Korean female pharmacist (identical face, hair, white lab coat) as before, now standing slightly to the LEFT of center behind the same pharmacy counter, half-turned toward the camera, explaining calmly with an open-hand presenting gesture toward the CENTER of the frame, as if introducing something placed there. The CENTER and RIGHT of the frame are intentionally empty and clean (plain light counter and wall, soft light), reserved for a product and an infographic to be composited later. Same lighting, palette and mood as the first shot, 16:9, no camera movement.
```

- Negative: CUT 1 과 동일 + `chart, graph, infographic, icons`

### 보조 — Veo 3.1 (필요 시)

Seedance 결과가 2회 재생성 후에도 실패한 CUT 만 Veo 3.1 로 4/6/8s 단위 생성(같은 프롬프트·같은 reference image·camera control). 파일명 `cutN-veo.mp4`.

## 4. 1차 합성 — Claude Code 실행

```text
python scripts/media/minerock600-pilot/ep01/assemble_ep01.py          # 합성
python scripts/media/minerock600-pilot/ep01/assemble_ep01.py --dry-run # 입력 확인·오버레이 렌더·명령만
```

- 필요: `ffmpeg` (PATH). 현재 이 PC 에 **없음** → `winget install Gyan.FFmpeg` 후 새 터미널. (설치는 사용자 승인 후)
- 파이프라인: raw clip → 1920×1080 crop/trim → 오버레이(실제 Cutout 레이어 · 그래픽 PIP · Ca/Mg 아이콘 · 자막 PNG) → 내레이션 mux → CUT 별 `assembly/cutN-composited.mp4` → concat `assembly/ep01-v1-preview.mp4`.
- 자막은 [`subtitles-ko.srt`](../../../scripts/media/minerock600-pilot/ep01/subtitles-ko.srt) 와 동일 문구를 PIL(맑은 고딕) 로 PNG 렌더 → overlay (drawtext 폰트 문제 회피).
- Cutout 좌측 알파 밴드: 병 뒤에 밝은 반투명 패널을 깔아 비침 완화(`cutout_layer`). 병은 정지(움직이는 병 영상 없음).
- 레이아웃 미리보기(clip 없이 렌더 완료): `ep01/assembly/preview-layout-cut{1,2,3}.png`.
- BGM/SFX: 1차는 없음(내레이션만). 라이선스 확인된 음원이 정해지면 `-i bgm` 로 추가.

## 5. 검수 · 보고 항목 (1차 합성본에서 중지)

사용 Higgsfield/Seedance 설정 · reference · CUT 별 결과 파일 · 캐릭터 일관성 · 제품 합성 품질 · lip-sync/음성 · 한글·숫자 정확성 · 실패/재생성 CUT · 총 생성 횟수 · 실제 비용 · 소요 시간 · preview 경로 → [CHECK-…-EP01-GENERATION-V1](../../checks/CHECK-O4O-MINEROCK600-EP01-GENERATION-V1.md).

## 6. 완성도 확정 금지

1차 합성본은 **검수용**. 사용자가 영상을 보고 CUT 별 채택/재생성을 결정한 뒤에만 다음 단계(27초 one-pass 비교 · Media Library OUTPUT 등록 · Job COMPLETED)로 간다.
