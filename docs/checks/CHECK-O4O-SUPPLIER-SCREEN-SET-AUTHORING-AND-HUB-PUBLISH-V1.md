# CHECK-O4O-SUPPLIER-SCREEN-SET-AUTHORING-AND-HUB-PUBLISH-V1 — ⛔ HOLD (중지 조건 발동)

> WO: `WO-O4O-SUPPLIER-SCREEN-SET-AUTHORING-AND-HUB-PUBLISH-V1`
> 성격: 공급자 Screen Set 제작 + 매장 HUB 제공.
> Date: 2026-07-21
> **상태: HOLD** — 실행 순서 1~3(메뉴 조사 · 후보 비교 · 소유권/제약 확인) 수행 후 **중지 조건 다수 발동**. 코드·DB write 0.

---

## 0. 결론

WO 가 지시한 대로 **구현 전 선행 조사**를 수행한 결과, 서로 독립적인 **중지 조건 3건 + 정책 충돌 1건**이 확인되었다. `supplier_template` 상태값을 임의로 추가하지 않고 중지한다(WO §2 명시).

| # | 중지 조건 | 근거 |
|---|-----------|------|
| 1 | **`supplier_template` 을 위해 스키마 변경 필요** | status CHECK 가 거부(실측·아래 §3) |
| 2 | **게시 대상 매장 유형을 기존 필드로 표현 불가** | screen set 14 컬럼 중 대상 유형/metadata 저장 필드 없음(§4) |
| 3 | **진행 중·확정된 공급자 설계와 충돌** | 공급자 Producer 메뉴가 의도적으로 제거됨 + ADR 이 "supplier 직접없음 / 착수 금지" 명시(§5) |
| ★ | **(정책) 공급자 직접 게시가 Canonical 3자 Flow 와 상충** | 확립된 흐름 = 공급자 → **운영자 검수** → 매장(§5) |

**소유권 계약 자체는 이미 수용된다**(§3) — 막힌 것은 상태값·게시 대상 저장·정책이다.

---

## 1. 조사한 공급자 메뉴·업무 동선 (실행 1)

- **호스팅**: `services/web-neture`, 라우트 `/supplier/*`, 레이아웃 `SupplierSpaceLayout.tsx:135`(등록 `App.tsx:776-819`). 별도 공간 주의: `/account/supplier/*`(계정형), `/workspace/supplier/*`→리다이렉트.
- **사이드바 정의**: `SupplierSpaceLayout.tsx:54-129` (`SUPPLIER_SIDEBAR_GROUPS`) — 11 그룹.

| 그룹 | 주요 항목(경로) |
|------|------|
| Overview | Dashboard `/supplier/dashboard` |
| **제품 관리** | 제품 목록/등록/대량 등록/등록 도우미 · 제품 콘텐츠 관리 `/supplier/b2b-content` · **매장용 설명서 `/supplier/store-descriptions`** |
| 공급 오퍼 | `/supplier/supply-offers` |
| 판매자 모집 / 유통참여형 펀딩 / 이벤트 오퍼 / 주문·배송 / Finance / 설정 / Community | (B2B·정산·커뮤니티 축) |

- **매장 제공 콘텐츠 진입점**: `매장용 설명서` 1건. 상태 머신 `draft/needs_review/revision_requested/canonical/hidden`, 정책 주석 = **"공급자는 직접 게시하지 않는다. 운영자 검수 후 canonical 로 매장에 노출된다."**
- **태블릿·디지털 콘텐츠 메뉴**: **0건**. `web-neture` 전체에서 `screen-set` 문자열 0건. 과거 존재하던 것은 전부 제거됨(`/supplier/signage/*` — `WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1`, `Content > Library` — `WO-O4O-SUPPLIER-CONTENT-PRODUCER-UI-CLEANUP-V1`).
- **권한·라우트**: 이중 가드 — `SupplierRoute`(`RoleGuard.tsx:188-198`, `requireMembership='neture'`) + 레이아웃 `SUPPLIER_ACCESS_ROLES` 검사(`:266-277`). 역할 `neture:supplier`(+legacy `supplier`).
- **serviceKey**: 공급자 페이지에서 2용도 — 가이드 조회 상수 `'neture'` / 상품 유통 축 `product.serviceKeys[]`(distribution API 단일 경로로만 변경).
- **모바일**: `<lg` 햄버거 + 오프캔버스 드로어(`:292-330`), `>=lg` 고정 사이드바. **`renderNav()` 단일 함수 재사용 → 배열에 항목 추가 시 데스크톱·모바일 자동 반영**(추가 작업 0).
- **공급자 소유권 키(정본)**: `neture_suppliers.id`(user 연결 `user_id`, 상태 `status`). 자식은 일관되게 `supplier_id`. 매장용 설명서 작성 주체는 `shared_product_descriptions.created_by_supplier_id`. → **자기 상품·콘텐츠 판별 키는 신뢰 가능**(이 항목은 중지 사유 아님).

