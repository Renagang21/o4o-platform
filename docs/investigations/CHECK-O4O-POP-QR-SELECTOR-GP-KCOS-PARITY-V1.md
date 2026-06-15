# CHECK-O4O-POP-QR-SELECTOR-GP-KCOS-PARITY-V1

> **작업명:** WO-O4O-POP-QR-SELECTOR-GP-KCOS-PARITY-V1
> **유형:** GP/KCos POP 제작 화면 QR 선택 parity (frontend only). backend/DB/generate **무변경**.
> **결과: PASS — GP/KCos StorePopPage 에 QR 선택(select) 추가 + POP generate payload 에 `qrId` 전달. QR 미선택 시 기존 흐름 유지. typecheck(GP/KCos) 0. backend/generate 무변경(qrId 이미 수용).**
> 선행: `IR-O4O-QR-CODE-PRODUCTION-FLOW-AUDIT-V1`(D) · `WO-O4O-QR-EDITOR-GP-KCOS-PARITY-V1` — 2026-06-15

---

## 1. 배경

IR(D): KPA StorePopPage 는 QR selector(selectedQrId → generate qrId) 보유, **GP/KCos 는 부재**. backend `/pharmacy/pop/generate` 는 `qrId` 를 이미 수용(공통 컨트롤러, store-pop.controller). 본 WO 가 GP/KCos frontend parity.

## 2. 변경 (2 파일, frontend only)

| 파일 | 변경 |
|------|------|
| `web-glycopharm/src/pages/store-management/StorePopPage.tsx` | `getStoreQrCodes`(storeProductionSources) import · `qrCodes`/`selectedQrId` state + useEffect 조회(.catch→[]) · "QR 연결(선택)" select 섹션(qrCodes 있을 때) · generate payload `...(selectedQrId ? { qrId } : {})` |
| `web-k-cosmetics/src/pages/store/StorePopPage.tsx` | 동 |

- QR 목록 = 기존 `getStoreQrCodes`(GET /{svc}/pharmacy/qr) 재사용 — 신규 client 불요.
- 조회 실패 시 `setQrCodes([])` → QR 섹션 미표시, POP 제작 정상.
- KPA(StorePopPage) 미변경(이미 보유).

## 3. 검증

- **TypeScript 0 errors:** `web-glycopharm` · `web-k-cosmetics`.
- **정적:**
  - QR 목록 조회(getStoreQrCodes) → select → `selectedQrId` → generate payload `qrId`(선택 시만).
  - QR 미선택 → qrId 미전달 → 기존 generate 동작 유지. 조회 실패 → 섹션 미표시(크래시 없음).
  - 기존 payload(supplierItemIds/layout/templateId/aiContent) · POP 콘텐츠 저장 · prefillPop 흐름 **유지**.
  - **backend/DB/route/generate 변경 0** — generate 가 qrId 이미 수용(store-pop.controller). 동시 세션 WIP 미접촉.
- **무변경:** store_qr_codes · generate 로직 · QR 생성/편집 · cross-content · AI/통계.
- **browser smoke:** 미수행 — dev 서버·인증 guard. select→payload 는 typecheck + KPA 동형. **배포 후 권장:** GP/KCos `/store/marketing/pop` → QR 선택 → POP 생성 → PDF 에 QR 표시 확인.

## 4. 중단 기준 점검

QR 목록 shape(getStoreQrCodes items)·generate payload 구조 KPA 동형 확인 → 무리 없음. POP 저장/prefill 흐름 무영향(추가 state/section 만).

## 5. 완료 판정

**PASS.** GP/KCos POP 제작에서 QR 선택 → POP PDF 삽입 parity 확보. backend/generate 무변경(qrId 기존 수용), 기존 POP 흐름 유지, typecheck 통과.

## 6. 후속

1. (배포 후) GP/KCos POP+QR 생성 smoke(PDF 에 QR 표시).
2. (선택) QR cross-content linkage(blog/snapshot/direct) · AI/통계 parity · StorePopPage/StoreQrPage dup 공통화.
3. (제안) 전체 제작 프로세스(상품/POP/QR/블로그/사이니지/안내문) 재조사로 잔여 drift 정비.

---

*Date: 2026-06-15 · GP/KCos POP-QR selector parity PASS · getStoreQrCodes 재사용 + generate payload qrId. QR 미선택 시 기존 유지. backend/generate 무변경. typecheck(GP/KCos) 0. 배포 후 smoke 권장.*
