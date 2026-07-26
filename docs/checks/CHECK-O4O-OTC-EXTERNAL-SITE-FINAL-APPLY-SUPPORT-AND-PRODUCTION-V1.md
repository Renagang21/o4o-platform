# CHECK-O4O-OTC-EXTERNAL-SITE-FINAL-APPLY-SUPPORT-AND-PRODUCTION-V1 — 외용 회수분 최종 생산 완결 (에이전트 다)

WO: `WO-O4O-OTC-EXTERNAL-SITE-FINAL-APPLY-SUPPORT-AND-PRODUCTION-V1`
기준: 최종 승인 SSOT `51cea451a` · 공용 어댑터 `cfc34ef18` · V2 3-shard 완료 `e421890b9`
상태: **PASS — 가·나·다 42 fp / 199 master KO+EN LIVE 완결 · 1,194T (KO 796 + EN 398) · 예상=실측 · canonicalDup 0 · 독립검증 27/27.**

## 0. 결론

> 단일 write-owner(에이전트 다)가 **가 → 나 → 다 순차**로 LIVE apply 를 완료했다.
> **42 fp / 199 master · 1,194T** — 각 shard 의 예상 write 와 실측이 전건 일치했고, shard마다 사후검증·독립검증을 통과한 뒤에만 다음 shard 로 이동했다.
> HOLD_PROFESSIONAL_USE 5 fp / 79 master 는 **write 0 · easy_drug 미접촉**으로 완전 격리됐다.

