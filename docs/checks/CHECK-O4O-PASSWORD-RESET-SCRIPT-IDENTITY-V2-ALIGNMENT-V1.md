# CHECK-O4O-PASSWORD-RESET-SCRIPT-IDENTITY-V2-ALIGNMENT-V1

> **결과: 완료 — 실행 차단·안내 실측 검증 통과.**
> **작성일:** 2026-08-09
> **기준 commit:** `5788aa4c9`
> **근거:** `IR-O4O-ADMIN-PASSWORD-WRITE-PATH-AUDIT-AFTER-IDENTITY-V2-MERGE-V1` §5 · §7-4
> **DB write 0 · 실제 비밀번호 변경 0 · migration 0 · HTTP API 무변경**

---

## 1. 목적

Identity V2 이후 `users.password`(L1)와 `service_credentials.password_hash`(L2)가 분리되어,
기존 운영 스크립트의 "전체 비밀번호 초기화"가 **실제 동작과 이름이 어긋나게** 됐다.

대상 2종:

```text
list-and-reset-all-users.ts   → 폐기/차단
diagnose-admin-login.ts --fix → 유지 + L1-only 명시
```

---

## 2. 조사

### 2-1. 호출처 — **0건**

| 채널 | 결과 |
|------|------|
| `package.json` scripts | **연결 0건** (`api-server` 전체 스캔) |
| 코드 import | **0건** |
| CI / 워크플로 (`.github/**`) | **0건** |
| `.cmd` / `.sh` / 설정 | **0건** |
| 문서 언급 | 4건 — 전부 감사·CHECK 문서(실행 지시 아님) |

→ 자동 실행 경로가 없어 **HOLD 조건 미충족**. 차단해도 끊기는 운영 절차가 없다.

### 2-2. `list-and-reset-all-users.ts` 원본 동작 (차단 전)

```text
대상 : 전체 사용자 (필터 없음)
동작 : users.password 를 단일 값으로 일괄 UPDATE
```

Identity V2 에서 로그인은 credential 이 있으면 `users.password` 를 보지 않는다
(`auth-login.service.ts` — `targetHash = credentialHash ?? user.password`).
실측(2026-08-09): credential 40건 중 **18건이 L1 과 상이** → 그 계정들은 서비스 로그인이 **그대로 남는다.**

**추가로 발견한 위험 3가지** (원본 코드 확인 중):

| # | 내용 |
|:-:|------|
| 1 | 전 계정 L1 을 **같은 값**으로 만든다 |
| 2 | **전 사용자 이메일 + 평문 비밀번호를 로그로 출력**했다 (원본 `:78`, `:88`) |
| 3 | 이전 해시를 보존하지 않아 **되돌릴 수 없다** |

2번은 조사 착수 시점에 예상하지 못한 항목으로, 폐기 근거를 강화한다.

### 2-3. `diagnose-admin-login.ts --fix` 동작

`results[].fix()` 를 순회 실행한다. 비밀번호 관련 fix 2개(`:135`, `:165`)는 모두
`user.password` 만 저장 → **L1 only**. `service_credentials` 미접촉.
`service_credentials` 보유 여부는 `user_id` 로 조회 가능(감지 구현 가능).

---

## 3. 정책 결정 (사용자 확정)

```text
1. list-and-reset-all-users.ts        → 실행 불가 상태로 폐기/차단 (파일 삭제 아님)
2. diagnose-admin-login.ts --fix      → 유지. 단 L1 only 명시 + credential 보유 시 경고
3. serviceKey 기반 일괄 초기화 기능    → 지금 만들지 않음 (필요 확인 시 별도 WO)
```

---

## 4. 구현

### 4-1. `list-and-reset-all-users.ts` — 차단

| 지점 | 처리 |
|------|------|
| 함수 진입부 | 즉시 `throw` — DB 연결·조회·UPDATE **이전**. 프로그램 호출(import)도 동일 차단 |
| CLI 진입 | 안내 출력 후 `process.exit(1)` — **DB 를 import 하지 않는다** |
| 파일 | 삭제하지 않고 **안내 전용 stub** 으로 유지. 폐기 사유·대체 경로를 주석에 명시 |

**원본 구현을 dead code 로 남기지 않은 이유** (WO 는 "남겨도 된다"였으나 남기지 않기로 판단):

1. **평문 비밀번호 출력 코드**가 그대로 남으면 guard 제거 시 즉시 재현된다(§2-2 위험 2).
2. `database/connection.js` **정적 import 가 안내 출력보다 먼저 평가**되어, 엔티티 로딩 오류가 나면
   폐기 안내가 보이지 않는다 — **실측으로 확인**했다(§5-1). 안내 출력이 이 파일의 유일한 기능이므로
   DB 를 import 하지 않는 형태가 필수였다.

원본은 git 이력(직전 리비전)에 보존된다.

### 4-2. 부수 수정 — CLI 진입 판정 (Windows 미작동)

