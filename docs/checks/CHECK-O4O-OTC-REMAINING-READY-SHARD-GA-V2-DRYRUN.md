# CHECK — WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2 · 공용 러너 dry-run (에이전트 가)

**세션:** 에이전트 가 · 기계 sohae · 2026-07-25
**기준 commit:** V2 census/SSOT `81b39da72` · 공용 러너 `3447b2323`
**러너:** `apps/api-server/src/scripts/otc-v2-store-leaflet-runner.shared.ts` (다 세션 작성 · **본 세션 미수정**)
**판정:** **DRY-RUN PASS** — 237 fp / 837 master 생산 적격 · 1 fp / 2 master `HOLD_SOURCE` 분리
**DB write: 0** (러너 dry-run 전용 경로, apply 경로 없음)

---

## 1. 실행 명령 (자기 shard 한정)

```
tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts --selftest
tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts --shard=ga --dry-run
tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts --shard=ga --emit-sample --per-route=2
tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts --shard=ga --dry-run --fp=e0ab08c1797832bf   # HOLD 확인
```

접속: Cloud SQL Auth Proxy `127.0.0.1:5442`. 자격증명은 `process.env` 로만 전달했고 **값 열람·출력 0**,
`apps/api-server/.env` **생성·수정·삭제 0**, 루트 `.env` 미사용.

## 2. selftest

`SELFTEST PASS` — fp 재현(제품명 미개입) · route resolver · 경로별 KO/EN · 수치 보존 · 차단 게이트 · 앵커 분리.
지원 route: oral, oromucosal, topical, ophthalmic, nasal, vaginal, rectal. DB 미접속.

## 3. dry-run 결과 — SSOT 선언값 == 실측 (전 게이트 PASS)

| 게이트 | 기대 | 실측 | 판정 |
|--------|-----:|-----:|:---:|
| SSOT 선언 fp / master | 238 / 839 | 238 / 839 처리 | PASS |
| **fp 재현** (일반명코드·경로 축) | 839 | **839 (실패 0, 재현율 1.0)** | PASS |
| **canonicalDup** | 0 | **0** | PASS |
| **기존 완료분 교집합** | 0 | **0** | PASS |
| 차단 대상 혼입 (fp / master) | 0 / 0 | 0 / 0 | PASS |
| **CLQ·CDS·CSI (적용부위 미확정 651m)** | 0 | **0** | PASS |
| shard 밖 master | 0 | 0 | PASS |
| 빅콘에스600정 | 0 | 0 (V2 census 단계에서 HOLD_SOURCE) | PASS |
| DB write | 0 | **0** | PASS |
| 적격 그룹(admitted) | — | **237** | — |
| 이상 그룹 | — | 1 (아래 §4) | HOLD 처리 |

**writePlan (적격 837 master 기준)**: KO `4T × 837 = 3,348` + EN `2T × 837 = 1,674` = **5,022 T**
— 839 master 전량 기준 산식(3,356 + 1,678)에서 HOLD 2 master(12 T)를 정확히 제외한 값과 일치.

### route 분포 (실측)

| route | fp | master |
|-------|---:|------:|
| oral | 200 | 632 |
| ophthalmic | 16 | 112 |
| topical | 18 | 79 |
| oromucosal | 3 | 14 |
| **적격 계** | **237** | **837** |

SSOT 선언(oral 634 · ophthalmic 112 · topical 79 · oromucosal 14 = 839)에서 oral 2 master 가 HOLD 로 빠진 차이뿐이다.

## 4. HOLD_SOURCE 분리 1건 — 추정 보완 없음

| 항목 | 값 |
|------|----|
| fp | `e0ab08c1797832bf` |
| 일반명코드 | `227703ATB` (oral · 정) |
| master | **2** |
| 사유 | **공식 원문 주의 축 부재** — 경고/사용상 주의사항/상호작용/이상반응 전 섹션 없음 (`KO 필수필드 누락 caution`) |
| 처분 | `HOLD_SOURCE` 로 분리, **생산 제외**. 용법·주의를 추정·보완하지 않음 |
| write | KO 0 / EN 0 (dry-run writePlan 에서 제외 확인) |

**독립 확인**: 공용 러너와 별개 구현인 본 세션 composer(`otc-v2-ko-compose.ga.mjs`)로 동일 fp 를 재실행한
결과도 `skipped: source_axis_missing` 으로 일치했다(두 구현 동일 판정, DB write 0).

선례 정합: 빅콘에스600정(용법 1축 부재 → HOLD, commit `8bab22471`) 과 동일 원칙 —
**공식 원문 필수 축 결손 시 저작 금지**(CLAUDE.md 콘텐츠 불변 원칙).

