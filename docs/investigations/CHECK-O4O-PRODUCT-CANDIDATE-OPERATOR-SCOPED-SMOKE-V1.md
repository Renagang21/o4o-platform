# CHECK-O4O-PRODUCT-CANDIDATE-OPERATOR-SCOPED-SMOKE-V1

> Phase 5(검토 UI) + Phase 6(활용 상품 연결) 의 operator-scoped 라이브 검증(보완 smoke).
>
> 대상 WO: `WO-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1`, `WO-O4O-PRODUCT-CANDIDATE-TO-STORE-PHARMACY-LISTING-V1`
> 작성일: 2026-06-06 · 환경: production (neture.co.kr / api.neture.co.kr)
> 계정: sohae2100 (로그인 성공)

---

## 1. Summary / 판정

**API end-to-end PASS** (가드·스코프·생성/보관 lifecycle 전수 검증). 상세 모달/활용연결 **UI 육안**은 계정 제약으로 갈음 처리(아래 §2).

사용자 결정: *"API end-to-end로 갈음 + OTC 착수"*. 본 문서로 보완 smoke 종료하고 OTC 분기(`WO-O4O-PRODUCT-TYPE-OTC-EXTENSION-REGISTRATION-POLICY-V1`)로 진행.

---

## 2. 계정/스코프 사실 (가정 아님, 토큰·동작 확인)

- **sohae2100 roles** (JWT): `platform:super_admin`, `neture:operator`, `neture:admin`, `kpa:admin/operator`, `glycopharm:admin/operator`, `cosmetics:admin/operator`, `kpa:store_owner`.
- `resolveOperatorScope` 는 `isPlatformAdmin` 을 우선 판정 → sohae2100 은 **platform admin 경로**를 탄다.

| 호출 | 결과 | 해석 |
|---|---|---|
| `GET /operator/product-candidates` (무scope) | **400** `PLATFORM_ADMIN_SCOPE_REQUIRED` | F6 Boundary Policy 설계대로 (platform admin 은 scope 명시 필수) |
| `GET …?serviceKey=neture` | **200** (service-scoped 경로) | 서비스 operator 가 보는 경로 정상 동작 |
| `GET …?all=true` | **200** (cross-service opt-in) | 정상 |

> **결론**: 페이지 list 는 scope param 을 보내지 않으므로 sohae2100(=platform admin)에서는 항상 400→빈목록. platform:super_admin 이 **없는** 순수 `neture:operator` 테스트 계정이 TEST-ACCOUNTS 에 없어, UI 행→상세모달 육안 흐름은 이 계정으로 구동 불가. (platform admin UX 보완은 사용자 결정으로 **미수행**.) [[project_sohae2100_platform_super_admin_smoke_gotcha]]

---

## 3. API end-to-end 검증 (production, authed)

### 3.1 lifecycle
| 동작 | 결과 |
|---|---|
| `POST /operator/product-candidates` (create) | ✅ 201, candidateStatus=pending, matchStatus=unmatched |
| `POST /:id/archive` | ✅ 200, candidateStatus=archived |
| `GET …?all=true&status=archived` | ✅ 200, total 반영 |

### 3.2 link-to-listing 가드 (데이터 미생성)
| 케이스 | 기대 | 결과 |
|---|---|---|
| matched master 없는 후보 link | 409 `CANDIDATE_NOT_MATCHED` | ✅ 409 |
| organizationId 누락 | 400 `ORGANIZATION_ID_REQUIRED` | ✅ 400 |
| archived 후보 link | 409 `CANDIDATE_NOT_LINKABLE` | ✅ 409 |

### 3.3 happy-path (profile+listing 생성 + 멱등) — 미실행(사유 명시)
- **neture ProductMaster=0, neture organization/store=0** (operator/products·operator/stores serviceKey=neture probe 결과 total 0). 현재 prod 는 **pre-service** 로 neture 커머스 데이터 없음.
- 연결할 실제 master 가 없고, 타 서비스의 **실제 약국 org 에 [SMOKE] 상품을 주입**하는 것은 부적절(실사용 매장 listing 오염)하여 **의도적으로 미실행**.
- happy-path INSERT 는 production-proven canonical 패턴(`store-product-library.controller.ts` master-only 등록: `INSERT … ON CONFLICT (organization_id, service_key, master_id) WHERE offer_id IS NULL DO NOTHING` + lookup, 이미 라이브)을 **그대로 재사용**. profile 은 `ON CONFLICT (organization_id, master_id) DO NOTHING`. → tsc 통과 + 가드 검증 + canonical 재사용으로 **갈음**.

---

## 4. UI 렌더 (sohae2100 로그인)

| 항목 | 결과 |
|---|---|
| 메뉴 `Products > 상품 후보 검토` | ✅ |
| 헤더 + GuideBlock(4단계) + 통계카드 + DataTable | ✅ |
| 필터 탭 (전체/대기/검토중/매칭됨/**활용연결**/반려/보관) + 매칭 select + 검색 | ✅ |
| empty state | ✅ "검토할 상품 후보가 없습니다" |
| 상세 모달 / "활용 상품으로 추가" 버튼 | ⏸ 미수행 (§2 계정 제약: list 400→빈목록, 행 클릭 불가) |

---

## 5. 정리 / 잔재

- 검증용 disposable 후보 생성분은 모두 **archive 처리** (active 큐 영향 없음). prod 데이터는 disposable(재시드 우선). [[project_pre_service_disposable_data]]
- happy-path listing/profile 행은 **생성하지 않음** (실제 org 오염 회피).

---

## 6. Follow-ups

| # | 항목 |
|---|---|
| F1 | 순수 `neture:operator`(platform:super_admin 미보유) 테스트 계정 확보 시 UI 행→상세모달→활용연결 육안 smoke |
| F2 | neture 커머스 데이터(org/master) 시드 후 happy-path link-to-listing 실측(멱등 포함) |
| F3 | (다음 본작업) `WO-O4O-PRODUCT-TYPE-OTC-EXTENSION-REGISTRATION-POLICY-V1` |

---

**작성:** O4O Platform Team · 2026-06-06
**상태:** 보완 smoke 완료(API end-to-end PASS / UI 모달·happy-path 는 계정·데이터 제약으로 갈음). 다음: OTC extension.
