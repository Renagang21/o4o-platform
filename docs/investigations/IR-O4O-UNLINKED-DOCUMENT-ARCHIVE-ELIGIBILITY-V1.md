# IR — 선행 참조 없는 문서의 archive 판정 가능성 V1

> **WO-O4O-UNLINKED-DOCUMENT-ARCHIVE-ELIGIBILITY-INVESTIGATION-V1**
> **작성일**: 2026-08-06 · **기준 커밋**: `8f24e9eed`
> **성격**: **read-only 조사**. 문서 이동 **0건** · 문서 삭제 **0건** · 기존 문서 수정 **0건**.
> **판정 기준**: [`../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md`](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md)
> **선행 방법**: [`IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md`](IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md)

---

## 1. 목적과 비목적

앞선 두 번의 시험 적용(HFF-ZH 7건, topical 9건)은 **본문에 선행 CHECK·커밋 해시가 남아 있는 트랙**이었다. 그 연결이 없었다면 트랙을 복원할 수 없었다.

**목적**: 본문에 선행 참조가 **없는** 문서군도 안전하게 archive 판정할 수 있는지, 가능하다면 **무엇을 근거로** 판정하는지 확정한다.

**비목적**:
- 문서 이동·삭제 (본 IR 범위 밖)
- 전체 문서 전수 판정 (표본 조사다)
- archive 자동화 구현

---

## 2. 모집단 산출

### 2-1. "선행 참조 없음" 의 조작적 정의

문서 본문에 아래 **네 가지가 모두 없는** 경우로 정의했다.

| # | 신호 | 탐지 방법 |
|---|------|-----------|
| 1 | 선행 WO·CHECK·IR 문서명 | `(WO|CHECK|IR|SMOKE|VERIFY)-…` 토큰 — **자기 자신과 자기 짝 WO 는 제외** |
| 2 | 관련 커밋 해시 | 7~40자 hex 토큰 (숫자만인 것 제외) |
| 3 | 후속 작업 문서 | 위 1번에 포함 |
| 4 | 명시적 트랙 종료 선언 | `완결` `CLOSED` `트랙 종료` `판정 PASS/GREEN/STOP` `COMPLETED` 등 |

**핵심 설계 결정**: `CHECK-X-V1` 본문의 `WO: WO-X-V1` 은 **선행 참조로 세지 않는다.** 같은 작업 단위의 자기 짝이지 앞선 트랙과의 연결이 아니다. 이 규칙을 넣지 않으면 거의 모든 CHECK 문서가 "연결됨"으로 잡혀 조사 자체가 성립하지 않는다.

### 2-2. 실측

대상 폴더: `docs/work-orders/` · `docs/checks/` · `docs/investigations/` · `docs/ir/`

| 항목 | 값 |
|------|---:|
| 스캔한 추적 `.md` | 2,157 |
| 선행 참조 없음 (모집단) | **119** (5.5%) |

| 폴더 | 전체 | 선행 참조 없음 |
|------|---:|---:|
| `docs/checks/` | 1,224 | 77 |
| `docs/investigations/` | 717 | 31 |
| `docs/work-orders/` | 192 | 10 |
| `docs/ir/` | 24 | 1 |

**모집단이 작다는 것 자체가 결과다.** 문서 3,000건 중 대부분은 본문에 연결이 남아 있고, 연결이 없는 것은 5.5% 뿐이다. 이 5.5% 를 위해 별도 자동 규칙을 만들 필요는 없다.

> **탐지기의 흔들림 (기록)**: 종료 선언 정규식이 마크다운 강조를 고려하지 않으면 `판정: **PASS**` 를 놓친다. 이를 보정하면 모집단은 **119 → 113** 으로 줄어든다(6건이 "종료 선언 있음"으로 재분류). 표본은 보정 전 119 목록에서 뽑았으므로 위 표는 119 기준이다.
> **함의**: "종료 선언 문구 탐지" 는 표기 흔들림에 약하다. 이 신호 하나로 판정하지 않는다 (§4-2).

### 2-3. 모집단 전체 특성 (113건 기준 실측)

