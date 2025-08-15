"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardCompanyCodes = exports.PaymentStatus = exports.PaymentMethod = exports.tossPaymentsClient = exports.tossPaymentsConfig = void 0;
exports.validateTossPaymentsConfig = validateTossPaymentsConfig;
exports.confirmPayment = confirmPayment;
exports.cancelPayment = cancelPayment;
exports.getPayment = getPayment;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = require("dotenv");
const logger_1 = __importDefault(require("../utils/logger"));
(0, dotenv_1.config)();
// TossPayments configuration
exports.tossPaymentsConfig = {
    clientKey: process.env.TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq',
    secretKey: process.env.TOSS_SECRET_KEY || 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R',
    apiUrl: process.env.TOSS_API_URL || 'https://api.tosspayments.com/v1',
    webhookSecret: process.env.TOSS_WEBHOOK_SECRET || '',
    // URLs for payment callbacks
    successUrl: process.env.PAYMENT_SUCCESS_URL || 'http://localhost:3000/payment/success',
    failUrl: process.env.PAYMENT_FAIL_URL || 'http://localhost:3000/payment/fail',
    webhookUrl: process.env.PAYMENT_WEBHOOK_URL || 'http://localhost:3001/api/v1/toss-payments/webhook',
    // Payment settings
    currency: 'KRW',
    country: 'KR',
    // Test mode flag
    isTestMode: process.env.NODE_ENV !== 'production' || ((_a = process.env.TOSS_CLIENT_KEY) === null || _a === void 0 ? void 0 : _a.startsWith('test_')),
};
// Create axios instance for TossPayments API
exports.tossPaymentsClient = axios_1.default.create({
    baseURL: exports.tossPaymentsConfig.apiUrl,
    headers: {
        'Authorization': `Basic ${Buffer.from(exports.tossPaymentsConfig.secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
});
// Request interceptor for logging
exports.tossPaymentsClient.interceptors.request.use((config) => {
    if (process.env.NODE_ENV === 'development') {
        logger_1.default.debug('[TossPayments Request]', {
            method: config.method,
            url: config.url,
            data: config.data,
        });
    }
    return config;
}, (error) => {
    console.error('[TossPayments Request Error]', error);
    return Promise.reject(error);
});
// Response interceptor for error handling
exports.tossPaymentsClient.interceptors.response.use((response) => {
    if (process.env.NODE_ENV === 'development') {
        logger_1.default.debug('[TossPayments Response]', {
            status: response.status,
            data: response.data,
        });
    }
    return response;
}, (error) => {
    var _a, _b, _c, _d;
    if (error.response) {
        console.error('[TossPayments API Error]', {
            status: error.response.status,
            code: (_a = error.response.data) === null || _a === void 0 ? void 0 : _a.code,
            message: (_b = error.response.data) === null || _b === void 0 ? void 0 : _b.message,
        });
        // Throw custom error with TossPayments error details
        const customError = new Error(((_c = error.response.data) === null || _c === void 0 ? void 0 : _c.message) || 'TossPayments API Error');
        customError.code = (_d = error.response.data) === null || _d === void 0 ? void 0 : _d.code;
        customError.status = error.response.status;
        throw customError;
    }
    console.error('[TossPayments Network Error]', error.message);
    throw error;
});
// Payment methods enum
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CARD"] = "\uCE74\uB4DC";
    PaymentMethod["VIRTUAL_ACCOUNT"] = "\uAC00\uC0C1\uACC4\uC88C";
    PaymentMethod["TRANSFER"] = "\uACC4\uC88C\uC774\uCCB4";
    PaymentMethod["MOBILE_PHONE"] = "\uD734\uB300\uD3F0";
    PaymentMethod["CULTURE_GIFT_CARD"] = "\uBB38\uD654\uC0C1\uD488\uAD8C";
    PaymentMethod["BOOK_GIFT_CARD"] = "\uB3C4\uC11C\uBB38\uD654\uC0C1\uD488\uAD8C";
    PaymentMethod["GAME_GIFT_CARD"] = "\uAC8C\uC784\uBB38\uD654\uC0C1\uD488\uAD8C";
    PaymentMethod["EASY_PAY"] = "\uAC04\uD3B8\uACB0\uC81C";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
// Payment status enum
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["READY"] = "READY";
    PaymentStatus["IN_PROGRESS"] = "IN_PROGRESS";
    PaymentStatus["WAITING_FOR_DEPOSIT"] = "WAITING_FOR_DEPOSIT";
    PaymentStatus["DONE"] = "DONE";
    PaymentStatus["CANCELED"] = "CANCELED";
    PaymentStatus["PARTIAL_CANCELED"] = "PARTIAL_CANCELED";
    PaymentStatus["ABORTED"] = "ABORTED";
    PaymentStatus["EXPIRED"] = "EXPIRED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
// Card company codes
exports.CardCompanyCodes = {
    '국민': 'KOOKMIN',
    '신한': 'SHINHAN',
    '삼성': 'SAMSUNG',
    '현대': 'HYUNDAI',
    '롯데': 'LOTTE',
    'BC': 'BC',
    '농협': 'NONGHYUP',
    '하나': 'HANA',
    '우리': 'WOORI',
    '씨티': 'CITI',
    '카카오뱅크': 'KAKAOBANK',
    '케이뱅크': 'KBANK',
    '토스뱅크': 'TOSSBANK',
};
// Validate configuration on startup
function validateTossPaymentsConfig() {
    const warnings = [];
    if (!exports.tossPaymentsConfig.clientKey) {
        warnings.push('TOSS_CLIENT_KEY is not configured');
    }
    if (!exports.tossPaymentsConfig.secretKey) {
        warnings.push('TOSS_SECRET_KEY is not configured');
    }
    if (exports.tossPaymentsConfig.isTestMode) {
        logger_1.default.warn('⚠️  TossPayments is running in TEST MODE');
    }
    if (warnings.length > 0) {
        console.warn('⚠️  TossPayments configuration warnings:');
        warnings.forEach(warning => console.warn(`   - ${warning}`));
    }
    else {
        logger_1.default.info('✅ TossPayments configuration validated successfully');
    }
}
// Export helper functions
async function confirmPayment(paymentKey, orderId, amount) {
    try {
        const response = await exports.tossPaymentsClient.post(`/payments/${paymentKey}`, {
            orderId,
            amount,
        });
        return response.data;
    }
    catch (error) {
        console.error('Payment confirmation failed:', error);
        throw error;
    }
}
async function cancelPayment(paymentKey, cancelReason) {
    try {
        const response = await exports.tossPaymentsClient.post(`/payments/${paymentKey}/cancel`, {
            cancelReason,
        });
        return response.data;
    }
    catch (error) {
        console.error('Payment cancellation failed:', error);
        throw error;
    }
}
async function getPayment(paymentKey) {
    try {
        const response = await exports.tossPaymentsClient.get(`/payments/${paymentKey}`);
        return response.data;
    }
    catch (error) {
        console.error('Failed to get payment:', error);
        throw error;
    }
}
//# sourceMappingURL=toss-payments.js.map