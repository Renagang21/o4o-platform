# CHECK-O4O-NETURE-SUPPLIERS-PENDING-STALE-DATA-V1

> Verification — read-only DB SELECT. **코드 수정 없음, DB 수정 없음.**
> 일자: 2026-05-30
> 선행 IR: [IR-O4O-NETURE-OPERATOR-DASHBOARD-DATA-ACCURACY-AUDIT-V1](IR-O4O-NETURE-OPERATOR-DASHBOARD-DATA-ACCURACY-AUDIT-V1.md)
> 목표: Neture operator dashboard "공급사 승인 대기 2건" PENDING row 의 실체 확인 → D / F / U 판정

---

## 1. Executive Summary

- **판정: Case F (실제 공급 활성화 2단계 대기) 확정 — 단, 두 PENDING row 모두 테스트 계정**.
- 2 row 모두 `service_memberships.status='active'` (가입 승인 완료), `neture_suppliers.status='PENDING'` + `approved_at=NULL` (공급 활성화 단계 미수행) 의 정상 two-step 흐름 상태.
- **stale legacy 데이터 아님** (Case D 기각): user_status='active', organization_id 정상 연동, created_at 최근 (각 2026-05-24, 2026-05-30).
- 다만 **두 row 모두 테스트 계정** (sohae21@naver.com=쓰리라이프존, renagang21@gmail.com=테스트공급자 — TEST-ACCOUNTS.local.md SSOT 일치) 이라 운영자의 "실제 처리 대기는 없다" 인식과 일치하지 않음. 이는 **데이터 무결성 문제가 아닌 UX/운영 정책 문제**.
- 따라서 후속 분기는 **F-track (operator visibility 보강)** 가 정답. 동시에 부차적으로 **테스트 계정의 supplier 활성화 처리 흐름**도 명확히 해야 미래 시점에도 동일 false alarm 방지 가능.

---

## 2. 실행 환경 / 접속 채널

| 항목 | 값 |
|---|---|
| Instance | `netureyoutube:asia-northeast3:o4o-platform-db` |
| Database | `o4o_platform` |
| Login user | `o4o_api` (Cloud Run 정식 운영 계정) |
| 접속 채널 | Cloud SQL Auth Proxy v2.11.4 (`/c/tmp/cloud-sql-proxy.exe`) → 127.0.0.1:5434 → IAM (OAuth access token) 인증 |
| Client | psql 17.9 |
| Read-only 보장 | 본 CHECK 는 SELECT 2건만 실행. UPDATE/DELETE/DDL 없음 |

**CLAUDE.md §0 준수**: gcloud + 로컬 psql + Cloud SQL Auth Proxy 경로는 명시적으로 허용된 채널이며, 본 CHECK 는 read-only SELECT 만 수행.

---

## 3. SQL 1 — PENDING supplier row 실체

### 3.1 실행 SQL

```sql
SELECT ns.id, ns.user_id, ns.organization_id, ns.status,
       ns.created_at, ns.updated_at, ns.approved_at,
       u.email, u.name, u.status AS user_status
FROM neture_suppliers ns
LEFT JOIN users u ON u.id = ns.user_id
WHERE ns.status = 'PENDING'
ORDER BY ns.created_at;
```

### 3.2 결과 (2 row)

| # | supplier id | user_id | organization_id | status | created_at | updated_at | approved_at | email | name | user_status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `251adaaf-…ef36a6` | `52a4c1e6-…7e8ca3a` | `69e985ae-…3d4f7a2` | **PENDING** | 2026-05-24 06:11:44 | 2026-05-24 06:11:44 | **NULL** | sohae21@naver.com | 서철환 | **active** |
| 2 | `91169739-…3d65eb` | `6967ebe0-…490493cef` | `95aad740-…1c1661d2` | **PENDING** | **2026-05-30 02:58:21** | 2026-05-30 02:58:21 | **NULL** | renagang21@gmail.com | 서Renagang21 | **active** |

**관찰**:
- 두 row 모두 `approved_at IS NULL` 이고 `updated_at = created_at` → 생성 이후 한 번도 supplier-side 활성화 처리되지 않은 상태
- `user_status='active'` → users 행은 정상
- `organization_id` 정상 연동 → 가입 승인 트랜잭션이 정상 종료된 결과
- 두 이메일 모두 [docs/local/TEST-ACCOUNTS.local.md](../local/TEST-ACCOUNTS.local.md) 에 등록된 **Neture 공급자 테스트 계정**:
  - sohae21@naver.com — "Neture 공급자" / 쓰리라이프존
  - renagang21@gmail.com — "Neture 공급자2" / 테스트공급자

---

## 4. SQL 2 — service_memberships 동기화 상태

### 4.1 실행 SQL

```sql
SELECT sm.user_id, sm.status AS sm_status, sm.approved_at AS sm_approved_at,
       ns.id AS supplier_id, ns.status AS ns_status, ns.approved_at AS ns_approved_at
FROM service_memberships sm
LEFT JOIN neture_suppliers ns ON ns.user_id = sm.user_id
WHERE sm.service_key = 'neture' AND ns.status = 'PENDING';
```

