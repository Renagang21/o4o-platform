# CHECK-O4O-OPERATORS-PAGE-SILENT-NOOP-FIX-V1

> **결과: 완료 — 실브라우저 3시나리오 실측 통과.**
> **작성일:** 2026-08-09
> **기준 commit:** `65e6d9e4e` → **수정 commit:** `a20415e7b`
> **프론트 한정 · 백엔드 무변경 · 권한/인증/credential 정책 무변경**

---

## 1. 원인

`OperatorsPage.fetchUsers()` 가 **실패 시 목록을 비웠다.**

```ts
} catch {
  toast.error('Failed to load operators');
  setUsers([]);            // ← 실패를 "0건" 으로 만든다
}
```

그 결과 `DataTable` 이 **빈 상태 문구**를 그대로 표시했다.

```tsx
loading={loading}
emptyMessage="조건에 맞는 운영 권한이 없습니다."
```

**화면상 "조회 실패" 와 "권한 0건" 이 완전히 동일**했고, 유일한 실패 신호인 toast 는 몇 초 뒤 사라졌다.
→ 운영자가 **"운영 권한이 하나도 없다"** 고 오인할 수 있는 silent failure.

추가로 두 가지 경로가 더 실패를 삼켰다.

| 경로 | 종전 동작 |
|------|-----------|
| HTTP 200 + `success:false` | axios 가 throw 하지 않아 **성공으로 처리** |
| 예상 밖 응답 형태(배열 아님) | `Array.isArray(raw) ? raw : []` → **조용히 0건** |

---

## 2. 전수 점검 — 다른 액션은 이미 정합했다

WO 지시대로 `OperatorsPage` 의 모든 write 액션을 점검했다. **수정이 필요한 곳은 목록 조회뿐**이었다.

| 액션 | 실패 처리 | 성공 처리 | 재조회 | 판정 |
|------|-----------|-----------|:------:|:----:|
| `handleSubmit` (생성/수정) | `try/catch` → `toast.error(message ‖ error ‖ fallback)` | 2xx 후 `toast.success` | ✅ `fetchUsers()` | 정합 |
| `handleRevokeRole` | `try/catch` → 백엔드 `error` 표시 | 성공 후 toast | ✅ `fetchUsers()` | 정합 |
| `bulkRevokeRoles` | 항목별 `success`/`failed`/`skipped` + 사유 | 배치 결과 모달 | ✅ 모달 종료 시 | 정합 |
| 입력 검증 | `validateForm()` — 이메일/비밀번호 8자/이름/**역할 1개 이상** | — | — | 정합 |

**`toast.success` 오발화 위험 없음 확인**: 백엔드가 `validationResult` 를 검사해 400 을 반환하고
(`AdminUserController.ts:221`·`:315`), 모든 실패 응답이 non-2xx 다. 따라서 2xx = 실제 성공이다.

`window.prompt` 기반 입력은 이 페이지에 **없다**(모달 폼 + `confirm` 만 사용) → 취소/빈값 처리 이슈 없음.

---

## 3. 수정 내용 (1파일)

`apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx`

| # | 변경 |
|:-:|------|
| 1 | `loadError` **지속 상태** 추가 — toast 는 사라지므로 별도 유지 |
| 2 | `success:false`(HTTP 200)를 **실패로 판정** |
| 3 | 배열이 아닌 응답 형태를 **실패로 판정** (0건으로 흘려보내지 않음) |
| 4 | 실패 시 **기존 목록을 비우지 않는다** — 마지막 성공 화면 유지 |
| 5 | 실패 시 **지속 배너 + [다시 시도]** 노출 (백엔드 메시지 표시) |
| 6 | 실패 상태의 `emptyMessage` 를 *"목록을 불러오지 못해 표시할 수 없습니다"* 로 교체 → **'조회 실패' 와 '권한 0건' 을 화면에서 구분** |
| 7 | 성공 시 `loadError` 해제 |

배너에는 *"아래 표는 마지막으로 조회에 성공한 내용이거나 비어 있을 수 있습니다"* 를 명시해,
낡은 데이터를 현재 상태로 오인하지 않게 했다.

---

## 4. 검증 — 실브라우저 (`admin.neture.co.kr`, 배포 후)

배포: run success → `Deploy Admin Dashboard (Cloud Run)` (headSha `a20415e7b`)

### 4-1. 정상 로드

| 항목 | 결과 |
|------|:----:|
| `/operators` 진입 | ✅ |
| 행 수 | **11** |
| 오류 배너 | ✅ 미표시 |
| 빈 상태 문구 | ✅ 미표시 |

### 4-2. 실패 강제 (`GET /admin/users` → 500 `success:false`)

| 항목 | 결과 |
|------|:----:|
| 오류 배너 표시 | ✅ |
| 백엔드 메시지 노출 (`SMOKE_FORCED_FAILURE`) | ✅ |
| [다시 시도] 버튼 | ✅ 1개 |
| **"권한 0건" 문구로 위장** | ✅ **없음** (수정 전 동작 제거 확인) |
| 실패 전용 문구로 교체 | ✅ |

### 4-3. 복구 (차단 해제 후 [다시 시도])

| 항목 | 결과 |
|------|:----:|
| 오류 배너 사라짐 | ✅ |
| 행 수 복구 | **11** ✅ |

### 4-4. 회귀 / 텔레메트리

| 항목 | 결과 |
|------|------|
| 로그인 · `/operators` 접근 | ✅ 정상 |
| 목록·검색·필터 렌더 | ✅ 정상 |
| 콘솔 에러 | **주입한 500 1건뿐** — 그 외 0 |
| 실패 API | **주입한 `500 admin/users` 1건뿐** — 그 외 0 |

> 실패 시나리오는 **Playwright route 인터셉트로 클라이언트에서만** 주입했다.
> 운영 데이터·서버 상태를 바꾸지 않았고, 실제 write 액션(생성·수정·권한 해제)은 **실행하지 않았다.**

---

## 5. 금지사항 준수

```
백엔드 권한 정책 변경 0 · role DB 변경 0 · 비밀번호 정책 변경 0
service_credentials / Identity V2 정책 변경 0 · API 계약 변경 0
대규모 UX 재설계 0 · 새 공통 UI 프레임워크 0 · 무관한 관리자 페이지 수정 0
QR/태블릿/Signage/STORE 설명서 무변경 · 무관한 dirty 파일 스테이징 0
운영 계정 대상 write 액션 실행 0
```

`admin-dashboard tsc --noEmit` **PASS** · `build` **PASS** (1m 30s).
백엔드 변경이 없어 `api-server` typecheck·배포는 대상 아님.

---

## 6. 변경 파일

```
M apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx   (+70 −5)
```

---

## 7. 후속

| # | 내용 | 등급 |
|:-:|------|:---:|
| 1 | 같은 "실패 → 빈 목록" 패턴이 다른 admin 화면에도 있는지 전수 감사 (`setX([])` in catch) | P2 |
| 2 | 성공 액션 실측 — 폐기 가능한 운영자 계정 확보 시 생성·수정·권한 해제 실행 검증(§4 는 조회 경로 중심) | P3 |
| 3 | `admin-dashboard` 공통 load-error 계약 정립 — 현재는 화면마다 제각각 | P3 |

---

*범위: 조회 실패 표면화만 · 백엔드 무변경 · 실브라우저 3시나리오(정상/실패/복구) 통과 · 운영 데이터 변경 0*
