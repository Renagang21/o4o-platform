# e약은요 → KO 설명서 재생산 파이프라인 파일럿 (B안: DB write 0)

WO-O4O-EASY-DRUG-KO-REBUILD-PIPELINE-PILOT-VALIDATION-V1

e약은요 공식 원문(`officialConsumerText`)이 현행 O4O 설명서 구조로 **원문 손실 없이** 변환되는지를
100 허가품목 표본으로 시험한다. 기존 canonical 은 건드리지 않으며, 산출물은 전부 파일이다.

```
기존 canonical 유지 → e약은요 기반 신규 KO candidate 생성 → 원문·구조·귀속 검증 → 전량 생산 가능 여부 판정
```

## 금지 사항 (이 디렉터리의 어떤 스크립트도 위반하지 않는다)

- `shared_product_descriptions` INSERT/UPDATE/DELETE **0** — 생성기·검증기는 DB 에 접속조차 하지 않는다.
- 기존 canonical 변경·승격·격리·archive·삭제 **0**.
- 번역 작업 없음(ko 단일). ProductMaster·ProductIdentifier·schema·migration 변경 없음.
- 시험 통과 전 전량 생산 없음.

## 실행 순서

```sh
# 1) 모집단 분류 + 시험 표본 추출 (운영 DB read-only)
#    세션에 SET default_transaction_read_only = on; 선행 권장
psql "$PROD_RO" -At -f export-pilot-population.sql > /tmp/pilot_population.json

# 2) KO candidate 시험 생성 (운영 러너와 동일 함수 import, 출력은 파일뿐)
npx tsx generate-ko-candidates.ts --in /tmp/pilot_population.json --out /tmp/pilot_out

# 3) 독립 검증 (생성 로직 미import — 기대값을 원천 JSON 에서 재계산)
node verify-ko-candidates.mjs \
  --population /tmp/pilot_population.json \
  --candidates /tmp/pilot_out/candidates.jsonl \
  --out /tmp/pilot_out
```

## 파일

| 파일 | 역할 |
|------|------|
| `export-pilot-population.sql` | 모집단 5분류 + 결정적 표본 100(정상 80 / 경계 15 / 결측 5) 추출. READ-ONLY |
| `generate-ko-candidates.ts` | 시험 생성. `composeEasyDrugContent` + `sanitizeDescriptionHtml` **운영 함수 그대로** 사용 |
| `verify-ko-candidates.mjs` | 독립 검증기. 원문 보존·토큰·HTML·절 집합·귀속 전수 검사 |
| `results/` | 파일럿 실행 결과 요약(생성 리포트 · 검증 요약 · 문제 큐 · 음성 대조) |

대용량 산출물(`candidates.jsonl`, `verification-per-record.jsonl`)은 커밋하지 않는다. 위 순서로 재생성된다.

## 검증기 독립성

`verify-ko-candidates.mjs` 는 생성 측 모듈을 import 하지 않고 절 라벨·순서·필수 절 목록을 자체 보유한다.
같은 코드를 공유하면 동일 버그를 함께 통과시키기 때문이다. 검출력은 **음성 대조**로 확인한다:
숫자 변조 / 단위 변조 / 문장 추가 / 절 삭제 / 바코드 변조 / status=canonical 변조 / `<script>` 주입
7건을 주입하면 7건 모두 PASS 에서 탈락한다(`results/negative-control-summary.json`).

## 결과 버킷

`PASS` / `REVIEW`(비필수 절 결측) / `HOLD_SOURCE`(효능·용법 결측) / `HOLD_MAPPING`(귀속·식별자 불일치) /
`INVALID_TRANSFORM`(원문 손실·구조 위반) / `FAILED_SYSTEM`
