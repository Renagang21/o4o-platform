# WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1 — CHECK

**판정: PILOT PASS — 전량 재생산 가능**

e약은요 원문에서 한국어 STORE 설명서를 처음부터 다시 만드는 파이프라인을 대표 500
ProductMaster 로 검증했다. 운영 DB write 0, EN·ZH·JA 변경 0.

산출 경로: [`apps/api-server/src/scripts/easy-drug-ko-full-rebuild-pilot/`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-pilot/)
([README](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-pilot/README.md))

---

## 1. API 이용 가능 상태

- 엔드포인트 `DrbEasyDrugInfoService/getDrbEasyDrugList` · `type=json` · 인증 정상
- `numOfRows` 상한 **500** (초과 시 `resultCode 11`) → 10 페이지로 전량 수집
- `totalCount` 4,775 · 수집 4,758 (중복 itemSeq 17 제거) · 실패 0
- API 키는 런타임에만 읽고 로그·산출물·커밋에 포함하지 않았다

섹션 존재율: 효능 4,749 / 용법 4,753 / 사용상 주의 4,747 / 보관 4,746 / 이상반응 4,525 /
상호작용 3,307 / **경고 1,132** — 경고 필드는 원래 대부분 비어 있다.

## 2. 최신 공식 모집단 (참고값은 목표로 쓰지 않았다)

| 축 | 참고값 | **LIVE 실측** |
|---|---:|---:|
| e약은요 연결 ProductMaster | 19,431 | **19,507** |
| 허가품목(distinct itemSeq) | 4,757 | **4,782** |
| 허가품목 × 본문 대조단위 | 5,198 | **5,171** |

- API 조회 성공 itemSeq 4,758 / 미조회 24 / API 에만 있고 미저장 25 / 저장에만 있고 API 부재 24
- 필수 섹션 결손 itemSeq 10 (효능 9 · 용법 5)
- 제외 대상 master 42 — 전량 `PROFESSIONAL_USE`
- **저장 snapshot 과 API 원문 hash 불일치 164 itemSeq** (이상반응 126 · 주의 116 · 상호작용 86 ·
  보관 71 · 용법 62 · 경고 20 · 효능 5). 저장본 재사용이 아니라 **API 재수집이 옳다**는 근거다.

## 3. itemSeq ↔ ProductMaster 연결 상태

- itemSeq 당 master: 2–5 → 3,908 · 6–20 → 849 · 21–100 → 24 · 100+ → 1 (최대 114)
- 같은 itemSeq 안에서 기존 KO 본문이 갈라진 허가품목 **385**, KO 가 아예 없는 허가품목 65
- API itemSeq 중 master 미연결 **0**

## 4. 파일럿 500 구성

순위 키 `sha256(masterId)` — 앞번호 선택이 아니고 재실행해도 같은 500 이다.
같은 허가품목 상한 3 (multiMaster 축 확보 목적).

- 선정 500 / 허가품목 392 / 풀 19,395 master · 4,749 itemSeq
- 경로: 경구 134 · 외용 95 · 점안 52 · 구강점막 51 · 비강 47 · 질 46 · 직장 46 · 미분류 29
- 그 외 축(성분 단일/복합, 연령, 1회량, 1일 횟수, 간격, 기간, 강한 금기, 긴 이상반응,
  상호작용, 다중 master, 기존 결함 이력 5종, 기존 정상 승인, 원문 결손) **전부 쿼터 충족**

**미충족 1건 — `route:otic` (want 20, got 0).** 풀 자체에 0 이다.
`점이액|점이제|귓속|외이도|귀(안|속)에 (넣|점적|투여)` 로 4,758건 원문 전수를 훑어도 0 hit —
e약은요 공개 모집단에 **점이 제품이 존재하지 않는다.** 원천 갭이므로 우회하지 않고 보고한다.
(`점이` 단독 매칭은 원문의 "궁금한 **점이**" 에 걸려 오탐이 나므로 쓰지 않았다.)

## 5. 생산 결과

| 판정 | 건수 |
|---|---:|
| PILOT_PASS | **495** |
| SOURCE_INCOMPLETE | 5 |
| 그 외 8종 (PARSE/STRUCTURE/NUMERIC/ROUTE/CONTENT_LOSS/CONTENT_ADDITION/WRONG_ATTRIBUTION/HOLD) | **0** |

시스템 실패 0. 생성 HTML distinct md5 400 (동일 허가품목 다중 master 는 같은 본문이 정상).

## 6. 결함 유형별 분포 (신규 생산본)

16축 중 걸린 축은 `sourceIncomplete` 5건뿐이다. 원문에 효능 또는 용법이 없는 제품이며
WO 기준 "원문 확인 불가 → HOLD" 에 해당한다. 나머지 15축 0.

## 7. 기존 KO 대비 개선 (기존 KO 는 생성 입력이 아니라 비교 대상으로만 읽었다)

500건 중 기존 KO canonical 이 있는 **473건** 기준:

| 축 | 기존 KO | 신규 |
|---|---:|---:|
| 원문 항목 보존율 | **76.9%** (4,859/6,319) | **100%** (6,248/6,248) |
| 원문 항목 누락 | 1,458건 / master 453 | **0** |
| 원문 밖 문장 | 752문장 / master 287 | 0 |
| 수치·부정어 어긋남 | master 175 | 0 |
| 오귀속(다른 허가품목 제품명 혼입) | master 2 | 0 |
| 문장 절단(`…` 종결 등) | 28건 / master 13 | 0 |
| **결함 0 설명서** | **20 / 473** | **495 / 495** |

