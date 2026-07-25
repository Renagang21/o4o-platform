# CHECK-O4O-PARTNER-APPLICATION-ORGANIZATION-OWNERSHIP-PERSISTENCE-AUDIT-V1

> WO: `WO-O4O-PARTNER-APPLICATION-ORGANIZATION-OWNERSHIP-PERSISTENCE-AUDIT-V1`
> 성격: **조사·설계 감사**. 판매자 모집 신청의 매장 조직 소유권 영속화 필요·방법 확정.
> Date: 2026-07-24 · **코드 변경 0 · migration 0**(중지 조건 발동 → 설계 보고로 종료)

## 0. 결론 — ⛔ 중지 조건 발동 → 구현 보류, 설계·권장 보고

`neture_partner_applications`는 `partner_id`(신청자 userId)만 저장하고 organization을 영속화하지 않는다.
데이터 0건이라 additive nullable 컬럼 추가 자체는 기술적으로 안전하나, **중지 조건 "다중 조직 사용자의
신청 주체 정책이 확정되지 않은 경우"가 실제로 발동**한다(store_owner ↔ org 구조적 1:N + 플랫폼에 "활성 매장"
개념 부재). 정책 미확정 상태로 create 시점 org를 임의 `LIMIT 1`로 영속화하면 **불변 오귀속**이 되어 현재의
가변 파생보다 위험하다. 따라서 **구현하지 않고 조사 결과·권장 설계·정책 결정 필요사항을 보고**한다.

## 1. 현재 사용자 단위 구조의 실제 위험

- **create 시점 org 미포착**: `createPartnerApplication`(partner-contract.service.ts:642-681)은 recruitmentId +
  partnerId(userId) + partnerName + status=PENDING 만 insert. organization 무접촉.
- **read 시점 org 임의 파생**: 공급자 목록 `getRecruitmentApplications`(:484-490)이
  `organization_members ... LEFT JOIN organizations ... WHERE user_id=a.partner_id AND left_at IS NULL LIMIT 1`
  — **ORDER BY 없음** = 임의 행. 표시용 `organization_name` 뿐(영속·write 미사용). (매장 mine 목록은 org 파생조차 안 함.)
- **approve 시점 org 임의 파생 → write**: C-bridge `bridgeRecruitmentToOrderable`(:859-873)이
  `SELECT organization_id FROM organization_members WHERE user_id=$1 AND left_at IS NULL LIMIT 1`(role 필터도 없음,
  ORDER BY 없음)로 뽑은 org를 `organization_product_listings.organization_id`로 사용.
- **실 버그(determinism)**: `terminateParticipation`(:374-385)이 **동일한 임의 LIMIT 1**으로 OPL을 비활성화.
  다중 조직 사용자면 approve와 terminate가 서로 다른 org를 뽑아 **approve가 만든 OPL이 terminate에서 비활성화되지
  않을 수 있음**. 이것이 org 영속화가 고칠 실제 결함.
- **계약 org 미저장**: `neture_seller_partner_contracts`(승인 시 생성)에 **org 컬럼 없음**
  (seller_id/partner_id/recruitment_id/application_id/commission/status만). 매장 관계는 partner_id(userId)로만 연결.

## 2. organization 영속화 필요 여부 — 필요(단, 정책 선행)

- 필요: ① C-bridge approve/terminate 불일치 버그 해소 ② 다중 매장 운영자·담당자 변경 시 올바른 매장 귀속
  ③ 계약 관계의 매장 귀속 명시.
- **선행 차단**: "어느 매장 조직이 신청 주체인가"를 확정할 플랫폼 정책·UI가 없음(§4).

## 3. 권장 컬럼·제약·백필

- **권장(정책 확정 후)**: `neture_partner_applications`에 **nullable `organization_id`** additive 추가 +
  `createPartnerApplication`에서 **create 시점** `isStoreOwner(ds, userId, serviceKey)`(canonical resolver,
  store-owner.utils.ts:73-101)로 org 확정 저장(현재 C-bridge의 role 필터 없는 bare LIMIT 1보다 표준화). 계약에도
  동일 org 전파(`neture_seller_partner_contracts.organization_id`). approve/terminate C-bridge가 파생 대신
  저장된 org 사용 → determinism 버그 해소.
