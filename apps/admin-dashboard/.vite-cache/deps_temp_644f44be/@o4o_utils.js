import {
  twMerge
} from "./chunk-QKQKST6F.js";
import {
  clsx
} from "./chunk-E6K43OEW.js";
import "./chunk-OL46QLBJ.js";

// ../../packages/utils/dist/helpers.js
var capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
var debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
var throttle = (func, wait) => {
  let isThrottled = false;
  let lastArgs = null;
  return (...args) => {
    if (isThrottled) {
      lastArgs = args;
      return;
    }
    func(...args);
    isThrottled = true;
    setTimeout(() => {
      isThrottled = false;
      if (lastArgs !== null) {
        func(...lastArgs);
        lastArgs = null;
      }
    }, wait);
  };
};
var parseQueryString = (query) => {
  const params = new URLSearchParams(query);
  const result = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};
var buildQueryString = (params) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== void 0) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};
var sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
var isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
var isValidPhone = (phone) => {
  const phoneRegex = /^(\+82|0)1[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phone);
};
var generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
var truncateText = (text, maxLength, suffix = "...") => {
  if (text.length <= maxLength)
    return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};
var groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};
var sortBy = (array, key, order = "asc") => {
  return [...array].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    if (aValue < bValue)
      return order === "asc" ? -1 : 1;
    if (aValue > bValue)
      return order === "asc" ? 1 : -1;
    return 0;
  });
};
var clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};
var range = (start, end, step = 1) => {
  const result = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
};

