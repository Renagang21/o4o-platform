import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getProfile,
  updateProfile
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 회원가입 검증 규칙
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters')
    .trim(),
  body('businessInfo.businessName')
    .isLength({ min: 2 })
    .withMessage('Business name is required')
    .trim(),
  body('businessInfo.businessType')
    .isIn(['pharmacy', 'health_store', 'local_food', 'retail_shop', 'other'])
    .withMessage('Valid business type is required'),
  body('businessInfo.address')
    .isLength({ min: 5 })
    .withMessage('Valid address is required')
    .trim(),
  body('businessInfo.phone')
    .matches(/^[0-9-+\\s()]+$/)
    .withMessage('Valid phone number is required')
    .trim()
];

// 로그인 검증 규칙
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// 프로필 업데이트 검증 규칙
const updateProfileValidation = [
  body('name')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters')
    .trim(),
  body('businessInfo.businessName')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Business name must be at least 2 characters')
    .trim(),
  body('businessInfo.businessType')
    .optional()
    .isIn(['pharmacy', 'health_store', 'local_food', 'retail_shop', 'other'])
    .withMessage('Valid business type is required'),
  body('businessInfo.address')
    .optional()
    .isLength({ min: 5 })
    .withMessage('Valid address is required')
    .trim(),
  body('businessInfo.phone')
    .optional()
    .matches(/^[0-9-+\\s()]+$/)
    .withMessage('Valid phone number is required')
    .trim()
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfileValidation, updateProfile);

// 토큰 검증 엔드포인트
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

export default router;
