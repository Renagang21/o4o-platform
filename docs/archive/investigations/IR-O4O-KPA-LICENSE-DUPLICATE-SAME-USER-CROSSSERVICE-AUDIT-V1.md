# IR-O4O-KPA-LICENSE-DUPLICATE-SAME-USER-CROSSSERVICE-AUDIT-V1

> **조사 보고서 (Investigation Report) — read-only / 코드·DB·UI·migration 변경 없음.**
>
> 같은 계정 (`renagang21@gmail.com`) + 같은 license (99991/99992) 가 GP 가입 완료 상태에서 KPA 가입 시 "이미 등록된 면허번호입니다." 차단되는 원인 분리 — cross-service 차단인지 / KPA 내부 중복인지 / 본인 cross-attempt 인지.

- **작성일:** 2026-05-30
- **선행:** IR-O4O-KPA-LICENSE-DUPLICATE-BLOCK-AUDIT-V1 (in-chat 보고) + WO-O4O-KPA-OPERATOR-MEMBER-SEARCH-LICENSE-SUPPORT-V1 (commit `063f59f02`)
- **수정 행위:** **없음** | **DB 변경:** **없음** (psql 미설치, 운영 DB 직접 SELECT 미수행)

---

## 1. 전체 판정 (10초 결론)

> **GP cross-service 차단 가능성 0** (구조적으로 불가능).
> **KPA 내부 데이터로 차단 확정** — 99991/99992 가 `kpa_members.license_number` 에 점유 중.
> **`/check-license` 가 user_id 무관 검사**이므로 본인이 본인 license 로 가입 시도해도 동일 차단 — 즉 같은 user_id (renagang21) 가 이전에 KPA 가입 시도해서 잔재로 남은 경우와 다른 user_id 가 점유한 경우를 **frontend onBlur 메시지로는 구분 불가**.
> **확정 판별 = DB SELECT 또는 운영자가 검색 (P1 WO 로 가능해짐) 1 회 필요.**

---

## 2. 조사한 파일

