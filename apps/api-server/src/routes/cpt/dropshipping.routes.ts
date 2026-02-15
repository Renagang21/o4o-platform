import { Router } from 'express';
import { DropshippingCPTController } from '../../controllers/cpt/DropshippingCPTController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../middleware/neture-scope.middleware.js';

const router: Router = Router();
const controller = new DropshippingCPTController();

// Product routes
router.get('/products', controller.getProducts);
router.post('/products', authenticate, requireNetureScope('neture:admin'), controller.createProduct);
router.put('/products/:id', authenticate, requireNetureScope('neture:admin'), controller.updateProduct);
router.delete('/products/:id', authenticate, requireNetureScope('neture:admin'), controller.deleteProduct);

// Partner routes
router.get('/partners', controller.getPartners);
router.post('/partners', authenticate, requireNetureScope('neture:admin'), controller.createPartner);
router.put('/partners/:id', authenticate, requireNetureScope('neture:admin'), controller.updatePartner);
router.delete('/partners/:id', authenticate, requireNetureScope('neture:admin'), controller.deletePartner);

// Supplier routes
router.get('/suppliers', controller.getSuppliers);
router.post('/suppliers', authenticate, requireNetureScope('neture:admin'), controller.createSupplier);
router.put('/suppliers/:id', authenticate, requireNetureScope('neture:admin'), controller.updateSupplier);
router.delete('/suppliers/:id', authenticate, requireNetureScope('neture:admin'), controller.deleteSupplier);

// Utility routes
router.post('/calculate-margin', authenticate, controller.calculateMargin);
router.post('/initialize', authenticate, requireNetureScope('neture:admin'), controller.initializeCPTs);

export default router;