// ../../packages/utils/dist/validators.js
var isEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
var isStrongPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};
var isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ../../packages/utils/dist/pricing.js
function getRoleBasedPrice(pricing, userRole, retailerGrade) {
  switch (userRole) {
    case "customer":
      return pricing.customer;
    case "business":
      return pricing.business;
    case "affiliate":
      return pricing.affiliate;
    case "retailer":
      if (!retailerGrade) {
        return pricing.retailer.gold;
      }
      return pricing.retailer[retailerGrade];
    case "supplier":
    case "admin":
      return Math.min(pricing.customer, pricing.business, pricing.affiliate, pricing.retailer.gold, pricing.retailer.premium, pricing.retailer.vip);
    default:
      return pricing.customer;
  }
}
function getAllRolePrices(pricing) {
  return [
    { role: "customer", price: pricing.customer, label: "일반 고객" },
    { role: "business", price: pricing.business, label: "비즈니스" },
    { role: "affiliate", price: pricing.affiliate, label: "제휴사" },
    { role: "retailer-gold", price: pricing.retailer.gold, label: "골드 리테일러" },
    { role: "retailer-premium", price: pricing.retailer.premium, label: "프리미엄 리테일러" },
    { role: "retailer-vip", price: pricing.retailer.vip, label: "VIP 리테일러" }
  ];
}
function calculateDiscountPercentage(originalPrice, discountedPrice) {
  if (originalPrice <= 0)
    return 0;
  return Math.round((originalPrice - discountedPrice) / originalPrice * 100);
}
function calculateSavings(originalPrice, finalPrice) {
  const amount = Math.max(0, originalPrice - finalPrice);
  const percentage = originalPrice > 0 ? amount / originalPrice * 100 : 0;
  return {
    amount: Math.round(amount * 100) / 100,
    percentage: Math.round(percentage * 100) / 100
  };
}
function calculateVolumeDiscount(basePrice, quantity, volumeDiscounts) {
  const applicableTier = volumeDiscounts.filter((tier) => quantity >= tier.minQuantity && (!tier.maxQuantity || quantity <= tier.maxQuantity)).sort((a, b) => b.discountValue - a.discountValue)[0];
  if (!applicableTier) {
    return {
      discountAmount: 0,
      discountPercentage: 0,
      finalPrice: basePrice
    };
  }
  let discountAmount = 0;
  if (applicableTier.discountType === "percentage") {
    discountAmount = basePrice * (applicableTier.discountValue / 100);
  } else {
    discountAmount = applicableTier.discountValue;
  }
  const finalPrice = Math.max(0, basePrice - discountAmount);
  const discountPercentage = basePrice > 0 ? discountAmount / basePrice * 100 : 0;
  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    discountPercentage: Math.round(discountPercentage * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    appliedTier: applicableTier
  };
}
function calculatePrice(pricing, context, options = {}) {
  var _a;
  const basePrice = getRoleBasedPrice(pricing, context.userRole, context.retailerGrade);
  const originalPrice = pricing.customer;
  const roleSavings = calculateSavings(originalPrice, basePrice);
  const roleDiscount = roleSavings.amount > 0 ? {
    type: "role_based",
    amount: roleSavings.amount,
    percentage: roleSavings.percentage,
    label: getRoleLabel(context.userRole, context.retailerGrade)
  } : null;
  let currentPrice = basePrice;
  const volumeDiscount = options.volumeDiscounts ? calculateVolumeDiscount(basePrice, context.quantity, options.volumeDiscounts) : null;
  if (volumeDiscount && volumeDiscount.discountAmount > 0) {
    currentPrice = volumeDiscount.finalPrice;
  }
  const ruleDiscounts = [];
  let additionalDiscountAmount = 0;
  if (options.additionalDiscounts) {
    for (const discount of options.additionalDiscounts) {
      const discountAmount = discount.percentage ? currentPrice * (discount.percentage / 100) : discount.amount;
      additionalDiscountAmount += discountAmount;
      ruleDiscounts.push({
        ruleId: discount.type,
        ruleName: discount.type,
        type: discount.percentage ? "percentage" : "fixed_amount",
        amount: discountAmount,
        percentage: discount.percentage || discountAmount / currentPrice * 100
      });
    }
  }
  currentPrice = Math.max(0, currentPrice - additionalDiscountAmount);
  const taxRate = options.taxRate || 0;
  const subtotal = currentPrice * context.quantity;
  const taxAmount = subtotal * (taxRate / 100);
  const finalPrice = subtotal + taxAmount;
  const originalTotal = originalPrice * context.quantity;
  const totalSavings = originalTotal - subtotal;
  const totalSavingsPercentage = originalTotal > 0 ? totalSavings / originalTotal * 100 : 0;
  return {
    originalPrice,
    basePrice,
    roleDiscount,
    volumeDiscount: volumeDiscount && volumeDiscount.discountAmount > 0 ? {
      type: "volume",
      amount: volumeDiscount.discountAmount * context.quantity,
      percentage: volumeDiscount.discountPercentage,
      label: `${context.quantity}개 이상 할인`,
      tier: `${(_a = volumeDiscount.appliedTier) == null ? void 0 : _a.minQuantity}+개`
    } : null,
    ruleDiscounts,
    subtotal,
    taxAmount,
    finalPrice,
    totalSavings,
    totalSavingsPercentage,
    currency: "KRW",
    formattedPrice: formatCurrency(finalPrice, "KRW"),
    formattedOriginalPrice: formatCurrency(originalTotal, "KRW"),
    formattedSavings: formatCurrency(totalSavings, "KRW"),
    breakdown: {
      basePrice,
      discounts: {
        roleBasedDiscount: (roleDiscount == null ? void 0 : roleDiscount.amount) || 0,
        volumeDiscount: (volumeDiscount == null ? void 0 : volumeDiscount.discountAmount) || 0,
        couponDiscount: 0,
        membershipDiscount: 0,
        promotionalDiscount: additionalDiscountAmount,
        other: 0
      },
      fees: {
        tax: taxAmount,
        shipping: 0,
        handling: 0,
        service: 0,
        other: 0
      },
      total: finalPrice
    }
  };
}
function formatCurrency(amount, currency = "KRW", locale = "ko-KR") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (error) {
    const symbol = getCurrencySymbol(currency);
    const formatted = new Intl.NumberFormat(locale).format(amount);
    return `${symbol}${formatted}`;
  }
}
function formatNumber(number, locale = "ko-KR", options = {}) {
  return new Intl.NumberFormat(locale, options).format(number);
}
function formatPriceDisplay(price, config = getDefaultPriceDisplayConfig(), currency = "KRW") {
  const currencyInfo = getCurrencyInfo(currency);
  const formattedPrice = config.showCurrency ? formatCurrency(price, currencyInfo.code) : formatNumber(price);
  return {
    price: formattedPrice,
    currency: currencyInfo.code,
    currencySymbol: currencyInfo.symbol,
    className: "price-display",
    variant: "default",
    size: "medium"
  };
}
function getRoleLabel(role, grade) {
  switch (role) {
    case "customer":
      return "일반 고객";
    case "business":
      return "비즈니스";
    case "affiliate":
      return "제휴사";
    case "retailer":
      switch (grade) {
        case "gold":
          return "골드 리테일러";
        case "premium":
          return "프리미엄 리테일러";
        case "vip":
          return "VIP 리테일러";
        default:
          return "리테일러";
      }
    case "supplier":
      return "공급업체";
    case "admin":
      return "관리자";
    default:
      return "사용자";
  }
}
function getCurrencySymbol(currency) {
  const symbols = {
    "KRW": "₩",
    "USD": "$",
    "EUR": "€",
    "JPY": "¥",
    "GBP": "£",
    "CNY": "¥"
  };
  return symbols[currency] || currency;
}
function getCurrencyInfo(currency) {
  const currencies = {
    "KRW": {
      code: "KRW",
      symbol: "₩",
      name: "대한민국 원",
      symbolPosition: "before",
      decimalPlaces: 0,
      thousandsSeparator: ",",
      decimalSeparator: "."
    },
    "USD": {
      code: "USD",
      symbol: "$",
      name: "US Dollar",
      symbolPosition: "before",
      decimalPlaces: 2,
      thousandsSeparator: ",",
      decimalSeparator: "."
    },
    "EUR": {
      code: "EUR",
      symbol: "€",
      name: "Euro",
      symbolPosition: "before",
      decimalPlaces: 2,
      thousandsSeparator: ",",
      decimalSeparator: "."
    }
  };
  return currencies[currency] || currencies["KRW"];
}
function getDefaultPriceDisplayConfig() {
  return {
    showCurrency: true,
    showCurrencySymbol: true,
    currencyPosition: "before",
    thousandsSeparator: ",",
    decimalSeparator: ".",
    decimalPlaces: 0,
    showRoleLabel: true,
    showSavingsBadge: true,
    highlightBestPrice: true,
    showCompareAtPrice: true,
    showQuantityBreaks: true,
    showTotalSavings: true
  };
}
function isBetterPrice(currentPrice, comparePrice) {
  return currentPrice < comparePrice;
}
function isPriceInRange(price, minPrice, maxPrice) {
  if (minPrice !== void 0 && price < minPrice)
    return false;
  if (maxPrice !== void 0 && price > maxPrice)
    return false;
  return true;
}
function calculateUnitPrice(totalPrice, quantity) {
  return quantity > 0 ? totalPrice / quantity : 0;
}
function validatePrice(price) {
  const warnings = [];
  const errors = [];
  if (price < 0) {
    errors.push({
      ruleId: "negative-price",
      ruleName: "음수 가격 검증",
      message: "가격은 0보다 작을 수 없습니다."
    });
  }
  if (price > 1e7) {
    warnings.push({
      ruleId: "high-price",
      ruleName: "고액 가격 경고",
      message: "가격이 매우 높습니다. 확인해주세요.",
      severity: "medium"
    });
  }
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}
function calculateCartTotal(items, options = {}) {
  const itemBreakdowns = items.map((item) => calculatePrice(item.pricing, item.context, { taxRate: options.taxRate }));
  const subtotal = itemBreakdowns.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = subtotal * ((options.taxRate || 0) / 100);
  const shippingCost = options.shippingCost || 0;
  const discountAmount = options.discountAmount || 0;
  const total = subtotal + taxAmount + shippingCost - discountAmount;
  return {
    subtotal,
    taxAmount,
    shippingCost,
    discountAmount,
    total: Math.max(0, total),
    itemBreakdowns
  };
}