집계 시 오탐 2종을 제거했다: 기존 KO 의 `&nbsp;` 미해제로 같은 문장이 누락+추가로 이중 계수되던 것,
그리고 품목기준코드·표준코드 같은 6자리 이상 식별자 숫자가 "수치 모순" 으로 잡히던 것.

## 8. 원문 정보 보존

효능·용법·연령·1회량·1일 횟수·간격·기간·투여 경로·금기·부정어·경고 강도·이상반응·상호작용·
보관 방법·섹션 침범·타 제품 혼입 **16축 전부 위반 0**.

경로 동사 치환과 고정 글자 수 절단은 **계약 수준에서 배제**했다(선행 트랙 코퍼스 파손의 실제 원인).
표본 확인: 외용 설명서의 "붙입니다" · "외용으로만 사용하십시오" 가 원형 그대로 살아 있다.

e약은요 에 "사용하면 안 되는 경우" / "사용 전 상담이 필요한 경우" 전용 필드가 없는 구조 갭은
`atpnWarnQesitm + atpnQesitm` 의 **순서 보존 전단사 3분배**로 처리했다.
항목 문자열 무변경, `원문 항목 수 = 3버킷 합` 자기검사 위반 0.

## 9. 독립검증

`verify-independent.mjs` 는 생산 계약을 import 하지 않는다. 다른 문장 분할기, 다른 토큰 정규식,
문자 다중집합 비교, HTML 에서 역구성한 chrome 을 쓴다. **13개 검사 전부 0 → PASS.**

검증력 증명 — 음성 대조 8종 전부 FAIL 로 검출:
`drop_sentence` `truncate` `change_number` `drop_negation` `route_swap` `add_medical`
`foreign_product` `wrong_itemseq`.

검증기 자체의 오탐 4종을 먼저 잡고 나서 얻은 결과다: 라벨 침범을 접두 일치로 본 것(원문 문장이
"이상반응…" 으로 시작하는 경우), 3버킷 재분배로 문장 쌍이 갈리는 것을 절단으로 본 것,
`itemName` 안의 개행("(수출명 : …)")을 의료 정보 추가로 본 것, 공백 압축이 "5, 6" 을 한 토큰으로
합쳐 숫자 손실로 본 것.

## 10. 멱등 재실행

`build-pilot-leaflets.mjs` 재실행 후 `leaflets.jsonl` · `structured.jsonl` ·
`leaflet-ledger.jsonl` **md5 전부 일치**. `select-pilot-500.mjs` 재실행도 동일 선정.

## 11. DB write 0

DB 접근은 단계 2·9 두 번뿐이고 매 세션 `SET default_transaction_read_only = on` 을 걸었다.
INSERT/UPDATE/DELETE 0. `shared_product_descriptions` 무변경 → EN 19,081 · ZH 912 · JA 0 그대로다.
자격증명은 환경변수로만 주입했고 스크립트·산출물·커밋에 남기지 않았다.

## 12. 전량 생산 예상 규모

비율 외삽이 아니라 **같은 생산 계약을 19,507 master 전량에 실제로 적용한 실측**이다.

| 상태 | 건수 |
|---|---:|
| **PRODUCIBLE** | **19,363 (99.26%)** — 허가품목 4,739 |
| HOLD_NO_API_SOURCE | 70 |
| HOLD_EXCLUDED (전문의약품) | 42 |
| HOLD_SOURCE_INCOMPLETE | 32 |
| HOLD_STRUCTURE_ANOMALY | 0 |
| HOLD 합계 | **144 (0.74%)** |

생성 본문 총량 약 68.8 MB.

## 13. 후속 전량 생산 방식

1. 파일 생산 → 독립검증 PASS → dry-run ×2 → rollback 계약 확인 (이번 파일럿과 동일 순서)
2. LIVE 적용은 master 별 TX + `SELECT … FOR UPDATE` + TX 내 post-verify 3중 일치 (선행 트랙 계약 재사용)
3. HOLD 144 는 게시하지 않고 원장으로만 남긴다
4. **파생 EN·ZH 는 KO 교체가 끝난 뒤** 비노출·폐기·재번역 대상으로 별도 처리한다.
   현재 EN 19,081 · ZH 912 는 잘못된 KO 에서 파생되었으므로 KO 교체 전 재번역은 무의미하다
5. 승인 상태 재잠금 범위는 KO 교체 완료 시점에 다시 산출한다

**결론: 전량 재생산 가능.** 부분 수정 방식은 473건 중 결함 0 이 20건에 불과해 수렴하지 않는다.

## 14. 결정 / 남는 제약

- **점이(otic) 경로는 e약은요 모집단에 없다.** 대체 원천 없이는 이 경로 검증이 불가능하다.
- 저장 snapshot 과 API 원문이 어긋난 164 itemSeq 는 **API 를 정본**으로 삼는다.
- 원문에 효능 또는 용법이 없는 제품은 저작하지 않고 HOLD 한다(원문 없는 의료 문장 생성 금지).

## 15. commit / push

- commit: `<이 CHECK 를 포함한 커밋 해시>`
- pathspec: `apps/api-server/src/scripts/easy-drug-ko-full-rebuild-pilot/**` + 본 문서
- 타 세션 WIP(admin-dashboard·membership 등) 미접촉. `git add .` 미사용.
