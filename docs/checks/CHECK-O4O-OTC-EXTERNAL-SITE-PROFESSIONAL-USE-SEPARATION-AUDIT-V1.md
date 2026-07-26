# CHECK-O4O-OTC-EXTERNAL-SITE-PROFESSIONAL-USE-SEPARATION-AUDIT-V1 — cutaneous 162 전문용 분리 (에이전트 다)

WO: `WO-O4O-OTC-EXTERNAL-SITE-PROFESSIONAL-USE-SEPARATION-AUDIT-V1`
기준: 승인 SSOT `172a792fd` · 공용 어댑터 `cfc34ef18`
상태: **PASS — 게이트 8/8. PRODUCIBLE_STORE 19 fp / 83 master · HOLD_PROFESSIONAL_USE 5 fp / 79 master · SPLIT_REQUIRED 0 · DB write 0.**

## 0. 결론

> `cutaneous` 162 master 를 공식 원문 근거로 분리했다. **수술자 손 소독·수술부위 처치 5 fp / 79 master 를 `HOLD_PROFESSIONAL_USE` 로 보류**하고, 일반 피부 사용 **19 fp / 83 master 만 생산 승인 유지**.
> 회수 대상 전체는 **47 fp / 278 master → 42 fp / 199 master**, 예상 write **1,668T → 1,194T**.
> route 재판정이 아니다 — 라의 `cutaneous` 판정은 전건 유지했다. **DB write 0 · 설명서 생성 0 · apply 0 · 승인 SSOT 원본 수정 0.**

## 1. PRODUCIBLE_STORE — 19 fp / 83 master

환부 도포·피부 세정·일반 피부 소독·일반 상처 적용. 대표: 콜로덤에스액 · 현대물파스에프 · 버물리에스액 · 동성미녹시딜액3%/5% · 일동엑소데릴액 · 큐앤큐니트로푸라존거즈 · 코네티비나거즈 · 스웨트롤패드액 · 라이센드플러스액(머릿니) · 엘-크라넬알파액(탈모) · 헥시탄0.5%액.

## 2. HOLD_PROFESSIONAL_USE — 5 fp / 79 master (다목적 41)

| fp | gencode | master | shard | 제품 | 사유 | 공식 원문 근거 |
|---|---|---:|---|---|---|---|
| `322aa970abb2f06a` | E13200CDS | 38 | 다 | 비디클로라프렙외용액 | SURGICAL_SITE · APPLICATOR | "건조한 **수술 부위**(예: 복부 또는 팔)에는… **어플리케이터**의 스폰지 부분을 만지지 않습니다" |
| `b8249e326b64aafe` | A42000CLQ | 22 | 가 | 소프타-맨액 | SURGEON_HAND | "이 약은 **수술시** 및 위생 목적의 **손소독**에 사용합니다… **수술자의 손 소독**에 사용할 경우" |
| `63fab529380d7f94` | 131311CDS | 8 | 다 | 큐앤큐헥시딘스크랍 | SURGEON_HAND · SCRUB · SURGICAL_SITE | "이 약은 **수술전 살균소독(수술자** 및 보건위생 종사자의 **손소독**)에 사용합니다" |
| `fb12df089a70fd23` | 216232CDS | 8 | 나 | 큐앤큐포비돈요오드스크랍(대) | SURGEON_HAND | "이 약은 **수술자의 손 및 팔**의 살균소독에 사용합니다" |
| `c33442be59bb49d4` | 382201CLQ | 3 | 가 | 티비엑스자임액 | SURGICAL_SITE · ASEPTIC | "손 및 피부의 소독, **수술부위의 피부소독**, 수술부위의 점막소독… **수술실** 병실 가구" |

사유별 master 수: SURGICAL_SITE 49 · SURGEON_HAND 38 · APPLICATOR 38 · SCRUB 8 · ASEPTIC 3 (중복 계상).

**다목적 41 master** — 일반 피부 소독과 수술부위 소독이 한 품목에 병기된 건. WO 지침대로 용법 일부만 잘라 생산하지 않고 **전체 보류**했다. 잘라내면 원문 훼손이고, 남기면 맥락 혼입이다.

## 3. SPLIT_REQUIRED — 0

fp 는 원문 3축 해시를 포함하므로 그룹 내 원문이 동일하다 → 판정도 fp 단위로 균질했다. 혼재 0건이라 fp 승격·분할이 발생하지 않았다. (혼재 시 fp 전체 HOLD 승격 로직은 구현·게이트 확인 완료.)

## 4. shard별 조정 수량

| shard | 조정 전 | 조정 후 | 제외 | 조정 후 write |
|---|---|---|---|---:|
| 가 | 17 fp / 93 m | **15 fp / 68 m** | 2 fp / 25 m | 408T |
| 나 | 16 fp / 93 m | **15 fp / 85 m** | 1 fp / 8 m | 510T |
| 다 | 14 fp / 92 m | **12 fp / 46 m** | 2 fp / 46 m | 276T |
| **계** | **47 fp / 278 m** | **42 fp / 199 m** | **5 fp / 79 m** | **1,194T** (KO 796 + EN 398) |

