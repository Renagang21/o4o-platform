# WO-O4O-OTC-TRANSLATION-QUALITY-SAMPLE-V1 — OTC 설명 AI 번역 품질 비교 표본

> **상태**: ACTIVE
> **작성일**: 2026-11-13
> **실행 위치**: BOTH (스크립트 CLOUD 완료 · 실행 LOCAL · 판정 CLOUD)
> **인계**: 코드 병합 후 LOCAL 이 T1 → T2 → T3 를 실행하고 결과 파일을 CLOUD 에 넘긴다 → CLOUD 가 T4 판정
> **근거**: 2026-11-13 사용자 결정 — 소비자 다국어는 한국어 원본 + AI 번역 + 한국어 병기. OTC 내용(용법 · 용량 · 금기)은 허가 정보라 원문이 같고, 확인할 것은 번역 품질뿐이다. 매장 안에는 약사가 있다.

## 1. 질문

OTC 설명에 미리 만들어 둔 영문(기존 검수 번역) 대신, 한국어 원본을 운영 AI 번역 경로로 번역해 보여 줘도 품질이 충분한가.

## 2. 방법

| 단계 | 내용 | 쓰기 |
|---|---|---|
| extract | 한국어 · 영문 canonical 설명이 모두 있는 OTC 를 층별로 10건씩, 총 30건 고른다. 층은 소아 연령 제한 · 비경구(바르는 약 · 눈 · 질 · 붙이는 약) · 일반 내복약이다. `md5(master_id)` 순서로 고정해 다시 돌려도 같다 | 없음(`o4o_readonly` · read-only transaction) |
| translate | 표본의 한국어 원본을 운영 번역 경로(`ContentTranslationService` · `CONTENT_TRANSLATION` 정책 · 같은 모델 · 같은 프롬프트)로 영어 번역한다 | 설명 표에는 쓰지 않는다. **AI 사용 기록(정산 · 한도)은 운영 경로대로 남는다** — 운영 DB 쓰기 |
| compare | 파일만 읽는다. 원문 · 기존 영문 · AI 번역의 숫자, 금지 표현 수, 한글 잔존을 대조한다 | 없음 |

- 코드: `apps/api-server/src/scripts/otc-translation-sample.ts`(CLI) · `otc-translation-sample.service.ts`(표본 SQL · 비교 규칙) · 시험 `src/scripts/__tests__/otc-translation-sample.test.ts`.
- 의약품 허가 정보만 다룬다(개인정보 없음). **결과 파일은 저장소에 넣지 않는다.** 판정 요약만 기록한다.

## 3. TODO

- [ ] T1 [LOCAL] extract — 읽기 전용
- [ ] T2 [LOCAL] translate — **통합 담당 승인 후**(AI 비용 · 사용 기록 쓰기 · AGENTS.md §5). 30건 정도로 비용은 작다
- [ ] T3 [LOCAL] compare — 파일만. `*.json` 과 `*.compare.json` 두 파일을 CLOUD 세션에 첨부로 넘긴다
- [ ] T4 [CLOUD] 판정 — `check` 항목을 사람 눈으로 확인하고, 결과를 이 문서 §6 에 요약한다

## 4. 실행 (LOCAL)

Cloud SQL Proxy 를 `127.0.0.1:55432` 로 띄우고 저장소 루트에서 실행한다(접속 절차 [`SETUP.md`](../../SETUP.md)). 결과 파일은 저장소 밖 경로로 지정한다.

```bash
OTC_SAMPLE_MODE=extract OTC_SAMPLE_FILE=<저장소 밖 경로>/otc-sample.json DB_NAME=<운영 DB> npx tsx apps/api-server/src/scripts/otc-translation-sample.ts
```

T2 는 서버와 같은 DB 연결 설정(`DB_HOST` · `DB_PORT` · `DB_USERNAME` · `DB_PASSWORD` · `DB_NAME`)으로 실행한다. `OTC_SAMPLE_ACTOR` 는 AI 사용 기록에 남을 실행 승인자(통합 담당)의 사용자 ID 다. 중간에 멈추면 같은 명령을 다시 실행한다 — 번역된 항목은 건너뛴다.

```bash
OTC_SAMPLE_MODE=translate OTC_SAMPLE_FILE=<같은 경로>/otc-sample.json OTC_SAMPLE_ACTOR=<승인자 사용자 ID> npx tsx apps/api-server/src/scripts/otc-translation-sample.ts
```

```bash
OTC_SAMPLE_MODE=compare OTC_SAMPLE_FILE=<같은 경로>/otc-sample.json npx tsx apps/api-server/src/scripts/otc-translation-sample.ts
```

**판정 기준(compare 자동 분류)**

- `ok` — 원문 숫자(용량 · 횟수 · 연령)가 AI 번역에 모두 있고, 새 숫자가 없고, 금지 표현이 줄지 않았고, 한글이 남지 않았다.
- `check` — 위 중 하나라도 어긋난다. 사람이 원문과 대조한다. 기존 영문도 같은 숫자를 빠뜨렸으면(`savedEnMissingNumbers`) 원문 표기 문제일 수 있다.
- `failed` — 번역 결과가 없다(정책 비활성 · 시간 초과 등). 다시 실행한다.
- 단독 「1」은 세지 않는다(「1회 · 1일」 → per dose · a day). 단위는 비교하지 않는다.

## 5. 결정에 쓰는 기준 (T4)

- `check` 를 사람이 확인한 뒤 **실제 오역(숫자 · 금지 · 투여 경로)이 0건**이면, OTC 도 「한국어 원본 + AI 번역 + 한국어 병기」로 통일한다. 기존 영문 686건은 새로 만들거나 늘리지 않고, 비교 기준으로만 남긴다.
- 실제 오역이 있으면, 그 유형을 번역 프롬프트에 반영할지 · 기존 영문을 검수 번역으로 우선 쓸지를 결정한다(별도 지시).

## 6. 결과

(T4 에서 기록)

## 7. 문서 정합

해당 없음.
