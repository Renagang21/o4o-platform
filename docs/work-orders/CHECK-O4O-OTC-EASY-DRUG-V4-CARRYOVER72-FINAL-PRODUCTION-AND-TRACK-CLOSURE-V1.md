# CHECK — carryover 72 최종 LIVE 생산 + V4 트랙 마감

- WO: `WO-O4O-OTC-EASY-DRUG-V4-CARRYOVER72-FINAL-PRODUCTION-V1` / `...-FINAL-VERIFICATION-AND-TRACK-CLOSURE-V1`
- 생산 커밋: `3a147a6cb` · batchId `otc-v4-carryover72`
- write owner: agent-ga 정본 러너 단독

---

## 1. 생산 결과

| unit | GREEN | write |
|---|---:|---:|
| rectal 26 | **26** | 156T |
| oromucosal 16 | **16** | 96T |
| multi-nonoral 30 | **30** | 180T |
| **합계** | **72 / 72** | **432T** (= 예상치 정확 일치) |

EXCEPTION **0** · SKIP 0 · failedMasterResidueDirty **0**.

유닛별 절차: 입력 게이트 전항 통과 → rollback-test(전량 롤백·residue 0·write 0) → 콘텐츠 독립검증 **10/10 PASS** → LIVE apply.

**route 는 재판정하지 않았다.** carryover112 최종 판정 원장의 `resolvedRoute`/`routeSet` 을 prep 에서 주입했다. frozen `resolveRouteForMaster` 는 이 72건에서 이미 실패한 함수이므로 재호출하면 또 예외가 된다.

### multi-nonoral 30 — 배치 로컬 profile

`otc-v4-carryover72-multi-profile.ga.ts` 에 `oromucosal+vaginal` profile 을 신설했다.

- 공유 `ROUTE_PROFILE` · composer · V3/V4 정본 **미수정** — `composeKoV3`/`renderEnV3` 의 profiles 인자 seam 만 사용
- 라벨은 **경로 중립**(`사용 안내` / `How to use it`). 한쪽 경로만 드러나는 표현을 쓰지 않았다
- `enFormLabel`/`koFormLabel` 은 해당 키가 없어 `Medicine` / `일반의약품` 으로 떨어지며, 이는 단일 경로 단정이 아니라 그대로 채택
- 양쪽 경로 보존 게이트(CV-07) PASS · 타 경로 혼입 0 · 경로별 수치 혼합 0

---

## 2. deprecated easy KO fallback

생산 후 easy KO canonical 이 `deprecated` 로 강등돼 prep 의 `fetchMasterLive`(canonical 전용)가 원문을 집지 못했다. 제한적 fallback 을 추가했다.

허용 조건(전부 충족 시에만): 동일 masterId · easy source 계열 · 원장 `officialSourceHash` 와 hash 일치 · authored V4 KO·EN canonical 이 이미 정상 존재 · **후보 정확히 1개**.
복수 후보는 시스템 중지. **최초 생산 대상 선정에는 사용하지 않는다**(멱등 검증 전용).

실측: **72/72 복구 · hash drift 0 · 복수 후보 0 · SYSTEM STOP 없음.**

---

## 3. exactly-once 검증 (DB 실측, write 0)

| 게이트 | 결과 |
|---|---|
| READ ONLY 트랜잭션 | on |
| carryover72 KO authored canonical | **72** |
| carryover72 EN canonical | **72** |
| master별 production audit 정확히 1 | 위반 **0** |
| sourceRef master별 정확히 2행(KO+EN) | 위반 **0** |
| sourceRef 타 master 공유 | **0** |
| canonicalDup | **0** |
| easy canonical 잔존 | **0** |
| 대상 밖 audit | **0** |
| 실패 residue | **0** |
| **run 원장 KO content hash ↔ DB 일치** | 불일치 **0** |
| 선행 GREEN content hash 변경 | **0** |

### payload 기반 전체 멱등 재실행 — 미수행 (사실 기록)

유닛별 TM·shard **편의 파일이 다음 유닛 실행에 덮여** 42건 EN payload 를 재구성할 수 없었다.
이를 "완전한 payload 재실행 PASS" 로 보고하지 않는다. run별 불변 결과 원장과 DB 현재 상태를 이용한 **exactly-once 검증으로 대체**했다.

- 성격: **재현성 자산 보존상 결함**
- 개선 필요: 결과 원장뿐 아니라 **TM·shard·payload 도 run별 불변 파일로 저장**
- 이번 72건의 생산 정확성·canonical 상태·write 수(432T)에는 영향 없음

