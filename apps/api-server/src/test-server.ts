import express from 'express';
import logger from './utils/logger';

logger.info('🔥 Starting test server...');

const app = express();
const port = 4000;

app.get('/test', (req, res) => {
  res.json({ message: 'Test server working!', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  logger.info(`✅ Test server running on http://localhost:${port}`);
  logger.info(`🧪 Test endpoint: http://localhost:${port}/test`);
});