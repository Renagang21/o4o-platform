import { Request, Response } from 'express';
import { SignageService } from '../services/SignageService.js';
import type { AuthRequest } from '../types/auth.js';

export class SignageController {
  private signageService: SignageService;

  constructor() {
    this.signageService = new SignageService();
  }

  // Device endpoints
  getDevices = async (req: Request, res: Response) => {
    try {
      const devices = await this.signageService.getDevices();
      res.json(devices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  createDevice = async (req: AuthRequest, res: Response) => {
    try {
      const device = await this.signageService.createDevice(req.body);
      res.status(201).json(device);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getDevice = async (req: Request, res: Response) => {
    try {
      const device = await this.signageService.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      res.json(device);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updateDevice = async (req: AuthRequest, res: Response) => {
    try {
      const device = await this.signageService.updateDevice(req.params.id, req.body);
      res.json(device);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  deleteDevice = async (req: AuthRequest, res: Response) => {
    try {
      await this.signageService.deleteDevice(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Slide endpoints
  getSlides = async (req: Request, res: Response) => {
    try {
      const slides = await this.signageService.getSlides();
      res.json(slides);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  createSlide = async (req: AuthRequest, res: Response) => {
    try {
      const slide = await this.signageService.createSlide(req.body);
      res.status(201).json(slide);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getSlide = async (req: Request, res: Response) => {
    try {
      const slide = await this.signageService.getSlide(req.params.id);
      if (!slide) {
        return res.status(404).json({ error: 'Slide not found' });
      }
      res.json(slide);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updateSlide = async (req: AuthRequest, res: Response) => {
    try {
      const slide = await this.signageService.updateSlide(req.params.id, req.body);
      res.json(slide);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  deleteSlide = async (req: AuthRequest, res: Response) => {
    try {
      await this.signageService.deleteSlide(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Playlist endpoints
  getPlaylists = async (req: Request, res: Response) => {
    try {
      const playlists = await this.signageService.getPlaylists();
      res.json(playlists);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  createPlaylist = async (req: AuthRequest, res: Response) => {
    try {
      const playlist = await this.signageService.createPlaylist(req.body);
      res.status(201).json(playlist);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getPlaylist = async (req: Request, res: Response) => {
    try {
      const playlist = await this.signageService.getPlaylist(req.params.id);
      if (!playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
      }
      res.json(playlist);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updatePlaylist = async (req: AuthRequest, res: Response) => {
    try {
      const playlist = await this.signageService.updatePlaylist(req.params.id, req.body);
      res.json(playlist);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  deletePlaylist = async (req: AuthRequest, res: Response) => {
    try {
      await this.signageService.deletePlaylist(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Schedule endpoints
  getSchedules = async (req: Request, res: Response) => {
    try {
      const deviceId = req.query.deviceId as string | undefined;
      const schedules = await this.signageService.getSchedules(deviceId);
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  createSchedule = async (req: AuthRequest, res: Response) => {
    try {
      const schedule = await this.signageService.createSchedule(req.body);
      res.status(201).json(schedule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updateSchedule = async (req: AuthRequest, res: Response) => {
    try {
      const schedule = await this.signageService.updateSchedule(req.params.id, req.body);
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  deleteSchedule = async (req: AuthRequest, res: Response) => {
    try {
      await this.signageService.deleteSchedule(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Player endpoint
  getCurrentPlaylist = async (req: Request, res: Response) => {
    try {
      const deviceId = req.query.deviceId as string;
      if (!deviceId) {
        return res.status(400).json({ error: 'deviceId is required' });
      }

      const playlist = await this.signageService.getCurrentPlaylist(deviceId);
      res.json(playlist);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Stats endpoint
  getStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.signageService.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
