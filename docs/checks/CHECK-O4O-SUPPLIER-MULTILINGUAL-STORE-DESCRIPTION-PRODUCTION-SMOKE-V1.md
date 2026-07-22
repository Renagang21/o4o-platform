# CHECK-O4O-SUPPLIER-MULTILINGUAL-STORE-DESCRIPTION-PRODUCTION-SMOKE-V1

> WO: `WO-O4O-SUPPLIER-MULTILINGUAL-STORE-DESCRIPTION-PRODUCTION-SMOKE-V1`
> 선행: `CHECK-O4O-SUPPLIER-STORE-DESCRIPTION-LANGUAGE-EDITOR-V1`(언어 편집기 구현·브라우저 smoke 보류)
> 성격: 공급자 언어별 STORE 설명서 저장·재조회·검수 프로덕션 smoke. read-only 조사 + 실행 판정.
> Date: 2026-07-22 · DB write 0 · 코드 0 · 배포 0.

---

## 0. 결론 — ⛔ 중지(STOP), 테스트 데이터 미생성

WO 의 중지 조건 **"임시 연결과 생성 데이터를 완전히 원복할 수 없는 경우"** 및 **"공식 UI/API가 아닌 직접 DB write가 필요한 경우"** 에 정확히 해당하여, **테스트 데이터·임시 연결을 생성하지 않고 중지**한다. read-only 조사로 원인·재현 조건을 확정했고, 언블록용 수정 WO 를 §7 에 제시한다. **테스트 데이터 순증 0.**

## 1. 사용한 테스트 대상 — 없음(생성 시 원복 불가 확정 → 미생성)

- 가용 공급자 계정 2개: renagang21@gmail.com(supplier `91169739…`, **ACTIVE**), sohae21@naver.com(`251adaaf…`, **PENDING**·미활성).
- **renagang21 공급자의 현재 `supplier_product_offers` = 0건**(read-only 확인) → 편집기 드로어(공급자 등록 상품에서만 진입)를 열 수 있는 **기존 상품이 없음**. smoke 를 하려면 테스트 오퍼를 **신규 생성**해야 한다.
- (참고) renagang21 공급자에게 **과거 삭제된 오퍼의 STORE 설명서 10건이 orphan `hidden` 상태로 잔존**(전부 ko, 5개 master) — "오퍼는 지워도 설명서는 남는다"는 §6 패턴의 실제 증거.

## 2~5. ko/en 저장·재조회 / 독립성 / zh·ja / 검수 큐 — 미수행(중지)

- 실브라우저 저장·재조회·언어 독립성·검수 큐 언어 구분은 **테스트 데이터 생성이 전제**이며, 그 데이터를 공식 경로로 원복할 수 없어 **미수행**.
- 다만 편집기의 **클라이언트 동작**(언어 탭 ko/en/zh/ja·전환 시 미저장 보호·언어별 초안 로드·자동복사 없음)은 선행 WO(`…-LANGUAGE-EDITOR-V1`)에서 typecheck·vite build·코드 리뷰로 검증됨. 이번에 미검증인 것은 **프로덕션 저장·재조회·검수의 실데이터 왕복**뿐이다.

## 6. 원복 불가의 구조적 원인 (read-only 확정)

공식 공급자 UI/API 만으로 "테스트 상품 1건 등록 → STORE 설명서 ko/en 저장 → 전부 삭제 원복"이 **불가능**하다. 생성물별 삭제 경로:

| 생성물 | 생성 시점 | 공식 공급자 삭제 경로 | 원복 |
|------|----------|----------------------|:---:|
| `supplier_product_offers`(offer) | 상품 등록 | `DELETE /supplier/products/bulk`(hard delete, offer만) | ✅ |
| `product_masters`(barcode 없이 등록 시 신규) | 상품 등록 | **없음**(공급자용 master 삭제 부재) | ❌ |
| STORE 설명서 draft/needs_review(ko/en) | 설명서 저장 | **없음** | ❌ |

**핵심 병목 2가지 — 모두 STORE 설명서 draft 에 귀결**:
1. **공급자용 STORE 설명서 삭제/철회(withdraw) 공식 엔드포인트 부재**. 컨트롤러 `supplier-store-description.controller.ts` 는 **GET(listMine)·POST(save) 2개뿐**, DELETE/PATCH 없음. 서비스 `shared-product-description.service.ts` 에 `softDelete`·`setStatus` 가 있으나 **공급자 경로에 배선(wire) 안 됨**. 프론트 `supplierStoreDescriptionApi` 도 listMine/save 2개뿐.
2. **offer 삭제가 설명서로 cascade 안 됨**. `SharedProductDescription` 은 `master_id` 에 `onDelete: CASCADE`(ProductMaster 삭제 시에만 발동). offer 삭제(`bulkDeleteOffers`)는 **offer 만 hard delete·master 존치** → 설명서 미정리. offer↔설명서 FK 없음(source_ref_id 참조 정보만).
3. **자동삭제 미적용**: `expireRevisionRequested` 는 `status='revision_requested' AND revision_due_at < now()` 에만 작동. **draft·needs_review 는 대상 아님** → 방치 시 영구 잔존(재저장 시 revision 필드 초기화로 더 빠짐).

우회로는 모두 공식 공급자 UI/API 밖: 운영자 reject(→hidden, 행 존치)·직접 DB 삭제·master 삭제(cascade). 즉 **직접 DB write 없이는 원복 불가** → WO 중지 조건.

## 7. 발견된 결함/gap과 후속 필요 — 수정 WO 제시

이는 편집기 결함이 아니라 **공급자 STORE 설명서 수명주기의 gap**: 공급자가 **자기 draft/needs_review 설명서를 취소·삭제할 공식 수단이 없다**(운영자 reject 전까지 잔존, 잘못 만든 초안도 제거 불가). 이는 (a) 원복 가능한 테스트를 막고, (b) 실사용 UX 결함이기도 하다.

> **제안: WO-O4O-SUPPLIER-STORE-DESCRIPTION-WITHDRAW-V1** — 공급자가 자기 소유 STORE 설명서 작업행(status ∈ {draft, needs_review, revision_requested}, canonical 제외)을 **철회/삭제**하는 공식 엔드포인트를 배선. 서비스 `softDelete`/`setStatus` 재사용, 소유권=`created_by_supplier_id`, canonical/hidden 은 대상 제외. 프론트 편집기에 '철회' 액션 추가. 이 WO 완료 후 본 smoke(작업 1)를 **원복 가능 상태로 재개**할 수 있다.

**대안(사용자 판단)**: 본 smoke 를 진행하되, 종료 시 생성한 테스트 행(offer·필요 시 신규 master·STORE draft)을 **사용자 승인 하 targeted DB soft-delete/DELETE 로 정리**(Part 1 정리와 동일 방식). 단 이는 WO 가 명시적으로 배제한 "직접 DB write" 경로이므로, 진행 여부는 사용자 결정에 맡긴다.

## 8. 코드·DB·배포 변경

- **DB write 0 · 코드 0 · 배포 0 · 테스트 데이터·임시 연결 생성 0.** read-only 조사(SELECT + 코드 정적 분석)만 수행. 자격증명 값·개인정보·설명서 본문 미조회·미기록. 올바른 프로덕션 DB 사용자로 정상 접속.

## 9. CHECK·commit·push

- 본 CHECK 문서만 commit·push.
- **작업 2·3 은 작업 1 PASS 를 전제로 하므로 착수하지 않는다**(작업 1 은 STOP). 사용자 결정(수정 WO 우선 / DB 정리 승인 하 smoke 진행) 대기.
