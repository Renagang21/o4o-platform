"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const formController_1 = require("../controllers/formController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const checkRole_1 = require("../middleware/checkRole");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/forms/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common file types
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv|txt|zip/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Invalid file type'));
        }
    }
});
// Admin routes - require authentication and admin/business role
router.post('/', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'business']), formController_1.formController.createForm);
router.put('/:id', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'business']), formController_1.formController.updateForm);
router.get('/', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'business']), formController_1.formController.getForms);
router.delete('/:id', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin']), formController_1.formController.deleteForm);
// Public routes - get form for display
router.get('/:id', formController_1.formController.getForm);
// Form submission - public but may require auth depending on form settings
router.post('/:formId/submit', upload.array('files', 10), formController_1.formController.submitForm);
// Submission management - require authentication
router.get('/:formId/submissions', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'business']), formController_1.formController.getSubmissions);
router.put('/submissions/:id', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'business']), formController_1.formController.updateSubmission);
router.delete('/submissions/:id', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin']), formController_1.formController.deleteSubmission);
// Reports
router.get('/:formId/report', auth_middleware_1.authenticate, (0, checkRole_1.checkRole)(['admin', 'business']), formController_1.formController.getFormReport);
exports.default = router;
//# sourceMappingURL=forms.js.map