# cosmetics-retail-census 산출물

`WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1` 산출물이다.
판정 요약은 [CHECK-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1](../../docs/checks/CHECK-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1.md) 참조.

원본 합계가 120MB 라 1MB 이상 파일은 **gzip 으로 보관**한다 (13MB). 스크립트는 평문 `.json` 을 읽으므로
재실행·후속 사용 전에 압축을 푼다:

```bash
gunzip -k tmp/cosmetics-retail-census/*.gz
```

생성 스크립트: `apps/api-server/src/scripts/cosmetics-retail-census/01~08`
(전량 공개 소스 재수집으로 재현 가능. `07-productmaster-compare.mjs` 만 DB read-only 접속이 필요하다.)

| 파일 | 내용 |
|------|------|
| `census-summary.json` | §13 최종 요약 — 소스별 기여율 / 모집단 / 기능성 4구분 / 생산 판단 |
| `retail-unique-guide-candidates.json.gz` | **최종 설명서 후보 33,106 단위** (모집단 본체) |
| `retail-normalized.json` | 소스별 정규화·기여율 메타 |
| `retail-raw-union.json.gz` | 정규화 전 소매 raw 합집합 |
| `source-musinsa.json.gz` / `source-hwahae.json.gz` / `source-oliveyoung-global.json` | 소스별 원수집 |
| `functional-index.json.gz` | 식약처 기능성화장품 보고 목록 180,412 |
| `functional-match.json.gz` | 소매 → 기능성 매칭 4구분 |
| `productmaster-compare.json` | 기존 O4O ProductMaster 비교 (read-only) |
| `issue-queue.json` | 사람 검수 큐 872건 |