## 2. 검토한 메뉴 위치 후보 (실행 2) — 분석만, 확정·구현 안 함

| 후보 | 장점 | 단점 | 판정 |
|------|------|------|------|
| **제품 관리 > `매장용 설명서` 바로 아래** | 동일 파이프라인·동일 활성화 게이트, IA 일관성 최고, 구현비용 최소(배열 1줄+라우트 1줄) | "설명서"와 개념 혼동 여지 | **조건부 1순위** |
| 신규 그룹 `매장 제공 콘텐츠`(설명서+Screen Set) | 목적이 가장 명확, 향후 확장 용이 | 그룹 11→12 증가, 2항목 collapsible 전환 | 2순위 |
| 콘텐츠 관리 하위 | — | **`Content > Library` 는 정책상 제거된 축** — 부활은 정책 역행 | ❌ |
| 독립 최상위 메뉴 | 발견성 높음 | 공급자 업무 구조 복잡화, 기존 IA WO 와 상충 | ❌ |
| 기존 메뉴 확장(설명서 탭 추가) | 신규 메뉴 0 | 설명서 상태머신과 Screen Set 계약이 달라 혼선 | 보류 |

> **확정하지 않는다.** WO 는 "적절한 위치를 확정한 후에만 UI 를 구현한다"고 규정했고, §5 정책 충돌이 해소되어야 위치 확정이 의미를 갖는다. 위 표는 후속 WO 입력용.

## 3. 소유권 계약·`supplier_template` 허용 여부 (실행 3) — ⛔ 중지 조건 1

프로덕션 실측(read-only + ROLLBACK probe, write 0):

```
CHK_store_tablet_screen_sets_status
  CHECK (status IN ('draft','active','archived','operator_template'))   ← supplier_template 없음
```
- **`INSERT origin='supplier', status='supplier_template'` → `check_violation` 거부** (실측 확인).
- **`INSERT origin='supplier', status='draft'` → 통과** — 즉 `CHK_stss_owner_scope` 의 supplier 분기
  (`origin='supplier' AND organization_id IS NULL AND supplier_id IS NOT NULL AND service_key IS NOT NULL`)는 **이미 소유권을 수용**한다.

→ 막힌 것은 **상태값 하나**뿐이나, 추가하려면 status CHECK 재정의 **migration** 이 필요하다.
WO 제외 항목("신규 migration·기존 데이터 백필") + 중지 조건("supplier_template 을 위해 스키마 변경이 필요함") **동시 위반** → 중지.
(선행 `ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1` §6 도 "supplier status 값 명칭은 supplier 구현 WO 에서 확정" 으로 **미결정 위임** 상태.)

## 4. 게시 대상 매장 유형 저장 (실행 7 전제) — ⛔ 중지 조건 2

`store_tablet_screen_sets` 컬럼 전체(14): `id · organization_id · service_key · tablet_id · name · origin · status · created_by_user_id · created_at · updated_at · deleted_at · template_key · public_qr_slug · supplier_id`
→ **게시 대상(약국/비약국/모두)을 담을 컬럼도 metadata/jsonb 도 없다.**

- 매장 **측** 유형 판별은 가능하다(`organizations.type` = pharmacy 6 / store 2 / supplier 6 / association 1 / division 1).
- 그러나 **원본에 "이 Screen Set 은 약국 전용" 을 기록할 자리가 없어** WO §5 의 게시 대상 선택·§4 의 의약품 약국 전용 가드를 **기존 필드로 표현할 수 없다**.
→ 중지 조건 "게시 대상 매장 유형을 기존 필드로 표현할 수 없음" 발동.
(의약품 자체 판별은 상품 분류로 가능성이 있으나, **게시 대상 저장이 불가**하므로 가드를 완성할 수 없다.)

## 5. 진행 중·확정 설계와의 충돌 (실행 1-8) — ⛔ 중지 조건 3 + ★ 정책 충돌

1. **공급자 Producer 메뉴는 의도적으로 제거된 축이다.**
   `SupplierSpaceLayout.tsx:118` — *"Content > Library 메뉴 제거. **공급자는 O4O 내부 Producer 가 아니다** — Canonical 흐름은 '공급자 → 오프라인 전달 → Operator 등록 → HUB' 이다"* (`WO-O4O-SUPPLIER-CONTENT-PRODUCER-UI-CLEANUP-V1`). `/supplier/signage/*` 도 제거(`WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1`).