## 1. apply 지원 구현 경로

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/scripts/otc-external-site-final-production.ts` | **최종 생산 실행기** — dry-run / LIVE apply / 독립검증 / 원장 |
| `apps/api-server/src/scripts/otc-v2-external-site-recovery-adapter.ts` | 최종 SSOT 로더 `loadFinalShard` · `admissionCheckFinal` · 전용 순서 원장 추가 (기존 회수 dry-run 경로 무변경) |
| `otc-external-site-final-en.{ga,na,da}.json` | EN 저작 페이로드 42 그룹 |

생산 입력은 **최종 승인 SSOT 하나뿐**이다. V1 승인 SSOT(47/278)와 조정 proposal 은 로더가 파일 자체를 읽지 않는다. `fingerprintV2` · `fpToUuidV2` 는 공용 러너 것을 그대로 호출했고 **산식 변경 0**.

### 안전장치

- **shard 단위 트랜잭션** + 커밋 전 사후검증 → 실패 시 shard 전체 rollback
- **이중 게이트** `--apply` + `OTC_EXTSITE_{KO,EN}_CONFIRM=YES`
- **전용 순서 원장** `otc-external-site-final-apply-order.json` (V2 READY·V1 회수 원장과 분리)
- **재실행 중복 차단** — KO 단계는 `authored 0`, EN 단계는 `en canonical 0` 을 사전 게이트로 요구
- **INSERT-only** — 기존 canonical 행은 상태만 `deprecated` 로 강등하고 본문을 UPDATE 재사용하지 않았다

### 단계 인식 게이트 (구현 중 교정)

EN 단계에서 G6/G7/G9 가 실패했다. KO 적용 후에는 `easy canonical 0 · authored ko == size` 가 정상인데, 게이트가 KO 시점 기대값(`authored 0`)을 그대로 적용한 탓이었다. **게이트를 건너뛰지 않고 단계별 기대값을 뒤집는 방식**으로 고쳤다 — 건너뛰면 그 구간의 보증이 사라지기 때문이다. EN 단계는 이제 "KO 선행 완료 + EN 중복 없음"을 적극적으로 검증한다.

## 2. 단일 write-owner 확인

원장 `writeOwner: agent-da (단일)`. 본 작업 중 다른 에이전트의 DB write 없음 — 각 shard 사전 게이트에서 `authored STORE canonical ko/en 0` 을 확인했고, 사후 `sourceRef 충돌 0(대상 밖 유출)` 으로 재확인했다.

## 3. shard별 dry-run (게이트 11/11 × 3)

| 게이트 | 가 | 나 | 다 |
|---|:---:|:---:|:---:|
| G1 최종 SSOT status·총계 (42/199) | PASS | PASS | PASS |
| G2 shard fp/master 수량 일치 | PASS | PASS | PASS |
| G3 fp 재현 100% | PASS | PASS | PASS |
| G4 route·officialSite·evidence mismatch 0 | PASS | PASS | PASS |
| G5 professional-use 혼입 0 | PASS | PASS | PASS |
| G6 기존 LIVE 교집합 0 | PASS | PASS | PASS |
| G7 authored canonical 상태 정합 | PASS | PASS | PASS |
| G8 canonicalDup 0 | PASS | PASS | PASS |
| G9 예상 write 일치 | PASS | PASS | PASS |
| G10 shard 밖 master 0 | PASS | PASS | PASS |
| G11 이상 그룹 0 | PASS | PASS | PASS |

**2회 실행 byte-identical** — 가 `e7001f92f9a64265` · 나 `cbea7eb2936a45aa` · 다 `1bb0364015f7b37c`.
**차단 시험**: 순서 게이트가 나(3건)·다(6건)를 실제 차단, 이중 게이트가 env 없는 `--apply` 를 write 0 으로 종료.

## 4~6. shard별 apply · postVerify · 독립검증

| shard | fp/master | KO | EN | 계 | 예상 | 일치 |
|---|---|---:|---:|---:|---:|:---:|
| **가** | 15 / 68 | 272 | 136 | **408** | 408 | ✔ |
| **나** | 15 / 85 | 340 | 170 | **510** | 510 | ✔ |
| **다** | 12 / 46 | 184 | 92 | **276** | 276 | ✔ |

독립검증(러너와 별개 쿼리, read-only) — **3 shard × 9 항목 = 27/27 PASS**:

| 항목 | 가 | 나 | 다 |
|---|---:|---:|---:|
| KO authored canonical == master | 68 | 85 | 46 |
| EN canonical == master | 68 | 85 | 46 |
| easy_drug deprecated == master | 68 | 85 | 46 |
| easy_drug ko canonical 잔존 | 0 | 0 | 0 |
| needs_review 잔존 | 0 | 0 | 0 |
| audit(canonical_replaced) == master | 68 | 85 | 46 |
| canonicalDup | 0 | 0 | 0 |
| sourceRef 충돌(대상 밖 유출) | 0 | 0 | 0 |
| EN 한글 잔존 | 0 | 0 | 0 |

각 shard 는 **apply → 사후검증 → 독립검증 → `--mark-verified`** 를 마친 뒤에만 다음 shard 가 해제됐다.

## 7. 총 INSERT

**KO 796T + EN 398T = 1,194T** (WO 확정치와 정확히 일치).
KO 4T/master = easy demote + authored INSERT + canonical 전환 + audit · EN 2T/master = INSERT + canonical 전환.
신규 행 INSERT 는 KO 199 + EN 199 = **398행**, 나머지는 상태 전환·강등·감사 기록이다.

## 8. KO/EN canonical 수

대상 199 master 전건에 **KO authored canonical 199 · EN canonical 199**. easy_drug ko canonical 잔존 **0**, deprecated 199.

## 9. canonicalDup — **0**

3 shard 사전·사후 전부 0. 생산 199 master 전체 재확인에서도 0.

## 10. HOLD·제외 대상 write 0

| 대상 | 결과 |
|---|---|
| HOLD_PROFESSIONAL_USE 5 fp / 79 master | authored canonical **0** · easy_drug deprecated **0**(미접촉) |
| SPLIT_REQUIRED 179 · HOLD_ROUTE 194 · EXCLUDE 62 | 최종 SSOT 로더가 입력에 포함하지 않음 |
| 빅콘에스600정 | 차단 목록 상수로 admission 차단 |

## 11. 기존 V2 LIVE 변경 0

- 대상 199 master 는 사전 게이트에서 **authored STORE canonical ko/en 0** 이었다 = V2 LIVE 완료분과 교집합 0.
- 사후 `sourceRef 충돌 0` — 본 트랙 앵커로 생성된 행이 대상 밖 master 로 새지 않았다.
- HOLD 79 master 미접촉 확인.

> 참고: 전역 authored KO/EN canonical 은 각 10,452 로 관측된다. 이는 V2 READY(2,509) 뿐 아니라 경구 복합·첩부제·외용제·HFF 등 **모든 선행 트랙 누적치**이며, 본 생산분 199 가 그 위에 더해진 값이다. V2 단독 수치와 직접 비교할 대상이 아니다.

## 12. 독립 검증 결과

위 §4~6 표 그대로 **27/27 PASS**. 산출물: `otc-external-site-final-verify.{ga,na,da}.json`.

## 13. 콘텐츠 충실성

- KO 는 공식 e약은요 효능·용법·주의 원문 grounding, **신규 의료 사실 0**. 경로 동사만 재표현하고 연령·횟수·용량·기간·부위 수치는 전량 보존(수치 보존 게이트 통과).
- EN 42 그룹은 공식 원문 기반 저작. 렌더 시 **한글 잔존 0 · 경구 동사 차단 · 수량 보존** 게이트를 통과한 것만 기록했다. `usageLabel` 은 저작 페이로드가 아니라 **경로에서 주입**해 경구 라벨 오용을 원천 차단했다.
- 경로별 표현: cutaneous `How to apply it to the affected area` · oromucosal `...in the mouth or throat as directed` · nasal `...in the nostril` · rectal `...rectally` · vaginal `...vaginally`.

## 14. 잔여 HOLD 목록

| fp | gencode | master | shard | 제품 | 사유 |
|---|---|---:|---|---|---|
| `322aa970abb2f06a` | E13200CDS | 38 | 다 | 비디클로라프렙외용액 | SURGICAL_SITE · APPLICATOR |
| `b8249e326b64aafe` | A42000CLQ | 22 | 가 | 소프타-맨액 | SURGEON_HAND |
| `63fab529380d7f94` | 131311CDS | 8 | 다 | 큐앤큐헥시딘스크랍 | SURGEON_HAND · SCRUB · SURGICAL_SITE |
| `fb12df089a70fd23` | 216232CDS | 8 | 나 | 큐앤큐포비돈요오드스크랍(대) | SURGEON_HAND |
| `c33442be59bb49d4` | 382201CLQ | 3 | 가 | 티비엑스자임액 | SURGICAL_SITE · ASEPTIC |
| **계** | | **79** | | | HOLD_PROFESSIONAL_USE |

전문 시술 맥락 콘텐츠를 매장 소비자 설명서로 만들 것인지는 **생산 이전에 정책 판단이 필요**하다. 그 밖의 미회수 잔여는 SPLIT_REQUIRED 179 · HOLD_ROUTE 194 · EXCLUDE 62 로 종전과 동일하다.

## 15. Git / 환경

- 자기 산출물만 path-specific stage·commit·push · `git add .` 미사용 · reset/clean/stash 미사용
- 다른 세션 파일 수정 0 · 라 승인 SSOT/감사/proposal 수정 0
- `apps/api-server/.env` **수정·삭제 없음**(생산 종료까지 유지) · 자격증명 값 **출력 0** · 루트 `.env` 미사용
- 임시 검증 스크립트는 실행 후 삭제, 커밋 대상 아님
