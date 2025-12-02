// Partner Utility Functions

/**
 * Calculate commission based on tier and amount
 */
export const calculateCommission = (
  amount: number,
  tierLevel: number,
  baseRate: number = 10
): number => {
  const tierMultipliers: Record<number, number> = {
    1: 1.0,  // Bronze: Base rate
    2: 1.2,  // Silver: 20% bonus
    3: 1.5,  // Gold: 50% bonus
    4: 2.0   // Platinum: 100% bonus
  };
  
  const multiplier = tierMultipliers[tierLevel] || 1.0;
  const commissionRate = baseRate * multiplier;
  
  return (amount * commissionRate) / 100;
};

/**
 * Generate partner link with tracking parameters
 */
export const generatePartnerLink = (
  baseUrl: string,
  partnerCode: string,
  params?: {
    productId?: string;
    campaignId?: string;
    source?: string;
    medium?: string;
  }
): string => {
  const url = new URL(baseUrl);
  
  // Add partner code
  url.searchParams.set('ref', partnerCode);
  
  // Add tracking parameters
  if (params?.productId) {
    url.searchParams.set('pid', params.productId);
  }
  if (params?.campaignId) {
    url.searchParams.set('cid', params.campaignId);
  }
  if (params?.source) {
    url.searchParams.set('utm_source', params.source);
  }
  if (params?.medium) {
    url.searchParams.set('utm_medium', params.medium);
  }
  
  return url.toString();
};

/**
 * Format commission tier information
 */
export const formatTierInfo = (tier: string): {
  name: string;
  color: string;
  icon: string;
  minSales: number;
  commissionBonus: string;
} => {
  const tiers: Record<string, any> = {
    bronze: {
      name: 'Bronze',
      color: '#cd7f32',
      icon: '🥉',
      minSales: 0,
      commissionBonus: '0%'
    },
    silver: {
      name: 'Silver',
      color: '#c0c0c0',
      icon: '🥈',
      minSales: 10,
      commissionBonus: '+20%'
    },
    gold: {
      name: 'Gold',
      color: '#ffd700',
      icon: '🥇',
      minSales: 50,
      commissionBonus: '+50%'
    },
    platinum: {
      name: 'Platinum',
      color: '#e5e4e2',
      icon: '💎',
      minSales: 100,
      commissionBonus: '+100%'
    }
  };
  
  return tiers[tier.toLowerCase()] || tiers.bronze;
};

/**
 * Calculate payout after fees
 */
export const calculateNetPayout = (
  amount: number,
  feePercentage: number = 2.5,
  fixedFee: number = 0
): {
  gross: number;
  fee: number;
  net: number;
} => {
  const percentageFee = (amount * feePercentage) / 100;
  const totalFee = percentageFee + fixedFee;
  const netAmount = amount - totalFee;
  
  return {
    gross: amount,
    fee: totalFee,
    net: netAmount
  };
};

/**
 * Format currency with proper locale
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Calculate conversion rate
 */
export const calculateConversionRate = (
  conversions: number,
  clicks: number
): number => {
  if (clicks === 0) return 0;
  return (conversions / clicks) * 100;
};

/**
 * Calculate earnings per click (EPC)
 */
export const calculateEPC = (
  earnings: number,
  clicks: number
): number => {
  if (clicks === 0) return 0;
  return earnings / clicks;
};

/**
 * Format large numbers with abbreviations
 */
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Generate short URL from long URL
 */
export const generateShortUrl = (_longUrl: string, domain: string = 'aff.link'): string => {
  // Generate a random 6-character code
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let shortCode = '';
  for (let i = 0; i < 6; i++) {
    shortCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return `https://${domain}/${shortCode}`;
};

/**
 * Parse partner link parameters
 */
export const parsePartnerLink = (url: string): {
  partnerCode?: string;
  productId?: string;
  campaignId?: string;
  source?: string;
  medium?: string;
} => {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    return {
      partnerCode: params.get('ref') || undefined,
      productId: params.get('pid') || undefined,
      campaignId: params.get('cid') || undefined,
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined
    };
  } catch (error) {
    return {};
  }
};

/**
 * Validate payout account details
 */
