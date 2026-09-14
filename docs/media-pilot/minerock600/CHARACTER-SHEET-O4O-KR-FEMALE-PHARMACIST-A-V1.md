# 캐릭터 시트 — `O4O 한국 여성 약사 A` (V1)

> **성격**: O4O **공통 설명자 캐릭터**(미네락600 전용 아님). 첫 사용 = MINEROCK600 EP01.
> **결정**(사용자, 2026-09-14): stock avatar 탐색 종료 · 직접 제작. 기준 이미지는 ChatGPT 측에서 생성 → 로컬 파일로 전달 → Claude Code 가 Media Library 등록·Job 연결.
> **권리**: O4O 자체 생성물(`rightsType=o4o-original` · 상업 이용 허용 · 실존 인물 모사 금지).

---

## 1. 고정 속성 (사용자 확정 조건)

| 항목 | 값 |
|---|---|
| 성별 · 국적 | 한국인 여성 |
| 연령대 | 30대 후반 ~ 40대 초반 |
| 직업 | 약사 (약국 근무) |
| 복장 | 흰 가운(약국 가운, 짧은 카라 · 명찰 없음 · 로고 없음). 안에는 무채색 라운드/셔츠 |
| 헤어 | 단정한 어두운 갈색~흑발. 어깨선 단발 또는 낮은 포니테일. 과한 컬·염색 없음 |
| 화장 | 자연스러운 화장 (진한 립·아이라인 없음) |
| 인상 | 차분하고 신뢰감 있는 인상. 친근하지만 **광고 모델 같지 않음** |
| 분위기 | 한국 약국에서 실제로 볼 법한 사람. 과장된 미소·포즈 없음 |
| 액세서리 | 없음 또는 작은 귀걸이 1. 안경 없음(V1 기준 고정 — 시리즈 일관성) |
| 체형 | 보통. 특별히 마르거나 화려하지 않음 |

## 2. 기준 이미지 요구 사양 (ChatGPT 생성 시)

| # | 컷 | 용도 | 사양 |
|---|---|---|---|
| R-01 **필수** | 정면 상반신, 카메라 응시, 옅은 미소 | EP01 CUT 1·3 · photo-avatar 원본 | 세로 또는 정방형, **2000px+ 장변**, 단색 밝은 회색/연한 청록 배경, 부드러운 정면광, 얼굴 전체 가림 없음 |
| R-02 선택 | 3/4 측면 상반신 | 시리즈 후속 컷 변화 | R-01 과 동일 인물·복장·조명 |
| R-03 선택 | 약국 카운터에서 설명하는 허리 위 샷(손 제스처) | 일반 scene 용 | 배경 흐림, 제품 미포함 |

- 배경에 **제품·타사 로고·실제 약 이름·글자** 넣지 않는다 (합성 시 제거 불가).
- 손·치아·귀 등 AI 아티팩트 육안 검수 후 채택.
- 동일 seed/참조 이미지로 R-02·R-03 생성(일관성). V1 에서는 R-01 1장만 확정되어도 EP01 진행 가능.

## 3. 생성 프롬프트 초안 (참고용 · 영문)

```text
Photorealistic portrait of a Korean woman in her late 30s to early 40s, a community pharmacist,
wearing a plain white pharmacist coat over a neutral top, no name tag, no logos.
Neat dark hair (shoulder-length bob or low ponytail), natural light makeup, no glasses.
Calm, trustworthy, approachable expression with a slight smile — not a commercial model look,
realistic like someone working at a neighborhood pharmacy in Korea.
Front-facing upper-body shot, looking at camera, soft even frontal lighting,
plain light gray studio background, no text, no props. High detail, 4:5.
```

네거티브(해당 도구에서 지원 시): `heavy makeup, glamour, exaggerated smile, jewelry, glasses, text, logo, watermark, product, stethoscope, hospital`.

## 4. 검수 기준 (채택 전 체크)

- [ ] §1 고정 속성 전부 부합 (특히 "광고 모델 같지 않음")
- [ ] 실존 인물·유명인 유사성 없음
- [ ] 라벨/텍스트/로고 0
- [ ] 해상도 2000px+ · 얼굴에 아티팩트 없음
- [ ] photo-avatar 서비스(HeyGen/DeepBrain 등) 요구조건 충족: 정면 · 얼굴 가림 없음 · 입 다물거나 자연스러운 표정

## 5. 등록 · 연결 (Claude Code 담당, 파일 수령 후)

- 저장 경로 제안: `C:\Users\home\Downloads\o4o-pharmacist-a-front.png` (R-01)
- Media Library 등록값: [등록 metadata 초안](MEDIA-LIBRARY-REGISTRATION-METADATA-DRAFT-V1.md) §3
- Job 연결: `8a357640` `purpose=INPUT`
- 사용 전 확인: 말하는 avatar 서비스 선택·로그인·결제는 **사용자 몫** (CHECK §7).