### 4.2 결과 (2 row)

| # | user_id | sm_status | sm_approved_at | supplier_id | ns_status | ns_approved_at |
|---|---|---|---|---|---|---|
| 1 | `52a4c1e6-…` | **active** | 2026-05-24 06:11:44 | `251adaaf-…` | **PENDING** | **NULL** |
| 2 | `6967ebe0-…` | **active** | 2026-05-30 02:58:21 | `91169739-…` | **PENDING** | **NULL** |

**관찰**:
- `sm_approved_at` 과 `ns.created_at` (SQL 1) 의 timestamp 가 정확히 일치 → 가입 승인 트랜잭션 내에서 `service_memberships UPDATE → 'active'` 와 `neture_suppliers INSERT (status='PENDING', approved_at=NULL)` 가 동시에 일어났음 (선행 IR §4.2 의 write-path 가 코드대로 작동했음을 실증)
- `sm.status='active'` + `ns.status='PENDING'` + `ns.approved_at=NULL` → **Two-step activation 정확히 1단계 완료, 2단계 미수행 상태**

---

## 5. D / F / U 판정

### 5.1 판정 기준 대조

| 신호 | row 1 (sohae21) | row 2 (renagang21) | 의미 |
|---|---|---|---|
| created_at 최근 여부 | 2026-05-24 (6일 전) | 2026-05-30 (당일) | 둘 다 최근 → stale 시그널 약함 |
| user_status='active' | ✅ | ✅ | 사용자는 정상 |
| sm.status='active' | ✅ | ✅ | 가입 승인 정상 종료 |
| ns.status='PENDING' + ns.approved_at=NULL | ✅ | ✅ | supplier 활성화 미수행 |
| organization_id 연동 | ✅ | ✅ | 가입 승인 트랜잭션 organization 단계 정상 |
| 테스트 계정 여부 | ✅ (TEST-ACCOUNTS SSOT) | ✅ (TEST-ACCOUNTS SSOT) | 운영자 실사용 의도 아님 |

### 5.2 Case 판정

| Case | 판정 | 근거 |
|---|---|---|
| **D** stale/legacy 데이터 | ❌ **기각** | created_at 최근, user/org/sm 모두 정상 상태. 폐기·삭제·withdrawn 흔적 없음 |
| **F** 실제 공급 활성화 대기 | ✅ **확정** | 가입 승인 후 supplier-side 활성화 단계 미수행이 schema-level 로 명확. write-path 코드와 일치 |
| **U** 판정 보류 | ❌ | 모든 컬럼이 모순 없이 일관, 보류 사유 없음 |

### 5.3 단, 운영자 인식과의 괴리

사용자 보고: "실제로는 공급자 승인 대기가 없다."
실제 schema: F (정상적 2단계 대기 상태)

이 괴리는 **다음 두 흐름이 정책 차원에서 정렬되지 않았기 때문**:

1. 테스트 계정의 supplier 활성화 처리 흐름이 운영자에게 노출되지 않음 → 운영자는 "처리할 게 없다" 고 인지하지만 실제로는 dashboard 가 정확하게 "2단계 미완료 row 2건" 을 카운트
2. 테스트 계정 자체의 시드 시 supplier 활성화까지 자동 처리되지 않음 → 매번 새 테스트 계정 생성 시 dashboard pending 카운트 증가

→ **데이터 결함 아님, 정책/UX 결함**. 따라서 후속은 F-track 처리.

---

## 6. Dashboard 숫자 "2건" 의 의미

| 항목 | 결과 |
|---|---|
| 표시 숫자 | 2 |
| 실제 PENDING row | 2 (정확히 일치) |
| 숫자 정확성 | ✅ **정확함** |
| 의미 정확성 | ⚠️ **2단계 대기는 맞지만 두 row 모두 테스트 계정 → 운영자 처리 대상이 아닐 수 있음** |
| stale 데이터 비율 | 0/2 (stale 없음) |
| 운영자 처리 가능 entry | 0/2 (현 dashboard 의 dead link `/operator/admin-suppliers` 로 인해 처리 진입 불가) |

→ **숫자 자체는 정확하지만, dashboard 가 가리키는 link 가 dead 라서 운영자가 "처리할 수도 없는 항목" 으로 표시됨**. 이는 선행 IR §6.1 의 **dead link 결함** 과 정확히 맞물린다.

---

## 7. 후속 WO 분기 제안

본 CHECK 결과는 **F 확정** 이므로 IR §9.5 의 분기 중 F-track 으로 진입.

### 7.1 P3-A — 추천 (F-track 메인)

**WO-O4O-NETURE-SUPPLIER-ACTIVATION-FLOW-OPERATOR-VISIBILITY-V1**