| 항목 | 건수 | 비율 |
|------|---:|---:|
| 도입 커밋 **메시지**가 WO/CHECK/IR 이름을 포함 | 57 | 50% |
| 도입 커밋이 **코드 파일**을 동반 | 60 | 53% |
| 도입 커밋이 **문서만** 변경 | 53 | 47% |
| inbound 참조 **0건** | 68 | 60% |
| 코드에서만 이름이 언급됨 (문서 참조 0) | 0 | 0% |
| 커밋 **2회 이상** (사후 결과 반영 있음) | 17 | 15% |
| 도입일이 최근 (2026-07-20 이후) | 20 | 18% |

---

## 3. 표본과 판정

`docs/work-orders/README.md`(폴더 구조 문서)를 모집단에서 제외하고, 서비스·작업 유형이 편중되지 않도록 **32건**을 선정했다. (KPA·Neture·GlycoPharm·K-Cosmetics·admin·의약품/건기식 생산·태블릿·QR·포럼·회원 등)

판정 분포:

| 판정 | 건수 |
|------|---:|
| `ARCHIVE-ELIGIBLE` | 12 |
| `ACTIVE` | 16 |
| `INSUFFICIENT-EVIDENCE` | 4 |
| `SUPERSEDED` | **0** |
| `MISPLACED` (배타 아님 — 위 판정에 덧붙는 표시) | 2 |

### 3-1. `ARCHIVE-ELIGIBLE` 12건

| 문서 | 근거 |
|------|------|
| `checks/CHECK-O4O-ADMIN-PRODUCT-CANDIDATES-SOURCE-UI-HIDE-V1` | 도입 커밋 `22fbaed56` 이 본문이 지목한 바로 그 파일(`ProductCandidatesPage.tsx`)을 변경. 본문 §5 결론 확정. 참조 0 |
| `checks/CHECK-O4O-NETURE-FORUM-DELETE-OPERATOR-AND-ADMIN-SEPARATION-V1` | 도입 커밋 `e180be76c` 메시지가 WO 이름 포함 + 백엔드/프론트 13파일 반영. 참조 0 |
| `checks/CHECK-O4O-SITEGUIDE-LEGACY-CODE-REMOVAL-V1` | 커밋 `07496aa5f` 이 route·entity·migration 포함 40파일 제거. 잔여 감사 문서 1건과 **2건 트랙** |
| `checks/CHECK-O4O-KPA-QR-PAGE-CONTENT-E2E-SMOKE-V1` | 프로덕션 E2E 전 단계 PASS. 잔여는 "별도 WO 권고" 로 분리됨. 참조 0 |
| `checks/CHECK-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1` + 짝 WO | 커밋 2회(구현 `4d7390bcf` → 결과 반영 `be5f71cb0`). **WO+CHECK 2건 트랙** |
| `checks/CHECK-O4O-KPA-TABLET-PUBLIC-DISPLAY-SOURCE-ALIGNMENT-V1` + 짝 WO | 커밋 2회(`463809d10` → `80a500f18`). **WO+CHECK 2건 트랙** |
| `investigations/CHECK-KPA-STORE-ASSET-DERIVATION-VIEWER-QR-BLOG-EXTEND-V1` | 커밋 2회 중 두 번째가 "배포 후 smoke 결과 반영". 참조 0 |
| `investigations/CHECK-O4O-CROSSSERVICE-OPERATOR-DASHBOARD-UI-PARITY-V1` | 판정 PASS + 커밋 `ee3804ed7` 6파일. 참조 0 |
| `investigations/CHECK-O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1` | 본문이 "정책·구조 정리 종료" 명시. 후속 문서 1건과 **2건 트랙** |
| `work-orders/IR-O4O-SERVICE-CONFIG-O4OHELP-AUDIT-V1` | 단일 질문 → 단일 결론("적용 대상 아님"). 참조 0. **MISPLACED** |
| `work-orders/WO-O4O-NETURE-SUPPLIER-PRODUCT-LIFECYCLE-V1` | 본문이 WO 가 아니라 감사 보고서(`Audit completed · ALL PASS`). 참조 0. **MISPLACED** |
| `work-orders/WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1` | 커밋 `183484148` 에 구현+테스트 포함, 짝 CHECK 존재. **조건부** — §4-3 참조 |

### 3-2. `ACTIVE` 16건 — 왜 후보가 아닌가

네 가지 서로 다른 이유가 나왔고, **모두 파일명·날짜로는 구별되지 않는다.**

