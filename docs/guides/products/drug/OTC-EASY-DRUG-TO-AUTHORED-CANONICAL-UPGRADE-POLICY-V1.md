# OTC e약은요 → authored canonical 승격(교체) 정책 V1

> **목적**: grounded OTC 제품은 이미 `mfds_easy_drug / STORE / ko / canonical` **슬롯을 점유**하므로, 신규 authored 구조화 설명서를 단순 INSERT하면 canonical unique 제약을 위반한다. 기존 표시본을 authored 표시본으로 **안전하게 교체(in-place upgrade)**하는 계약을 정의한다.
> **상태**: Active · 일자 2026-07-18 · WO-O4O-OTC-EASY-DRUG-TO-AUTHORED-CANONICAL-UPGRADE-POLICY-NA-V1 · **read-only 설계(DB write 0)**
> **소비처**: [OTC-NEW-DRAFT-AUTHORING-EXECUTION-GUIDE-V1](OTC-NEW-DRAFT-AUTHORING-EXECUTION-GUIDE-V1.md) STEP 1~2 계약을 본 문서로 대체.
> **파일럿 검증(2026-07-18)**: §2 계약이 **에르도스테인 300mg 정 첫 Track A 승격**으로 실측 검증됨 — 26 master LIVE(easy demote 26·authored flip 26·audit 26). §1~§8 설계는 이 실측으로 확정되었으며 **실행에서 얻은 lessons·정정 원칙은 §9 참조**(본 반영 = WO-O4O-OTC-GROUNDED-UPGRADE-PILOT-LESSONS-GUIDE-NA-V1, 문서 전용·DB write 0).

---

## 0. 확인된 스키마 사실 (근거)

| 항목 | 실측(코드) | 근거 |
|---|---|---|
| canonical unique | **partial unique index** `uniq_shared_product_descriptions_canonical_per_master_type_lang` ON `(master_id, description_type, COALESCE(language,'ko'))` **WHERE `status='canonical' AND deleted_at IS NULL`** | `20261228000000-CanonicalPerMasterTypeLanguage.ts` |
| **source_type는 키에 없음** | canonical은 (master, description_type, language)당 **1개** — source 무관 | 위 인덱스 |
| 허용 status | `draft·candidate·canonical·hidden·needs_review·revision_requested·`**`deprecated`** | `SharedProductDescription.entity.ts` |
| 조회(QR/상세/랜딩) | `WHERE status='canonical' AND description_type='STORE' [AND lang] ORDER BY updated_at DESC LIMIT 1` — **source_type 필터 없음** | `product-landing.service.ts:251/270`, `product-master-description.controller.ts`, `product-library.controller.ts:155` |
| 원문 보존 축 | 행 삭제 없이 `status` 만 전환하면 content·source_ref_id 보존(인덱스 predicate 밖으로 이탈) | 인덱스 predicate = canonical&not-deleted |
| 감사 로그 | `SharedProductDescriptionAuditLog` 엔티티 존재 → 전환 기록 대상 | entities |

> **슬롯 충돌의 정체**: e약은요 canonical이 (master, STORE, ko) 슬롯을 점유 → authored canonical INSERT는 partial unique 위반. **먼저 e약은요를 슬롯에서 이탈(demote)**시켜야 authored가 들어갈 수 있다.

---

## 1. 선택지 비교 · 권고

| 선택지 | 내용 | 조회 계약 | 복잡도 | 판정 |
|---|---|---|---|---|
| **A (권고)** | 동일 TX에서 e약은요 canonical → `deprecated` demote 후 authored canonical 생성/승격 | **무변경**(source 무관 resolve → authored를 그대로 반환, 언어탭·QR 그대로) | 중(단일 TX·순서·사후검증) | ✅ **채택** |
| B | authored를 **별도 description_type**로 저장 | ❌ STORE가 표시 슬롯 — 새 type은 기존 화면에 **노출 안 됨**(조회 계약 파손) | 저 | 기각(표시 목적 미달) |
| C | e약은요 **미보유 제품만** 대상으로 제한 | 해당 없음 | 저 | 기각(모집단 소멸) — `새설명서필요` 9,101은 **전량 e약은요-grounded**라 C면 대상 0 |

**권고 = A.** 근거: (1) canonical unique가 source 무관이라 슬롯 교체가 정합적, (2) STORE가 유일 표시 슬롯이고 조회가 source-agnostic이라 **화면 무변경**, (3) B는 표시 파손, (4) C는 `새설명서필요` 정의상 대상이 사라짐(무의미).

---

