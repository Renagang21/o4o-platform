import { Router } from 'express';
import { formController } from '../controllers/formController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { checkRole } from '../middleware/checkRole.js';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router: Router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/forms/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Admin routes - require authentication and admin/business role
router.post('/', authenticate, checkRole(['admin', 'business']), formController.createForm);
router.put('/:id', authenticate, checkRole(['admin', 'business']), formController.updateForm);
router.get('/', authenticate, checkRole(['admin', 'business']), formController.getForms);
router.delete('/:id', authenticate, checkRole(['admin']), formController.deleteForm);

// Public routes - get form for display
router.get('/:id', formController.getForm);

// Form submission - public but may require auth depending on form settings
router.post('/:formId/submit', upload.array('files', 10) as any, formController.submitForm);

// Submission management - require authentication
router.get('/:formId/submissions', authenticate, checkRole(['admin', 'business']), formController.getSubmissions);
router.put('/submissions/:id', authenticate, checkRole(['admin', 'business']), formController.updateSubmission);
router.delete('/submissions/:id', authenticate, checkRole(['admin']), formController.deleteSubmission);

// Reports
router.get('/:formId/report', authenticate, checkRole(['admin', 'business']), formController.getFormReport);

export default router;