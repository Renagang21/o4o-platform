import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { SignageScheduleService } from '../services/schedule.service.js';
import { extractScope } from './signage-helpers.js';
import type {
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleQueryDto,
  ScheduleCalendarQueryDto,
  PresignedUploadRequestDto,
} from '../dto/index.js';

export class SignageScheduleController {
  private service: SignageScheduleService;

  constructor(dataSource: DataSource) {
    this.service = new SignageScheduleService(dataSource);
  }

  getSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;

      const schedule = await this.service.getSchedule(id, scope);
      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      res.json({ data: schedule });
    } catch (error) {
      next(error);
    }
  };

  getSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const query: ScheduleQueryDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        channelId: req.query.channelId as string,
        playlistId: req.query.playlistId as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await this.service.getSchedules(query, scope);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  createSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const dto: CreateScheduleDto = req.body;

      const schedule = await this.service.createSchedule(dto, scope);
      res.status(201).json({ data: schedule });
    } catch (error) {
      if ((error as Error).message === 'Playlist not found') {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }
      next(error);
    }
  };

  updateSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;
      const dto: UpdateScheduleDto = req.body;

      const schedule = await this.service.updateSchedule(id, dto, scope);
      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      res.json({ data: schedule });
    } catch (error) {
      if ((error as Error).message === 'Playlist not found') {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }
      next(error);
    }
  };

  deleteSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const { id } = req.params;

      const success = await this.service.deleteSchedule(id, scope);
      if (!success) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  resolveActiveContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const channelId = req.query.channelId as string || null;
      const currentTime = req.query.currentTime ? new Date(req.query.currentTime as string) : undefined;

      const content = await this.service.resolveActiveContent(channelId, scope, currentTime);
      res.json({ data: content });
    } catch (error) {
      next(error);
    }
  };

  getScheduleCalendar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const query: ScheduleCalendarQueryDto = {
        channelId: req.query.channelId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      if (!query.startDate || !query.endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const calendar = await this.service.getScheduleCalendar(query, scope);
      res.json({ data: calendar });
    } catch (error) {
      next(error);
    }
  };

  getPresignedUploadUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scope = extractScope(req);
      const dto: PresignedUploadRequestDto = req.body;

      const result = await this.service.getPresignedUploadUrl(dto, scope);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };
}
