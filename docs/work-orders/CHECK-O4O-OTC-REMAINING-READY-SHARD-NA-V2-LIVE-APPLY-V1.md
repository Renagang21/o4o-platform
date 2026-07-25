# CHECK — WO-O4O-OTC-REMAINING-READY-SHARD-NA-V2-LIVE-APPLY-V1

**에이전트 나 · V2 나 shard EN 저작 + KO/EN LIVE apply 완료**

| 항목 | 값 |
|------|-----|
| 대상 | V2 census READY 나 shard — 240 fingerprint / 839 master |
| 기준 커밋 | census/SSOT `81b39da72` · 공용 러너 `3447b2323` · apply 지원 `394ab0e4b` · 나 dry-run `c377a97d0` |
| 실제 write | **KO 3,356T + EN 1,678T = 5,034T** (예상치 정확 일치) |
| 결과 | 독립 사후검증 **24/24 GREEN** · 다 shard 해제 |

---

## 1. EN 저작 (12 파트 · 240 fp / 839 master)

- 저작 기준 원문은 **무절단 공식 원문**을 별도 덤프해서 사용했다
  (`otc-v2-authoring-source-full.na.mjs` → 240 fp / 839 master, 효능·용법·주의 결손 각 0).
  러너의 `--emit-sample` 은 주의 축을 1,200자로 절단하므로 저작 기준으로 쓰지 않았다.
- 파트 분할은 master 수 내림차순·fp 사전순의 결정적 분할(`otc-v2-en-part-plan.na.mjs`, 12 × 20 fp).
  route tally 는 SSOT 선언과 완전 일치 — oral 200 / topical 27 / ophthalmic 10 / vaginal 2 / oromucosal 1.

| 파트 | fp | master | 파트 | fp | master |
|:---:|:---:|:---:|:---:|:---:|:---:|
| p01 | 20 | 216 | p07 | 20 | 40 |
| p02 | 20 | 118 | p08 | 20 | 40 |
| p03 | 20 | 88 | p09 | 20 | 40 |
| p04 | 20 | 72 | p10 | 20 | 40 |
| p05 | 20 | 60 | p11 | 20 | 40 |
| p06 | 20 | 49 | p12 | 20 | 36 |
| | | | **합계** | **240** | **839** |

**검증 (러너 export 를 그대로 import 해 apply 시점과 동일 판정)**

- `otc-v2-en-config-verify.na.mjs` — 전체 240 entries **PASS**
  (JSON parse · 필수 필드 · 한글 잔존 0 · 비경구 route 경구동사 0 · 공식 용법 수치 전량 보존 · usageLabel 미포함)
- `otc-v2-en-config-coverage.na.mjs` — **COMPLETE**
  covered 240 fp / 839 master == eligible · 누락 0 · 중복 0 · HOLD 포함 0 · EN write 예상 1,678T == 필요 1,678T

**저작 원칙 준수**

- 공식 효능·용법·주의 원문 grounding, KO 에 없는 의료 사실 추가 0.
- 질환명·증상명·허가 효능 회피·순화 0 (예: 세균성질증 → bacterial vaginosis, 칸디다성 질염 → candidal vaginitis 그대로).
- 비경구 경로는 경구 동사 미사용, usageLabel 은 config 가 들지 않고 러너가 route 에서 주입.
- 일반명코드 그룹 문서이므로 제품 브랜드명은 본문에 넣지 않았다
  (니코틴 패치 용법의 TTS 30/20/10 은 **함량 단계 표기**이므로 보존, 브랜드명만 제외).

**원문 자체 결손 2건 — 창작 없이 명시 처리**

| fp | gencode | 사안 | 처리 |
|----|---------|------|------|
| `15e1651112c8e4f4` | A35000ATB | 저장 원문의 용법이 태그 스트립으로 절단되어 "크레아티닌 청소율" 임계값이 소실 | 없는 수치를 만들지 않고, 절단 사실을 명시하고 매장 약사 문의로 연결 |
| `a9b1afc879e1aec6` | 101342ASY | 아래 §2 참조 (러너 산식 아티팩트) | 원문대로 "every 4 to 6 hours" 저작, 우회 없음 |

---

## 2. EN 게이트 차단 1건 — 기록 후 상류 해소

- 증상: `a9b1afc879e1aec6`(101342ASY 시럽 · 5 master) 가 `EN 용법 수량 누락 1: 46` 으로 차단.
- 기전: `normalize()` 가 `[-–—]` 를 `,` 로 치환 → 원문 `4-6시간` 이 `4,6시간` 이 되고,
  `missingNumericsEn` 의 수량 정규식이 이를 천단위 구분자로 읽어 실재하지 않는 토큰 `46` 을 요구.
  EN 텍스트는 normalize 하지 않고 리터럴 대조하므로 EN 에 `46` 을 써야만 통과.
