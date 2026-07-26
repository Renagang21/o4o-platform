# CHECK-O4O-OPERATOR-CONSOLE-MEMBER-FLOW-AND-STANDARD-LIST-CONSOLIDATION-V1

WO: `WO-O4O-OPERATOR-CONSOLE-MEMBER-FLOW-AND-STANDARD-LIST-CONSOLIDATION-V1`
기준 IR: `2b17a5b94` + 보강 `b346a7150`
일시: 2026-07-26 (KST)

## 0. 결론

| 항목 | 결과 |
|---|---|
| 1. KPI ↔ 회원 목록 정합 | ✅ **수정·배포·실측 완료** (`7f5b4ed7e`) |
| 2. 로그인 오류 오분류 | ⛔ **중지** — 조사 결과 오분류가 아니라 **보안 결함**(§2) |
| 3. 공용 목록 2건 표준 전환 | ⛔ **중지** — 설계 충돌, 정책 결정 필요(§3) |
| 4. KPA `MemberManagementPage` 완결 | ✅ **작업 불필요** — 이미 표준(§4). IR 판정 정정 |

**DB write 0 · migration 0 · 역할/membership 변경 0.**

---

## 1. KPI 불일치 — 원인과 수정 기준

### 1-A. 원인은 status 필터가 아니라 **서로 다른 테이블**이었다

WO 는 "목록이 active-only 라면 KPI 도 active 로"를 전제했으나, **목록은 active-only 가 아니다.**

| 소스 | 쿼리 | 값 |
|------|------|:---:|
| 대시보드 KPI | `SELECT COUNT(*) FROM kpa_members` | 6 |
| 목록 API `/api/v1/kpa/members` | `service_memberships sm WHERE sm.service_key IN ('kpa-society','kpa')` | 5 |

`member.controller.ts` 목록의 base 조건은 **service_key 하나뿐**이고, `status` 는 쿼리 파라미터가
있을 때만 붙는 **선택 조건**이다. 즉 두 숫자의 차이는 활성/비활성이 아니라
**`kpa_members` 와 `service_memberships` 라는 다른 모집단**에서 온 것이다.

### 1-B. 수정

KPI 를 목록의 **기본 모집단과 동일한 쿼리**로 교체했다. 목록 기본값에 status 필터가 없으므로
KPI 에도 걸지 않았다(그래야 클릭 전후 숫자가 항상 같다).

```sql
SELECT COUNT(*) AS count
FROM service_memberships sm
WHERE sm.service_key IN ('kpa-society', 'kpa')
```

### 1-C. 실측 (배포 후)

| 항목 | 값 |
|------|:---:|
| 대시보드 KPI `total-members` | **5** |
| 목록 API `total` | **5** |
| 판정 | **일치 ✅** |

### 1-D. 파생 항목 (본 WO 미처리 — 데이터 무변경 원칙)

`kpa_members` 6 vs `service_memberships` 5 → **`kpa_members` 행은 있으나 서비스 멤버십이 없는
사용자가 1명 존재**한다는 뜻이다. 이는 데이터 정합 문제이며 KPI 수정과 별개다.
본 WO 는 데이터를 변경하지 않으므로 **후속 항목**으로 남긴다.

---

## 2. ⛔ 로그인 오류 — 오분류가 아니라 **보안 결함**

### 2-A. 실측

`renagang21@gmail.com` 기준 (프로덕션 probe, 모두 read-only 로그인 시도):

| # | 비밀번호 | serviceKey | 결과 | 대조된 hash |
|---|----------|:---:|:---:|------|
| A | 현재 문서값 | `kpa-society` | ✅ 성공 | ServiceCredential (V2) |
| B | 현재 문서값 | 없음 | ❌ `INVALID_CREDENTIALS` | `users.password` (V1) |
| C | **구 비밀번호** | 없음 | ✅ **성공** | `users.password` (V1) |
| D | 구 비밀번호 | `kpa-society` | ❌ 실패 | ServiceCredential (V2) |
| E | (대조군) `sohae2100` 현재값 | 없음 | ✅ 성공 | V1 = V2 동기화됨 |

### 2-B. 원인 — Identity V2 dual-read 의 반쪽 갱신

`auth-login.service.ts:183-211` 의 정책:

```
serviceKey 있음 + credential 있음 → V2 (ServiceCredential.passwordHash)
serviceKey 있음 + credential 없음 → V1 fallback (users.password)
serviceKey 없음                   → V1 fallback (users.password)
```

**2026-06-06 의 `renagang21` 비밀번호 reset 이 V2 만 갱신하고 `users.password`(V1) 는 그대로 뒀다.**

### 2-C. 영향 — **폐기한 비밀번호가 지금도 유효하다**

- 구 비밀번호로 **serviceKey 없이 로그인이 성공한다**(케이스 C). 즉 **비밀번호 회수가 실제로
  이루어지지 않았다.**
- 이는 "메시지가 헷갈린다"는 UX 문제가 아니라 **자격증명 폐기 실패**다.
- `INVALID_CREDENTIALS`(케이스 B) 는 기술적으로 **정확**하다 — 실제로 V1 해시와 불일치한 것이다.

### 2-D. 중지 사유

WO 중지 조건 **"로그인 오류 구분이 인증 보안 정책을 약화시키는 경우"** 에 해당한다.

1. 오류 코드를 "serviceKey 누락"으로 세분화하면 **어떤 계정이 V2 credential 을 보유하는지 노출**된다.
2. 무엇보다 메시지 수정은 **근본 원인(폐기 실패)을 가리는 방향**이라 상황을 악화시킨다.

