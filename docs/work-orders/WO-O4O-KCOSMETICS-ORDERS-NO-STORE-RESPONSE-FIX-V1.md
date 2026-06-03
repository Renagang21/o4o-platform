# WO-O4O-KCOSMETICS-ORDERS-NO-STORE-RESPONSE-FIX-V1

| 항목 | 값 |
|------|------|
| 작성일 | 2026-06-03 |
| 우선순위 | P1 |
| 상태 | **⚠️ 부분 완료 (alias fix 배포·검증 = syntax error 소멸, commit `b1b280bbf`). 단 orders 목록은 더 깊은 갭 `relation "ecommerce_orders" does not exist`(프로덕션 테이블 부재)로 여전히 500 — DB/install 영역, 별도 승인 필요. §9 참조** |
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

## 9. 배포 후 검증 — alias fix 확인 + 더 깊은 갭 발견 (2026-06-03)

API Server 배포 success (run 26873017495, commit b1b280bbf, 리비전 `o4o-core-api-01983-l9d` 100% 서빙). 라이브 재검증:

- ✅ **alias fix 작동 확인**: 프로덕션 로그의 생성 SQL 이 `FROM "ecommerce_orders" "o" ... AND o.metadata->>'serviceKey'` 로 바뀜 → **"syntax error at or near order" 완전 소멸**. 본 WO 의 수정은 정확했다.
- ❌ **그러나 orders 목록 여전히 500** — 동일 요청에서 syntax error 대신 **새 에러 노출**:
  ```
  error: relation "ecommerce_orders" does not exist
  ```
  (cache-buster 직접 호출로 재현, 리비전 01983 한정 로그 확인.)
- **해석**: 그동안 syntax error 가 파싱 단계에서 먼저 터져 이 문제를 가리고 있었다. alias 정상화로 파싱이 통과하자 **프로덕션 DB 에 `ecommerce_orders` 테이블이 없다**는 사실이 드러남. 즉 cosmetics orders 목록은 **처음부터 한 번도 동작한 적 없음**(1차 syntax → 2차 missing table).
- 엔티티는 `@Entity('ecommerce_orders')`(public). 테이블 생성은 ecommerce-core lifecycle `install.ts` 담당, 마이그레이션들은 ALTER 만. → **install/마이그레이션 갭으로 base 테이블 미생성**(또는 search_path 밖) 추정.

### 남은 블로커 (별도 WO + 승인 필요)
- `ecommerce_orders` / `ecommerce_order_items` (및 연관) **프로덕션 테이블 생성** 필요 — ecommerce-core install 실행 또는 base 마이그레이션. **DB 변경이므로 CLAUDE.md §0 상 사용자 승인 필수.** 본 WO 범위(DB/migration 제외) 밖.
- 후속 WO 후보: `WO-O4O-ECOMMERCE-ORDERS-TABLE-PROVISION-V1`(가칭) — 영향 범위(cosmetics 뿐 아니라 glycopharm/checkout 등 ecommerce-core 주문 전반) 조사 선행.
