# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-MEMBERSHIP-PERSIST-V1

- WO: WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-MEMBERSHIP-PERSIST-V1
- 일자: 2026-07-07
- 모드: **분류 복원 + 멤버십 재현 DRY-RUN** (persist 토큰 미부여 → DB write 0)
- 선행: STRENGTH-SPLIT-V1(분류 SSOT) / CANONICAL-PROMOTION-SCRIPT-V1(16 ENUM_MISMATCH) / REVIEW-PREP `455892206`
- 산출물: `apps/api-server/src/scripts/drug-otc-nutrition-combo-membership-persist.ts`

## 0. 목적
promotion 이 (atc7+form) 만으로 재현해 16그룹이 차단됐다. 실제 그룹 축(STRENGTH-SPLIT §1.3)을 복원해
draft 별 정확한 target master 집합을 재현하고, `seed_json.groupScope.masterIds` 에 persist 한다.

## 1. 분류 로직 복원 (STRENGTH-SPLIT §1.3 + 부록) — 운영 DB 실측 검증

| 축 | 규칙 | 검증 |
|----|------|------|
| **복합제 조성** | e약은요 canonical `content` 정규식: `A+` = `비타민 ?A를 1일 ?5,?000` / `Fe+` = `(철 ?결핍성 ?빈혈\|철분 ?중독)`. comp∈{A-Fe,A-noFe,noA-Fe,noA-noFe}. named 토큰(caD/DEC/B1B2B6C/mgB)=noA-noFe. baseline noA-noFe = (atc×form) − 양성태그(ungrounded 포함). | A11JC/tab 실측: A-Fe 21·A-noFe 20·noA-Fe 10·noA-noFe 709(all)/407(grounded), 합 760 = 전체 ✅ |
| **단일제 함량** | `product_masters.specification` 첫 토큰 버킷(STRENGTH_BUCKET 맵) | 비타민E 100(=100밀리그램 8)·400(400IU 9)·1000(1000IU 17+1000밀리그램 3=20), Mg 470/940/290.8, biotin WHOLE ✅ |

> **핵심 재해석:** draft `groupScope.masterTotal` = 분류기반 **"그룹 전체 master 수"**(ungrounded 포함).
> STRENGTH-SPLIT 문서의 master_count(예: noA-noFe 407)는 e약은요 **grounded 부분집합**(=spdMasters)이다. 서로 다른 지표.

## 2. DRY-RUN 결과

```
passTargets 20 / excludedEnforced 3
persist-ready 18 / MISMATCH 2 / dbWrite 0
```

### 2-1. persist-ready 18그룹 (reproduced == declared masterTotal)

| kind | atc7/form/token | declared=reproduced | title |
|------|-----------------|:---:|-------|
| strength | A11HA05/tablet/5mg | 30 | 비오틴 5mg |
| strength | A11HA03/sc/100iu | 8 | 비타민 E 100 IU |
| strength | A11HA03/sc/400iu | 9 | 비타민 E 400 IU |
| strength | A11HA03/sc/1000iu | 20 | 비타민 E 1000 IU |
| strength | A12CC/tablet/470mg | 21 | Mg·B6 470mg급 |
| strength | A12CC/tablet/940mg | 4 | Mg·B6 940mg급 |
| strength | A12CC/tablet/290mg | 3 | Mg·B6 290mg급 |
| combo-homogeneous | A12AX/tablet/caD | 598 | 칼슘·비타민 D |
| combo-homogeneous | A11JA/tablet/DEC | 259 | 비타민 D·E·C |
| combo-homogeneous | A11EB/tablet/B1B2B6C | 95 | 비타민 B1·B2·B6·C |
| composition | A11JC/tablet/noA-noFe | 709 | 종합 B군·C·D·E+아연 (A·철없음) #13 |
| composition | A11JC/tablet/A-noFe | 20 | 종합 A·B군·C·D·E |
| composition | A11JC/sc/noA-noFe | 769 | 종합 E·B군+Mg·아연 (A·철없음) |
| composition | A11JC/sc/A-noFe | 118 | 종합 A·B군·C·E |
| composition | A11EX/tablet/A-noFe | 4 | 종합 A·D·B군 |
| composition | A11JB/tablet/noA-noFe | 320 | 종합 D·E·B군·C+아연 (A·철없음) |
| composition | A11JB/sc/noA-noFe | 240 | 종합 E·B군+Mg (A·철없음) |
| composition | A11JB/sc/A-noFe | 29 | 종합 A·E·B군·C |

