# WO-O4O-ADMIN-MENU-CONNECT-BATCH-2-V1 — CHECK

> **선행**: `IR-O4O-ADMIN-MENU-AND-ROUTE-NEXT-BATCH-SELECTION-V1` · `WO-O4O-ADMIN-MENU-CONNECT-READY-ONLY-V1` · `WO-O4O-ADMIN-HUB-NOTICES-CRASH-FIX-V1`
> **일자**: 2026-08-01 · branch `main` · 시작 HEAD `2bf638d05`
>
> **실제 변경 성격**: 메뉴 4개 신규 추가가 아니라 — **신규 3건 추가 + 기존 죽은 항목 1건 교체**

---

## 1. 시작 기준

| 항목 | 값 |
|---|---|
| branch | `main` |
| 시작 HEAD | `2bf638d05` |
| `git status` | 작업 트리에 **다른 세션의 HFF 산출물만** 존재 (미접촉) |
| 동기화 | `git pull --ff-only` → `Already up to date` |

**중지 조건 #2 확인**: 메뉴 파일의 최근 커밋은 `5fa30352e`(직전 배치, 본인 작업)로
**다른 세션이 동일 파일을 수정 중이지 않음**을 확인했다.

---

## 2. 기존 메뉴와 대상 route 재확인

| 대상 route | 존재 | 컴포넌트 | 파라미터 | guard | 직접진입·새로고침 | 조회 API |
|---|:--:|---|:--:|---|:--:|:--:|
| `/admin/yaksa` | ✅ | `YaksaAdminDashboard` | 없음 | `yaksa-admin.access` | ✅ | 호출 없음(정적 허브) |
| `/operator/hub-contents` | ✅ | `HubContentsPage` | 없음 | `admin·super_admin·operator` | ✅ | 200 |
| `/operator/approvals` | ✅ | `ContentApprovalsPage` | 없음 | `admin·super_admin·operator` | ✅ | 200 |
| `/operator/points` | ✅ | `PointSpendPage` | 없음 | `admin·super_admin` | ✅ | 200 |

**기존 `Yaksa (KPA)` 항목의 실제 구조 (선행 IR 보다 정밀)**

선행 IR 은 이를 "`Yaksa (KPA) → /admin/yaksa-hub`" 로 기록했으나, 실제로는
**`Yaksa (KPA)` 는 그룹이고 죽은 항목은 그 자식 `Service Dashboard`** 였다.

```
Yaksa (KPA)                      ← 그룹
 └ Service Dashboard  → /admin/yaksa-hub   ← 죽은 항목 (교체 대상)
```

교체 대상을 그룹이 아니라 **자식 항목**으로 정확히 특정해 진행했다.

**중복 확인**: 대상 4개 route 와 4개 메뉴명 모두 기존 메뉴에 **존재하지 않음**(교체 대상 제외).
메뉴 id `yaksa-hub` 를 참조하는 외부 코드도 **0건**이라 id 변경이 안전함을 확인했다.

---

## 3. 변경 전후 메뉴 구조

### Yaksa (KPA) 그룹

| 변경 전 | 변경 후 |
|---|---|
| **Service Dashboard → `/admin/yaksa-hub`** ❌죽은링크 | **지부/분회 관리자 센터 → `/admin/yaksa`** ✅ |
| 공급 자산 조회 → `/operator/kpa/snapshots` | **HUB 콘텐츠 → `/operator/hub-contents`** ✨신규 |
| Force Asset 관리 → `/operator/kpa/force-assets` | **콘텐츠 승인 → `/operator/approvals`** ✨신규 |
| | 공급 자산 조회 → `/operator/kpa/snapshots` (유지) |
| | Force Asset 관리 → `/operator/kpa/force-assets` (유지) |

요청한 순서(관리자 센터 → HUB 콘텐츠 → 콘텐츠 승인)대로 배치하고 기존 2항목은 그 뒤에 유지했다.

### Core 그룹 (Admin 거버넌스)

| 변경 전 | 변경 후 |
|---|---|
| RBAC Role Assignments · Service Operators · Membership · Members · Verifications | (동일 유지) |
| Platform Settings → `/settings` | **포인트 운영 → `/operator/points`** ✨신규 |
| | Platform Settings → `/settings` (유지, 맨 뒤) |

### 총계

| 항목 | 값 |
|---|---:|
| 변경 전 leaf | 44 |
| **변경 후 leaf** | **47** (+3) |
| 교체 | 1 (leaf 수 불변) |
| 중복 path·id | **0** |

---

