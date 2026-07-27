# CHECK — WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-OROMUCOSAL-CONTENT-FP-V3-FINAL-READINESS-V1

**Agent:** 나 (na) · **모드:** PRE_APPLY READY 까지 (LIVE apply 금지) · **DB net write:** 0

## 0. 결론

| Unit | Route | 상태 | Master | Content FP | Write Plan | KO | EN |
|------|-------|------|-------:|-----------:|-----------:|----|----|
| topical-unit-1 | topical | **PRE_APPLY_READY** | 327 | 55 | 1,962 (KO 1,308 + EN 654) | ✅ | ✅ |
| oromucosal-unit-1 | oromucosal | **PRE_APPLY_READY** | 14 | 2 | 84 (KO 56 + EN 28) | ✅ | ✅ |
| **합계** | — | **READY** | **341** | **57** | **2,046** | — | — |

route별 executor/transaction/verifier 완전 독립. LIVE apply 는 이중 게이트 + per-route confirm env 로 **LOCKED**(이 WO 미실행).

## 1. 근거 SSOT

- V3 content-fingerprint 재승인 SSOT = commit `00851d237` · status `APPROVED_FOR_PRODUCTION` (라 세션 산출, HEAD 포함 확인).
- Fingerprint = `H([gencode, route, ...CONTENT_SECTIONS.map(k => hv[k])].join('|'))`, CONTENT_SECTIONS = 효능·효과 / 용법·용량 / 경고 / 사용상 주의사항 / 이상반응 / 상호작용 (6섹션 전량). sourceRef namespace = `otc-v3-content-leaflet:` (V2 와 분리).
- **핵심 개선:** intra-fp 6섹션 byte-identity 보장 → 대표검체 grounding 시 어느 master 도 금기·주의 정보 손실 없음(gencode fp 의 안전정보 약화 위험 해소).

## 2. 게이트 결과 (전부 통과)

| 게이트 | topical | oromucosal |
|--------|--------:|-----------:|
| Master/FP 카운트 ledger 일치 | 327/55 ✅ | 14/2 ✅ |
| intra-fp 6섹션 byte-identity mismatch | 0 ✅ | 0 ✅ |
| route 교집합 (unit 간 master disjoint) | 0 ✅ | 0 ✅ |
| 기존 authored canonical (KO/EN) | 0/0 ✅ | 0/0 ✅ |
| easy anchor (현재 canonical=mfds_easy_drug) | 327 ✅ | 14 ✅ |
| V3 sourceRef LIVE 충돌/누락 | 0 ✅ | 0 ✅ |
| sourceRef 독립 재도출(contentFpToUuid) 불일치 | 0 ✅ | 0 ✅ |
| KO 6섹션 렌더 · sd-warn · 표/주석 금지 | 통과 ✅ | 통과 ✅ |
| EN 한글 잔존 / route 동사 bleed / 수치 손실 / presence 패리티 | 0/0/0/0 ✅ | 0/0/0/0 ✅ |
| topical 전문가전용(professional-use) 오염 | 0 ✅ | — |
| oromucosal 삼킴/도포방식 오류 | — | 0 ✅ |

## 3. Dry-run x2 byte-identical

| Unit | Run1 planDigestMd5 | Run2 planDigestMd5 | 동일 |
|------|--------------------|--------------------|:----:|
| topical-unit-1 | `cc29b9988da9dffa147912251e04632a` | `cc29b9988da9dffa147912251e04632a` | ✅ |
| oromucosal-unit-1 | `14867f16e6fd0d3a1935d2c0b2b9c9b6` | `14867f16e6fd0d3a1935d2c0b2b9c9b6` | ✅ |

dry-run write plan: topical KO 1,308 = 327×4 · EN 654 = 327×2 / oromucosal KO 56 = 14×4 · EN 28 = 14×2. EN 은 KO canonical 선행 필요 → dry-run 에서 `HELD_KO_NOT_CANONICAL`(정상 신호).

## 4. Rollback test (per-route, net write 0)

fp별 단일 TX(KO 4T → KO 사후검증 → EN 2T → EN 사후검증) 실행 후 **항상 ROLLBACK**. 이후 독립 커넥션 residue 검증.

| Unit | fp pass/fail | TX 실행 후 rollback | residue (authored/v3ref/easyDeprecated/audit) | residueClean |
|------|:-----------:|--------------------:|----------------------------------------------:|:------------:|
| topical-unit-1 | 55/0 | 1,962 writes | 0 / 0 / 0 / 0 | ✅ |
| oromucosal-unit-1 | 2/0 | 84 writes | 0 / 0 / 0 / 0 | ✅ |

사후검증(TX 내): KO canon1=T · authored=T · easy deprecated=T · easyLeft=0 · dup=0 · scope=T · outside=0 · audit=T · writeActual==4T. EN enCanon1=T · dup=0 · scope=T · outside=0 · writeActual==2T. **커밋 0** — 모든 write 는 ROLLBACK.

## 5. LIVE apply 잠금

`otc-v3-topical-oromucosal-apply.na.ts --apply --confirm` + per-route env `OTC_V3_APPLY_KO_{UNIT}=CONFIRM` / `OTC_V3_APPLY_EN_{UNIT}=CONFIRM` **모두 요구**. 이 WO 는 env 미설정 → 실행 시 `LOCKED` 종료. EN 은 KO authored canonical 성립 후에만 진행.

## 6. 산출물

- 러너/라이브러리: `otc-v3-content-leaflet-composer.na.ts` · `otc-v3-topical-oromucosal-reproduce-build.na.ts` · `otc-v3-en-scaffold-tasks.na.ts` · `otc-v3-en-assemble-verify.na.ts` · `otc-v3-topical-oromucosal-apply.na.ts` · `otc-v3-preapply-verify.na.ts`
- 데이터: `otc-ready-na-v3/{build,en-build}-{unit}.json` · `reproduce-check-v1.json` · `en-check-v1.json` · `preapply-ready-{unit}.json` · `preapply-verify-v1.json` · `en/{scaffold,task,out}-*.json`

## 7. 불변식 준수

기존 비경구 GREEN 파일 미접촉(V3 전용 composer/profile 분리) · gencode 승인 SSOT 미수정 · 가/다/라 세션 파일 미접촉 · pnpm-lock.yaml 미접촉 · `.env` 값 미출력 · broad `git add` 미사용(자기 경로만). DB 변경은 rollback test 의 net-0 만, 커밋된 write 0.