export const validatePayoutAccount = (
  type: string,
  details: Record<string, string>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  switch (type) {
    case 'bank':
      if (!details.accountNumber || details.accountNumber.length < 8) {
        errors.push('Invalid account number');
      }
      if (!details.routingNumber || !/^\d{9}$/.test(details.routingNumber)) {
        errors.push('Routing number must be 9 digits');
      }
      break;
      
    case 'paypal':
      if (!details.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
        errors.push('Invalid PayPal email address');
      }
      break;
      
    case 'crypto':
      if (!details.currency) {
        errors.push('Cryptocurrency type is required');
      }
      if (!details.address || details.address.length < 26) {
        errors.push('Invalid wallet address');
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Calculate tier progress
 */
export const calculateTierProgress = (
  currentSales: number,
  currentRevenue: number,
  targetTier: string
): {
  salesProgress: number;
  revenueProgress: number;
  percentageComplete: number;
  salesNeeded: number;
  revenueNeeded: number;
} => {
  const tierRequirements: Record<string, { sales: number; revenue: number }> = {
    silver: { sales: 10, revenue: 1000 },
    gold: { sales: 50, revenue: 5000 },
    platinum: { sales: 100, revenue: 10000 }
  };
  
  const target = tierRequirements[targetTier.toLowerCase()];
  if (!target) {
    return {
      salesProgress: 100,
      revenueProgress: 100,
      percentageComplete: 100,
      salesNeeded: 0,
      revenueNeeded: 0
    };
  }
  
  const salesProgress = (currentSales / target.sales) * 100;
  const revenueProgress = (currentRevenue / target.revenue) * 100;
  const percentageComplete = Math.min(salesProgress, revenueProgress);
  
  return {
    salesProgress: Math.min(salesProgress, 100),
    revenueProgress: Math.min(revenueProgress, 100),
    percentageComplete: Math.min(percentageComplete, 100),
    salesNeeded: Math.max(0, target.sales - currentSales),
    revenueNeeded: Math.max(0, target.revenue - currentRevenue)
  };
};

/**
 * Generate social share messages
 */
export const generateShareMessage = (
  platform: string,
  product: string,
  link: string,
  discount?: string
): string => {
  const templates: Record<string, string> = {
    twitter: `Check out ${product}! ${discount ? `Use my link for ${discount} off: ` : ''}${link} #partner #deals`,
    facebook: `I found this amazing product: ${product}! ${discount ? `Get ${discount} off with my exclusive link: ` : 'Check it out: '}${link}`,
    whatsapp: `Hey! I wanted to share this with you: ${product} 🎉 ${discount ? `\n\nGet ${discount} off with my link: ` : '\n\n'}${link}`,
    email: `Subject: Check out ${product}!\n\nHi,\n\nI found this great product and thought you might be interested: ${product}\n\n${discount ? `You can get ${discount} off using my partner link:\n` : 'Check it out here:\n'}${link}\n\nBest regards`,
    instagram: `${product} 🔥 ${discount ? `${discount} OFF! ` : ''}Link in bio 👆 #partner #${product.replace(/\s+/g, '').toLowerCase()}`
  };
  
  return templates[platform.toLowerCase()] || templates.twitter;
};

/**
 * Calculate partner rank based on performance
 */
export const calculatePartnerRank = (
  totalSales: number,
  totalRevenue: number,
  conversionRate: number
): {
  rank: string;
  score: number;
  percentile: number;
} => {
  // Simple scoring algorithm
  const salesScore = Math.min(totalSales / 100 * 30, 30); // Max 30 points
  const revenueScore = Math.min(totalRevenue / 10000 * 40, 40); // Max 40 points
  const conversionScore = Math.min(conversionRate * 3, 30); // Max 30 points
  
  const totalScore = salesScore + revenueScore + conversionScore;
  
  let rank = 'Beginner';
  let percentile = 0;
  
  if (totalScore >= 90) {
    rank = 'Elite';
    percentile = 95;
  } else if (totalScore >= 70) {
    rank = 'Expert';
    percentile = 80;
  } else if (totalScore >= 50) {
    rank = 'Advanced';
    percentile = 60;
  } else if (totalScore >= 30) {
    rank = 'Intermediate';
    percentile = 40;
  } else if (totalScore >= 10) {
    rank = 'Novice';
    percentile = 20;
  }
  
  return {
    rank,
    score: Math.round(totalScore),
    percentile
  };
};