목적:
- Operator 가 PENDING supplier row 를 "공급 활성화 처리" 화면에서 명시적으로 처리 가능하도록 진입점 마련
- 현재 `/operator/admin-suppliers` dead link 를 정정하여 operator scope 진입 가능 화면 신설 또는 기존 admin scope 화면을 operator scope 로 노출
- IR §9.3 (WO-…-ACTION-QUEUE-LINK-FIX-V1) 과 함께 진행하면 dead link + visibility 가 동시 해결됨

연결되는 IR 결함:
- IR §6 — Action Queue dead link 2건 중 `pending-suppliers` 항목
- IR §8.2 — "공급사 PENDING 흐름 → 운영자가 직접 진입 가능한 link 필요"

### 7.2 P3-B — 보조 (테스트 계정 정책 명확화)

**WO-O4O-NETURE-TEST-SUPPLIER-SEED-ACTIVATION-POLICY-V1** (신규 후보)

목적:
- 테스트 계정 시드 시 supplier 활성화까지 포함할지, PENDING 으로 두는지 명시 정책화
- 명시 정책이 없으면 매번 테스트 계정 생성 시 dashboard pending 카운트가 누적되어 운영자 noise 발생
- 정책 결정 후 시드 스크립트 또는 cleanup 흐름에 반영

연결되는 IR 결함:
- 본 CHECK §5.3 — 운영자 인식과 schema 의 괴리는 정책 부재가 원인

### 7.3 P3-C — 기각 (D-track 진행 불필요)

- ❌ **WO-O4O-NETURE-SUPPLIERS-STALE-PENDING-CLEANUP-V1** — 본 CHECK 가 D 를 기각했으므로 cleanup 의 전제가 성립하지 않음
- 향후 시점에 stale row 가 발견되면 별도 CHECK 부터 재진행

---

## 8. 우선순위 갱신 (선행 IR §10 → 본 CHECK 결과 반영)

| 순위 | 작업 | 변동 |
|---|---|---|
| ~~P0~~ | ~~CHECK-O4O-NETURE-SUPPLIERS-PENDING-STALE-DATA-V1~~ | ✅ **본 CHECK 로 완료** |
| **P1** | **WO-O4O-NETURE-OPERATOR-DASHBOARD-ACTION-QUEUE-LINK-FIX-V1** (선행 IR §9.3) | 변동 없음 — dead link 결함 그대로. F-track 의 P3-A 와 묶을 수 있음 |
| **P2** | WO-O4O-NETURE-OPERATOR-DASHBOARD-KPI-LABEL-DRIFT-FIX-V1 | 변동 없음 |
| **P3-A** | **WO-O4O-NETURE-SUPPLIER-ACTIVATION-FLOW-OPERATOR-VISIBILITY-V1** | F 확정 → P3 분기 결정. dead link 결합 권장 |
| P3-B | WO-O4O-NETURE-TEST-SUPPLIER-SEED-ACTIVATION-POLICY-V1 | 신규 추가 — 미래 시점 false alarm 차단 |
| P4 | WO-O4O-NETURE-OPERATOR-DASHBOARD-AI-SUMMARY-INACTIVITY-RULE-REFINE-V1 | 변동 없음 |
| P5 (선택) | WO-O4O-NETURE-OPERATOR-DASHBOARD-CANONICAL-RESTRUCTURE-V1 | 변동 없음 |

**권장 진행 순서**: P1 + P3-A 통합 진행 → P2 → P3-B → P4 → P5.

---

## 9. 검증 무결성

| 항목 | 결과 |
|---|---|
| SQL 실행 가능 여부 | ✅ Cloud SQL Auth Proxy + OAuth token 으로 read-only 접속 성공 |
| 실행 SQL 종류 | SELECT 2건만 |
| INSERT / UPDATE / DELETE | 0건 |
| DDL / migration | 0건 |
| transaction 변경 | 없음 (autocommit psql session) |
| 코드 수정 | 0건 |
| DB row 수정 | 0건 |
| stage / commit | 본 CHECK 문서 외 어떤 파일도 stage 하지 않음 (commit 여부는 사용자 지시) |
| 다른 세션 unstaged 파일 | 건드리지 않음 |
| 자격증명 노출 | DB password 는 본 문서 / commit 메시지 / Bash 로그에 평문 노출 없음 (env 변수로만 전달) |

---

## 10. 미확인 항목 / 추적

- [ ] 본 두 PENDING row 의 supplier-side 활성화 처리를 누가 (admin 만? operator 도?), 어디서, 어떻게 수행해야 하는지 — 정책 결정 필요 (P3-A 의 첫 단계)
- [ ] Neture 의 supplier 활성화 처리 화면이 현재 admin scope (`/admin/admin-suppliers`) 에만 존재하는지, 미정의 상태인지 — App.tsx 와 backend route 정밀 조사 필요 (별도 IR 가능)
- [ ] 테스트 계정 시드 스크립트에서 supplier 활성화까지 포함하지 않은 이유 — 의도 vs 누락 확인 (P3-B 의 전제)

---

*본 CHECK 는 read-only DB SELECT 기반으로 작성됨. 코드 수정 없음, DB 수정 없음.*
*Commit 여부는 사용자 지시에 따름.*