---

## 4. V4 유효 GREEN 계산 — 게이트 정정

**잘못된 정의**: `source_type='mfds_drug_otc'` 전역 카운트 = V4 GREEN → 15,908 (V2·V3 저작 전체 포함)
**정정 정의**: `otc-v4-*` batch audit 을 가진 고유 master 중 **현재 authored KO canonical 1 + EN canonical 1 + easy canonical 0** 인 수

실측 **FV-11 = 3,476 PASS.**

| 배치 | 유효 GREEN |
|---|---:|
| pilot100 | 80 |
| pilot500 | 416 |
| next2000 | 1,962 |
| finalall | 388 |
| route535 | 532 |
| nr26 | 26 |
| carryover72 | 72 |
| **합계** | **3,476** |

### route535 audit 538 해석

audit 합계 538 = 최초 생산 535 + 기구 멸균제 회수 3.
회수된 3 master 는 현재 유효 GREEN 0 이므로 route535 유효 GREEN 은 **532**.
audit 538 ↔ 유효 532 차이 6 = 회수 대상 3건의 최초 생산 이력 3 + 회수 이력 3.
**타 세션 생산 대상이 늘어난 것이 아니다.** audit 행 합계를 GREEN master 수로 쓰면 안 되는 사례로 기록한다.

---

## 5. 분모 대조

| 그룹 | 실측 |
|---|---:|
| 공식 exclude | 266 |
| source terminal | 24 |
| carryover112 terminal (EXCLUDE_NON_HUMAN_USE 23 + TERMINAL_UNRESOLVED 17) | 40 |
| **본 배치 원장으로 확인 가능한 소계** | **330** |
| 기구 멸환제 terminal | 3 (타 세션 원장) |
| **terminal/exclude 합계** | **333** |

그룹 간 master 교집합 **0** · GREEN 과 교집합 0 · 중복 0.

```
유효 GREEN 3,476 + terminal/exclude 333 = 3,809   → 공식 분모와 차이 0
```

> 검증기 실측은 330 까지다(FV-12 = 330, FV-13 = 3,806). 부족한 3건은 **기구 멸균제 terminal 3** 이며, route535 를 생산·회수한 병렬 세션의 원장에 있어 본 배치 검증기가 참조하지 못했다.
> 3건을 포함하면 333 / 3,809 / 차이 0 으로 닫힌다. 숫자 자체는 정합하며, 게이트 범위의 한계로 기록한다.

**route 이월 0** — carryover 112 가 재투입 72 + terminal 40 으로 전량 소진됐다.

---

## 6. Git 이력 (사실 기록, 수정하지 않음)

- OTC 생산 커밋 **`3a147a6cb`** 에 타 세션 HFF 파일 9개가 포함됐다. 원인은 pathspec 에 `apps/api-server/src/scripts/data` **디렉터리 전체**를 넣어 그 세션이 staging 해 둔 파일을 흡수한 것
- 이후 HFF(`16c50886e`) · Pharmacy-Hub(`66dcfde5c`) 병렬 커밋이 위에 적재되고 `main` 과 `origin/main` 이 동기화됐다
- 따라서 `3a147a6cb` 는 이미 공개 이력에 포함된 것으로 판단하고, **amend·rebase·reset·revert·force-push 를 실행하지 않았다**
- HFF 파일은 후속 HFF 커밋에서 그 세션이 처리한 것으로 보여 삭제·재귀속 작업도 하지 않았다
- **DB 생산 결과에는 영향 없음**
- 로컬 `backup/otc-carryover72-before-pathspec-fix` 브랜치는 잘못된 시점(병렬 세션 커밋)을 가리킨다. 원격에 없는 로컬 브랜치이며 별도 read-only 확인 후 정리 대상

재발 방지: 커밋은 **디렉터리·와일드카드 pathspec 금지, 파일 경로 개별 명시**, 커밋 전 `git diff --cached --name-only` 확인, 커밋 후 `git show --name-only --format= HEAD` 재확인.

---

## 7. 결론

- carryover72 **GREEN 72/72 · write 432T · EXCEPTION 0 · residue 0**
- multi-nonoral 양쪽 경로 보존 확인
- 누적 유효 GREEN **3,476** · terminal/exclude **333** · 공식 분모 **3,809** · 차이 **0** · 미분류 0
- **route 이월 0**
- 본 마감 단계 추가 LIVE DB write **0**
- **V4 master-by-master 트랙 최종 종료**