## 4. 추가한 메뉴 3건과 교체한 메뉴 1건

| 구분 | 메뉴명 | route | 그룹 | id | 아이콘 |
|---|---|---|---|---|---|
| **교체** | 지부/분회 관리자 센터 | `/admin/yaksa` | Yaksa (KPA) | `yaksa-admin-center` | `LayoutDashboard` (기존 유지) |
| 신규 | HUB 콘텐츠 | `/operator/hub-contents` | Yaksa (KPA) | `yaksa-hub-contents` | `FileText` |
| 신규 | 콘텐츠 승인 | `/operator/approvals` | Yaksa (KPA) | `yaksa-content-approvals` | `ClipboardList` |
| 신규 | 포인트 운영 | `/operator/points` | **Core** | `core-points` | `Coins` |

아이콘은 기존 체계(lucide-react, `w-4 h-4`)를 그대로 따랐다. `Coins` 1개만 import 를 추가했다.
id 는 기존 규칙(`<그룹>-<기능>`)에 맞춰 고유하게 지정했다.

---

## 5. Yaksa 경로 교체 및 중복 방지

```diff
-       id: 'yaksa-hub',
-       label: 'Service Dashboard',
-       path: '/admin/yaksa-hub',
+       id: 'yaksa-admin-center',
+       label: '지부/분회 관리자 센터',
+       path: '/admin/yaksa',
```

| 확인 항목 | 결과 |
|---|:--:|
| 기존 항목을 **유지한 채 추가**하지 않았는가 | ✅ 교체 |
| 메뉴에 `/admin/yaksa-hub` 잔존 | **0건** (남은 문자열 2건은 설명 주석) |
| `Service Dashboard` 라벨 잔존 | **0건** |
| `/admin/yaksa*` 메뉴 항목 수 | **1개** |
| `/admin/yaksa-hub` **route 자체** 삭제 | ❌ **삭제 안 함** (요구대로 보존) |
| `yaksa-scheduler` 앱 활성화 | ❌ **변경 안 함** |
| `/admin/yaksa` 하위 화면 개별 메뉴 추가 | ❌ **추가 안 함** |

---

## 6. 포인트 운영의 Admin 그룹 배치

> **판단 근거 기록**: 이 메뉴에는 **`Admin` 이라는 이름의 그룹이 존재하지 않는다.**
> 최상위 그룹은 Overview / **Core** / O4O 상품 DB / Content / CMS / AppStore / Forum /
> [Services] Yaksa·Digital Signage / [Insights] … 이다.
>
> `Core` 가 RBAC Role Assignments · Service Operators · Membership · Platform Settings 를 담은
> **Admin 거버넌스 그룹**이므로 여기에 배치했다. CLAUDE.md §11 의
> "Admin = 구조 + 정책 + 거버넌스 + **금융**" 과 일치한다.
> **신규 최상위 그룹을 만들지 않았다**(메뉴 시스템 리팩터링은 제외 범위).

- 위치: `Core` 그룹 내 **Platform Settings 바로 앞** (운영 항목을 모으고 설정은 맨 뒤 유지)
- Yaksa 그룹에는 넣지 않았음을 테스트로 고정
- 화면 guard(`admin·super_admin`) **변경 없음** — 메뉴 노출을 위해 권한을 확대하지 않았다

---

## 7. 변경 파일

| 파일 | 성격 |
|---|---|
| `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx` | 메뉴 정의 (유일한 소스 변경) |
| `apps/admin-dashboard/src/tests/admin-menu-batch2.test.ts` | 신규 회귀 테스트 |
| `docs/checks/WO-O4O-ADMIN-MENU-CONNECT-BATCH-2-V1-CHECK.md` | 본 문서 |

**화면 컴포넌트·route·API·권한 파일 변경 0.**

---

## 8. typecheck · test · build

| 항목 | 명령 | 결과 |
|---|---|---|
| typecheck | `npx tsc --noEmit -p tsconfig.json` | **0 error** |
| 신규 메뉴 테스트 | `npx vitest run src/tests/admin-menu-batch2.test.ts` | **13 pass / 0 fail** |
| **전체 스위트** | `npx vitest run` | **154 pass / 0 fail** (8 파일) |
| build | `npm run build` | **성공** |

기존 vitest 인프라를 사용했고 새 프레임워크를 만들지 않았다. 테스트가 고정하는 것:

네 메뉴 항목 존재·경로 / **죽은 경로 `/admin/yaksa-hub` 제거** / `Service Dashboard` 제거 /
**Yaksa 항목 중복 없음(정확히 1개)** / 포인트 운영이 **Core 안, Platform Settings 앞** /
포인트 운영이 Yaksa 그룹에 없음 / 기존 9개 주요 메뉴 유지 / path·id 전역 고유 / leaf 총계 47.

