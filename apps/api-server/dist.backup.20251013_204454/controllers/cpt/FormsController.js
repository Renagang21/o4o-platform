"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormsController = void 0;
const connection_1 = require("../../database/connection");
const Form_1 = require("../../entities/Form");
const FormSubmission_1 = require("../../entities/FormSubmission");
class FormsController {
    constructor() {
        this.formRepo = connection_1.AppDataSource.getRepository(Form_1.Form);
        this.submissionRepo = connection_1.AppDataSource.getRepository(FormSubmission_1.FormSubmission);
    }
    // ============= Forms Management =============
    async getAllForms(req, res) {
        try {
            const { page = 1, limit = 20, search, status, createdBy } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const user = req.user;
            const queryBuilder = this.formRepo
                .createQueryBuilder('form')
                .leftJoinAndSelect('form.creator', 'creator')
                .orderBy('form.updatedAt', 'DESC');
            // Role-based filtering
            if (user.role !== 'admin') {
                queryBuilder.andWhere('form.createdBy = :userId', { userId: user.id });
            }
            if (search) {
                queryBuilder.andWhere('(form.title ILIKE :search OR form.name ILIKE :search OR form.description ILIKE :search)', { search: `%${search}%` });
            }
            if (status) {
                queryBuilder.andWhere('form.status = :status', { status });
            }
            if (createdBy && user.role === 'admin') {
                queryBuilder.andWhere('form.createdBy = :createdBy', { createdBy });
            }
            const [forms, total] = await queryBuilder
                .skip(skip)
                .take(Number(limit))
                .getManyAndCount();
            res.json({
                success: true,
                data: {
                    forms,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages: Math.ceil(total / Number(limit))
                    }
                }
            });
        }
        catch (error) {
            console.error('Error fetching forms:', error);
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch forms' }
            });
        }
    }
    async getFormById(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            const form = await this.formRepo.findOne({
                where: { id },
                relations: ['creator']
            });
            if (!form) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Form not found' }
                });
            }
            // Check permissions
            if (user.role !== 'admin' && form.createdBy !== user.id) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' }
                });
            }
            res.json({ success: true, data: form });
        }
        catch (error) {
            console.error('Error fetching form:', error);
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch form' }
            });
        }
    }
    async getFormByName(req, res) {
        try {
            const { name } = req.params;
            const form = await this.formRepo.findOne({
                where: { name, status: 'active' },
                relations: ['creator']
            });
            if (!form) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Form not found or inactive' }
                });
            }
            // Return only necessary data for public form rendering
            const publicFormData = {
                id: form.id,
                name: form.name,
                title: form.title,
                description: form.description,
                fields: form.fields,
                settings: {
                    submitButtonText: form.settings.submitButtonText || 'Submit',
                    progressBar: form.settings.progressBar || false,
                    limitSubmissions: form.settings.limitSubmissions || false,
                    requireLogin: form.settings.requireLogin || false,
                    honeypot: form.settings.honeypot || false
                },
                styling: form.styling
            };
            res.json({ success: true, data: publicFormData });
        }
        catch (error) {
            console.error('Error fetching form by name:', error);
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch form' }
            });
        }
    }
    async createForm(req, res) {
        try {
            const { name, title, description, fields = [], settings = {}, notifications = [], confirmations = [], styling } = req.body;
            const user = req.user;
            if (!user || !['admin', 'manager', 'business'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
                });
            }
            // Check if form name already exists
            const existingForm = await this.formRepo.findOne({ where: { name } });
            if (existingForm) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Form name already exists' }
                });
            }
            // Validate and process fields
            const processedFields = this.validateAndProcessFields(fields);
            if (!processedFields.valid) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: processedFields.error }
                });
            }
            // Create field index for quick lookup
            const fieldIndex = {};
            processedFields.fields.forEach((field, index) => {
                fieldIndex[field.name] = index;
            });
            const form = this.formRepo.create({
                name,
                title,
                description,
                fields: processedFields.fields,
                settings: this.processFormSettings(settings),
                notifications,
                confirmations,
                styling,
                status: 'draft',
                createdBy: user.id,
                fieldIndex,
                shortcode: `[form name="${name}"]`,
                submissionCount: 0
            });
            const savedForm = await this.formRepo.save(form);
            res.status(201).json({
                success: true,
                data: savedForm,
                message: 'Form created successfully'
            });
        }
        catch (error) {
            console.error('Error creating form:', error);
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to create form' }
            });
        }
    }
    async updateForm(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            const form = await this.formRepo.findOne({ where: { id } });
            if (!form) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Form not found' }
                });
            }
            // Check permissions
            if (user.role !== 'admin' && form.createdBy !== user.id) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' }
                });
            }
            const updateData = { ...req.body };
            delete updateData.id;
            delete updateData.name; // Prevent changing form name
            delete updateData.createdBy;
            // Process fields if provided
            if (updateData.fields) {
                const processedFields = this.validateAndProcessFields(updateData.fields);
                if (!processedFields.valid) {
                    return res.status(400).json({
                        success: false,
                        error: { code: 'VALIDATION_ERROR', message: processedFields.error }
                    });
                }
                updateData.fields = processedFields.fields;
                // Update field index
                const fieldIndex = {};
                processedFields.fields.forEach((field, index) => {
                    fieldIndex[field.name] = index;
                });
                updateData.fieldIndex = fieldIndex;
            }
            // Process settings if provided
            if (updateData.settings) {
                updateData.settings = this.processFormSettings(updateData.settings);
            }
            await this.formRepo.update(id, updateData);
            const updatedForm = await this.formRepo.findOne({
                where: { id },
                relations: ['creator']
            });
            res.json({
                success: true,
                data: updatedForm,
                message: 'Form updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating form:', error);
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to update form' }
            });
        }
    }
    async deleteForm(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            const form = await this.formRepo.findOne({ where: { id } });
            if (!form) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Form not found' }
                });
            }
            // Check permissions
            if (user.role !== 'admin' && form.createdBy !== user.id) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' }
                });
            }
            // Delete all submissions first
            await this.submissionRepo.delete({ formId: id });
            // Delete form
            await this.formRepo.remove(form);
            res.json({
                success: true,
                message: 'Form deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting form:', error);
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to delete form' }
            });
        }
    }
    async duplicateForm(req, res) {
        try {
            const { id } = req.params;
            const { name, title } = req.body;
            const user = req.user;
            const originalForm = await this.formRepo.findOne({ where: { id } });
            if (!originalForm) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Form not found' }
                });
            }
            // Check permissions
            if (user.role !== 'admin' && originalForm.createdBy !== user.id) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' }
                });
            }
            // Check if new form name already exists
            const existingForm = await this.formRepo.findOne({ where: { name } });
            if (existingForm) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Form name already exists' }
                });
            }
            const duplicateForm = this.formRepo.create({
                ...originalForm,
                id: undefined, // Let TypeORM generate new ID
                name,
                title: title || `${originalForm.title} (Copy)`,
                status: 'draft',
                createdBy: user.id,
                submissionCount: 0,
                lastSubmission: undefined,
                shortcode: `[form name="${name}"]`
            });
            const savedForm = await this.formRepo.save(duplicateForm);
            res.status(201).json({
                success: true,
                data: savedForm,
                message: 'Form duplicated successfully'
            });
        }
        catch (error) {
            console.error('Error duplicating form:', error);
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to duplicate form' }
            });
        }
    }
    async updateFormStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const user = req.user;
            if (!['active', 'inactive', 'draft'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid status' }
                });
            }
            const form = await this.formRepo.findOne({ where: { id } });
            if (!form) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Form not found' }
                });
            }
            // Check permissions
            if (user.role !== 'admin' && form.createdBy !== user.id) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' }
                });
            }
            await this.formRepo.update(id, { status });
            res.json({
                success: true,
                data: { status },
                message: `Form ${status === 'active' ? 'activated' : status === 'inactive' ? 'deactivated' : 'set to draft'} successfully`
            });
        }
        catch (error) {
            console.error('Error updating form status:', error);
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to update form status' }
            });
        }
    }
    // ============= Form Submissions =============
    async getFormSubmissions(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 20, search, status, startDate, endDate } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const user = req.user;
            const form = await this.formRepo.findOne({ where: { id } });
            if (!form) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Form not found' }
                });
            }
            // Check permissions
            if (user.role !== 'admin' && form.createdBy !== user.id) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' }
                });
            }
            const queryBuilder = this.submissionRepo
                .createQueryBuilder('submission')
                .where('submission.formId = :formId', { formId: id })
                .orderBy('submission.submittedAt', 'DESC');
            if (search) {
                queryBuilder.andWhere("submission.data::text ILIKE :search", { search: `%${search}%` });
            }
            if (status) {
                queryBuilder.andWhere('submission.status = :status', { status });
            }
            if (startDate) {
                queryBuilder.andWhere('submission.submittedAt >= :startDate', { startDate });
            }
            if (endDate) {
                queryBuilder.andWhere('submission.submittedAt <= :endDate', { endDate });
            }
            const [submissions, total] = await queryBuilder
                .skip(skip)
                .take(Number(limit))
                .getManyAndCount();
            res.json({
                success: true,
                data: {
                    submissions,
                    form: {
                        id: form.id,
                        name: form.name,
                        title: form.title
                    },
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages: Math.ceil(total / Number(limit))
                    }
                }
            });
        }
        catch (error) {
            console.error('Error fetching form submissions:', error);
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch form submissions' }
            });
        }
    }
    async submitForm(req, res) {
        try {
            const { id } = req.params;
            const { data, userAgent, ipAddress } = req.body;
            const form = await this.formRepo.findOne({ where: { id, status: 'active' } });
            if (!form) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Form not found or inactive' }
                });
            }
            // Validate submission data
            const validationResult = this.validateSubmissionData(form, data);
            if (!validationResult.valid) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: validationResult.error }
                });
            }
            // Create submission
            const submission = this.submissionRepo.create({
                form: { id },
                data: validationResult.data,
                userAgent,
                ipAddress,
                status: 'pending',
                submittedAt: new Date()
            });
            const savedSubmission = await this.submissionRepo.save(submission);
            // Update form submission count and last submission date
            await this.formRepo.update(id, {
                submissionCount: form.submissionCount + 1,
                lastSubmission: new Date()
            });
            // Process notifications and confirmations here
            // (Implementation depends on email service configuration)
            res.status(201).json({
                success: true,
                data: {
                    submissionId: Array.isArray(savedSubmission) ? savedSubmission[0].id : savedSubmission.id,
                    message: 'Form submitted successfully'
                }
            });
        }
        catch (error) {
            console.error('Error submitting form:', error);
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to submit form' }
            });
        }
    }
    // ============= Helper Methods =============
    validateAndProcessFields(fields) {
        if (!Array.isArray(fields)) {
            return { valid: false, error: 'Fields must be an array' };
        }
        const processedFields = [];
        const fieldNames = new Set();
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            if (!field.name || !field.type || !field.label) {
                return { valid: false, error: `Field ${i + 1}: name, type, and label are required` };
            }
            if (fieldNames.has(field.name)) {
                return { valid: false, error: `Duplicate field name: ${field.name}` };
            }
            fieldNames.add(field.name);
            processedFields.push(field);
        }
        return { valid: true, fields: processedFields };
    }
    processFormSettings(settings) {
        return {
            submitButtonText: settings.submitButtonText || 'Submit',
            showProgressBar: settings.showProgressBar || false,
            allowMultipleSubmissions: settings.allowMultipleSubmissions || false,
            requireLogin: settings.requireLogin || false,
            honeypot: settings.honeypot || false,
            customCSS: settings.customCSS || '',
            successMessage: settings.successMessage || 'Thank you for your submission!',
            errorMessage: settings.errorMessage || 'An error occurred. Please try again.',
            ...settings
        };
    }
    validateSubmissionData(form, data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Invalid submission data' };
        }
        const validatedData = {};
        for (const field of form.fields) {
            const value = data[field.name];
            // Check required fields
            if (field.required && (value === undefined || value === null || value === '')) {
                return { valid: false, error: `${field.label} is required` };
            }
            // Validate field type and format
            if (value !== undefined && value !== null && value !== '') {
                const validationResult = this.validateFieldValue(field, value);
                if (!validationResult.valid) {
                    return { valid: false, error: `${field.label}: ${validationResult.error}` };
                }
                validatedData[field.name] = validationResult.value;
            }
        }
        return { valid: true, data: validatedData };
    }
    validateFieldValue(field, value) {
        // Basic validation based on field type
        switch (field.type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    return { valid: false, error: 'Invalid email format' };
                }
                break;
            case 'number':
                const numValue = Number(value);
                if (isNaN(numValue)) {
                    return { valid: false, error: 'Must be a valid number' };
                }
                return { valid: true, value: numValue };
            case 'url':
                try {
                    new URL(value);
                }
                catch (_a) {
                    return { valid: false, error: 'Invalid URL format' };
                }
                break;
            case 'tel':
                const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
                if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
                    return { valid: false, error: 'Invalid phone number format' };
                }
                break;
            default:
                // For other field types, just ensure it's a string
                if (typeof value !== 'string') {
                    return { valid: false, error: 'Invalid value format' };
                }
        }
        return { valid: true, value };
    }
}
exports.FormsController = FormsController;
//# sourceMappingURL=FormsController.js.map