# CHECK-O4O-ADMIN-O4O-PRODUCT-MASTER-DETAIL-ACTION-DESIGN-V1

Status: DONE — 기본상품 상세 운영 action 설계 (2026-07-07). **설계 문서 전용 — 코드/DB write 0, mutation 0**
WO: `WO-O4O-ADMIN-O4O-PRODUCT-MASTER-DETAIL-ACTION-DESIGN-V1`
선행: `CHECK-O4O-ADMIN-PRODUCT-MANAGEMENT-SCOPE-LOCK-AND-GAP-AUDIT-V1` + 설명상태/활용연결/이미지상태 read-only 뷰 3종

Scope: admin.neture.co.kr O4O 상품관리 **기본상품 상세의 운영 action 구조 설계**. read-only 유지 영역과 write 후보 영역 분리, action별 위험도(R0~R4) 분류, 구현 우선순위·후속 WO 정리. **실제 수정/저장/삭제/업로드/승격 구현 없음.**

---

## 1. 현재 기본상품 상세 화면 구조

`ProductMasterDetailPage.tsx` (GET `/neture/products/library/:id` + 활용연결 GET). 섹션:

| # | 섹션 | 내용 | 현재 |
| -: | --- | --- | --- |
| 1 | 기본 정보 | 상품명·공식명·제조사·브랜드·분류·규격·원산지·태그·생성일 | read-only |
| 2 | 규제 정보 | regulatory_type·MFDS 검증 여부 | read-only |
| 3 | 식별자 | product_identifiers(대표 바코드 + 유형별) | read-only |
| 4 | 이미지 | product_images(대표 primary 배지, 3상태 배지, 이미지상태 화면 링크) | read-only |
| 5 | 공식 소비자 설명 | shared_product_descriptions status='canonical' | read-only |
| 6 | 설명 후보 | shared_product_descriptions 전체 상태 | read-only |
| 7 | 후보 / 원천 연결 | product_candidates 원천(source_type·match_status) | read-only |
| 8 | 사용 상태 | 활용 연결(조직상품/매장취급/자료함콘텐츠) | read-only |
| 9 | **관리 메모** | — | **placeholder(후속 write)** |
| 10 | **작업 이력** | — | **placeholder(후속 audit)** |

---

## 2. 현재 연결된 read-only 화면 / API

| 화면(탭) | API | write |
| --- | --- | --- |
| 기본 상품 목록/상세 | GET `/neture/products/library/search`(+`/:id`) | GET only |
| 이미지 상태 | GET `/admin/o4o-product-db/image-quality`(+`/summary`) | GET only |
| 설명 상태(통합) | GET `/admin/o4o-product-db/description-status`(+`/summary`) | GET only |
| 활용 연결 | GET `/admin/o4o-product-db/masters/:id/usage-links` | GET only |
| OTC 설명 초안 | GET `/admin/product-candidate-description-drafts`(+`/:id`) | GET only |
| 공공데이터 후보 | GET `/operator/product-candidates`(+`/:id`) | GET only |
| **설명 검토 상세** | GET `/admin/shared-product-descriptions` + **PATCH `/:id/canonical` · PATCH `/:id/status`** | **⚠️ 유일 write(단건 canonical 승격/반려)** |

**함의:** admin O4O 상품관리에서 현재 유일한 write 는 설명 검토 상세의 SPD 단건 canonical/반려다. 기본상품 상세 자체는 완전 read-only.

> 백엔드에 존재하나 이 콘솔에 미연결된 mutation: `/admin/shared-product-descriptions`(POST by-master/seed, DELETE) · `/operator/product-candidates`(POST match/reject/archive/refine/link-to-listing) · `/products/library`(POST library/select). 상세 action 설계 시 재사용 여부 검토 대상.

---

## 3. 불변(SSOT) 필드 — write 설계 전 확정

ProductMaster 는 사실상 동결 Core 로 취급한다(핸드오프·CLAUDE.md §3~§4 정신). 아래는 **수정 대상에서 제외(immutable)**:

| 필드 | 사유 |
| --- | --- |
| `barcode` | 상품 SSOT(varchar(14) NOT NULL UNIQUE). 승격 규칙(표준코드/INTERNAL_O4O)의 grain. 변경 시 identifier/매칭/display 붕괴 |
| `mfds_product_id` | MFDS 품목 SSOT(UNIQUE). 원천 추적 키 |
| `regulatory_type` / `drug_category` | 도메인 분기(가드·필터·설명 그룹핑). 변경 시 전 서비스 영향 |
| `id`, `representative_product_id` | 구조 키 |