> **테스트 작성 중 자체 교정 2건** — 결과 해석에 영향이 있어 기록한다.
> 1. label→path 를 앞에서부터 짝짓는 파싱은 **그룹 헤더에 path 가 없어** 라벨이 한 칸씩 밀렸다.
>    → 각 `path` 의 **바로 앞 label** 을 찾는 방식으로 교정.
> 2. "라벨 전역 유일" 단언은 틀린 전제였다. 기존 `Overview` 가 `/admin`·`/content`·
>    `/admin/reporting/dashboard` **3개 그룹에 정상적으로 중복 존재**한다.
>    → path·id 전역 유일 + **이번 배치 라벨의 유일성**으로 교정. 기존 메뉴 결함이 아니다.

---

## 9. 배포 workflow 와 배포 commit

| 항목 | 값 |
|---|---|
| 소스·테스트 commit | **`f45bd6f58`** |
| workflow | `Deploy Admin Dashboard (Cloud Run)` → **success** |
| 백엔드 배포 | **불필요** (백엔드 변경 0) |
| 다른 서비스 배포 | **없음** |

---

## 10. 네 메뉴의 클릭 · 직접 진입 · 새로고침 · 새 탭 검증

배포 후 프로덕션 read-only. **사이드바에서 실제로 클릭**해 확인했다.

| 메뉴 | 사이드바 표시 | 클릭 후 URL | 정확 | 렌더 | **활성 표시** | 콘솔 |
|---|:--:|---|:--:|:--:|:--:|:--:|
| 지부/분회 관리자 센터 | ✅ | `/admin/yaksa` | ✅ | ✅ | **active** | **0** |
| HUB 콘텐츠 | ✅ | `/operator/hub-contents` | ✅ | ✅ | **active** | **0** |
| 콘텐츠 승인 | ✅ | `/operator/approvals` | ✅ | ✅ | **active** | **0** |
| 포인트 운영 | ✅ | `/operator/points` | ✅ | ✅ | **active** | **0** |

| 메뉴 | 직접 URL | 새로고침 | 새 탭 딥링크 | 4xx·5xx | 크래시 |
|---|:--:|:--:|:--:|:--:|:--:|
| 지부/분회 관리자 센터 | ✅ | ✅ | ✅ | 없음 | 없음 |
| HUB 콘텐츠 | ✅ | ✅ | ✅ | 없음 | 없음 |
| 콘텐츠 승인 | ✅ | ✅ | ✅ | 없음 | 없음 |
| 포인트 운영 | ✅ | ✅ | ✅ | 없음 | 없음 |

렌더 내용 확인:

```
지부/분회 관리자 센터  →  "지부/분회 관리자 센터 · 소속 회원의 승인과 현황을 관리합니다" + 진입 카드 정상
HUB 콘텐츠           →  "HUB 콘텐츠 … 전체 59" 실데이터
콘텐츠 승인           →  "콘텐츠 승인 관리 … 공급자 자료/사이니지 캠페인" 탭 정상
포인트 운영           →  "포인트 운영 … 포인트 지급/차감" 폼 + 이력
```

> **검증 절차 교정 1건**: 첫 회차에서 2건이 `click=false` 로 나왔는데,
> 스크립트의 그룹 펼치기 로직이 **토글이라 매 반복마다 접었다 폈다** 한 탓이었다(메뉴 결함 아님).
> 각 대상마다 홈에서 시작하고 "보이지 않을 때만 한 번 펼치도록" 고쳐 재검증한 결과 **4/4 정상**이다.

---

## 11. 조회 API 와 콘솔 결과

| 항목 | 결과 |
|---|---|
| 네 화면의 4xx·5xx | **0건** |
| 네 화면의 콘솔 오류 | **0건** |
| 401·403·404·500 | **없음** |

---

## 12. 기존 메뉴 회귀 검증

| 메뉴 | route | 도달 | 크래시 | 비고 |
|---|---|:--:|:--:|---|
| 플랫폼 HUB | `/admin/platform/hub` | ✅ | 없음 | 403* |
| 매장 네트워크 | `/admin/store-network` | ✅ | 없음 | 403* |
| 오프라인 매장 | `/admin/physical-stores` | ✅ | 없음 | 403* |
| HUB 공지 | `/operator/hub-notices` | ✅ | 없음 | 콘솔 **0** (직전 WO 수정 유지) |
| 공급 자산 조회 | `/operator/kpa/snapshots` | ✅ | 없음 | 콘솔 **0** |
| Platform Settings | `/settings` | ✅ | 없음 | 403* |
| RBAC Role Assignments | `/users` | ✅ | 없음 | 403* |

