import { Router } from 'express';
import { AdminSupplierController } from '../../controllers/admin/AdminSupplierController';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAnyRole, requireAdmin } from '../../middleware/permission.middleware';
import { UserRole } from '../../entities/User';
import { body } from 'express-validator';

const router: Router = Router();
const adminSupplierController = new AdminSupplierController();

// All admin supplier routes require authentication
router.use(authenticate);

// Supplier management routes (admin/manager only)
router.get('/', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]), adminSupplierController.getSuppliers);
router.get('/statistics', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]), adminSupplierController.getSupplierStatistics);
router.get('/:id', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]), adminSupplierController.getSupplier);

// Supplier creation (admin only)
router.post('/',
  requireAdmin,
  [
    body('businessName').notEmpty().withMessage('Business name is required'),
    body('businessNumber').notEmpty().withMessage('Business number is required'),
    body('contactPerson').notEmpty().withMessage('Contact person is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('commissionRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission rate must be between 0-100'),
    body('minimumOrder').optional().isFloat({ min: 0 }).withMessage('Minimum order must be non-negative'),
    body('maxProcessingDays').optional().isInt({ min: 1, max: 30 }).withMessage('Processing days must be between 1-30')
  ],
  adminSupplierController.createSupplier
);

// Supplier updates (admin/manager only)
router.put('/:id',
  requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]),
  [
    body('businessName').optional().notEmpty().withMessage('Business name cannot be empty'),
    body('businessNumber').optional().notEmpty().withMessage('Business number cannot be empty'),
    body('contactPerson').optional().notEmpty().withMessage('Contact person cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
    body('address').optional().notEmpty().withMessage('Address cannot be empty'),
    body('category').optional().notEmpty().withMessage('Category cannot be empty'),
    body('commissionRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Commission rate must be between 0-100'),
    body('minimumOrder').optional().isFloat({ min: 0 }).withMessage('Minimum order must be non-negative'),
    body('maxProcessingDays').optional().isInt({ min: 1, max: 30 }).withMessage('Processing days must be between 1-30')
  ],
  adminSupplierController.updateSupplier
);

// Update supplier status (admin/manager only)
router.patch('/:id/status',
  requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]),
  [
    body('isActive').isBoolean().withMessage('isActive must be a boolean')
  ],
  adminSupplierController.updateSupplierStatus
);

// Approve supplier (admin only)
router.patch('/:id/approve',
  requireAdmin,
  adminSupplierController.approveSupplier
);

// Supplier deletion (admin only)
router.delete('/:id', requireAdmin, adminSupplierController.deleteSupplier);

export default router;