경로별 조정 후: cutaneous 83 · oromucosal 58 · nasal 45 · rectal 7 · vaginal 6.
**oromucosal / nasal / rectal / vaginal 116 master 는 전건 불변** (게이트로 확인).

## 5. 근거 사례 — 판정기 자기결함 2건 교정

초기 실행은 HOLD 7 fp / 86 master 였다. 실물 대조에서 **거짓 양성 2건**을 잡아 교정했고, 결과가 5 fp / 79 master 로 정정됐다.

### (1) 부정(배제) 문맥 미처리 — 헥시탄0.5%액 4 master

```
이 약은 손 및 피부의 소독(보건위생종사자 및 수술 시 수술자의 손 소독,
수술부위 피부의 소독은 제외), 의료용구의 소독 … 피부의 창상부위 소독에 사용합니다.
```

원문이 수술 용도를 **명시적으로 배제**하는데, 표현 매칭만으로 HOLD 판정했다. 표현이 있다는 것과 그 용도라는 것은 다르다 → 매치를 감싸는 괄호 구간 또는 직후 30자에 `제외|해당하지 않|사용하지 않` 이 있으면 마커로 세지 않도록 고쳤다. **PRODUCIBLE 로 정정.**

### (2) APPLICATOR 단독 판정 — 엘-크라넬알파액0.025% 3 master

```
1회 3 mL씩, 1일 1회 어플리케이터를 이용하여 질환부위에 바른 후 약 1분간 마사지 …
이 약은 외용제로서 두피에만 사용합니다.
```

탈모 치료제의 병 끝 도포기다. 소비자 외용액에도 어플리케이터는 흔하므로 **단독으로는 전문용 근거가 되지 못한다** → 같은 원문에 수술·시술·무균 맥락이 동반될 때만 마커로 인정하도록 고쳤다. **PRODUCIBLE 로 정정.**

### 경계 사례 확인 (PRODUCIBLE 유지)

- **라이센드플러스액** — `storeSignals` 가 비어 경고로 보였으나 원문은 "머릿니, 사면발이, 몸이의 감염증치료… 건조 모발에 사용" 로 명백한 소비자 제품. 내 STORE_MARKERS 가 머릿니 어휘를 안 담았을 뿐이며 판정에는 영향이 없다(판정은 전문용 마커 유무로만 한다).

## 6. DB write 0

read-only 감사. 설명서 생성 0 · LIVE apply 0 · 승인 SSOT/proposal/audit/공용 러너/어댑터 **수정 0**.
기존 V2 LIVE 완료 2,509 master 와 교집합 **0**(162 전건 authored STORE canonical 보유 0, DB 실측).

## 7. 게이트 8/8

| 게이트 | 결과 |
|---|:---:|
| 판정합 == cutaneous 162 (83 + 79) | PASS |
| 근거 결손 0 | PASS |
| fp 혼재 해소(전체 HOLD 승격) | PASS |
| 기존 oromucosal/nasal/rectal/vaginal 116 불변 | PASS |
| 조정 후 shard fp 교집합 0 | PASS |
| 조정 후 shard master 교집합 0 | PASS |
| V2 LIVE 2,509 교집합 0 | PASS |
| DB write 0 | PASS |

## 8. 산출물

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/scripts/otc-external-site-professional-use-separation-audit.ts` | read-only 감사 스크립트 (재실행 가능) |
| `apps/api-server/src/scripts/data/otc-external-site-professional-use-audit-v1.json` | **162 전수 목록** — master별 verdict·사유·전문용 근거 인용·**공식 원문 발췌(효능/용법)**·store 신호 |
| `apps/api-server/src/scripts/data/otc-external-site-recovery-adjusted-proposal-v1.json` | 조정 제안 — shard별 before/after·제외 fp·`fingerprintList`·`masterIds`·writePlan |
| 본 CHECK | |

> 조정 proposal 은 **제안이며 확정 SSOT 가 아니다**. 승인 SSOT 원본은 손대지 않았다.

## 9. 다음 단계

1. 라 또는 다가 본 감사 결과로 **조정 승인 SSOT 확정** (42 fp / 199 master)
2. 다가 어댑터에 **apply 지원 추가** (조정 SSOT 기준, 예상 write 1,194T)
3. 가 → 나 → 다 순차 생산

`HOLD_PROFESSIONAL_USE` 5 fp / 79 master 는 별도 트랙으로 남긴다. 전문 시술 맥락 콘텐츠를 매장 소비자 설명서로 만들 것인지는 생산 이전에 정책 판단이 필요하다.

## 10. Git

- 자기 산출물 4개(감사 스크립트 · 감사 JSON · 조정 proposal · 본 CHECK)만 path-specific stage·commit·push
- 공용 러너·어댑터 **수정 0** · 라 승인 SSOT/proposal/audit **수정 0**
- `apps/api-server/.env` **보존** · 자격증명 값 **출력 0** · 루트 `.env` 미사용
- `git add .` 미사용 · reset/clean/stash 미사용 · 다른 세션 파일 미접촉
