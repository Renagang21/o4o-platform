# IR-GLYCOPHARM-OPERATOR-FUNCTION-AUDIT-V2

GlycoPharm / GlucoseView Operator 기능 구조 분석

- **Status**: Completed
- **Date**: 2026-03-16
- **Scope**: GlycoPharm, GlucoseView
- **기준**: O4O Operator Dashboard Standard V1, WO-GLYCOPHARM-GLUCOSEVIEW-OPERATOR-DASHBOARD-REFINE-V1 결과

---

## 1. Operator 역할 정의 (확정)

Operator는 **플랫폼 운영자**이며 의료 운영자가 아니다.

```
환자 → 약국 → GlycoPharm 플랫폼 → Operator
```

| 영역 | 역할 |
|------|------|
| 플랫폼 운영 | 서비스 상태 관리 |
| 네트워크 관리 | 약국 참여 관리 |
| Care 운영 | Care 확산 모니터링 |
| 콘텐츠 운영 | CMS / Signage |
| 시스템 상태 | KPI / Activity |

> Operator는 **개별 환자 데이터에 접근하지 않는다.**

---

## 2. GlycoPharm Operator 기능 구조

### 2.1 Dashboard

- **Route**: `/operator`
- **API**: `GET /api/v1/glycopharm/operator/dashboard`
- **구조**: KPI Grid → AI Summary → Action Queue → Activity Log → Quick Actions

**현재 KPI (6개)**:

| Key | Label | Data Source | Capability |
|-----|-------|-------------|------------|
| active-pharmacies | 활성 약국 | organizations + enrollments | Network |
| pending-applications | 입점 대기 | glycopharm_applications | Network |
| active-products | 판매 상품 | glycopharm_products | Commerce |
| total-orders | 총 주문 | STUB (E-commerce Core 미통합) | Commerce |
| total-patients | 등록 환자 | patient_health_profiles | Care |
| high-risk-patients | 고위험 환자 | care_kpi_snapshots | Care |

### 2.2 Pharmacy Network 관리

- **Route**: `/operator/pharmacies`
- **데이터**: organizations + organization_service_enrollments
- **역할**: 네트워크 운영 (약국 목록, 상태, 참여 상태)

### 2.3 Applications

- **Route**: `/operator/applications`
- **데이터**: glycopharm_applications
- **역할**: 입점 신청 관리 (신청 목록, 승인/반려)

### 2.4 Products

- **Route**: `/operator/products`
- **데이터**: glycopharm_products
- **역할**: 상품 목록/상태 관리

### 2.5 Orders

- **Route**: `/operator/orders`
- **데이터**: orders (E-commerce Core)
- **역할**: 주문 목록/상태 확인

---

## 3. Care Monitoring (핵심)

- **Route**: `/operator/care`
- **목적**: Care 서비스 운영 상태 확인

**사용 데이터**:

| Table | Purpose |
|-------|---------|
| patient_health_profiles | 총 환자 수 (COUNT) |
| care_kpi_snapshots | 고위험 환자 수 (risk_level = 'high') |
| care_alerts | 미확인 알림 수 (status = 'open') |

**표시 정보**: COUNT / SUMMARY / ALERT only

> Operator는 환자 개별 데이터에 접근하지 않음. Care 상태 통계만 확인.

---

## 4. GlucoseView Operator 구조

- **Route**: `/operator`
- **API**: `GET /api/v1/glucoseview/operator/dashboard`

**현재 KPI (6개)**:

| Key | Label | Data Source | Capability |
|-----|-------|-------------|------------|
| active-pharmacies | 활성 약국 | glucoseview_pharmacies | Network |
| approved-pharmacists | 승인 약사 | glucoseview_pharmacists | Network |
| total-customers | 등록 고객 | glucoseview_customers | Network |
| high-risk-patients | 고위험 환자 | care_kpi_snapshots | Care |
| active-vendors | 활성 벤더 | glucoseview_vendors | Commerce |
| pending-applications | 신청 대기 | glucoseview_applications | Network |

---

## 5. Action Queue 구조

**GlycoPharm**:

| ID | Label | Data |
|----|-------|------|
| pending-apps | 입점 신청 대기 | glycopharm_applications (submitted) |
| draft-products | 임시저장 상품 | glycopharm_products (draft) |
| care-alerts | 케어 알림 미확인 | care_alerts (open) |

**GlucoseView**:

| ID | Label | Data |
|----|-------|------|
| pending-applications | 신청 승인 대기 | glucoseview_applications (submitted) |
| pending-pharmacists | 약사 승인 대기 | glucoseview_pharmacists (pending) |
| care-alerts | 케어 알림 미확인 | care_alerts (open) |

---

## 6. Activity Log

최근 이벤트 소스 (시간순 병합, 최대 5건):
- Applications (입점/참여 신청)
- Care Alerts (케어 알림)

---

## 7. Operator Capability Map (확정)

```
GlycoPharm Operator
├── Network
│   ├── Pharmacy Network (/operator/pharmacies)
│   └── Applications (/operator/applications)
├── Commerce
│   ├── Products (/operator/products)
│   └── Orders (/operator/orders)
├── Care
│   ├── Care Monitoring (/operator/care)
│   └── Care Alerts (/operator/care/alerts)
├── Content
│   ├── CMS (/operator/content)
│   ├── Signage (/operator/signage/*)
│   └── Forum (/operator/forum-management)
└── System
    └── Settings (/operator/settings)
```

---

## 8. 현재 구조 평가

| 영역 | 상태 | 비고 |
|------|------|------|
| Dashboard | 안정 | 6-KPI + 5-block 완료 |
| Care Monitoring | 정상 | 통계만 노출, 개인정보 없음 |
| Network 관리 | 정상 | 약국 참여 관리 |
| Applications | 정상 | 입점 신청/승인 |
| Products | 정상 | 상품 상태 관리 |
| Orders | 기본 | E-commerce Core 통합 대기 (STUB) |

> 전체적으로 Operator 시스템 정상 구조

---

## 9. 발견된 부족 기능 (KPI 확장 후보)

운영 관점에서 추가 필요한 성장/활동 지표:

| KPI | 설명 | 분류 |
|-----|------|------|
| Care Adoption Rate | Care 활성 약국 / 전체 약국 비율 | Care |
| Weekly Care Activity | 주간 코칭 세션/알림 건수 | Care |
| Pharmacy Growth | 신규 약국 가입 추이 | Network |
| Order Volume Trend | 주문량 추이 (E-commerce Core 통합 후) | Commerce |

---

## 10. 가장 중요한 KPI: Care Adoption

플랫폼 운영에서 가장 중요한 성장 지표:

```
Care Enabled Pharmacies / Total Pharmacies = Adoption Rate
```

이 지표는 **플랫폼 성장의 핵심 척도**이다.

---

## 11. 보안 검증

Operator API 확인 결과:

| 항목 | 결과 |
|------|------|
| 환자 개인정보 노출 | 없음 |
| 노출 데이터 유형 | COUNT, SUMMARY, ALERT |
| 개인정보 보호 기준 | 충족 |

---

## 12. 결론

현재 GlycoPharm / GlucoseView Operator 시스템:

- 기능 구조 정상
- 권한 구조 정상
- Dashboard 구조 정상
- Care 구조 정상

**다음 단계**: WO-GLYCOPHARM-OPERATOR-KPI-ENHANCEMENT-V1 (Operator Dashboard KPI 고도화)
- 플랫폼 성장 지표 추가
- Care Adoption KPI 추가
- Weekly Activity 지표 추가
