"use strict";
/**
 * Tracking Updater Job
 * 배송 추적 정보를 주기적으로 업데이트
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackingUpdaterJob = void 0;
const cron = __importStar(require("node-cron"));
const ShippingService_1 = require("../services/shipping/ShippingService");
const simpleLogger_1 = __importDefault(require("../utils/simpleLogger"));
class TrackingUpdaterJob {
    constructor() {
        this.job = null;
    }
    /**
     * Start the tracking updater job
     * Runs every 30 minutes
     */
    start() {
        // Run every 30 minutes
        this.job = cron.schedule('*/30 * * * *', async () => {
            simpleLogger_1.default.info('🚚 Starting tracking update job...');
            try {
                await ShippingService_1.shippingService.updateAllTracking();
                simpleLogger_1.default.info('✅ Tracking update completed successfully');
            }
            catch (error) {
                simpleLogger_1.default.error('❌ Tracking update failed:', error);
            }
        });
        simpleLogger_1.default.info('📦 Tracking updater job scheduled (every 30 minutes)');
    }
    /**
     * Stop the job
     */
    stop() {
        if (this.job) {
            this.job.stop();
            this.job = null;
            simpleLogger_1.default.info('🛑 Tracking updater job stopped');
        }
    }
    /**
     * Run the job immediately (for testing)
     */
    async runNow() {
        simpleLogger_1.default.info('🚚 Running tracking update job manually...');
        try {
            await ShippingService_1.shippingService.updateAllTracking();
            simpleLogger_1.default.info('✅ Manual tracking update completed');
        }
        catch (error) {
            simpleLogger_1.default.error('❌ Manual tracking update failed:', error);
            throw error;
        }
    }
}
exports.trackingUpdaterJob = new TrackingUpdaterJob();
//# sourceMappingURL=trackingUpdater.js.map