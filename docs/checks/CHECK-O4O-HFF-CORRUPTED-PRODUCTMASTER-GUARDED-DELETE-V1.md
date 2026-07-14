# CHECK-O4O-HFF-CORRUPTED-PRODUCTMASTER-GUARDED-DELETE-V1

WO: `WO-O4O-HFF-CORRUPTED-PRODUCTMASTER-GUARDED-DELETE-V1`
상태: **CLOSED / PASS** (2026-07-14)
commit: `43d85bbe9` (migration)
migration: `20270209000000-DeleteHffCorruptedProductMasters`
선행: `WO-O4O-HFF-BROKEN-REGULATORY-TYPE-NORMALIZE-V1` (정규화 후 삭제로 대체)

---

## 0. 결정

인코딩 손상(CP949→UTF8, U+FFFD 치환)되고 식약처 공식 원천으로 정체성 확정 불가한 HFF
ProductMaster 5건을, **운영 사용이 없음을 read-only 로 확인한 뒤 guarded delete**. 억지 복구 안 함.
직전 WO 의 regulatory_type 정규화 4건도 삭제로 대체(정규화 스냅샷은 별도 보존).

## 1. Read-only 전수 연결 조사 (20개 master-참조 테이블, 프로덕션)

| master | 정체 | SPD | landing | 그 외 전부 |
|---|---|:--:|:--:|:--:|
| 0b5502e5 | 맨파워포텐(photo 임시예제) | 0 | 0 | 0 |
| 38a9d3e4 | 변엔장 프로바이오틱스 | 8 | 1 | 0 |
| bcc5d466 | 쏘팔메토 | 4 | 0 | 0 |
| db20f469 | 홍삼스틱 | 4 | 0 | 0 |
| fb7d9684 | 애터미 비타민C | 4 | 0 | 0 |

- SPD 20건(B2B/STORE canonical + 38a9d3e4 만 candidate, ko+en) — **어느 매장도 미채택**(`store_product_description_selections=0`), QR·태블릿 연결 0.
- product_landing 1건(38a9d3e4): `metadata.source='admin-qr-view'` 프리뷰 아티팩트(content_config 비어있음), 이를 가리키는 store_qr_codes 0.
- listings/offers/store_products/cart/service_products/catalog/content_links/images/store_selections/store_profiles/tablet_interest/aliases/drug_ext/notes/identifiers = **전부 0**.
- 변엔장 정본 콘텐츠는 이미 repo `examples/byeonenjang.semantic.html` 보존. → HTML repo 추가 보존 불필요.

## 2. Guarded delete (마이그레이션)

- 가드 ①고정 5 UUID ②존재 대상 전부 name 에 U+FFFD 포함(손상 재확인) ③외부 운영 사용 14테이블 0. 위반 시 throw→롤백. present=0(타 환경/재실행) no-op.
- 전체 연결관계 jsonb 스냅샷(`product_master_hff_corrupted_delete_snapshots`, master+SPD+landing+identifier 전문 + pre_delete_counts) → SPD_audit_log → SPD → landing → master 순 삭제 → 사후검증(잔여 0).
- down() = 스냅샷 jsonb_populate_record 복원(best-effort).

## 3. 검증 (배포 후 프로덕션 read-only)

| 검증 | 기대 | 결과 |
|---|---|:--:|
| 5 master 삭제 | 0 잔여 | ✅ 0 |
| SPD 삭제 | 0 잔여 | ✅ 0 |
| landing 삭제 | 0 잔여 | ✅ 0 |
| 스냅샷 백업 | 5 master / 20 SPD / 1 landing | ✅ |
| HFF master 총량 | **30** (정상분 복귀) | ✅ 30 |
| 손상 regulatory_type 리터럴 | 소멸 | ✅ (분포: 건강기능식품30·일반15·GENERAL9) |
| HFF name 손상 | 0 | ✅ 0 |

- API 배포 성공(`Deploy API Server` run 29342248967). 마이그레이션 CI 자동 적용.

## 4. 신규 발견 (범위 밖, 정직 보고)

배포 후 검증에서 **name 손상 마스터 1건 추가 발견**(`corrupted_name_left=1`). 최초 스캔이 `regulatory_type` 손상 기준이라 **regulatory_type 정상·name 만 손상**된 마스터를 놓쳤음:

- `6f6f7be8-09b9-4962-be33-e8e1c56f204e` — regulatory_type=**GENERAL**(HFF 아님), name=`[E2E_TEST] Neture B2B …`(뒷부분 U+FFFD), created 2026-06-11.
- = **E2E 테스트 상품**(Neture supplier E2E 온보딩 seed 픽스처). 메모리상 "KPA 약국 공유 계정이라 삭제 비권장" + test SPO/cart 연결 가능.
- **이번 HFF WO 범위 밖** → 미처리. 별도 E2E 테스트 데이터 정리로 판단.
- **HFF 건강기능식품 30건은 name 손상 0 = 완전 clean.**

## 5. 후속

1. (선택) E2E 테스트 마스터 `6f6f7be8` 정리 — E2E 픽스처 삭제/비활성화 정책과 함께 별도 결정.
2. 등록 경로 인코딩 버그(바코드리스 admin 등록 CP949 손상) 조사 — 재발 확인 시.
3. **HFF 제작 준비 완료 종합 CHECK** — 모수 clean(30) 확정으로 작성 가능.
4. 본작업 Batch 0(구형 photo ko+zh 15건 semantic ko+en) — 삭제된 맨파워포텐/변엔장 등 제외.

## 6. 트랙 순서 현재 위치

```
1. 깨진 HFF 리터럴 5건 정규화          ✅ (→ 삭제로 대체)
1-b. 손상 master guarded delete       ✅ 본 WO (HFF 30 clean)
2. 정규화/정리 후 DB 실건수 재확인      ✅ (HFF 30)
3. 제작 준비 완료 종합 CHECK          ← 다음
4. 본작업 Batch 0 (구형 photo 15건)
5. 41,261 후보 중 시판 확인 제품 master 생성·설명서 제작
```