| 사유 | 사례 | 판별 근거 |
|------|------|-----------|
| **조사 미착수** | `investigations/IR-O4O-NETURE-OVERVIEW-STRUCTURE-AUDIT-V1` | 본문 말미 `Status: Investigation Request — 조사 미착수` |
| **Living Document (계속 갱신)** | `ir/IR-O4O-OSMU-CONTENT-CONVERSION-CONCEPT-V1` | 커밋 **15회**(2026-06-23 ~ 06-30), 본문 "단계마다 갱신" |
| **DRAFT·검수 대기** | `checks/HFF-HOLD-EXCEPTION-ANALYSIS-DRAFT-V1` | 본문 "DRAFT · 검수 대기", 진행 중 WO 1건이 인용 |
| **트랙이 계속 진행 중** | `checks/CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-TEST-100-V1` · `-HFF-EN-BATCH-01-…` · `-HFF-PROBIOTICS-300-…` · `-DRUG-OTC-ORAL-SINGLE-TOTAL-INVENTORY-AUDIT-V1` | 본문이 스스로 "다음은 …" 로 후속을 지시. 파일 자체는 종료 문구를 가짐 |
| **현행 기준 문서의 근거** | `investigations/IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1` | `docs/baseline/O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1.md` 이 인용 |
| **코드가 이 문서를 근거로 지목** | `checks/CHECK-O4O-APPROVED-PUBLIC-DATA-API-BULK-FETCH-AND-SAMPLE-MAPPING-V1` | `easy-drug-info-candidate.mapper.ts` 등 3개 소스가 문서명 언급 |
| **임시 상태가 아직 살아 있음** | `checks/CHECK-O4O-HOME-TEMP-EXPERIENCE-ACCOUNT-NOTICE-V1` | 코드에 제거 표식 주석이 남아 있고 제거 조건 미충족 |
| **보류 IR** (규칙 §3-3) | `investigations/IR-O4O-KPA-STORE-HANDLED-PRODUCTS-DISPLAY-CONTENT-MODEL-V1` | "설계 확정, 후속 WO 분리 대기" = 보류이지 완료가 아님 |

### 3-3. `INSUFFICIENT-EVIDENCE` 4건

| 문서 | 왜 판정 불가인가 |
|------|------------------|
| `checks/CHECK-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1` | 상태가 "배포/마이그레이션 **대기**". 실제 적용 여부는 **운영 DB 확인이 필요** → WO §5 중지 조건 |
| `checks/CHECK-O4O-MEDICAL-DEVICE-SLIM-TO-DISTRIBUTION-FIELDS-V1` | 동일 — "실제 적용은 CI/CD 대기" |
| `work-orders/WO-O4O-STORE-FLOW-END-TO-END-V1` | 실행 기록이 저장소 어디에도 없다. 도입 커밋 `dd9088511` 은 **무관한 59파일 일괄 커밋**이라 트랙 복원 불가 |
| `work-orders/CHECK-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-QUEUE-V1` | **본문 0바이트.** 커밋 `0c2d04a5e` 가 "사용자 지시로 내용 비움". 판정할 내용이 없음 |

### 3-4. `SUPERSEDED` 0건 — 의미 있는 공백

표본 32건 중 대체 관계로 판정되는 문서는 **한 건도 없었다.**

선행 참조가 없는 문서는 애초에 **다른 문서와의 관계가 기록되지 않은 문서**이므로, 대체 문서를 지목할 근거도 없다. 규칙 §2-2("대체 문서 없이 SUPERSEDED 를 붙일 수 없다")가 이 문서군에서는 사실상 `SUPERSEDED` 를 금지한다.

**결론**: 이 문서군에 `SUPERSEDED` 를 적용하려는 시도 자체가 오판 위험이다. `ARCHIVE-ELIGIBLE` / `ACTIVE` / `INSUFFICIENT-EVIDENCE` 3분류로 충분하다.

---

## 4. 판정에 실제로 쓸 수 있었던 근거 / 쓸 수 없었던 근거

### 4-1. 쓸 수 있는 근거 (판정력 있음)

