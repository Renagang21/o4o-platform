# 02. Database Schema - YITH WooCommerce Affiliates

## 📋 개요

YITH WooCommerce Affiliates 플러그인은 추천 링크 기반 커미션 시스템을 구현하기 위해 WordPress의 사용자/메타 테이블, WooCommerce 주문 테이블, 자체 로그 테이블을 조합해 사용합니다.  
본 문서는 추천인 등록, 추적, 커미션 저장 방식 등 핵심 데이터 흐름을 분석한 결과입니다.

---

## 1. 주요 테이블 구조

| 테이블 | 설명 |
|--------|------|
| `wp_users` | 추천인 계정 사용자 |
| `wp_usermeta` | 추천인 관련 정보 저장 |
| `wp_posts` | WooCommerce 주문(post_type = 'shop_order') |
| `wp_postmeta` | 주문에 연결된 추천 정보 저장 |
| `wp_yith_aff_commissions` *(또는 유사 이름)* | 커미션 내역 저장 |
| `wp_options` | 추천 시스템 전역 설정 저장 |

---

## 2. UserMeta 필드

| 메타키 | 설명 |
|--------|------|
| `_yith_affiliate_enabled` | 추천인 활성화 여부 |
| `_yith_affiliate_rate` | 개인별 커미션 비율 (%) |
| `_yith_affiliate_code` | 고유 추천 코드 (링크에 사용됨) |
| `_yith_affiliate_total_earnings` | 누적 수익 |
| `_yith_affiliate_total_clicks` | 추천 링크 클릭 수 |

---

## 3. PostMeta 필드 (주문)

| 메타키 | 설명 |
|--------|------|
| `_yith_affiliate_user` | 해당 주문을 유도한 추천인의 user ID |
| `_yith_affiliate_commission_amount` | 커미션 금액 |
| `_yith_affiliate_status` | 승인 여부 (approved / pending / rejected) |

---

## 4. 커미션 로그 테이블 (`yith_aff_commissions`)

| 컬럼 | 설명 |
|------|------|
| `ID` | 커미션 고유 ID |
| `order_id` | WooCommerce 주문 ID |
| `user_id` | 추천인 user ID |
| `amount` | 커미션 금액 |
| `status` | 상태 (pending, approved, rejected) |
| `date_created` | 생성 일시 |

---

## 5. 설정 항목 (wp_options)

| 옵션 키 | 설명 |
|---------|------|
| `yith_wcaf_default_rate` | 기본 커미션율 |
| `yith_wcaf_cookie_days` | 추적 쿠키 유효기간 (예: 30일) |
| `yith_wcaf_auto_approve` | 커미션 자동 승인 여부 |
| `yith_wcaf_email_notification` | 관리자 알림 여부 |

---

## 6. ERD (관계 개요)

[wp_users]───<추천인 정보>───[wp_usermeta] │ │ generates ▼ [shop_order]───<postmeta>───[추천 정보 + 커미션 금액] │ ▼ [yith_aff_commissions]


---

## 7. rena-retail 설계에 대한 시사점

| 항목 | 제안 방향 |
|------|-----------|
| 추천 로그 | 커미션 처리 내역은 별도 CPT 또는 커스텀 테이블 도입 고려 |
| 상태 전이 | 커미션 승인 흐름을 워크플로우로 설계할 수 있음 |
| 추천 코드 관리 | 코드 생성 방식은 short code, 링크 코드, QR 등 다양화 가능 |
| 사용자 구조 | 일반 사용자 → 추천인 전환 플로우 필요 (role or CPT 방식) |

---

**작성일**: 2025-04-30  
**작성자**: ChatGPT