## 2. 승격(교체) 계약 — Option A (단일 TX)

대상 단위 = **(master_id, description_type='STORE', language='ko')** 슬롯. 그룹의 연결 master 각각에 적용.

> **안전 순서 원칙(확정)**: **authored 콘텐츠를 먼저 준비·검증한 뒤에만** 기존 e약은요 canonical을 내린다. authored가 준비되지 않은 상태에서 기존 canonical부터 demote하는 것을 금지한다. `authored canonical 직접 INSERT`는 needs_review 행을 만들 수 없는 예외에서만 사용한다(기본 경로는 needs_review→flip).

```text
STEP A — authored 콘텐츠 준비·검증 (demote 이전)
1) authored ko needs_review 확보:
   INSERT authored (source_type='mfds_drug_otc'|..._nutrition_combo, description_type='STORE',
     language='ko', status='needs_review', content=<§2 구조화 draft>, source_ref_id=<candidate/원천>)
   WHERE NOT EXISTS(authored canonical|needs_review for 슬롯);   -- 재실행 no-op
   또는 기존 authored needs_review 행 확인(멱등).
2) 검증: 내용(구조화·grounding 완비)·source_ref_id·대상 master 수 확인.
   미충족 → 중단(demote 미실행, 슬롯 무변경).

STEP B — 슬롯 교체 (단일 TX, 단일 write-owner)
BEGIN;
   cur := 현재 canonical(슬롯). 
   - cur 0건                    → ABORT(grounded는 e약은요 canonical 보유 전제) → 보고
   - cur.source_type ∈ authored → NO-OP(이미 승격) → COMMIT(무변경)
   - cur.source_type='mfds_easy_drug' → 진행
3) e약은요 canonical → deprecated:
   UPDATE ... SET status='deprecated', updated_at=NOW(), updated_by=$owner
   WHERE id=cur.id AND status='canonical';   -- content·source_ref_id·행 보존, deleted_at NULL 유지
4) authored needs_review → canonical flip:
   UPDATE ... SET status='canonical', curated_at=NOW(), curated_by=$owner
   WHERE master_id=$m AND description_type='STORE' AND COALESCE(language,'ko')='ko'
     AND source_type IN (authored) AND status='needs_review' AND deleted_at IS NULL;
5) 사후검증(실패 시 ROLLBACK):
   - canonical_count(슬롯) == 1      (0·2 방지)
   - 그 1건.source_type ∈ authored   (교체 성공)
   - deprecated e약은요 행 1건 존재    (원문 보존)
   - dup == 0
   불일치 → ROLLBACK;
6) 감사 로그: SharedProductDescriptionAuditLog에 demote(easy→deprecated) + flip(→authored canonical) 기록.
7) COMMIT;
```

- **순서 고정**: STEP A(authored 준비·검증) → STEP B에서 **demote(3) → flip(4)**. demote·flip 역순은 partial unique 위반. authored 미준비 시 STEP B 진입 금지.
- **0/2 방지**: 2 canonical은 partial unique index가 구조적으로 차단, 0 canonical은 demote+flip을 같은 TX에 묶어 방지(demote만 단독 커밋 금지).
- **예외(2b, 비권장)**: needs_review 행을 만들 수 없는 상황에서만 STEP B-4를 `INSERT authored canonical`로 대체. 기본 경로 아님.

### 2-A. 예상 write (master당 · 감사 로그 분리)

```text
master당 최소 write (ko 승격):
- authored needs_review INSERT  : 1  (STEP A-1, 신규 시. 기존 행 재사용 시 0)
- easy canonical → deprecated   : 1  (STEP B-3)
- authored needs_review → flip  : 1  (STEP B-4)
- audit log                     : 1  (canonical_replaced 1행/교체 — demote·flip을 previous/new로 한 행에 기록)
= SPD write 3 (또는 2) + audit log 1 per master
en 단계: 빈 슬롯 INSERT 1 (+ audit 1) per master (별도)
```

> **감사 로그 규약(정정 2026-07-19)**: 엔티티 `SharedProductDescriptionAuditLog` 는 `event_type='canonical_replaced'` **1행에 previous_description_id(demote된 easy)+new_description_id(승격된 authored)+previous_status/new_status+metadata** 를 함께 기록한다 → **교체 1건 = audit 1행/master**. 초판의 "2행/master"(demote·flip 별도)는 구현과 불일치라 **1행/master 로 정정**. 감사 의미(누가·언제·무엇을→무엇으로·이전 강등처)는 metadata(`previousDemotedTo:'deprecated'` 등)로 보존된다.
> **승인 봉투 보고 규칙**: 예상 write는 **SPD 변경과 audit log를 분리**해 보고한다(예: `SPD 3 × N + audit N`). 그룹 전체 = master 수 × 위 계수. no-op(이미 authored) master는 write 0.