따라서 **코드를 수정하지 않고 보고**한다.

### 2-E. 권고 (승인 필요 — 프로덕션 인증 데이터)

1. **영향 범위 조사** — 다른 계정도 V1/V2 가 어긋나 구 비밀번호가 살아 있는지 전수 확인.
2. **reset 경로 수정** — 비밀번호 재설정이 V1·V2 를 **함께** 갱신하도록(또는 V1 을 무효화하도록) 변경.
3. 위 둘이 끝난 뒤에야 오류 메시지 개선을 검토(순서가 바뀌면 결함이 가려진다).

---

## 3. ⛔ 공용 목록 2건 — 설계 충돌로 중지

대상: `ContactInquiryAdminPage`(217줄, 소비처 4) · `ServiceLegalSettingsPage`(430줄, 소비처 8).

### 3-A. 충돌

| 대상 | 스타일 방식 |
|------|------|
| `ContactInquiryAdminPage` | **inline style 전용** — 헤더에 *"스타일: inline (서비스 Tailwind 비의존)"* 로 **의도 명시** |
| 표준 `DataTable` → `BaseTable` | **Tailwind 클래스 기반** (`className=` 20곳) |

전환하면 "서비스 Tailwind 비의존" 이라는 **명시된 설계 결정을 역행**시키고, 4~8개 소비처에
Tailwind 의존을 새로 주입하게 된다.

### 3-B. 기능 격차는 크지 않다

`ContactInquiryAdminPage` 는 이미 **상태 필터 · 페이지네이션(prev/next + page/totalPages) ·
빈 상태 · 로딩 상태 · 행 클릭 상세** 를 갖추고 있다. 미충족은 **행 체크박스/ActionBar** 인데,
문의 관리에는 정의된 일괄 작업 자체가 없다.

→ 남는 이득은 **시각 일관성**이며, WO 원칙상 cosmetic 은 후순위다.

### 3-C. 필요한 결정

① inline-style 설계를 폐기하고 표준화(Tailwind 의존 수용) vs ② 예외로 명문화하고 유지.
**정책 결정 항목**으로 남긴다.

---

## 4. ✅ KPA `MemberManagementPage` — 작업 불필요 (IR 판정 정정)

IR 은 이 페이지를 "`ListColumnDef` 는 쓰면서 `DataTable` 미사용 = 혼합 상태"로 판정했다. **틀렸다.**

실제 구조:

```tsx
<OperatorMembersConsolePage      // ← @o4o/operator-core-ui 표준 콘솔(DataTable 5 / RowActionMenu 3)
  extraColumns={[activityTypeColumn, capabilitiesColumn]}   // ListColumnDef = 표준 콘솔에 넘기는 추가 컬럼
  drawerExtraSections={...} rowActions={...}
/>
```

즉 **표준 콘솔에 위임하는 정상 패턴**이고, `ListColumnDef` 는 그 콘솔의 확장 API 다.
브라우저 실측(검색 ✅ · 전체선택 ✅ · 행 체크박스 ✅)도 이와 일치한다.

> 이 오판은 IR 이 **페이지 파일 단위 grep** 으로 판정한 데서 왔다. IR §2-A 에 "감사는 패키지
> 레벨에서 해야 한다"고 적어놓고 이 항목만 페이지 기준으로 남긴 것이다. 동일 실수를 반복하지
> 않도록 기록한다.

---

## 5. 4개 서비스 영향

- 변경 파일은 `apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts` **1개**이며
  **KPA 전용 대시보드 KPI** 에만 영향한다.
- 공용 컴포넌트·frontend·타 서비스 **무변경**(§3 중지).
- Neture / GlycoPharm / K-Cosmetics 코드 경로 **변화 0**.

## 6. 권한 교차 검증 (배포 후)

| 항목 | 결과 |
|------|:---:|
| `sohae2100` — `/api/v1/kpa/operator/dashboard` | 200 (KPI 5) |
| `sohae2100` — `/api/v1/kpa/members` | 200 (total 5) |
| `sohae2100` — `/api/v1/admin/platform-accounts` | 403 (경계 유지) |
| `renariver21` — 플랫폼 관리자 경로 | 200 (무회귀) |
| `renagang21` — 운영자 API | 403 (무회귀) |

## 7. 제외·후속 정책 항목

| # | 항목 | 성격 |
|---|------|------|
| 1 | **V1/V2 자격증명 drift — 폐기 비밀번호 유효** | 🔴 보안, 승인 필요 |
| 2 | `kpa_members` ↔ `service_memberships` 데이터 정합(1건 차이) | 데이터 |
| 3 | 공용 목록의 inline-style vs 표준 Tailwind | 설계 정책 |
| 4 | 플랫폼 관리자의 서비스 콘솔 접근(IR §3-1) | 권한 정책 (본 WO 명시 제외) |
| 5 | `operator-notification` 서비스 운영자 개방 | 권한 정책 |

## 8. 커밋·배포

| 항목 | 값 |
|------|-----|
| commit | `7f5b4ed7e` (1파일, +12/-1) |
| workflow | `Deploy API Server (Cloud Run)` run `30195188922` — **success** |
| 배포 image | `…/api-server:7f5b4ed7eec5b28cc464b05acad4a10982b07bc8` — **커밋 SHA 일치** |
| typecheck | 신규 오류 0 (기준선 13 동일) |
| build | PASS |
