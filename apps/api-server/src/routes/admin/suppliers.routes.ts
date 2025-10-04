import { Router } from 'express';
import { AdminSupplierController } from '../../controllers/admin/AdminSupplierController';
import { authenticateToken } from '../../middleware/auth';
import { validateRole } from '../../middleware/roleValidation';
import { body } from 'express-validator';

const router: Router = Router();
const adminSupplierController = new AdminSupplierController();

// All admin supplier routes require authentication
router.use(authenticateToken);

// Supplier management routes (admin/manager only)
router.get('/', validateRole(['admin', 'super_admin', 'manager']), adminSupplierController.getSuppliers);
router.get('/statistics', validateRole(['admin', 'super_admin', 'manager']), adminSupplierController.getSupplierStatistics);
router.get('/:id', validateRole(['admin', 'super_admin', 'manager']), adminSupplierController.getSupplier);

// Supplier creation (admin only)
router.post('/', 
  validateRole(['admin', 'super_admin']),
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
  validateRole(['admin', 'super_admin', 'manager']),
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
  validateRole(['admin', 'super_admin', 'manager']),
  [
    body('isActive').isBoolean().withMessage('isActive must be a boolean')
  ],
  adminSupplierController.updateSupplierStatus
);

// Update supplier verification (admin only)
router.patch('/:id/verify',
  validateRole(['admin', 'super_admin']),
  [
    body('isVerified').isBoolean().withMessage('isVerified must be a boolean')
  ],
  adminSupplierController.updateSupplierVerification
);

// Supplier deletion (admin only)
router.delete('/:id', validateRole(['admin', 'super_admin']), adminSupplierController.deleteSupplier);

export default router;