2. **`ADR-O4O-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1`** — Role 표에 **`supplier 직접없음`** 명시, 완료 보고에 **"⑤공급자 미발동. H1·H2 확정 전 구현 착수 금지"**. 로드맵상 공급자 저작은 P4(운영자 저작) 이후로 **번호도 미부여**.
3. **`WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1`(Design Phase)** — `neture_suppliers` business 필드를 `organizations` SSOT 로 이관하고 supplier 를 Neture 전용 extension 으로 축소하는 계획. supplier 식별자를 새로 참조하는 기능은 **정합성 확인 필요**(Freeze 예외 승인 대상).
4. **★ Canonical 3자 Flow 상충** — 기존 매장용 설명서 파이프라인은 **"공급자는 직접 게시하지 않는다 → 운영자 검수 → canonical"**. 본 WO 의 "공급자가 대상 매장 HUB 에 직접 제공"은 **운영자 검수 단계를 우회**한다. CLAUDE.md 우선순위 2·3(`O4O-BUSINESS-PHILOSOPHY-V1` §4 / `O4O-3-ROLE-FLOW-BASELINE-V1` §2·§6 Drift 금지)에 저촉될 소지가 있어 **기술 판단만으로 진행할 수 없다**.

→ 메뉴 중지 조건("메뉴 구조가 별도 진행 중인 공급자 UI 개편과 충돌함") + 추가 중지 조건("진행 중인 공급자 UI 개편과 파일·메뉴 구조가 충돌함") 발동.

## 6. 중지 조건 점검표

| 조건 | 발생? | 근거 |
|------|:-----:|------|
| supplier_template 위해 스키마 변경 필요 | **✅ 발동** | §3 실측 |
| supplier 소유권을 기존 제약이 수용 못함 | ❌ | §3 — supplier 분기 통과 |
| 자기 상품·콘텐츠 소유권 키 없음 | ❌ | §1 — `neture_suppliers.id` 정본 |
| **게시 대상 매장 유형 표현 불가** | **✅ 발동** | §4 |
| 의약품 약국 전용 판별 불가 | ⚠️ 부분 | 상품 분류로 가능성 있으나 §4 로 가드 완성 불가 |
| 기존 HUB·독립 복사 재사용 불가 | ❌ | 운영자 경로에서 검증된 구조 재사용 가능 |
| 다른 공급자 콘텐츠 노출 | 미검증 | 구현 전 중지 |
| 미리보기에 공급자 QR 필요 | ❌ | 운영자 방식(인증 화면+draft preview) 재사용 가능 |
| **진행 중 공급자 UI 개편과 충돌** | **✅ 발동** | §5 |

## 7. 후속 진행에 필요한 결정(별도 설계 WO 권장)

1. **정책 확정(선행·최상위)**: 공급자가 매장 HUB 에 **직접** 게시할 수 있는가, 아니면 기존 매장용 설명서처럼 **운영자 검수 경유**인가. → `O4O-3-ROLE-FLOW-BASELINE-V1`·`O4O-BUSINESS-PHILOSOPHY-V1` 기준 판단 필요. `ADR-SCREEN-CONTENT-CORE` 의 "supplier 직접없음" 해제 여부 포함.
2. **스키마 확정**: supplier status 값 명칭(`supplier_template` 등) + status CHECK 확장 + **게시 대상 매장 유형 저장 방식**(신규 컬럼 vs 별도 대상 테이블) → 단일 migration WO.
3. **supplier_id 참조 정책**: `neture_suppliers.id` soft-ref 유지 vs `organizations(type='supplier')` — `WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1` 과 정합.
4. 위 1~3 확정 후에야 §2 메뉴 위치 확정 + UI 구현.

## 8. 조사 채널·안전

- 프로덕션 DB **read-only SELECT/카탈로그 + ROLLBACK probe** (write 0). 코드 변경 0 · 배포 0 · migration 0.
- 보호 샘플·기존 매장/운영자 Screen Set 무접촉.

---

## 완료 보고(HOLD)

1. **공급자 메뉴·동선**: `/supplier/*`(web-neture) 11 그룹, 매장 제공 진입점은 `매장용 설명서` 1건, **태블릿/Screen Set 메뉴 0건**(과거 것은 정책상 제거).
2. **메뉴 위치 후보**: 5개 비교, 조건부 1순위 = 제품 관리 > 매장용 설명서 아래. **정책 해소 전 확정·구현 보류.**
3. **소유권 계약**: `origin='supplier'+org NULL+supplier_id+service_key` 는 **이미 CHECK 통과**. 소유권은 문제 아님.
4. **중지 사유**: ①`supplier_template` status CHECK 거부(스키마 변경 필요) ②게시 대상 매장 유형 저장 필드 부재 ③진행 중 공급자 설계·메뉴 정책과 충돌 ★공급자 직접 게시가 Canonical 3자 Flow(운영자 검수)와 상충.
5. **산출물**: 본 CHECK 만(docs-only). 코드·DB·migration·백필 **0**.
