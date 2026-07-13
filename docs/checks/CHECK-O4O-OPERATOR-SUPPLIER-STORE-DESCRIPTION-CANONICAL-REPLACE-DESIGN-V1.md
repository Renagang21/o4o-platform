# CHECK-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-DESIGN-V1

> WO: `WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-V1`
> 성격: **설계 / 영향 분석 문서** (구현 아님). read-only 조사. **write 0** (코드/DB/API/배포/운영샘플 무변경).
> Date: 2026-07-13

---

## 0. 결론 (설계 요약)

기존 STORE canonical 이 있는 상태에서 **더 적합한 새 공급자 STORE 설명서를 canonical 로 교체**하는 정책. 핵심 발견:

- **교체 메커니즘은 이미 존재한다.** `setCanonical(id)` 이 이미 **replace-by-demotion**(같은 (master, STORE, 언어)의 기존 canonical 을 `candidate` 로 강등 → 대상 승격, 단일 트랜잭션)을 수행하고 unique index 를 위반하지 않는다. **신규 write 로직은 필요 없다.**
- 유일하게 필요한 신규 로직 = 승인 핸들러의 **409 `CANONICAL_CONFLICT` 가드를 운영자 명시 확인(예: `replaceExisting=true`)일 때만 우회** 후 `setCanonical` 호출. (CANONICAL-CONFLICT-POLICY-V1 이 이미 "교체는 별도 WO" 로 명문화.)
- **소비처 대부분은 LIVE 참조 → 교체 시 자동 갱신**(Product Landing, `/p/{key}` QR, 태블릿 `o4o_product_description`, 매장 b2c-descriptions 라이브뷰, 다국어 QR 그룹은 무관). **유일한 stale 위험 = 매장이 `import-b2c-description` 으로 물리 복사한 `kpa_store_contents` 사본**(태블릿 `store_content` 소스도 이 사본을 읽음).
- **AUTO-CREDIT / attribution 자동 이관**: 크레딧은 canonical 행의 **per-row** `source_ref_id`(→offer→supplier) 기반 → 새 공급자로 자동 전환. `created_by_supplier_id`/`source_ref_id` 의미 유지.

**권장 방향(다음 구현 WO 로 분리):** 최소안 = 409 가드 우회 + `setCanonical` 재사용(기존 canonical → candidate). 단, ①기존 canonical 을 `candidate` 대신 명시 신호로 처리할지(§5), ②매장 복사본 stale 처리 방침(§7)은 **정책 결정 후** 구현. 본 문서는 설계까지.

---

## 1. 배경 / 범위

- 전제(모두 origin/main 반영·검증됨): `revision_requested` status, `review_note`/`revision_requested_at`/`revision_due_at`, `expireRevisionRequested`, 만료 스케줄러, **CANONICAL-CONFLICT-POLICY-V1(승인 차단 409)**.
- 현재 한계: 기존 STORE canonical 이 있으면 새 공급자 설명서 승인이 **409 로 차단**만 되고, 교체 경로가 없어 운영자가 다음 단계로 진행 불가.
- 본 WO 범위(설계): 교체 정책 · 소비처 영향 · 기존 canonical 처리 · 운영자 확인 절차 · 트랜잭션 안전성 · attribution 보존. **구현/마이그레이션/배포 없음.**

---

## 2. 소비처 영향 분석 (질문 ①: landing/QR/tablet/store copy 참조 방식)

