# WO-O4O-KCOSMETICS-ORDERS-NO-STORE-RESPONSE-FIX-V1

| 항목 | 값 |
|------|------|
| 작성일 | 2026-06-03 |
| 우선순위 | P1 |
| 상태 | **✅ 완료 (commit `b1b280bbf`, push 완료 — API Server 배포/검증 대기)** |
| 분류 | bug fix (backend SQL) |
| 근거 | `CHECK-O4O-KCOSMETICS-STORE-HUB-LIVE-SMOKE-V1` §7-3 (orders no-store 500) |

---

## 1. 정책 (WO 지시)
`/store/commerce/orders` 는 조회 화면 — 매장/주문 없음은 장애가 아니라 빈 상태. **A안: 200 + empty** 로 정상화. 미로그인/권한없음은 기존 auth/guard 유지.

## 2. ⚠️ 실제 근본 원인 (WO 가설과 다름 — DB 로그로 확정)

WO 가설은 "no-store 시 store-context 접근으로 500" 이었으나, **실제 원인은 store-context 와 무관한 SQL 쿼리 버그**다. 본 핸들러(`GET /cosmetics/orders`)는 **buyerId 기준 조회**이며 store-context 로직이 없다.

Cloud Run 로그:
```
[Cosmetics Order] List orders error: syntax error at or near "order"
QueryFailedError ... getManyAndCount
```
실패 SQL(요약):
```sql
... WHERE "order"."buyerId"=$1 AND "order"."orderType"=$2
    AND order.metadata->>'serviceKey' = $3 ) "distinctAlias" ...
```
- QueryBuilder alias 가 **PostgreSQL 예약어 `order`**.
- 단순 `alias.column`(`order.buyerId`)은 TypeORM 이 `"order"."buyerId"` 로 자동 quote 하지만, **raw JSONB fragment `order.metadata->>'serviceKey'` 는 자동 quote 대상이 아니어서 예약어 `order` 가 그대로 노출** → PostgreSQL 이 ORDER 키워드로 파싱 → **syntax error**.
- ⇒ **store 유무·계정 무관하게 orders 목록 조회가 항상 500.** (frontend 는 graceful 처리했으나 실제로 주문 목록이 한 번도 동작하지 않았음.)
- glycopharm 등 동일 alias 사용 컨트롤러는 JSONB raw fragment 가 없어 영향 없음 → cosmetics 고유.

## 3. 수정
- alias `'order'` → `'o'` (비예약어) 변경. `o.metadata->>'serviceKey'` 는 정상 파싱.
- **list 핸들러 + detail 핸들러** 동일 패턴(detail 도 `order.metadata->>'serviceKey'` raw fragment 보유 — 동일 잠재 버그)이라 함께 수정.
- 쿼리 정상화로 **주문 없는 사용자는 자동으로 200 + empty `data:[]`** → WO A안 충족 (별도 no-store 분기 불필요).
- 파일: [cosmetics-order.controller.ts](../../apps/api-server/src/routes/cosmetics/controllers/cosmetics-order.controller.ts) (list `createQueryBuilder` + where/andWhere/orderBy, detail `createQueryBuilder` + where/andWhere).

## 4. response shape
- 기존 유지: `{ success:true, data: StoreOrder[], pagination:{page,limit,total,totalPages}, filters }`. frontend `StoreOrdersResponse` 정합. frontend 무수정.

## 5. 변경하지 않은 것
주문 상태 변경 · billing/settlement · DB/migration · KPA/GlycoPharm/Neture · mock 데이터 · auth/guard 정책. **수정은 backend 1파일(alias)뿐.**

## 6. 검증
- TypeScript: `apps/api-server` `tsc --noEmit` → **EXIT 0**.
- 코드 기준: no-store throw 없음(원래 없음) · 200 empty shape 정합 · mock 미추가 · billing 무변경 · 타서비스 무변경.
- **live smoke: API Server 배포 후 진행** — `/store/commerce/orders` 500 소멸 + empty state, `/store/orders` alias redirect 동일 화면.

## 7. 커밋 / 배포
- commit `b1b280bbf` (cosmetics-order.controller.ts 1파일), push 완료.
- 배포: **Deploy API Server (Cloud Run)** (web 아님 — backend 변경). 배포 후 검증.

## 8. 남은 이슈 / 후속
- (관찰) 동일 reserved-alias + JSONB raw fragment 패턴이 다른 cosmetics 쿼리에 더 있는지 점검 후보.
- signage serviceKey 표준 통일 IR / cosmetics:store_owner 테스트 계정 확보 (별도).
