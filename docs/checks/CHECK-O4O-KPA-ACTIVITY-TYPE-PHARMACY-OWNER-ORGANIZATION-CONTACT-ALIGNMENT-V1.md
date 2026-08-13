# CHECK-O4O-KPA-ACTIVITY-TYPE-PHARMACY-OWNER-ORGANIZATION-CONTACT-ALIGNMENT-V1

- **WO**: WO-O4O-KPA-ACTIVITY-TYPE-PHARMACY-OWNER-ORGANIZATION-CONTACT-ALIGNMENT-V1
- **일자**: 2026-08-13
- **선행**: `192086556` (WO-O4O-KPA-APPROVAL-ORGANIZATION-CONTACT-WRITE-ALIGNMENT-V1) · `695b96cdb` (BUSINESSINFO-KEY-READ-ALIGNMENT)
- **판정**: PASS

---

## 1. 문제 확정

KPA 에서 `organizations` 를 만드는 경로는 두 개다.

| 경로 | 진입 | 직전 상태 |
|---|---|---|
| A 승인 | `PATCH /kpa/members/:id/status` (pending → active) | `192086556` 로 주소·약국 전화 초기화 정렬 완료 |
| B 활동유형 전환 | `PATCH /kpa/members/:id/info` (`activity_type` → `pharmacy_owner`) | **연락처 write 전무** |

경로 B 는 `organizationOpsService.ensureOrganization()` → `kpa_members.organization_id` 연결 →
`addMember(role:'owner')` → `assignRole('kpa:store_owner')` 만 수행하고
`address` · `address_detail` · `phone` 에 아무것도 쓰지 않았다.
같은 약국이 어느 경로로 organization 을 얻었는지에 따라 연락처 유무가 갈렸다.

`member.controller.ts:1435` (경로 B) 와 `:763` (경로 A) 이 동일한 `kpa-pharm-{사업자번호}` org code 를
쓰므로, 두 경로는 같은 organization 을 만들면서 다른 계약을 갖고 있었다.

---

## 2. 수정 내용

`apps/api-server/src/routes/kpa/controllers/member.controller.ts` — 경로 B 의
`assignRole('kpa:store_owner')` 직후에 경로 A 와 동일한 연락처 초기화를 추가했다.

```
SELECT address, address_detail, phone FROM organizations WHERE id = $1 LIMIT 1
→ planKpaOrganizationContactSync(prevBiz, orgRow ?? null)
→ hasChanges 일 때만
  UPDATE organizations SET
    address        = COALESCE(NULLIF(address, ''), $1),
    address_detail = $2::jsonb || COALESCE(address_detail, '{}'::jsonb),
    phone          = COALESCE(NULLIF(phone, ''), $3)
  WHERE id = $4
```

- 계약 판단은 선행 WO 의 순수 함수 `planKpaOrganizationContactSync` 를 **그대로 재사용**한다.
  이 WO 는 공통 모듈(`shared/organizationContactSync.ts` · `shared/businessInfoRead.ts`)을 **수정하지 않았다.**
- 소스 객체는 `prevBiz` 다. 이름과 달리 이 시점의 `prevBiz` 는 같은 요청의
  `businessInfo` patch 가 반영된 **갱신 후** 값이다(`member.controller.ts:1356`).
  따라서 이번 요청에서 운영자가 입력한 주소·약국 전화가 그대로 초기화에 쓰인다.
- 연락처 동기화는 권한 부여와 **분리된 try/catch** 안에 둔다.
  기존 바깥 catch 는 실패 시 `changes._store_owner_activation = 'error'` 와 경고를 남기는데,
  연락처 동기화 실패가 권한 부여 결과 표기를 바꾸면 기존 후처리 계약이 달라진다. 이를 막는다.

---

## 3. 계약 준수 확인

| 원칙 | 확인 |
|---|---|
| 신규 organization 은 resolver 결과로 초기화 | canonical / legacy / `storeAddress` fallback 모두 반영 |
| 기존 organization 의 유효한 값 비덮어쓰기 | plan 에서 null + SQL `COALESCE(NULLIF(...))` 이중 방어 |
| 대표 전화와 약국 전용 전화 미결합 | `businessInfo.phone` fallback 없음 (plan 계약) |
| 권한·응답·transaction·후처리 계약 불변 | `_store_owner_activated` · warnings · 응답 shape · tx 경계 무변경 |
| 다른 activity type · 다른 서비스 무영향 | 전이 조건(`activity_type==='pharmacy_owner' && prev!==`) 안에서만 실행 |
| migration · backfill · 운영 DB write · 배포 없음 | 코드/테스트/문서만 변경 |

---

## 4. 검증

`apps/api-server` 기준.

| 항목 | 결과 |
|---|---|
| `npx jest src/routes/kpa` | **8 suites / 101 tests PASS** |
| 신규 `member.controller.infoOrgContactSync.test.ts` | 15 tests PASS |
| `npx tsc --noEmit` | 오류 0 |

신규 테스트가 고정한 것:

- 신규 org — canonical 우선(주소·우편번호·약국 전화), legacy 전용, canonical 공백 → legacy fallback,
  **같은 요청에서 입력한 주소·전화 반영**, 쓸 값 없으면 UPDATE 생략, 대표 전화만 있으면 약국 전화 미생성,
  병합 SQL shape 유지
- 기존 org — 유효 값 비덮어쓰기, **중첩 키 보존**(기존 `baseAddress` 유지 · 빈 `zipCode` 만 보완),
  기존 공백은 부재로 보고 보완
- 무변경 — 이미 `pharmacy_owner` 인 회원 수정 · 다른 activity type 전환은 `organizations` write 0
- 직전 회귀 — 사업자번호 부재 시 org 생성도 연락처 write 도 하지 않고 경고만 남긴다
- 실패 격리 — 연락처 UPDATE 실패 / SELECT 실패 모두 tx commit 1 · rollback 0 · 500 아님 ·
  `kpa:store_owner` 부여 정상 · 경고 미발생

운영 DB write · smoke · 배포는 WO 제외 범위이므로 수행하지 않았다. 개인정보는 조회·기록하지 않았다.

---

## 5. 변경 파일

**코드 2개(소스 1 · 테스트 1) · 문서 1개, 총 3개**

| 파일 | 구분 |
|---|---|
| `apps/api-server/src/routes/kpa/controllers/member.controller.ts` | 수정 |
| `apps/api-server/src/routes/kpa/controllers/__tests__/member.controller.infoOrgContactSync.test.ts` | 신규 |
| `docs/checks/CHECK-O4O-KPA-ACTIVITY-TYPE-PHARMACY-OWNER-ORGANIZATION-CONTACT-ALIGNMENT-V1.md` | 신규 |

공통 모듈 변경 없음 — B~E 에이전트가 미리 반영할 것은 없다.

---

## 6. 남은 것

- KPA 밖의 organization 생성 경로(다른 서비스 · pharmacy-hub)는 이 WO 범위가 아니다. 미조사.
- `organizations` 데이터 소유권 재설계 · 이중 entity 수렴은 여전히 별도 WO 대상이다.

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
