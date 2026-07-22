# CHECK-O4O-MULTILINGUAL-AND-TABLET-DEFERRED-DB-REVERIFY-V1

> WO: `WO-O4O-MULTILINGUAL-AND-TABLET-DEFERRED-DB-REVERIFY-V1`
> 성격: 이전에 "DB 타임아웃"으로 보류했던 다국어·태블렛 DB 검증을 **올바른 프로덕션 DB 사용자**로 read-only 재수행.
> Date: 2026-07-22 · DB write 0 · 코드 0 · 배포 0.
> 대상 문서: `IR-O4O-STORE-DESCRIPTION-MULTILINGUAL-REGISTRATION-AUDIT-V1`(§7 미수집) · `CHECK-O4O-SUPPLIER-SCREEN-SET-BACKEND-HUB-COPY-V2B`(§13 분포) · `CHECK-O4O-SUPPLIER-SCREEN-SET-UI-STORE-HUB-INTEGRATION-V2C`(DB 재검증 보류)

---

## 1. 정상 접속 확인

올바른 프로덕션 DB 사용자로 cloud-sql-proxy 경유 정상 접속(SELECT current_user 확인). read-only 쿼리만 수행. **자격증명 값·비밀번호·Secret 미기록.** 이전 세션의 반복 "타임아웃(124)"은 DB 부하가 아니라 **로컬 `apps/api-server/.env` 의 잘못된 자격증명**(DB_PASSWORD 빈 값·DB_USERNAME=o4o_user, 프로덕션 사용자는 별도)으로 psql 이 비번 프롬프트에서 hang 된 것이었다 — 올바른 사용자로는 동일 쿼리가 수 초 내 완료된다.

## 2. 언어별 STORE canonical 수량 (IR §7 미수집 → 확정)

`shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, `GROUP BY language`:

| language | canonical STORE |
|:--------:|----------------:|
| ko | **29,169** |
| en | **10,667** |
| zh | **29** |
| ja | **0** |
| (null/기타) | 0 (§4 주석 참조) |

- 언어별 저장이 실제로 활용되고 있으며(특히 en 10,667 — HFF 복합형·OTC Track A EN 작업 반영), 구조가 다국어를 실효적으로 담고 있음이 실측으로 확인됨.
- **주의(라이브 churn)**: 동시 세션(OTC/HFF)이 이 테이블에 canonical 승격을 진행 중 → 총량은 조회 시점마다 ±수십 변동. 위 수치는 2026-07-22 조회 시점 스냅샷.

## 3. 언어별/전체 상태 분포

STORE(`deleted_at IS NULL`) status 분포:

| status | count |
|:------:|------:|
| canonical | **39,881** |
| deprecated | 766 |
| candidate | 286 |
| hidden | 10 |

- 현재 `needs_review`/`draft`/`revision_requested`(공급자 초안·검수 대기) STORE 행은 0 — 공급자 STORE 설명서 실데이터가 아직 없음(가용 공급자 계정 등록 상품 0과 정합).
- canonical 총계(39,881) = 언어별 합(§2, 39,865) ± 라이브 churn(조회 간 동시 승격으로 ~16 차이).

## 4. canonical 중복 검사 — ✅ 무결

`(master_id, description_type='STORE', COALESCE(language,'ko'))` canonical 중복(HAVING count>1) = **0**. partial unique index(`uniq_shared_product_descriptions_canonical_per_master_type_lang`, migration 20261228000000) 가 실효적으로 언어별 유일성을 보장하고 있음을 실측 확인.

> **데이터 품질 관측(부수)**: `status`+`language` 동시 GROUP BY 시 psql 이 `invalid byte sequence for encoding "UTF8": 0xa1` 로 중단 — 일부 **비-canonical** STORE 행의 `language` 컬럼에 비UTF8 바이트(0xa1) 가 존재하는 것으로 추정(canonical 집계·중복검사는 정상 완료, 영향 없음). 별도 데이터 품질 항목으로 분리 — 본 WO 범위(수치 재수집) 밖.

## 5. V2b·V2c 재검증 결과

`store_tablet_screen_sets`(`deleted_at IS NULL`) origin/status 분포:

| 범위 | origin | status | count |
|------|:------:|:------:|------:|
| 전역 | store | active | **12** |
| 약국 매장(9c87f46b) | store | active | **12** |
| 전역 | supplier | (any) | **0** |
| 전역 | operator | (any) | **0** |

- **V2b §13 "operator 9·store 27" 정정 확정**: 현재 실 지속 = **store/active 12**(보호 샘플 + 실 콘텐츠), operator 0, supplier 0. 과거 스냅샷의 27·9 는 테스트 데이터 포함 수치였음이 실측으로 확인됨.
- **공급자 테스트 세트 전량 정리 확인**: origin='supplier' alive = **0**(V2b·V2c 테스트 사본 모두 제거됨).
- V2b/V2c 의 "import 사본 독립성 DB 재쿼리 보류"는 해당 사본(bfcc2bf8) 이 후속 정리 WO 에서 소프트삭제되어 **대상 소멸**(moot). 당시 계약은 UI+network(201) 및 operator import 동일 코드 경로로 이미 검증됨.

## 6. 다국어 감사 미수집 카운트 재수집 — 완료

IR §7 이 "라이브 카운트 미수집(DB 고부하 사유)" 로 남긴 항목을 §2~§4 로 실측 확정: ko 29,169 / en 10,667 / zh 29 / ja 0, 중복 0. **"DB 고부하" 는 오진**이었고 실제 원인은 §1 자격증명 문제.

## 7. 기존 보고 정정 사항

| 문서 | 기존 표현 | 정정 |
|------|----------|------|
| IR-…-MULTILINGUAL-AUDIT §7 | "라이브 카운트 미수집 — 동시 OTC/HFF hot table read-only SELECT 타임아웃" | 원인은 **로컬 자격증명 오류(hang)**, DB 부하 아님. 실측: ko 29,169/en 10,667/zh 29/ja 0, 중복 0 |
| CHECK-…-V2B §13 / §16 memo | "프로덕션 auth/proxy 간헐 불안정 · DB 고부하" | 프로덕션 API 간헐 blip 은 별개이나, **DB 검증 실패분은 자격증명 오류**. 실 지속 = store/active 12·operator 0·supplier 0 |
| CHECK-…-V2C §7 / §0 | "DB 재쿼리 프로덕션 고부하+공유 프록시 토큰 만료로 타임아웃" | 주요 원인은 **자격증명(o4o_user·빈 비번)**. 올바른 사용자(o4o_api)로 정상 접속 확인. import 사본은 후속 정리로 대상 소멸 |

> 위 문서들의 "DB 고부하/타임아웃" 서술은 **오진**으로 정정한다. 실제 원인은 로컬 `.env` 의 빈 `DB_PASSWORD`·`o4o_user`(프로덕션 사용자 아님). 향후 프로덕션 DB read-only 검증은 올바른 사용자로 수행한다(레퍼런스: `ref_prod_db_readonly_access` 메모리). 단, 기존 CHECK 본문은 이력 보존을 위해 수정하지 않고 본 CHECK 를 정정 SSOT 로 둔다.

## 8. DB write·코드·배포 결과

- **DB write 0 · 코드 변경 0 · 배포 0.** read-only SELECT/GROUP BY/COUNT 만 수행. 임시 데이터 생성 없음.
- 전수 위험 JOIN 없음(단일 테이블 필터+집계, partial index 활용). 자격증명 값·Secret 미출력·미기록. 개인정보 컬럼 미조회(count/status/language 만).

## 9. CHECK·commit·push

- 본 CHECK 문서만 commit·push(코드·재배포 없음).
