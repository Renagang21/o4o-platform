"use strict";
/**
 * 크라우드펀딩 스케줄 작업
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProjectStatusJob = void 0;
exports.startCrowdfundingSchedules = startCrowdfundingSchedules;
exports.stopCrowdfundingSchedules = stopCrowdfundingSchedules;
const cron_1 = require("cron");
const CrowdfundingService_1 = require("../services/CrowdfundingService");
const simpleLogger_1 = __importDefault(require("../utils/simpleLogger"));
/**
 * 프로젝트 상태 업데이트 (매일 0시)
 */
exports.updateProjectStatusJob = new cron_1.CronJob('0 0 * * *', // 매일 자정
async () => {
    try {
        simpleLogger_1.default.info('Starting crowdfunding project status update...');
        await CrowdfundingService_1.crowdfundingService.updateProjectStatuses();
        simpleLogger_1.default.info('Crowdfunding project status update completed');
    }
    catch (error) {
        simpleLogger_1.default.error('Failed to update project statuses:', error);
    }
}, null, false, // 자동 시작 안함
'Asia/Seoul');
/**
 * 스케줄 작업 시작
 */
function startCrowdfundingSchedules() {
    exports.updateProjectStatusJob.start();
    simpleLogger_1.default.info('Crowdfunding schedule jobs started');
}
/**
 * 스케줄 작업 중지
 */
function stopCrowdfundingSchedules() {
    exports.updateProjectStatusJob.stop();
    simpleLogger_1.default.info('Crowdfunding schedule jobs stopped');
}
//# sourceMappingURL=crowdfundingSchedule.js.map