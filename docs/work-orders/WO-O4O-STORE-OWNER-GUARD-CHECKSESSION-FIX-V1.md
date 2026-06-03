# WO-O4O-STORE-OWNER-GUARD-CHECKSESSION-FIX-V1 (후보 / 미승인)

> **WO 후보 — 코드 미수정 상태.** 승인 후 착수.
> 근거: `CHECK-O4O-KCOSMETICS-STORE-HUB-LIVE-SMOKE-V1` P0-1.

| 항목 | 값 |
|------|------|
| 작성일 | 2026-06-03 |
| 우선순위 | **P0** (모든 사용자 새로고침 영향) |
| 상태 | **✅ 완료 (commit `cc01cca2c`, 배포 success, 라이브 검증 PASS) — 수정안 A** |
| 분류 | bug fix (auth/guard) |
| 영향 서비스 | K-Cosmetics (확정) / GlycoPharm·KPA (점검 필요) |

---

## 1. 증상

K-Cosmetics `/store/*` 경로를 **브라우저 주소창 직접 접속 또는 새로고침(hard load)** 하면 화면이 **"권한을 확인하는 중..." 에서 무한 정지**. (인앱 SPA 이동은 정상.)

- 재현: 로그인 상태에서 `https://k-cosmetics.site/store` 새로고침 → 무한 로딩 (10초+ 무변화, auth 네트워크 호출 0건).
- `/admin`·`/operator` 는 hard load 정상 → /store 계열만 발생.

## 2. 근본 원인 (확정)

- K-Cosmetics `AuthContext`: `isLoading` 은 `!!getAccessToken()` 로 init, `checkSession()` 은 **lazy**(호출자가 트리거).
- `checkSession()` 호출자는 **`RoleGuard` 뿐** ([RoleGuard.tsx:34](../../services/web-k-cosmetics/src/components/auth/RoleGuard.tsx#L34), `OperatorRoute` 포함). AuthContext 에 **mount-time checkSession useEffect 없음** ([AuthContext.tsx:150](../../services/web-k-cosmetics/src/contexts/AuthContext.tsx#L150) 은 token-cleared 리스너만).
- `/store/*` 는 `StoreOwnerRoute`→`@o4o/store-ui-core` `StoreOwnerGuard` 사용, **checkSession 미트리거** ([App.tsx:288](../../services/web-k-cosmetics/src/App.tsx#L288)).
- ⇒ cold load 시 토큰은 있으나 `checkSession` 이 호출되지 않아 `isLoading` 영구 true → `StoreOwnerGuard` 의 `if (isLoading) return loadingNode` 가 무한 ([StoreOwnerGuard.tsx:239](../../packages/store-ui-core/src/auth/StoreOwnerGuard.tsx#L239)).

### cross-service
- **GlycoPharm: 영향 없음** — AuthContext mount useEffect 가 `checkSession()` 호출([web-glycopharm AuthContext.tsx:100-133](../../services/web-glycopharm/src/contexts/AuthContext.tsx#L100)). → **K-Cosmetics 가 GlycoPharm canonical 을 미반영한 divergence.**
- **KPA: 착수 시 점검 필요** (동일 StoreOwnerGuard/AuthContext 패턴 여부 확인).

## 3. 수정 방향 (택1, 착수 시 결정)

- **(A·권장) K-cos AuthContext 에 mount-time checkSession 부트스트랩 추가** — GlycoPharm canonical([AuthContext.tsx:100-133](../../services/web-glycopharm/src/contexts/AuthContext.tsx#L100)) 정합. 최소 변경, 전 경로 일괄 해소. lazy RoleGuard 호출과 중복되지 않도록 `isSessionChecked`/`sessionCheckInProgressRef` 가드 유지.
- (B) `StoreOwnerRoute` 가 RoleGuard 처럼 `checkSession` 트리거 (store 한정 해소, AuthContext divergence 잔존).

## 4. 검증 (착수 후)
- `/store`, `/store/info`, `/store/commerce/orders` 등 hard load/새로고침 → 정상 렌더 또는 정당한 redirect.
- `/admin`·`/operator` 회귀 없음.
- (가능 시) cosmetics:store_owner 계정으로 채워진 화면 확인.

## 5. 범위 / 금지
- 범위: K-cos auth 부트스트랩 정합. (KPA 점검 결과에 따라 확대 여부 결정.)
- 금지: StoreOwnerGuard(F1 Operator OS / store-ui-core freeze) 구조 변경은 별도 WO. 본 WO 는 서비스측 호출 정합 우선.
- 다른 세션 WIP 미포함.
