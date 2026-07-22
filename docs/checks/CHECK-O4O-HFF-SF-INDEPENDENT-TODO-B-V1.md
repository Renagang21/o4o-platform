# CHECK — HFF 단일 기능성 독립 TODO 완결 생산 (Agent B) V1

- 상위 WO: `WO-O4O-HFF-SF-INDEPENDENT-TODO-B-V1`. 자동승인 계약 [`...AUTO-AUTHORIZATION-CONTRACT-V1`](../work-orders/WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1.md). 정본 파이프라인 `hff-sf-*`.
- 성격: **완결형 자동 생산 (독립 TODO)** — 조사→generate→apply→독립검증→commit. 각 성분 소유 = Agent B.
- 시작 `2026-07-22 22:50 +0900` · 종료 단일 세션. 채널 Proxy 5435. 소유 성분 교집합(A/C) 0.

## 0. 결론

> **세션 신규 LIVE = 44** (인삼 23 · 키토산 10 · 키토올리고당 2 · 콜레우스포스콜리 6 · 돌외잎 3).
> 전건 독립검증 PASS · canonicalDup 0 · statementNo 중복 0 · 기존 LIVE drift 0 · DB write **176**(44×4).
> 초기 TODO 43(인삼28·키토산12·키토올리고당3) → generate PASS 35. 추가 대사(체지방) 2성분 정본화 → +9. 잔여 후보 PENDING_SHARED.

## 1. TODO 실행 결과

| TODO | 성분 | READY | generate PASS(=LIVE) | tag |
|---|---|---:|---:|---|
| B-01 | 인삼 | 28 | **23** | batch:single-functional-korean-ginseng-b1 |
| B-02 | 키토산 | 12 | **10** | batch:single-functional-chitosan-b1 |
| B-03 | 키토올리고당 | 3 | **2** | batch:single-functional-chitooligosaccharide-b1 |
| B-04 | 콜레우스포스콜리 | 9 | **6** | batch:single-functional-coleus-forskohlii-b1 |
| B-04 | 돌외잎 | 4 | **3** | batch:single-functional-gynostemma-b1 |
| **합계** | | | **44** | |

- REVIEW_LATER/BLOCKED(비-LIVE): 인삼 5·키토산 2·키토올리고당 1·콜레우스 3·돌외잎 1 = 12 (Guard REVIEW/BLOCKED·EN 부분 → 개별 분리, 다음 성분 계속).
- 매장용 원칙: 공식 기능성(면역/피로/혈중콜레스테롤/체지방) 원문 grounded 유지, 방어적 축소 0. 하단 전문가 문의 안내 유지.

## 2. 신규 정본화 (B-04)

`hff-sf-registry.ts` `SF_INGREDIENTS` 확장(내 소유 파이프라인). displayEn=표준 식물명 정적 lookup(§3), 기능성 EN=`mapFunctionEn` 재사용(임의생성 0):
- 콜레우스포스콜리 → Coleus forskohlii extract (체지방 감소, labelRe `/콜레우스\s*포스콜리|포스콜린/`)
- 돌외잎 → Gynostemma pentaphyllum extract (체지방 감소, labelRe `/돌외/`)

## 3. 자동 apply 게이트 (전건 통과)

| 성분 | dry-run | apply COMMIT | 독립검증(새 연결) |
|---|---|---|---|
| 인삼 | PASS(92=23×4) | masters/spd/cand 23 · canonicalDup 0 | spdRef 46 · stmtDup 0 · PASS |
| 키토산 | PASS(40) | 10 · canonicalDup 0 | spdRef 20 · stmtDup 0 · PASS |
| 키토올리고당 | PASS | 2 · canonicalDup 0 | stmtDup 0 · PASS |
| 콜레우스포스콜리 | — | 6 · canonicalDup 0 | stmtDup 0 · PASS |
| 돌외잎 | — | 3 · canonicalDup 0 | stmtDup 0 · PASS |

- 계약: status=canonical · STORE · o4o_hff_generated · barcode NULL · candidate=approved_new_master. 롤백 매니페스트 성분별 저장.

## 4. PENDING_SHARED (억지 처리 안 함)

발굴됐으나 공용 변경/EN·영문명 미확정 → 건너뜀(전체 중지 안 함):
- 오비엑스Ob-X(복합·고유명) · 알콕시글리세롤함유상어간유(고유명) · 스피루리나·클로렐라·표고버섯균사체(면역, EN 대부분 미매핑) · 베타글루칸.
- 후속: 공식 영문명·기능성 EN 확정 WO(사람검수). 임의생성 금지.

## 5. 회귀검증

| 항목 | 결과 |
|---|---|
| 단일 기능성 LIVE(전 agent) | 174 (세션 +44) |
| canonicalDup / stmtDup master | **0 / 0** |
| A/C 소유 성분 포함 | 0 (인삼/키토산/키토올리고당/콜레우스/돌외잎만) |
| 원료 교차 귀속 | 0 (pure-single 브래킷 1 + labelRe 유일식별) |
| 기존 LIVE drift | 0 (신규 master INSERT + 대상 candidate UPDATE) |
| deterministic | 파서·hash 결정적 |

## 6. 보고 요약

```text
시작 22:50 · 종료 단일 세션
처리 성분: 인삼·키토산·키토올리고당(초기 43) + 콜레우스포스콜리·돌외잎(추가 대사)
성분별 LIVE: 인삼23·키토산10·키토올리고당2·콜레우스6·돌외잎3 = 44
총 신규 LIVE 44 · DB write 176 · canonicalDup 0 · stmtDup 0 · 기존 LIVE drift 0
독립검증 전건 PASS
남은 TODO: PENDING_SHARED(오비엑스·알콕시글리세롤·스피루리나·클로렐라·표고·베타글루칸 = 영문명/EN 미확정)
```

## 7. 산출물

- 성분별 target + 롤백 매니페스트: `docs/checks/data/product-description-guard/hff-sf-btodo/`
- registry 확장: 콜레우스포스콜리·돌외잎(`hff-sf-registry.ts`)

---

*완결형 자동 생산 · DB write 176 · 독립검증 전건 PASS · A/C 소유 성분 미접촉 · 임의 EN 생성 0.*
