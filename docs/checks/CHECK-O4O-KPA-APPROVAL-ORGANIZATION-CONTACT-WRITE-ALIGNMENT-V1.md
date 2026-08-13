# CHECK-O4O-KPA-APPROVAL-ORGANIZATION-CONTACT-WRITE-ALIGNMENT-V1

- **WO**: WO-O4O-KPA-APPROVAL-ORGANIZATION-CONTACT-WRITE-ALIGNMENT-V1
- **일자**: 2026-08-13
- **범위**: KPA 회원 승인·재활성화 시 `users.businessInfo` → `organizations` 주소·약국 전화 write 정렬
- **판정**: PASS
- **선행**: `CHECK-O4O-KPA-BUSINESSINFO-KEY-READ-ALIGNMENT-V1` (공통 resolver) ·
  `CHECK-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1` (D-3 · D-4)

---

## 1. 승인·재활성화별 기존 동기화 경로 (실측)

| 전이 | organization 동기화 | 위치 | transaction 경계 |
|---|---|---|---|
| pending → active (`activity_type='pharmacy_owner'`) | **있음** — `ensureOrganization(code=kpa-pharm-{bizno})` + 연락처 write | `member.controller.ts` PATCH `/:id/status` | **commit 이후 후처리**, 자체 try/catch 로 비차단 |
| pending → active (그 외 activity_type) | 없음 | — | — |
| suspended → active (재활성화) | **없음** — `organizations` 에 어떤 write 도 없다 | `MembershipApprovalService.reactivateMembership` (organizations 참조 0건) | — |
| rejected / suspended / withdrawn | 없음 | — | — |

- KPA 승인 경로 외에 `kpa-pharm-*` organization 을 만드는 코드는 `PATCH /:id/info` 의
  `activity_type → pharmacy_owner` 전환 블록뿐이다. 이 경로는 **연락처를 전혀 쓰지 않는다**
  (조직·소유자·role 만 생성). 승인·재활성화가 아니므로 이번 범위에서 제외했다 — §8 참조.
- `kpa_pharmacy_requests` 기반 승인 컨트롤러는 현재 저장소에 존재하지 않는다(은퇴).

## 2. source key → destination 컬럼 (실측)

| 축 | 기존 구현이 읽던 키 | destination | 문제 |
|---|---|---|---|
| 주소(기본) | `storeAddress.baseAddress` → `address` | `organizations.address` (기본+상세 결합 문자열) | ① `storeAddress` 우선이라 운영자가 고친 최신 `address` 가 밀림 ② `businessAddress` fallback 부재 |
| 주소(상세) | `storeAddress.detailAddress` → `address2` | 위 문자열에 결합 | `businessAddressDetail` fallback 부재 |
| 우편번호 | — | **없음** | 어디에도 기록되지 않음 |
| 구조화 주소 | `storeAddress` 원본 통째 | `organizations.address_detail` (jsonb) | `storeAddress` 없으면 미기록 |
| 약국 전화 | `metadata.pharmacy_phone` → **`phone`(대표 전화)** | `organizations.phone` | ① `pharmacyPhone`(공통 운영자 콘솔 키) 미인식 ② 대표 전화를 약국 전화로 승격 |

`organizations.address_detail` 은 `jsonb`(`20260318200000-AddStructuredAddress`)이며
shape 은 `{ zipCode, baseAddress, detailAddress }` (`store-organization.resolver.ts`) 이다.
`users.businessInfo` 의 `json` 문제(직전 WO)와 달리 여기서는 `||` 병합이 유효하다.

## 3. 신규 · 기존 organization 처리 방식

- **신규 초기화**: `ensureOrganization` 직후 전 컬럼이 비어 있으므로 resolver 값으로 채운다.
- **기존 보완**: 연락처 3축을 먼저 `SELECT` 해 **비어 있는 항목만** 채운다.
  `address_detail` 은 통째 교체가 아니라 **키 단위**(`zipCode` / `baseAddress` / `detailAddress`)로 보완한다.
- **덮어쓰기 없음**: 운영자가 매장 정보 화면에서 고친 값은 승인·재활성화만으로 되돌아가지 않는다.
  JS plan 과 SQL `COALESCE(NULLIF(...))` · `$new || COALESCE(existing)` 양쪽에서 이중으로 보장한다.
- **재활성화**: 기존과 동일하게 `organizations` 무변경 (테스트로 고정).

## 4. 적용한 resolver 와 보존 규칙

`apps/api-server/src/routes/kpa/shared/organizationContactSync.ts` (신규, 순수 함수)

- 키 선택은 직전 WO 의 `resolveKpaBusinessContact` 를 **그대로 재사용**한다.
  주소 `address` → `businessAddress` → `storeAddress.baseAddress`,
  상세 `address2` → `businessAddressDetail` → `storeAddress.detailAddress`,
  우편번호 `zipCode` → `storeAddress.zipCode`,
  약국 전화 `metadata.pharmacy_phone` → `pharmacyPhone`.
- 공백(`''` · 공백문자열)은 **값 부재**로 취급한다. 기존 컬럼이 공백이면 채우고,
  원천 값이 공백이면 쓰지 않는다.
- 채울 값이 없으면 `hasChanges=false` 로 **UPDATE 자체를 생략**한다 (임의 값·빈 문자열 write 없음).
- 대표 전화(`businessInfo.phone`) fallback 은 **제거**했다. 약국 전화와 의미가 다르다.
  결과적으로 대표 전화만 가진 회원은 `organizations.phone` 이 비어 있게 된다 — 의도된 변경이다.
- `business_number` · `metadata`(taxInvoiceEmail / ceoName / contactName / managerPhone) write 는
  기존 동작을 그대로 유지했다 (범위 밖).

