# CHECK-O4O-GLYCOPHARM-SIGNAGE-SCHEDULE-PHARMACY-CONTEXT-FIX-V1

> **작업명:** WO-O4O-GLYCOPHARM-SIGNAGE-SCHEDULE-PHARMACY-CONTEXT-FIX-V1
> **유형:** GlycoPharm 사이니지 스케줄 탭 약국 context 해석 버그 수정 (frontend only). backend/DB/route/middleware **무변경**.
> **결과: PASS — 스케줄 탭이 `user.pharmacyId`(미주입) 대신 토큰 기반 `store-hub/overview` 의 organizationId 를 사용. "약국 정보를 불러올 수 없습니다" 오류 해소. typecheck(tsc -b) 0 · vite build 성공. backend/DB 무변경.**
> Date: 2026-06-15

---

## 1. 증상

- URL: `https://glycopharm.co.kr/store/marketing/signage/schedules`
- 약국 계정 로그인 상태인데도 스케줄 탭에서 **"약국 정보를 불러올 수 없습니다 / 스케줄 기능을 사용하려면 약국 계정으로 로그인해야 합니다"** 표시.
- 같은 페이지의 **내 동영상 / 내 플레이리스트** 탭은 정상.

## 2. 근본 원인

`StoreSignageMainPage.tsx` 의 스케줄 탭만 organizationId 를 **`user.pharmacyId`** 에서 읽음:

```tsx
const organizationId = (user as { pharmacyId?: string } | null)?.pharmacyId || '';
```

- GlycoPharm auth 파이프라인(`/auth/me` + `normalizeUser`)은 `user.pharmacyId` 를 **채우지 않음** → 항상 `''`.
- 게이트 `!organizationId` 가 API 호출 이전에 오류 배너를 렌더 → API 실패가 아니라 **frontend 단락**.
- 정상 탭(내 동영상/플레이리스트)은 `fetchStorePlaylists()` / `storeAssetControlApi` 가 organizationId 를 보내지 않고 **backend 가 토큰에서 매장 컨텍스트를 해석**(`resolveStoreAccess(..., 'glycopharm')` → `organization_members`)하므로 영향 없음.
- 스케줄 API(`/api/signage/glycopharm/schedules`, `requireSignageStore`)만 `X-Organization-Id` 를 요구하는 KPA canonical 구조. KPA 는 `user.kpaMembership.organizationId`(주입됨)로 해석되어 정상이나, 이식 시 GP 에 동등 필드가 없는데 `user.pharmacyId` 로 치환되어 깨짐.

## 3. 수정 (1 파일, frontend only)

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/pages/store-management/signage/StoreSignageMainPage.tsx` | organizationId 출처를 `user.pharmacyId` → 토큰 기반 `fetchStoreHubOverview()`(`GET /glycopharm/store-hub/overview`)의 `organizationId` 로 변경. `orgResolving` 로딩 state 추가 → 해석 중에는 스피너, 해석 완료 후 빈 값일 때만 기존 오류 배너 표시. 미사용된 `useAuth`/`user` 제거. |

- `store-hub/overview` 는 GP "내 약국" 표준 토큰 기반 org 해석 엔드포인트(StoreHubPage 등에서 이미 사용). 신규 backend/엔드포인트 불요.
- 스케줄 생성/수정/삭제/플레이리스트 옵션 로더는 그대로 `organizationId` 사용 — 이제 정상 값으로 동작.

## 4. 검증

- **TypeScript:** `npx tsc -b` (glycopharm-web) **0 errors**.
- **Build:** `npx vite build` **성공** (✓ built in 15.12s).
- **정적:**
  - 스케줄 탭 진입 → `fetchStoreHubOverview()` → organizationId 해석 → `fetchSchedules`/`fetchSignagePlaylists` 정상 호출.
  - 해석 중 스피너("약국 정보를 불러오는 중…"), 비약국/실패 시에만 기존 안내 배너 → 권한 완화 아님.
  - 내 동영상/플레이리스트 탭 무변경(토큰 기반 유지).
  - **backend/DB/route/middleware/migration 변경 0.** `requireSignageStore`·schedule controller 무접촉.
- **회귀 영향:** KPA(별도 `StoreSignagePage`, `kpaMembership.organizationId`) 무접촉. KCos 는 해당 사이니지 스케줄 페이지 부재 — 영향 없음.
- **browser smoke:** 미수행 — dev 서버/인증 guard. **배포 후 권장:** GP 약국 계정 → `/store/marketing/signage/schedules` 진입 → 오류 미표시 + 스케줄 목록/empty state 확인. videos/playlist/playback 회귀 동시 확인.

## 5. 완료 판정

**PASS.** 약국 context 해석 실패 메시지 해소. organizationId 를 GP canonical 토큰 기반 경로로 정렬. 권한 완화·메시지 은폐 없음. backend/DB 무변경, typecheck/build 통과.

## 6. 후속

1. (배포 후) GP 스케줄 탭 smoke + videos/playlists/playback 회귀.
2. (선택) `User.pharmacyId` 잔재 타입 정리 / signage 스케줄 API 도 토큰 기반(`requireSignageStore` org 폴백)으로 통일 검토 — 별도 shared-middleware WO.

---

*Date: 2026-06-15 · GP signage schedule pharmacy-context PASS · organizationId 출처 user.pharmacyId → store-hub/overview(토큰 기반). frontend only, backend/DB 무변경. tsc -b 0 · vite build 성공. 배포 후 smoke 권장.*
