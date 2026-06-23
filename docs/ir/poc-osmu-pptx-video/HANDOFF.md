# HANDOFF — OSMU PPTX 동영상화 작업 이어가기 (집/다른 PC)

> **사용법: 동기화(git pull + OneDrive) 후, Claude Code 에게 이 파일을 읽으라고 하고 "이어서 진행" 이라고 하면 됩니다.**
> 예: `docs/ir/poc-osmu-pptx-video/HANDOFF.md 읽고 이어서 진행해줘`

---

## 0. Claude Code 에게 (먼저 할 일)

이 작업은 **경로가 환경마다 다르다.** 하드코딩 금지. 시작 시:

1. **원본 pptx 위치 찾기** — `자일리톨 그린껌.pptx` 를 Glob 으로 탐색 (OneDrive Documents 등). 없으면 사용자에게 경로 질문.
2. **결과물 위치 확인** — 기존 `자일리톨그린_동영상_EN_16x9.pptx`(영어 병합본) 도 같은 폴더에 있을 수 있음.
3. **작업 폴더 재생성** — 아래 §3 절차. (이전 PC 의 `C:\tmp\pptx_xyl` 는 동기화 안 됨 → 원본에서 다시 만듦)
4. 진행 전 §5 "현재 상태 / 다음 할 일" 을 사용자와 한 번 확인.

---

## 1. 무슨 작업인가 (한 줄)

매장 콘텐츠 OSMU 구상의 PoC — **PPTX 에 애니메이션 자동 주입 → 동영상화 + 영어 번역 + 텍스트 길이 변화에 따른 레이아웃 자동 보정.**
**기준 문서(SSOT, 반드시 먼저 읽기):** [`../IR-O4O-OSMU-CONTENT-CONVERSION-CONCEPT-V1.md`](../IR-O4O-OSMU-CONTENT-CONVERSION-CONCEPT-V1.md) — §10(동영상/번역/레이아웃), 특히 **§10.7 규칙 R1~R11**.

## 2. 자산 위치

| 자산 | 위치 | 동기화 |
|------|------|:---:|
| PoC 스크립트 + 본 문서 | `docs/ir/poc-osmu-pptx-video/` (git) | git pull |
| IR 기준 문서 | `docs/ir/IR-O4O-OSMU-CONTENT-CONVERSION-CONCEPT-V1.md` (git) | git pull |
| 원본 pptx `자일리톨 그린껌.pptx` | OneDrive Documents (경로는 PC마다 다름) | OneDrive |
| 결과물 `자일리톨그린_동영상_EN_16x9.pptx` 등 | OneDrive Documents | OneDrive |
| 작업 폴더(압축 푼 슬라이드) | 로컬 임시 — **동기화 안 됨, 재생성 대상** | ✗ |

## 3. 작업 폴더 재생성 + 파이프라인 실행

```bash
# 작업 폴더 (아무 임시 경로나)
WORK=/c/tmp/pptx_xyl    # 환경에 맞게
mkdir -p "$WORK" && cd "$WORK"

# 원본 pptx 전체 압축 해제 (경로는 Glob 으로 찾은 실제 경로 사용)
unzip -o "<원본 자일리톨 그린껌.pptx 경로>"

# 저장소 스크립트 복사
cp <repo>/docs/ir/poc-osmu-pptx-video/*.py .

# 파이프라인: 번역 → 병합(균일간격) → 동적 애니메이션
python trans.py && python merge.py && python inject_dyn.py

# 재압축 (출력 경로 인자로 — 하드코딩 제거됨)
python repack.py "<출력 경로>/자일리톨그린_동영상_EN_16x9.pptx"
```

- `trans.py / merge.py / inject_dyn.py / fit.py / analyze.py / inject.py` 는 **작업폴더(cwd)** 의 `ppt/slides/*` 만 다룸 → 절대경로 의존 없음.
- `repack.py` 만 출력 경로 필요 → **인자**로 전달 (`python repack.py "<경로>"`) 또는 `OSMU_OUT` 환경변수.

## 4. 핵심 규칙 (요약 — 상세는 IR §10.7)

- 동영상 = **pptx + 애니메이션 한정**(결정적). animEffect filter 계열만 사용(fly-in 모션은 깨짐 → 제외).
- 번역 시 영어 길이↑ → 겹침. **단일 프레임 병합 + 문단간격(spcBef 10pt)** 으로 제목–부제 간격 **균일화**(R11, `merge.py` 핵심).
- 부담분담: 텍스트 축소 + **이미지 축소/이동**(R4/R5). 옆 이미지는 안 건드림(R6).
- 배경 이미지는 비율 바뀌면 별도 등록(R 없음, §10.3). 전경만 리플로우.
- 대원칙: **최대한 자동 배치, 미세조정은 사용자 몫.**

## 5. 현재 상태 / 다음 할 일

**완료:**
- EN 번역 + 애니메이션(v4) + R11 단일프레임 병합(균일간격) → `자일리톨그린_동영상_EN_16x9.pptx`.
- **다국어 대조 (✅ 2026-06-23):** ZH·JA 동일 파이프라인 통과 → `자일리톨그린_동영상_ZH_16x9.pptx` / `..._JA_16x9.pptx`. 언어선택 `OSMU_LANG=en|zh|ja`(trans·merge), CJK 글자폭 `CW=1.0`. 결과: **EN 2.64x**(최장 — slide 7·8·10·11 축소 0.76~0.80) / **ZH 0.78x**(최단 — slide12 외 무축소) / **JA 1.01x**(중간 — 미세). slide12는 언어무관 0.84(4블록 구조적). 상세 표 = IR §10.7 "다국어 대조".

**검증 대기 (사용자가 확인하기로 함):**
- EN/ZH/JA 파일 열어 **제목 클릭 시 부제까지 한 박스(병합본)** + slide 7·10·11 **간격 균일**.
- ZH(짧음)=여백 늘고 겹침 없는지 / JA(비슷)=EN 보다 여유 있는지 시각 확인.
- ⚠️ OneDrive 캐시로 옛 파일을 볼 수 있음 — 동기화 후 새로 열 것.

**다음 단계 후보 (사용자와 택1):**
1. 슬라이드별 폰트 축소율 차이로 spcBef 시각 간격이 미세하게 달라지는지 점검 → 필요시 간격을 폰트배율과 무관하게 고정.
2. **세로 9:16** 비율 제작 (배경 비율별 별도 등록 + 전경 리플로우 실증).
3. ~~다른 언어(중국어/일본어) 대조~~ — ✅ 완료(2026-06-23).
4. 부제 **문단별 등장** 애니(현재는 블록 단위) — paragraph-level build.

## 6. 주의

- 동시 세션 혼입 방지: 커밋은 `git commit -m "..." -- <파일>` path-specific.
- `apps/mobile-app/` 등 본 작업과 무관한 변경은 건드리지 말 것.
- `trans.py`(TRANS) · `inject_dyn.py`(KEY_PIC=slide1→id7) 등은 **이 자일리톨 pptx 전용** 하드코딩 — 다른 pptx 엔 재작성 필요.
