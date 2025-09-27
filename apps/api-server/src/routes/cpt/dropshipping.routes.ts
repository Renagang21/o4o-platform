import { Router } from 'express';
import { DropshippingCPTController } from '../../controllers/cpt/DropshippingCPTController';
import { authenticateToken } from '../../middleware/auth';

const router: Router = Router();
const controller = new DropshippingCPTController();

// Product routes
router.get('/products', controller.getProducts);
router.post('/products', authenticateToken, controller.createProduct);
router.put('/products/:id', authenticateToken, controller.updateProduct);
router.delete('/products/:id', authenticateToken, controller.deleteProduct);

// Partner routes
router.get('/partners', controller.getPartners);
router.post('/partners', authenticateToken, controller.createPartner);
router.put('/partners/:id', authenticateToken, controller.updatePartner);
router.delete('/partners/:id', authenticateToken, controller.deletePartner);

// Supplier routes
router.get('/suppliers', controller.getSuppliers);
router.post('/suppliers', authenticateToken, controller.createSupplier);
router.put('/suppliers/:id', authenticateToken, controller.updateSupplier);
router.delete('/suppliers/:id', authenticateToken, controller.deleteSupplier);

// Utility routes
router.post('/calculate-margin', controller.calculateMargin);
router.post('/initialize', authenticateToken, controller.initializeCPTs);

export default router;