- **나 세션 조치**: 공용 러너 수정 금지 규칙에 따라 우회하지 않고 `otc-v2-en-blocker.na.json` 에
  기전·영향·선택지를 기록하고, 본문은 원문대로 `every 4 to 6 hours` 로 두었다.
  게이트 통과 목적으로 `46` 을 써넣는 것은 공식 원문에 없는 수치를 만드는 행위이므로 채택하지 않았다.
- **해소**: 공용 러너 소유 세션(다)이 `31ac7233c` 로 동일 결함을 교정
  (`missingNumericsEn` 내부에서만 하이픈 범위를 분리, fingerprint·KO 경로·writePlan 불변).
  나 저작본 **무수정** 상태에서 재검증 → p03 20/20 PASS, 전체 240/240 PASS.
- **drift 0 확인**: 러너 교정 후 나 dry-run 재실행 manifest 가 커밋본과 **byte-identical**
  (md5 `08356775c82f0c6a6f6525bf834ad647`).

---

## 3. LIVE apply

순서 게이트: 가 KO/EN apply + 독립검증 완료(`efd096027`) → 원장상 `ga.independentVerified=true` 확인 후 착수.

### 3-1. KO apply

- readiness 게이트 **10/10 PASS** (순서 게이트 포함).
- 실행: `--shard=na --lang=ko --apply` + `OTC_V2_LEAFLET_KO_CONFIRM=YES`
- 결과: **240 그룹 · writeActual 3,356 / 예상 3,356 MATCH**
  (master 당 4T = easy canonical→deprecated / authored INSERT / canonical 전환 / audit)

### 3-2. EN apply

- 공용 러너의 EN apply 는 `--en-config=<한 파일>` 로 eligible 전 fp 페이로드를 요구하므로
  (`fp ... EN 저작 페이로드 부재 → 중지`), 12 파트를 **무변형 병합**해 입력했다
  (`otc-v2-en-config-merge.na.mjs` → `otc-v2-en-config-na-all.json`, 본문 미수정 · 가 shard 와 동일 방식).
  병합본 재검증: coverage COMPLETE 240/839 · verify 240 entries PASS.
- readiness 게이트 **11/11 PASS**, 그중 post-KO 선행 실측 —
  authored ko canonical 839 · easy ko canonical 0 · ko dup 0 · audit 839.
- 실행: `--shard=na --lang=en --apply --en-config=...` + `OTC_V2_LEAFLET_EN_CONFIRM=YES`
- 결과: **240 그룹 · writeActual 1,678 / 예상 1,678 MATCH** (master 당 2T = INSERT / canonical 전환)

---

## 4. 사후 독립검증 — 24/24 GREEN

`otc-remaining-v2-postverify.na.mjs` (신규, read-only · SELECT 전용 · 러너 미import ·
앵커 산식만 계약대로 재구현해 교차 확인 — 러너 사후검증과 검증 경로 이중화).

| 축 | 결과 |
|----|------|
| authored KO canonical | 839 / 839 |
| authored EN canonical | 839 / 839 |
| master 당 KO canonical == 1 | 839 / 839 |
| master 당 EN canonical == 1 | 839 / 839 |
| canonicalDup (KO 또는 EN > 1) | 0 |
| easy_drug KO canonical 잔존 | 0 |
| needs_review 잔존 | 0 |
| easy_drug KO deprecated (강등분) | 839 / 839 |
| audit(canonical_replaced/ko) | 839 / 839 |
| 앵커 KO / EN canonical 행 | 839 / 839 |
| shard 밖 앵커 write | 0 |
| 사용된 앵커 distinct | 240 / 240 |
| 실제 write KO / EN / 합 | 3,356 / 1,678 / **5,034** |
| 가 shard KO·EN canonical 불변 | 837 / 837 (drift 0) |
| 다 shard 미착수 (authored 0) | 0 |
| EN 한글 잔존 / 본문 결손 | 0 / 0 |

**실물 대조 (비경구 route)** — `338800CTB` 질정:
EN 은 route 주입 라벨 `How to insert it`, KO 는 `사용 안내`.
효능은 `bacterial vaginosis` / `세균성질증` 으로 질환명 보존, 용법 수치(1정·1일 1회) 보존.

---

## 5. 원장 · 후속

- `--mark-verified=na` 완료 → 원장 `na.independentVerified=true`.
- **다 shard 해제 확인**: `--shard=da --lang=ko --apply-readiness` → **READY**
  (writePlan KO 3,332 + EN 1,666 = 4,998).

---

## 6. 금지 항목 준수

- 가 완료 전 LIVE apply 미실행 (원장 확인 후 착수) · V1 산출물 미사용
- **공용 러너 수정 0** (나 세션 기준. 31ac7233c 는 러너 소유 세션인 다의 교정)
- 별도 앵커 생성 0 (`fpToUuidV2` 단일 산출) · 라 census/SSOT 수정 0
- `.env` 무접촉·값 미출력·루트 `.env` 미사용 (다 세션 완료까지 보존)
- `git add .` 미사용 · reset/clean/stash 미사용 · 타 세션 파일(가·다 산출물) 미접촉
