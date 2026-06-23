# PoC — OSMU PPTX 동영상화 / 번역 / 레이아웃 리플로우

> 관련 IR: [`IR-O4O-OSMU-CONTENT-CONVERSION-CONCEPT-V1`](../IR-O4O-OSMU-CONTENT-CONVERSION-CONCEPT-V1.md)
> 성격: **PoC 도구 (실증용 스크립트)**. 프로덕션 코드 아님. 향후 "콘텐츠 변환 툴" 구현 시 규칙·로직 참조용.
> 작성: 2026-06-23

## 목적

매장 콘텐츠 OSMU(원소스 멀티유즈) 구상 중 **"PPTX → 애니메이션 동영상 + 번역 + 디바이스/언어별 레이아웃 자동 보정"** 의 기술 타당성을 실증한 스크립트 모음.

테스트 소재: 사용자 제공 `자일리톨 그린껌.pptx` (12 슬라이드). 결과물은 OneDrive Documents 에 생성 (저장소에 바이너리는 미포함).

## 파이프라인

```
원본 pptx (슬라이드 XML 추출)
  → trans.py        # 한글 → 영어 텍스트 치환 (문단 단위)
  → merge.py        # 같은 열 텍스트박스 1개 프레임 병합 + 문단간격(spcBef) 균일 + 이미지 밀기/축소
  → inject_dyn.py   # 병합 후 도형 기준 애니메이션/전환/자동진행(advTm) 동적 주입
  → repack.py       # ppt 폴더 → .pptx 재압축 ([Content_Types].xml 우선)
```

## 각 스크립트

| 파일 | 역할 |
|------|------|
| `inject.py` | (구버전) 하드코딩 도형 ID 기준 애니메이션 주입 — 단일박스 구조 전제 |
| `inject_dyn.py` | **(현행)** 병합 후 도형을 동적 탐색해 애니메이션 주입. 텍스트=블록 등장, 이미지=다양화(wipe/box/wheel/circle/dissolve)+핵심이미지 Grow강조, advTm 자동진행 |
| `trans.py` | 슬라이드 문단 순서대로 영어 번역 치환 + KO/EN 길이비 측정 |
| `merge.py` | **핵심.** x겹침 텍스트박스 병합 + spcBef 균일간격 + 이미지 R4/R5(밀기·축소) + 내용과다 슬라이드 텍스트 축소 |
| `fit.py` | (병합 이전 접근) 별도박스 유지하며 폰트축소+이미지이동 솔버 — R9/R10 실증, R11(병합)로 대체됨 |
| `analyze.py` | 텍스트박스 폭·폰트 대비 영어 줄수 추정 (오버플로 분석) |
| `repack.py` | 작업 폴더 → pptx 재압축 |

## 핵심 교훈 (IR §10.7 규칙으로 정착)

- 애니메이션 fly-in 은 `<p:fltVal val="#ppt_x">`(숫자칸에 수식) 사용 시 타이밍 전체 무효화 → `strVal` 수식 형식 필요. 안전 위해 PoC 에선 animEffect filter 계열만 사용.
- 번역 시 영어 길이 ↑ → `spAutoFit` 박스가 아래로 자라 겹침. 해결: `normAutofit` + 고정틀.
- 제목–부제 간격 균일화의 정답 = **단일 프레임 병합 + 문단간격(spcBef)** (추정 제거). → `merge.py`.
- 줄수 추정은 보수적(영어폭 ≈0.55em). 단 병합 방식에선 이미지 배치에만 사용(텍스트 간격은 PowerPoint가 직접 처리).

## 집에서 이어서 작업하기 (resume)

> `C:\tmp` 작업 폴더는 동기화 안 됨 — 아래로 재생성한다. 스크립트·원본은 git/OneDrive 로 동기화됨.

```bash
# 0) 최신 받기
git pull origin main                       # 스크립트·문서
#    OneDrive 동기화 완료 확인              # 원본/결과물 pptx

# 1) 작업 폴더 만들고 원본 pptx 전체 압축 해제
mkdir -p /c/tmp/pptx_xyl && cd /c/tmp/pptx_xyl
unzip -o "/c/Users/home/OneDrive/개인계정/Documents/자일리톨 그린껌.pptx"

# 2) 저장소의 PoC 스크립트 복사
cp /c/Users/home/coding/o4o-platform/docs/ir/poc-osmu-pptx-video/*.py .

# 3) 파이프라인 실행 (번역 → 병합 → 동적 애니메이션)
python trans.py && python merge.py && python inject_dyn.py

# 4) 결과 pptx 재압축 (출력 경로는 repack.py 안에 하드코딩)
python repack.py
```

**경로 주의:** 스크립트 출력 경로가 `C:\Users\home\OneDrive\개인계정\Documents\...` 로 하드코딩됨.
집 PC 의 윈도우 사용자명/ OneDrive 경로가 다르면 `trans.py`/`merge.py`/`repack.py`/`inject_dyn.py` 상단·`out=` 경로만 수정.
또한 `trans.py`(TRANS)·`inject_dyn.py`(KEY_PIC) 등은 **이 자일리톨 pptx 전용 하드코딩** — 다른 pptx 엔 재작성 필요(PoC 특성).

## 한계 / 미해결

- 부제 개별 등장 애니는 병합으로 블록 단위가 됨 (문단별 build 애니는 미구현).
- 슬라이드별 폰트 축소율 차이 시 spcBef 의 시각 간격이 미세하게 달라질 수 있음 (검증 대기).
- 세로(9:16) 비율 / 다른 언어(ZH/JA) 미실행.
- 배경 이미지는 비율별 별도 등록 필요 (리플로우 불가) — IR §10.3.
