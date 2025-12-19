import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import { Form } from '../entities/Form.js';
import { FormSubmission } from '../entities/FormSubmission.js';
import { User } from '../entities/User.js';
import type { FormField, FormNotification } from '../types/index.js';
import type { AuthRequest } from '../types/auth.js';
import { sendEmail } from '../utils/email.js';
import { evaluateConditionalLogic } from '../utils/conditionalLogic.js';
import { calculateFormula } from '../utils/formula.js';
import type { Express } from 'express';
import { Between, In, Like } from 'typeorm';
import * as UAParser from 'ua-parser-js';
import { getGeoLocation } from '../utils/geoLocation.js';

const formRepository = AppDataSource.getRepository(Form);
const submissionRepository = AppDataSource.getRepository(FormSubmission);
const userRepository = AppDataSource.getRepository(User);

export const formController = {
  // Create new form
  async createForm(req: AuthRequest, res: Response) {
    try {
      const { name, title, description, fields, settings, notifications, confirmations, styling } = req.body;

      // Check if form name already exists
      const existingForm = await formRepository.findOne({ where: { name } });
      if (existingForm) {
        return res.status(400).json({ error: 'Form name already exists' });
      }

      // Create field index for quick lookup
      const fieldIndex: Record<string, number> = {};
      fields.forEach((field: FormField, index: number) => {
        fieldIndex[field.name] = index;
      });

      const form = formRepository.create({
        name,
        title,
        description,
        fields,
        settings,
        notifications: notifications || [],
        confirmations: confirmations || [],
        styling,
        createdBy: req.user!.id,
        fieldIndex,
        shortcode: `[form name="${name}"]`
      });

      await formRepository.save(form);

      res.status(201).json({
        message: 'Form created successfully',
        form
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to create form' });
    }
  },

  // Update form
  async updateForm(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const form = await formRepository.findOne({ where: { id } });
      if (!form) {
        return res.status(404).json({ error: 'Form not found' });
      }

      // Update field index if fields changed
      if (updates.fields) {
        const fieldIndex: Record<string, number> = {};
        updates.fields.forEach((field: FormField, index: number) => {
          fieldIndex[field.name] = index;
        });
        updates.fieldIndex = fieldIndex;
      }

      Object.assign(form, updates);
      await formRepository.save(form);

      res.json({
        message: 'Form updated successfully',
        form
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to update form' });
    }
  },

  // Get all forms
  async getForms(req: AuthRequest, res: Response) {
    try {
      const { status, search, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (status) where.status = status;
      if (search) where.title = Like(`%${search}%`);

      const [forms, total] = await formRepository.findAndCount({
        where,
        relations: ['creator'],
        order: { createdAt: 'DESC' },
        skip,
        take: Number(limit)
      });

      res.json({
        forms,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to fetch forms' });
    }
  },

  // Get single form
  async getForm(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const form = await formRepository.findOne({
        where: { id },
        relations: ['creator']
      });

      if (!form) {
        return res.status(404).json({ error: 'Form not found' });
      }

      res.json(form);
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to fetch form' });
    }
  },

  // Delete form
  async deleteForm(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await formRepository.delete(id);

      if (result.affected === 0) {
        return res.status(404).json({ error: 'Form not found' });
      }

      res.json({ message: 'Form deleted successfully' });
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to delete form' });
    }
  },

  // Submit form
  async submitForm(req: Request, res: Response) {
    try {
      const { formId } = req.params;
      const data = req.body;
      const files = req.files as any[];

      // Get form
      const form = await formRepository.findOne({ where: { id: formId } });
      if (!form || form.status !== 'active') {
        return res.status(404).json({ error: 'Form not found or inactive' });
      }

      // Check submission limits
      if (form.settings.limitSubmissions && form.submissionCount >= (form.settings.maxSubmissions || 0)) {
        return res.status(400).json({ error: 'Form submission limit reached' });
      }

      // Check user limits
      const userId = (req as AuthRequest).user?.id;
      if (form.settings.requireLogin && !userId) {
        return res.status(401).json({ error: 'Login required to submit this form' });
      }

      if (form.settings.limitPerUser && userId) {
        const userSubmissions = await submissionRepository.count({
          where: { formId, userId }
        });
        if (userSubmissions >= (form.settings.maxPerUser || 1)) {
          return res.status(400).json({ error: 'You have reached your submission limit for this form' });
        }
      }

      // Process form data
      const processedData: Record<string, any> = {};
      const fieldTimings: Record<string, number> = {};

      for (const field of form.fields) {
        // Skip if conditional logic hides the field
        if (field.conditional && !evaluateConditionalLogic(field.conditional, data)) {
          continue;
        }

        let value = data[field.name];

        // Handle calculations
        if (field.type === 'calculation' && field.calculation) {
          value = calculateFormula(field.calculation, processedData);
        }

        // Validate required fields
        if (field.required && !value) {
          return res.status(400).json({ 
            error: `Field "${field.label}" is required`,
            field: field.name 
          });
        }

        // Type-specific validation
        if (value) {
          switch (field.type) {
            case 'email':
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return res.status(400).json({ 
                  error: `Invalid email format for "${field.label}"`,
                  field: field.name 
                });
              }
              break;
            case 'number':
              value = Number(value);
              if (isNaN(value)) {
                return res.status(400).json({ 
                  error: `Invalid number for "${field.label}"`,
                  field: field.name 
                });
              }
              if (field.min !== undefined && value < field.min) {
                return res.status(400).json({ 
                  error: `Value for "${field.label}" must be at least ${field.min}`,
                  field: field.name 
                });
              }
              if (field.max !== undefined && value > field.max) {
                return res.status(400).json({ 
                  error: `Value for "${field.label}" must be at most ${field.max}`,
                  field: field.name 
                });
              }
              break;
          }
        }

        processedData[field.name] = value;
      }

      // Parse user agent
      const parser = new (UAParser as any)(req.headers['user-agent']);
      const uaResult = parser.getResult();

      // Get geo location (using lightweight API)
      const ip = req.ip || req.connection.remoteAddress || '';
      const geo = await getGeoLocation(ip);

      // Handle file uploads
      const uploadedFiles = [];
      if (files && files.length > 0) {
        for (const file of files) {
          uploadedFiles.push({
            fieldId: file.fieldname,
            filename: file.originalname,
            url: `/uploads/${file.filename}`,
            size: file.size,
            mimeType: file.mimetype
          });
        }
      }

      // Create submission
      const submission = submissionRepository.create({
        formId: form.id,
        formName: form.name,
        data: processedData,
        userId,
        userEmail: processedData.email || (req as AuthRequest).user?.email,
        userName: processedData.name || (req as AuthRequest).user?.name,
        ipAddress: ip,
        userAgent: req.headers['user-agent'] || '',
        referrer: req.headers.referer || '',
        source: req.headers.origin || '',
        files: uploadedFiles,
        fieldTimings,
        geoLocation: geo || undefined,
        deviceType: uaResult.device.type || 'desktop',
        browser: uaResult.browser.name || '',
        os: uaResult.os.name || ''
      });

      await submissionRepository.save(submission);

      // Update form stats
      form.submissionCount++;
      form.lastSubmission = new Date();
      await formRepository.save(form);

      // Send notifications
      for (const notification of form.notifications) {
        if (!notification.enabled) continue;
        
        // Check conditional logic
        if (notification.conditional && !evaluateConditionalLogic(notification.conditional, processedData)) {
          continue;
        }

        // Parse recipients
        const recipients = Array.isArray(notification.to) ? notification.to : [notification.to];
        const toEmails = recipients.map((to: any) => {
          if (to.startsWith('{field:') && to.endsWith('}')) {
            const fieldName = to.slice(7, -1);
            return processedData[fieldName];
          }
          return to;
        }).filter(Boolean);

        // Parse message with merge tags
        let message = notification.message;
        for (const [key, value] of Object.entries(processedData)) {
          message = message.replace(new RegExp(`{field:${key}}`, 'g'), String(value || ''));
        }

        // Send email
        try {
          await sendEmail({
            to: toEmails,
            subject: notification.subject,
            html: message,
            from: notification.fromEmail ? `${notification.fromName || ''} <${notification.fromEmail}>` : undefined,
            replyTo: notification.replyTo,
            cc: notification.cc ? notification.cc.split(',').map((e: any) => e.trim()).filter(Boolean) : undefined,
            bcc: notification.bcc ? notification.bcc.split(',').map((e: any) => e.trim()).filter(Boolean) : undefined
          });
        } catch (emailError) {
          // Error log removed
        }
      }

      // Get confirmation
      let confirmation = form.confirmations[0]; // Default confirmation
      for (const conf of form.confirmations) {
        if (conf.conditional && evaluateConditionalLogic(conf.conditional, processedData)) {
          confirmation = conf;
          break;
        }
      }

      res.json({
        success: true,
        submissionId: submission.id,
        confirmation: confirmation ? {
          type: confirmation.type,
          message: confirmation.message,
          redirectUrl: confirmation.redirectUrl,
          pageId: confirmation.pageId
        } : {
          type: 'message',
          message: 'Thank you for your submission!'
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to submit form' });
    }
  },

  // Get form submissions
  async getSubmissions(req: AuthRequest, res: Response) {
    try {
      const { formId } = req.params;
      const { status, starred, search, startDate, endDate, page = 1, limit = 50 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = { formId };
      if (status) where.status = status;
      if (starred !== undefined) where.starred = starred === 'true';
      if (startDate || endDate) {
        where.submittedAt = Between(
          startDate ? new Date(String(startDate)) : new Date('1970-01-01'),
          endDate ? new Date(String(endDate)) : new Date()
        );
      }

      const [submissions, total] = await submissionRepository.findAndCount({
        where,
        relations: ['user'],
        order: { submittedAt: 'DESC' },
        skip,
        take: Number(limit)
      });

      res.json({
        submissions,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  },

  // Update submission status
  async updateSubmission(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, starred, notes } = req.body;

      const submission = await submissionRepository.findOne({ where: { id } });
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      if (status) submission.status = status;
      if (starred !== undefined) submission.starred = starred;
      if (notes) submission.notes = notes;
      submission.read = true;

      await submissionRepository.save(submission);

      res.json({
        message: 'Submission updated successfully',
        submission
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to update submission' });
    }
  },

  // Delete submission
  async deleteSubmission(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await submissionRepository.delete(id);

      if (result.affected === 0) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      res.json({ message: 'Submission deleted successfully' });
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to delete submission' });
    }
  },

  // Get form report
  async getFormReport(req: AuthRequest, res: Response) {
    try {
      const { formId } = req.params;
      const { startDate, endDate } = req.query;

      const form = await formRepository.findOne({ where: { id: formId } });
      if (!form) {
        return res.status(404).json({ error: 'Form not found' });
      }

      const dateFilter = startDate || endDate ? {
        submittedAt: Between(
          startDate ? new Date(String(startDate)) : new Date('1970-01-01'),
          endDate ? new Date(String(endDate)) : new Date()
        )
      } : {};

      // Get submissions
      const submissions = await submissionRepository.find({
        where: { formId, ...dateFilter },
        order: { submittedAt: 'ASC' }
      });

      // Calculate statistics
      const fieldStats: Record<string, any> = {};
      const dailySubmissions: Record<string, number> = {};
      const referrerCount: Record<string, number> = {};
      const deviceCount: Record<string, number> = {};

      for (const submission of submissions) {
        // Daily submissions
        const date = submission.submittedAt.toISOString().split('T')[0];
        dailySubmissions[date] = (dailySubmissions[date] || 0) + 1;

        // Referrer stats
        if (submission.referrer) {
          const domain = new URL(submission.referrer).hostname;
          referrerCount[domain] = (referrerCount[domain] || 0) + 1;
        }

        // Device stats
        deviceCount[submission.deviceType || 'unknown'] = (deviceCount[submission.deviceType || 'unknown'] || 0) + 1;

        // Field statistics
        for (const field of form.fields) {
          if (!fieldStats[field.id]) {
            fieldStats[field.id] = {
              fieldId: field.id,
              fieldName: field.label,
              responses: 0,
              skipped: 0,
              values: {}
            };
          }

          const value = submission.data[field.name];
          if (value !== undefined && value !== null && value !== '') {
            fieldStats[field.id].responses++;
            
            // Track values for select/radio fields
            if (['select', 'radio', 'checkbox'].includes(field.type)) {
              const values = Array.isArray(value) ? value : [value];
              for (const v of values) {
                fieldStats[field.id].values[v] = (fieldStats[field.id].values[v] || 0) + 1;
              }
            }
          } else {
            fieldStats[field.id].skipped++;
          }
        }
      }

      // Format field statistics
      const formattedFieldStats = Object.values(fieldStats).map((stat: any) => {
        const topValues = Object.entries(stat.values)
          .map(([value, count]) => ({ value, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        return {
          fieldId: stat.fieldId,
          fieldName: stat.fieldName,
          responses: stat.responses,
          skipped: stat.skipped,
          topValues: topValues.length > 0 ? topValues : undefined
        };
      });

      // Format other stats
      const submissionsByDate = Object.entries(dailySubmissions)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const topReferrers = Object.entries(referrerCount)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const deviceBreakdown = Object.entries(deviceCount)
        .map(([device, count]) => ({ device, count }));

      const report = {
        formId,
        totalSubmissions: submissions.length,
        uniqueSubmitters: new Set(submissions.map((s: any) => s.userEmail || s.ipAddress)).size,
        conversionRate: 0, // Would need page view data to calculate
        averageCompletionTime: 0, // Would need timing data
        fieldStats: formattedFieldStats,
        submissionsByDate,
        topReferrers,
        deviceBreakdown
      };

      res.json(report);
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to generate form report' });
    }
  }
};