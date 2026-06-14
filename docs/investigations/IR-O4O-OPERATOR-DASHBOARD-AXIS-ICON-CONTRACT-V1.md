# IR-O4O-OPERATOR-DASHBOARD-AXIS-ICON-CONTRACT-V1

> WO-O4O-OPERATOR-DASHBOARD-AXIS-ICON-CONTRACT-LUCIDE-V1 조사·구현 기록
> 작성일: 2026-06-14 · 선행: IR-O4O-KCOS-ICON-CORE-AUDIT-V1 §5(OperatorAxis 보류 결정)

## 1. 배경

K-Cosmetics 아이콘 정비(commit `474cabffa`)에서 `OperatorDashboard` 축 아이콘(🏪📋)은 **4개 서비스 공유 core 계약**이라 보류했다. 본 작업은 그 계약을 emoji string → lucide 렌더로 전환한다.

## 2. 계약 구조

- 정의·렌더: [AxisNavigationSection.tsx](../../packages/operator-core-ui/src/dashboard/AxisNavigationSection.tsx) (`operator-core-ui`)
  - `OperatorAxisGroup.icon?: string` — 렌더는 기존 `{axis.icon && <span>{axis.icon}</span>}` (raw, 매핑 없음)
  - `operator-core-ui` 는 **F1 freeze 대상 아님** (frozen: operator-ux-core / admin-ux-core 등)
  - 패키지는 `src/index.ts` 직접 export(빌드 dist 없음) → 소비처가 소스 직접 사용

## 3. 채택 방식 (사용자 확정: A안)

`icon: string` **타입 무변경** + name-map + emoji fallback — 기존 `operator-ux-core/ActionIcon` 선례 그대로.
- 매핑 name → lucide 컴포넌트 / 미매핑 ASCII → 생략 / 비-ASCII(emoji) → 그대로(미전환 config 하위호환)
- **하위호환**: 서비스 config 미전환 상태에서도 emoji fallback 으로 깨지지 않음 → 무중단 점진 전환
- `iconName` union 신설(원안)은 계약 변경 + emoji fallback 부재로 채택 안 함

`AxisNavigationSection` 에 로컬 `AxisIcon` 헬퍼 + `AXIS_ICON_MAP` 추가(operator-ux-core ActionIcon 과 동일 정책, cross-package 의존 회피 위해 로컬 map).

## 4. 전환 내역 (4개 서비스, 8 축)

| 서비스 | 축 title | 기존 | → name | lucide |
|--------|----------|:---:|--------|--------|
| K-Cos | 매장 HUB 운영 | 🏪 | `store` | Store |
| K-Cos | 콘텐츠 운영 | 📋 | `clipboard-list` | ClipboardList |
| Neture | 공급·유통 운영 | 📦 | `package` | Package |
| Neture | 콘텐츠·커뮤니티 운영 | 📋 | `clipboard-list` | ClipboardList |
| GlycoPharm | 커뮤니티 운영 | 💬 | `message-square` | MessageSquare |
| GlycoPharm | 약국 HUB 운영 | 🏥 | `building-2` | Building2 |
| KPA | 커뮤니티 운영 | 💬 | `message-square` | MessageSquare |
| KPA | 매장 HUB 운영 | 🏪 | `store` | Store |

## 5. 범위 외

- `web-kpa-society/.../KpaOperatorDashboardPage.tsx:177` `icon: '👥'` — **StructureAction**(admin quick action)이지 axis 아님. core `ActionIcon`(name-map 보유)이 렌더 → `users` 로 정렬 가능하나 본 WO(축) 범위 밖. `WO-O4O-ADMIN-QUICKACTION-FRONTEND-CONVERGE` 영역.

## 6. 검증

- `web-k-cosmetics` / `glycopharm-web` / `web-neture` / `web-kpa-society` tsc --noEmit: **전부 PASS** (operator-core-ui 소스 포함 컴파일)
- 계약 타입 무변경 → 소비처 타입 회귀 0
- 화면 smoke: 배포 후 각 `/operator` 대시보드 축 아이콘 lucide 표시 확인 권장(4 서비스 deploy 대상)