기존 관례 `import.meta.url === \`file://${process.argv[1]}\`` 는 **Windows 에서 항상 false** 다
(`process.argv[1]`=`C:\...` 역슬래시 vs `import.meta.url`=`file:///C:/...`).
그대로 두면 **폐기 안내가 출력되지 않는다**(실측 확인). 경로 정규화 비교로 교체했다.

```ts
path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url))
```

> 같은 패턴이 다른 스크립트에도 있으나 **본 WO 범위 밖**이라 손대지 않았다 → §8 후속 2번.

### 4-3. `diagnose-admin-login.ts` — 안내·경고만 추가

| 위치 | 내용 |
|------|------|
| 파일 헤더 | `--fix` 가 **L1 전용**임을 명시 |
| `--help` | `--fix` 설명에 L1-only 주석 추가 |
| `--fix` 실행 직전 | 범위 고지 2줄 출력 |
| 동 지점 | `service_credentials` **read-only 조회** 후 보유 시 경고(서비스 목록 포함) |

- 조회는 `service_key` 만 SELECT — **해시·비밀번호를 읽지 않는다.**
- 조회 실패는 `warn` 으로 격하하고 진단·복구를 막지 않는다.
- **복구 로직 자체는 변경하지 않았다** (안내·가드 한정).

---

## 5. 검증

### 5-1. 차단 실측

| # | 검증 | 결과 |
|:-:|------|:----:|
| 1 | CLI 실행 시 폐기 안내 출력 | ✅ 전문 출력 확인 |
| 2 | CLI 종료 코드 | ✅ **1** |
| 3 | DB 연결 시도 | ✅ **없음** (DB import 자체를 제거) |
| 4 | 프로그램 호출(`import` 후 함수 실행) | ✅ **throw 로 차단** — `disabled under Identity V2` |
| 5 | 비밀번호·해시·토큰 출력 | ✅ **0** |

> 차단 전 1차 시도에서는 무관한 TypeORM 데코레이터 오류(`emitDecoratorMetadata`)로 죽어
> **안내가 보이지 않았다.** 이 관측이 §4-1 의 stub 결정 근거다. 현재는 안내가 정상 출력된다.

### 5-2. `diagnose-admin-login.ts`

| 검증 | 결과 |
|------|------|
| `tsc --noEmit` | ✅ PASS |
| 코드 경로 | `--fix` 진입부에 범위 고지 + credential 조회 경고 삽입 확인 |
| **실행 검증** | ⚠️ **미수행** — §5-3 |

### 5-3. ⚠️ 수행하지 못한 검증

`diagnose-admin-login.ts --fix` 의 **실행 관측은 하지 않았다.**

- 이 스크립트는 실행 시 **실제로 `users.password` 를 변경**한다. WO 금지사항
  (`실제 비밀번호 변경 금지` · `운영 DB write 금지`)에 정면으로 걸린다.
- 로컬 DB 가 없어 dry-run 대체도 불가했다.
- `--fix` 없이 진단만 실행하는 것도 **운영 DB 연결**이 필요해 수행하지 않았다.

따라서 경고 문구·credential 감지는 **코드 검토와 타입검사로만** 확인됐다.
단, 추가한 코드는 **출력과 read-only SELECT 뿐**이고 기존 복구 로직을 변경하지 않았으므로,
최악의 경우에도 **기존 동작은 그대로**이고 경고가 안 붙을 뿐이다.

---

## 6. 무변경 확인

```
실제 비밀번호 변경 0 · 운영 DB write 0 · migration 0
service_credentials 일괄 reset 구현 0 · 새 전역 reset 기능 0
인증 정책 무변경 · HTTP API 무변경 · role 변경 0
테스트 계정 비밀번호 출력 0 · 비밀번호/해시/토큰 로그 출력 0
diagnose-admin-login 복구 로직 자체 무변경 (안내·가드만 추가)
```

`api-server tsc --noEmit` **PASS**.
프런트 변경이 없고 런타임 코드 경로에 영향이 없어 별도 배포 검증 대상이 아니다
(스크립트는 서버 프로세스에 로드되지 않는다).

---

## 7. 변경 파일

```
M apps/api-server/src/scripts/list-and-reset-all-users.ts   (차단 stub 으로 대체)
M apps/api-server/src/scripts/diagnose-admin-login.ts       (헤더·help·L1 고지·credential 경고)
```

---

## 8. 후속

| # | 내용 | 등급 |
|:-:|------|:---:|
| 1 | `diagnose-admin-login --fix` 실행 검증 — 폐기 가능한 계정 확보 시 경고 출력 실측 | P3 |
| 2 | 다른 스크립트의 `import.meta.url === \`file://...\`` 패턴(Windows 미작동) 전수 정비 | P3 |
| 3 | serviceKey 기반 일괄 초기화 — **지금 만들지 않음.** 실제 운영 필요 확인 시 별도 WO | — |
| 4 | `create-admin-user` / `create-manager-user` / `reset-admin-password` — 플랫폼 계정 대상이라 유지. L1-only 고지 추가 여부는 선택 | P3 |

---

*범위: 스크립트 차단·안내만 · DB write 0 · 비밀번호 변경 0 · 실행 차단 실측 통과 · `--fix` 실행 검증은 미수행(사유 §5-3)*
