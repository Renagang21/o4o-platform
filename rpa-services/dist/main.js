"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const common_core_1 = require("@renagang21/common-core");
// 환경변수 로드
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3002;
// 미들웨어 설정
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// RPA 작업 시작 엔드포인트
app.post('/api/v1/rpa/tasks', async (req, res) => {
    try {
        const { taskType, params } = req.body;
        common_core_1.logger.info(`Starting RPA task: ${taskType}`, { params });
        // TODO: 실제 RPA 작업 구현
        res.status(202).json({
            message: 'Task accepted',
            taskId: Date.now().toString()
        });
    }
    catch (error) {
        common_core_1.logger.error('Error in RPA task', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 서버 시작
app.listen(port, () => {
    common_core_1.logger.info(`RPA Services running on port ${port}`);
});
