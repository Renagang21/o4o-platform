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
- EN 번역 + 애니메이션(v4) + R11 단일프레임 병합 → `자일리톨그린_동영상_EN_16x9.pptx`.
- **다국어 6언어 완성 (✅ 2026-06-23):** EN·ZH·JA·**VI·TH·ID** 동일 파이프라인. 언어선택 `OSMU_LANG=en|zh|ja|vi|th|id`(trans·merge). CJK(zh/ja) 글자폭 `CW=1.0`+`<a:br>` 의미단위 줄바꿈+deorphan, 라틴(vi/id) `CW=0.55` 단어 줄바꿈(str), 태국(th) `CW=0.55` PowerPoint 태국어 줄바꿈(str). 길이비(KO 대비): ZH 0.78x / JA 1.01x / TH 2.28x / VI 2.60x / EN 2.64x / ID 2.87x. slide12는 언어무관 0.84(4블록 구조적). 파일 `자일리톨그린_동영상_{EN,ZH,JA,VI,TH,ID}_16x9.pptx`. 상세 = IR §10.7.
- **간격 표준화 (✅ 2026-06-23, 사용자 검수 반영):** "제목–부제 간격이 슬라이드마다 다름" 원인 = PowerPoint 가 spcBef 위에 **폰트크기 비례 leading** 을 더함 → 상수 spcBef 로는 절대 균일 안 됨. **해법:** `spcBef = 22 − 0.2·(prev_fs+next_fs)` 폰트 역보정(시각간격 상수화: 44→24=8 / 36→44=6 / 24↔28=11pt). `merge.py` `comp_spcbef`.
- **CJK 줄바꿈 = 의미 단위 (✅ 2026-06-23, 사용자 통찰 채택):** orphan 의 진짜 해법은 폰트 축소가 아니라 **의미 단위 줄바꿈**. 원본은 이미 `<a:br>` 로 디자이너 줄바꿈을 했는데 치환이 버려 자동 줄바꿈(orphan)이 됨. → `trans.py` 번역을 **의미 단위 줄 목록(list)**으로(AI 가 폭·문맥에 맞게 끊음) + `<a:br>` 명시 줄바꿈(rPr 보존). 例: 美味持久，\|唾液也自然分泌(쉼표). **폰트 안 줄이고 orphan 제거**. `deorphan`(폰트축소)은 폴백.
- **PowerPoint 복구 경고 해결 (✅ 2026-06-23):** 의미단위 줄바꿈이 한국어 run 의 stale 교정 플래그 `err="1"` 를 번역 텍스트에 복제 → PowerPoint "복구" 경고. `trans.py` 가 복제 rPr 에서 err/dirty/smtClean/noProof 제거. (교훈: **작업폴더에 `.pptx` 만들지 말 것** — `repack.py` 가 흡수해 pptx-in-pptx 비대/손상.)
- **9:16 세로 완성 (✅ 2026-06-23):** `portrait.py` 신규 — (1) `sldSz` 세로(6858000×12192000), (2) 배경 `<p:bg>` 중앙 크롭 `<a:srcRect l=r=34180>`(§10.3 크롭 우선, 별도 이미지 없음), (3) 전경 세로 리플로우(상단 텍스트 풀폭 + 하단 이미지 세로 스택, overflow 시 이미지 축소). 파이프라인 `trans→merge→portrait→inject_dyn→repack`. **6언어 × 9:16** 생성: `자일리톨그린_동영상_{EN,ZH,JA,VI,TH,ID}_9x16.pptx`. → 총 12개(가로 6 + 세로 6).

**검증 대기 (사용자가 확인하기로 함 — ⚠️ 추정 기반이라 시각 확인 필수):**
- 16:9: 제목–부제 간격 균일 / 제목 의미단위 줄바꿈·orphan 없음 / 폰트 원크기.
- 9:16: 배경 중앙크롭이 어색하지 않은지(핵심 잘림 여부 → §10.3 안전영역 가이드 근거) / 전경 세로 스택(텍스트 위·이미지 아래)이 읽을 만한지 / 하단 overflow.
- 튜닝: 간격 `merge.py GAP_VISUAL`(22) / 줄바꿈 위치 `trans.py` list / 세로 여백·간격 `portrait.py`(MARGIN/GAP/IMG_MAX_UP) / 배경크롭율 `SRC_CROP`(34180).
- ⚠️ OneDrive 캐시 주의 — 동기화 후 새로 열 것.

**다음 단계 후보 (사용자와 택1):**
1. 부제 **문단별 등장** 애니(현재는 블록 단위) — paragraph-level build.
2. 9:16 전경 배치 미세조정(이미지 크기/2-이미지 슬라이드 구도) — 검수 결과 반영.
3. 출력물 렌더링(MP4) — 언어 × 비율 매트릭스(§10.4 step3).

## 6. 주의

- 동시 세션 혼입 방지: 커밋은 `git commit -m "..." -- <파일>` path-specific.
- `apps/mobile-app/` 등 본 작업과 무관한 변경은 건드리지 말 것.
- `trans.py`(TRANS) · `inject_dyn.py`(KEY_PIC=slide1→id7) 등은 **이 자일리톨 pptx 전용** 하드코딩 — 다른 pptx 엔 재작성 필요.
