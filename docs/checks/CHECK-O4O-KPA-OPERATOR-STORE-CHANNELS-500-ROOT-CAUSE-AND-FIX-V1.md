# CHECK — 운영자 매장 채널 조회 500 근본 원인 규명 및 수정

> WO-O4O-KPA-OPERATOR-STORE-CHANNELS-500-ROOT-CAUSE-AND-FIX-V1
> 작업일: 2026-07-27
> 상태: **원인 규명(실 로그) → 최소 수정 → API 배포 GREEN → 실브라우저 재현/해소 확인 완료**

---

## 1. 실제 500 원인 (로그 기반)

Cloud Run 로그(`o4o-core-api`):

```
[StoreConsole] getStoreChannels error: column oc.approved_by does not exist
```

`organization_channels` 테이블/엔티티에는 **`approved_by` 컬럼이 없다** (`approved_at` 만 존재, 이후 `config` jsonb 추가). 그런데 `getStoreChannels` 의 raw SQL 이 `oc.approved_by` 와 `LEFT JOIN users u ON oc.approved_by = u.id`, `u.name as approved_by_name` 을 참조 → **접근 가능한 매장의 채널 조회가 항상 500**. 채널 0건/존재 여부와 무관하게 쿼리 자체가 컬럼 부재로 실패.

- 근거: create migration `20260215200001-CreateOrganizationChannels`(approved_at 만), entity `organization-channel.entity.ts`(approved_by 없음), 후속 migration 전수 grep 결과 `approved_by` 추가 이력 **NONE**.

## 2. 실패 route · service · query

- Route: `GET /api/v1/operator/stores/:storeId/channels` → `StoreConsoleController.getStoreChannels`.
- 실패 지점: [StoreConsoleController.ts:306](apps/api-server/src/controllers/operator/StoreConsoleController.ts#L306) raw SQL 의 `oc.approved_by` + `LEFT JOIN users`.
- 미들웨어: `authenticate` → `requireRole([platform/neture/glycopharm/cosmetics/kpa :admin·:operator])` → `injectServiceScope` 정상 통과(로그상 controller 진입 후 SQL 단계 실패).
- 접근 게이트 `assertStoreAccess`(enrollment 기반)는 통과 → 즉 접근 권한/404 문제가 아니라 **순수 컬럼 mismatch**.

## 3. 수정 내용

[StoreConsoleController.ts](apps/api-server/src/controllers/operator/StoreConsoleController.ts#L306) `getStoreChannels` 쿼리를 실제 스키마에 맞춰 정정:

- 제거: `oc.approved_by`, `u.name as approved_by_name`, `LEFT JOIN users u ON oc.approved_by = u.id`, serializer 의 `approvedBy`.
- 유지: `approved_at` → `approvedAt`. 응답 shape 보존 위해 `approvedByName: null` (스키마에 승인자 추적 자체가 없음 — 정직한 null).
- 프론트 `ChannelData` 는 `approvedByName` 을 렌더 컬럼에 사용하지 않음(channelType/등록일/상태/액션만) → UI 무영향.

`6 insertions / 6 deletions`, 단일 파일. **schema/entity 가 이미 정합하므로 migration 미생성** (WO 원칙).

## 4. 계약 (빈 목록 · 404 · 403 · 500)

| 상황 | 응답 |
|------|------|
| 존재/접근 가능 매장 + 채널 0건 | `200` + `channels: []` |
| 존재/접근 가능 매장 + 채널 존재 | `200` + 목록 |
| 미존재/스코프 밖 매장 | `404` (`assertStoreAccess` false — enrollment 기반 storeId↔serviceKey 경계) |
| 비운영자 역할 | `403` (`requireRole` 미들웨어) |
| DB·내부 오류 | `500` (catch) |

채널 없음을 404/500 으로 반환하지 않음. 임시 catch 로 500 을 빈 배열로 숨기지 않음(원인 제거로 해결).

## 5. 채널 상태 변경 경로 점검 (정적 — 변경 없음)

- `getAllChannels`(cross-store) → `store-channel.service.ts` raw SQL: `approved_at` 만 사용, `approved_by` 미참조 → **무영향**.
- `updateChannelStatus` → `store-channel.service.ts` repository `findOne({ where: { id: channelId, organization_id: organizationId } })`:
  - 존재하지 않는 channelId → `CHANNEL_NOT_FOUND` → 404.
  - **다른 매장 channelId 교차 변경 차단**: `id + organization_id` 복합 조건이므로 타 매장 채널은 findOne 미스 → 404 (컨트롤러가 선행 `assertStoreAccess(storeId)` 로 스코프도 게이트).
  - 상태 전이: `VALID_TRANSITIONS` 위반 → `INVALID_TRANSITION` → 400. 허용 상태(`APPROVED`/`SUSPENDED`/`TERMINATED`)만 컨트롤러 통과.
- **상태 전이 정책 자체는 변경하지 않음.**

## 6. 다른 서비스 · 소비처 영향

- 동일 컨트롤러 `getStoreChannels` 는 **모든 서비스 운영자 매장 상세 공용**(KPA/Neture/GlycoPharm/K-Cosmetics/플랫폼 운영자). 이 500 은 모든 서비스에서 동일하게 발생하던 공용 버그였고, 수정도 전 서비스에 공통 적용됨(회귀 아니라 공통 복구).
- `getAllChannels`/`updateChannelStatus`(service) 미변경 → 매장 본인 채널 관리·채널 관리 화면 무영향.
- 프론트 조회 실패 계약(직전 WO 배포)은 유지 — 이제 정상 경로가 200 이므로 섹션 오류가 뜨지 않음.
- 배치·스크립트: `organization_channels` 에 `approved_by` 참조 스크립트 없음(grep 확인).

## 7. 배포 · 실브라우저 smoke

- API 배포: `Deploy API Server (Cloud Run)` run `30234338204` (headSha `785c05408`) → **GREEN** (Deploy + migrations + Verify 모두 통과). KPA 웹 재배포 불필요(백엔드 전용 수정).
- 실브라우저(`kpa-society-web`, KPA operator `sohae2100`, 직전 500 이 발생하던 `테스트 약국` `c92b857f…`):
  - 배포 전(직전 WO smoke): 채널 섹션 **"Failed to fetch store channels" + 다시 시도**(섹션 오류).
  - 배포 후(본 WO): 채널 섹션 **"채널 상태 (0)" + DataTable(액션/채널/등록일/상태) + "등록된 채널이 없습니다"** 정상 렌더. **500 → 200+[] 로 해소.** 채널 관련 콘솔 오류 없음. 매장 정보·기능(10)·매장 상품 정상.
  - 채널 상태 변경 live smoke: 테스트 매장 3곳 모두 채널 0건이라 전이 실행 불가 → **정적 검증(§5)으로 갈음**.

## 8. 데이터 보정 · migration 여부

- **migration 없음, 데이터 보정 없음.** 스키마(`approved_by` 부재)와 엔티티가 이미 정합이었고, 결함은 오직 쿼리의 잘못된 컬럼 참조였다. 데이터 손상 아님(중지 조건 §"데이터 한 건 손상" 해당 없음).

## 9. 커밋 SHA

- 수정: **`785c05408`** — `fix(operator-store): getStoreChannels 500 — drop phantom approved_by column`.
- (CHECK 문서 커밋 별도)
