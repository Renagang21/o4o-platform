import { Router } from 'express';
import { ApplicationController } from '../../controllers/ApplicationController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { body } from 'express-validator';

const router: Router = Router();

// All application routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/applications/supplier
 * @desc    공급자 신청
 * @access  Private (인증된 사용자)
 */
router.post('/supplier',
  [
    body('businessNumber').notEmpty().withMessage('사업자 등록번호는 필수입니다'),
    body('businessName').notEmpty().withMessage('사업자명은 필수입니다'),
    body('ceoName').notEmpty().withMessage('대표자명은 필수입니다'),
    body('businessAddress').notEmpty().withMessage('사업장 소재지는 필수입니다'),
    body('businessPhone').notEmpty().withMessage('사업자 전화번호는 필수입니다'),
    body('taxEmail').isEmail().withMessage('유효한 이메일 주소를 입력해주세요'),
    body('managerName').notEmpty().withMessage('담당자 이름은 필수입니다'),
    body('managerPhone').notEmpty().withMessage('담당자 전화번호는 필수입니다'),
    body('suppliedCategories').optional().isString().withMessage('공급 품목은 문자열이어야 합니다')
  ],
  ApplicationController.applyAsSupplier
);

/**
 * @route   POST /api/v1/applications/seller
 * @desc    판매자 신청
 * @access  Private (인증된 사용자)
 */
router.post('/seller',
  [
    body('businessNumber').notEmpty().withMessage('사업자 등록번호는 필수입니다'),
    body('businessName').notEmpty().withMessage('사업자명은 필수입니다'),
    body('ceoName').notEmpty().withMessage('대표자명은 필수입니다'),
    body('businessAddress').notEmpty().withMessage('사업장 소재지는 필수입니다'),
    body('businessPhone').notEmpty().withMessage('사업자 전화번호는 필수입니다'),
    body('taxEmail').isEmail().withMessage('유효한 이메일 주소를 입력해주세요'),
    body('managerName').notEmpty().withMessage('담당자 이름은 필수입니다'),
    body('managerPhone').notEmpty().withMessage('담당자 전화번호는 필수입니다'),
    body('storeName').notEmpty().withMessage('스토어명은 필수입니다'),
    body('salesChannels').optional().isString().withMessage('판매 채널은 문자열이어야 합니다')
  ],
  ApplicationController.applyAsSeller
);

/**
 * @route   POST /api/v1/applications/partner
 * @desc    파트너 신청
 * @access  Private (인증된 사용자)
 */
router.post('/partner',
  [
    body('partnerType').isIn(['individual', 'corporate']).withMessage('파트너 유형은 individual 또는 corporate이어야 합니다'),
    body('sellerId').notEmpty().withMessage('연결할 판매자를 선택해주세요'),
    // Individual validation
    body('name').if(body('partnerType').equals('individual')).notEmpty().withMessage('이름은 필수입니다'),
    body('phone').if(body('partnerType').equals('individual')).notEmpty().withMessage('연락처는 필수입니다'),
    // Corporate validation
    body('businessNumber').if(body('partnerType').equals('corporate')).notEmpty().withMessage('사업자 등록번호는 필수입니다'),
    body('businessName').if(body('partnerType').equals('corporate')).notEmpty().withMessage('사업자명은 필수입니다'),
    body('ceoName').if(body('partnerType').equals('corporate')).notEmpty().withMessage('대표자명은 필수입니다')
  ],
  ApplicationController.applyAsPartner
);

/**
 * @route   GET /api/v1/applications/status
 * @desc    내 신청 상태 조회
 * @access  Private (인증된 사용자)
 */
router.get('/status', ApplicationController.getApplicationStatus);

export default router;
