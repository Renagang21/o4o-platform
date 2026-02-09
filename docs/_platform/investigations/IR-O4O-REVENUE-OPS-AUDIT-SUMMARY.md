# IR-O4O-REVENUE-OPS-AUDIT 조사 요약

**조사일: 2026-02-09**

---

## 조사 1차 (P1): 현재 구현 자산 지도

### 기능별 현황표

| 기능 항목 | 상태 | 근거 | 메모 |
|----------|------|------|------|
| **디지털 사이니지** ||||
| 플레이리스트 CRUD | ✅ | `SignagePlaylist.entity.ts` | 완전 구현 |
| 미디어 라이브러리 | ✅ | `SignageMedia.entity.ts` | 다양한 타입 지원 |
| 스케줄링 | ✅ | `SignageSchedule.entity.ts` | 시간/요일/우선순위 |
| 플레이어 재생 | ✅ | `signage-player-web/` | 오프라인/프리로드 |
| 하단 Ticker | ✅ | `SignageContentBlock` (type: ticker) | 구현됨 |
| 태블릿 고객요청→직원승인 | ❌ | - | **미구현** |
| **콘텐츠→매출** ||||
| Hub→Dashboard 복사 | ✅ | `dashboard-assets.routes.ts` | Phase 2-B 완료 |
| 전단/POP 출력물 생성 | ❌ | - | 편집기 없음 |
| QR→주문/상담 연결 | ⚠️ | `qr-landing.controller.ts` | 클릭 추적만 |
| **매장 이커머스** ||||
| 스토어 신청/등록 | ⚠️ | `suppliers.routes.ts` | 관리자만 |
| 상품등록/진열 | ✅ | 서비스별 entity | 분리 완성 |
| 주문처리 | ✅ | `CheckoutOrder.entity.ts` | Toss 연동 |
| 샘플판매 | ✅ | `seller-sample.entity.ts` | 재고 추적 |
| 운영 통계 | ⚠️ | `AnalyticsService.ts` | 기본 집계만 |
| **파트너 매장 소개** ||||
| 공유 링크 생성 | ✅ | `partner-link.service.ts` | UTM 지원 |
| QR 생성 | ✅ | `qr-landing.controller.ts` | 커스텀 가능 |
| 클릭/전환 추적 | ✅ | `PartnerClick.entity.ts` | 세션/디바이스 |
| 성과 정산 | ✅ | `PartnerCommission.entity.ts` | 승인 워크플로우 |

### 5개 필수 질문 답변

1. **매장 대시보드 존재 서비스**: KPA Society, Neture, Glycopharm, Cosmetics(Main Site)
2. **사이니지 플레이리스트**: 생성/편집/할당/재생 **전 과정 구현 완료**
3. **태블릿→직원승인 흐름**: ❌ **미구현** (ContentBlock은 있으나 요청 엔티티 없음)
4. **QR 스캔/전환 기록**: ⚠️ 클릭 추적 있음, 쿠키 기반 last-touch 귀속
5. **통계 기록**: 주문/전환 ✅, 노출/요청/승인 ❌

---

## 조사 2차 (P2): 흐름 단절 지점 분석

### 흐름 단절 요약

```
[노출] ─⚠️─ [관심] ─❌─ [요청] ─❌─ [승인] ─❌─ [처리]
   │                                              │
   │         ← 전체 구간이 끊어져 있음 →            │
   │                                              │
   └──────────────────────────────────────────────┘
                    ✅ 주문만 존재
```

### 단계별 상세

| 흐름 단계 | 존재 여부 | 근거 | 메모 |
|----------|----------|------|------|
| **노출** | ⚠️ 부분 | `ChannelPlaybackLog` | 재생 완료만 기록 |
| **관심** | ❌ 없음 | CornerDisplayBlock "zero-ui" | 클릭 핸들러 없음 |
| **요청** | ❌ 없음 | - | 공통 엔티티 부재 |
| **승인** | ❌ 없음 | - | 워크플로우 부재 |
| **처리** | ✅ | `CheckoutOrder` | 주문만 |

### 핵심 발견

1. **SellerMetricEvent** 인프라 존재하나 미사용
2. **PartnerLink.metadata** 필드로 purpose 저장 가능
3. **KpaOrganizationJoinRequest** 패턴이 가장 완성도 높은 Request 참조 구현
4. **Glycopharm PharmacyDashboard Block 2**가 요청 카드 최적 위치

---

## 핵심 갭 4가지

| 갭 | 영향 |
|---|-----|
| 태블릿 고객요청→직원승인 흐름 없음 | 현장 인터랙션 기록 불가 |
| 전단/POP 출력물 편집기 없음 | 콘텐츠→오프라인 연결 단절 |
| 스토어 셀프 신청/등록 없음 | 매장 온보딩 자동화 불가 |
| Impression 로깅 미흡 | 노출→전환 퍼널 분석 불가 |

---

## 다음 단계

→ **WO-O4O-COMMON-REQUEST-IMPLEMENTATION-PHASE1** 실행
