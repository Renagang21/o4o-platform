import * as Joi from 'joi';

export const createAffiliateSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  commissionRate: Joi.number().min(0).max(100).optional().default(10),
  websiteUrl: Joi.string().uri().optional().allow(''),
  description: Joi.string().max(500).optional().allow(''),
  metadata: Joi.object({
    paymentMethod: Joi.string().optional(),
    paymentDetails: Joi.object().optional(),
    customSettings: Joi.object().optional(),
    notes: Joi.string().optional()
  }).optional()
});

export const createAffiliateLinkSchema = Joi.object({
  affiliateUserId: Joi.string().uuid().required(),
  landingUrl: Joi.string().uri().required(),
  source: Joi.string().max(50).optional(),
  medium: Joi.string().max(50).optional(),
  campaign: Joi.string().max(100).optional(),
  customParams: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
  ).optional()
});

export const trackClickSchema = Joi.object({
  referralCode: Joi.string().max(50).required(),
  sessionId: Joi.string().max(100).required(),
  ipAddress: Joi.string().ip().required(),
  userAgent: Joi.string().max(500).optional(),
  referrerUrl: Joi.string().uri().optional().allow(''),
  landingUrl: Joi.string().uri().required(),
  device: Joi.string().max(50).optional(),
  browser: Joi.string().max(50).optional(),
  os: Joi.string().max(50).optional(),
  country: Joi.string().max(100).optional(),
  city: Joi.string().max(100).optional(),
  metadata: Joi.object({
    source: Joi.string().optional(),
    medium: Joi.string().optional(),
    campaign: Joi.string().optional(),
    keyword: Joi.string().optional(),
    adId: Joi.string().optional(),
    customParams: Joi.object().optional()
  }).optional()
});

export const trackConversionSchema = Joi.object({
  sessionId: Joi.string().max(100).required(),
  orderId: Joi.string().uuid().optional(),
  customerId: Joi.string().uuid().optional(),
  orderAmount: Joi.number().positive().required(),
  conversionType: Joi.string()
    .valid('sale', 'signup', 'subscription', 'custom')
    .optional()
    .default('sale'),
  ipAddress: Joi.string().ip().optional(),
  userAgent: Joi.string().max(500).optional(),
  metadata: Joi.object({
    productIds: Joi.array().items(Joi.string()).optional(),
    couponCode: Joi.string().optional(),
    paymentMethod: Joi.string().optional(),
    source: Joi.string().optional(),
    customData: Joi.object().optional()
  }).optional()
});

export const getAffiliateStatsSchema = Joi.object({
  affiliateUserId: Joi.string().uuid().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').optional().default('day')
});

export const getAffiliateUserSchema = Joi.object({
  userId: Joi.string().uuid().optional(),
  referralCode: Joi.string().max(50).optional()
}).or('userId', 'referralCode');