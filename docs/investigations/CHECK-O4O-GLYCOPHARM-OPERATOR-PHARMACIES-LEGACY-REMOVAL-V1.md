# CHECK-O4O-GLYCOPHARM-OPERATOR-PHARMACIES-LEGACY-REMOVAL-V1

> **작업명:** WO-O4O-GLYCOPHARM-OPERATOR-PHARMACIES-LEGACY-REMOVAL-V1
> **유형:** GlycoPharm operator IA 정비 — legacy `/operator/pharmacies` 축 제거 (frontend 전용)
> **판정: PASS** — operator canonical 을 `/operator/stores` 로 정렬, legacy `약국 관리` 메뉴·라우트 제거.
> 작성일: 2026-06-16

---

## 1. 배경 / 기준

GlycoPharm operator IA 는 KPA canonical 과 동일하게 **Stores / 매장 관리** 기준으로 정렬한다.

```
KPA canonical:        /operator/stores
GlycoPharm canonical: /operator/stores
GlycoPharm legacy:    /operator/pharmacies   ← 삭제 대상
```

- `/operator/pharmacies` 는 고쳐 살릴 대상이 아니라 제거할 legacy route.
- route/module 기준은 `stores`. 화면 문구는 서비스 특성상 "약국" 사용 가능.

## 2. 조사 결과 (web-glycopharm)

`/operator/pharmacies` 링크 잔존 = **메뉴 2곳 + 라우트 1곳** 뿐:

- `App.tsx` operator 블록 `<Route path="pharmacies" element={<PharmaciesPage />} />`
- `config/operatorMenuGroups.ts` `UNIFIED_MENU.stores` 의 `{ '약국 관리', '/operator/pharmacies' }`
- `config/operatorMenuGroups.ts` `OPERATOR_MENU_ITEMS.stores`(deprecated) 동일 항목

### 범위 밖(의도적 보존)
- **admin** `/admin/pharmacies` (`App.tsx` admin 블록 `<Route path="pharmacies">`) — admin "약국 네트워크" 로 admin 대시보드(`GlycoPharmAdminDashboard`)·`DashboardLayout` 에서 활성 링크. `PharmaciesPage` 컴포넌트를 admin 이 계속 소비하므로 **컴포넌트·lazy import·`glycopharmApi.getOperatorPharmacies`·api 타입 모두 보존**.
- `/glycopharm/reports/pharmacies` — Reports/Invoices/BillingPreview 의 약국 **필터 드롭다운 데이터 소스**(별개).
- store-management `PharmacyManagement`(`/management`), `pharmacies/me` — store 측 기능(별개).
- `/operator/store-approvals` — 매장 판매 참여 **승인** 기능(별개, 직전 WO 에서 수정).

## 3. 수정 파일 (frontend 전용, path-specific)

- `services/web-glycopharm/src/App.tsx`
  - operator 블록의 `<Route path="pharmacies" element={<PharmaciesPage />} />` **제거**(주석으로 사유 명기). admin 블록 동일 라우트는 **유지**. `PharmaciesPage` lazy import 는 admin 이 사용하므로 유지.
- `services/web-glycopharm/src/config/operatorMenuGroups.ts`
  - `UNIFIED_MENU.stores` 및 `OPERATOR_MENU_ITEMS.stores` 에서 `{ '약국 관리', '/operator/pharmacies' }` **제거**. `매장 관리(/operator/stores)` 가 첫 항목.

> backend / DB / migration / auth / route 구조(operator 라우트 외) **미변경**. KPA/KCos/Neture **0 변경**. `git add .` 미사용.

## 4. 처리 방식

- redirect 아님 — **완전 제거**. operator 메뉴에 `/operator/pharmacies` 노출 0, 내부 링크 0.
- `/operator/pharmacies` 직접 URL 접근은 operator 블록에서 매칭되는 라우트가 없어 자연 fall-through(404/대시보드) 처리.

## 5. 검증

| 대상 | 결과 |
|---|---|
| `tsc -b` (web-glycopharm 전체) | error **0** (EXIT 0) |
| `vite build` | ✅ built in 13.19s (EXIT 0) |
| grep `/operator/pharmacies` 링크 잔존(메뉴/라우트) | **0** |
| `PharmaciesPage` import 잔존(admin용) | 유지(정상) |

- 브라우저 smoke(operator 사이드바 매장 관리 → `/operator/stores`, `/operator/pharmacies` 미노출, console 0)는 배포 후 권장.

*Date: 2026-06-16 · operator legacy /operator/pharmacies 축 제거 · canonical=/operator/stores · admin /admin/pharmacies 보존 · backend 무변경 · tsc/vite PASS.*
