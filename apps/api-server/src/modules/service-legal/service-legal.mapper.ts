/**
 * Service Legal — response mappers (snake_case entity → camelCase public/admin DTO)
 *
 * WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1
 *
 * 핵심: 값이 없는 항목은 placeholder 없이 null 그대로 내려준다.
 * public 응답에는 내부/audit 필드(updated_by, is_active, id 등)를 노출하지 않는다.
 */

import type { ServiceLegalProfile } from './entities/ServiceLegalProfile.entity.js';
import type { ServicePolicyDocument } from './entities/ServicePolicyDocument.entity.js';

/** 공개 법정정보 DTO — 사업자 법정정보만 (id/is_active/updated_by/timestamps 제외). */
export function toPublicLegalProfile(p: ServiceLegalProfile) {
  return {
    serviceKey: p.service_key,
    companyName: p.company_name,
    representativeName: p.representative_name,
    businessRegistrationNumber: p.business_registration_number,
    ecommerceRegistrationNumber: p.ecommerce_registration_number,
    ecommerceRegistrationAgency: p.ecommerce_registration_agency,
    businessAddress: p.business_address,
    customerServicePhone: p.customer_service_phone,
    customerServiceEmail: p.customer_service_email,
    privacyOfficerName: p.privacy_officer_name,
    privacyOfficerEmail: p.privacy_officer_email,
    privacyOfficerPhone: p.privacy_officer_phone,
    hostingProvider: p.hosting_provider,
    businessInfoVerificationUrl: p.business_info_verification_url,
    mailOrderBrokerNotice: p.mail_order_broker_notice,
    purchaseSafetyServiceInfo: p.purchase_safety_service_info,
    additionalLegalNotice: p.additional_legal_notice,
  };
}

/** Admin 법정정보 DTO — 운영 메타 포함 (is_active / updated_by / timestamps). */
export function toAdminLegalProfile(p: ServiceLegalProfile) {
  return {
    ...toPublicLegalProfile(p),
    id: p.id,
    isActive: p.is_active,
    updatedBy: p.updated_by,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

/** 공개 정책 문서 DTO — published 문서만 매핑(내부 audit 필드 제외). */
export function toPublicPolicyDocument(d: ServicePolicyDocument) {
  return {
    serviceKey: d.service_key,
    documentType: d.document_type,
    title: d.title,
    slug: d.slug,
    content: d.content,
    version: d.version,
    effectiveDate: d.effective_date,
    publishedAt: d.published_at,
    updatedAt: d.updated_at,
  };
}

/** Admin 정책 문서 DTO — 상태/감사 메타 포함. */
export function toAdminPolicyDocument(d: ServicePolicyDocument) {
  return {
    id: d.id,
    serviceKey: d.service_key,
    documentType: d.document_type,
    title: d.title,
    slug: d.slug,
    content: d.content,
    version: d.version,
    status: d.status,
    effectiveDate: d.effective_date,
    publishedAt: d.published_at,
    publishedBy: d.published_by,
    createdBy: d.created_by,
    updatedBy: d.updated_by,
    changeReason: d.change_reason,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}