→ 이 18그룹은 masterIds 재현 확정. persist 시 `groupScope.masterIds` 저장 → promotion 이 enumeration 대신 사용.
→ **이전 promotion 에서 ENUM_MISMATCH 였던 조성 combo·강도 단일 14그룹이 여기서 해소됨.**

### 2-2. MISMATCH 2그룹 (persist 보류 — blocker)

| title | atc7/form/token | declared | reproduced | 원인 / 필요 조치 |
|-------|-----------------|:---:|:---:|------------------|
| 비타민 C 1000mg | A11GA01/tablet/1000mg | 31 | 38 | **groupScope.masterTotal(31)이 stale.** 실제 1000mg급(1000/1030/1030.9/1031밀리그램)=38. 멤버십은 재현 가능(38)이나 **선언 수 보정 필요**(31→38 확인). |
| 마그네슘·비타민 B2·B6 액제 | A11JB/liquid/mgB | 101 | 115 | A/Fe 축만으론 부족. A11JB 액제 115건에 **비-Mg 액제 14건 과포함**. Mg 성분 검출 축 추가 필요(declared 101 = Mg 함유 subset). |

## 3. 분류의 잔여 한계 (STRENGTH-SPLIT §5 정합)

- 조성 분류는 **e약은요 content 기반**(주성분코드 아님). e약은요 content 없는 master 는 양성태그 불가 → noA-noFe baseline 으로 귀속. 이는 draft masterTotal 산출과 **동일 방법**이라 정확히 재현되나(§2-1 exact match), 성분코드 기준 진실과 100% 일치 보장은 아님(문서 §5 명시 한계와 동일).
- persist 후에도 이 한계는 승계됨. 승격 대상은 "그룹 전체 master(display 목적)"이므로 baseline 포함이 정책상 맞음.

## 4. 금지사항 준수 (본 dry-run)

- [x] DB write 0 (persist 토큰 미부여)
- [x] pass 20건 외 draft 미접촉 (candidate ANY/ALL 가드)
- [x] excluded 3건 미접촉
- [x] content_json / review_status 미변경 (write 경로는 seed_json.groupScope.masterIds 한정)
- [x] shared_product_descriptions / ProductMaster / ProductIdentifier 미변경
- [x] canonical 승격·매장 연결 없음

## 5. 완료 기준 대비

| 기준 | 상태 |
|------|------|
| 분류 로직/SQL 재확인 | ✅ STRENGTH-SPLIT §1.3 복원 + 실측 검증 |
| draft별 target master_id 재산출 | ✅ 20그룹 masterIds 재현 |
| groupScope.masterTotal 비교 | ✅ 18 MATCH / 2 MISMATCH |
| 일치 시에만 masterIds 저장 준비 | ✅ (apply 게이트 하 MATCH 그룹만 UPDATE) |
| 불일치 그룹 blocker 문서화 | ✅ §2-2 (비타민C·mgB 액제) |
| 4 ELIGIBLE 그룹도 동일 방식 저장 | ✅ (biotin/Ca+D/D·E·C/B1B2B6C 포함, 경로 단일화) |
| post-check masterIds count == masterTotal | ✅ (게이트 자체가 이 조건) |
| DB write 0 | ✅ |

## 6. persist 후 promotion 스코프 변화

- CANONICAL-PROMOTION-SCRIPT dry-run: 즉시 승격 4그룹 / 신규 523.
- 본 persist(18그룹) 반영 시 promotion 이 masterIds 를 쓰면 **18그룹 승격 가능**(조성 combo·강도 단일 포함). 승격 대상 master ≈ 3,256(18그룹 합). 신규 canonical 수는 promotion 을 masterIds 기반으로 재실행해 재산출.
- 잔여 2그룹(비타민C 1000mg·mgB 액제)은 §2-2 보정 후 편입.

## 7. 다음 단계

1. **persist 토큰 부여**(`--apply` + `…_MEMBERSHIP_PERSIST_CONFIRM=YES`) → 18그룹 masterIds 저장.
2. promotion 스크립트 enumeration 축을 **저장된 masterIds** 로 교체(게이트 제거) → 18그룹 승격 경로 확보.
3. 보정 WO: (a) 비타민C 1000mg `groupScope.masterTotal` 31→38 확인·보정, (b) mgB 액제 Mg 성분 검출 축 추가.
4. content markdown→HTML 정책(promotion 직전).
5. #13/#14 제목 충돌 별도 처리.
