# CHECK-O4O-MINEROCK600-EP01-GENERATION-V1 — EP01 1차 생성 실험

> **WO**: 사용자 지시(2026-09-14, 채팅) — "CHECK-O4O-MINEROCK600-EP01-PREP-V1 기준으로 실제 EP01 제작 단계에 착수한다" 12항목. 선행: [CHECK-…-EP01-PREP-V1](CHECK-O4O-MINEROCK600-EP01-PREP-V1.md) · Runbook: [EP01-GENERATION-RUNBOOK-V1](../media-pilot/minerock600/EP01-GENERATION-RUNBOOK-V1.md)
> **상태**: **1차 생성 대기 — 로컬 준비 완료, 외부 서비스 단계(ElevenLabs · Higgsfield/Seedance)는 사용자 실행 필요** · 합성·검수 미실행
> **Job**: VIDEO `8a357640-ad64-42f3-ae4c-43519ce78222` → `IN_PROGRESS` · statusNote `EP01 첫 생성 준비` (2026-09-14, PATCH 200)

---

## 1. 지시 12항목 대응 상태

| # | 지시 | 상태 | 비고 |
|---|---|---|---|
| 1 | S-01 내레이션 텍스트 · 자막 타이밍 | ✅ | [`narration-ko.txt`](../../scripts/media/minerock600-pilot/ep01/narration-ko.txt) (대본 §2 원문, CUT 별 3 블록·목표 길이·발음 주의) · [`subtitles-ko.srt`](../../scripts/media/minerock600-pilot/ep01/subtitles-ko.srt) (0.3–6.8 / 7.3–16.8 / 17.3–26.8s) |
| 2 | Job `IN_PROGRESS` · statusNote `EP01 첫 생성 준비` | ✅ | PATCH 200 · GET 재확인 `IN_PROGRESS` · assets 20 |
| 3 | Higgsfield + Seedance 2.5 를 1차 환경으로 | 📋 | Runbook §2·§3 — **사용자 계정 필요** |
| 4 | 약사 A R-01/02/03 같은 character reference | 📋 | Runbook §2 Character/Element `O4O Pharmacist A (KR)` 절차 |
| 5 | CUT 1=7s · CUT 2=10s · CUT 3=10s 각각 생성 | 📋 | Runbook §3 프롬프트·negative·reference·저장 규약 확정. **생성은 사용자** |
| 6 | 병·한글·경도600·1,050m 생성 금지 | ✅ | 전 CUT negative 고정 · 제품 공간 비움 지시 |
| 7 | 제품은 provisional Master/Cutout 후합성 | ✅ | `assemble_ep01.py::cutout_layer` (라벨 비율 유지·알파 밴드 뒤 밝은 패널) |
| 8 | 제품명·숫자·미네랄 그래픽·자막 후합성 | ✅ | PIP `east-sea-bedrock-concept`/`hardness-scale` · Ca/Mg 아이콘 · 자막 PNG(맑은 고딕) |
| 9 | CUT 2 의 1,050m 는 그래픽만 | ✅ | 프롬프트 negative `depth markers, scale…` + PIP 2.0s 부터 |
| 10 | ElevenLabs 한국 여성 voice · 결제는 사용자 | 📋 | Runbook §1 설정값 — **로그인·구독·생성은 사용자** |
| 11 | raw clip 3 + narration 보존 · 1차 합성본 | ⏸ | 보존 경로 `C:\tmp\minerock600-pilot\ep01\{clips,narration,assembly}` 생성. 합성은 clip/narration 입수 + ffmpeg 설치 후 |
| 12 | 1차 합성본에서 중지·검수 보고 | ⏸ | §3 보고 표 예약 |

## 2. 이번 세션에서 실제로 한 것 · 검증

- Job PATCH `{status: IN_PROGRESS, statusNote}` 200 → GET `IN_PROGRESS` / `EP01 첫 생성 준비` / assets 20.
- `assemble_ep01.py --dry-run` 실행: clip 0/3 · narration 0/3 → 건너뜀 보고, 오버레이 레이어 10장 렌더 성공. clip 없이 레이어만 회색 배경에 합성한 `preview-layout-cut{1,2,3}.png` 육안 확인 — CUT3: 중앙 실제 병(라벨 `MINEROCK · 1000 mL (0 kcal)` 원본 유지) · 우상단 경도 scale PIP(300/600 마커) · 좌하단 Ca/Mg 아이콘 · 하단 자막. CUT1: 좌측 병 + 자막. CUT2: 우하단 `동해 · 1,050m 암반수` PIP + 자막.
- **ffmpeg 이 이 PC 에 없음** (`where ffmpeg` 없음 · imageio-ffmpeg 없음) → 실제 인코딩은 미검증. 설치(`winget install Gyan.FFmpeg`)는 시스템 도구 추가이므로 사용자 승인 후.
- 하지 않은 것: ElevenLabs/Higgsfield 접속·생성(자격·결제 = 사용자) · Veo 3.1 · BGM/SFX · Media Library OUTPUT 등록 · Job COMPLETED.

## 3. 1차 합성본 검수 보고 (생성 후 기입)

| 항목 | 값 |
|---|---|
| Higgsfield/Seedance 설정 | (모델 · 해상도 · duration · seed · camera) |
| 사용 reference | Character `O4O Pharmacist A (KR)`(R-01/02/03) · B-01 |
| CUT 별 결과 파일 | `clips/cut1.mp4` (…s) / `cut2.mp4` / `cut3.mp4` |
| 캐릭터 일관성 | |
| 제품 합성 품질 | (알파 밴드 비침 · 스케일 · 조명 정합) |
| lip-sync / 음성 | (voice 이름/ID · CUT 별 길이 · 발음 오류) |
| 한글·숫자 정확성 | (자막 · PIP · 라벨 원본 유지) |
| 실패 / 재생성 필요 CUT | |
| 총 생성 횟수 | Seedance n · Veo n · ElevenLabs n |
| 실제 비용 | Higgsfield 크레딧 · ElevenLabs 플랜 |
| 소요 시간 | |
| EP01 1차 preview | `C:\tmp\minerock600-pilot\ep01\assembly\ep01-v1-preview.mp4` |

## 4. 다음 사용자 행동 (순서)

1. ElevenLabs: Runbook §1 대로 3 파일 생성 → `ep01/narration/`.
2. Higgsfield: Character 고정(§2) → CUT 1·2·3 생성(§3) → `ep01/clips/cut{1,2,3}.mp4`.
3. ffmpeg 설치 승인(또는 직접 설치).
4. "합성 진행" 지시 → Claude Code 가 `assemble_ep01.py` 실행 → §3 표 기입 → 1차 preview 에서 중지.

## 5. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
