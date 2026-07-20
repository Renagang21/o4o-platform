# CHECK-O4O-SCREEN-SET-OWNER-SCOPE-SCHEMA-MIGRATION-V1

> WO: `WO-O4O-SCREEN-SET-OWNER-SCOPE-SCHEMA-MIGRATION-V1`
> 설계: `ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1`
> 성격: 스키마 migration — 확정된 소유권 모델(store/operator/supplier)을 DB·타입에 반영. 기존 매장 데이터·동작 불변.
> Date: 2026-07-20

---

## 0. 결론

`store_tablet_screen_sets` 에 소유권 모델을 반영: `organization_id` nullable 전환 + `supplier_id`(soft-ref) 추가 + `origin` 에 `supplier` 추가 + `CHK_stss_owner_scope`(주체별 유효 조합 강제) + operator/supplier 부분 인덱스. **backfill 0, 기존 22 store row 무변경**.

## 1. migration 내용 (실행 3)

`20270210000000-AddScreenSetOwnerScopeModel.ts`:
1. `ALTER COLUMN organization_id DROP NOT NULL` — 매장 전용 경계(F6). operator/supplier=NULL.
2. `ADD COLUMN supplier_id UUID`(nullable, **FK 없음 soft-ref** — `shared_product_descriptions.created_by_supplier_id` 관례. FK 삭제정책 충돌 회피).
3. `origin` CHECK → `('store','operator','supplier')`.
4. `CHK_stss_owner_scope` — 유효 조합:
   - store: `organization_id NOT NULL AND supplier_id NULL`
   - operator: `organization_id NULL AND supplier_id NULL AND service_key NOT NULL AND created_by_user_id NOT NULL`
   - supplier: `organization_id NULL AND supplier_id NOT NULL AND service_key NOT NULL`
5. 부분 인덱스(최소): `idx_stss_operator_scope (service_key,status) WHERE origin='operator' AND deleted_at IS NULL` · `idx_stss_supplier_scope (supplier_id,service_key,status) WHERE origin='supplier' AND deleted_at IS NULL`. (파티션 row 만 색인 → 미사용 speculative 인덱스 아님. 기존 store 조회는 `idx_stss_org_status` 유지.)
- `down()`: 인덱스·CHECK·supplier_id·origin CHECK 원복 후 org NOT NULL 복원(operator/supplier row 존재 시 실패 — 의도적).

## 2. Entity·origin 타입 변경 (실행 4)

- TypeORM 엔티티 없음(raw SQL) → **TS 타입 정합화**:
  - `services/web-kpa-society/src/api/tabletDisplays.ts` `ScreenSet`: `organizationId: string | null`, `origin: 'store'|'operator'|'supplier'`, **`supplierId: string | null` 추가**. (프론트 소비처 0 — `.organizationId` 직접 참조 없음, blast radius 0.)
  - backend `setCols`(store-tablet.routes.ts): `supplier_id AS "supplierId"` additive(store/operator row=null).
- **기존 store 생성 경로 불변**: `POST /screen-sets` INSERT 는 `origin='store'`·`organization_id=$storeOrg`·supplier_id 미지정(default NULL) → store 브랜치 자동 충족(코드 변경 없음).

## 3. 기존 데이터 사전·사후 비교 (실행 1·6)

- **사전**(프로덕션 실측): 22 row 전량 `origin='store' AND organization_id NOT NULL`. store-without-org 0, bad_origin 0, invalid 0.
- **사후**: §5 post-verify.

## 4. owner scope CHECK 검증 — dry-run (실행 5·7) ✅ 10/0 PASS

TEMP replica(세션 로컬, prod 무변경, ROLLBACK)에 target 제약 적용 + 실 store 22 row 적재:
- **[step6]** 기존 store 22 row 적재 시 CHECK 통과(사후 backfill 0 근거).
- **유효 3 accept**: store / operator / supplier.
- **무효 7 reject**: store w/o org · operator w/ org · operator w/o service_key · operator w/o created_by · supplier w/o supplier_id · supplier w/o service_key · **supplier w/ org(매장 org 사용 불가)**.
- 결과: **10 pass / 0 fail**. (operator w/ org·supplier w/ org = "operator·supplier 에 매장 organization 사용 불가" 검증.)

## 5. 프로덕션 migration 및 사후검증 (실행 8·9) — ✅ PASS (배포 e52aedba1, 2026-07-20)

- [x] CI/CD(main deploy "Deploy API Server") **success** → migration 자동 실행.
- [x] `organization_id` is_nullable=**YES**, `supplier_id` uuid nullable 존재, `CHK_store_tablet_screen_sets_origin` = `('store','operator','supplier')`, `CHK_stss_owner_scope` 정의 정확(store/operator/supplier 3-way), 인덱스 `idx_stss_operator_scope`·`idx_stss_supplier_scope` 존재.
- [x] 기존 store row **22건 불변**, 전량 `origin='store' AND organization_id NOT NULL AND supplier_id NULL`(valid_store=22). backfill 0.
- [x] 공개 타블렛 `GET /stores/{slug}/tablet/screen` → mode=screen_set·**content_list 5 카드**, Screen Set QR `GET /kpa/qr/public/tablet-corner-5` → landingType=screen_set·**content_list 5 카드**. **회귀 0**.
- [x] **prod 라이브 무효 조합 거부**: `INSERT origin='operator' + organization_id` → `check_violation`(CHK_stss_owner_scope) 거부. BEGIN/**ROLLBACK**(데이터 write 0).

## 6. 인덱스 (실행 6-표기)

operator/supplier 부분 인덱스 2개(위 §1-5). 기존 `idx_stss_org_status`·`idx_stss_tablet` 유지. 미사용 speculative 인덱스 미추가.

## 7. typecheck·테스트 (실행 8)

- web-kpa-society tsc `--noEmit`: **0**. api-server tsc(내 파일): **0**.
- 인접 회귀: `store-public-tablet-screen`·`store-tablet-idle-block`·`store-public-tablet-content-resolve` **23 PASS**.

## 8. 중지 조건 점검

| 조건 | 발생? |
|------|:-----:|
| 기존 데이터가 store 유효 조합 미충족 | ❌ (22/22 충족, dry-run step6) |
| canonical supplier 식별자 확정 불가 | ❌ (soft-ref UUID — created_by_supplier_id 관례, 앱 레이어 검증은 supplier WO) |
| supplier FK 삭제정책 충돌 | ❌ (**FK 없음** soft-ref) |
| Store API 가 NULL org row 노출 | ❌ (store 쿼리 `organization_id=$storeOrg` 등가비교 → NULL 자동 제외) |
| migration 이 backfill 요구 | ❌ (additive/relaxing, UPDATE 0) |

## 9. 변경 파일

```
apps/api-server/src/database/migrations/20270210000000-AddScreenSetOwnerScopeModel.ts  (신규 migration)
apps/api-server/src/routes/platform/store-tablet.routes.ts                             (setCols supplierId additive)
services/web-kpa-society/src/api/tabletDisplays.ts                                      (ScreenSet 타입: org nullable/origin supplier/supplierId)
```
- **데이터 write 0(backfill 0)**. 운영자/공급자 생성 API·HUB·복사 미구현(제외).