> **\*403 은 이번 변경과 무관한 기존 백엔드 권한 응답**이다. 근거:
> ① 메뉴 설정 파일은 API 인가에 관여하지 않는다.
> ② **이번에 건드리지 않은 기존 메뉴**(`/settings`, `/users`)에서 **동일한 403** 이 나온다.
> ③ 모든 화면이 크래시 없이 렌더된다.
> 즉 이 배치가 만든 회귀가 아니며, 검증 계정의 권한 구성에서 비롯된 **선행 상태**다.

---

## 13. 제외 범위 준수

| 제외 항목 | 변경 |
|---|:--:|
| `/admin/membership/categories` 메뉴 연결 | **0** |
| `CategoryManagement.tsx` API prefix | **0** |
| `/operator/hub-notices` | **0** |
| `/admin/yaksa/accounting` 허브 카드 | **0** |
| 서비스 현황·개요 / 정산 화면 | **0** |
| `/tools` · `/store/pop` · `/active-users` | **0** |
| Yaksa Scheduler 앱 활성화 | **0** |
| 화면 컴포넌트 기능 | **0** |
| API·백엔드·인증·권한 | **0** |
| DB schema·migration·운영 데이터 | **0** |
| 공용 메뉴 시스템 리팩터링 | **0** |
| 중복·legacy route 정리 | **0** |

route alias·redirect·신규 route **생성 0**. 메뉴 클릭은 **기존 화면으로만** 이동한다.

---

## 14. API·백엔드·route·권한·DB 변경

| 항목 | 변경 |
|---|---:|
| 백엔드 | **0** |
| API 계약 | **0** |
| route 정의 | **0** |
| 권한·역할·가시성 조건 | **0** |
| DB | **0** |

---

## 15. 운영 쓰기 및 데이터 변경

| 항목 | 값 |
|---|---:|
| 생성·수정·삭제·승인 실행 | **0** |
| **포인트 지급·차감 실행** | **0** |
| 쓰기 endpoint 실행 | **0** |
| 운영 데이터 변경 | **0** |
| 민감정보 기록 | **0** |

포인트 운영 화면은 **렌더와 이력 조회만** 확인했고 지급·차감 버튼은 누르지 않았다.

---

## 16. 미검증 항목

- **포인트 지급·차감 실동작** — 금액성 운영 쓰기라 의도적으로 실행하지 않았다.
- **`yaksa-admin.access` 권한이 없는 계정**에서 지부/분회 관리자 센터 메뉴가 어떻게 보이는지
  (super_admin 1계정으로만 검증). 메뉴 가시성 조건은 변경하지 않았다.
- **operator 역할 계정**에서의 4개 메뉴 노출.
- `/admin/yaksa` **하위 화면**(회원 승인·회비 등) 개별 동작 — 허브 카드 존재만 확인.
- 회귀 화면의 **403 원인** — 이번 범위 밖(별도 조사 필요).

---

## 17. 최종 git status

```
내 산출물 3개 — 전부 commit·push 완료
  apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx
  apps/admin-dashboard/src/tests/admin-menu-batch2.test.ts   (신규)
  docs/checks/WO-O4O-ADMIN-MENU-CONNECT-BATCH-2-V1-CHECK.md  (신규)
HEAD...origin/main = 0 0
```

---

## 18. pnpm-lock.yaml 및 다른 세션 작업물

| 항목 | 상태 |
|---|---|
| `pnpm-lock.yaml` | **미변경·미포함** |
| HFF·OTC 작업물 | **미접촉** (트리에 남아 있으나 stage·수정·삭제 없음) |
| 기존 staged·미추적 파일 | **미접촉** |
| commit 방식 | 전부 `--only -- <pathspec>` 범위 제한 |

---

## 19. 최종 판정

| 항목 | 결과 |
|---|:--:|
| 신규 메뉴 3건 연결 | ✅ |
| 죽은 Yaksa 항목 교체 | ✅ |
| 중복 메뉴 발생 | ✅ **없음** |
| 포인트 운영 Admin(Core) 배치 | ✅ |
| 클릭·직접진입·새로고침·새 탭 | ✅ **4/4** |
| 기존 메뉴 회귀 | ✅ **없음** |
| 권한·API·DB 변경 | ✅ **0** |
