# easy-drug-ko-full-rebuild-pilot

**WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1**

data.go.kr 식약처 **e약은요** 를 공식 원천으로 삼아 한국어 STORE 설명서를 **처음부터 다시 만드는**
파이프라인을 확정하기 위한 대표 500 ProductMaster 파일럿이다.

- 기존 KO 설명서의 의료 내용은 **입력으로 쓰지 않는다.** 디자인 참고와 사후 비교 전용이다.
- 운영 DB **write 0.** 모든 산출은 파일이다.
- EN·ZH·JA **변경 0.**

## 왜 부분 수정이 아니라 전면 재생산인가

기존 KO 500건을 원문과 대조한 결과(단계 9): 원문 항목 보존율 **76.9%**, 결함 없는 설명서는
473건 중 **20건**뿐이었다. 누락 453 · 원문 밖 문장 287 · 수치/부정어 어긋남 175 ·
오귀속 2 · 문장 절단 13. 개별 결함을 고치는 방식으로는 수렴하지 않는다는 뜻이다.
같은 500건을 원문에서 재생산했을 때 보존율은 **100%** 였다.

## 실행 순서

```bash
# 0) 프로덕션 read-only 프록시 (DB 접근은 단계 2·9 뿐)
cloud-sql-proxy.x64.exe --port 15441 netureyoutube:asia-northeast3:o4o-platform-db

node fetch-official-source.mjs   # 4  e약은요 API 전량 수집 → 원문 보관층
node census-population.mjs       # 2  LIVE 모집단 재산출 (read-only)
node select-pilot-500.mjs        # 3  파일럿 500 선정 (결정적)
node build-pilot-leaflets.mjs    # 5·6·7  구조화 → sd-* 조립 → 16축 검증
node verify-independent.mjs      # 8  독립검증 (생산기 미import)
node diff-existing-ko.mjs        # 9  기존 KO 대비 비교 (read-only)
node project-full-scale.mjs      # 10 전량 생산 규모 실측
```

DB 자격증명은 환경변수(`PGUSER`/`PGPASSWORD`)로만 주입한다. 스크립트·산출물·커밋에 넣지 않는다.
API 키는 `apps/api-server/.env` 의 `MFDS_API_KEY` 를 런타임에만 읽는다.

## 파일

| 파일 | 역할 |
|---|---|
| `fetch-official-source.mjs` | e약은요 API 전량 수집. 응답 문자열 원형 보존 + 조회 시각 + hash |
| `census-population.mjs` | itemSeq ↔ ProductMaster 연결·API 조회·저장 snapshot 대비 hash 차이 (read-only) |
| `select-pilot-500.mjs` | 경로 8계열·성분·용량·연령·금기·결함 이력 쿼터로 500 선정. 순위 키 `sha256(masterId)` |
| `pilot-contract.mjs` | **생산 계약** — 9영역 구조화 + `sd-*` HTML 조립 |
| `build-pilot-leaflets.mjs` | 생산 + 16축 정보 보존 검증 + 판정 10종 |
| `verify-independent.mjs` | 독립검증기. 생산 계약을 import 하지 않는다. `--inject <type>` 로 음성 대조 |
| `diff-existing-ko.mjs` | 기존 KO 대비 누락·추가·모순·오귀속·절단 집계 (read-only) |
| `project-full-scale.mjs` | 전 모집단에 같은 계약을 실제 적용해 생산 가능/HOLD 실측 |

## 생산 계약이 하지 않는 것

선행 트랙에서 KO 코퍼스를 실제로 파손시킨 두 기법을 계약 수준에서 배제했다.

- **경로 동사 치환** (`복용` → `사용`) — "내복하지 마십시오" 를 때려 자기모순 문장을 만들었다.
- **고정 글자 수 절단** (`slice(0, 120)`) — 요약 뱃지가 문장을 중간에서 잘랐다.

유일하게 허용한 재배치는 WO §5 가 명시한 **위치 분리**다. e약은요 에는
"사용하면 안 되는 경우" / "사용 전 상담이 필요한 경우" 전용 필드가 없어서
`atpnWarnQesitm` + `atpnQesitm` 항목을 **순서 보존한 채 3버킷으로 전단사 분배**한다.
항목 문자열은 한 글자도 바꾸지 않으며, `원문 항목 수 = 3버킷 합` 자기검사가 붙어 있다.

## 독립검증

`verify-independent.mjs` 는 다른 문장 분할기(`(?<=\.)(?!\d)`), 다른 토큰 정규식,
문자 다중집합 비교를 쓰고 chrome 을 HTML 에서 역구성한다. 검증력은 **음성 대조 8종**으로 증명했다:
`drop_sentence` `truncate` `change_number` `drop_negation` `route_swap` `add_medical`
`foreign_product` `wrong_itemseq` — 전부 FAIL 로 잡히고, 무주입 실행은 PASS.

주의: 주입 대상은 **해당 패턴이 실제로 있는 설명서**를 골라야 한다. 패턴 없는 본문에 주입하면
무변경이 되어 검증기가 통과한 것처럼 보인다(실제로 한 번 그렇게 속았다).

## 산출물

`results/` — 요약 JSON 과 본문 없는 원장만 추적한다. 본문 포함 대용량 파일은 `.gitignore` 대상이며
동일 입력으로 재생성하면 byte-identical 이다.