| # | 소비처 | 참조 방식 | canonical 교체 시 |
|---|--------|-----------|-------------------|
| 1 | **Product Landing** `getPublicLanding` (`product-landing.service.ts`) — 공개 `/p/{key}` | LIVE: `master_id + description_type='STORE' + status='canonical' + language` `ORDER BY updated_at DESC LIMIT 1` | **자동 갱신** (SPD id 미저장, 논리키 조회) |
| 2 | **Landing QR** `getLandingQr`/`mintForMaster` → `product_landings.public_key` | ProductMaster 고정 key. QR=URL(`/p/{key}`) 런타임 SVG, SPD id 무관 | **무영향** (QR/타깃 불변, 뒤 콘텐츠만 LIVE 갱신) |
| 3 | **태블릿 content_list** `o4o_product_description` (`store-public-tablet-content-resolve.ts resolveO4oItem`) | 블록 config=**masterId+language만** 저장. resolver 가 canonical STORE LIVE 조회 | **자동 갱신** |
| 4a | **매장 b2c-descriptions 라이브뷰** `GET /store-contents/b2c-descriptions` | LIVE: `master_id + status='canonical' + type='STORE'` | **자동 갱신** |
| 4b | **매장 가져오기(복사)** `POST /store-contents/import-b2c-description` → `kpa_store_contents.content_json` | **물리 COPY**(트랜잭션 INSERT, `source_metadata.copiedFrom='o4o_b2c_product_description'`+`sourceRefId`+`masterId`) | **STALE** (재조회 없음) ⚠️ |
| 4c | **태블릿 store_content 소스** `resolveStoreItem` → `kpa_store_contents` 읽음 | 4b 사본을 읽음 | **STALE**(사본 기반이면) ⚠️ |
| 5 | **다국어 QR 그룹/페이지** `store_multilingual_product_content_groups/pages` | 자체 free-form 콘텐츠, target+locale 키, 자체 public_key. canonical STORE SPD 미참조 | **무영향** |

**결론**: canonical STORE `content` 를 물리 복사하는 테이블은 **`kpa_store_contents`**(`import-b2c-description` 로 생성된 행)뿐. 나머지는 전부 LIVE 참조 또는 무관.

---

## 3. 교체 메커니즘 (질문 ③·⑤: setCanonical / 트랜잭션 순서)

`setCanonical(id, actorId)` (`shared-product-description.service.ts`) — **이미 replace-by-demotion**:

```
transaction {
  target 로드(삭제 거부, cosmetic guard)
  UPDATE ... SET status='candidate', updated_by=actor
    WHERE master_id=target.master AND description_type=target.type
      AND COALESCE(language,'ko')=COALESCE(target.lang,'ko')
      AND status='canonical' AND id!=target AND deleted_at IS NULL   -- 기존 canonical 강등
  target.status='canonical'; curated_by=actor; curated_at=now; updated_by=actor; save  -- 신규 승격
}
```

- **unique index**: `uniq_shared_product_descriptions_canonical_per_master_type_lang (master_id, description_type, COALESCE(language,'ko')) WHERE status='canonical' AND deleted_at IS NULL` (migration `20261228000000`).
- **트랜잭션 순서 안전**: 강등 UPDATE 가 승격 save 보다 **먼저** 실행 → 어느 시점에도 두 canonical 이 partial-unique 조건을 동시에 만족하지 않음. **신규 마이그레이션/인덱스 변경 불필요.**
- **핵심**: 교체는 이미 `setCanonical` 로 구현되어 있고, 차단(409)만 해제하면 됨.

---

## 4. 운영자 확인 절차 (질문 ④)

현재 승인 핸들러(`operator-supplier-store-description-review.controller.ts` `POST /:id/approve`)는 `detail.hasCanonicalConflict` 시 **409 CANONICAL_CONFLICT** 로 차단.

**설계안(다음 구현 WO)**: 교체는 **명시적 2단계**여야 함(실수 방지).
- 운영자가 충돌 행에서 "**기존 설명서 교체**" 액션 → 확인 모달(기존 canonical 정보 표시: `existingCanonicalId`, 기존 공급자명, 기존 승인일)에서 확인.
- API: `POST /:id/approve` body `{ replaceExisting: true }` (또는 별도 `POST /:id/approve-replace`). `replaceExisting===true` 일 때만 409 우회 후 `setCanonical` 호출. 확인 없으면 기존대로 409 유지.
- UI: 기존 `승인 충돌` 배지/비활성 승인 버튼 옆에 "**교체 승인**"(주의색) 버튼 노출. 상세 모달 충돌 배너에 교체 확인 액션.
- 감사: `setCanonical` 이 신규 canonical 에 `curated_by`/`curated_at` 기록. 교체 여부/기존 canonical id 를 로그 또는 action-log 로 남기는 것 권장(선택).

---