수정 후보로 검토 가능(별도 WO): `name`(display) · `brand_id`/`brand_name` · `tags` · `specification`(표기). 단 name/spec 은 설명상태·draft 그룹핑이 **name 괄호 파싱**에 의존하므로 변경 파급을 반드시 평가(§6-R3).

---

## 4. 운영 action 후보 + 위험도(R0~R4)

| action | 등급 | 대상/저장 | 위험·근거 | 권한 | 감사 | 승인 |
| --- | :-: | --- | --- | --- | --- | --- |
| 상태/연결/이미지/설명 **조회** | **R0** | (읽기) | 무위험 — 이미 구현 | admin/operator | — | — |
| **내부 메모**(운영/검수 메모) | **R1** | 신규 `product_master_notes`(append-only) | 상품 데이터 무영향·가역. master 참조만 | admin/operator | created_by | 불요 |
| **이미지 업로드/교체/대표지정** | **R2** | `product_images`(+`o4o-media-library`) | display 영향·가역(교체/soft). 대표 1개 규칙·고아미디어 리스크 | admin/operator | created_by/updated_by | 팀 정책 |
| **이미지 삭제(soft)** | R2 | `product_images` soft | display 영향. 대표 삭제 시 fallback 필요 | admin | audit | 팀 정책 |
| **설명 후보 연결/생성**(단건 SPD) | **R2** | `shared_product_descriptions` insert(status=needs_review) | canonical 미변경이면 display 무영향. draft→SPD 승격 트랙과 정합 필요 | admin/operator | created_by | 불요(needs_review) |
| **canonical 승격/반려**(단건) | R2→R4 | `shared_product_descriptions` PATCH | **이미 설명검토 상세에 존재**. 단건=R2, 대량=R4 | admin | curated_by | 단건 불요/대량 승인 |
| **기본 정보 수정**(name/brand/tags/spec) | **R3** | `product_masters` UPDATE(제한 컬럼) | name/spec 변경=설명그룹핑·매칭 파급. barcode/mfds/regulatory 제외 | admin | 변경이력 필수 | **승인 게이트** |
| **canonical 대량 반영 / 설명서 apply** | **R4** | SPD bulk(예: no_spd 1,296) | display 대량 변경. 별도 트랙(draft→SPD APPLY) | admin | run marker | **승인+dry-run+rollback** |
| **삭제 / archive** | **R4** | `product_masters`(deleted_at 없음→`product_data_status`) | identifier/desc/ext/image cascade + 사용중 상품 파괴. usage-links 게이트 필수 | platform admin | audit | **승인+백업+사용중 차단** |
| **대량 보정(bulk)** | R4 | 다중 master | 광범위 파급 | platform admin | run marker | **승인+dry-run+chunk+rollback** |

---

## 5. 권한 / 감사로그 / 승인 게이트 공통 설계

- **권한**: 모든 write 는 `requireRole` ADMIN 롤셋(설명검토 컨트롤러와 동일). R4(삭제/대량)는 `platform:admin`/`super_admin` 한정.
- **감사로그**: Operator OS `action-log-core`(F1 Freeze) 재사용 — action/actor/target master_id/before-after. 작업 이력(§1-10) 섹션이 이 로그의 read view.
- **승인 게이트**: R3 이상은 "확인→실행" 2단계 + (R4) 사전 백업·dry-run·chunk·rollback marker(약가/의약외품 승격 apply 에서 확립한 패턴 재사용: run marker + soft delete rollback).
- **사용중 가드**: R3/R4 는 실행 전 `usage-links` 조회로 조직상품/매장취급/콘텐츠 연결 여부 확인 → 연결 있으면 경고·차단(§4 사용상태 재사용).
- **불변 잠금**: §3 SSOT 필드는 UI·API 양쪽에서 편집 불가(readonly + 서버 화이트리스트).

---

## 6. read-only 유지 vs write 후보 분리 (결론)

**read-only 유지(당분간):** 규제 정보(§1-2)·식별자(§1-3)·공식 소비자 설명(§1-5)·후보/원천 연결(§1-7)·사용 상태(§1-8). (SSOT·파생·조회 축)

