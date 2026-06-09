# IR-O4O-STORE-GUIDE-REAL-WORKFLOW-AUDIT-V1

> **유형**: Investigation Report / Audit (조사 전용 — 코드/Guide/route/문안 변경 없음)
> **일자**: 2026-06-08
> **목적**: O4O 각 서비스 Guide가 매장 경영자의 실제 제작·활용·구매 흐름을 충분히 설명하는지 조사. 특히 Neture `/seller/qr-guide` 정합성.
> **전제**: 서비스를 억지로 구분하지 않음. 각 서비스 안에서 매장 경영자 흐름이 자연스러운지가 기준. 미구현 기능을 완료처럼 보지 않음.

---

## 1. 조사 목적
QR/POP/블로그/사이니지/제작자료/전자상거래가 **기능 목록이 아니라 업무 흐름**(어디서 시작→무엇 선택→템플릿→수정→결과물→매장 활용→재사용)으로 안내되는지, 그리고 Guide 문안이 실제 코드와 일치하는지 검증한다.

## 2. 조사 범위
Neture/KPA/GlycoPharm/K-Cosmetics 4개 서비스의 매장 제작·구매 기능 코드 + Guide copy + 라우트.

---

## 3. ★핵심 발견 — 기능과 Guide가 서비스를 가로질러 어긋나 있다

| | 매장 제작 기능 실제 구현 | 매장 Guide 문안 |
|---|:---:|:---:|
| **Neture** | 🔴 거의 없음 (QR 독립 생성기뿐) | 🟢 for-seller **11섹션** (POP/QR/블로그/사이니지/제작자료 다 설명) |
| **KPA** | 🟢 완비 (QR/POP/블로그/사이니지/제작자료) | 🟡 for-store-owner 6섹션 |
| **GlycoPharm** | 🟢 완비 (QR만 FE 미완) | 🔴 매장 guide 없음 |
| **K-Cosmetics** | 🟢 완비 (commerce 미완) | 🔴 매장 guide 없음 |

→ **Neture는 가이드가 기능을 앞지르고(E), KPA/GP/KCos는 기능이 가이드를 앞지른다(D).** 매장 제작 도구의 canonical 구현처는 **Neture가 아니라 store 서비스(KPA/GP/KCos)** 다.

### 실제 제작 기능 매트릭스 (코드 실측)
```
                 KPA            GlycoPharm        K-Cosmetics      Neture
 QR 제작         있음           부분(BE만,FE미완)  있음             없음(독립 생성기)
 POP 제작        있음           있음              있음             없음
 블로그 작성     있음           있음              있음             없음(BLOG-RETIRE)
 사이니지        있음           있음              있음             부분(읽기전용)
 제작자료 목록   있음           있음(부분)         있음             없음
```
- 저장소: `kpa_store_contents`(canonical "Store Production Material") + `store_execution_assets`(usage_type: pop/qr/signage/banner/notice) + `store_asset_derivations`(원본↔파생 추적).
- 공통 컨트롤러: `createStoreContentController` (`/api/v1/{kpa|glycopharm|cosmetics}/store-contents`). **neture.routes 는 미마운트.**

---

## 4. QR-code Guide 문제점 (질문 A)

### Neture `/seller/qr-guide` ([SellerQRGuidePage.tsx](services/web-neture/src/pages/SellerQRGuidePage.tsx))
- 실제 기능: **독립 QR 생성기** — 템플릿(3) + 대상(4) 선택 → `qrcode.react` QRCodeCanvas 로 QR 생성 → PNG 다운로드/인쇄. **서버 저장 없음, 매장허브/내매장/제작자료와 미연결.**
- IR이 기대한 흐름(콘텐츠·상품 선택 → 템플릿 → 문구 수정 → 제작 → **저장** → 인쇄 → **제작자료 재사용**)은 **Neture엔 없음**. 그 흐름은 KPA/GP/KCos `StoreQRPage`(store_execution_assets + derivation 연결)에 존재.
- 데드링크: `/seller/qr-guide` route 실재(App.tsx). 단 페이지가 가리키는 `/seller/overview/*` 링크 실재 여부는 별도 확인 필요(경미).
- **판정: C (문안/페이지가 실제 매장 제작 흐름과 불일치).** Neture QR은 "생성기" 수준이며, 가이드가 암시하는 "제작자료 연계 제작 흐름"은 미구현.

### KPA/GP/KCos QR
- `StoreQRPage` 실제 제작 흐름 보유(GP는 BE만, FE 미완). 그러나 이 흐름을 설명하는 **단계형 Guide는 없음** → 판정 D(기능 있고 가이드 없음).