---

## 3. ko → en 순서

1. **ko 승격 완료·검증(§2) 후에만 en 진행**(ko canonical이 en fan-out 소스 — `drug-otc-en-fanout.ts`는 `ko.status='canonical'` 요구).
2. **en 슬롯 = (master, STORE, en)**: bridge 실측상 grounded는 **e약은요 en 미보유**(en canonical 0) → en은 대개 **빈 슬롯 → authored en canonical 직접 INSERT**(demote 불필요).
3. 예외로 en canonical이 이미 있으면(드묾) 동일 §2 계약을 en 슬롯에 적용(demote→replace).
4. en 단계 실행 절차·검수·공개 전환은 [OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1](OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md).

---

## 4. 원문 보존 · Rollback 계약

- **원문 보존**: e약은요 행은 **삭제하지 않음**. `status='deprecated'`(deleted_at NULL 유지) → content·source_ref_id·language 전부 보존, 조회 슬롯에서만 이탈. 감사·재승격 근거로 남음.
- **Rollback(자동)**: §2의 어떤 단계라도 실패/사후검증 불일치 → **전체 TX ROLLBACK** → demote·flip·insert 전부 원복 → e약은요 canonical 원상 복구(0 canonical 잔존 불가).
- **수동 원복(사후)**: 필요 시 `UPDATE authored SET status='deprecated'; UPDATE easy SET status='canonical'`을 동일 TX·사후검증으로 수행(역계약). 원문 행이 보존돼 있어 복구 가능.

---

## 5. 재실행 no-op · 단일 write-owner

- **no-op**: §2-0에서 현재 canonical이 이미 authored면 무변경 COMMIT. 모든 UPDATE/INSERT는 status·source·NOT EXISTS 가드 → 재실행 시 0행 영향.
- **write-owner**: 동일 (master, 슬롯) production write는 **단일 세션만 소유**(번역 지침 §0-A 상속). 승격 시작~사후검증·no-op 확인까지 타 세션 write 금지(read-only만). 봉투 완료 후 소유 해제.

---

## 6. 조회(QR·상세화면) 영향

- **표시 내용**: resolve가 source-agnostic이므로 승격 후 동일 쿼리가 **authored canonical을 그대로 반환** → QR/상세/랜딩/라이브러리 **화면 무중단**(빈 화면·2중 노출 없음).
- **언어탭**: `available languages` = canonical STORE distinct language → ko 유지, en 추가 시 탭 자동 노출(개선).
- **출처 표기(경미)**: 랜딩 응답에 `source_type` 포함 → 만약 UI가 "e약은요 출처" 배지를 렌더하면 승격 후 authored 출처로 바뀜(파손 아님, 표기 갱신). 배지 문구는 후속 UI 검토 대상(비차단).
- **deprecated 행**: 소비자 조회(status=canonical)에는 안 보이고, 운영 목록(status=all)에서만 감사용으로 보임.

---

## 7. 기존 authoring 가이드 정정 (슬롯 충돌 전제)

[OTC-NEW-DRAFT-AUTHORING-EXECUTION-GUIDE-V1](OTC-NEW-DRAFT-AUTHORING-EXECUTION-GUIDE-V1.md) 정정:
- §5 STEP 1~2의 "`INSERT ... WHERE NOT EXISTS(canonical)` 후 flip"(빈 슬롯 가정)을 **본 문서 §2 승격(교체) 계약으로 대체**: grounded는 e약은요 canonical이 슬롯을 점유하므로 **demote→replace**가 필수.
- §0/§1의 "기존 STORE canonical 보유 master 제외"는 **authored canonical 보유만 제외**로 정밀화(e약은요 canonical 보유는 제외가 아니라 **승격 대상**).

> 본 정정은 별도 최소 편집으로 authoring 가이드에 반영(수치·규칙·봉투 무변경, 슬롯 계약 참조만 추가).

---

## 8. 완료 기준 (승격 실행 세션용)

- 슬롯당 canonical == 1(authored) · deprecated e약은요 1행 보존 · dup == 0.
- ko 승격·검증 완료 후 en 진행. 감사 로그 기록.
- 실패 시 TX ROLLBACK로 e약은요 canonical 원복. 재실행 no-op.
- DB write = status 전환 + authored INSERT/flip만(구조 변경 0). 자기 산출물만 path-specific commit.