## 5. transaction · 후처리 경계와 실패 주입

- 경계 변경 **없음**. 연락처 동기화는 승인 transaction commit **이후** 후처리이며 비차단이다.
- 실패 주입: 연락처 `UPDATE organizations` 를 강제 실패시켜도
  `txCommitted=1 / txRolledBack=0`, 500 응답 없음, 후속 `kpa_members.organization_id` 연결은 계속 진행.
- 필수 승인 write(`service_memberships` · `users` · profile · `kpa_members`)의 단일 transaction·rollback 계약은
  직전 WO 그대로이며 `member.controller.writeAtomicity.test.ts` · `MembershipApprovalService.txManagerInjection.test.ts`
  16 suite 전량 통과로 회귀 없음을 확인했다.

## 6. 테스트 · typecheck · read-only smoke

| 항목 | 결과 |
|---|---|
| 신규 단위 테스트 `organizationContactSync.test.ts` | 13 passed (WO 검증 1~8) |
| 신규 컨트롤러 테스트 `member.controller.orgContactSync.test.ts` | 8 passed (승인 초기화 · 보존 · 재활성화 무변경 · 실패 격리) |
| 영향 범위 (`routes/kpa` · `services/approval` · `controllers/operator` · `auth/controllers`) | **16 suites / 209 tests 전량 PASS** |
| `tsc --noEmit` (api-server, workspace 패키지 빌드 후) | **오류 0** |
| read-only 프로덕션 실측 | 수행 (아래) |

read-only 실측 (cloud-sql-proxy, SELECT/COUNT 만 · 개인정보 원문 미조회):

| 측정 | 값 |
|---|---|
| `kpa-pharm-*` organization | 6건 |
| ㄴ `address` 빈 값 | 2건 |
| ㄴ `phone` 빈 값 | 3건 |
| ㄴ `address_detail` NULL | 2건 |
| ㄴ `address_detail.zipCode` 빈 값 | 2건 |
| KPA 회원의 `businessInfo` 주소 키 — canonical `address` 보유 | 5건 |
| ㄴ legacy `businessAddress` 보유 | 5건 / **legacy 단독 0건** |
| ㄴ `storeAddress.baseAddress` 보유 | 5건 |
| 약국 전화 — canonical `metadata.pharmacy_phone` | 2건 |
| ㄴ legacy `pharmacyPhone` | 0건 / legacy 단독 0건 |
| ㄴ 대표 `phone` 보유 | 0건 |
| `kpa-pharm-*` 외 organization | 16건 (이번 변경 경로에서 접근하지 않음) |

해석: 현재 모집단에는 **legacy 단독 회원이 없어** 이번 정렬로 값이 바뀌는 기존 row 는 없다.
즉 이 변경은 **회귀 위험 없는 선제 정렬**이며, 실질 효과는 ① 우선순위 역전(운영자 수정값이 가입값에 밀림) 제거
② 지금까지 기록되지 않던 우편번호 채움 ③ 대표 전화의 약국 전화 오염 차단이다.

## 7. migration · backfill · 운영 API write · 배포

| 항목 | 여부 |
|---|---|
| migration | 없음 |
| backfill · 운영 데이터 일괄 변경 | 없음 |
| 운영 DB write | **0건** (SELECT/COUNT 전용) |
| 운영 API write smoke | 수행하지 않음 — read-only 실측으로 판정 가능했고, 불필요한 운영 데이터 변경을 피했다. 따라서 원복 대상 없음 · 순변화 0 |
| 배포 | 하지 않음 (CI/CD 소관) |
| 다른 서비스 organization 계약 | 변경 없음 (KPA 승인 경로 한정) |

## 8. B~E 가 반영해야 할 공통 commit · 후속 제안

- **공통 commit**: 이번 변경의 공통 기반은
  `apps/api-server/src/routes/kpa/shared/organizationContactSync.ts` 1개 파일이며,
  기존 공통 파일을 수정하지 않고 **신규 추가만** 했다. 따라서 B~E 작업과의 충돌면이 없어
  별도 커밋 분리 없이 단일 커밋으로 처리했다. B~E 는 이 파일의
  `planKpaOrganizationContactSync(businessInfo, existingOrgRow)` 계약을 그대로 소비하면 된다.
- **후속 제안(별도 WO)**: `PATCH /kpa/members/:id/info` 의 `activity_type → pharmacy_owner`
  전환 경로는 organization 을 새로 만들면서 주소·전화를 **전혀 채우지 않는다**.
  같은 helper 로 정렬 가능하나 승인·재활성화 범위 밖이라 이번에는 손대지 않았다.
- `organizations` 데이터 소유권 재설계 · 이중 entity 수렴은 예정대로 이번 범위 제외.

## 9. 변경 파일

**코드 4개(소스 2 · 테스트 2) · 문서 1개, 총 5개**


| 파일 | 구분 |
|---|---|
| `apps/api-server/src/routes/kpa/shared/organizationContactSync.ts` | 소스 (신규) |
| `apps/api-server/src/routes/kpa/controllers/member.controller.ts` | 소스 (수정) |
| `apps/api-server/src/routes/kpa/shared/__tests__/organizationContactSync.test.ts` | 테스트 (신규) |
| `apps/api-server/src/routes/kpa/controllers/__tests__/member.controller.orgContactSync.test.ts` | 테스트 (신규) |
| `docs/checks/CHECK-O4O-KPA-APPROVAL-ORGANIZATION-CONTACT-WRITE-ALIGNMENT-V1.md` | 문서 (신규) |

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (§8 `/:id/info` 경로)