## 5. 기존 canonical 처리 옵션 (질문 ②: hidden vs superseded)

`setCanonical` 은 기존 canonical 을 **`candidate`** 로 강등(hidden/deprecated 아님). status union = `draft/candidate/canonical/hidden/needs_review/revision_requested/deprecated` — **`superseded`/`archived` 없음**.

| 옵션 | 방식 | 장점 | 단점 |
|------|------|------|------|
| **A. candidate 유지(현행)** | setCanonical 그대로 | 구현 0, 복구 쉬움, 공개 미노출(landing 은 canonical 만) | 감사 신호 없음(교체됨 vs 미검토 구분 불가)·재승격 실수 위험·기존 curated_* 잔존·검토 풀 혼재 |
| **B. 교체 시 hidden** | 교체 경로에서 강등 행을 추가로 `hidden` set | 기존 값 재사용(union 무변경)·재승격/풀 혼재 감소·"노출중단" 의미와 정합 | hidden 도 재승격 막는 precondition 은 없음(운영 규약으로) |
| **C. superseded 신설** | union 에 `superseded` 추가(varchar, code-only) | 가장 명확한 감사 신호(교체됨 전용)·미검토 candidate 와 분리 | status enumerate 하는 모든 쿼리/필터/프론트 손봐야 함(검토 목록 정렬·필터·배지 등) |

**권장**: **B(교체 시 hidden)** — union 무변경으로 감사/재승격 리스크를 줄이는 최소 개선. 감사 정밀도를 더 원하면 C(`superseded`)를 후속으로. A 는 "구현 최소"지만 운영상 재승격 실수 여지가 있어 교체 맥락에선 비권장. **정책 결정 필요 항목.**

> 참고: 강등 candidate 는 `bulkCanonicalApply`(needs_review만)·`expireRevisionRequested`(revision_requested만) 대상 아님 → 자동 삭제/자동 재승격 없음. 공개도 안 됨. 즉 A 도 데이터 안전성 자체는 문제없고, **운영 UX/감사** 측면 개선 여지가 논점.

---

## 6. AUTO-CREDIT / attribution 보존 (질문 ⑥)

- `resolveSupplierCredit(sourceType, sourceRefId)` (`product-landing.service.ts`) 는 **canonical 행의 `source_type`+`source_ref_id`(=offer id)만** 사용 → offer → supplier → org 체인.
- `source_ref_id`·`source_type`·`created_by_supplier_id` 는 **전부 per-row 컬럼**(공유/캐시 없음). 교체로 다른 공급자 행이 canonical 이 되면 **다음 랜딩 렌더부터 크레딧이 새 공급자로 자동 전환**.
- **의미 유지**: 교체는 attribution 을 바꾸지 않고 "누가 현재 canonical 인가"에 따라 자연히 따라감. `created_by_supplier_id` backfill·`source_ref_id` 의미 변경 불필요. AUTO-CREDIT fallback 무변경.

---

## 7. 매장 복사본(kpa_store_contents) stale 처리 방침 (핵심 정책 논점)

교체의 **유일한 실질 부작용** = `import-b2c-description` 로 이미 복사한 매장 사본은 **옛 canonical 내용으로 고정**(자동 갱신 안 됨). 태블릿 store_content 도 이 사본을 읽음.

옵션(다음 구현/후속 WO 에서 결정):
- **A. 그대로 둠(권장 V1)**: 매장 복사본은 매장 소유 실행 자산이므로 canonical 교체가 소급 변경하지 않는다(복사=시점 스냅샷 정책과 정합). 매장이 원하면 재-가져오기. 구현 0.
- **B. "원본 변경됨" 신호**: `source_metadata.sourceRefId`(복사 시점 SPD id) vs 현재 canonical id 비교로 매장 UI 에 "원본 설명서가 갱신됨 — 다시 가져오기" 배지(read-only 감지, 강제 갱신 아님). 후속 WO.
- **C. 자동 갱신**: 매장 자산을 무단 덮어씀 → **비권장**(매장 소유권 침해, 매장 편집 유실).

**권장**: V1 = A(그대로), 필요 시 B 를 별도 후속 WO. 교체 WO 자체는 canonical 만 다루고 매장 복사본은 건드리지 않는다.

