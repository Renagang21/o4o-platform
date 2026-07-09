# CHECK-O4O-PRODUCT-RESOURCE-PUBLIC-ALIAS-V1-PREFLIGHT-HOLD

> 대상 WO: `WO-O4O-PRODUCT-RESOURCE-PUBLIC-ALIAS-V1` — **HOLD (착수 전 설계 확인 상태)**
> 작성일: 2026-07-09 · 성격: 착수 전 확인 메모. **코드 0 / route·page·API 수정 0 / DB write 0 / migration 0 / deploy 0 / 동시 세션 WIP 미접촉.**

---

## 1. 상태

- **HOLD (폐기 아님).** 핵심 목표(ProductMaster canonical Resource를 `/r/{resourceId}` 공개 alias로 노출, F12 step4)는 유지한다.
- **HOLD 사유**:
  1. **동시 세션 충돌** — 다른 세션이 ProductMaster 전역 QR / Resource / `/r/{id}` 영역을 진행 중(WIP: `docs/investigations/IR-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1.md`, `docs/work-orders/WO-O4O-PRODUCT-QR-CONTENT-FLOW-MINIMAL-V1.md`, `apps/api-server/src/scripts/productmaster-global-qr-dryrun.ts`). `/r/{id}`는 QR·Resource·ProductMaster·public landing이 모두 걸린 중심축이라 동시 구현 시 구조가 갈라질 위험이 크다.
  2. **Resource가 아직 1급 테이블이 아님** — `resourceId`가 무엇을 가리키는지 확정 전. 미확정 상태로 구현하면 `/r/{spdId}` · `/r/{masterId}` · `/r/{publicAlias}` · `/r/{resourceId}`가 섞인다.

## 2. 착수 전 확인 필요사항 (Preflight Checklist)

다른 세션 완료 후 아래를 받아야 착수한다.

```text
1. ProductMaster 전역 QR 트랙의 최종 결론
2. /r/{id}를 실제로 구현했는지 여부 (이미 만들었으면 이 WO는 검증/보강으로 축소)
3. resourceId가 무엇을 가리키는지 (아래 §3 매핑 결정)
4. SPD와 Resource의 관계 (SPD를 Resource로 해석하는지, 신규 Resource row인지)
5. canonical Resource가 실제 row인지, SPD를 Resource처럼 해석하는지
6. public route가 이미 생겼는지 (+ `/r/` 접두 충돌 여부 — 아래 §4)
7. QR landing(/qr/{slug}, 매장 계층2)과 /r landing(전역 계층1)의 경계
```

## 3. resourceId 매핑 후보 (핵심 미결 결정)

현재 As-Is: **Resource 1급 테이블 없음**. SPD(`shared_product_descriptions`)가 DESCRIPTION 전용·master-scope(`source_type`=provenance, `status`, `description_type`, canonical per (master, description_type)). 근거: [IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1](../architecture/IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1.md), [IR-O4O-PRODUCT-CONTENT-TO-STORE-CONTENT-WORKFLOW-AUDIT-V1](../investigations/IR-O4O-PRODUCT-CONTENT-TO-STORE-CONTENT-WORKFLOW-AUDIT-V1.md).

| 후보 | resourceId = | 장점 | 단점 | F12 정합 |
|---|---|---|---|---|
| **A. SPD.id** | `shared_product_descriptions.id`(UUID) | 실제 canonical 콘텐츠 row를 직접 가리킴. SPD.master_id→master(단방향) = **F12 불변식⑥(Resource→ProductMaster 단방향) 부합** | SPD는 DESCRIPTION 전용 → Resource 일반화(POP/VIDEO) 시 재정의 필요. master당 여러 SPD(타입·언어) 중 어느 것? | △ (Description=Resource 잠정) |
| **B. master.id** | `product_masters.id`(UUID) | 상품당 1 landing 직관적, 언어탭 자연 | master.id를 Resource 정체로 씀 = **F12 불변식⑥ 위배 우려**(master가 Resource를 아는 형태로 읽힘). "대표 Resource" 개념과 충돌 | ✗ |
| **C. 별도 public alias** | 신규 alias(UUID) → target 매핑 | 내부 id 은닉·회전/폐기 가능, 계층1 전용 식별 | 신규 컬럼/테이블(migration) + backfill 필요 | ○ (但 신규 저장) |
| **D. 신규 Resource 1급 테이블** | `resources.id`(F12 full) | F12 목표(resourceType/descriptionType/OSMU) 완전 정합 | 대공사 + Resource 부재 177,297 문제 동반 | ◎ (목표형) |

**잠정 견해(결정 아님)**: F12 불변식⑥(Resource→ProductMaster 단방향, ProductMaster는 Resource를 모름)을 지키려면 **B(master.id)는 부적합**. 단기 최소 구현은 **A(SPD.id, canonical STORE description)**, 목표형은 **D(Resource 1급 테이블)**. **C(public alias)**는 내부 id 은닉이 필요할 때. → **동시 세션의 결론(§2-3,4,5)에 따라 A/C/D 중 확정**한다. 언어탭 소스(SPD language rows vs `store_multilingual_product_content_*`)도 함께 확정 필요(계층1은 전역이므로 store-scope 다국어와 경계 주의).

## 4. 추가 확인 (경로 충돌)

- `/r/` 접두가 이미 **파트너 추천 링크**(`apps/api-server/src/controllers/partner/partnerController.ts`)에서 사용될 가능성 확인됨(read-only grep). `/r/:resourceId` 신설 시 **기존 `/r/` 라우트와 충돌/우선순위** 점검 필요. (현재 `/r/:resourceId` public route는 **미존재** 확인.)

## 5. 재개 조건

다른 세션의 ProductMaster 전역 QR / Resource 작업 완료 → 위 §2 정보 확보 → `resourceId` 매핑(§3) 확정 → `WO-O4O-PRODUCT-RESOURCE-PUBLIC-ALIAS-V1`을 **구현형 WO로 재개**. `/r/{id}`가 이미 구현됐다면 이 WO는 검증·보강으로 축소.

## 6. 준수 (이번 세션)

```text
코드 구현 0 / public route·frontend page·API controller 수정 0
DB write 0 / migration 0 / deploy 0
동시 세션 WIP 파일 미접촉 (read-only grep만)
```
