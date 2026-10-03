# Pilot 20-A — en 초안 가드 + ko/en 대조 + 소배치 최종 판정

WO: `WO-O4O-HFF-DESCRIPTION-GROUP-PILOT-PROBIOTICS-20-V1` · 소배치 A
기준: [GROUNDING-GUARD-CHECKLIST V1](../../../content-authoring/GROUNDING-GUARD-CHECKLIST.md) · ko 기록: [GUARD-20-A-KO](GUARD-20-A-KO.md) · grounding: [GROUNDING-20-A](GROUNDING-20-A.md)
**DB write 0 · master 0 · canonical 0**

작성 순서 고정: `grounding memo → 통과한 ko → en → 영어 가드 → ko/en 대조표 → 판정`

---

## 1. 영어 자체 가드 (기계 검사)

```text
파일                          최상급  부재추론  기능성강화(supports/improves/promotes/boosts/survives/reaches the gut)
a1-harudaru.en.html            []      []       []
a2-lactophil-entero.en.html    []      []       []
a3-paraotics.en.html           []      []       []
a4-kimchi-biocapsule.en.html   []      []       []
a5-bifisn.en.html              []      []       []
→ 전건 0
```
`may help` 프레임: 5/5 전건 유지(각 2회 — intro + sd-core).

## 2. A-3 · A-5 잠금 확인 (캡슐 중량 미표시 → 수치 생성 금지)

```text
a3-paraotics.en.html  : "per capsule" 0건 · daily total 0건 → labelled basis(per 700mg)만 표현
a5-bifisn.en.html     : "per capsule" 0건 · daily total 0건 → labelled basis(per 1,000mg)만 표현
```
두 건 모두 `sd-intake > small` 에 **"The capsule weight is not given in the filing, so the per-capsule and per-day totals are not stated here"** 를 명시(수치를 만들지 않고 부재를 밝힘).

## 3. ko/en 대조표

| 제품 | 기준량 ko/en | 균수 환산 | 섭취 횟수 ko/en | 제품명·제조사 | 판정 |
|---|---|---|---|---|---|
| A-1 하루하루 장편한 | 400mg 7/7 | 100억 → **10 billion** 7/7 | 1일 1회 / once a day | Newpharm | **OK** |
| A-2 락토필엔테로 비움 | 350mg 9/9 | 100억 → **10 billion** 8/8 | 1일 1회 / once a day | Bixol Banwol | **OK** |
| A-3 파라오틱스 | 700mg 5/6 | 100억 → **10 billion** 6/6 | 1일 2회 / twice a day | CTCBIO | **OK** |
| A-4 김치생유산균바이오캡슐 | 900mg 8/8 | 100억 → **10 billion** 7/7 | 1일 2회 / twice a day | Biorhythm | **OK** |
| A-5 비피스앤(N) | 1,000mg 7/7 | 1억 → **100 million** 7/7 | 1일 2회 / twice a day | Naturalway | **OK** |

환산 기준: `1억 = 100 million` · `100억 = 10 billion`. **불일치 0.**
`per serving / per capsule / per day` 혼용 0 — A-4는 ko·en 모두 "900mg = 450mg×2 = 1일분"을 명시, per-capsule 수치는 양쪽 다 미기재.

## 4. 요구 보고 항목

```text
ko/en 수치 불일치 건수           0
기준량 표현 오류 건수             0
영어에서 새로 생긴 주장 건수      0   (ko에서 삭제한 실온보관·부담·최상급 재발 0)
체크리스트 최초 검출 건수         3   (ko: 최상급 2 + 부재추론 1 / en: 0)
수정 후 잔여 위반 건수            0
20-A 최종 PASS 여부              PASS (수정 후)
```

## 5. 소배치 A 최종 판정 — **PASS (수정 후)**

- 5건 전부 grounding READY · 제조사 5곳 상이 · 1일 총 균수 100억/100억/미확정/100억(1캡슐 50억)/산출불가로 전부 다름
- **en 신규 위반 0** — ko 단계에서 기계 가드를 통과시킨 뒤 en 을 쓰니 en 에서는 최초 검출 자체가 0이었다. **가드를 앞단(ko)에 두는 순서가 유효함을 시사**한다.
- 장용성(A-3)은 **원문 근거가 있어** ko·en 모두 서술 — "데이터원에 장용성 없음"이라는 과일반화를 20-A가 반증([AGENT-KICKOFF 부록 정정](../AGENT-KICKOFF.md)).

## 6. 파일럿 판정 방향 (§12)

현 단계 기울기 유지 — **완전 무검수 대량 생성 부적합 / 구조화된 자동 검사 + 소배치 검수 필수.**
근거: ko 최초 검출 3건 중 **a2 는 5건 파일럿(뉴로랩스)과 동일 유형이며 그 규칙을 문서화한 작성자 본인이 반복**. 반면 **기계 가드 삽입 후 en 은 0** → 가드가 실효.

## 7. 다음

**20-B**(분말·스틱 5건) 를 동일 가드로 진행: 작성 전 §A 환산식 확정 → ko → 기계 검사 → en → 대조 → 판정.
