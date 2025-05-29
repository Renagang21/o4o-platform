# 02. Database Schema - YITH WooCommerce Product Vendors

## 📋 개요

본 문서는 YITH WooCommerce Product Vendors 플러그인의 데이터베이스 구조를 분석한 결과를 정리한 문서입니다. 플러그인은 **CPT(Custom Post Type)**를 사용하지 않고, **기존 WooCommerce 및 WordPress User/Meta 구조**에 커스텀 필드만 추가하여 구현되어 있습니다.

---

## 1. 주요 테이블 및 연관성

| 테이블 | 역할 |
|--------|------|
| `wp_users` | 판매자(Vendor) 계정 |
| `wp_usermeta` | 벤더 관련 설정값 (수수료 비율 등) 저장 |
| `wp_posts` | WooCommerce 상품 (post_type = 'product') |
| `wp_postmeta` | 상품의 벤더 연결 정보 (`_vendor_id`) |
| `wp_options` | 플러그인 글로벌 설정 저장 |
| `wp_yith_commissions` *(추정)* | 커미션 로그 저장 (일부 버전에서는 CPT로 구현됨) |

---

## 2. UserMeta 필드 목록 (벤더 계정용)

| 메타키 | 설명 |
|--------|------|
| `_vendor_commission` | 수수료 비율 (% 단위) |
| `_vendor_enabled` | 벤더 활성화 여부 (yes/no) |
| `_vendor_registered` | 등록일 |
| `_vendor_profile` | 벤더 소개글 또는 URL |
| `_vendor_shop_slug` | 벤더 전용 페이지 slug |
| `_vendor_bank_info` | 계좌정보 또는 지급정보 (비공개 저장) |

---

## 3. PostMeta 필드 목록 (상품 연동용)

| 메타키 | 설명 |
|--------|------|
| `_vendor_id` | 상품을 소유한 벤더의 user ID |
| `_commission_amount` | 커미션 금액 (optional) |
| `_commission_status` | 지급 상태 (paid / unpaid 등) |

---

## 4. 설정 저장 위치 (wp_options)

| 옵션 키 | 설명 |
|---------|------|
| `yith_wcpv_default_commission` | 기본 커미션 비율 |
| `yith_wcpv_auto_approve_vendor` | 벤더 자동 승인 여부 |
| `yith_wcpv_payment_mode` | 커미션 지급 방식 (manual / automatic) |
| `yith_wcpv_email_notifications` | 알림 설정 (신규 벤더, 지급 등) |

---

## 5. rena-retail 설계 시 참고 사항

| 항목 | 제안 방향 |
|------|-----------|
| 커미션 로깅 | CPT 기반으로 `commission-log` 등 분리하는 것이 확장성에 유리 |
| 벤더 정보 저장 | usermeta → 별도 벤더 테이블 또는 custom post 사용 고려 |
| 상품 연결 방식 | postmeta `_vendor_id` 방식은 유지 가능 |
| 지급 처리 | 상태값 필드는 ENUM 혹은 상태 전이 테이블로 확장 가능 |
| 다중 벤더 상품 | 복수 벤더 상품 구조 미지원 → 추후 확장 고려 필요 |

---

## 6. ERD (관계 다이어그램) 개요 *(텍스트 버전)*

[wp_users]───<vendor info>───[wp_usermeta] │ │ owns ▼ [wp_posts]───<product meta>───[wp_postmeta] │ │ generates ▼ [commissions (log)]


---

**작성일**: 2025-04-30  
**작성자**: ChatGPT
