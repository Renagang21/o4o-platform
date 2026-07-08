# CHECK-O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-REFINEMENT-V1

## 1. 작업 일시

2026-07-08

WO: `WO-O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-REFINEMENT-V1`

이번 CHECK는 **설계 표준 문서 보완(문서 전용)** 결과다. 완료된 8개 OTC 트랙에서 검증된 설계 철학을 명문화했으며, 새로운 규칙 창작·코드 변경·DB write는 하지 않았다.

## 2. 수정한 문서

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1.md   (보완)
```

WRITING-GUIDE는 이전 커밋(f484b3ac9)에서 이미 상위 표준 참조를 추가했으므로 이번엔 변경하지 않았다.

## 3. 보완 항목 (WO §3)

| WO 항목 | 반영 위치 | 내용 |
|---|---|---|
| 3.1 설명서 목적 우선순위 | **§1.1 신설** | ① 올바른 약 선택 → ② 안전한 사용 → ③ 약사 상담 연결 → ④ 성분·허가 정보. "성분 설명 자체가 목적 아님" 명시 |
| 3.2 Canonical 분리 기준 명문화 | **§4.1 신설** | 4축 표(① 투여경로 ② 작용기전 ③ 소비자 선택축 ④ 안전성) + 실제 예시(1세대↔2세대·인공눈물↔충혈완화·좌약↔관장·점안액↔안연고·자극성↔삼투↔팽창) |
| 3.3 설명서 표준 Template | **§12-A 신설** | 필수 6블록(사용경우/사용방법/주의/병원방문/사용확인/성분기준) + 선택 2블록(Selection·Counseling) Canonical Template |
| 3.4 HOLD_SOURCE 철학 | **§8.1 신설** | "만들지 못한 상태가 아니라 만드는 것이 안전하지 않은 상태" · "근거 부족 시 작성하지 않는 것이 추정 작성보다 우선" |
| 3.5 Version 정책 | **§16 신설** | Minor(문장·예시·현황 → V1 유지) / Major(구조·규칙·철학 변경 → V2 신규) |

## 4. 제외 항목 (WO §4)

- **소비자 언어 원칙(전문용어 쉬운 말 강제) = 추가하지 않음.** 대신 **§1.2 Non-Goal**에 의도적 제외를 명문화: O4O 설명서는 "약국에서 약사가 활용하는 소비자 설명서"이므로 의학적 정확성·질환명 사용을 우선하고, 쉬운 설명 덧붙임은 작성자 판단에 맡긴다(WRITING-GUIDE §4.2 정합).

## 5. 정합성 확인 (WO §5)

- **기존 설계 철학과 충돌 없음**: 추가 항목(목적 우선순위·분리 4축·Template·HOLD 철학·Version)은 기존 §2~§13 원칙의 명문화·확장이며 상충 없음.
- **8개 완료 트랙 검증 원칙만 문서화**: 분리 4축·Template·안전성 블록은 ANTACID/ANTIDIARRHEAL/LAXATIVE/RECTAL-LAXATIVE/HEMORRHOID/DERMATOLOGY/OPHTHALMIC/RHINITIS CHECK에서 실제 사용된 구조.
- **새 규칙 창작 0**: MFDS 우선·SOURCE GAP·대표 게이트는 WRITING-GUIDE §3.11 참조 유지, 재정의 없음.
- **역할 중복 없음**: CANONICAL-STANDARD = 설계 철학, WRITING-GUIDE = 작성 규칙(문체·요약표·§3.11) 계층 유지(§0).

## 6. 변경 없음 확인

- 코드 변경 없음 · DB write 0 · MFDS API 호출 없음
- 변경 파일: 표준 문서 1건 + 본 CHECK 1건 (문서만)

## 7. 완료 기준 대비

| 기준 | 상태 |
|---|---|
| 기존 설계 철학과 충돌하지 않음 | ✅ |
| 완료 8개 트랙 검증 원칙만 문서화 | ✅ |
| 새 규칙 창작 안 함 | ✅ |
| WRITING-GUIDE와 역할 중복 없음 | ✅ (§0 계층 유지) |
| CANONICAL=설계철학 / WRITING-GUIDE=작성규칙 계층 유지 | ✅ |
| 코드 변경 없음 | ✅ |
| DB write 없음 | ✅ |
| CHECK 작성 및 GitHub 반영 | ✅ |
