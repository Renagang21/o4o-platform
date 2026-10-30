import type { Response } from 'express';
import type {
  SupplierRequest,
  AuthenticatedRequest,
} from '../../middleware/neture-identity.middleware.js';
import { SupplierProfileFieldUnsupportedError, SupplierProfileNameInvalidError, SupplierProfileEntityTypeInvalidError, SupplierProfileEmailInvalidError } from '../../services/supplier.service.js';
import logger from '../../../../utils/logger.js';
import type { NetureService } from '../../neture.service.js';

/** HTTP contract handlers; authorization stays on the public controller routes. */
export function createSupplierProfileHandlers(
  netureService: Pick<NetureService, 'getSupplierProfile' | 'updateSupplierProfile'>,
) {
  return {
    getProfile: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const profile = await netureService.getSupplierProfile(supplierId);
        if (!profile) {
          return res.status(404).json({ success: false, error: 'SUPPLIER_NOT_FOUND' });
        }
        res.json({ success: true, data: profile });
      } catch (error) {
        logger.error('[Neture API] Error fetching supplier profile:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
    updateProfile: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const {
          name,
          contactEmail,
          contactPhone,
          contactWebsite,
          contactKakao,
          contactEmailVisibility,
          contactPhoneVisibility,
          contactWebsiteVisibility,
          contactKakaoVisibility,
          // WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1
          businessNumber,
          representativeName,
          businessAddress,
          // WO-O4O-POSTAL-CODE-ADDRESS-V1
          businessZipCode,
          businessAddressDetail,
          // WO-O4O-BUSINESS-REGISTRATION-FIELD-NAMING-STANDARD-V1
          managerName,
          managerPhone,
          managerEmail,
          businessType,
          businessItem,
          // WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §E (정책 7):
          //   taxInvoiceEmail 은 **onboarding(정산·세금계산서 축) 단일 소유**다.
          //   두 route 가 같은 컬럼을 쓰면 마지막 저장이 조용히 이긴다 — profile 입력에서 제거한다.
          //   read(GET /supplier/profile 응답)와 PATCH /supplier/onboarding 은 그대로 유지.
          // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1: 사업자등록증 P4 fields
          //   organizations.metadata.businessProfile 에 저장. 조직 미연결일 때만 400 거부.
          businessEntityType,
          businessStartDate,
          // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
          minOrderAmount,
          minOrderSurcharge,
          orderConditionNote,
          // WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1
          baseShippingFee,
          freeShippingThreshold,
          averageDispatchDays,
          returnExchangeNotice,
          shippingStandard,
          shippingIsland,
          shippingMountain,
        } = req.body;
        const result = await netureService.updateSupplierProfile(supplierId, {
          name,
          contactEmail,
          contactPhone,
          contactWebsite,
          contactKakao,
          contactEmailVisibility,
          contactPhoneVisibility,
          contactWebsiteVisibility,
          contactKakaoVisibility,
          businessNumber,
          representativeName,
          businessAddress,
          businessZipCode,
          businessAddressDetail,
          managerName,
          managerPhone,
          managerEmail,
          businessType,
          businessItem,
          businessEntityType,
          businessStartDate,
          minOrderAmount,
          minOrderSurcharge,
          orderConditionNote,
          baseShippingFee,
          freeShippingThreshold,
          averageDispatchDays,
          returnExchangeNotice,
          shippingStandard,
          shippingIsland,
          shippingMountain,
        });
        if (!result) {
          return res.status(404).json({ success: false, error: 'SUPPLIER_NOT_FOUND' });
        }
        res.json({ success: true, data: result });
      } catch (error) {
        if (error instanceof SupplierProfileEmailInvalidError) return res.status(400).json({ success: false, error: 'INVALID_MANAGER_EMAIL', message: '담당자 이메일을 확인해 주세요.' });
        if (error instanceof SupplierProfileEntityTypeInvalidError) {
          return res.status(400).json({
            success: false, error: 'SUPPLIER_PROFILE_ENTITY_TYPE_INVALID',
            message: '세금계산서 발행을 위한 개인 / 법인 구분을 선택해 주세요.',
          });
        }
        if (error instanceof SupplierProfileNameInvalidError) {
          return res.status(400).json({
            success: false, error: 'SUPPLIER_PROFILE_NAME_INVALID',
            message: '상호명을 1~255자로 입력해 주세요.',
          });
        }
        // WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 9: canonical 저장 위치가 없는 필드는 조용히 버리지 않고 400 으로 거부한다.
        if (error instanceof SupplierProfileFieldUnsupportedError) {
          return res.status(400).json({
            success: false,
            error: 'SUPPLIER_PROFILE_FIELD_UNSUPPORTED',
            message:
              '아직 저장할 수 없는 항목입니다. 사업자 정보 일부는 조직 정보로 이전 예정입니다.',
            fields: error.fields,
          });
        }
        logger.error('[Neture API] Error updating supplier profile:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
  };
}