## 5. 샘플 검증 (`--emit-sample --per-route=2`, 8건)

| route | fp | gencode | master | fp재현 | usageLabel | 경구동사 혼입 | 수치 누락 | 이상 |
|-------|----|---------|-------:|:---:|------|:---:|---:|---:|
| oral | 664ad2a5254cde33 | 415702ASY | 28 | true | 복용 안내 | false | 0 | 0 |
| oral | 2a6e05bf8a532211 | 172301ATB | 10 | true | 복용 안내 | false | 0 | 0 |
| ophthalmic | 4b7594d2a9c16c3c | D49001COS | 17 | true | 사용 안내 | false | 0 | 0 |
| ophthalmic | 24b0ab03427684d8 | 332600COS | 13 | true | 사용 안내 | false | 0 | 0 |
| topical | d5818a48deed8016 | C03400CPL | 15 | true | 사용 안내 | false | 0 | 0 |
| topical | d61c88d00499a9cb | A23900COM | 12 | true | 사용 안내 | false | 0 | 0 |
| oromucosal | 28c1b02b2ce11efa | A00401ATO | 6 | true | 사용 안내 | false | 0 | 0 |
| oromucosal | 46c10ff20c089e6a | A87801AMS | 5 | true | 사용 안내 | false | 0 | 0 |

실물 대조(점안 샘플 `D49001COS`): 공식 효능·용법·주의 문장이 축약·약화 없이 보존되고,
용법 수치 `1방울 / 1일 / 1회` 전량 유지, 비경구 경로에 경구 동사 미사용, `usageLabel='사용 안내'` 정합.

## 6. 중지 조건 점검 — 미발동

| 중지 조건 | 상태 |
|-----------|------|
| V2 SSOT 와 실측 불일치 | 없음 (238/839 == 238/839) |
| identity/route/strength 상충 | 없음 (fp 재현 839/839, 접미 allowlist 정합) |
| 공식 원문 축 부족 | **1 fp/2 master 발견 → 생산 제외(HOLD_SOURCE), 추정 보완 0** |
| 예상 write 와 dry-run 불일치 | 없음 (837×6T = 5,022 정확 일치) |
| canonicalDup | 0 |
| 기존 LIVE drift | 0 (dry-run, write 경로 미실행) |

## 7. LIVE apply — 착수 불가 (공용 러너에 apply 경로 없음)

공용 러너는 **dry-run 전용**이며(파일 헤더 및 `main()`: "apply 경로는 본 러너에 없다"), 본 세션은
**공용 러너 수정 금지** 지침에 따라 apply 경로를 추가하지 않았다.

- 요청 사항: **다 세션에 공용 러너 apply 경로 추가 요청** (KO 4T = easy demote→deprecated / authored INSERT+flip / audit, EN 2T = INSERT+flip, 이중게이트·사후검증·rollback 포함).
- 앵커는 공용 러너의 `fpToUuidV2` 산출값을 그대로 사용해야 한다(본 dry-run manifest 에 fp 별 `sourceRef` 고정 기록됨). 세션별 별도 앵커 사용 금지.
- apply 준비 상태: 대상·writePlan·게이트 전부 고정 완료. apply 경로가 열리면 **가가 첫 write-owner** 로 즉시 착수 가능.

> 참고: 본 세션이 선행 준비한 `otc-remaining-v2-store-leaflet-runner.ga.ts`(apply 포함, commit `c90b1cddc`)는
> **앵커 네임스페이스가 공용 러너와 달라 생산에 사용하지 않는다**. 교차검증용으로만 보존한다.

## 8. 산출물

| 파일 | 내용 |
|------|------|
| `apps/api-server/src/scripts/data/otc-v2-dryrun-manifest.ga.json` | ga dry-run 매니페스트 (fp별 sourceRef·게이트·writePlan) |
| `apps/api-server/src/scripts/data/otc-v2-samples.ga.json` | route별 샘플 8건 (공식 원문 vs 구성본 대조) |
| `apps/api-server/src/scripts/data/otc-v2-dryrun-hold-e0ab08c1.ga.json` | HOLD_SOURCE 1건 단독 dry-run 근거 |
| 본 CHECK | dry-run 판정 |

## 9. Git / 무결성

- 공용 러너 `otc-v2-store-leaflet-runner.shared.ts` **미수정** · 라 census/SSOT **미수정**
- 나·다 세션 산출물(`*.na.json`, `*.da.json`) **미접촉**
- `apps/api-server/.env` 생성·수정·삭제 0 · 자격증명 값 출력 0 · 루트 `.env` 미사용
- `git add .` / reset / clean / stash 미사용 — 자기 산출물만 path-specific stage
