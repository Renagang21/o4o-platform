import { Router } from 'express';
import { authenticateToken as authMiddleware, requireRole } from '../middleware/auth';
import { SupplierController } from '../controllers/supplier/supplierController';

const router: Router = Router();
const supplierController = new SupplierController();

// All supplier routes require authentication
router.use(authMiddleware);

// Supplier management routes
router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.post('/', requireRole(['admin', 'manager']), supplierController.createSupplier);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', requireRole(['admin']), supplierController.deleteSupplier);

// Supplier products management
router.get('/:id/products', supplierController.getSupplierProducts);
router.post('/:id/products/sync', requireRole(['admin', 'manager']), supplierController.syncSupplierProducts);

// Inventory and orders
router.get('/:id/inventory', supplierController.getSupplierInventory);
router.post('/:id/orders', supplierController.sendOrderToSupplier);

// Settlement and financial
router.get('/:id/settlement', supplierController.getSupplierSettlement);
router.put('/:id/margin-rate', requireRole(['admin', 'manager']), supplierController.updateMarginRate);

// Settings
router.put('/:id/auto-approval', requireRole(['admin', 'manager']), supplierController.updateAutoApproval);

export default router;