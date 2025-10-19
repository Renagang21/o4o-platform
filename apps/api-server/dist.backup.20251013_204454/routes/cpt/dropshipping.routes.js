"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DropshippingCPTController_1 = require("../../controllers/cpt/DropshippingCPTController");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new DropshippingCPTController_1.DropshippingCPTController();
// Product routes
router.get('/products', controller.getProducts);
router.post('/products', auth_middleware_1.authenticate, controller.createProduct);
router.put('/products/:id', auth_middleware_1.authenticate, controller.updateProduct);
router.delete('/products/:id', auth_middleware_1.authenticate, controller.deleteProduct);
// Partner routes
router.get('/partners', controller.getPartners);
router.post('/partners', auth_middleware_1.authenticate, controller.createPartner);
router.put('/partners/:id', auth_middleware_1.authenticate, controller.updatePartner);
router.delete('/partners/:id', auth_middleware_1.authenticate, controller.deletePartner);
// Supplier routes
router.get('/suppliers', controller.getSuppliers);
router.post('/suppliers', auth_middleware_1.authenticate, controller.createSupplier);
router.put('/suppliers/:id', auth_middleware_1.authenticate, controller.updateSupplier);
router.delete('/suppliers/:id', auth_middleware_1.authenticate, controller.deleteSupplier);
// Utility routes
router.post('/calculate-margin', controller.calculateMargin);
router.post('/initialize', auth_middleware_1.authenticate, controller.initializeCPTs);
exports.default = router;
//# sourceMappingURL=dropshipping.routes.js.map