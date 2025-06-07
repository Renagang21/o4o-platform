import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from '@renagang21/common-core';

// 환경변수 로드
dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

// 미들웨어 설정
app.use(helmet());
app.use(cors());
app.use(express.json());

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// RPA 작업 시작 엔드포인트
app.post('/api/v1/rpa/tasks', async (req, res) => {
  try {
    const { taskType, params } = req.body;
    logger.info(`Starting RPA task: ${taskType}`, { params });
    
    // TODO: 실제 RPA 작업 구현
    res.status(202).json({
      message: 'Task accepted',
      taskId: Date.now().toString()
    });
  } catch (error) {
    logger.error('Error in RPA task', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 서버 시작
app.listen(port, () => {
  logger.info(`RPA Services running on port ${port}`);
}); 