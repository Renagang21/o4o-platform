/**
 * CornerDisplay Routes
 *
 * Phase 2: 읽기 전용 API 엔드포인트
 *
 * 제공 엔드포인트:
 * - GET /corner-displays - 목록 조회
 * - GET /corner-displays/:id - 단건 조회
 * - GET /corner-displays/by-device/:deviceId - 디바이스로 코너 조회
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { CornerDisplayService } from '../services/cornerDisplay.service.js';

export function createCornerDisplayRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = new CornerDisplayService(dataSource);

  /**
   * GET /corner-displays
   * 코너 디스플레이 목록 조회
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const sellerId = req.query.sellerId as string | undefined;
      const corners = await service.findAll(sellerId);

      res.json({
        success: true,
        data: corners,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch corner displays',
        code: 'CORNER_DISPLAY_FETCH_ERROR',
      });
    }
  });

  /**
   * GET /corner-displays/:id
   * 코너 디스플레이 단건 조회
   */
  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const corner = await service.findById(id);

      if (!corner) {
        res.status(404).json({
          success: false,
          error: 'Corner display not found',
          code: 'CORNER_DISPLAY_NOT_FOUND',
        });
        return;
      }

      // 귀속된 디바이스 목록도 함께 반환
      const devices = await service.findDevicesByCorner(id);

      res.json({
        success: true,
        data: {
          ...corner,
          devices,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch corner display',
        code: 'CORNER_DISPLAY_FETCH_ERROR',
      });
    }
  });

  /**
   * GET /corner-displays/by-device/:deviceId
   * 디바이스 ID로 귀속된 코너 조회
   *
   * 핵심 엔드포인트:
   * - 태블릿이 자신이 속한 코너를 알아내는 방법
   * - 전환/선택 없이 단일 결과 반환
   */
  router.get('/by-device/:deviceId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const context = await service.getCornerContextByDevice(deviceId);

      if (!context) {
        res.status(404).json({
          success: false,
          error: 'Device not registered to any corner',
          code: 'DEVICE_NOT_REGISTERED',
        });
        return;
      }

      res.json({
        success: true,
        data: context,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch corner by device',
        code: 'CORNER_BY_DEVICE_FETCH_ERROR',
      });
    }
  });

  return router;
}
