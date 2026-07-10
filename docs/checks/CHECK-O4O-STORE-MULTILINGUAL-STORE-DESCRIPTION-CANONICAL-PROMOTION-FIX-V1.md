# CHECK-O4O-STORE-MULTILINGUAL-STORE-DESCRIPTION-CANONICAL-PROMOTION-FIX-V1

> 증상: 매장용 상세설명서 모달에 중국어 STORE 설명서가 있는데 **한국어 탭만 표시**
> 대상 제품: `유기농 여주 담은 청정 한방 흑염소 진액 골드` (master `66a16b58-05e5-4ac1-af3f-81c94a05c1d8`)
> 작업일: 2026-07-10 · 코멘트 커밋 `cd908c436` · 데이터 보정 1건(승인)

---

## 0. 결론

**중국어는 정상적인 STORE 상세설명서(SPD, `description_type='STORE'`, `language='zh'`, 본문 존재)였으나 status가 `candidate`(≠`canonical`)라 모달 쿼리(`status='canonical'`)에서 제외**되어 있었다. 근본 원인은 **과거의 언어-무시(language-agnostic) `setCanonical`이 다른 언어 canonical까지 강등**시킨 것으로, 이 버그는 이미 **`4cf5d6ea9`(WO-O4O-STORE-MULTILINGUAL-CANONICAL-DESCRIPTION-V1, 현재 API 배포 리비전)에서 언어별 `setCanonical`로 수정·배포**되어 있었다. 남은 작업은 (a) 구식 주석 정정, (b) 방치된 zh candidate 1건 승격, (c) smoke — 전부 완료.

---

## 1. 진단 (read-only)

### 1.1 모달·조회 경로
- 프론트 `web-kpa-society/.../StoreDescriptionViewModal.tsx`: 응답 items를 `language`별로 그룹핑해 **존재하는 언어만 탭**으로 노출(한국어 우선). 로직 정상.
- 백엔드 `store-content.controller.ts` `GET /store-contents/b2c-descriptions`:
  ```sql
  WHERE master_id=$1 AND status='canonical' AND description_type='STORE' AND deleted_at IS NULL
  ```
  → **언어 필터 없음(모든 언어 반환)** 이지만 **`status='canonical'` 필터**가 있음.

### 1.2 DB 실제 상태 (조사 시점)
| id | language | status | 본문 |
|---|---|---|---|
| acf0…363 | ko | candidate | 有 |
| 7615…efe | ko | **canonical** | 有 → 한국어 탭 노출 |
| f2ce…3da | zh | **candidate** | 有(`清净韩方黑山羊浓缩精 GOLD`) → **탭 제외** |

→ 중국어는 STORE SPD로 존재(=QR 콘텐츠 그룹 문제 아님), 다만 canonical이 아님.

### 1.3 근본 원인 (forensic — `curated_at` 기준)
- canonical 유일성 인덱스: `uniq_shared_product_descriptions_canonical_per_master_type_lang` = `(master_id, description_type, COALESCE(language,'ko'))` → **언어별 canonical 지원됨**(zh canonical 가능).
- 타임라인: 03:17:05 ko setCanonical(→canonical) → 03:17:06 **zh setCanonical 시 (구)언어-무시 로직이 ko를 강등** → 03:19:02 ko 재저장 setCanonical 시 **zh를 강등**. 매 승격이 다른 언어 canonical을 강등 → 결국 마지막 저장 언어(ko)만 canonical, zh는 candidate로 남음.
- 즉 **저작 흐름(admin STORE 저작: createCandidate→setCanonical)은 언어별로 호출되고 있었고**, 버그는 `setCanonical`의 강등 범위(언어 무시)에 있었다.

---

## 2. 수정 흐름 (WO 진행 방향 대비)

