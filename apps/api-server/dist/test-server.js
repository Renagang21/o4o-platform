"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const logger_1 = __importDefault(require("./utils/logger"));
logger_1.default.info('🔥 Starting test server...');
const app = (0, express_1.default)();
const port = 4000;
app.get('/test', (req, res) => {
    res.json({ message: 'Test server working!', timestamp: new Date().toISOString() });
});
app.listen(port, () => {
    logger_1.default.info(`✅ Test server running on http://localhost:${port}`);
    logger_1.default.info(`🧪 Test endpoint: http://localhost:${port}/test`);
});
//# sourceMappingURL=test-server.js.map