---

## 5. POP 제작 Guide 현황 (질문 B)
- **Neture**: POP 제작 기능 **없음**. for-seller #pop 섹션은 "POP는 매장의 가장 기본 자료"로 활용을 설명 → **E (없는 기능을 완료처럼)**.
- **KPA/GP/KCos**: `StorePopPage` 실재(템플릿/PDF 출력/QR 포함 selectedQrId). 제작 흐름 Guide 없음 → **D**.

## 6. 블로그 제작 Guide 현황 (질문 C)
- **Neture**: 블로그 기능 **제거됨**(WO-O4O-NETURE-BLOG-RETIRE-V1). for-seller #blog 는 "제공된 블로그 활용"으로 설명 → **E**(또는 정책상 의도, 단 문안은 제작 가능처럼 읽힘).
- **KPA/GP/KCos**: 블로그 작성 페이지 실재(PharmacyBlogPage / StoreBlogPage / StoreBlogManagePage). derivation으로 블로그→QR 연결됨. Guide 없음 → **D**.

## 7. 전자상거래 Guide 현황 (질문 D)
- **Neture commerce는 실제 구현됨**: [StoreProductPage](services/web-neture/src/pages/store) → [StoreCartPage](services/web-neture/src/pages/store)(localStorage) → `POST /seller/orders` → **NetureOrder**(7-Gate 검증) → [StoreOrdersPage](services/web-neture/src/pages/store). Event Offer/일반/승인상품 **단일 카트·주문 흐름**으로 통합(distributionType 분기).
  - ⚠ **checkoutService.createOrder() 미사용** — 독립 NetureOrder(near-term 경계, 기존 CHECK와 일치).
  - ⚠ Cart의 공급자별 배송비는 **"안내 정보, 실제 결제 반영 별도"** — FE 표시 ≠ BE 계산.
  - ⚠ 이벤트오퍼 fulfillment 주문은 통합 주문에 미포함(기존 CHECK GAP).
- **Guide**: `store.order.list` 는 fallback 메시지뿐, **상품상세→수량→장바구니→공급자별금액→배송비→결제→공급자확인→배송→매장확인 단계 Guide 없음** → 판정 B(흐름 설명 부족).
- **KPA**: checkout_orders(Checkout Core) 기반 cart/order 있음. **GlycoPharm**: B2C(StoreCart)+B2B(B2BOrderPage). **K-Cosmetics**: 주문 페이지 placeholder, **cart/checkout 미완** → 코드 격차.

## 8. 제작 자료 관리 Guide 현황 (질문 E)
- **KPA/GP/KCos**: `StoreProductionMaterialsPage`(/library/production-materials) 실재 + `store_asset_derivations` 로 **블로그→QR / 상품→POP / POP→QR포함** cross-link **실제 구현**. 즉 "고립" 아님.
- **Neture**: 제작자료 목록 **없음**.
- **Guide**: 어느 서비스도 "제작자료 재사용·연결" 흐름을 설명하지 않음 → 기능(KPA/GP/KCos)은 있으나 안내 부재.

## 9. Guide Home / IA 문제점 (질문 F)
- **Neture**: Guide Home 섹션6(판매자/매장) + for-seller 11섹션 존재. 그러나 **설명하는 제작 기능 대부분이 Neture에 없음** → IA는 있으나 내용이 기능과 불일치.
- **KPA**: Features에 매장운영(step06) + `/guide/for/store-owner`(6섹션) 있음 — 4서비스 중 가장 정합.
- **GlycoPharm**: Features 매장운영(step04) 있으나 매장 전용 guide·route 없음.
- **K-Cosmetics**: Features에 **매장 항목 자체 없음**, 매장 guide 없음 — 가장 빈약.
- **Workspace→Guide 백링크**: Neture만 직전 WO로 추가. **KPA/GP/KCos 0건.**
- 제목 관점: "QR Guide"→"QR 제작과 매장 활용", "전자상거래"→"상품 주문과 배송 확인" 등 사용자 관점 재명명 여지(권고).

## 10. 실제 코드와 Guide 문안 불일치 (요약)
| 항목 | 불일치 | 분류 |
|------|--------|:----:|
| Neture for-seller #pop/#blog | 기능 없음 + 활용 설명 | **E** |
| Neture #qr / qr-guide | 독립 생성기인데 제작·재사용 흐름 암시 | **C** |
| Neture #signage | 읽기전용인데 "매장이 띄운다" | **D/C** |
| Neture commerce | 구현됐으나 단계 Guide 부족 | **B** |
| KPA/GP/KCos QR·POP·블로그·사이니지·제작자료 | 기능 있으나 Guide 없음 | **D** |
| KCos commerce | cart/checkout 미완 | 코드 격차 |
| 제작물 cross-link(derivation) | 구현됐으나 미설명 | **D** |

