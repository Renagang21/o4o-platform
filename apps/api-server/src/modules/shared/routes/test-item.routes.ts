import { Router } from 'express';
import { TestItemController } from '../controllers/test-item.controller.js';
import { validateDto } from '../../../common/middleware/validation.middleware.js';
import {
  CreateTestItemDto,
  UpdateTestItemDto,
} from '../dto/test-item.dto.js';

const router = Router();

// Get active items (must be before /:id to avoid route conflict)
router.get('/active', TestItemController.getActive);

// List all test items (paginated)
router.get('/', TestItemController.list);

// Get single test item by ID
router.get('/:id', TestItemController.getById);

// Create new test item (with validation)
router.post('/', validateDto(CreateTestItemDto), TestItemController.create);

// Update test item (with validation)
router.put('/:id', validateDto(UpdateTestItemDto), TestItemController.update);

// Delete test item
router.delete('/:id', TestItemController.delete);

// Custom action: increment value
router.post('/:id/increment', TestItemController.increment);

export default router;