- **제약**: 기존 `@Unique(recruitmentId, partnerId)`(사용자 단위 dedup) **유지**. org-based dedup
  (`UNIQUE(recruitmentId, organization_id)`)로 전환하려면 org가 **NOT NULL**이어야 유효(Postgres는 NULL 중복을
  unique로 못 막음) → nullable additive와 양립 불가. dedup 축 변경은 별도 결정.
- **백필**: **불필요** — applications/recruitments/contracts 전부 0행.

## 4. 기존 데이터 분류 결과

| 항목 | 건수 |
|---|---|
| neture_partner_applications | **0** (pending/approved/rejected/cancelled 전무) |
| neture_partner_recruitments | 0 |
| neture_seller_partner_contracts | 0 |
| org 재현 불가 orphan 신청 | 0 (신청 자체 0) |

- **자동 백필 대상 0**. 재귀속할 기존 데이터 없음(WO 원칙 위반 소지 0).
- **store_owner ↔ org cardinality(kpa:store_owner 실측)**: 1개 org **3명** / 2개 org **1명** / 3개 org **1명**
  → **다중 조직 사용자 2명 존재**. "활성/선택 매장" 개념 없음(모든 resolver unordered LIMIT 1).

## 5. 서비스별 영향

- `neture_partner_applications`/`createPartnerApplication`은 **KPA/GP/KCos/Neture 공용 단일 경로**
  (`POST /neture/partner/applications {recruitmentId}`, client는 org 미전달). 서비스별 생성 경로 없음.
- nullable `organization_id` 추가는 additive(기존 INSERT 생략 → NULL, read-path 미소비) → 4서비스 apply 흐름
  무변경. **단** create-time org 확정 로직은 serviceKey별 `isStoreOwner` 필요(공용 함수 존재).
- 별개 legacy `partner` 모듈(`PartnerApplication.ts`, `POST /api/v1/partner/applications`, KCos ApplyPage) —
  다른 파트너 프로그램 테이블, 이번 범위 무관·무영향.

## 6. 구현 결과 — 없음(중지 조건 발동)

- migration/typecheck/build/배포/smoke: **해당 없음**(코드 변경 0). 감사 문서만.

## 7. 중지 조건 판정

| 조건 | 발동? | 근거 |
|---|:---:|---|
| 기존 신청 org 안정 재현 불가 | N/A | 신청 0건 |
| 공용 스키마 변경이 타 서비스 신청 의미 변경 | ❌ | nullable additive는 4서비스 무변경 |
| **다중 조직 사용자 신청 주체 정책 미확정** | ✅ | store_owner 1:N(2·3-org 사용자 실재), 활성 매장 개념 부재, apply가 org 미전달 |
| unique 제약 변경 운영 데이터 충돌 | ❌(현재) | 0행이라 충돌 없음. 단 org-dedup은 NOT NULL 필요라 nullable과 양립 불가 |
| 동일 migration/entity 동시 작업 | ❌ | 미커밋 변경 없음 |

→ **정책 미확정(다중 조직 신청 주체)** 하나만으로 구현 보류가 정당.

## 8. 후속 apply / 정책 결정 필요사항

**후속 WO 착수 전 확정해야 할 제품 정책(플랫폼 미정)**:
1. **다중 매장 운영자의 신청 주체 매장 선택** — apply UI에 매장 선택 추가할지, 아니면 "활성 매장" 개념 도입할지.
   (현재 apply는 org 미전달, 플랫폼 전역이 임의 LIMIT 1.)
2. **dedup 축** — 사용자 단위(현행) 유지 vs 매장 조직 단위(다중 매장 운영자가 매장별로 각각 신청 가능).
3. 위 확정 후 → **apply-WO**: nullable `organization_id` additive(applications + contracts) + create-time
   `isStoreOwner` 저장 + C-bridge를 저장 org 소비로 전환(determinism 버그 fix) + (필요 시)dedup 축 변경.
   데이터 0건이라 백필 없이 즉시 안전.

**정책 1(매장 선택 UI/활성 매장)이 이 감사의 실질 병목**이다. 이는 스키마가 아니라 제품 결정이므로 별도 정의가 선행되어야 한다.