// ../../packages/utils/dist/format.js
function formatCurrency2(amount, currency = "KRW", locale = "ko-KR") {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) {
    return "₩0";
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numAmount);
}
function formatPrice(amount) {
  return formatCurrency2(amount, "KRW", "ko-KR");
}
function formatNumber2(value, options, locale = "ko-KR") {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return "0";
  }
  return new Intl.NumberFormat(locale, options).format(numValue);
}
function formatDate(date, format = "medium", locale = "ko-KR") {
  if (!date) {
    return "N/A";
  }
  let dateObj;
  try {
    if (typeof date === "string" || typeof date === "number") {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    if (!dateObj || isNaN(dateObj.getTime())) {
      console.warn("Invalid date provided to formatDate:", date);
      return "Invalid date";
    }
  } catch (error) {
    console.error("Error parsing date:", error);
    return "Error";
  }
  const options = {};
  switch (format) {
    case "short":
      options.year = "numeric";
      options.month = "2-digit";
      options.day = "2-digit";
      break;
    case "medium":
      options.year = "numeric";
      options.month = "long";
      options.day = "numeric";
      break;
    case "long":
      options.year = "numeric";
      options.month = "long";
      options.day = "numeric";
      options.weekday = "long";
      break;
    case "full":
      options.year = "numeric";
      options.month = "long";
      options.day = "numeric";
      options.weekday = "long";
      options.hour = "2-digit";
      options.minute = "2-digit";
      break;
  }
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}
function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0)
    return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
