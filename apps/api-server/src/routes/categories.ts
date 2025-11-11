import { Router } from 'express';
import CategoryController from '../controllers/CategoryController.js';

const router: Router = Router();
const categoryController = new CategoryController();

// GET /api/categories - Get all categories with product counts
router.get('/', categoryController.getCategories);

export default router;