| WO 항목 | 상태 |
|---|---|
| 1. candidate로 남긴 저작 경로 추적 | ✅ admin STORE 저작 + 구 language-agnostic `setCanonical` 강등 |
| 2. 언어별 저장 후 각각 `setCanonical` | ✅ 이미 그렇게 동작(`product-master-description.controller.ts` POST) |
| 3. ko 승격이 다른 언어 승격 누락시키지 않도록 | ✅ **`4cf5d6ea9`에서 `setCanonical`이 `(master, type, 언어)` 동일 언어만 강등하도록 수정·배포됨** ([service:233-247](../../apps/api-server/src/modules/neture/services/shared-product-description.service.ts#L233-L247)) |
| 4. 언어별 unique 정책 유지 | ✅ 인덱스 `uniq_…_per_master_type_lang` 유지 |
| 5. 구식 주석 "master당 canonical 1개" 정정 | ✅ `cd908c436` — service 헤더 + controller 헤더 2곳을 "(master, type, 언어)당 1개"로 정정 |
| 6. 대상 제품 zh candidate 1건 canonical 승격 | ✅ 데이터 보정(아래 §3) |
| 7. 매장 화면 smoke | ✅ PASS(§4) |

> 핵심: **item 1~4의 코드 수정은 이미 `4cf5d6ea9`로 반영·배포**되어 있었다. 이번 작업은 그 사실을 확인하고, 잔여(주석·데이터·smoke)를 완료한 것.

---

## 3. 데이터 보정 (승인됨 · 최소 범위 1건)
- 대상: `f2ce8f4a-1f40-40a9-8682-bf303e2d06da` (master 66a16b58, STORE, zh, candidate)
- 실행: 단일 행 트랜잭션 UPDATE (guard: id+master_id+type+language+`status='candidate'`+deleted_at IS NULL). 해당 master/type에 다른 zh canonical이 없어 per-language unique 위반 없음. **ko canonical 미접촉**.
  ```sql
  UPDATE shared_product_descriptions SET status='canonical', curated_at=now(), updated_at=now()
  WHERE id='f2ce8f4a-…' AND master_id='66a16b58-…' AND description_type='STORE'
    AND language='zh' AND status='candidate' AND deleted_at IS NULL;  -- UPDATE 1
  ```
- 결과: ko `canonical`(7615) + zh `canonical`(f2ce) **공존**. ko candidate(acf0)는 그대로.

---

## 4. 실브라우저 smoke — PASS
kpa-society.co.kr 체험 약국 경영자 로그인 → `/store/handled-products` → 제품 선택 → **매장용 상세설명서 보기**:
1. ✅ 탭 **[한국어] [中文]** 동시 표시(이전=한국어만).
2. ✅ `한국어` 탭: 한국어 본문(청정 한방 흑염소 진액 골드…).
3. ✅ `中文` 탭: 중국어 본문 렌더(`清净韩方黑山羊浓缩精 GOLD` — 黑山羊浓缩精100%·有机苦瓜+当归·川芎·白芍·红参·生姜·陈皮…·店内咨询).
4. ✅ 언어 전환 정상, ko canonical 미강등(양쪽 유지).

증빙: 스크린샷 `store-desc-multilingual-zh-tab.png`.

---

## 5. 금지 준수
- candidate를 매장 화면에 직접 노출 안 함(모달 쿼리 `status='canonical'` **유지**, 완화 안 함).
- ko canonical 강등 안 함.
- 다른 언어·다른 제품 상태 일괄 변경 안 함(단 1행만 UPDATE).
- 전체 STORE candidate 자동 승격 안 함.

## 6. 안전 확인
- 코드 변경: 주석 2곳(런타임 무변경). migration 0. DB write = **1행(승인된 데이터 보정)**.
- 런타임 로직 수정은 이미 배포된 `4cf5d6ea9`가 담당 → 재발 방지(신규 다국어 STORE 저작은 언어별 canonical 정상 승격).

## 7. 완료 기준 대비
- [x] 신규 다국어 STORE 저작 시 각 언어 canonical 승격 (4cf5d6ea9)
- [x] 대상 제품 ko·zh canonical 공존
- [x] 모달 한국어·중국어 탭 표시
- [x] 언어 전환·본문 렌더 정상
- [x] 타입체크·빌드(주석 커밋)·운영 smoke PASS