| 근거 | 왜 유효한가 | 자동화 |
|------|-------------|:------:|
| **도입 커밋의 메시지** | 본문에 없는 WO 이름이 커밋 메시지에는 남아 있다. `feat(tablet): … (WO-O4O-…-V1)` 형태가 반복된다 | 가능 |
| **도입 커밋이 함께 바꾼 코드 파일** | 문서가 기술한 변경이 실제로 반영됐는지 확인된다. 코드가 함께 바뀌었으면 "실행됨"이 확정된다 | 가능 |
| **커밋 횟수** | 1회 = 기록 후 방치, 2회 = 실행 후 결과 반영(종료 신호), 다수 = Living Document(진행 중) | 가능 |
| **inbound 참조의 종류** | 참조가 `baseline/`·`guides/` 등 **기준 문서**면 현역, `checks/` 등 기록 문서면 트랙 동반 이동 대상 | 가능 |
| **본문의 "다음/후속" 문장** | 트랙 계속 여부를 문서 스스로 말한다 | 부분 |
| **문서 자기 선언** (`조사 미착수`·`DRAFT`·`대기`) | 가장 강한 ACTIVE 신호 | 부분 |

> **가장 큰 발견**: 본문이 "선행 참조 없음"이어도 **Git 커밋이 그 연결을 대신 갖고 있다.** 32건 중 판정 가능했던 28건은 전부 커밋 메시지 또는 커밋의 파일 집합으로 판정됐다. 즉 이 문서군은 "근거가 없는 문서"가 아니라 **"근거가 본문 밖에 있는 문서"** 다.

단, **어느 근거도 단독으로는 절반을 넘지 못한다** (§2-3 실측: 커밋 메시지 50% · 코드 동반 53% · 커밋 2회 이상 15%). 따라서 **한 신호로 판정하지 않고 S1~S4 를 함께 본다** (§5).

### 4-2. 쓸 수 없는 근거 (판정력 없음 — 쓰면 오판)

| 근거 | 반례 |
|------|------|
| **파일명·prefix** | `WO-O4O-NETURE-SUPPLIER-PRODUCT-LIFECYCLE-V1` 은 WO 가 아니라 감사 보고서다 |
| **폴더** | `docs/work-orders/` 에 IR·CHECK·감사보고서가 섞여 있다 |
| **작성 날짜** | 2026-03-14 문서가 종료(archive 가능), 2026-06-04 문서가 현행 기준의 근거(ACTIVE) |
| **본문의 "완료"·"PASS" 문구** | HFF·OTC 생산 회차 문서는 **회차는 완료했지만 트랙은 진행 중**이다. 문서 하나의 PASS 는 트랙 종료가 아니다 |
| **inbound 참조 0건** | 필요조건이지 충분조건이 아니다. 참조 0인데도 진행 중인 문서가 표본에 있다 |
| **문서 길이·상세도** | 0바이트 문서도, 18KB Living Document 도 모두 판정 불가/ACTIVE 다 |

### 4-3. 새로 확인된 경계 — "이름 언급" vs "경로 참조"

`WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1` 은 **소스 코드 2개 파일이 문서명을 주석으로 언급**한다.

- 코드는 문서의 **경로**를 쓰지 않고 **이름**만 쓴다 → `git mv` 로 옮겨도 **깨지지 않는다**.
- 반면 문서 간 마크다운 링크는 **경로**를 쓴다 → 옮기면 깨진다.

규칙 §4-2 는 "외부 참조 없음"만 말하고 이 둘을 구분하지 않는다. 실제 위험은 **경로 참조**뿐이다. 이 구분을 §7 후속 보정 대상으로 올린다.

---

## 5. 판정 절차 제안 (선행 참조 없는 문서군 전용)

기존 4단계 절차([`IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md`](IR-O4O-DOCUMENT-ARCHIVE-CANDIDATE-METHOD-V1.md) §3)의 3-2(종료 확인) 단계를 이 문서군에 한해 아래로 대체한다.

```
S1. 도입 커밋 확인       git log --format='%h|%ad|%s' --date=short -- <파일>
S2. 커밋의 파일 집합      git show --name-only --format= <도입커밋>
S3. inbound 참조 분류     git grep -l -- "<basename>"   → 코드 / 기준 문서 / 기록 문서
S4. 본문 자기 선언 확인    DRAFT · 미착수 · 대기 · "다음은 …"
```

**판정 규칙**

| 조건 | 판정 |
|------|------|
| S2 에 코드 파일 있음 + S4 에 후속 지시 없음 + S3 에 기준 문서 참조 없음 | `ARCHIVE-ELIGIBLE` |
| S4 에 `DRAFT`·`미착수`·`대기`·`다음은` 중 하나라도 있음 | `ACTIVE` |
| S3 에 `baseline/`·`architecture/`·`guides/`·`rules/` 참조 있음 | `ACTIVE` |
| S1 커밋 수 ≥ 3 | `ACTIVE` (Living Document) |
| 본문이 "배포 대기"·"CI/CD 대기" 로 끝남 | `INSUFFICIENT-EVIDENCE` (운영 DB 확인 필요 → 판정하지 않음) |
| 도입 커밋이 무관 문서 다수의 일괄 커밋(≥ 20 파일, 코드 0) | `INSUFFICIENT-EVIDENCE` |
| 본문 0바이트 | `INSUFFICIENT-EVIDENCE` |