**write 후보(단계적 개방):**
- 즉시 착수 권장: **R1 내부 메모**(§1-9 placeholder 실체화). 자기완결·가역·저위험.
- 다음: **R2 이미지 action**(§1-4) — MediaPicker + o4o-media-library, 대표 1개 규칙.
- 다음: **R2 설명 후보 연결**(§1-5/6) — draft→SPD 승격 트랙과 통합.
- 신중: **R3 기본 정보 수정**(§1-1 일부) — name/spec 파급 평가 + 변경이력 + 승인.
- 최후: **R4 canonical 대량/삭제/archive/bulk** — 별도 승인·백업·rollback.

---

## 7. 구현 우선순위

| 순위 | action | 등급 | 근거 |
| -: | --- | :-: | --- |
| 1 | 내부 메모 | R1 | 자기완결·가역·저위험, 운영 즉시 효용(§1-9 실체화) |
| 2 | 작업 이력(read view) | R0/설계 | action-log-core read 노출(§1-10). write action 착수 전 관측 기반 |
| 3 | 이미지 action | R2 | 이미지 없음 195,599 보강 경로. 별도 WO |
| 4 | 설명 후보 연결 | R2 | draft→SPD 승격(no_spd 1,296)과 정합. 별도 WO |
| 5 | 기본 정보 수정 | R3 | name/spec 파급 평가 선행. 별도 WO+승인 |
| 6 | canonical 대량/삭제/archive | R4 | 최후·별도 승인·백업·rollback |

---

## 8. 후속 WO 목록

| WO(제안) | 등급 | 범위 |
| --- | :-: | --- |
| `WO-O4O-ADMIN-O4O-PRODUCT-MASTER-NOTE-V1` | R1 | product_master_notes(append-only) + 상세 관리메모 섹션 write. 최소 감사(created_by) |
| `WO-O4O-ADMIN-O4O-PRODUCT-MASTER-AUDIT-LOG-VIEW-V1` | R0 | action-log-core read view(작업 이력 섹션). write governance 문서 |
| `WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-ACTION-V1` | R2 | 업로드/교체/대표지정/soft delete. o4o-media-library·대표 1개·고아미디어 정책 |
| `WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-CANDIDATE-LINK-V1` | R2 | 단건 SPD needs_review 생성/연결. draft→SPD 승격 트랙 정합 |
| `WO-O4O-ADMIN-O4O-PRODUCT-MASTER-BASIC-EDIT-V1` | R3 | name/brand/tags/spec 수정(SSOT 잠금·파급평가·변경이력·승인) |
| `WO-O4O-ADMIN-O4O-PRODUCT-MASTER-ARCHIVE-DESIGN-V1` | R4 | archive/delete 거버넌스(product_data_status·usage 가드·백업·rollback) — 설계 우선 |

> draft→SPD **대량** 승격 apply(no_spd 1,296)는 admin 상세 action 이 아니라 **분류/데이터 트랙**(`WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-TO-SHARED-DESCRIPTION-APPLY-V1`)에서 진행. 여기 섞지 않는다.

---

## 9. write 0 확인

| 항목 | 결과 |
| --- | --- |
| DB write / migration | **0** |
| API mutation 구현 | 0 |
| 수정/저장/업로드/삭제 버튼 구현 | 0 |
| canonical 변경 / ProductMaster 수정·삭제 | 0 |
| 코드 변경 | 0 (문서만) |
| git diff --check | 통과 |
| 산출물 | 본 CHECK 1건 |

---

## 10. 완료 보고 요약

- **R0(read-only, 완료)**: 기본정보/규제/식별자/이미지상태/공식설명/설명후보/원천연결/사용상태 조회
- **R1(낮은 위험)**: 내부 메모
- **R2(중간 위험)**: 이미지 업로드·교체·대표지정·soft delete / 설명 후보 단건 연결 / canonical 단건(기존)
- **R3(높은 위험)**: 기본 정보 수정(name/brand/tags/spec, SSOT 제외)
- **R4(매우 높은 위험)**: canonical 대량 반영 / 삭제·archive / 대량 보정
- **우선 구현 권장**: R1 내부 메모 → 작업 이력 read → R2 이미지
- **보류/별도 승인**: R3 기본 정보 수정, R4 전부(백업·dry-run·rollback 선행)