## 11. 서비스별 특이사항
- **Neture = 공급자/허브 서비스**(neture.co.kr). 실제 "매장"은 KPA/GP/KCos. → Neture가 매장 제작 도구를 갖지 않는 것은 **정상일 수 있음**. 그렇다면 Neture for-seller의 제작 섹션은 **과대 약속**이며 정직화 필요.
- **KPA = reference implementation** — 매장 제작 풀스택 + 6섹션 가이드. service-neutral 가이드의 기준점.
- **GlycoPharm** — 기능 완비, 가이드 공백(QR FE 미완).
- **K-Cosmetics** — 기능 대부분 있으나 commerce 미완 + 가이드 공백.

---

## 12. 즉시 문안 수정 가능 항목 (코드 불요)
1. **Neture `/seller/qr-guide` 문안** → 실제(독립 QR 생성기: 템플릿/대상→생성→다운로드/인쇄)에 맞게 교체. 없는 "제작자료 저장·재사용" 표현 제거.
2. **Neture for-seller #pop/#blog/#signage** → Neture 미제공 기능은 "이 기능은 매장 서비스(약국/매장)에서 제공"으로 정직화하거나 섹션 톤 조정(미구현을 완료처럼 쓰지 않기).
3. (KPA) for-store-owner 6섹션에 QR/POP/블로그/제작자료 **흐름 단계** 보강(기능 실재).

## 13. 코드 보강 필요 항목 (별도 WO)
1. **K-Cosmetics commerce(cart/checkout) 완성** — 매장 구매 흐름 미완.
2. **GlycoPharm QR FE 페이지** 구현(BE 컨트롤러는 마운트됨).
3. (Neture) 매장 제작 도구 도입 여부는 **정책 결정** — Neture가 store 서비스가 아니라면 불필요. for-seller 가이드 존치/축소 판단 선행.
4. 이벤트오퍼 fulfillment 통합 주문(기존 CHECK 후속) — 본 IR 범위 밖.

## 14. 후속 WO 제안 (우선순위)
1. **WO-O4O-NETURE-SELLER-QR-GUIDE-FLOW-REWRITE-V1** — Neture qr-guide 문안을 실제 기능에 맞게 교체 + for-seller 제작 섹션 정직화. (즉시·문안, 최우선)
2. **WO-O4O-STORE-GUIDE-PRODUCTION-MATERIALS-FLOW-V1** — 기능이 실재하는 **KPA/GP/KCos** 기준 매장 제작 흐름(QR/POP/블로그/사이니지/제작자료) service-neutral 가이드 작성.
3. **WO-O4O-STORE-GUIDE-BLOG-POP-QR-CROSS-LINK-V1** — derivation 기반 제작물 연결(블로그→QR→POP→사이니지) 흐름 설명.
4. **WO-O4O-STORE-COMMERCE-GUIDE-FLOW-V1** — 상품→장바구니→주문→배송 단계 가이드(단 checkoutService 경계·KCos 미완 주의).
5. **WO-O4O-STORE-WORKSPACE-GUIDE-BACKLINK-V2** — KPA/GP/KCos 매장 화면에 백링크(Neture 패턴 확장).
6. (코드) KCos commerce / GP QR FE 보강 — 별도 구현 WO.

## 15. 최종 판정
1. **`/seller/qr-guide` 문제 확정**: Neture QR은 독립 생성기이며, 가이드가 암시하는 "콘텐츠 선택→제작→저장→재사용" 흐름은 Neture에 없다(C). 그 흐름의 실제 구현처는 KPA/GP/KCos.
2. **가이드↔기능 어긋남이 서비스를 가로지른다**: Neture는 없는 기능을 설명(E), KPA/GP/KCos는 있는 기능을 설명 안 함(D).
3. **다음은 신규 가이드 남발이 아니라**: (a) Neture 문안 **정직화**(즉시), (b) 기능 보유 서비스(KPA/GP/KCos) 기준 매장 제작 흐름 가이드, (c) commerce 단계 가이드 + KCos 코드 보강.
4. **문안 수정만 가능 vs 코드 보강 필요** 분리 완료(§12·§13). Neture 매장 제작 도구 도입 여부는 정책 결정 선행(Neture=허브 서비스 성격).

> 본 IR은 코드 무변경. 후속은 §14 우선순위대로 1차 Neture qr-guide 정직화부터.