---

## 9. 파일럿 검증 lessons — 에르도스테인 300mg 정 첫 Track A (2026-07-18)

> 본 절은 §1~§8 설계를 **실행으로 검증**하며 얻은 확정 원칙이다. 정책 방향·산식·감사 규약은 §2/§2-A/§5 그대로이며, 본 절은 그 실측 확인과 실행 세부 원칙을 추가한다. 근거 CHECK: [DRYRUN](../../../checks/CHECK-O4O-OTC-ERDOSTEINE-300MG-UPGRADE-DRYRUN-EXECUTE-V1.md) · [SSOT-TARGET-FIX](../../../checks/CHECK-O4O-OTC-ERDOSTEINE-300MG-SSOT-TARGET-FIX-DA-V1.md) · [INCIDENT](../../../checks/CHECK-O4O-OTC-ERDOSTEINE-300MG-UPGRADE-APPLY-INCIDENT-V1.md) · [FLIP-PARSE-FIX](../../../checks/CHECK-O4O-OTC-ERDOSTEINE-300MG-FLIP-RESULT-PARSE-FIX-DA-V1.md) · [APPLY-RETRY(완료)](../../../checks/CHECK-O4O-OTC-ERDOSTEINE-300MG-UPGRADE-APPLY-RETRY-V1.md).

### 9-1. 검증된 표준 흐름 (확정)

**needs_review 준비 → easy demote → authored flip → audit → 검증** 이 실측으로 성립한 표준 승격 순서다.

| 단계 | 연산 | 에르도스테인 실측 | 대응 계약 |
|---|---|---:|---|
| ① needs_review 준비 | authored `needs_review` INSERT (멱등) | 최초 26 / 재사용 시 0 | §2 STEP A |
| ② easy demote | easy canonical → `deprecated` | 26 | §2 STEP B-3 |
| ③ authored flip | authored needs_review → `canonical` | 26 | §2 STEP B-4 |
| ④ audit | `canonical_replaced` INSERT | 26 | §2-A |
| ⑤ 검증 | canonical1·authored·deprecatedEasy·dup0 | PASS → COMMIT | §2 STEP B-5 |

- **audit = `canonical_replaced` 1행/master** (previous=demote된 easy · new=승격된 authored를 한 행에 기록). §2-A 규약이 실측과 일치함이 확인됨. **"2행/master" 로 되돌리지 말 것.**
- 실측 총 write = **78** (demote 26 + flip 26 + audit 26), needs_review 재사용으로 STEP A INSERT 0. 제외 4건(안전지문 불일치)은 미접촉·불변.

### 9-2. STEP A ↔ STEP B 분리 시 중간 상태 처리 원칙

STEP A(needs_review 준비)와 STEP B(슬롯 교체)는 **별도 TX** 로 커밋될 수 있다. 인시던트에서 STEP A는 커밋되고 STEP B는 ABORT/ROLLBACK 된 중간 상태가 실제로 발생했다. 이때의 원칙:

- **STEP A 커밋 + STEP B 미커밋 = 안전한 중간 상태**다. authored `needs_review` 26은 조회 슬롯 밖(표시 안 됨), live STORE ko canonical은 e약은요 그대로 → **소비자 화면 영향 0**.
- STEP A는 **멱등**(`INSERT … WHERE NOT EXISTS(authored canonical|needs_review)`) → 정정 후 STEP B 재실행이 기존 needs_review 26을 **그대로 이어받아 flip**한다. **재삽입·중복 0**(52 아님).
- 중간 상태에서 needs_review 를 성급히 DELETE 하지 말 것. cleanup 이 필요하면 별도 승인 DELETE 로만 수행. 기본은 정정본 STEP B 가 이어받음.
- **demote 단독 커밋 금지**(§2 유지): demote(③ 이전 단계)는 flip 과 반드시 같은 TX. 0 canonical 잔존 방지.

### 9-3. 동일 대상 단일 write-owner (실측 확인)

- 동일 `(master, STORE, ko)` 슬롯의 production write 는 **단일 세션만 소유**(§5 write-owner 상속). 에르도스테인에서 코드 수정(에이전트 다)과 apply 실행(에이전트 가)을 분리하되, **실제 DB write 소유는 실행 세션 1개**로 고정됐다.
- 승격 시작 ~ 사후검증/no-op 확인까지 타 세션은 **read-only 만**. 봉투 완료 후 소유 해제. 코드 수정 세션은 write 0(코드만).