| 파일 | 라인 | 역할 |
|---|---:|---|
| [apps/api-server/src/routes/kpa/controllers/member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L73-L94) | 73-94 | `GET /check-license` endpoint (auth 불요, user_id 미수신) |
| [apps/api-server/src/routes/kpa/controllers/member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L122-L166) | 122-166 | `POST /apply` flow — user_id check (ALREADY_MEMBER) 우선 → license check (LICENSE_DUPLICATE) |
| [apps/api-server/src/modules/auth/controllers/auth-register.controller.ts](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L614-L735) | 614-735 | `createKpaRecords` — register 흐름에서 kpa_members INSERT (user_id ON CONFLICT DO NOTHING) |
| [apps/api-server/src/modules/auth/controllers/auth-register.controller.ts](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L550-L564) | 550-564 | 23505 UNIQUE violation catch — license_number / user_id / service_key 분기 |
| [apps/api-server/src/modules/auth/controllers/auth-register.controller.ts](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L574-L609) | 574-609 | `/auth/check-email` — multi-service 가입 UX (existing user → 다른 service 가입 허용) |
| [services/web-kpa-society/src/components/RegisterModal.tsx](services/web-kpa-society/src/components/RegisterModal.tsx#L198-L209) | 198-209 | onBlur 시 `/check-license` 호출 (user_id 미전달) |
| [services/web-kpa-society/src/components/RegisterModal.tsx](services/web-kpa-society/src/components/RegisterModal.tsx#L575) | 575 | onBlur 이벤트 |
| [apps/api-server/src/routes/glycopharm/services/glycopharm-member.service.ts](apps/api-server/src/routes/glycopharm/services/glycopharm-member.service.ts#L56-L60) | 56-60 | GP license 저장 = `glycopharm_members.metadata.licenseNumber` (JSONB) |

---

## 3. 핵심 질문 답변 (Q1-Q6)

### Q1. KPA 중복검사가 어떤 테이블을 보는가?

**`kpa_members` 단독.** `memberRepo.findOne({ where: { license_number: ... } })` — KpaMember repository. GP entity / 공통 user / profile 미참조.

### Q2. license 99991 / 99992 가 KPA 내부에 존재하는가?

✅ **존재** (production `/check-license` API 검증 — 둘 다 `available:false`).

### Q3. 같은 user_id 인가 다른 user_id 인가?

❓ **DB SELECT 또는 운영자 search 1회 필요** (이전 P1 WO 로 license 검색 가능해짐).

코드만으로 판별 불가 — 두 시나리오 모두 동일 메시지 발생:
- **본인 (renagang21) 의 이전 KPA 가입 잔재** (시나리오 A): `/check-license` 가 user_id 무관 검사 → 본인이 본인 license 시도해도 차단됨
- **다른 user_id 가 점유** (시나리오 B): 동일 차단

### Q4. cross-service 차단 구조인가?

❌ **아니다.** 구조적으로 불가능.

| 차원 | KPA | GP |
|---|---|---|
| license 저장 컬럼 | `kpa_members.license_number` (VARCHAR, Partial UNIQUE) | `glycopharm_members.metadata.licenseNumber` (JSONB, **UNIQUE 없음**) |
| 중복검사 코드 | ✅ `/check-license` + `POST /apply` 사전 + 23505 catch | ❌ 없음 |
| 검사 대상 service | KPA 단독 | (검사 자체 없음) |
| 공유 layer (`users.businessInfo` / `service_memberships`) | ❌ license 컬럼 없음 | 동일 |

→ GP 에 같은 license 가 있어도 **KPA 의 kpa_members 조회와 무관**. KPA 차단 원인은 **kpa_members 내부 데이터** 100%.

### Q5. 어떤 차단인가?

DB 결과에 따라 분기 — `/check-license` 의 메시지로는 구별 불가:

| 시나리오 | DB 상태 | 판정 |
|---|---|---|
| **A. 본인 cross-attempt 잔재** | `kpa_members.license_number='99991'` 의 user_id = renagang21 본인 + status 가 pending/withdrawn/rejected 등 hidden 상태 | **본인 재시도 차단** (UX 결함 — onBlur 가 user_id 무관 검사) |
| **B. 다른 user_id 점유** | `kpa_members.license_number='99991'` 의 user_id ≠ renagang21 | **정상 면허번호 중복 차단** (다른 사람이 같은 면허번호로 이미 가입) |
| **C. 신청 잔재 (kpa_applications)** | `kpa_applications` 에만 존재 | ❌ 기각 — `/check-license` 가 kpa_members 만 조회, applications 무관 |
| **D. 운영 테스트 데이터** | 운영자가 테스트로 99991/99992 가입 → 정리 안 됨 | **본질은 A 또는 B** (test user 든 실 user 든 user_id 비교가 핵심) |

### Q6. 운영자 검색 ↔ DB 결과 일치 여부

⚠️ **현재 (P1 배포 전): license_number 가 search OR parts 에 없음 → 운영자가 "99991" 검색해도 결과 0**.

✅ **P1 WO (`063f59f02`) 배포 후: license 검색 가능** → 운영자가 직접 99991/99992 의 점유자 + status 확인 가능.

---

## 4. 현재 중복검사 정책 정리

| 차원 | 현 정책 |
|---|---|
| 범위 | **KPA 내부 (kpa_members) 단독** — 다른 service 미참조 |
| Status | **상태 무관 절대 unique** ([member.controller.ts:155](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L155) comment 명시 "상태 무관 절대 유일") |
| Service | **서비스별 unique** — KPA, GP, K-Cos 각자 독립 (GP 는 UNIQUE 제약조차 없음) |
| user_id | **user_id 무관 unique** — `/check-license` 는 auth 불요, user_id 미수신 / `POST /apply` 는 user_id check 와 license check 분리 |
| 메시지 분리 | △ `ALREADY_MEMBER` (user_id 중복) ≠ `LICENSE_DUPLICATE` (license 중복) — backend 는 분리하나 frontend `/check-license` onBlur 는 user_id 검사 못 함 |

---

## 5. 시나리오 매트릭스 (사용자 directive A/B/C/D)

| 안 | 코드 검증 | 판정 |
|---|---|---|
| **A. 같은 user_id + GlycoPharm 에만 존재, KPA 미존재** | GP entity / 검사 분리 → KPA 차단 발생 불가능 | ❌ **기각** (구조적) |
| **B. 같은 user_id + KPA 에도 존재** | `POST /apply` 흐름이면 ALREADY_MEMBER 메시지가 우선 발생. 단 onBlur `/check-license` 는 user_id 무관 → 사용자가 본 메시지가 onBlur 의 "이미 등록된 면허번호" 라면 가능 | ⚪ **가능 — 본인 잔재 시나리오** |
| **C. 다른 user_id + 같은 license** | LICENSE_DUPLICATE 정상 동작. onBlur 도 동일 | ⚪ **가능 — 정상 중복 차단** |
| **D. kpa_applications 잔재** | `/check-license` 는 kpa_members 단독 조회. kpa_applications 무관 | ❌ **기각** |

**B vs C 의 결정적 차이** = `kpa_members` 의 99991 row 의 `user_id` 와 renagang21 의 user_id 비교. DB SELECT 1회로 확정.

---

## 6. 정책 후보 비교 (사용자 directive)

| 후보 | 의미 | 장점 | 단점 / 위험 |
|---|---|---|---|
| 1. 전역 unique (현재) | platform 전체 1면허 = 1회 | 약사 식별자 무결성 / 운영자 명확 | 본인 재가입 시도도 차단 (UX 결함) |
| 2. 사람 식별자 + 같은 user_id 예외 | 같은 user_id 의 cross-service 재사용 허용 | 본인 재시도 허용 + 약사 식별자 유지 | onBlur 시 user_id 전달 필요 (auth 추가) |
| 3. 서비스별 unique | KPA / GP 각자 독립 | 서비스 격리 강화 | 약사 한 명이 두 서비스에서 다른 라이센스 사용 가능 — 식별자 일관성 깨짐 |
| 4. KPA 내부 unique (현재 일부) | KPA 내에서만 unique | 가장 단순 | 후보 1 과 사실상 동일 (KPA 만 검사) |

→ **권장 = 후보 2** (사용자 directive 의 의도 일치). 단 본 IR 은 정책 결정만 도출, 실제 구현은 별건 WO.

---

## 7. 원인 분류

| 분류 | 판정 |
|---|:---:|
| A. GP 데이터가 KPA 중복검사에 잘못 걸림 | ❌ |
| **B. KPA 내부에 같은 user_id 회원 이미 존재** | ⚪ 가능 (DB 검증 필요) |
| **C. KPA 내부에 다른 user_id 가 license 점유** | ⚪ 가능 (DB 검증 필요) |
| D. kpa_applications 잔재 | ❌ |
| E. frontend 가 잘못된 endpoint 호출 | ❌ (endpoint 정확) |
| F. 오류 메시지가 실제 원인과 다름 | ⚠️ **부분 발견** — onBlur `/check-license` 의 "이미 등록된 면허번호" 메시지는 user_id 관계 안내 부재 → 사용자가 원인 추측 불가 |

**확정 = B or C (DB 1회 SELECT 또는 운영자 search 로 즉시 판별 가능)**.

---

## 8. 권장 정책 (사용자 정책 판단)

1. **본인 식별 가능한 license 재사용은 허용** — `/check-license` 에 auth 추가 + user_id 비교
2. **다른 user_id 점유는 계속 차단** — 약사 식별자 무결성
3. **에러 메시지 명확화** — `ALREADY_MEMBER` (본인) ≠ `LICENSE_DUPLICATE` (다른 user) 구분 안내

---

## 9. 후속 WO 제안 (Priority 순)

### Priority 1 — DB 검증 (사용자 / 운영자가 수행)

**즉시 가능**. P1 WO (`063f59f02`) 배포 후 운영자가:
- `/operator/members` 에서 "99991" / "99992" / "renagang21" 검색
- 각 row 의 user_id / email / status / 가입 경로 확인
- 결과에 따라 시나리오 B / C 확정

또는 사용자 승인 후 read-only SELECT (psql/Cloud SQL Admin):
```sql
SELECT km.id, km.user_id, km.license_number, km.status, km.created_at,
       u.email, sm.status AS sm_status
FROM kpa_members km
LEFT JOIN users u ON u.id = km.user_id
LEFT JOIN service_memberships sm
  ON sm.user_id = km.user_id AND sm.service_key IN ('kpa-society','kpa')
WHERE km.license_number IN ('99991', '99992')
   OR u.email = 'renagang21@gmail.com';
```

### Priority 2 — 시나리오 B 확정 시

```
WO-O4O-KPA-LICENSE-DUPLICATE-SAME-USER-ALLOW-V1
  - /check-license 에 optional auth + user_id 비교 추가
  - POST /apply 의 license check 가 user_id 일치 시 skip
  - 본인의 license 재시도 / 동일 user_id 의 cross-service 가입 허용
  - 다른 user_id 의 동일 license 는 계속 차단 (약사 식별자 무결성)
  - frontend RegisterModal 의 onBlur 도 auth header 동반 호출
```

### Priority 3 — 시나리오 C 확정 시

```
WO-O4O-KPA-LICENSE-99991-99992-CLEANUP-V1
  - read-only SELECT 결과 검토 (운영 데이터 변경 — 사용자 승인 필수)
  - 정리 옵션:
    (a) license_number = NULL 무효화 (재사용 허용)
    (b) hard-delete (admin /admin/members 경로)
    (c) 유지
```

### Priority 4 — 에러 메시지 분리 (양 시나리오 공통)

```
WO-O4O-KPA-LICENSE-DUPLICATE-ERROR-CLASSIFICATION-V1
  - ALREADY_MEMBER (본인 이미 가입) vs LICENSE_DUPLICATE (다른 user_id 점유)
    frontend 표시 분리:
    - "이미 KPA-Society 에 가입된 계정입니다. 로그인해 주세요."
    - "다른 회원이 이미 등록한 면허번호입니다."
  - onBlur `/check-license` 응답에 reason 코드 포함 (sameUser / otherUser)
```

### Priority 5 — 정책 정리 (선행 IR)

```
IR-O4O-KPA-LICENSE-REUSE-POLICY-V1
  - 거절/탈퇴/정지 회원의 license 재사용 정책
  - 본 IR §6 후보 1~4 중 canonical 결정
  - 정책 확정 후 P2/P3 진입
```

---

## 10. Current Structure vs O4O Philosophy Conflict Check

| 차원 | 평가 | 충돌 |
|---|---|:---:|
| 같은 사람이 여러 서비스 가입 면허번호 차단 | ❌ 현재는 차단하지 않음 (구조적으로 분리) | 없음 |
| 면허번호 = 플랫폼 사람 식별자 + user_id 예외 | ⚠️ 현재 미적용 — `/check-license` 가 user_id 무관 | **약함** (UX 결함) |
| 다른 user_id 의 동일 면허번호 차단 | ✅ 정상 차단 (약사 식별자 무결성) | 없음 |
| 운영자 화면 미표시 데이터로 차단 | ⚠️ P1 WO 전: license 검색 불가 → 운영자 정리 불가 | **약함** (P1 으로 일부 해소 — license 검색 가능. 단 status 가 hidden 이면 여전히 탭 전환 필요) |

### 판정: **약한 충돌 2건** (모두 UX / 운영 투명성 — 정책적 본질 충돌 없음)

### 권장 방향

1. **DB 검증 우선** — P1 또는 read-only SELECT 로 시나리오 B/C 확정
2. **시나리오 B 면** Priority 2 WO 즉시 진행 가치 (본인 cross-attempt UX 결함 해소)
3. **시나리오 C 면** Priority 3 WO 로 데이터 정리 + Priority 4 메시지 분리

---

## 11. 본 IR 이 결정하지 않는 것

- 99991/99992 의 정확한 user_id (DB 검증 필요)
- B/C 시나리오 확정 (DB 또는 운영자 search 결과 의존)
- Priority 2-5 WO 의 실제 실행 시점
- License 재사용 정책 (별건 IR P5)
- 운영 DB 직접 SELECT 의 실행 (사용자 승인 필요)

---

## 12. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 큰 결정 | **GP cross-service 차단 가설 기각 확정** (구조적). 차단 원인 = KPA 내부 데이터 (B/C 중 1) |
| 핵심 발견 1 | `/check-license` 가 user_id 무관 검사 → 본인 cross-attempt 와 다른 user 점유를 onBlur 메시지로 구분 불가 (UX 결함) |
| 핵심 발견 2 | `POST /apply` 는 ALREADY_MEMBER 와 LICENSE_DUPLICATE 분리하나 frontend RegisterModal 은 두 메시지 모두 "이미 등록된 면허번호" 로 표시 가능 |
| 후속 WO 제안 | 5 건 (P1 DB 검증 / P2 same-user allow / P3 cleanup / P4 메시지 분리 / P5 정책 IR) |
| 사이클 정리 | "cross-service vs KPA 내부" 가설 분리 완료. 다음 단계 = DB SELECT 또는 운영자 search 1회 |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. KPA 중복검사 코드
grep -n "check-license\|LICENSE_DUPLICATE\|memberRepo.findOne" \
  apps/api-server/src/routes/kpa/controllers/member.controller.ts

# 2. auth-register 의 KPA license 처리
grep -n "createKpaRecords\|license_number\|23505" \
  apps/api-server/src/modules/auth/controllers/auth-register.controller.ts | head -20

# 3. /check-license 가 user_id 받는지
grep -n "license_number\|user_id\|userId" \
  apps/api-server/src/routes/kpa/controllers/member.controller.ts | head -30

# 4. frontend onBlur 호출
grep -n "check-license\|checkLicense" \
  services/web-kpa-society/src/components/RegisterModal.tsx

# 5. GP license 저장
grep -nE "license_number|licenseNumber" \
  apps/api-server/src/routes/glycopharm/services/glycopharm-member.service.ts \
  apps/api-server/src/routes/glycopharm/entities/glycopharm-member.entity.ts

# 6. (사용자 승인 후) DB SELECT
SELECT km.id, km.user_id, km.license_number, km.status, km.created_at,
       u.email, sm.status AS sm_status
FROM kpa_members km
LEFT JOIN users u ON u.id = km.user_id
LEFT JOIN service_memberships sm
  ON sm.user_id = km.user_id AND sm.service_key IN ('kpa-society','kpa')
WHERE km.license_number IN ('99991', '99992')
   OR u.email = 'renagang21@gmail.com';
```

---

*Created: 2026-05-30*
*Type: Investigation Report (read-only)*
*Status: ✅ GP cross-service 차단 가설 기각. 차단 원인 = KPA 내부 (시나리오 B/C, DB 검증 1회 필요).*
*Decision Required: (1) DB SELECT 수행 (사용자 승인) 또는 운영자 search 로 B/C 확정 → (2) Priority 2 또는 Priority 3 WO 진입.*
