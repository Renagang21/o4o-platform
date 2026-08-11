# cosmetics-guide-production 산출물

`WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1` 산출물이다. 화장품 설명서 후보 **33,106 단위 전량의 한국어 최소 설명서**.
판정 요약은 [CHECK-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1](../../docs/checks/CHECK-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1.md) 참조.

**운영 DB 에 쓰지 않았다** (WO §11). 전량 파일 산출물이며 ProductMaster 적용은 별도 후속 WO 다.
**영어 설명서는 이번 WO 범위가 아니다** (WO §7) — `englishGuides: 0`.

census 와 같은 규칙으로 1MB 이상 파일은 **gzip 으로 보관**한다. 스크립트는 평문 `.json` 을 읽으므로 재실행 전에 푼다:

```bash
gunzip -k tmp/cosmetics-retail-census/*.gz          # 입력(census)
gunzip -k tmp/cosmetics-guide-production/*.gz tmp/cosmetics-guide-production/batch-0*/*.gz
```

생성 스크립트: `apps/api-server/src/scripts/cosmetics-guide-production/01~05`
(외부 호출 0건. census 산출물만 입력으로 쓰므로 네트워크 없이 그대로 재현된다.)

```bash
node apps/api-server/src/scripts/cosmetics-guide-production/01-prepare.mjs
node apps/api-server/src/scripts/cosmetics-guide-production/02-generate-ko.mjs
node apps/api-server/src/scripts/cosmetics-guide-production/03-validate.mjs
node apps/api-server/src/scripts/cosmetics-guide-production/04-aggregate.mjs
node apps/api-server/src/scripts/cosmetics-guide-production/05-sample-for-review.mjs
```

| 파일 | 내용 |
|------|------|
| `production-input.json` | 모집단 33,106 · 배치 분할 계약 (10,000 × 3 + 3,106) |
| `batch-0N/guides-ko.json.gz` | 배치별 한국어 설명서 본문 |
| `batch-0N/issues.json.gz` | 배치별 문제 큐 |
| `batch-0N/validation.json` | 배치별 자동 검증 결과 (전 배치 위반 0) |
| `validation-summary.json` | 자동 검증 전체 요약 |
| `all-guides-ko.json.gz` | **통합 설명서 33,106건** (본체) |
| `issue-queue.json.gz` | 통합 문제 큐 21,115건 |
| `production-summary.json` | WO §15 보고 수치 원본 |
| `sample-review-100.json` / `sample-review-100.md` | 육안 검수 계통표본 100건 (규칙 S2) |

`03-validate.mjs` 는 생산 엔진(`guide-core.mjs`)을 **import 하지 않는다.** 허용 동작을 검증기에서 독립적으로 다시 유도해
엔진 버그가 스스로를 통과시키지 못하게 했다.
