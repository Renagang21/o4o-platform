import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '@renagang21/common-core';

// 환경변수 로드
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const port = process.env.PORT || 3003;

// 미들웨어 설정
app.use(helmet());
app.use(cors());
app.use(express.json());

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 실시간 주문 처리
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('new_order', (data) => {
    logger.info('New order received', { order: data });
    // TODO: 주문 처리 로직 구현
    io.emit('order_status', {
      orderId: data.orderId,
      status: 'received'
    });
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// O4O 플랫폼 API 엔드포인트
app.post('/api/v1/orders', async (req, res) => {
  try {
    const { items, customerId } = req.body;
    logger.info('Creating new order', { items, customerId });
    
    // TODO: 주문 생성 로직 구현
    res.status(201).json({
      orderId: Date.now().toString(),
      status: 'created'
    });
  } catch (error) {
    logger.error('Error creating order', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 서버 시작
httpServer.listen(port, () => {
  logger.info(`O4O Platform running on port ${port}`);
}); 