---

## 8. 권장 구현안 (다음 WO 로 분리 — 본 문서는 설계까지)

```
WO-O4O-...-CANONICAL-REPLACE-APPLY-V1 (후속 구현):
1. approve 핸들러: body.replaceExisting===true 일 때만 409 우회 → setCanonical(재사용, 강등+승격)
   - (옵션 B 채택 시) 강등된 기존 canonical 을 hidden 으로 추가 set
2. 운영자 UI: 충돌 행/상세에 '교체 승인'(확인 모달: 기존 canonical/공급자/승인일 표시) 액션
3. 매장 복사본: 무변경(§7-A). (§7-B 는 별도 WO)
4. 검증: 충돌 상태 신규 needs_review → 교체 승인 → 신규 canonical·기존 candidate(or hidden)·landing/tablet/store 라이브뷰 자동 갱신·크레딧 새 공급자 전환. positive 는 [SMOKE] 로.
```
- 재사용: `setCanonical`(무변경), unique index(무변경), `getSupplierStoreReviewDetail.hasCanonicalConflict/existingCanonicalId`.
- 신규: 가드 우회 조건 + 확인 UI (+ 옵션 B 의 hidden set).

---

## 9. 위험 / 주의

```
- 교체는 반드시 운영자 명시 확인 2단계(실수 방지). replaceExisting 없이는 409 유지.
- setCanonical 재사용(신규 DELETE/SQL 금지). 트랜잭션 순서=강등 후 승격(unique 안전).
- 매장 import 사본은 canonical 교체에 소급 반영 안 됨(§7). 매장 소유 자산 무단 갱신 금지.
- AUTO-CREDIT 는 canonical 행 기준 자동 전환 — 교체 시 기존 공급자 크레딧이 새 공급자로 넘어감(의도된 동작, 정책 확인).
- 기존 canonical 처리(candidate/hidden/superseded)는 정책 결정 항목(§5).
- canonical unique index·기존 canonical 강등 로직·AUTO-CREDIT·QR·landing·tablet·다국어그룹 무변경.
- 관리 화면 인증 필요 → 구현 WO smoke 는 인증 세션 준수, positive apply/교체는 [SMOKE] 데이터로만.
```

---

## 10. write 여부

```
DB write 0 · 코드/프론트 구현 0 · API/migration/배포 0 · 운영 샘플 0 (설계/영향 분석 문서만)
```

---

## 11. 완료 기준 대비 (질문 6항목)

| 확인 항목 | 위치 | 상태 |
|-----------|------|------|
| ① landing/QR/tablet/store copy 의 canonical 참조 방식 | §2 | ✅ (대부분 LIVE, 매장 import 만 COPY) |
| ② 기존 canonical hidden vs superseded | §5 | ✅ (A/B/C 옵션 + 권장 B) |
| ③ 신규 승격이 기존 canonical·매장 복사본에 미치는 영향 | §3·§7 | ✅ (기존→candidate 강등 LIVE / 매장 사본 stale) |
| ④ 교체 승인 UI 운영자 확인 절차 | §4 | ✅ (replaceExisting 2단계 확인) |
| ⑤ unique index 충돌 없는 트랜잭션 순서 | §3 | ✅ (setCanonical 강등 후 승격, 안전) |
| ⑥ AUTO-CREDIT / created_by_supplier_id / source_ref_id 의미 유지 | §6 | ✅ (per-row, 새 공급자 자동 전환) |

---

*canonical STORE 교체 = setCanonical 이 이미 구현한 replace-by-demotion 재사용 + 409 가드를 운영자 명시 확인(replaceExisting)으로 우회. 소비처 대부분 LIVE 자동 갱신, 유일 stale=매장 import 사본(kpa_store_contents, §7-A 그대로 권장). AUTO-CREDIT 는 canonical 행 per-row 기준 새 공급자 자동 전환. 기존 canonical 처리=candidate(현행)/hidden(권장)/superseded(후속) 정책 결정 항목. 신규 마이그레이션/인덱스 없음. 구현은 후속 APPLY WO 로 분리. write 0.*
