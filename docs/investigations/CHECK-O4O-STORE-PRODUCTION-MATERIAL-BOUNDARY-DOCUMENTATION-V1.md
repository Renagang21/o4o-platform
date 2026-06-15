# CHECK-O4O-STORE-PRODUCTION-MATERIAL-BOUNDARY-DOCUMENTATION-V1

> **작업명:** WO-O4O-STORE-PRODUCTION-MATERIAL-BOUNDARY-DOCUMENTATION-V1
> **유형:** 문서 only — canonical 경계 문서를 코드 기준으로 보정. 코드/DB/route/UI **무변경**.
> **결과: PASS — `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1` 보강(v1.0→v1.1): store_library_items→store_execution_assets 표기 정정 + §2.4 execution_assets 이중역할 + §4.1 kpa_store_contents 컬럼 의미 + §8.7 통합 금지. 단일 문서만 변경(+39/-5).**
> 선행: `IR-O4O-STORE-PRODUCTION-MATERIAL-TABLE-CONSOLIDATION-AUDIT-V1`(B 문서 drift) — 2026-06-15

---

## 1. 배경

감사 IR 결론: 다중 테이블 경계 타당(통합 불필요·금지). 잔여 = canonical 문서 drift(B). 본 WO 는 **문서만** 코드 기준으로 보정.

## 2. 변경 (문서 1건)

`docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md` (v1.0 → v1.1):

| 위치 | 보정 |
|------|------|
| §2.3, §3 | INPUT 자료 테이블 표기 `store_library_items` → **`store_execution_assets`**(`source_type=uploaded`/`library`). 결과물 행도 `store_execution_assets(generated)`·blog·pop·qr 로 명시 |
| **§2.4 (신규)** | `store_execution_assets` **이중 역할** 명문화: `source_type` uploaded/library=INPUT(자료) · generated=OUTPUT(결과물). 구 `store_library_items` → rename(migration `20260421010000`). row 중복 아님(역할 구분). **잔존 stale entity `StoreLibraryItem` flag**(후속 코드 점검 후보) |
| **§4.1 (신규)** | `kpa_store_contents` 주요 컬럼 의미: `snapshot_id`(plain uuid·FK 아님·write-back 없음), `source_type`(snapshot_edit/direct), `content_json`(COALESCE 렌더), `source_metadata`/`author_role`/`visibility_scope`/`workspace_status`(Operator Workspace A 겸용) |
| **§8.7 (신규)** | INPUT/CORE/OUTPUT **통합 금지** + snapshot FK/cascade 금지. 감사 IR 근거 링크 |
| 관련 문서 · 버전 | 감사 IR 추가, Updated 2026-06-15 / v1.1 |

## 3. 검증

- **store_library_items 표기:** 잔존 3건 모두 "구 rename / 잔존 점검" 맥락으로 정정됨(현재 INPUT 테이블로 오표기 0).
- **execution_assets 이중역할(INPUT library + OUTPUT generated)** §2.4 명문화 ✅.
- **kpa_store_contents logical canonical + 컬럼 설명** §4.1 보강 ✅.
- **통합 금지·물리 rename 보류** §5/§6.2/§8.7 명확(§8.7 신규 + 기존 보존) ✅.
- **코드/DB/UI/route 변경 0** — canonical 문서 단일 파일만 변경(git diff --stat: +39/-5). 동시 세션 WIP(NetureSupplier.entity, CHECK-ORDER-VIEW) 미접촉.
- typecheck/빌드 무관(문서 only).

## 4. 완료 판정

**PASS.** canonical 문서가 현재 코드(store_execution_assets rename·이중역할·kpa_store_contents 컬럼·통합 금지)를 정확히 설명하도록 보정. 구조/코드 무변경.

## 5. 후속

1. `WO-O4O-STORE-LIBRARY-ITEM-ENTITY-RESIDUAL-CHECK-V1`(후보) — `StoreLibraryItem`(@Entity('store_library_items')) 가 rename 된 테이블 가리키는 stale entity 인지 코드 점검(connection.ts 등록·실사용 확인). **코드 영향 — 별도 WO.**
2. `WO-O4O-STORE-PRODUCTION-MATERIAL-LIST-QUERY-CLEANUP-V1`(선택, IR D) — ProductionMaterials 조회 공통화 + GP/KCos QR/direct 소스 완성.

---

*Date: 2026-06-15 · WO-O4O-STORE-PRODUCTION-MATERIAL-BOUNDARY-DOCUMENTATION-V1 · 문서 only PASS — canonical v1.1(store_execution_assets 정정·§2.4 이중역할·§4.1 컬럼·§8.7 통합금지). 코드/DB 무변경. StoreLibraryItem stale entity 후속 flag.*