function formatPercentage(value, decimals = 1, isDecimal = false) {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return "0%";
  }
  const percentage = isDecimal ? numValue * 100 : numValue;
  return `${percentage.toFixed(decimals)}%`;
}
function formatRelativeTime(date, baseDate = /* @__PURE__ */ new Date(), _locale = "ko-KR") {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    return "";
  }
  const diffInMs = baseDate.getTime() - dateObj.getTime();
  const diffInSeconds = Math.round(diffInMs / 1e3);
  const diffInMinutes = Math.round(diffInSeconds / 60);
  const diffInHours = Math.round(diffInMinutes / 60);
  const diffInDays = Math.round(diffInHours / 24);
  const diffInMonths = Math.round(diffInDays / 30);
  const diffInYears = Math.round(diffInDays / 365);
  if (Math.abs(diffInSeconds) < 60) {
    return `${Math.abs(diffInSeconds)}초 전`;
  } else if (Math.abs(diffInMinutes) < 60) {
    return `${Math.abs(diffInMinutes)}분 전`;
  } else if (Math.abs(diffInHours) < 24) {
    return `${Math.abs(diffInHours)}시간 전`;
  } else if (Math.abs(diffInDays) < 30) {
    return `${Math.abs(diffInDays)}일 전`;
  } else if (Math.abs(diffInMonths) < 12) {
    return `${Math.abs(diffInMonths)}개월 전`;
  } else {
    return `${Math.abs(diffInYears)}년 전`;
  }
}
function formatDateFromNow(date, locale = "ko-KR") {
  return formatRelativeTime(date, /* @__PURE__ */ new Date(), locale);
}
function formatPhoneNumber(phoneNumber) {
  const cleaned = phoneNumber.replace(/\D/g, "");
  if (cleaned.startsWith("82")) {
    const number = cleaned.substring(2);
    if (number.startsWith("10")) {
      return `+82-${number.substring(0, 2)}-${number.substring(2, 6)}-${number.substring(6)}`;
    } else if (number.startsWith("2")) {
      return `+82-${number.substring(0, 1)}-${number.substring(1, 5)}-${number.substring(5)}`;
    } else {
      return `+82-${number.substring(0, 2)}-${number.substring(2, 5)}-${number.substring(5)}`;
    }
  } else if (cleaned.startsWith("010")) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.startsWith("02")) {
    return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  } else if (cleaned.length >= 9) {
    const areaCode = cleaned.substring(0, 3);
    if (["031", "032", "033", "041", "042", "043", "051", "052", "053", "054", "055", "061", "062", "063", "064"].includes(areaCode)) {
      return `${areaCode}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
    }
  }
  return phoneNumber;
}

// ../../packages/utils/dist/cn.js
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ../../packages/utils/dist/string.js
function generateSlug(text) {
  return text.toLowerCase().trim().replace(/[^\w\s가-힣-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}
function truncate(text, maxLength, suffix = "...") {
  if (text.length <= maxLength)
    return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}
function capitalize2(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
function toTitleCase(text) {
  return text.toLowerCase().split(" ").map((word) => capitalize2(word)).join(" ");
}
function randomString(length = 8, chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
export {
  buildQueryString,
  calculateCartTotal,
  calculateDiscountPercentage,
  calculatePrice,
  calculateSavings,
  calculateUnitPrice,
  calculateVolumeDiscount,
  capitalize,
  clamp,
  cn,
  debounce,
  formatCurrency2 as formatCurrency,
  formatDate,
  formatDateFromNow,
  formatFileSize,
  formatNumber2 as formatNumber,
  formatPercentage,
  formatPhoneNumber,
  formatPrice,
  formatPriceDisplay,
  generateId,
  generateSlug,
  getAllRolePrices,
  getCurrencyInfo,
  getCurrencySymbol,
  getDefaultPriceDisplayConfig,
  getRoleBasedPrice,
  getRoleLabel,
  groupBy,
  isBetterPrice,
  isEmail,
  isPriceInRange,
  isStrongPassword,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  parseQueryString,
  randomString,
  range,
  sleep,
  sortBy,
  throttle,
  toTitleCase,
  truncate,
  truncateText,
  validatePrice
};
//# sourceMappingURL=@o4o_utils.js.map
