import { Router } from 'express';
import { DropshippingCPTController } from '../../controllers/cpt/DropshippingCPTController.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router: Router = Router();
const controller = new DropshippingCPTController();

// Product routes
router.get('/products', controller.getProducts);
router.post('/products', authenticate, controller.createProduct);
router.put('/products/:id', authenticate, controller.updateProduct);
router.delete('/products/:id', authenticate, controller.deleteProduct);

// Partner routes
router.get('/partners', controller.getPartners);
router.post('/partners', authenticate, controller.createPartner);
router.put('/partners/:id', authenticate, controller.updatePartner);
router.delete('/partners/:id', authenticate, controller.deletePartner);

// Supplier routes
router.get('/suppliers', controller.getSuppliers);
router.post('/suppliers', authenticate, controller.createSupplier);
router.put('/suppliers/:id', authenticate, controller.updateSupplier);
router.delete('/suppliers/:id', authenticate, controller.deleteSupplier);

// Utility routes
router.post('/calculate-margin', controller.calculateMargin);
router.post('/initialize', authenticate, controller.initializeCPTs);

export default router;