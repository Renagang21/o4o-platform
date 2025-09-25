import { Router } from 'express';
import { ProductController } from '../../controllers/ProductController';
import { authenticateToken, requireRole } from '../../middleware/auth';

const router: Router = Router();
const productController = new ProductController();

// Public routes
router.get('/', productController.getProducts.bind(productController));
router.get('/featured', productController.getFeaturedProducts.bind(productController));
router.get('/:id', productController.getProduct.bind(productController));

// Protected routes (require authentication)
router.use(authenticateToken);

// Admin/Manager routes
router.post('/', requireRole(['admin', 'manager', 'vendor']), productController.createProduct.bind(productController));
router.put('/:id', requireRole(['admin', 'manager', 'vendor']), productController.updateProduct.bind(productController));
router.delete('/:id', requireRole(['admin', 'manager']), productController.deleteProduct.bind(productController));

// Import products
router.post('/import', requireRole(['admin', 'manager']), productController.importProducts.bind(productController));

export default router;