### 9-4. 재실행 = ALREADY_UPGRADED (표준 계약)

이미 승격 완료된 대상에 승격을 재실행하면 **다음이 표준**이다:

- **판정 = `ALREADY_UPGRADED`** (cur.source_type ∈ authored → 대상 이미 교체됨)
- **DB write = 0** (demote·flip·audit·insert 전부 0)
- **verification = PASS** (canonical1 = authored · deprecated easy 보존 · dup 0 이 이미 성립)
- **exit code = 0** (정상 종료)

> 실측 주의: 에르도스테인 스크립트는 재실행 시 pre-gate(“easy canonical 정확히 26” 전제)가 승격 후 상태(easy=deprecated)와 반대라 **ABORT** 로 안전 거부했다(write 0·상태 불변으로 손상은 없음). 그러나 **표준 계약은 pre-gate ABORT 가 아니라 ALREADY_UPGRADED PASS/exit 0** 이다 — 향후 승격 스크립트는 “이미 authored canonical” 을 **성공(no-op)** 으로 인식해 exit 0 반환하도록 작성한다(에러 아님). 이미-승격을 실패로 보고하지 말 것.

### 9-5. fingerprint = bridge full-content SSOT (coarse 재계산 금지)

- 승격 대상 분할(그대로확장 vs 안전지문 불일치)의 fingerprint 는 **bridge 정본**([FULL-CORPUS-AUTHORED-BRIDGE-INTEGRATION](../../../checks/CHECK-O4O-OTC-FULL-CORPUS-AUTHORED-BRIDGE-INTEGRATION-V1.md), 함수 `easySections`/`freeSections`/`bucketSections`/`formOf`/`routeSig`/`ingredientOf`/`strengthOf`/`groupKeyOf`) 를 **verbatim 재현**해 계산한다.
- **coarse 재계산 금지**: 초기 파일럿이 독자 `sections`(상호작용을 `cau` 에 포함)로 coarse 재계산 → bridge 의 `bucketSections`(상호작용을 **`itx`** 로 cau 와 분리)와 불일치 → target 0 FAIL 이 발생했다. 원인 = full-content 기반 bridge 산식을 재현하지 않고 자체 재계산한 것.
- 확정: 대상 fingerprint `4b4e162690065e8e` = **26**(그대로확장), 제외 `d68b3eec1cb56646` = **4**(안전지문 불일치). 승격 스크립트는 bridge 함수를 그대로 채용하고 `target∩exclude==0`·`excluded==4` 게이트를 둔다.
- bridge 산출 JSON 은 fingerprint·size·bucket·sampleName 만 담고 **master ID 를 영속화하지 않는다** → 결정론적 분할의 유일한 방법은 **bridge 알고리즘 재현**(임의 ID 하드코딩·독자 재계산 아님).

### 9-6. 인시던트 시 live canonical 유지 여부 우선 확인

승격 중 스크립트 오류/ABORT/ROLLBACK 등 인시던트 발생 시 **가장 먼저 확인할 것 = live STORE ko canonical 이 유지되는가**:

- 최우선 점검: `WHERE status='canonical' AND description_type='STORE' AND lang='ko'` 슬롯이 **여전히 존재(0건 아님)** 하고 소비자 조회가 무중단인지. 에르도스테인 인시던트에서 live canonical 은 e약은요 그대로 유지 → **화면 영향 0** 이 먼저 확인됐고, 그 위에서 원인 진단·재개를 진행했다.
- §2 STEP B 는 demote+flip 을 단일 TX 로 묶어 **0 canonical 잔존을 구조적으로 차단**하므로, ROLLBACK 시 easy canonical 이 자동 원복된다. 인시던트 보고는 이 “live 안전” 확인을 결론 최상단에 둔다.
- live 안전이 확인되면 스크립트/파싱 버그는 **WO 금지 범위 밖에서 미수정 중단·핸드오프**(에르도스테인: 실행 세션은 미수정 중단, 코드 수정은 별도 owning 세션). live 가 위험할 때만 즉시 역계약(§4 수동 원복)을 검토한다.
- 실행 함정(참고): TypeORM `UPDATE … RETURNING` 결과는 드라이버에 따라 `[rows, affected]` 또는 `rows` 로 온다 → `retRows(res)=Array.isArray(res)&&Array.isArray(res[0])?res[0]:res` 가드 없이 `flip[0].id` 로 읽으면 `newId=null` 거짓 실패 → ABORT. 승격 스크립트의 모든 RETURNING 파싱에 이 가드를 둔다.
