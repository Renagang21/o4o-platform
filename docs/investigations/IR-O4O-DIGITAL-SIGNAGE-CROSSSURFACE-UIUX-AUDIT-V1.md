# IR-O4O-DIGITAL-SIGNAGE-CROSSSURFACE-UIUX-AUDIT-V1

> **유형:** 조사 IR (read-only audit)
> **목적:** KPA Society 기준으로 디지털사이니지가 노출되는 모든 surface(커뮤니티 / 매장 허브 / 내 매장 / 운영자)를 조사하고, 서비스 간 UI-UX·용어·동작·데이터 흐름 차이를 확인한다.
> **작성:** 2026-06-13 (재생성 2026-06-13 — 최초본이 병렬 세션 git 작업으로 유실되어 동일 내용 복원)
> **선행 baseline:** `docs/baseline/KPA-SIGNAGE-STRUCTURE-V1.md` (Frozen, 2026-04-17)

---

## ⚠️ 핵심 정정

> 당초 전제 "Neture 는 디지털사이니지 없음 → N/A" 는 **사실과 달랐다**. 조사 결과 Neture 에 signage surface(operator/admin 콘솔 + supplier + community + seller)가 실제로 존재했다.
>
> **후속 결정(사용자):** Neture 디지털사이니지는 **삭제 대상**으로 전환. KPA/GP/KCos signage 는 유지·공통화. shared signage core/backend 는 유지.
> → 본 IR 의 "Neture 포함 공통화" 권고는 **`WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1` 로 대체**되었다. (제거 결과: `CHECK-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1.md`)

## 1. 조사 개요

디지털사이니지는 O4O 매장 실행 자산(broadcast 도메인)의 한 축이며, 동일 기능이 커뮤니티 / 매장 허브 / 내 매장 / 운영자 4개 surface 에 분산. 4개 병렬 read-only 탐색으로 서비스별 drift 를 조사.

## 2. 조사 대상 / 제외

| 서비스 | 당초 분류 | 실제 결과 |
|--------|:--:|------|
| KPA Society | 포함(기준) | ✅ 4 surface LIVE (가장 풍부, baseline frozen) |
| GlycoPharm | 포함 | ✅ 4 surface LIVE |
| K-Cosmetics | 포함 | ✅ 3 surface LIVE (커뮤니티 없음) |
| Neture | 제외/N/A | ⚠️ operator/supplier/community/seller signage 존재 → **삭제 결정** |

## 3. route / surface 매트릭스

| surface | KPA | GP | KCos | Neture(삭제 전) |
|---------|:--:|:--:|:--:|:--:|
| 커뮤니티 | ✅ `/signage` 풍부 | ✅ 링크만 | ❌ 없음 | ✅ CommunitySignagePage(미라우팅) |
| 매장 허브 | ✅ `/store-hub/signage` | ✅ | ✅ | — (supplier 대체) |
| 내 매장 | ✅ `/store/marketing/signage` 3탭 | ✅ 2탭 | ✅ 1탭 | ✅ `/supplier/signage/manage` |
| 운영자 | ✅ `/operator/signage/*` +forced | ✅ +content | ✅ | ✅ `/operator|/admin/signage/*` |
| 공개 재생 | ✅ `/public/signage` | (미확인) | (미확인) | — |

## 4. 컴포넌트 / 공통화 현황

- **shared:** `@o4o/shared-space-ui` → `SignageManagerTemplate`(GP/KCos/KPA 커뮤니티), `SignageHubTemplate`(GP), `SignageIcon`. `@o4o/types/signage`(전 서비스). `@o4o-apps/digital-signage-core`(백엔드).
- **local copy(공통화 안 됨):** 매장 허브 페이지 3개(KPA/GP/KCos 거의 동일), operator HQ 콘솔 4서비스 거의 동일, 내 매장 StoreSignagePage 구조 분기(3/2/1탭).

## 5. UI-UX / 용어 drift

- **내 매장 탭 수 3/2/1 불일치** (KPA 최완성, KCos 최간소) — 최대 구조 drift.
- **화면명**: "사이니지 운영"(KPA·GP) vs "사이니지 플레이리스트"(KCos), 기능명 "디지털 사이니지"/"사이니지" 흔들림.
- **CTA**: "내 약국에 추가"(GP) vs "내 매장에 추가"(KPA·KCos) — 도메인 문구(정책성).
- **KCos 깨진 route** `/partner/signage/content` — cleanup 후보.
- **강제 송출 vs 강제노출** 표기 흔들림.

## 6. 데이터 흐름

단일 backend core(`@o4o-apps/digital-signage-core`), `serviceKey` 1차 경계(+store `organizationId`) — CLAUDE.md Broadcast 계약 일치. 상태 머신 `draft→pending→active→archived`(operator 승인), store 는 `active` global read-only 소비. Hub→Store 복사 단일 경로 `AssetCopyService` → `o4o_asset_snapshots(asset_type='signage')` → `store_playlists`. 강제 콘텐츠 `signage_forced_content` 쿼리 시점 UNION 주입. **계약/데이터 레이어는 일관 — drift 는 프론트 표시층에만.**

## 7. 권장 정비 순서 (정정 후)

0. **`WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1`** — Neture signage surface 제거 (선행, 완료).
1. **`WO-O4O-KPA-DIGITAL-SIGNAGE-UIUX-BASELINE-V1`** — KPA 기준 UI-UX 정비(커뮤니티 inline 정규화, 화면명/용어 통일).
2. **`WO-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-APPLY-V1`** — GP/KCos 확산(허브 SignageHubTemplate 흡수 + 용어 정렬 + KCos cleanup).
3. (선택) operator 콘솔 공통 추출(KPA/GP/KCos — **Neture 제거 후 3서비스**).
4. **`CHECK-O4O-DIGITAL-SIGNAGE-CROSSSERVICE-UIUX-FINAL-V1`**.

## 8. 분류표

| ID | 분류 | 항목 |
|:--:|------|------|
| A | KPA 내부 즉시 정렬 | 커뮤니티 ContentHubPage inline→정규화, 화면명 용어 통일 |
| B | shared 추출 | operator HQ 콘솔(3서비스, Neture 제거 후) |
| C | 서비스 copy 확산 | 매장 허브 3개 → SignageHubTemplate |
| D | 정책 보존 | "내 약국에 추가" 문구, 내 매장 탭 수 |
| E | dead/stub cleanup | KCos `/partner/signage/content` |
| F | backend scope | (없음 — 백엔드 일관) |
| G | route/menu IA | 내 매장 탭 수 통일, KCos 커뮤니티 신설 여부 |
| H | 후속 WO | — |
| I | Neture | **삭제(N/A 아님)** → REMOVAL WO |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | 없음 (read-only IR) |
| 조사 기준 commit | `f6c35c3a5` (최초 조사 시점) |
| KPA 내부 drift | 경미(커뮤니티 inline, 화면명) — baseline frozen |
| GP/KCos 확산 | 높음(허브·operator 동형, 테마/문구만 주입) |
| Neture | **N/A 아님 — signage 존재 → 삭제 결정(REMOVAL WO)** |
| 데이터 흐름 | 단일 backend core, serviceKey 경계 — 일관, 변경 불요 |
| 1차 WO | `WO-O4O-NETURE-DIGITAL-SIGNAGE-REMOVAL-V1`(선행) → `WO-O4O-KPA-DIGITAL-SIGNAGE-UIUX-BASELINE-V1` |
