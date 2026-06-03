# WO-O4O-SIGNAGE-FORCED-CONTENT-KCOSMETICS-SERVICEKEY-FIX-V1 (후보 / 미승인)

> **WO 후보 — 코드 미수정 상태.** 승인 후 착수.
> 근거: `CHECK-O4O-KCOSMETICS-STORE-HUB-LIVE-SMOKE-V1` P0-2.

| 항목 | 값 |
|------|------|
| 작성일 | 2026-06-03 |
| 우선순위 | **P0** (Cycle 2 P0 기능 미작동) |
| 상태 | **✅ 완료 (commit `5728ec160`, 배포 success, 라이브 검증 PASS: `/api/signage/cosmetics/hq/forced-content`→200) — 수정안 A** |
| 분류 | bug fix (serviceKey 정합) |
| 영향 | K-Cosmetics operator 강제 콘텐츠(forced-content) |

---

## 1. 증상

operator `/operator/signage/forced-content` 페이지는 정상 렌더되나, 목록 API 가 **400** 으로 항상 실패 → 강제 콘텐츠 기능 사용 불가 (화면은 error+empty 로 graceful degrade).

- 응답: `GET /api/signage/k-cosmetics/hq/forced-content`
  → `400 {"success":false,"error":"Bad Request","code":"INVALID_SERVICE_KEY","message":"Invalid service key: k-cosmetics"}`

## 2. 근본 원인 (확정)

- **프론트**: `ForcedContentPage` 가 `SERVICE_KEY = 'k-cosmetics'` 로 호출 → `/api/signage/k-cosmetics/...` ([ForcedContentPage.tsx:17-18](../../services/web-k-cosmetics/src/pages/operator/signage/ForcedContentPage.tsx#L17)).
- **백엔드**: signage 미들웨어 `validServiceKeys = ['pharmacy','cosmetics','tourism','common','kpa-society','neture','glycopharm']` 에 **`k-cosmetics` 부재 / `cosmetics` 존재** → 400 ([signage-role.middleware.ts:641-648](../../apps/api-server/src/middleware/signage-role.middleware.ts#L641)).
- ⇒ **serviceKey 표준 불일치**: K-Cosmetics 는 login/membership 에서 `k-cosmetics` 를 쓰지만, **signage 도메인 + role prefix 는 `cosmetics`**. forced-content 프론트가 signage 표준(`cosmetics`) 대신 membership 키(`k-cosmetics`)를 사용.

## 3. 수정 방향 (택1, 착수 시 결정)

- **(A·권장) 프론트 SERVICE_KEY 를 `cosmetics` 로 정합** — signage 도메인 표준(validServiceKeys + role prefix `cosmetics:`)에 맞춤. 변경 1곳([ForcedContentPage.tsx:17](../../services/web-k-cosmetics/src/pages/operator/signage/ForcedContentPage.tsx#L17)).
  - ⚠️ 착수 전 확인: K-cos 의 **다른 signage 경로**(playlist/videos/player 등 store 측)가 어떤 키를 쓰는지 — 본 smoke 에서 store signage 는 403(존재) 였고 400 아님 → 이미 `cosmetics` 쓸 가능성. forced-content 만 `k-cosmetics` 로 어긋났는지 확인.
- (B) 백엔드 `validServiceKeys` 에 `k-cosmetics` 추가 — 단 signage 가 이미 `cosmetics` 표준이면 키 이중화로 drift 유발. 비권장.

## 4. 검증 (착수 후)
- operator(`sohae2100` 등)로 `/operator/signage/forced-content` → 200 목록(빈 목록 포함), 400 소멸.
- KPA/GlycoPharm forced-content 회귀 없음 (각 서비스 키 유지).
- serviceKey 격리 유지(타 서비스 데이터 비노출).

## 5. 범위 / 금지
- 범위: K-cos forced-content serviceKey 정합 (가능하면 프론트 1곳).
- 금지: signage 도메인 serviceKey 표준 자체 재정의는 별도 검토 (Boundary Policy F6 — Broadcast=serviceKey). 본 WO 는 K-cos forced-content 정합 한정.
- 다른 세션 WIP 미포함.
