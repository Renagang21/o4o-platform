import * as Joi from 'joi';

export const getCommissionsSchema = Joi.object({
  affiliateUserId: Joi.string().uuid().optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'paid').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  orderBy: Joi.string().valid('created_at', 'amount', 'status').optional().default('created_at'),
  orderDirection: Joi.string().valid('ASC', 'DESC').optional().default('DESC')
});

export const calculateCommissionSchema = Joi.object({
  conversionId: Joi.string().uuid().required(),
  orderId: Joi.string().optional(),
  orderAmount: Joi.number().positive().required(),
  metadata: Joi.object().optional()
});

export const processCommissionsSchema = Joi.object({
  commissionIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  action: Joi.string().valid('approve', 'reject', 'pay').required(),
  reason: Joi.string().max(500).when('action', {
    is: 'reject',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  paymentReference: Joi.string().max(100).when('action', {
    is: 'pay',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  notes: Joi.string().max(500).optional()
});

export const createPayoutSchema = Joi.object({
  affiliateUserId: Joi.string().uuid().required(),
  commissionIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  paymentMethod: Joi.string()
    .valid('bank_transfer', 'paypal', 'stripe', 'manual', 'other')
    .required(),
  bankAccount: Joi.object({
    accountName: Joi.string().optional(),
    accountNumber: Joi.string().optional(),
    bankName: Joi.string().optional(),
    bankCode: Joi.string().optional(),
    swiftCode: Joi.string().optional(),
    routingNumber: Joi.string().optional(),
    iban: Joi.string().optional()
  }).when('paymentMethod', {
    is: 'bank_transfer',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  paymentDetails: Joi.object({
    paypalEmail: Joi.string().email().optional(),
    stripeAccountId: Joi.string().optional(),
    wireDetails: Joi.object().optional(),
    otherDetails: Joi.object().optional()
  }).optional(),
  notes: Joi.string().max(500).optional()
});

export const getPayoutsSchema = Joi.object({
  affiliateUserId: Joi.string().uuid().optional(),
  status: Joi.string()
    .valid('pending', 'processing', 'completed', 'failed', 'cancelled')
    .optional(),
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20)
});

export const updateAffiliateStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'suspended').required(),
  reason: Joi.string().max(500).when('status', {
    is: 'suspended',
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

export const getAffiliateUsersSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  orderBy: Joi.string()
    .valid('created_at', 'totalEarnings', 'totalClicks', 'totalConversions')
    .optional()
    .default('created_at'),
  orderDirection: Joi.string().valid('ASC', 'DESC').optional().default('DESC')
});

export const adminDashboardQuerySchema = Joi.object({
  period: Joi.string().valid('today', 'week', 'month', 'year', 'all').optional().default('month'),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
});