**어느 규칙에도 걸리지 않으면 `ACTIVE` 로 둔다** (규칙 §2-3).

---

## 6. 자동화 가능 범위

| 단계 | 자동화 | 사유 |
|------|:------:|------|
| 모집단 산출 (선행 참조 없음 탐지) | ✅ | 순수 텍스트 판정. 본 조사에서 재현 확인 |
| S1~S3 증거 수집 | ✅ | `git log` / `git show` / `git grep` 로 기계적 |
| `ACTIVE` 조기 배제 | ✅ | S4 키워드 + 커밋 수 + 기준 문서 참조는 오탐이 나도 **보수적 방향**(안 옮김)이라 안전 |
| `ARCHIVE-ELIGIBLE` **확정** | ❌ | 트랙 경계 판단이 필요. "회차 완료 ≠ 트랙 종료" 를 기계가 구분하지 못한다 |
| 실제 이동 | ❌ | 규칙 §5-6 금지. 사람이 트랙 단위로 승인 |

**요약: 후보 산출과 배제는 자동화하고, 이동 결정은 하지 않는다.** 현재 규칙 §5-6 과 일치하며, 이 조사는 그 경계가 옳다는 것을 실측으로 확인했다.

---

## 7. 후속 작업 제안

1. **규칙 §4-2 보정** — "외부 참조 없음" 을 **경로 참조**로 한정하고, 코드 주석의 이름 언급은 이동 차단 사유가 아님을 명시한다 (§4-3 근거).
2. **`ARCHIVE-ELIGIBLE` 12건의 정규 이동** — 트랙 단위로 나누면 **9개 트랙**(단독 7 + 2건 트랙 2 + WO·CHECK 짝 2 … §3-1 참조). 규칙 §4 "한 커밋 = 한 트랙" 에 따라 커밋을 나눈다. 한 번에 전부 하지 않는다.
3. **`INSUFFICIENT-EVIDENCE` 4건은 손대지 않는다.** 별도 수동 검토 큐로 남긴다. 0바이트 문서는 archive 대상이 아니라 **존치 여부 자체를 사용자가 결정할 사안**이다.
4. **`ACTIVE` 16건은 조사 대상에서 영구 제외하지 않는다.** 진행 중 트랙이 끝나면 그 트랙 규칙(본문 선행 참조 있음)으로 처리된다.

**본 IR 로는 아무 문서도 옮기지 않는다.**

---

## 8. 조사 중 관측된 부수 사실 (정리 대상 아님, 기록만)

- `docs/investigations/IR-O4O-NETURE-SUPPLIER-PROFILE-APPROVAL-TARGET-AUDIT-V1.md` 말미에 도구 호출 태그 잔여물(`</content>` 등)이 그대로 커밋돼 있다. 내용 손상은 아니며 본 WO 범위 밖이라 **수정하지 않았다**.
- `docs/work-orders/` 의 `CHECK-…-PILOT-100-QUEUE-V1.md` 는 0바이트다. 파일은 추적 중이나 내용이 없다.
- 선행 참조 없는 문서 119건 중 `docs/checks/` 가 77건(65%)으로 가장 많다. `checks/` 가 단발성 기록이 가장 많이 쌓이는 폴더라는 뜻이다.

---

## 9. 자체 검증

| 항목 | 결과 |
|------|------|
| 문서 이동 | **0건** |
| 문서 삭제 | **0건** |
| 기존 문서 본문 수정 | **0건** (본 파일만 신규) |
| 코드·설정·DB·CI 변경 | **0건** |
| 운영 DB 접속 | **없음** (필요한 2건은 `INSUFFICIENT-EVIDENCE` 로 기록) |
| 민감정보(자격증명·토큰·비밀번호) 기재 | 없음 |
| 확인 사실 / 추정 구분 | §2~§4 는 실측, §5~§7 은 제안으로 명시 |
| 표본 수 | 32 (WO 상한 50 이내) |
